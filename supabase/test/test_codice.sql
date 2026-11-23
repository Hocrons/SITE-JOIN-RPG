\set ON_ERROR_STOP 0
select id as mesa from mesas where codigo='PARATUS' \gset
select id as diego from personagens where nome='Diego' \gset
select id as gabi from personagens where nome='Gabriela Hills' \gset
select id as lirio from lore_entradas where titulo like 'Lírio%' \gset
select id as renata from lore_entradas where titulo='Renata Hills' \gset
select id as con from lore_conexoes where origem_id=:'lirio' and destino_id=:'renata' \gset
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b1'),('00000000-0000-0000-0000-0000000000c1') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
select entrar_mesa('PARATUS','0000') ->> 'papel' as mestre;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
select entrar_mesa('PARATUS','1111', :'diego') ->> 'papel' as diego;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select entrar_mesa('PARATUS','3333', :'gabi') ->> 'papel' as gabi;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
\echo '== Diego: só o público (12 entradas, 9 conexões, 0 notas)'
select count(*) entradas from lore_entradas;
select count(*) conexoes from lore_conexoes;
select count(*) notas from lore_notas_mestre;
\echo '== jogador não muda visibilidade (erro esperado)'
select lore_visibilidade('entrada', :'lirio', 'todos');
update lore_entradas set titulo='x' where visibilidade='todos';

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
\echo '== mestre revela Lírio e Renata só para a Gabi, e a conexão também'
select lore_visibilidade('entrada', :'lirio', 'especificos', array[:'gabi']::uuid[]);
select lore_visibilidade('entrada', :'renata', 'especificos', array[:'gabi']::uuid[]);
select lore_visibilidade('conexao', :'con', 'especificos', array[:'gabi']::uuid[]);
select count(*) as mestre_ve from lore_entradas;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
\echo '== Gabi vê 14 entradas e a conexão casado com'
select count(*) from lore_entradas;
select rotulo from lore_conexoes where id=:'con';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
\echo '== Diego continua com 12 e sem a conexão'
select count(*) from lore_entradas;
select count(*) from lore_conexoes where id=:'con';
select count(*) as revelacoes_alheias from lore_entradas_reveladas;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
\echo '== mestre esconde o Lírio de novo: a conexão some para a Gabi'
select lore_visibilidade('entrada', :'lirio', 'mestre');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
select count(*) entradas, (select count(*) from lore_conexoes where id=:'con') conexao from lore_entradas;
reset role;
