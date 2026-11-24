\set ON_ERROR_STOP 0
select id as mesa from mesas where codigo='PARATUS' \gset
select id as diego from personagens where nome='Diego' \gset
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b1') on conflict do nothing;
delete from cenas;
insert into cenas (mesa_id, nome, ativa) values (:'mesa','Porto', true);
select id as cena from cenas where nome='Porto' \gset
delete from storage.objects where name like 'cenas/%';
insert into storage.objects (bucket_id, name) values
 ('midia', 'cenas/'||:'mesa'||'/'||:'cena'||'/1-mapa.webp'),
 ('midia', 'cenas/'||:'mesa'||'/'||:'cena'||'/jog-2-mapa.webp'),
 ('midia', 'cenas/'||:'mesa'||'/'||:'cena'||'/nevoa-3.png');
grant select on storage.objects to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
select entrar_mesa('PARATUS','1111',:'diego') ->> 'papel';
\echo '== névoa desligada: jogador lê os três'
select regexp_replace(name,'.*/','') from storage.objects where name like 'cenas/%' order by 1;
reset role;
update cenas set nevoa_ativa = true;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false) \g /dev/null
\echo '== névoa ligada: jogador NÃO lê o mapa original'
select regexp_replace(name,'.*/','') from storage.objects where name like 'cenas/%' order by 1;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select entrar_mesa('PARATUS','0000') ->> 'papel';
\echo '== mestre lê tudo'
select regexp_replace(name,'.*/','') from storage.objects where name like 'cenas/%' order by 1;
reset role;
delete from storage.objects where name like 'cenas/%';
delete from cenas;
