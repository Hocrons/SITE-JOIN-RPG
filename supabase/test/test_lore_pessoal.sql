\set ON_ERROR_STOP 0
select id as diego from personagens where nome='Diego' \gset
select id as gabi from personagens where nome='Gabriela Hills' \gset
set role authenticated;
-- b1 = Diego, c1 = Gabi, a1 = mestre (entraram no test_codice)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
\echo '== Diego cria duas notas'
insert into notas_pessoais (personagem_id, titulo, texto) values (:'diego','Limus','Vende [[Informação]]'), (:'diego','Informação','');
\echo '== título repetido (erro esperado)'
insert into notas_pessoais (personagem_id, titulo) values (:'diego','limus ');
\echo '== Diego não cria nota na ficha da Gabi (erro esperado)'
insert into notas_pessoais (personagem_id, titulo) values (:'gabi','Invasão');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
\echo '== Gabi não vê as notas do Diego (0)'
select count(*) from notas_pessoais;
update notas_pessoais set texto='x';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
\echo '== mestre vê as 2'
select count(*) from notas_pessoais;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
\echo '== Diego não consegue passar a nota para a Gabi (dono continua Diego)'
update notas_pessoais set personagem_id=:'gabi' where titulo='Limus';
select count(*) from notas_pessoais where personagem_id=:'diego';
reset role;
