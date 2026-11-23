\set ON_ERROR_STOP 0
select id as mesa from mesas where codigo='PARATUS' \gset
select id as diego from personagens where nome='Diego' \gset
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
insert into combates (mesa_id, nome) values (:'mesa', 'Emboscada no farol') returning id as comb \gset
insert into participantes (combate_id, nome, tipo, iniciativa, pv_atual, pv_max, defesa, iniciativa_dados, iniciativa_bonus) values (:'comb','Cão de Sangue 1','ameaca',18,40,40,15,2,5) returning id as cao \gset
insert into participantes (combate_id, personagem_id, nome, tipo, iniciativa) values (:'comb', :'diego', 'Diego', 'pj', 22) returning id as pdiego \gset
update combates set vez_id = :'pdiego', rodada = 1 where id = :'comb';
insert into combates (mesa_id, nome) values (:'mesa', 'outro');  -- deve falhar: só um ativo
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
\echo '== jogador vê o combate, a vez e a ordem, sem PV do monstro'
select nome, rodada, vez_id = :'pdiego' as vez_do_diego from combates where ativo;
select nome, iniciativa, pv_atual from participantes_publico order by iniciativa desc;
select count(*) as participantes_reais from participantes;
update combates set rodada = 9;  -- 0 linhas
reset role;
update participantes set pv_visivel = true where id = :'cao';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
\echo '== mestre liberou o PV do cão'
select nome, pv_atual, pv_max from participantes_publico where tipo='ameaca';
reset role;
