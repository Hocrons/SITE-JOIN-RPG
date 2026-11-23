-- =====================================================================
--  ETAPA 6 — Códice da Lore
--  * corrige o gatilho personagens_publico (criar personagem novo falhava).
--  * lore_visibilidade(): muda a visibilidade de uma entrada ou conexão e
--    quem a vê, numa única operação (só o mestre).
--  * semear_lore_paratus(mesa): lore inicial tirada do Notion do mestre.
--    Tudo entra "só o mestre", exceto o que os jogadores já sabem
--    (Cidadãos e o resumo da Temporada 1). Só semeia se a mesa não tiver lore.
--  Gerado por supabase/lore/gerar_sql.py — não edite à mão.
-- =====================================================================

-- Correção: o gatilho do espelho público falhava ao criar personagem novo
-- (lia new.id numa linha de fichas). Recriar a mesa pelo seed voltou a funcionar.
create or replace function public.tg_personagem_publico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  if tg_table_name = 'fichas' then
    pid := new.personagem_id;
  else
    pid := new.id;
  end if;
  insert into personagens_publico (id, mesa_id, tipo, nome, jogador, nex, ordem, arquivado)
  select p.id, p.mesa_id, p.tipo, p.nome, p.jogador,
         (select f.nex from fichas f
           where f.personagem_id = p.id and f.variante = case when p.ancora_ativa then '50' else '99' end),
         p.ordem, p.arquivado
    from personagens p where p.id = pid
  on conflict (id) do update set
    tipo = excluded.tipo, nome = excluded.nome, jogador = excluded.jogador, nex = excluded.nex,
    ordem = excluded.ordem, arquivado = excluded.arquivado;
  return null;
end $$;


create or replace function public.lore_visibilidade(
  p_tipo text, p_id uuid, p_visibilidade text, p_personagens uuid[] default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  m uuid;
begin
  if p_visibilidade not in ('mestre','todos','especificos') then
    raise exception 'visibilidade inválida';
  end if;
  if p_tipo = 'entrada' then
    select mesa_id into m from lore_entradas where id = p_id;
  elsif p_tipo = 'conexao' then
    select mesa_id into m from lore_conexoes where id = p_id;
  else
    raise exception 'tipo inválido';
  end if;
  if m is null or not eh_mestre(m) then
    raise exception 'só o mestre muda a visibilidade';
  end if;

  if p_tipo = 'entrada' then
    update lore_entradas set visibilidade = p_visibilidade where id = p_id;
    delete from lore_entradas_reveladas where entrada_id = p_id;
    if p_visibilidade = 'especificos' then
      insert into lore_entradas_reveladas (entrada_id, personagem_id, mesa_id)
      select p_id, pe.id, m from personagens pe where pe.mesa_id = m and pe.id = any(p_personagens);
    end if;
  else
    update lore_conexoes set visibilidade = p_visibilidade, atualizado_em = now() where id = p_id;
    delete from lore_conexoes_reveladas where conexao_id = p_id;
    if p_visibilidade = 'especificos' then
      insert into lore_conexoes_reveladas (conexao_id, personagem_id, mesa_id)
      select p_id, pe.id, m from personagens pe where pe.mesa_id = m and pe.id = any(p_personagens);
    end if;
  end if;
end;
$$;
revoke all on function public.lore_visibilidade(text, uuid, text, uuid[]) from public, anon;
grant execute on function public.lore_visibilidade(text, uuid, text, uuid[]) to authenticated;

create or replace function public.semear_lore_paratus(p_mesa uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  ents jsonb := '[
{
"chave": "ser_cidadao",
"tipo": "nota",
"titulo": "Ser cidadão de Paratus",
"resumo": "Regras básicas para viver na ilha.",
"texto": "Ser cidadão em Paratus é ser parte de um todo: você é mais um entre nós, e nós somos unidos por isso.\n\n**Para ser cidadão:**\n- Não seja uma má pessoa; respeite o próximo como a si mesmo.\n- Pague suas contas.\n- Não vá contra o Império.\n- Se você veio de fora: é obrigatório fazer o evento de recepção de Paratus (o teste no Paratium).\n\nLema nos cartazes: *\"Uma cidade. Uma ilha. Um propósito.\"*",
"tags": [
"cidade",
"regras"
],
"status": "decidido",
"vis": "todos",
"notas": ""
},
{
"chave": "bencaos",
"tipo": "nota",
"titulo": "As Bênçãos",
"resumo": "Aos 15 anos, todo cidadão recebe uma dádiva da ilha.",
"texto": "Quando chegam aos **15 anos**, os cidadãos são abençoados com uma Bênção, preparada na Eclésia.\n\n- **Física:** capacidade física aumentada, partes do corpo extras ou super sentidos.\n- **Mental:** grande processamento de informações, manipulação da percepção alheia, extensões da mente.\n- **Temporal:** controle de idade e do desgaste de materiais, deslocamento do tempo, cicatrização rápida.\n- **Dimensional:** controle espacial e da probabilidade, alterações no corpo que desafiam as leis da física.",
"tags": [
"bênçãos",
"ilha"
],
"status": "decidido",
"vis": "todos",
"notas": ""
},
{
"chave": "regras_ilha",
"tipo": "nota",
"titulo": "Regras estranhas da ilha",
"resumo": "A membrana é fina e o paranormal tem outros nomes aqui.",
"texto": "- A membrana da realidade é muito fina.\n- Os elementos têm outros nomes: Morte = **Temporal**, Sangue = **Física**, Conhecimento = **Mental**, Energia = **Dimensional**.\n- Frutas com efeitos estranhos.\n- Brincadeira infantil: **\"Perde ou Passa\"**.\n- Moeda: **Dracmas**.",
"tags": [
"ilha",
"regras"
],
"status": "decidido",
"vis": "todos",
"notas": ""
},
{
"chave": "cidade",
"tipo": "local",
"titulo": "Cidade de Paratus",
"resumo": "Cidade circular cercada por muralha, com praça central e fonte.",
"texto": "Visão de um paraíso perdido misturado a um futuro paradoxal: estruturas aleatórias que de alguma forma fazem sentido e trazem conforto. As casas são baixas, o que destaca algumas construções robustas.\n\n**Mapa:** Paratium a noroeste; Casa do Imperador ao norte; Eclésia a nordeste; Mercatu a leste; Casa do Zoé a oeste; Hospitium a sudoeste; Theatron ao sul; Torre do Sol a sudeste. Saídas: praias e porto ao norte, floresta a leste, portão principal ao sul.",
"tags": [
"cidade"
],
"status": "decidido",
"vis": "todos",
"notas": "A Torre do Sol vai ser movida para a parte costeira oposta da ilha (mapa a ajustar)."
},
{
"chave": "paratium",
"tipo": "local",
"titulo": "Paratium (Coliseu)",
"resumo": "Entretenimento do povo e castigo para quem descumpre as leis.",
"texto": "Estrutura semelhante a um coliseu. Os novatos são levados para lá de início para o **teste de boas-vindas**; quem passa é aceito na cidade.",
"tags": [
"cidade",
"paratium"
],
"status": "decidido",
"vis": "todos",
"notas": "- Relíquia: **Faixa do Campeão** (Energia). Símbolo do trono; só reconhece quem venceu a última grande luta.\n- 🟡 Moisés vai organizar um grande torneio para recarregar a Faixa e pretende matar o vencedor.\n- Rehreus e Gota foram as únicas sobreviventes do cativeiro aqui.\n- Formata Formosa fornece as armas."
},
{
"chave": "eclesia",
"tipo": "local",
"titulo": "Eclésia",
"resumo": "Local religioso, para orações e preparação para as bênçãos.",
"texto": "",
"tags": [
"cidade",
"bênçãos"
],
"status": "decidido",
"vis": "todos",
"notas": "- 🟡 Ligação com o Plague (Religioso, Transcender).\n- 🟡 O Limus sabe o que realmente acontece antes de alguém receber a bênção.\n- Diego e Rafa ficaram presos num puzzle aqui com 2 integrantes da Rebelião (fim da Parte 1)."
},
{
"chave": "mercatu",
"tipo": "local",
"titulo": "Mercatu",
"resumo": "Mercado de especiarias e comidas, e de itens abençoados vendidos como coisa comum.",
"texto": "",
"tags": [
"cidade",
"comércio"
],
"status": "decidido",
"vis": "todos",
"notas": "- O Vendedor Paranormal (Limus) atende aqui.\n- 🟡 Uma das fontes puras do Lírio passou por aqui; o Diego pode pegá-la sem saber e virar alvo do Império.\n- Para os Orleans, é uma mina de ouro."
},
{
"chave": "casa_zoe",
"tipo": "local",
"titulo": "Casa do Zoé",
"resumo": "Hotel da cidade, com cronograma de atividades e eventos.",
"texto": "",
"tags": [
"cidade"
],
"status": "decidido",
"vis": "todos",
"notas": "- Ajudante da pousada: translúcido, atravessa paredes e vigia. 🟡 Escuta tudo o que se fala lá; ninguém sabe para quem conta."
},
{
"chave": "hospitium",
"tipo": "local",
"titulo": "Hospitium",
"resumo": "Centro médico da cidade.",
"texto": "Não é grande, mas atende uma boa quantidade de cidadãos.",
"tags": [
"cidade"
],
"status": "decidido",
"vis": "todos",
"notas": ""
},
{
"chave": "theatron",
"tipo": "local",
"titulo": "Theatron",
"resumo": "Teatro a céu aberto para apresentações e talentos.",
"texto": "",
"tags": [
"cidade"
],
"status": "decidido",
"vis": "todos",
"notas": "- **O esconderijo da Rebelião fica embaixo do Theatron**, com entrada pelos bastidores. Há uma Âncora fixa lá que esconde a Rebelião dos rituais de detecção do Império.\n- Artista: BBTC (\"bebê trás coca\"), que mixa a própria voz."
},
{
"chave": "torre_sol",
"tipo": "local",
"titulo": "Torre do Sol",
"resumo": "Torre de topo aberto com um relógio de sol que sempre mostra a hora certa.",
"texto": "O acesso é controlado. Quando você mais precisa, olhar o relógio faz perceber exatamente que horas são.",
"tags": [
"cidade"
],
"status": "decidido",
"vis": "todos",
"notas": "- O acesso é controlado pelo Remus, que às vezes sobe sozinho à noite.\n- ❓ Vai para a parte costeira oposta da ilha."
},
{
"chave": "temporada1",
"tipo": "evento",
"titulo": "Temporada 1 até o time skip",
"resumo": "Da expedição de resgate ao acordo com Marceus e às marcas nos pulsos.",
"texto": "- **Jan/2025:** uma equipe de pesquisa da Ordem some a caminho de Trindade e Martim Vaz. Só as malas são encontradas boiando.\n- Breno convoca a missão e Gabriela lidera. Equipe: Diego Auditore, João Hozorio, Plague, Rafael Orleans e Chihiro.\n- No barco *Princesa Calíope*, com o navegador Ronaldo, uma onda gigante e uma **canção atraente** atingem a equipe. A pedra amarela da Chihiro cria uma barreira dourada que salva todos.\n- Acordam numa praia. Ronaldo está morto, com cortes profundos no peito e no pescoço.\n- Numa vila de pedra em ruínas cheia de criaturas fantasmagóricas, **Marceus** se apresenta e oferece a entrada em Paratus em troca do **teste no Paratium**.\n- Rafael tenta um ritual no aperto de mão; Marceus intercepta. A equipe recebe **marcas nos pulsos**, sinal do acordo. Pela marca da Gabriela dá para chamar o Marceus.\n- **Marceus leva a Chihiro** numa nuvem dourada.\n- No Mercatu, o Vendedor (crânio de alce com uma espiral) carrega no peito uma pedra dourada igual à da Chihiro e oferece trocá-la por um serviço.\n- Depois vem o time skip: meses presos na ilha.",
"tags": [
"temporada 1",
"resumo"
],
"status": "decidido",
"vis": "todos",
"notas": ""
},
{
"chave": "imperio",
"tipo": "faccao",
"titulo": "O Império",
"resumo": "Controle e comando central da ilha, sob o Imperador Moisés.",
"texto": "A potência da ilha: segurança, decisões e eventos são propostos e comandados pelo Império.\n\n**Membros:** Moisés (Imperador), Vanessa Fulgor (primeira maga), Marceus Fulgor (porta-voz e segundo mago), Formata Formosa (armeira), Remus (líder dos guardas).",
"tags": [
"império"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "rebeliao",
"tipo": "faccao",
"titulo": "A Rebelião",
"resumo": "Quer tirar o costume do paranormal e devolver as leis da realidade à ilha.",
"texto": "Fundada por **Petreus, o Eterno**; hoje liderada pela filha dele, **Mania Plutão**. Sustentada por acordos com tribos de fora da cidade e doações de cidadãos.\n\nEsconderijo embaixo do Theatron. Artefato principal: **a Âncora**.",
"tags": [
"rebelião"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "centro_canario",
"tipo": "faccao",
"titulo": "Centro de Pesquisas Canário",
"resumo": "Laboratório escondido onde cientistas estudam o paranormal livremente.",
"texto": "Os únicos na ilha que usam os nomes de fora (Sangue, Morte, Conhecimento, Energia).\n\n- Fica fora da cidade, numa área de mata. A entrada fica sob a estufa de sementes da Dra. Maia; nas primeiras vezes, quem entra vai de olhos vendados.\n- Tudo funciona com uma fonte trancada numa sala selada; as luzes piscam com um \"pulso\" (é a Renata).\n- Quem passa pelo Centro jura não revelar a entrada.",
"tags": [
"canário",
"ciência"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "orleans",
"tipo": "faccao",
"titulo": "Família Orleans",
"resumo": "Família rica e influente que, de verdade, vende artefatos paranormais.",
"texto": "- De fachada: grandes ações e marcas de roupa. O negócio real é a **venda de artefatos paranormais e itens ocultos**.\n- Todos os Orleans são ruivos.\n- Thiago Orleans financiou a expedição que desapareceu.",
"tags": [
"orleans",
"fora da ilha"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "tribo_artua",
"tipo": "faccao",
"titulo": "Tribo Artuã",
"resumo": "Poucas pessoas, afastadas da cidade, com costumes próprios.",
"texto": "Inspirada em tribos africanas.\n\n**Costumes:** cada espiral tatuada marca um ciclo da vida; os mortos são honrados com crânios gravados; um estrangeiro só fala com o líder depois de dividir uma refeição com a tribo.\n\n- Guarda a relíquia **Mão da Vida** (Morte).\n- 🟡 Apoia a Rebelião e recusou um enviado do Império.\n- 🟡 Tinha um pacto de paz com o trono do Andreias, firmado pelo conselheiro Calebe. Moisés rompeu o pacto.",
"tags": [
"tribo",
"morte"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "ordem",
"tipo": "faccao",
"titulo": "Ordo Realitas",
"resumo": "A Ordem, de onde vieram os agentes.",
"texto": "Breno convocou a missão de resgate. A Agatha pode saber mais do que contou sobre a Chihiro.",
"tags": [
"fora da ilha"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "moises",
"tipo": "personagem",
"titulo": "Moisés, o Imperador",
"resumo": "Ex-agente da Ordem que matou Andreias no Paratium e tomou o trono.",
"texto": "- Ex-agente da Ordem, registros censurados; sumiu numa missão atrás da civilização.\n- Ganhou influência com suas habilidades paranormais.\n- 🟡 Desafiou o imperador **Andreias** no Paratium, o matou e conquistou a **Faixa do Campeão**.\n- Quer o **Poder Impossível**: tornar-se um com o paranormal sem pagar custos.\n- 🟡 Lê o diário do Lírio, escrito numa língua de fora.\n- 🟡 Quando ouvir o nome \"Calebe\" pela primeira vez, a reação dele entrega o passado dos dois.",
"tags": [
"império",
"vilão"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "vanessa",
"tipo": "personagem",
"titulo": "Vanessa Fulgor",
"resumo": "Primeira maga da corte; direta, ríspida, conhece muitos truques da ilha.",
"texto": "🟡 Teve um filho, o Marceus, com o Petreus. Faz questão de que ninguém lembre disso.",
"tags": [
"império"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "marceus",
"tipo": "personagem",
"titulo": "Marceus Fulgor",
"resumo": "Porta-voz e segundo mago do Império; organiza os eventos.",
"texto": "- Quer substituir a mãe para aposentá-la.\n- Recebeu a equipe na chegada, firmou o acordo das marcas e levou a Chihiro.\n- 🟡 Filho do Petreus com a Vanessa: **meio-irmão da Mania sem saber**. Cresceu ouvindo que o pai era um monstro. Candidato a desertor.\n- O Império sentiu a pedra voltando à ilha: ele não esperava os agentes, esperava a Chihiro.",
"tags": [
"império"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "remus",
"tipo": "personagem",
"titulo": "Remus",
"resumo": "Líder dos guardas, velho mas capaz.",
"texto": "Controla o acesso à Torre do Sol e às vezes sobe lá sozinho à noite.",
"tags": [
"império"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "formata",
"tipo": "personagem",
"titulo": "Formata Formosa",
"resumo": "A armeira mais famosa; faz as armas do Coliseu e dos guardas.",
"texto": "Guardas com armas da Formata continuam fortes mesmo sob a Âncora.",
"tags": [
"império"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "livia",
"tipo": "personagem",
"titulo": "Lívia, a Criança do Limiar",
"resumo": "Menina presa no palácio; todo efeito paranormal nela é dobrado.",
"texto": "- Tem uma forma diferente da doença do paranormal: efeitos positivos e negativos têm efeito **dobrado** nela (só nela).\n- Presa pelo Imperador por ser o instrumento perfeito para afinar a membrana.\n- 🟡 Filha do **Andreias**. Moisés não a mata porque precisa dela: é refém e ferramenta.\n- 🟡 Numa câmara no coração do palácio; a porta só aparece com o sangue do Moisés (ou com a Faixa). Até a Vanessa e o Marceus acham que ela morreu.\n- 🟡 Dilema: se a Rebelião \"devolver a realidade\", o efeito também cai dobrado nela. Pode matá-la ou curá-la.\n- A Chihiro é usada para mantê-la calma.",
"tags": [
"império",
"segredo"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "andreias",
"tipo": "personagem",
"titulo": "Andreias",
"resumo": "O antigo imperador, morto por Moisés no Paratium.",
"texto": "Tinha uma filha, que ninguém vê desde que ele morreu. Calebe foi seu conselheiro.",
"tags": [
"império",
"passado"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "mania",
"tipo": "personagem",
"titulo": "Mania Plutão",
"resumo": "Líder da Rebelião, filha do Petreus. Bela, séria e centrada.",
"texto": "Guarda o **Catalisador Erudito** (a verdadeira pedra da Chihiro), comprado do Limus.",
"tags": [
"rebelião"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "petreus",
"tipo": "personagem",
"titulo": "Petreus Plutão, o Eterno",
"resumo": "Fundador da Rebelião.",
"texto": "Está petrificado pela doença do paranormal (casca de madeira podre e lodo). Para os jogadores, desaparecido; a Rebelião esconde o corpo.",
"tags": [
"rebelião",
"segredo"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "domu",
"tipo": "personagem",
"titulo": "Domu",
"resumo": "Segurança da Mania; careca, parrudo, poucas palavras.",
"texto": "Os ossos das mãos têm forma de soqueiras com lâminas.",
"tags": [
"rebelião"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "rebecca",
"tipo": "personagem",
"titulo": "Rebecca Platus",
"resumo": "A \"biblioteca humana\" da Rebelião; simpática e cabeça cheia.",
"texto": "Confirma que há um estrangeiro no palácio (o Thiago). Pode ter registros sobre a \"menina que roubou a pedra\".",
"tags": [
"rebelião"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "gota",
"tipo": "personagem",
"titulo": "Gota",
"resumo": "Garoto das ruas que sobreviveu ao cativeiro no Paratium com a Rehreus.",
"texto": "Foi levado ao coliseu depois de roubar uma loja para não morrer de fome. 🟡 Vive sob a proteção da Rebelião.",
"tags": [
"rebelião",
"paratium"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "lirio",
"tipo": "personagem",
"titulo": "Lírio Hills, \"o Viajante\"",
"resumo": "Arqueólogo paranormal da Ordem preso na ilha; pai da Gabriela.",
"texto": "- Fachada de fotógrafo. Caiu na ilha num avião, com itens paranormais que perdeu (as \"fontes puras\").\n- Vive isolado no Centro Canário tentando achar uma saída.\n- 🟡 O diário dele está com o Moisés; por isso é o único que sabe como impedir o ritual.\n- O Plague só conhece a voz e os bilhetes dele; nunca ouviu o nome \"Hills\".",
"tags": [
"canário",
"hills",
"segredo"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "renata",
"tipo": "personagem",
"titulo": "Renata Hills",
"resumo": "Mãe da Gabriela; virou energia pura.",
"texto": "Contraiu uma doença que transformou seu corpo em energia. O Lírio a contém e usa essa energia para alimentar o Centro e carregar os núcleos da Âncora.",
"tags": [
"canário",
"hills",
"segredo"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "adrian",
"tipo": "personagem",
"titulo": "Dr. Adrian Atlas",
"resumo": "Estuda a análise e manipulação do paranormal no corpo das pessoas.",
"texto": "",
"tags": [
"canário"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "maia",
"tipo": "personagem",
"titulo": "Dra. Maia Orfeu",
"resumo": "Pesquisa sementes especiais da ilha; adora ajudar os outros.",
"texto": "Levou o Plague ferido para o Centro depois do teste do Paratium.",
"tags": [
"canário"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "theo",
"tipo": "personagem",
"titulo": "Theo Aristeu",
"resumo": "Sobrinho do Adrian e assistente; esperto, mas sem experiência.",
"texto": "",
"tags": [
"canário"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "limus",
"tipo": "personagem",
"titulo": "Limus, o Vendedor Paranormal",
"resumo": "Corpo de lodo, crânio de alce com uma espiral; vende informação a quem pagar.",
"texto": "- Independente, sombrio e quieto. 🟡 Nunca mente, mas só conta o que foi pago.\n- Nome real: **Calebe**, ex-agente da Ordem. Ninguém em Paratus sabe.\n- 🟡 Era parceiro do Moisés na missão. Foi conselheiro do Andreias; quando Moisés tomou o trono, tentou eliminá-lo com um ritual, e o corpo virou lodo.\n- 🟡 O crânio de alce foi um presente de honra da Tribo Artuã e mantém o corpo estável.\n- Vendeu a pedra verdadeira à Mania e entregou a réplica aos jogadores.\n- Rival e informante do Diego e do Thiago.",
"tags": [
"mercatu",
"informante",
"segredo"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "thiago",
"tipo": "personagem",
"titulo": "Thiago Orleans",
"resumo": "Financiou a expedição desaparecida; finge ser vítima do Império.",
"texto": "- Levou os documentos das malas, que revelavam o interesse da família.\n- Veio buscar os itens apreendidos dos Orleans que o Lírio carregava.\n- **Twist:** está negociando com o Império; a rede dos Orleans serve ao plano do Moisés.\n- Pistas: não tem a marca do acordo (ou tem uma diferente), sabe nomes do palácio, reage ao nome \"Hills\".",
"tags": [
"orleans",
"traidor",
"segredo"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "chihiro",
"tipo": "personagem",
"titulo": "Chihiro, a Desacorrentada",
"resumo": "Psicóloga da Ordem, aprendiz da Agatha, levada pelo Marceus na chegada.",
"texto": "- Carregava o Catalisador Erudito como amuleto de família.\n- **Tem sangue de Paratus:** neta de Elie Tereza Veríssimo.\n- É **o Desacorrentado**: o paranormal não deixa marcas na mente dela.\n- No palácio, o Moisés a usa para manter a Lívia calma. Quando os jogadores a encontrarem, ela vai saber onde a menina está.",
"tags": [
"ordem",
"segredo"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "elie",
"tipo": "personagem",
"titulo": "Elie Tereza Veríssimo",
"resumo": "Avó da Chihiro e do Breno; nasceu em Paratus e fugiu com a pedra.",
"texto": "- 84 anos, cheia de aventuras. Recebeu a bênção aos 15 e pouco depois fugiu levando o Catalisador Erudito.\n- Dois filhos: o Veríssimo (pai do Breno) e o pai da Chihiro.\n- **Twist:** o Breno sabia de Paratus pelas histórias dela.",
"tags": [
"fora da ilha",
"passado"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "ayo",
"tipo": "personagem",
"titulo": "Ayo, líder Artuã",
"resumo": "Calmo, fala pouco e escuta muito; mão direita de madeira branca com flores lilás.",
"texto": "Perdeu a mão protegendo a tribo quando o Moisés rompeu o pacto. 🟡 A prótese é a própria Mão da Vida. Pode reconhecer o crânio do Limus.",
"tags": [
"tribo"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "arpiario",
"tipo": "personagem",
"titulo": "Arpiário",
"resumo": "Conversa com pássaros e vende o que eles veem.",
"texto": "❓ Onde vive.",
"tags": [
"informante"
],
"status": "aberto",
"vis": "mestre",
"notas": ""
},
{
"chave": "equipe_desaparecida",
"tipo": "personagem",
"titulo": "A equipe de pesquisa desaparecida",
"resumo": "Os primeiros que a onda trouxe, dias antes dos agentes.",
"texto": "- **Thiago Orleans:** ver entrada própria.\n- **Alessa Bezerra** (médica e bióloga marinha): estuda o sistema de defesa do mar. É quem conta que o Thiago sumiu com a pasta.\n- **Renato Oliveira** (arqueólogo): virou cidadão, já tem uma bênção e não quer voltar.\n- **Letícia Durmân** (segurança): morreu no teste do Paratium.\n- **Murilo Santos** (geólogo): desaparecido de verdade. Gancho para a temporada 2.",
"tags": [
"ordem"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "joao",
"tipo": "personagem",
"titulo": "João Hozorio",
"resumo": "Agente veterano da equipe; morreu no final da Parte 1.",
"texto": "Era personagem de um jogador. A morte não aparece no resumo.",
"tags": [
"ordem"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "pj_diego",
"tipo": "personagem",
"titulo": "Diego (agente)",
"resumo": "Ladrão e mestre do disfarce; rouba só de ricos e corruptos.",
"texto": "- Interessado em itens amaldiçoados.\n- Acordo com o Limus: busca itens em troca de informações e dinheiro. 🟡 Cada entrega rende uma informação útil ao grupo.\n- 🟡 Meio da temporada: a Rebelião o recruta para um roubo no palácio.",
"tags": [
"jogador"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "pj_gabriela",
"tipo": "personagem",
"titulo": "Gabriela Hills (agente)",
"resumo": "Líder da missão; investiga a morte dos pais.",
"texto": "- Acredita que os pais morreram num acidente de avião quando ela tinha 7 anos; achou um símbolo ocultista na turbina.\n- Percebe o paranormal por cores; o cachorro Bolt usa uma roupa amaldiçoada de Energia.\n- 🟡 **Twist:** os pais estão vivos no Centro Canário.",
"tags": [
"jogador",
"hills"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "pj_rehreus",
"tipo": "personagem",
"titulo": "Rehreus Akeldama (agente)",
"resumo": "Única agente nascida em Paratus; sobrevivente do Paratium.",
"texto": "- Resgatada pela Rebelião junto com o Gota. Não tem a marca do acordo.\n- Objetivos: descobrir quem administrava o coliseu, destruir a droga Rubra e o culto, descobrir quem matou seus pais e seu nome verdadeiro.\n- 🟡 Ponte entre o grupo e a Mania; peça central do arco do torneio.",
"tags": [
"jogador",
"paratium"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "pj_plague",
"tipo": "personagem",
"titulo": "Plague (agente)",
"resumo": "Médico de campo ligado ao Centro Canário.",
"texto": "❓ Sem lore na ficha; pedir ao jogador. 🟡 Origem Religioso sugere ligação com a Eclésia.",
"tags": [
"jogador",
"canário"
],
"status": "aberto",
"vis": "mestre",
"notas": ""
},
{
"chave": "pj_rafael",
"tipo": "personagem",
"titulo": "Rafael Orleans (agente)",
"resumo": "Ocultista; a lore do personagem vai mudar.",
"texto": "❓ Não usar como base por enquanto. Se mantiver o nome Orleans, o Thiago vai reagir.",
"tags": [
"jogador",
"orleans"
],
"status": "aberto",
"vis": "mestre",
"notas": ""
},
{
"chave": "poder_impossivel",
"tipo": "segredo",
"titulo": "O Poder Impossível",
"resumo": "O plano do Moisés: tornar-se um com o paranormal sem pagar custos.",
"texto": "Ele precisa de:\n1. **O Desacorrentado**: alguém livre das correntes da realidade (a Chihiro).\n2. **A Criança do Limiar**: alguém em quase simbiose com o outro lado (a Lívia).\n3. **Os 4 Itens do Limiar**, um por elemento e bênção. Juntos abrem caminho para o quinto elemento: o **Medo**.",
"tags": [
"império",
"plano"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "catalisador",
"tipo": "reliquia",
"titulo": "Catalisador Erudito",
"resumo": "A pedra dourada da Chihiro; relíquia de Conhecimento (bênção Mental).",
"texto": "A **verdadeira** está com a Mania. A **réplica**, que o Limus usava no peito, ficou com os jogadores e não funciona.",
"tags": [
"relíquia",
"conhecimento"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "mao_vida",
"tipo": "reliquia",
"titulo": "Mão da Vida",
"resumo": "Relíquia de Morte (bênção Temporal) guardada pela Tribo Artuã.",
"texto": "🟡 É a prótese do Ayo. Para pegá-la, seria preciso tirar o braço dele.",
"tags": [
"relíquia",
"morte"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "coroa",
"tipo": "reliquia",
"titulo": "Coroa Corrupta",
"resumo": "Relíquia de Sangue (bênção Física) no Jardim do Cupido.",
"texto": "🟡 Transforma amor em obsessão; quem a usa não consegue largá-la.",
"tags": [
"relíquia",
"sangue"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "faixa",
"tipo": "reliquia",
"titulo": "Faixa do Campeão",
"resumo": "Relíquia de Energia (bênção Dimensional) e símbolo do trono.",
"texto": "🟡 Só reconhece quem venceu a última grande luta do Paratium; não responde mais ao Moisés.",
"tags": [
"relíquia",
"energia"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "ancora",
"tipo": "reliquia",
"titulo": "A Âncora",
"resumo": "Artefato da Rebelião que engrossa a membrana e enfraquece o paranormal.",
"texto": "- Estaca de ferro em forma de âncora com um encaixe para um **núcleo** que pulsa.\n- Cada núcleo rende uma ativação; chegam em segredo pelo Centro Canário, carregados com a energia da Renata.\n- Formas: **Zona** (área por algumas horas), **Pulso** (3 rodadas), **Marca** (o Império aperta as marcas do acordo).\n- Desligar: arrancar o núcleo (Crime ou Tecnologia) ou destruir a estaca.\n- Avisos: zumbido grave, cores desbotando, rituais engasgando.",
"tags": [
"rebelião",
"relíquia",
"mecânica"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "marcas",
"tipo": "segredo",
"titulo": "As marcas do acordo",
"resumo": "Marcas nos pulsos recebidas no acordo com o Marceus.",
"texto": "Pela marca da Gabriela dá para chamar o Marceus. O Império pode apertar as marcas para ativar a Âncora (forma Marca). A Rehreus não tem marca.",
"tags": [
"império",
"mecânica"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "defesa_mar",
"tipo": "segredo",
"titulo": "A onda e a canção",
"resumo": "O sistema de defesa da ilha.",
"texto": "O Ronaldo morreu porque ouviu a música e foi fraco a ela.",
"tags": [
"ilha"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "fontes_puras",
"tipo": "reliquia",
"titulo": "As fontes puras do Lírio",
"resumo": "Itens paranormais que caíram com o avião dos Hills.",
"texto": "Os itens tinham sido apreendidos dos Orleans. São as mesmas fontes que o Moisés procura. Uma passou pelo Mercatu.",
"tags": [
"hills",
"orleans"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "rubra",
"tipo": "reliquia",
"titulo": "A droga Rubra",
"resumo": "Droga paranormal que a Rehreus quer destruir, junto com o culto.",
"texto": "",
"tags": [
"droga"
],
"status": "aberto",
"vis": "mestre",
"notas": ""
},
{
"chave": "jardim",
"tipo": "local",
"titulo": "Jardim do Cupido",
"resumo": "Ruínas de uma civilização antiga, destruída numa guerra de outra época.",
"texto": "- Guarda a **Coroa Corrupta**.\n- Protegido pelo conto de dois amantes (um guerreiro e uma arqueira) mortos juntos no campo de batalha.\n- 🟡 O poema funciona como mapa; os amantes viraram guardiões de Sangue que só caem juntos.\n- Texto do poema \"Os Enamorados\": ver a página Lore Fechada no Notion.",
"tags": [
"relíquia",
"sangue"
],
"status": "proposto",
"vis": "mestre",
"notas": ""
},
{
"chave": "esconderijo",
"tipo": "local",
"titulo": "Esconderijo da Rebelião",
"resumo": "Embaixo do Theatron, com entrada pelos bastidores.",
"texto": "Uma Âncora fixa esconde o lugar dos rituais de detecção do Império.",
"tags": [
"rebelião"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "vila_ruinas",
"tipo": "local",
"titulo": "Vila de pedra em ruínas",
"resumo": "Onde a equipe encontrou as criaturas fantasmagóricas e o Marceus.",
"texto": "",
"tags": [
"temporada 1"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
},
{
"chave": "palacio",
"tipo": "local",
"titulo": "Palácio do Imperador",
"resumo": "Casa do Imperador, ao norte da cidade.",
"texto": "🟡 Alvo do roubo do Diego no meio da temporada. A câmara da Lívia fica no coração do palácio.",
"tags": [
"império"
],
"status": "decidido",
"vis": "mestre",
"notas": ""
}
]'::jsonb;
  cons jsonb := '[
{
"o": "paratium",
"d": "cidade",
"r": "fica em",
"v": "todos"
},
{
"o": "eclesia",
"d": "cidade",
"r": "fica em",
"v": "todos"
},
{
"o": "mercatu",
"d": "cidade",
"r": "fica em",
"v": "todos"
},
{
"o": "casa_zoe",
"d": "cidade",
"r": "fica em",
"v": "todos"
},
{
"o": "hospitium",
"d": "cidade",
"r": "fica em",
"v": "todos"
},
{
"o": "theatron",
"d": "cidade",
"r": "fica em",
"v": "todos"
},
{
"o": "torre_sol",
"d": "cidade",
"r": "fica em",
"v": "todos"
},
{
"o": "bencaos",
"d": "eclesia",
"r": "preparadas na",
"v": "todos"
},
{
"o": "ser_cidadao",
"d": "paratium",
"r": "exige o teste no",
"v": "todos"
},
{
"o": "moises",
"d": "imperio",
"r": "lidera",
"v": "mestre"
},
{
"o": "vanessa",
"d": "imperio",
"r": "membro de",
"v": "mestre"
},
{
"o": "marceus",
"d": "imperio",
"r": "membro de",
"v": "mestre"
},
{
"o": "remus",
"d": "imperio",
"r": "membro de",
"v": "mestre"
},
{
"o": "formata",
"d": "imperio",
"r": "membro de",
"v": "mestre"
},
{
"o": "marceus",
"d": "vanessa",
"r": "filho de",
"v": "mestre"
},
{
"o": "marceus",
"d": "petreus",
"r": "filho de",
"v": "mestre"
},
{
"o": "marceus",
"d": "mania",
"r": "meio-irmão de",
"v": "mestre"
},
{
"o": "moises",
"d": "andreias",
"r": "matou",
"v": "mestre"
},
{
"o": "livia",
"d": "andreias",
"r": "filha de",
"v": "mestre"
},
{
"o": "moises",
"d": "livia",
"r": "mantém presa",
"v": "mestre"
},
{
"o": "livia",
"d": "palacio",
"r": "presa no",
"v": "mestre"
},
{
"o": "moises",
"d": "palacio",
"r": "vive no",
"v": "mestre"
},
{
"o": "palacio",
"d": "cidade",
"r": "fica em",
"v": "mestre"
},
{
"o": "remus",
"d": "torre_sol",
"r": "controla o acesso à",
"v": "mestre"
},
{
"o": "formata",
"d": "paratium",
"r": "arma o",
"v": "mestre"
},
{
"o": "faixa",
"d": "paratium",
"r": "ligada ao",
"v": "mestre"
},
{
"o": "moises",
"d": "faixa",
"r": "conquistou",
"v": "mestre"
},
{
"o": "moises",
"d": "poder_impossivel",
"r": "busca o",
"v": "mestre"
},
{
"o": "livia",
"d": "poder_impossivel",
"r": "peça do",
"v": "mestre"
},
{
"o": "chihiro",
"d": "poder_impossivel",
"r": "peça do",
"v": "mestre"
},
{
"o": "catalisador",
"d": "poder_impossivel",
"r": "Item do Limiar",
"v": "mestre"
},
{
"o": "mao_vida",
"d": "poder_impossivel",
"r": "Item do Limiar",
"v": "mestre"
},
{
"o": "coroa",
"d": "poder_impossivel",
"r": "Item do Limiar",
"v": "mestre"
},
{
"o": "faixa",
"d": "poder_impossivel",
"r": "Item do Limiar",
"v": "mestre"
},
{
"o": "mania",
"d": "rebeliao",
"r": "lidera",
"v": "mestre"
},
{
"o": "petreus",
"d": "rebeliao",
"r": "fundou",
"v": "mestre"
},
{
"o": "mania",
"d": "petreus",
"r": "filha de",
"v": "mestre"
},
{
"o": "domu",
"d": "rebeliao",
"r": "membro de",
"v": "mestre"
},
{
"o": "domu",
"d": "mania",
"r": "protege",
"v": "mestre"
},
{
"o": "rebecca",
"d": "rebeliao",
"r": "membro de",
"v": "mestre"
},
{
"o": "gota",
"d": "rebeliao",
"r": "protegido pela",
"v": "mestre"
},
{
"o": "mania",
"d": "catalisador",
"r": "guarda",
"v": "mestre"
},
{
"o": "rebeliao",
"d": "esconderijo",
"r": "se esconde no",
"v": "mestre"
},
{
"o": "esconderijo",
"d": "theatron",
"r": "fica embaixo do",
"v": "mestre"
},
{
"o": "rebeliao",
"d": "ancora",
"r": "usa",
"v": "mestre"
},
{
"o": "rebeliao",
"d": "tribo_artua",
"r": "aliada de",
"v": "mestre"
},
{
"o": "lirio",
"d": "centro_canario",
"r": "vive no",
"v": "mestre"
},
{
"o": "renata",
"d": "centro_canario",
"r": "alimenta o",
"v": "mestre"
},
{
"o": "adrian",
"d": "centro_canario",
"r": "membro de",
"v": "mestre"
},
{
"o": "maia",
"d": "centro_canario",
"r": "membro de",
"v": "mestre"
},
{
"o": "theo",
"d": "centro_canario",
"r": "membro de",
"v": "mestre"
},
{
"o": "theo",
"d": "adrian",
"r": "sobrinho de",
"v": "mestre"
},
{
"o": "lirio",
"d": "renata",
"r": "casado com",
"v": "mestre"
},
{
"o": "pj_gabriela",
"d": "lirio",
"r": "filha de",
"v": "mestre"
},
{
"o": "pj_gabriela",
"d": "renata",
"r": "filha de",
"v": "mestre"
},
{
"o": "renata",
"d": "ancora",
"r": "carrega os núcleos da",
"v": "mestre"
},
{
"o": "lirio",
"d": "fontes_puras",
"r": "perdeu as",
"v": "mestre"
},
{
"o": "moises",
"d": "lirio",
"r": "lê o diário de",
"v": "mestre"
},
{
"o": "limus",
"d": "mercatu",
"r": "atende no",
"v": "mestre"
},
{
"o": "limus",
"d": "moises",
"r": "ex-parceiro de",
"v": "mestre"
},
{
"o": "limus",
"d": "andreias",
"r": "foi conselheiro de",
"v": "mestre"
},
{
"o": "limus",
"d": "tribo_artua",
"r": "firmou o pacto com",
"v": "mestre"
},
{
"o": "limus",
"d": "catalisador",
"r": "vendeu o",
"v": "mestre"
},
{
"o": "pj_diego",
"d": "limus",
"r": "trabalha para",
"v": "mestre"
},
{
"o": "thiago",
"d": "orleans",
"r": "membro de",
"v": "mestre"
},
{
"o": "thiago",
"d": "imperio",
"r": "negocia com",
"v": "mestre"
},
{
"o": "thiago",
"d": "pj_diego",
"r": "rival de",
"v": "mestre"
},
{
"o": "thiago",
"d": "fontes_puras",
"r": "procura as",
"v": "mestre"
},
{
"o": "pj_rafael",
"d": "orleans",
"r": "sobrenome",
"v": "mestre"
},
{
"o": "chihiro",
"d": "elie",
"r": "neta de",
"v": "mestre"
},
{
"o": "chihiro",
"d": "catalisador",
"r": "carregava o",
"v": "mestre"
},
{
"o": "elie",
"d": "catalisador",
"r": "roubou o",
"v": "mestre"
},
{
"o": "marceus",
"d": "chihiro",
"r": "levou",
"v": "mestre"
},
{
"o": "chihiro",
"d": "palacio",
"r": "presa no",
"v": "mestre"
},
{
"o": "chihiro",
"d": "livia",
"r": "acalma",
"v": "mestre"
},
{
"o": "ayo",
"d": "tribo_artua",
"r": "lidera",
"v": "mestre"
},
{
"o": "ayo",
"d": "mao_vida",
"r": "é a prótese de",
"v": "mestre"
},
{
"o": "mao_vida",
"d": "tribo_artua",
"r": "guardada pela",
"v": "mestre"
},
{
"o": "coroa",
"d": "jardim",
"r": "guardada no",
"v": "mestre"
},
{
"o": "pj_rehreus",
"d": "paratium",
"r": "sobreviveu ao",
"v": "mestre"
},
{
"o": "pj_rehreus",
"d": "gota",
"r": "sobreviveu com",
"v": "mestre"
},
{
"o": "pj_rehreus",
"d": "rebeliao",
"r": "deve a vida à",
"v": "mestre"
},
{
"o": "pj_rehreus",
"d": "rubra",
"r": "quer destruir",
"v": "mestre"
},
{
"o": "pj_plague",
"d": "centro_canario",
"r": "ligado ao",
"v": "mestre"
},
{
"o": "pj_plague",
"d": "maia",
"r": "salvo por",
"v": "mestre"
},
{
"o": "pj_gabriela",
"d": "rebeliao",
"r": "entrou na",
"v": "mestre"
},
{
"o": "pj_diego",
"d": "rebeliao",
"r": "aliado em parte",
"v": "mestre"
},
{
"o": "marcas",
"d": "marceus",
"r": "acordo com",
"v": "mestre"
},
{
"o": "equipe_desaparecida",
"d": "thiago",
"r": "inclui",
"v": "mestre"
},
{
"o": "joao",
"d": "ordem",
"r": "agente da",
"v": "mestre"
},
{
"o": "chihiro",
"d": "ordem",
"r": "psicóloga da",
"v": "mestre"
},
{
"o": "moises",
"d": "ordem",
"r": "ex-agente da",
"v": "mestre"
},
{
"o": "limus",
"d": "ordem",
"r": "ex-agente da",
"v": "mestre"
},
{
"o": "vila_ruinas",
"d": "marceus",
"r": "onde apareceu o",
"v": "mestre"
},
{
"o": "defesa_mar",
"d": "temporada1",
"r": "explica a onda da",
"v": "mestre"
}
]'::jsonb;
  ids  jsonb := '{}'::jsonb;
  x    jsonb;
  novo uuid;
  n    int := 0;
begin
  if exists (select 1 from lore_entradas where mesa_id = p_mesa) then
    return 0;
  end if;
  for x in select * from jsonb_array_elements(ents) loop
    insert into lore_entradas (mesa_id, tipo, titulo, resumo, texto, tags, status, visibilidade)
    values (p_mesa, x->>'tipo', x->>'titulo', x->>'resumo', x->>'texto',
            array(select jsonb_array_elements_text(x->'tags')), x->>'status', x->>'vis')
    returning id into novo;
    ids := ids || jsonb_build_object(x->>'chave', novo);
    if coalesce(x->>'notas', '') <> '' then
      insert into lore_notas_mestre (entrada_id, mesa_id, texto) values (novo, p_mesa, x->>'notas');
    end if;
    n := n + 1;
  end loop;
  for x in select * from jsonb_array_elements(cons) loop
    insert into lore_conexoes (mesa_id, origem_id, destino_id, rotulo, visibilidade)
    values (p_mesa, (ids->>(x->>'o'))::uuid, (ids->>(x->>'d'))::uuid, x->>'r', x->>'v');
  end loop;
  return n;
end;
$$;
revoke all on function public.semear_lore_paratus(uuid) from public, anon, authenticated;

select public.semear_lore_paratus(id) from public.mesas where codigo = 'PARATUS';
