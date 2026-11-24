-- =====================================================================
--  ETAPA 7 — Lore pessoal do jogador (caderno no estilo Obsidian)
--  Cada nota pertence a um personagem. O dono lê e escreve; o mestre lê
--  (e pode corrigir). Ninguém mais vê. Links [[Título]] são resolvidos no
--  site pelo título, então o título é único por personagem.
-- =====================================================================
create table if not exists public.notas_pessoais (
  id            uuid primary key default gen_random_uuid(),
  mesa_id       uuid not null references public.mesas on delete cascade,
  personagem_id uuid not null references public.personagens on delete cascade,
  titulo        text not null check (length(trim(titulo)) between 1 and 120),
  texto         text not null default '',
  tags          text[] not null default '{}',
  fixada        boolean not null default false,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists notas_pessoais_titulo
  on public.notas_pessoais (personagem_id, lower(trim(titulo)));
create index if not exists notas_pessoais_mesa on public.notas_pessoais (mesa_id);

create trigger herdar_mesa before insert on public.notas_pessoais
  for each row execute function public.tg_herdar_mesa_personagem();

create or replace function public.tg_notas_pessoais_tocar() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  new.personagem_id := old.personagem_id;  -- uma nota não muda de dono
  new.mesa_id := old.mesa_id;
  return new;
end $$;
create trigger tocar before update on public.notas_pessoais
  for each row execute function public.tg_notas_pessoais_tocar();

alter table public.notas_pessoais enable row level security;
create policy dono_ou_mestre on public.notas_pessoais for all
  using (eh_mestre(mesa_id) or eh_dono(personagem_id))
  with check (eh_mestre(mesa_id) or eh_dono(personagem_id));

grant select, insert, update, delete on public.notas_pessoais to authenticated;
alter publication supabase_realtime add table public.notas_pessoais;
