-- =====================================================================
--  ETAPA 3 — presets do tipo "arma" (ataque + dano no mesmo preset)
--  Rode no SQL Editor do Supabase, depois do 0002.
-- =====================================================================
alter table public.presets_dados drop constraint if exists presets_dados_tipo_check;
alter table public.presets_dados
  add constraint presets_dados_tipo_check check (tipo in ('teste', 'arma', 'dano', 'livre'));
