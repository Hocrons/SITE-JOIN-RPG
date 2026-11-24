\set ON_ERROR_STOP 1
select id as mesa from mesas where codigo='PARATUS' \gset
select id as diego from personagens where nome='Diego' \gset
-- Diego: 99% PV113 SAN92 PE130 | 50% PV73 SAN52 PE50
update personagens set ancora_ativa=false, pv_perdido=0, san_perdido=0, pe_perdido=0, pv_temp=0 where id=:'diego';
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select entrar_mesa('PARATUS','0000') \g /dev/null
\echo '== 1. dano 20 em PV, gasta 30 PE (ficha 99%)'
select pv_atual, pv_perdido from ajustar_status(:'diego','pv_atual',-20);
select pe_atual, pe_perdido from ajustar_status(:'diego','pe_atual',-30);
\echo '== 2. liga a Âncora: máximo vira 73/50, total continua (PV 53, PE 20)'
select ancora_definir(:'mesa', true, array[:'diego']::uuid[]);
select pv_atual, pv_perdido, pe_atual, pe_perdido from personagens where id=:'diego';
\echo '== 3. na 50%, gasta mais 40 PE: total vai a 50 (máximo), PE 0'
select pe_atual, pe_perdido from ajustar_status(:'diego','pe_atual',-40);
\echo '== 4. desliga a Âncora: PE = 130 - 50 = 80'
select ancora_definir(:'mesa', false, array[:'diego']::uuid[]);
select pe_atual, pe_perdido from personagens where id=:'diego';
\echo '== 5. cura 5 PV: total 15, PV 98'
select pv_atual, pv_perdido from ajustar_status(:'diego','pv_atual',5);
\echo '== 6. PV temporário 10, dano 25: temp some, total +15 = 30, PV 83'
select pv_temp from ajustar_status(:'diego','pv_temp',10);
select pv_atual, pv_temp, pv_perdido from ajustar_status(:'diego','pv_atual',-25);
\echo '== 7. Fixar PV em 100: total 13'
update personagens set pv_atual=100 where id=:'diego';
select pv_atual, pv_perdido from personagens where id=:'diego';
\echo '== 8. ficha de 99% sobe PV max para 120: PV 107'
update fichas set pv_max=120 where personagem_id=:'diego' and variante='99';
select pv_atual, pv_perdido from personagens where id=:'diego';
update fichas set pv_max=113 where personagem_id=:'diego' and variante='99';
\echo '== 9. desfazer o último bloco'
select desfazer_ultima(:'mesa');
select pv_atual, pv_perdido from personagens where id=:'diego';
reset role;
