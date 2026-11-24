\set ON_ERROR_STOP 0
select id as mesa from mesas where codigo='PARATUS' \gset
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
\echo '== mestre envia um arquivo e põe no quadro'
insert into arquivos_mesa (mesa_id, titulo, tipo, texto) values (:'mesa','Carta do Thiago','texto','Encontre-me no porto.') returning titulo;
insert into quadro_cartoes (mesa_id, tipo, arquivo_id, x, y) select :'mesa','arquivo', id, 10, 10 from arquivos_mesa returning autor;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
\echo '== Diego vê o arquivo, cria nota, liga e move'
select titulo from arquivos_mesa;
insert into quadro_cartoes (mesa_id, tipo, texto, x, y) values (:'mesa','nota','Porto = Mercatu?', 300, 40) returning autor;
insert into quadro_ligacoes (mesa_id, origem_id, destino_id, rotulo)
  select :'mesa', (select id from quadro_cartoes where tipo='arquivo'), (select id from quadro_cartoes where tipo='nota'), 'mesmo lugar?' returning rotulo;
update quadro_cartoes set x = 50 where tipo='arquivo' returning x, autor;
\echo '== Diego não envia nem apaga arquivo (0 linhas / erro esperado)'
insert into arquivos_mesa (mesa_id, titulo, tipo) values (:'mesa','x','texto');
delete from arquivos_mesa returning id;
reset role;
\echo '== quem não é da mesa não vê nada'
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000ff',false);
select count(*) from quadro_cartoes;
reset role;
