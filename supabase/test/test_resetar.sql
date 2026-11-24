\set ON_ERROR_STOP 0
select id as mesa from mesas where codigo='PARATUS' \gset
select id as diego from personagens where nome='Diego' \gset
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b1') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select entrar_mesa('PARATUS','0000') ->> 'papel';
update personagens set pv_atual = 10, san_atual = 5, pv_temp = 7, condicoes = '{Abalado,Caído}', ancora_ativa = true where id = :'diego';
update personagens_privado set anotacoes = 'bagunça' where personagem_id = :'diego';
select count(*) > 0 as tem_registro from log_alteracoes where personagem_id = :'diego';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select entrar_mesa('PARATUS','1111',:'diego') ->> 'papel';
\echo '== jogador não reseta (erro)'
select resetar_fichas(:'mesa', array[:'diego']::uuid[]);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select entrar_mesa('PARATUS','0000') ->> 'papel';
\echo '== mestre reseta status, condições, anotações e registro'
select resetar_fichas(:'mesa', array[:'diego']::uuid[], true, true, true, true, false);
select p.pv_atual = f.pv_max as pv_cheio, p.san_atual = f.san_max as san_cheia, p.pv_temp, p.condicoes, p.ancora_ativa, p.pv_reserva
  from personagens p join fichas f on f.personagem_id = p.id and f.variante = '99' where p.id = :'diego';
select anotacoes from personagens_privado where personagem_id = :'diego';
select count(*) as registro from log_alteracoes where personagem_id = :'diego';
reset role;
