\set ON_ERROR_STOP 1
select id as mesa from mesas where codigo='PARATUS' \gset
select id as diego from personagens where nome='Diego' \gset
-- Diego: 99% PV113 SAN92 PE130 | 50% PV73 SAN52 PE50
update personagens set ancora_ativa=false, pv_atual=113, san_atual=92, pe_atual=130, pv_temp=0,
  pv_reserva=0, san_reserva=0, pe_reserva=0 where id=:'diego';
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000a1') on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false) \g /dev/null
select entrar_mesa('PARATUS','0000') \g /dev/null
\echo '== 1. cheio, entra na Âncora: PV 73 (40 guardados), SAN 52 (40), PE 50 (80)'
select ancora_definir(:'mesa', true, array[:'diego']::uuid[]) \g /dev/null
select pv_atual, pv_reserva, san_atual, san_reserva, pe_atual, pe_reserva from personagens where id=:'diego';
\echo '== 2. dentro: dano 10 (PV 63), cura 30 só até 73'
select pv_atual from ajustar_status(:'diego','pv_atual',-10);
select pv_atual from ajustar_status(:'diego','pv_atual',30);
\echo '== 3. dano 10 de novo (63) e sai: 63 + 40 = 103'
select pv_atual from ajustar_status(:'diego','pv_atual',-10);
select ancora_definir(:'mesa', false, array[:'diego']::uuid[]) \g /dev/null
select pv_atual, pv_reserva from personagens where id=:'diego';
\echo '== 4. desfazer a saída: volta a 63 dentro, 40 guardados'
select desfazer_ultima(:'mesa') \g /dev/null
select ancora_ativa, pv_atual, pv_reserva from personagens where id=:'diego';
\echo '== 5. desfazer de novo (o dano): 73 dentro'
select desfazer_ultima(:'mesa') \g /dev/null
select ancora_ativa, pv_atual, pv_reserva from personagens where id=:'diego';
\echo '== 6. sai; com 40 de PV fora, entra: nada muda (40), nada guardado'
select ancora_definir(:'mesa', false, array[:'diego']::uuid[]) \g /dev/null
update personagens set pv_atual = 40 where id=:'diego';
select ancora_definir(:'mesa', true, array[:'diego']::uuid[]) \g /dev/null
select pv_atual, pv_reserva from personagens where id=:'diego';
\echo '== 7. dentro, cura 50: para em 73; sai: continua 73'
select pv_atual from ajustar_status(:'diego','pv_atual',50);
select ancora_definir(:'mesa', false, array[:'diego']::uuid[]) \g /dev/null
select pv_atual, pv_reserva from personagens where id=:'diego';
\echo '== 8. fora, cura 100: para em 113'
select pv_atual from ajustar_status(:'diego','pv_atual',100);
reset role;
