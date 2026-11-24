-- =====================================================================
--  ETAPA 10 — Backup da mesa em JSON
--  * exportar_mesa(mesa): tudo da mesa num JSON (fichas, PINs, itens, lore,
--    linha do tempo, cadernos, quadro). Não inclui rolagens, histórico,
--    combates nem os arquivos de imagem/PDF em si (só os caminhos).
--  * restaurar_mesa(mesa, backup): volta a mesa ao estado do backup.
--    Só aceita backup da mesma mesa. Jogadores continuam conectados.
--  Só o mestre usa as duas.
-- =====================================================================

-- o autor de um cartão do quadro vem do backup quando restaurado
create or replace function public.tg_quadro_cartao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.autor is null then
      select coalesce(p.nome, m.nome_exibicao, case when m.papel = 'mestre' then 'Mestre' end)
        into new.autor
        from membros m left join personagens p on p.id = m.personagem_id
       where m.user_id = auth.uid() and m.mesa_id = new.mesa_id;
    end if;
  else
    new.mesa_id := old.mesa_id;
    new.criado_por := old.criado_por;
    new.autor := old.autor;
  end if;
  new.atualizado_em := now();
  return new;
end $$;

-- tabelas que vão no backup, na ordem em que voltam (pais antes dos filhos)
create or replace function public._tabelas_backup() returns text[]
language sql immutable as $$
  select array[
    'fichas', 'fichas_detalhes', 'personagens_privado',
    'grupos_ancora', 'presets_dados', 'modelos_ameaca', 'catalogo', 'personagem_itens',
    'lore_entradas', 'lore_entradas_reveladas', 'lore_notas_mestre', 'lore_conexoes',
    'lore_conexoes_reveladas', 'lore_imagens',
    'eventos', 'eventos_revelados', 'eventos_entradas',
    'notas_pessoais', 'arquivos_mesa', 'quadro_cartoes', 'quadro_ligacoes'
  ]
$$;

create or replace function public.exportar_mesa(p_mesa uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  tabelas jsonb := '{}'::jsonb;
  linhas jsonb;
  m mesas;
begin
  if not eh_mestre(p_mesa) then raise exception 'Só o mestre exporta a mesa.' using errcode = '42501'; end if;
  select * into m from mesas where id = p_mesa;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.ordem), '[]') into linhas from personagens x where x.mesa_id = p_mesa;
  tabelas := tabelas || jsonb_build_object('personagens', linhas);
  select coalesce(jsonb_agg(to_jsonb(x)), '[]') into linhas
    from personagens_pin x join personagens p on p.id = x.personagem_id where p.mesa_id = p_mesa;
  tabelas := tabelas || jsonb_build_object('personagens_pin', linhas);

  foreach t in array _tabelas_backup() loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r_)), ''[]'') from public.%I r_ where r_.mesa_id = $1', t)
      into linhas using p_mesa;
    tabelas := tabelas || jsonb_build_object(t, linhas);
  end loop;

  return jsonb_build_object(
    'formato', 'paratus-backup', 'versao', 1, 'exportado_em', now(),
    'mesa_id', m.id, 'mesa_codigo', m.codigo, 'mesa_nome', m.nome,
    'tabelas', tabelas);
end $$;

create or replace function public.restaurar_mesa(p_mesa uuid, p_backup jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t text;
  i int;
  lista text[] := _tabelas_backup();
  dados jsonb := p_backup->'tabelas';
  ids uuid[];
  colunas text;
  contagem jsonb := '{}'::jsonb;
  n int;
begin
  if not eh_mestre(p_mesa) then raise exception 'Só o mestre restaura a mesa.' using errcode = '42501'; end if;
  if p_backup->>'formato' is distinct from 'paratus-backup' or dados is null then
    raise exception 'Este arquivo não é um backup do site.';
  end if;
  if (p_backup->>'versao')::int > 1 then raise exception 'Backup de uma versão mais nova do site.'; end if;
  if (p_backup->>'mesa_id')::uuid is distinct from p_mesa then
    raise exception 'Este backup é da mesa "%" e só pode ser restaurado nela.', p_backup->>'mesa_nome';
  end if;

  -- 1) tira o conteúdo atual (filhos antes dos pais)
  for i in reverse array_length(lista, 1) .. 1 loop
    execute format('delete from public.%I where mesa_id = $1', lista[i]) using p_mesa;
  end loop;

  -- 2) personagens: atualiza os que existem, cria os que faltam, apaga os que não estão no backup
  --    (assim os jogadores conectados não caem)
  select coalesce(array_agg((x->>'id')::uuid), '{}') into ids from jsonb_array_elements(coalesce(dados->'personagens', '[]')) x;
  delete from personagens where mesa_id = p_mesa and id <> all(ids);
  select string_agg(format('%I = excluded.%I', a.attname, a.attname), ', ') into colunas
    from pg_attribute a where a.attrelid = 'public.personagens'::regclass and a.attnum > 0 and not a.attisdropped and a.attname <> 'id';
  execute format('insert into public.personagens select * from jsonb_populate_recordset(null::public.personagens, $1)
                  on conflict (id) do update set %s', colunas)
    using coalesce(dados->'personagens', '[]');
  -- fichas, detalhes e anotações criados automaticamente saem para entrar os do backup
  delete from fichas where mesa_id = p_mesa;
  delete from fichas_detalhes where mesa_id = p_mesa;
  delete from personagens_privado where mesa_id = p_mesa;
  delete from personagens_pin where personagem_id = any(ids);
  insert into personagens_pin select * from jsonb_populate_recordset(null::personagens_pin, coalesce(dados->'personagens_pin', '[]'));
  contagem := contagem || jsonb_build_object('personagens', coalesce(array_length(ids, 1), 0));

  -- 3) o resto, na ordem
  foreach t in array lista loop
    execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1) where mesa_id = $2', t, t)
      using coalesce(dados->t, '[]'), p_mesa;
    get diagnostics n = row_count;
    contagem := contagem || jsonb_build_object(t, n);
  end loop;

  -- 4) com as fichas de volta, reaplica os valores atuais (o teto da ficha ativa vale de novo)
  update personagens p set
    pv_atual = (b->>'pv_atual')::int, san_atual = (b->>'san_atual')::int, pe_atual = (b->>'pe_atual')::int,
    pd_atual = (b->>'pd_atual')::int, pv_temp = coalesce((b->>'pv_temp')::int, 0)
  from jsonb_array_elements(coalesce(dados->'personagens', '[]')) b
  where p.id = (b->>'id')::uuid;

  -- o histórico de "desfazer" não vale mais depois de restaurar
  delete from log_alteracoes where mesa_id = p_mesa;
  return contagem;
end $$;

revoke all on function public.exportar_mesa(uuid), public.restaurar_mesa(uuid, jsonb) from public, anon;
grant execute on function public.exportar_mesa(uuid), public.restaurar_mesa(uuid, jsonb) to authenticated;
revoke all on function public._tabelas_backup() from public, anon;
