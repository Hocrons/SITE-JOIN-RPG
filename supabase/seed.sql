-- =====================================================================
--  SEED — Mesa "Paratus" + 5 personagens
--  ATENÇÃO: apaga e recria a mesa de código PARATUS.
--  PINs iniciais (troque depois na Área do Mestre):
--    Mestre .......... 0000
--    Diego ........... 1111     Rafael Orleans ... 2222
--    Gabriela Hills .. 3333     Plague ........... 4444
--    Rehreus Akeldama  5555
-- =====================================================================

delete from public.mesas where codigo = 'PARATUS';

create or replace function pg_temp.seed_pj(
  p_mesa uuid, p_ordem int, p_nome text, p_jogador text, p_classe text, p_trilha text, p_origem text,
  p_marca boolean, p_pin text,
  f99 jsonb, f50 jsonb
) returns uuid language plpgsql as $$
declare
  pid uuid;
begin
  insert into public.personagens (mesa_id, tipo, nome, jogador, classe, trilha, origem, ordem, tem_marca,
                                  pv_atual, san_atual, pe_atual)
  values (p_mesa, 'pj', p_nome, p_jogador, p_classe, p_trilha, p_origem, p_ordem, p_marca,
          (f99->>'pv')::int, (f99->>'san')::int, (f99->>'pe')::int)
  returning id into pid;

  update public.fichas set nex = 99, pv_max = (f99->>'pv')::int, san_max = (f99->>'san')::int, pe_max = (f99->>'pe')::int
   where personagem_id = pid and variante = '99';
  update public.fichas set nex = 50, pv_max = (f50->>'pv')::int, san_max = (f50->>'san')::int, pe_max = (f50->>'pe')::int
   where personagem_id = pid and variante = '50';

  update public.fichas_detalhes set atributos = f99->'atr' where personagem_id = pid and variante = '99';
  update public.fichas_detalhes set atributos = f50->'atr' where personagem_id = pid and variante = '50';

  insert into public.personagens_pin values (pid, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  return pid;
end $$;

do $$
declare
  m uuid;
begin
  insert into public.mesas (codigo, nome) values ('PARATUS', 'Paratus') returning id into m;
  insert into public.mesas_credenciais values (m, extensions.crypt('0000', extensions.gen_salt('bf')));

  perform pg_temp.seed_pj(m, 1, 'Diego', 'gui', 'Especialista', null, 'Criminoso', true, '1111',
    '{"pv":113,"san":92,"pe":130,"atr":{"AGI":4,"FOR":2,"INT":3,"PRE":3,"VIG":2}}',
    '{"pv":73,"san":52,"pe":50,"atr":{"AGI":3,"FOR":1,"INT":2,"PRE":2,"VIG":3}}');

  -- Valores repetidos nas duas fichas: corrigir depois.
  perform pg_temp.seed_pj(m, 2, 'Rafael Orleans', 'Fernandinha', 'Ocultista', null, 'Experimento', true, '2222',
    '{"pv":108,"san":58,"pe":181,"atr":{"AGI":3,"FOR":3,"INT":1,"PRE":5,"VIG":2}}',
    '{"pv":108,"san":58,"pe":181,"atr":{"AGI":3,"FOR":3,"INT":1,"PRE":5,"VIG":2}}');

  perform pg_temp.seed_pj(m, 3, 'Gabriela Hills', 'Bruno', 'Especialista', null, 'Atleta', true, '3333',
    '{"pv":85,"san":60,"pe":108,"atr":{"AGI":5,"FOR":2,"INT":3,"PRE":3,"VIG":1}}',
    '{"pv":85,"san":60,"pe":108,"atr":{"AGI":5,"FOR":2,"INT":3,"PRE":3,"VIG":1}}');

  perform pg_temp.seed_pj(m, 4, 'Plague', 'Pedro Cunha', 'Especialista', 'Médico de Campo', 'Religioso', true, '4444',
    '{"pv":85,"san":84,"pe":109,"atr":{"AGI":4,"FOR":1,"INT":3,"PRE":3,"VIG":1}}',
    '{"pv":85,"san":84,"pe":109,"atr":{"AGI":4,"FOR":1,"INT":3,"PRE":3,"VIG":1}}');

  -- Nativa da ilha: sem Marca do Império.
  perform pg_temp.seed_pj(m, 5, 'Rehreus Akeldama', 'Julio', 'Ocultista', null, 'Transtornado Arrependido', false, '5555',
    '{"pv":90,"san":65,"pe":60,"atr":{"AGI":3,"FOR":1,"INT":4,"PRE":2,"VIG":4}}',
    '{"pv":90,"san":65,"pe":60,"atr":{"AGI":3,"FOR":1,"INT":4,"PRE":2,"VIG":4}}');
end $$;

-- Lore e linha do tempo: adicionados nas etapas 5 e 6 (seed_lore.sql).
