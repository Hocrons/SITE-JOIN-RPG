-- Testes das regras de segurança e da Âncora (rodar depois de schema + seed).
\set ON_ERROR_STOP 0
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'),
                              ('00000000-0000-0000-0000-00000000000c');
\set MESTRE '\'00000000-0000-0000-0000-00000000000a\''
\set DIEGO  '\'00000000-0000-0000-0000-00000000000b\''
\set RAFA   '\'00000000-0000-0000-0000-00000000000c\''
select id as diego from personagens where nome = 'Diego' \gset
select id as rafa  from personagens where nome = 'Rafael Orleans' \gset
select id as rehr  from personagens where nome = 'Rehreus Akeldama' \gset
select id as mesa  from mesas where codigo = 'PARATUS' \gset

set role authenticated;

\echo '== 1. PIN errado conta tentativa; PIN certo entra'
select set_config('request.jwt.claim.sub', :DIEGO, false);
select entrar_mesa('paratus', '9999', :'diego') ->> 'erro' as pin_errado;
select entrar_mesa('paratus', '1111', :'diego') ->> 'papel' as diego_entrou;
select set_config('request.jwt.claim.sub', :RAFA, false);
select entrar_mesa('PARATUS', '2222', :'rafa') ->> 'papel' as rafa_entrou;
select set_config('request.jwt.claim.sub', :MESTRE, false);
select entrar_mesa('PARATUS', '0000') ->> 'papel' as mestre_entrou;
reset role;
select count(*) as tentativas_registradas_antes_do_acerto from tentativas_pin;
set role authenticated;

\echo '== 2. Jogador: edita a própria, não a dos outros, não liga Âncora'
select set_config('request.jwt.claim.sub', :DIEGO, false);
select (ajustar_status(:'diego', 'pv_atual', -10)).pv_atual as diego_pv_depois_de_menos_10;
select ajustar_status(:'rafa', 'pv_atual', -10);                 -- deve falhar
update personagens set pv_atual = 1 where id = :'rafa';           -- 0 linhas
update personagens set ancora_ativa = true where id = :'diego';   -- deve falhar
select ancora_definir(:'mesa', true);                             -- deve falhar
select count(*) as detalhes_visiveis_para_diego from fichas_detalhes;   -- esperado 2 (só as dele)
select count(*) as fichas_visiveis_para_diego from fichas;              -- esperado 10 (barras de todos)
select count(*) as log_visivel_para_diego from log_alteracoes;          -- esperado 0

\echo '== 3. Mestre: Marca do Império em Diego e Rehreus (Rehreus não tem marca)'
select set_config('request.jwt.claim.sub', :MESTRE, false);
select ancora_definir(:'mesa', true, array[:'diego', :'rehr']::uuid[], 'marca') as afetados_esperado_1;
select nome, ancora_ativa, pv_atual, san_atual, pe_atual from personagens where id in (:'diego', :'rehr') order by nome;
\echo '   (Diego: PV 103->73, SAN 92->52, PE 130->50)'
select ancora_definir(:'mesa', false, array[:'diego']::uuid[], 'marca') as desligou;
select nome, ancora_ativa, pv_atual, san_atual, pe_atual from personagens where id = :'diego';
\echo '   (ao sair, valores continuam 73/52/50)'

\echo '== 4. Âncora global (Zona) + desfazer'
update personagens set pv_atual = 999 where id = :'diego';  -- corta em 113
select ancora_definir(:'mesa', true) as zona_todos;
select nome, ancora_ativa, pv_atual from personagens order by ordem;
select ancora_global from mesas;
select desfazer_ultima(:'mesa') as campos_desfeitos;
select nome, ancora_ativa, pv_atual from personagens order by ordem;
select campo, antes, depois, autor, desfeito from log_alteracoes order by id desc limit 4;

\echo '== 5. Lore: só o mestre / revelado a específicos / todos'
insert into lore_entradas (mesa_id, tipo, titulo) values (:'mesa', 'segredo', 'O Imperador está morto') returning id as seg \gset
insert into lore_entradas (mesa_id, tipo, titulo, visibilidade) values (:'mesa', 'local', 'Porto de Paratus', 'todos') returning id as porto \gset
insert into lore_conexoes (mesa_id, origem_id, destino_id, rotulo, visibilidade) values (:'mesa', :'seg', :'porto', 'escondido em', 'todos');
select set_config('request.jwt.claim.sub', :DIEGO, false);
select titulo from lore_entradas order by titulo;       -- só Porto
select count(*) as conexoes_diego from lore_conexoes;  -- 0 (segredo oculto)
select set_config('request.jwt.claim.sub', :MESTRE, false);
update lore_entradas set visibilidade = 'especificos' where id = :'seg';
insert into lore_entradas_reveladas (entrada_id, personagem_id) values (:'seg', :'diego');
select set_config('request.jwt.claim.sub', :DIEGO, false);
select titulo from lore_entradas order by titulo;       -- Porto + segredo
select count(*) as conexoes_diego from lore_conexoes;  -- 1
select set_config('request.jwt.claim.sub', :RAFA, false);
select titulo from lore_entradas order by titulo;       -- só Porto
insert into lore_entradas (mesa_id, tipo, titulo) values (:'mesa', 'nota', 'hack');  -- deve falhar

\echo '== 6. Dados'
select set_config('request.jwt.claim.sub', :DIEGO, false);
select total, critico, detalhes->'termos' as termos from rolar(:'mesa', '4d20kh1+5', 'Furtividade', :'diego');
select total, detalhes->'termos' as termos from rolar(:'mesa', '2d20kl1', 'Atributo 0', :'diego');
select total, detalhes->'termos' as termos from rolar(:'mesa', '2d6+1d8+3', 'Katana – dano', :'diego', false, 19, 3, true);
select rolar(:'mesa', '2d6+abc');                       -- deve falhar
select rolar(:'mesa', '1d20', 'roubar', :'rafa');        -- deve falhar
select total from rolar(:'mesa', '1d20', 'Só para o mestre', :'diego', true);
select set_config('request.jwt.claim.sub', :RAFA, false);
select count(*) as rolagens_que_rafa_ve from rolagens;   -- 3 (não vê a secreta)
select set_config('request.jwt.claim.sub', :MESTRE, false);
select count(*) as rolagens_que_mestre_ve from rolagens; -- 4

\echo '== 7. Combate: PV do monstro escondido'
insert into combates (mesa_id) values (:'mesa') returning id as comb \gset
insert into participantes (combate_id, nome, tipo, pv_atual, pv_max) values (:'comb', 'Cão de Sangue', 'ameaca', 40, 40);
select set_config('request.jwt.claim.sub', :DIEGO, false);
select nome, pv_atual from participantes_publico;       -- pv nulo
select count(*) as participantes_reais_diego from participantes;  -- 0
reset role;

\echo '== 8. PV temporário: acima do máximo, dano consome primeiro, Âncora não corta'
set role authenticated;
select set_config('request.jwt.claim.sub', :DIEGO, false);
update personagens set pv_atual = 113 where id = :'diego';
select (ajustar_status(:'diego', 'pv_temp', 15)).pv_temp as temp_15;
select pv_atual, pv_temp from ajustar_status(:'diego', 'pv_atual', -10);   -- esperado 113 / 5
select pv_atual, pv_temp from ajustar_status(:'diego', 'pv_atual', -8);    -- esperado 110 / 0
select (ajustar_status(:'diego', 'pv_temp', 20)).pv_temp as temp_20;
select set_config('request.jwt.claim.sub', :MESTRE, false);
select ancora_definir(:'mesa', true, array[:'diego']::uuid[], 'marca');
select pv_atual, pv_temp from personagens where id = :'diego';               -- esperado 73 / 20
reset role;
