-- =====================================================================
--  Modificações e maldições aplicadas a um item da ficha.
--  Ficam dentro do próprio item (não são itens soltos no inventário).
--  Cada uma: { "id", "catalogo_id", "nome", "tipo": "modificacao"|"maldicao",
--              "efeito", "elemento" }
--  A categoria final é calculada no site: +I por modificação;
--  a primeira maldição dá +II e as seguintes +I.
-- =====================================================================
alter table public.personagem_itens
  add column if not exists melhorias jsonb not null default '[]'::jsonb;
