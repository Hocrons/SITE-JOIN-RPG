\set ON_ERROR_STOP 0
select id as mesa from mesas where codigo='PARATUS' \gset
select id as diego from personagens where nome='Diego' \gset
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b1') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select entrar_mesa('PARATUS','0000') \g /dev/null
\echo '== mestre cria duas cenas e ativa o Paratium'
delete from cenas;
insert into cenas (mesa_id, nome, ordem) values (:'mesa','Paratium',0),(:'mesa','Esconderijo',1);
select cena_ativar(:'mesa', (select id from cenas where nome='Paratium'));
select nome, ativa from cenas order by ordem;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select entrar_mesa('PARATUS','1111',:'diego') ->> 'papel';
\echo '== Diego só vê a ativa (Paratium)'
select nome from cenas;
\echo '== Diego não ativa nem edita (erro / 0 linhas)'
select cena_ativar(:'mesa', null);
update cenas set nome='x' returning nome;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select cena_ativar(:'mesa', (select id from cenas where nome='Esconderijo'));
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
\echo '== troca: Diego agora só vê o Esconderijo'
select nome from cenas;
reset role;
