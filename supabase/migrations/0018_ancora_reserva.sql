-- =====================================================================
--  Regra da Âncora (substitui a do total perdido, 0017):
--  * Ao ENTRAR: se o valor atual passa do máximo da ficha de 50%, desce
--    até ele e a diferença fica GUARDADA (pv_reserva…). Se já está abaixo,
--    nada muda.
--  * DENTRO: dano e cura normais; a cura só vai até o máximo da ficha ativa.
--  * Ao SAIR: o que foi guardado volta (sem passar do máximo da ficha de 99%).
--  Fora da Âncora, a cura vai até o máximo da ficha de 99%.
-- =====================================================================
alter table public.personagens
  add column if not exists pv_reserva  int not null default 0,
  add column if not exists san_reserva int not null default 0,
  add column if not exists pe_reserva  int not null default 0,
  add column if not exists pd_reserva  int not null default 0;

-- quem já está sob a Âncora: guarda o que a regra anterior tinha cortado
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'personagens' and column_name = 'pv_perdido') then
    execute $q$
      update public.personagens p set
        pv_reserva  = greatest((f.pv_max  - p.pv_perdido)  - p.pv_atual,  0),
        san_reserva = greatest((f.san_max - p.san_perdido) - p.san_atual, 0),
        pe_reserva  = greatest((f.pe_max  - p.pe_perdido)  - p.pe_atual,  0)
      from public.fichas f
      where p.ancora_ativa and f.personagem_id = p.id and f.variante = '99'
    $q$;
  end if;
end $$;

create or replace function public.tg_personagens_antes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f fichas;
  achou boolean;
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and not eh_mestre(old.mesa_id) then
    if new.mesa_id <> old.mesa_id or new.tipo <> old.tipo
       or new.tem_marca <> old.tem_marca or new.ancora_ativa <> old.ancora_ativa
       or new.usa_determinacao <> old.usa_determinacao or new.arquivado <> old.arquivado
       or new.jogador is distinct from old.jogador or new.ordem <> old.ordem then
      raise exception 'Somente o mestre pode alterar esse campo.' using errcode = '42501';
    end if;
  end if;

  select * into f from fichas
   where personagem_id = new.id and variante = case when new.ancora_ativa then '50' else '99' end;
  achou := found;

  if tg_op = 'UPDATE' and achou and new.ancora_ativa and not old.ancora_ativa then
    -- entrando: guarda o que passar do máximo da ficha de 50%
    new.pv_reserva  := greatest(new.pv_atual  - f.pv_max,  0);
    new.san_reserva := greatest(new.san_atual - f.san_max, 0);
    new.pe_reserva  := greatest(new.pe_atual  - f.pe_max,  0);
    new.pd_reserva  := case when f.pd_max is not null and new.pd_atual is not null then greatest(new.pd_atual - f.pd_max, 0) else 0 end;
  elsif tg_op = 'UPDATE' and not new.ancora_ativa and old.ancora_ativa then
    -- saindo: devolve o que estava guardado
    new.pv_atual  := new.pv_atual  + coalesce(new.pv_reserva, 0);
    new.san_atual := new.san_atual + coalesce(new.san_reserva, 0);
    new.pe_atual  := new.pe_atual  + coalesce(new.pe_reserva, 0);
    if new.pd_atual is not null then new.pd_atual := new.pd_atual + coalesce(new.pd_reserva, 0); end if;
    new.pv_reserva := 0; new.san_reserva := 0; new.pe_reserva := 0; new.pd_reserva := 0;
  end if;

  -- o valor atual nunca passa do máximo da ficha ativa nem fica abaixo de 0
  if achou then
    new.pv_atual  := least(new.pv_atual,  f.pv_max);
    new.san_atual := least(new.san_atual, f.san_max);
    new.pe_atual  := least(new.pe_atual,  f.pe_max);
    if new.pd_atual is not null and f.pd_max is not null then
      new.pd_atual := least(new.pd_atual, f.pd_max);
    end if;
  end if;
  new.pv_atual  := greatest(coalesce(new.pv_atual, 0), 0);
  new.san_atual := greatest(coalesce(new.san_atual, 0), 0);
  new.pe_atual  := greatest(coalesce(new.pe_atual, 0), 0);
  if new.pd_atual is not null then new.pd_atual := greatest(new.pd_atual, 0); end if;
  new.pv_temp     := greatest(coalesce(new.pv_temp, 0), 0);
  new.pv_reserva  := greatest(coalesce(new.pv_reserva, 0), 0);
  new.san_reserva := greatest(coalesce(new.san_reserva, 0), 0);
  new.pe_reserva  := greatest(coalesce(new.pe_reserva, 0), 0);
  new.pd_reserva  := greatest(coalesce(new.pd_reserva, 0), 0);
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists personagens_antes on public.personagens;
create trigger personagens_antes before insert or update on public.personagens
  for each row execute function public.tg_personagens_antes();

-- mudar o máximo de uma ficha reaplica o limite
create or replace function public.tg_fichas_recalcula() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('paratus.sem_log', '1', true);
  update personagens set atualizado_em = now() where id = new.personagem_id;
  perform set_config('paratus.sem_log', '', true);
  return null;
end $$;
drop trigger if exists recalcula on public.fichas;
create trigger recalcula after insert or update of pv_max, san_max, pe_max, pd_max on public.fichas
  for each row execute function public.tg_fichas_recalcula();

create or replace function public.tg_personagens_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  campos text[] := array['pv_atual','pv_temp','san_atual','pe_atual','pd_atual','condicoes','ancora_ativa',
                         'pv_reserva','san_reserva','pe_reserva','pd_reserva'];
  c text;
  o jsonb := to_jsonb(old);
  n jsonb := to_jsonb(new);
  quem text;
begin
  if coalesce(current_setting('paratus.sem_log', true), '') = '1' then
    return null;
  end if;
  select nome_exibicao into quem from membros where user_id = auth.uid() and mesa_id = new.mesa_id;
  foreach c in array campos loop
    if o -> c is distinct from n -> c then
      insert into log_alteracoes (mesa_id, personagem_id, personagem_nome, lote, user_id, autor, campo, antes, depois)
      values (new.mesa_id, new.id, new.nome, txid_current(), auth.uid(), coalesce(quem, 'Sistema'), c, o -> c, n -> c);
    end if;
  end loop;
  return null;
end $$;

-- o desfazer volta primeiro a Âncora e depois os valores, para a parte guardada não se perder
create or replace function public.desfazer_ultima(p_mesa uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  l bigint;
  r log_alteracoes;
  qtd int := 0;
begin
  if auth.uid() is not null and not eh_mestre(p_mesa) then
    raise exception 'Somente o mestre.' using errcode = '42501';
  end if;
  select lote into l from log_alteracoes
   where mesa_id = p_mesa and not desfeito order by id desc limit 1;
  if l is null then return 0; end if;

  perform set_config('paratus.sem_log', '1', true);
  for r in select * from log_alteracoes
            where mesa_id = p_mesa and lote = l and not desfeito
            order by (campo = 'ancora_ativa') desc, (campo like '%_reserva') asc, id desc loop
    execute format(
      'update personagens p set %1$I = x.%1$I from jsonb_populate_record(null::personagens, $1) x where p.id = $2',
      r.campo)
    using jsonb_build_object(r.campo, r.antes), r.personagem_id;
    qtd := qtd + 1;
  end loop;
  perform set_config('paratus.sem_log', '', true);

  update log_alteracoes set desfeito = true where mesa_id = p_mesa and lote = l;
  return qtd;
end $$;

-- ajuste (+/−) direto no valor atual; o limite vem do gatilho
create or replace function public.ajustar_status(p_personagem uuid, p_campo text, p_delta int)
returns personagens
language plpgsql security invoker set search_path = public as $$
declare
  r personagens;
begin
  if p_campo not in ('pv_atual','san_atual','pe_atual','pd_atual','pv_temp') then
    raise exception 'Campo inválido.';
  end if;
  if p_campo = 'pv_atual' and p_delta < 0 then
    -- dano gasta primeiro o PV temporário; o que sobrar sai do PV
    update personagens
       set pv_temp  = greatest(pv_temp + p_delta, 0),
           pv_atual = pv_atual + least(pv_temp + p_delta, 0)
     where id = p_personagem
    returning * into r;
  else
    execute format('update personagens set %1$I = coalesce(%1$I, 0) + $1 where id = $2 returning *', p_campo)
      into r using p_delta, p_personagem;
  end if;
  if r.id is null then raise exception 'Sem permissão para alterar este personagem.' using errcode = '42501'; end if;
  return r;
end $$;

-- a coluna do total perdido (0017) deixa de existir
alter table public.personagens
  drop column if exists pv_perdido,
  drop column if exists san_perdido,
  drop column if exists pe_perdido,
  drop column if exists pd_perdido;

-- restaurar um backup também devolve o que a Âncora tinha guardado
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
    pd_atual = (b->>'pd_atual')::int, pv_temp = coalesce((b->>'pv_temp')::int, 0),
    pv_reserva = coalesce((b->>'pv_reserva')::int, 0), san_reserva = coalesce((b->>'san_reserva')::int, 0),
    pe_reserva = coalesce((b->>'pe_reserva')::int, 0), pd_reserva = coalesce((b->>'pd_reserva')::int, 0)
  from jsonb_array_elements(coalesce(dados->'personagens', '[]')) b
  where p.id = (b->>'id')::uuid;

  -- o histórico de "desfazer" não vale mais depois de restaurar
  delete from log_alteracoes where mesa_id = p_mesa;
  return contagem;
end $$;
