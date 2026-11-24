-- =====================================================================
--  ETAPA 9 — Linha do tempo
--  * evento_visibilidade(): quem vê um evento (só o mestre), numa operação.
--  * semear_linha_paratus(mesa): eventos iniciais tirados do Notion.
--    Só o resumo da Temporada 1 entra visível; o resto é do mestre.
--    Os eventos se ligam às entradas do Códice pelo título.
-- =====================================================================
create or replace function public.evento_visibilidade(
  p_id uuid, p_visibilidade text, p_personagens uuid[] default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  if p_visibilidade not in ('mestre','todos','especificos') then raise exception 'visibilidade inválida'; end if;
  select mesa_id into m from eventos where id = p_id;
  if m is null or not eh_mestre(m) then raise exception 'só o mestre muda a visibilidade'; end if;
  update eventos set visibilidade = p_visibilidade where id = p_id;
  delete from eventos_revelados where evento_id = p_id;
  if p_visibilidade = 'especificos' then
    insert into eventos_revelados (evento_id, personagem_id, mesa_id)
    select p_id, pe.id, m from personagens pe where pe.mesa_id = m and pe.id = any(p_personagens);
  end if;
end $$;
revoke all on function public.evento_visibilidade(uuid, text, uuid[]) from public, anon;
grant execute on function public.evento_visibilidade(uuid, text, uuid[]) to authenticated;

-- atualizado_em ao editar um evento
drop trigger if exists tocar_evento on public.eventos;
create or replace function public.tg_evento_tocar() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); new.mesa_id := old.mesa_id; return new; end $$;
create trigger tocar_evento before update on public.eventos
  for each row execute function public.tg_evento_tocar();

create or replace function public.semear_linha_paratus(p_mesa uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  evs jsonb := '[{"o": 10, "d": "Outra época", "e": "Passado da ilha", "a": true, "t": "As ruínas do Jardim do Cupido chegam à ilha", "x": "Uma civilização destruída numa guerra de outra época vai parar em Paratus, com a Coroa Corrupta e o conto dos dois amantes.", "v": "mestre", "l": ["Jardim do Cupido", "Coroa Corrupta"]}, {"o": 20, "d": "Um imperador antes de Andreias", "e": "Passado da ilha", "a": true, "t": "Elie foge da ilha com o Catalisador Erudito", "x": "Aos 15 anos recebe a bênção e pouco depois escapa levando a pedra dourada. Fora da ilha, vira avó do Breno e da Chihiro.", "v": "mestre", "l": ["Elie Tereza Veríssimo", "Catalisador Erudito"]}, {"o": 30, "d": "Anos atrás", "e": "Passado da ilha", "a": true, "t": "Petreus funda a Rebelião", "x": "Petreus Plutão, o Eterno, começa a Rebelião. Mais tarde a doença do paranormal o petrifica.", "v": "mestre", "l": ["Petreus Plutão, o Eterno", "A Rebelião"]}, {"o": 40, "d": "Anos atrás", "e": "Passado da ilha", "a": true, "t": "Moisés e Calebe chegam à ilha", "x": "Dois agentes da Ordem, atrás da civilização perdida. Os registros dos dois são censurados.", "v": "mestre", "l": ["Moisés, o Imperador", "Limus, o Vendedor Paranormal", "Ordo Realitas"]}, {"o": 50, "d": "Anos atrás", "e": "Passado da ilha", "a": true, "t": "O pacto de paz com a Tribo Artuã", "x": "Calebe, conselheiro de Andreias, firma a paz com a tribo e recebe o crânio de alce com a espiral.", "v": "mestre", "l": ["Andreias", "Limus, o Vendedor Paranormal", "Tribo Artuã"]}, {"o": 60, "d": "Quando a Gabi tinha 7 anos", "e": "Passado da ilha", "a": false, "t": "O avião dos Hills cai em Paratus", "x": "Lírio e Renata caem na ilha com as fontes puras apreendidas dos Orleans. Renata vira energia pura; Lírio perde os itens.", "v": "mestre", "l": ["Lírio Hills, \"o Viajante\"", "Renata Hills", "As fontes puras do Lírio", "Gabriela Hills (agente)"]}, {"o": 70, "d": "Anos atrás", "e": "Passado da ilha", "a": true, "t": "Moisés mata Andreias no Paratium", "x": "Moisés desafia o imperador, vence, toma a Faixa do Campeão e o trono. Tenta eliminar Calebe com um ritual: o corpo vira lodo. A filha de Andreias, Lívia, é escondida no palácio.", "v": "mestre", "l": ["Moisés, o Imperador", "Andreias", "Faixa do Campeão", "Limus, o Vendedor Paranormal", "Lívia, a Criança do Limiar"]}, {"o": 75, "d": "Depois do golpe", "e": "Passado da ilha", "a": true, "t": "Moisés rompe o pacto com a Tribo Artuã", "x": "Ayo perde a mão protegendo a tribo. Desde então a tribo teme o Império.", "v": "mestre", "l": ["Ayo, líder Artuã", "Tribo Artuã", "Moisés, o Imperador"]}, {"o": 80, "d": "Antes da temporada", "e": "Passado da ilha", "a": true, "t": "Rehreus e Gota sobrevivem ao Paratium", "x": "Só os dois saem vivos do cativeiro no coliseu, muito feridos, e são resgatados pela Rebelião.", "v": "mestre", "l": ["Rehreus Akeldama (agente)", "Gota", "A Rebelião", "Paratium (Coliseu)"]}, {"o": 100, "d": "Jan/2025", "e": "Temporada 1", "a": false, "t": "A equipe de pesquisa da Ordem desaparece", "x": "A caminho de Trindade e Martim Vaz, a equipe some. Só as malas são encontradas boiando.", "v": "todos", "l": ["Temporada 1 até o time skip"]}, {"o": 105, "d": "Jan/2025", "e": "Temporada 1", "a": false, "t": "A onda traz os pesquisadores para a ilha", "x": "Dias antes dos agentes, a equipe chega a Paratus. Thiago some com a pasta; Letícia morre no teste do Paratium; Renato fica; Murilo desaparece.", "v": "mestre", "l": ["A equipe de pesquisa desaparecida", "Thiago Orleans", "A onda e a canção"]}, {"o": 110, "d": "2025", "e": "Temporada 1", "a": false, "t": "A missão de resgate parte no Princesa Calíope", "x": "Breno convoca, Gabriela lidera. Uma onda gigante e uma canção atraente atingem o barco; a pedra da Chihiro cria uma barreira dourada.", "v": "todos", "l": ["Temporada 1 até o time skip", "Gabriela Hills (agente)"]}, {"o": 120, "d": "2025", "e": "Temporada 1", "a": false, "t": "A equipe acorda numa praia", "x": "O navegador Ronaldo está morto, com cortes profundos no peito e no pescoço.", "v": "todos", "l": ["Temporada 1 até o time skip"]}, {"o": 130, "d": "2025", "e": "Temporada 1", "a": false, "t": "O acordo com Marceus", "x": "Na vila de pedra em ruínas, Marceus oferece a entrada em Paratus em troca do teste no Paratium. A equipe recebe marcas nos pulsos.", "v": "todos", "l": ["Temporada 1 até o time skip", "Marceus Fulgor", "Vila de pedra em ruínas"]}, {"o": 140, "d": "2025", "e": "Temporada 1", "a": false, "t": "Marceus leva a Chihiro", "x": "Logo depois do acordo, a Chihiro some numa nuvem dourada.", "v": "todos", "l": ["Temporada 1 até o time skip"]}, {"o": 150, "d": "2025", "e": "Temporada 1", "a": false, "t": "O Vendedor do Mercatu", "x": "Um vendedor com crânio de alce carrega no peito uma pedra igual à da Chihiro e oferece trocá-la por um serviço.", "v": "todos", "l": ["Temporada 1 até o time skip", "Mercatu"]}, {"o": 160, "d": "2025", "e": "Temporada 1", "a": false, "t": "O teste de boas-vindas no Paratium", "x": "A equipe passa pelo teste. O Plague sai ferido e é levado pela Dra. Maia ao Centro Canário.", "v": "mestre", "l": ["Paratium (Coliseu)", "Plague (agente)", "Dra. Maia Orfeu"]}, {"o": 170, "d": "Fim da Parte 1", "e": "Temporada 1", "a": false, "t": "A morte de João Hozorio", "x": "O agente veterano morre no fim da Parte 1.", "v": "mestre", "l": ["João Hozorio"]}, {"o": 180, "d": "Fim da Parte 1", "e": "Temporada 1", "a": false, "t": "O puzzle da Eclésia", "x": "Diego e Rafa ficam presos num puzzle com dois integrantes da Rebelião, que depois convidam a equipe para o grupo.", "v": "mestre", "l": ["Eclésia", "A Rebelião", "Diego (agente)", "Rafael Orleans (agente)"]}, {"o": 200, "d": "Meses", "e": "Time skip", "a": true, "t": "Meses presos na ilha", "x": "Sem conseguir sair, os agentes passam meses em Paratus e cada um encontra o próprio caminho.", "v": "todos", "l": ["Temporada 1 até o time skip"]}]'::jsonb;
  x jsonb;
  novo uuid;
  n int := 0;
begin
  if exists (select 1 from eventos where mesa_id = p_mesa) then return 0; end if;
  for x in select * from jsonb_array_elements(evs) loop
    insert into eventos (mesa_id, titulo, descricao, ordem, data_rotulo, era, aproximada, visibilidade)
    values (p_mesa, x->>'t', x->>'x', (x->>'o')::numeric, x->>'d', x->>'e', (x->>'a')::boolean, x->>'v')
    returning id into novo;
    insert into eventos_entradas (evento_id, entrada_id, mesa_id)
    select novo, le.id, p_mesa from lore_entradas le
     where le.mesa_id = p_mesa and le.titulo in (select jsonb_array_elements_text(x->'l'))
    on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.semear_linha_paratus(uuid) from public, anon, authenticated;

select public.semear_linha_paratus(id) from public.mesas where codigo = 'PARATUS';
