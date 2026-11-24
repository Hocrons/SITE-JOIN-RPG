\set ON_ERROR_STOP 1
select id as mesa from mesas where codigo='PARATUS' \gset
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
create temp table bk as select exportar_mesa(:'mesa') as j;
\echo '== exportado: contagens'
select k, jsonb_array_length(v) from bk, jsonb_each(j->'tabelas') e(k, v) where jsonb_array_length(v) > 0 order by 1;
select count(*) as membros_antes from membros where mesa_id = :'mesa';
\echo '== bagunça: muda PV, apaga lore, apaga uma nota, cria personagem novo'
update personagens set pv_atual = 1 where nome = 'Diego';
delete from lore_entradas where titulo = 'Moisés, o Imperador';
insert into personagens (mesa_id, nome, tipo) values (:'mesa', 'Intruso', 'npc');
\echo '== restaura'
select restaurar_mesa(:'mesa', (select j from bk)) ->> 'lore_entradas' as lore_restaurada;
select pv_atual from personagens where nome = 'Diego';
select count(*) as moises from lore_entradas where titulo = 'Moisés, o Imperador';
select count(*) as intruso from personagens where nome = 'Intruso';
select count(*) as membros_depois from membros where mesa_id = :'mesa';
\echo '== jogador não exporta (erro esperado)'
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
\set ON_ERROR_STOP 0
select exportar_mesa(:'mesa') is not null;
reset role;
select count(*) as pins from personagens_pin pp join personagens p on p.id = pp.personagem_id where p.mesa_id = :'mesa';
