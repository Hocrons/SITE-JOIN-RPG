-- =====================================================================
--  TABULEIRO — etapa 3: névoa de guerra
--  A névoa de cada cena é uma máscara (PNG com transparência) guardada em
--  cenas/<mesa>/<cena>/nevoa-*.png — o mesmo caminho do mapa, então só quem
--  pode ver a cena consegue ler. Opaco = coberto.
-- =====================================================================
alter table public.cenas add column if not exists nevoa_ativa boolean not null default false;
alter table public.cenas add column if not exists nevoa_caminho text;
