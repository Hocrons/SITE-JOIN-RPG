-- =====================================================================
--  ETAPA 2 — aliados aparecem só com nome e NEX
--  Rode no SQL Editor do Supabase (uma vez), depois do 0001.
-- =====================================================================

-- Espelho público: só o que os outros jogadores podem ver.
create table if not exists public.personagens_publico (
  id        uuid primary key references public.personagens on delete cascade,
  mesa_id   uuid not null references public.mesas on delete cascade,
  tipo      text not null,
  nome      text not null,
  jogador   text,
  nex       int,
  ordem     int not null default 0,
  arquivado boolean not null default false
);

create or replace function public.tg_personagem_publico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  if tg_table_name = 'fichas' then
    pid := new.personagem_id;
  else
    pid := new.id;
  end if;
  insert into personagens_publico (id, mesa_id, tipo, nome, jogador, nex, ordem, arquivado)
  select p.id, p.mesa_id, p.tipo, p.nome, p.jogador,
         (select f.nex from fichas f
           where f.personagem_id = p.id and f.variante = case when p.ancora_ativa then '50' else '99' end),
         p.ordem, p.arquivado
    from personagens p where p.id = pid
  on conflict (id) do update set
    tipo = excluded.tipo, nome = excluded.nome, jogador = excluded.jogador, nex = excluded.nex,
    ordem = excluded.ordem, arquivado = excluded.arquivado;
  return null;
end $$;

drop trigger if exists publico on public.personagens;
create trigger publico after insert or update on public.personagens
  for each row execute function public.tg_personagem_publico();
drop trigger if exists publico on public.fichas;
create trigger publico after insert or update on public.fichas
  for each row execute function public.tg_personagem_publico();

-- Preenche com o que já existe.
insert into public.personagens_publico (id, mesa_id, tipo, nome, jogador, nex, ordem, arquivado)
select p.id, p.mesa_id, p.tipo, p.nome, p.jogador,
       (select f.nex from public.fichas f
         where f.personagem_id = p.id and f.variante = case when p.ancora_ativa then '50' else '99' end),
       p.ordem, p.arquivado
  from public.personagens p
on conflict (id) do nothing;

alter table public.personagens_publico enable row level security;
create policy ler on public.personagens_publico for select
  using (eh_mestre(mesa_id) or (eh_membro(mesa_id) and tipo = 'pj'));
grant select on public.personagens_publico to authenticated;

-- Agora o personagem completo (PV, SAN, PE, condições) e as fichas são só do dono e do mestre.
drop policy if exists ler on public.personagens;
create policy ler on public.personagens for select
  using (eh_mestre(mesa_id) or eh_dono(id));

drop policy if exists ler on public.fichas;
create policy ler on public.fichas for select
  using (eh_mestre(mesa_id) or eh_dono(personagem_id));

alter publication supabase_realtime add table public.personagens_publico;
