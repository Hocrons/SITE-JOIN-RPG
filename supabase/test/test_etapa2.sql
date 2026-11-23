\set ON_ERROR_STOP 0
insert into auth.users values ('00000000-0000-0000-0000-0000000000b1'), ('00000000-0000-0000-0000-0000000000c1') on conflict do nothing;
select id as diego from personagens where nome = 'Diego' \gset
select id as rafa  from personagens where nome = 'Rafael Orleans' \gset
select id as mesa  from mesas where codigo = 'PARATUS' \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
select entrar_mesa('PARATUS', '1111', :'diego') ->> 'papel';
\echo '== Diego vê só a própria ficha completa'
select nome from personagens;
select count(*) as fichas from fichas;
\echo '== mas vê nome e NEX de todos'
select nome, nex from personagens_publico order by ordem;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select ancora_definir(:'mesa', true, array[:'rafa']::uuid[]);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
\echo '== NEX da Rafael muda para 50 com a Âncora'
select nome, nex from personagens_publico where id = :'rafa';
reset role;
