-- =====================================================================
--  ETAPA 5 — Combate e iniciativa
--  Rode no SQL Editor do Supabase, depois do 0006.
-- =====================================================================

-- Iniciativa no estilo da Ordem: quantos d20 (fica o maior) + bônus.
alter table public.participantes
  add column if not exists iniciativa_dados int not null default 1,
  add column if not exists iniciativa_bonus int not null default 0;

alter table public.modelos_ameaca
  add column if not exists iniciativa_dados int not null default 1;

-- De quem é a vez (por participante, resiste a reordenar e remover).
alter table public.combates
  add column if not exists vez_id uuid references public.participantes on delete set null;

-- Um combate ativo por mesa.
create unique index if not exists um_combate_ativo on public.combates (mesa_id) where ativo;

grant select, insert, update, delete on public.modelos_ameaca, public.combates, public.participantes to authenticated;
grant select on public.participantes_publico to authenticated;
