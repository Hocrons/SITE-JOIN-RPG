\set ON_ERROR_STOP 0
select id as diego from personagens where nome = 'Diego' \gset
select id as rafa from personagens where nome = 'Rafael Orleans' \gset
select id as mesa from mesas where codigo = 'PARATUS' \gset
select id as katana from catalogo where nome = 'Katana' and mesa_id is null \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
\echo '== jogador lê o catálogo base'
select count(*) > 400 as le_base from catalogo;
\echo '== não altera o catálogo base (0 linhas)'
update catalogo set resumo = 'hack' where id = :'katana';
\echo '== cria item da mesa'
insert into catalogo (mesa_id, tipo, nome, resumo, criado_por) values (:'mesa', 'item', 'Bússola da avó', 'Aponta para o farol.', '00000000-0000-0000-0000-00000000000b') returning nome;
\echo '== põe Katana na própria ficha; não consegue na ficha da Rafael'
insert into personagem_itens (personagem_id, catalogo_id, secao, tipo, nome) values (:'diego', :'katana', 'inventario', 'arma', 'Katana') returning nome, mesa_id is not null as herdou_mesa;
insert into personagem_itens (personagem_id, catalogo_id, secao, tipo, nome) values (:'rafa', :'katana', 'inventario', 'arma', 'Katana');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
\echo '== Rafael não vê os itens do Diego'
select count(*) as itens_visiveis from personagem_itens;
reset role;
