-- =====================================================================
--  TABULEIRO — cenas organizadas por região (Paratium, Mercatu…)
--  A ordem passa a valer dentro de cada região.
-- =====================================================================
alter table public.cenas add column if not exists regiao text not null default '';
create index if not exists cenas_regiao on public.cenas (mesa_id, regiao, ordem);
