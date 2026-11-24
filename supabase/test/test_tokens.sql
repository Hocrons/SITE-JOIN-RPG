\set ON_ERROR_STOP 0
select id as mesa from mesas where codigo='PARATUS' \gset
select id as diego from personagens where nome='Diego' \gset
select id as rafael from personagens where nome='Rafael Orleans' \gset
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b1') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select entrar_mesa('PARATUS','0000') \g /dev/null
delete from cenas;
insert into cenas (mesa_id, nome) values (:'mesa','Porto'),(:'mesa','Fora');
select id as porto from cenas where nome='Porto' \gset
select id as fora from cenas where nome='Fora' \gset
select cena_ativar(:'mesa', :'porto');
\echo '== mestre cria tokens: Diego, Rafael, um cultista visível e um oculto, e um na cena inativa'
insert into tokens (mesa_id, cena_id, personagem_id, nome, faccao) values
  (:'mesa',:'porto',:'diego','Diego','agente'),(:'mesa',:'porto',:'rafael','Rafael','agente');
insert into tokens (mesa_id, cena_id, nome, faccao, oculto, tamanho) values
  (:'mesa',:'porto','Cultista','inimigo',false,1),(:'mesa',:'porto','Criatura','paranormal',true,2),(:'mesa',:'fora','Guarda','neutro',false,1);
\echo '== token em cena de outra mesa / dois do mesmo personagem (erros)'
insert into tokens (mesa_id, cena_id, personagem_id, nome) values (:'mesa',:'porto',:'diego','Diego 2');
select count(*) from tokens;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select entrar_mesa('PARATUS','1111',:'diego') ->> 'papel';
\echo '== Diego vê Diego, Rafael e Cultista (sem a Criatura oculta nem o Guarda de outra cena)'
select nome from tokens order by nome;
select pode_ver_token((select id from tokens where nome='Diego')) as ve_diego;
\echo '== Diego move o próprio token'
select nome, coluna, linha from token_mover((select id from tokens where nome='Diego'), 5, 3);
\echo '== Diego tenta mover Rafael e Cultista (erros)'
select token_mover((select id from tokens where nome='Rafael'), 1, 1);
select token_mover((select id from tokens where nome='Cultista'), 1, 1);
\echo '== Diego não edita direto (0 linhas)'
update tokens set coluna = 9 returning nome;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
\echo '== mestre revela a criatura; Diego passa a ver'
update tokens set oculto=false where nome='Criatura';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select nome from tokens order by nome;
reset role;
delete from cenas;
