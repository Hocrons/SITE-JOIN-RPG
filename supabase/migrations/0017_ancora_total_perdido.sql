-- =====================================================================
--  Nova regra da Âncora: total perdido.
--  Cada personagem guarda quanto PERDEU/GASTOU de PV, SAN, PE (e PD).
--  O valor atual é sempre: máximo da ficha ativa − total perdido (mínimo 0).
--  * Dano e gasto aumentam o total; cura e recuperação diminuem (até 0).
--  * Trocar entre a ficha de 99% e a de 50% só muda o máximo; o total fica.
--  * Uma perda não leva o total além do máximo da ficha ativa (não existe
--    PV abaixo de 0), mas um total maior que já existia é mantido ao trocar.
--  * Pôr um valor exato (Fixar) vira: total = máximo − valor.
-- =====================================================================
alter table public.personagens
  add column if not exists pv_perdido  int not null default 0,
  add column if not exists san_perdido int not null default 0,
  add column if not exists pe_perdido  int not null default 0,
  add column if not exists pd_perdido  int;

-- ponto de partida: o que já falta hoje em relação à ficha ativa
update public.personagens p set
  pv_perdido  = greatest(f.pv_max  - p.pv_atual,  0),
  san_perdido = greatest(f.san_max - p.san_atual, 0),
  pe_perdido  = greatest(f.pe_max  - p.pe_atual,  0),
  pd_perdido  = case when f.pd_max is not null and p.pd_atual is not null then greatest(f.pd_max - p.pd_atual, 0) end
from public.fichas f
where f.personagem_id = p.id and f.variante = case when p.ancora_ativa then '50' else '99' end;

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

  -- quem mudou o valor atual direto (Fixar, desfazer antigo) define o total perdido a partir dele
  if tg_op = 'UPDATE' and achou then
    if new.pv_perdido is not distinct from old.pv_perdido and new.pv_atual is distinct from old.pv_atual then
      new.pv_perdido := f.pv_max - new.pv_atual;
    end if;
    if new.san_perdido is not distinct from old.san_perdido and new.san_atual is distinct from old.san_atual then
      new.san_perdido := f.san_max - new.san_atual;
    end if;
    if new.pe_perdido is not distinct from old.pe_perdido and new.pe_atual is distinct from old.pe_atual then
      new.pe_perdido := f.pe_max - new.pe_atual;
    end if;
    if f.pd_max is not null and new.pd_perdido is not distinct from old.pd_perdido
       and new.pd_atual is distinct from old.pd_atual and new.pd_atual is not null then
      new.pd_perdido := f.pd_max - new.pd_atual;
    end if;
  end if;

  new.pv_perdido  := greatest(coalesce(new.pv_perdido, 0), 0);
  new.san_perdido := greatest(coalesce(new.san_perdido, 0), 0);
  new.pe_perdido  := greatest(coalesce(new.pe_perdido, 0), 0);
  new.pv_temp     := greatest(coalesce(new.pv_temp, 0), 0);

  -- o atual sai sempre do máximo da ficha ativa menos o total
  if achou then
    new.pv_atual  := greatest(f.pv_max  - new.pv_perdido,  0);
    new.san_atual := greatest(f.san_max - new.san_perdido, 0);
    new.pe_atual  := greatest(f.pe_max  - new.pe_perdido,  0);
    if f.pd_max is not null then
      new.pd_perdido := greatest(coalesce(new.pd_perdido, f.pd_max - coalesce(new.pd_atual, f.pd_max)), 0);
      new.pd_atual := greatest(f.pd_max - new.pd_perdido, 0);
    end if;
  else
    new.pv_atual  := greatest(coalesce(new.pv_atual, 0), 0);
    new.san_atual := greatest(coalesce(new.san_atual, 0), 0);
    new.pe_atual  := greatest(coalesce(new.pe_atual, 0), 0);
  end if;
  if new.pd_atual is not null then new.pd_atual := greatest(new.pd_atual, 0); end if;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists personagens_antes on public.personagens;
create trigger personagens_antes before insert or update on public.personagens
  for each row execute function public.tg_personagens_antes();

-- mudar o máximo de uma ficha recalcula o atual (o total perdido fica)
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

-- o registro passa a guardar também o total perdido (o desfazer usa)
create or replace function public.tg_personagens_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  campos text[] := array['pv_atual','pv_temp','san_atual','pe_atual','pd_atual','condicoes','ancora_ativa',
                         'pv_perdido','san_perdido','pe_perdido','pd_perdido'];
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

-- ajuste (+/−) mexe no total perdido
create or replace function public.ajustar_status(p_personagem uuid, p_campo text, p_delta int)
returns personagens
language plpgsql security invoker set search_path = public as $$
declare
  p personagens;
  f fichas;
  r personagens;
  resto int;
  maximo int;
begin
  if p_campo not in ('pv_atual','san_atual','pe_atual','pd_atual','pv_temp') then
    raise exception 'Campo inválido.';
  end if;
  select * into p from personagens where id = p_personagem;
  if not found then raise exception 'Sem permissão para alterar este personagem.' using errcode = '42501'; end if;
  select * into f from fichas where personagem_id = p.id and variante = case when p.ancora_ativa then '50' else '99' end;

  if p_campo = 'pv_temp' then
    update personagens set pv_temp = greatest(pv_temp + p_delta, 0) where id = p.id returning * into r;
  elsif p_campo = 'pv_atual' then
    maximo := coalesce(f.pv_max, 2147483647);
    if p_delta < 0 then
      -- dano gasta primeiro o PV temporário; o resto vai para o total perdido
      resto := greatest(-p_delta - p.pv_temp, 0);
      update personagens set
        pv_temp = greatest(pv_temp + p_delta, 0),
        pv_perdido = least(pv_perdido + resto, greatest(pv_perdido, maximo))
      where id = p.id returning * into r;
    else
      update personagens set pv_perdido = greatest(pv_perdido - p_delta, 0) where id = p.id returning * into r;
    end if;
  elsif p_campo = 'san_atual' then
    maximo := coalesce(f.san_max, 2147483647);
    update personagens set san_perdido = case when p_delta < 0
        then least(san_perdido - p_delta, greatest(san_perdido, maximo))
        else greatest(san_perdido - p_delta, 0) end
    where id = p.id returning * into r;
  elsif p_campo = 'pe_atual' then
    maximo := coalesce(f.pe_max, 2147483647);
    update personagens set pe_perdido = case when p_delta < 0
        then least(pe_perdido - p_delta, greatest(pe_perdido, maximo))
        else greatest(pe_perdido - p_delta, 0) end
    where id = p.id returning * into r;
  else
    maximo := coalesce(f.pd_max, 2147483647);
    update personagens set pd_perdido = case when p_delta < 0
        then least(coalesce(pd_perdido, 0) - p_delta, greatest(coalesce(pd_perdido, 0), maximo))
        else greatest(coalesce(pd_perdido, 0) - p_delta, 0) end
    where id = p.id returning * into r;
  end if;
  if r.id is null then raise exception 'Sem permissão para alterar este personagem.' using errcode = '42501'; end if;
  return r;
end $$;
