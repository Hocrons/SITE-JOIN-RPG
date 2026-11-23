"""Seed do Códice da Lore de Paratus, a partir do Notion do mestre (Lore Fechada, Atlas da Ilha, Cidadãos).

Regra: tudo entra como "só o mestre", exceto o que os jogadores já sabem
(página Cidadãos e o resumo da Temporada 1 até o time skip).
Segredos de lugares públicos ficam em `notas` (tabela lore_notas_mestre, nunca vai para jogadores).
"""

T, M = "todos", "mestre"
D, P, A = "decidido", "proposto", "aberto"


def e(chave, tipo, titulo, resumo, texto="", tags=(), status=D, vis=M, notas=""):
    return dict(chave=chave, tipo=tipo, titulo=titulo, resumo=resumo, texto=texto.strip(), tags=list(tags),
                status=status, vis=vis, notas=notas.strip())


ENTRADAS = [
    # ------------------------------------------------------------------ públicas
    e("ser_cidadao", "nota", "Ser cidadão de Paratus", "Regras básicas para viver na ilha.", """
Ser cidadão em Paratus é ser parte de um todo: você é mais um entre nós, e nós somos unidos por isso.

**Para ser cidadão:**
- Não seja uma má pessoa; respeite o próximo como a si mesmo.
- Pague suas contas.
- Não vá contra o Império.
- Se você veio de fora: é obrigatório fazer o evento de recepção de Paratus (o teste no Paratium).

Lema nos cartazes: *"Uma cidade. Uma ilha. Um propósito."*
""", tags=["cidade", "regras"], vis=T),
    e("bencaos", "nota", "As Bênçãos", "Aos 15 anos, todo cidadão recebe uma dádiva da ilha.", """
Quando chegam aos **15 anos**, os cidadãos são abençoados com uma Bênção, preparada na Eclésia.

- **Física:** capacidade física aumentada, partes do corpo extras ou super sentidos.
- **Mental:** grande processamento de informações, manipulação da percepção alheia, extensões da mente.
- **Temporal:** controle de idade e do desgaste de materiais, deslocamento do tempo, cicatrização rápida.
- **Dimensional:** controle espacial e da probabilidade, alterações no corpo que desafiam as leis da física.
""", tags=["bênçãos", "ilha"], vis=T),
    e("regras_ilha", "nota", "Regras estranhas da ilha", "A membrana é fina e o paranormal tem outros nomes aqui.", """
- A membrana da realidade é muito fina.
- Os elementos têm outros nomes: Morte = **Temporal**, Sangue = **Física**, Conhecimento = **Mental**, Energia = **Dimensional**.
- Frutas com efeitos estranhos.
- Brincadeira infantil: **"Perde ou Passa"**.
- Moeda: **Dracmas**.
""", tags=["ilha", "regras"], vis=T),
    e("cidade", "local", "Cidade de Paratus", "Cidade circular cercada por muralha, com praça central e fonte.", """
Visão de um paraíso perdido misturado a um futuro paradoxal: estruturas aleatórias que de alguma forma fazem sentido e trazem conforto. As casas são baixas, o que destaca algumas construções robustas.

**Mapa:** Paratium a noroeste; Casa do Imperador ao norte; Eclésia a nordeste; Mercatu a leste; Casa do Zoé a oeste; Hospitium a sudoeste; Theatron ao sul; Torre do Sol a sudeste. Saídas: praias e porto ao norte, floresta a leste, portão principal ao sul.
""", tags=["cidade"], vis=T, notas="A Torre do Sol vai ser movida para a parte costeira oposta da ilha (mapa a ajustar)."),
    e("paratium", "local", "Paratium (Coliseu)", "Entretenimento do povo e castigo para quem descumpre as leis.", """
Estrutura semelhante a um coliseu. Os novatos são levados para lá de início para o **teste de boas-vindas**; quem passa é aceito na cidade.
""", tags=["cidade", "paratium"], vis=T, notas="""
- Relíquia: **Faixa do Campeão** (Energia). Símbolo do trono; só reconhece quem venceu a última grande luta.
- 🟡 Moisés vai organizar um grande torneio para recarregar a Faixa e pretende matar o vencedor.
- Rehreus e Gota foram as únicas sobreviventes do cativeiro aqui.
- Formata Formosa fornece as armas.
"""),
    e("eclesia", "local", "Eclésia", "Local religioso, para orações e preparação para as bênçãos.", "", tags=["cidade", "bênçãos"], vis=T, notas="""
- 🟡 Ligação com o Plague (Religioso, Transcender).
- 🟡 O Limus sabe o que realmente acontece antes de alguém receber a bênção.
- Diego e Rafa ficaram presos num puzzle aqui com 2 integrantes da Rebelião (fim da Parte 1).
"""),
    e("mercatu", "local", "Mercatu", "Mercado de especiarias e comidas, e de itens abençoados vendidos como coisa comum.", "", tags=["cidade", "comércio"], vis=T, notas="""
- O Vendedor Paranormal (Limus) atende aqui.
- 🟡 Uma das fontes puras do Lírio passou por aqui; o Diego pode pegá-la sem saber e virar alvo do Império.
- Para os Orleans, é uma mina de ouro.
"""),
    e("casa_zoe", "local", "Casa do Zoé", "Hotel da cidade, com cronograma de atividades e eventos.", "", tags=["cidade"], vis=T, notas="""
- Ajudante da pousada: translúcido, atravessa paredes e vigia. 🟡 Escuta tudo o que se fala lá; ninguém sabe para quem conta.
"""),
    e("hospitium", "local", "Hospitium", "Centro médico da cidade.", "Não é grande, mas atende uma boa quantidade de cidadãos.", tags=["cidade"], vis=T),
    e("theatron", "local", "Theatron", "Teatro a céu aberto para apresentações e talentos.", "", tags=["cidade"], vis=T, notas="""
- **O esconderijo da Rebelião fica embaixo do Theatron**, com entrada pelos bastidores. Há uma Âncora fixa lá que esconde a Rebelião dos rituais de detecção do Império.
- Artista: BBTC ("bebê trás coca"), que mixa a própria voz.
"""),
    e("torre_sol", "local", "Torre do Sol", "Torre de topo aberto com um relógio de sol que sempre mostra a hora certa.", "O acesso é controlado. Quando você mais precisa, olhar o relógio faz perceber exatamente que horas são.", tags=["cidade"], vis=T, notas="""
- O acesso é controlado pelo Remus, que às vezes sobe sozinho à noite.
- ❓ Vai para a parte costeira oposta da ilha.
"""),
    e("temporada1", "evento", "Temporada 1 até o time skip", "Da expedição de resgate ao acordo com Marceus e às marcas nos pulsos.", """
- **Jan/2025:** uma equipe de pesquisa da Ordem some a caminho de Trindade e Martim Vaz. Só as malas são encontradas boiando.
- Breno convoca a missão e Gabriela lidera. Equipe: Diego Auditore, João Hozorio, Plague, Rafael Orleans e Chihiro.
- No barco *Princesa Calíope*, com o navegador Ronaldo, uma onda gigante e uma **canção atraente** atingem a equipe. A pedra amarela da Chihiro cria uma barreira dourada que salva todos.
- Acordam numa praia. Ronaldo está morto, com cortes profundos no peito e no pescoço.
- Numa vila de pedra em ruínas cheia de criaturas fantasmagóricas, **Marceus** se apresenta e oferece a entrada em Paratus em troca do **teste no Paratium**.
- Rafael tenta um ritual no aperto de mão; Marceus intercepta. A equipe recebe **marcas nos pulsos**, sinal do acordo. Pela marca da Gabriela dá para chamar o Marceus.
- **Marceus leva a Chihiro** numa nuvem dourada.
- No Mercatu, o Vendedor (crânio de alce com uma espiral) carrega no peito uma pedra dourada igual à da Chihiro e oferece trocá-la por um serviço.
- Depois vem o time skip: meses presos na ilha.
""", tags=["temporada 1", "resumo"], vis=T),

    # ------------------------------------------------------------------ facções
    e("imperio", "faccao", "O Império", "Controle e comando central da ilha, sob o Imperador Moisés.", """
A potência da ilha: segurança, decisões e eventos são propostos e comandados pelo Império.

**Membros:** Moisés (Imperador), Vanessa Fulgor (primeira maga), Marceus Fulgor (porta-voz e segundo mago), Formata Formosa (armeira), Remus (líder dos guardas).
""", tags=["império"]),
    e("rebeliao", "faccao", "A Rebelião", "Quer tirar o costume do paranormal e devolver as leis da realidade à ilha.", """
Fundada por **Petreus, o Eterno**; hoje liderada pela filha dele, **Mania Plutão**. Sustentada por acordos com tribos de fora da cidade e doações de cidadãos.

Esconderijo embaixo do Theatron. Artefato principal: **a Âncora**.
""", tags=["rebelião"]),
    e("centro_canario", "faccao", "Centro de Pesquisas Canário", "Laboratório escondido onde cientistas estudam o paranormal livremente.", """
Os únicos na ilha que usam os nomes de fora (Sangue, Morte, Conhecimento, Energia).

- Fica fora da cidade, numa área de mata. A entrada fica sob a estufa de sementes da Dra. Maia; nas primeiras vezes, quem entra vai de olhos vendados.
- Tudo funciona com uma fonte trancada numa sala selada; as luzes piscam com um "pulso" (é a Renata).
- Quem passa pelo Centro jura não revelar a entrada.
""", tags=["canário", "ciência"]),
    e("orleans", "faccao", "Família Orleans", "Família rica e influente que, de verdade, vende artefatos paranormais.", """
- De fachada: grandes ações e marcas de roupa. O negócio real é a **venda de artefatos paranormais e itens ocultos**.
- Todos os Orleans são ruivos.
- Thiago Orleans financiou a expedição que desapareceu.
""", tags=["orleans", "fora da ilha"]),
    e("tribo_artua", "faccao", "Tribo Artuã", "Poucas pessoas, afastadas da cidade, com costumes próprios.", """
Inspirada em tribos africanas.

**Costumes:** cada espiral tatuada marca um ciclo da vida; os mortos são honrados com crânios gravados; um estrangeiro só fala com o líder depois de dividir uma refeição com a tribo.

- Guarda a relíquia **Mão da Vida** (Morte).
- 🟡 Apoia a Rebelião e recusou um enviado do Império.
- 🟡 Tinha um pacto de paz com o trono do Andreias, firmado pelo conselheiro Calebe. Moisés rompeu o pacto.
""", tags=["tribo", "morte"]),
    e("ordem", "faccao", "Ordo Realitas", "A Ordem, de onde vieram os agentes.", "Breno convocou a missão de resgate. A Agatha pode saber mais do que contou sobre a Chihiro.", tags=["fora da ilha"]),

    # ------------------------------------------------------------------ personagens: Império
    e("moises", "personagem", "Moisés, o Imperador", "Ex-agente da Ordem que matou Andreias no Paratium e tomou o trono.", """
- Ex-agente da Ordem, registros censurados; sumiu numa missão atrás da civilização.
- Ganhou influência com suas habilidades paranormais.
- 🟡 Desafiou o imperador **Andreias** no Paratium, o matou e conquistou a **Faixa do Campeão**.
- Quer o **Poder Impossível**: tornar-se um com o paranormal sem pagar custos.
- 🟡 Lê o diário do Lírio, escrito numa língua de fora.
- 🟡 Quando ouvir o nome "Calebe" pela primeira vez, a reação dele entrega o passado dos dois.
""", tags=["império", "vilão"]),
    e("vanessa", "personagem", "Vanessa Fulgor", "Primeira maga da corte; direta, ríspida, conhece muitos truques da ilha.", "🟡 Teve um filho, o Marceus, com o Petreus. Faz questão de que ninguém lembre disso.", tags=["império"]),
    e("marceus", "personagem", "Marceus Fulgor", "Porta-voz e segundo mago do Império; organiza os eventos.", """
- Quer substituir a mãe para aposentá-la.
- Recebeu a equipe na chegada, firmou o acordo das marcas e levou a Chihiro.
- 🟡 Filho do Petreus com a Vanessa: **meio-irmão da Mania sem saber**. Cresceu ouvindo que o pai era um monstro. Candidato a desertor.
- O Império sentiu a pedra voltando à ilha: ele não esperava os agentes, esperava a Chihiro.
""", tags=["império"], status=P),
    e("remus", "personagem", "Remus", "Líder dos guardas, velho mas capaz.", "Controla o acesso à Torre do Sol e às vezes sobe lá sozinho à noite.", tags=["império"]),
    e("formata", "personagem", "Formata Formosa", "A armeira mais famosa; faz as armas do Coliseu e dos guardas.", "Guardas com armas da Formata continuam fortes mesmo sob a Âncora.", tags=["império"]),
    e("livia", "personagem", "Lívia, a Criança do Limiar", "Menina presa no palácio; todo efeito paranormal nela é dobrado.", """
- Tem uma forma diferente da doença do paranormal: efeitos positivos e negativos têm efeito **dobrado** nela (só nela).
- Presa pelo Imperador por ser o instrumento perfeito para afinar a membrana.
- 🟡 Filha do **Andreias**. Moisés não a mata porque precisa dela: é refém e ferramenta.
- 🟡 Numa câmara no coração do palácio; a porta só aparece com o sangue do Moisés (ou com a Faixa). Até a Vanessa e o Marceus acham que ela morreu.
- 🟡 Dilema: se a Rebelião "devolver a realidade", o efeito também cai dobrado nela. Pode matá-la ou curá-la.
- A Chihiro é usada para mantê-la calma.
""", tags=["império", "segredo"], status=P),
    e("andreias", "personagem", "Andreias", "O antigo imperador, morto por Moisés no Paratium.", "Tinha uma filha, que ninguém vê desde que ele morreu. Calebe foi seu conselheiro.", tags=["império", "passado"]),

    # ------------------------------------------------------------------ Rebelião
    e("mania", "personagem", "Mania Plutão", "Líder da Rebelião, filha do Petreus. Bela, séria e centrada.", "Guarda o **Catalisador Erudito** (a verdadeira pedra da Chihiro), comprado do Limus.", tags=["rebelião"]),
    e("petreus", "personagem", "Petreus Plutão, o Eterno", "Fundador da Rebelião.", "Está petrificado pela doença do paranormal (casca de madeira podre e lodo). Para os jogadores, desaparecido; a Rebelião esconde o corpo.", tags=["rebelião", "segredo"]),
    e("domu", "personagem", "Domu", "Segurança da Mania; careca, parrudo, poucas palavras.", "Os ossos das mãos têm forma de soqueiras com lâminas.", tags=["rebelião"]),
    e("rebecca", "personagem", "Rebecca Platus", "A \"biblioteca humana\" da Rebelião; simpática e cabeça cheia.", "Confirma que há um estrangeiro no palácio (o Thiago). Pode ter registros sobre a \"menina que roubou a pedra\".", tags=["rebelião"]),
    e("gota", "personagem", "Gota", "Garoto das ruas que sobreviveu ao cativeiro no Paratium com a Rehreus.", "Foi levado ao coliseu depois de roubar uma loja para não morrer de fome. 🟡 Vive sob a proteção da Rebelião.", tags=["rebelião", "paratium"]),

    # ------------------------------------------------------------------ Centro Canário
    e("lirio", "personagem", "Lírio Hills, \"o Viajante\"", "Arqueólogo paranormal da Ordem preso na ilha; pai da Gabriela.", """
- Fachada de fotógrafo. Caiu na ilha num avião, com itens paranormais que perdeu (as "fontes puras").
- Vive isolado no Centro Canário tentando achar uma saída.
- 🟡 O diário dele está com o Moisés; por isso é o único que sabe como impedir o ritual.
- O Plague só conhece a voz e os bilhetes dele; nunca ouviu o nome "Hills".
""", tags=["canário", "hills", "segredo"]),
    e("renata", "personagem", "Renata Hills", "Mãe da Gabriela; virou energia pura.", "Contraiu uma doença que transformou seu corpo em energia. O Lírio a contém e usa essa energia para alimentar o Centro e carregar os núcleos da Âncora.", tags=["canário", "hills", "segredo"]),
    e("adrian", "personagem", "Dr. Adrian Atlas", "Estuda a análise e manipulação do paranormal no corpo das pessoas.", "", tags=["canário"]),
    e("maia", "personagem", "Dra. Maia Orfeu", "Pesquisa sementes especiais da ilha; adora ajudar os outros.", "Levou o Plague ferido para o Centro depois do teste do Paratium.", tags=["canário"]),
    e("theo", "personagem", "Theo Aristeu", "Sobrinho do Adrian e assistente; esperto, mas sem experiência.", "", tags=["canário"]),

    # ------------------------------------------------------------------ outros NPCs
    e("limus", "personagem", "Limus, o Vendedor Paranormal", "Corpo de lodo, crânio de alce com uma espiral; vende informação a quem pagar.", """
- Independente, sombrio e quieto. 🟡 Nunca mente, mas só conta o que foi pago.
- Nome real: **Calebe**, ex-agente da Ordem. Ninguém em Paratus sabe.
- 🟡 Era parceiro do Moisés na missão. Foi conselheiro do Andreias; quando Moisés tomou o trono, tentou eliminá-lo com um ritual, e o corpo virou lodo.
- 🟡 O crânio de alce foi um presente de honra da Tribo Artuã e mantém o corpo estável.
- Vendeu a pedra verdadeira à Mania e entregou a réplica aos jogadores.
- Rival e informante do Diego e do Thiago.
""", tags=["mercatu", "informante", "segredo"], status=P),
    e("thiago", "personagem", "Thiago Orleans", "Financiou a expedição desaparecida; finge ser vítima do Império.", """
- Levou os documentos das malas, que revelavam o interesse da família.
- Veio buscar os itens apreendidos dos Orleans que o Lírio carregava.
- **Twist:** está negociando com o Império; a rede dos Orleans serve ao plano do Moisés.
- Pistas: não tem a marca do acordo (ou tem uma diferente), sabe nomes do palácio, reage ao nome "Hills".
""", tags=["orleans", "traidor", "segredo"]),
    e("chihiro", "personagem", "Chihiro, a Desacorrentada", "Psicóloga da Ordem, aprendiz da Agatha, levada pelo Marceus na chegada.", """
- Carregava o Catalisador Erudito como amuleto de família.
- **Tem sangue de Paratus:** neta de Elie Tereza Veríssimo.
- É **o Desacorrentado**: o paranormal não deixa marcas na mente dela.
- No palácio, o Moisés a usa para manter a Lívia calma. Quando os jogadores a encontrarem, ela vai saber onde a menina está.
""", tags=["ordem", "segredo"]),
    e("elie", "personagem", "Elie Tereza Veríssimo", "Avó da Chihiro e do Breno; nasceu em Paratus e fugiu com a pedra.", """
- 84 anos, cheia de aventuras. Recebeu a bênção aos 15 e pouco depois fugiu levando o Catalisador Erudito.
- Dois filhos: o Veríssimo (pai do Breno) e o pai da Chihiro.
- **Twist:** o Breno sabia de Paratus pelas histórias dela.
""", tags=["fora da ilha", "passado"]),
    e("ayo", "personagem", "Ayo, líder Artuã", "Calmo, fala pouco e escuta muito; mão direita de madeira branca com flores lilás.", "Perdeu a mão protegendo a tribo quando o Moisés rompeu o pacto. 🟡 A prótese é a própria Mão da Vida. Pode reconhecer o crânio do Limus.", tags=["tribo"]),
    e("arpiario", "personagem", "Arpiário", "Conversa com pássaros e vende o que eles veem.", "❓ Onde vive.", tags=["informante"], status=A),
    e("equipe_desaparecida", "personagem", "A equipe de pesquisa desaparecida", "Os primeiros que a onda trouxe, dias antes dos agentes.", """
- **Thiago Orleans:** ver entrada própria.
- **Alessa Bezerra** (médica e bióloga marinha): estuda o sistema de defesa do mar. É quem conta que o Thiago sumiu com a pasta.
- **Renato Oliveira** (arqueólogo): virou cidadão, já tem uma bênção e não quer voltar.
- **Letícia Durmân** (segurança): morreu no teste do Paratium.
- **Murilo Santos** (geólogo): desaparecido de verdade. Gancho para a temporada 2.
""", tags=["ordem"]),
    e("joao", "personagem", "João Hozorio", "Agente veterano da equipe; morreu no final da Parte 1.", "Era personagem de um jogador. A morte não aparece no resumo.", tags=["ordem"]),

    # ------------------------------------------------------------------ PJs
    e("pj_diego", "personagem", "Diego (agente)", "Ladrão e mestre do disfarce; rouba só de ricos e corruptos.", """
- Interessado em itens amaldiçoados.
- Acordo com o Limus: busca itens em troca de informações e dinheiro. 🟡 Cada entrega rende uma informação útil ao grupo.
- 🟡 Meio da temporada: a Rebelião o recruta para um roubo no palácio.
""", tags=["jogador"]),
    e("pj_gabriela", "personagem", "Gabriela Hills (agente)", "Líder da missão; investiga a morte dos pais.", """
- Acredita que os pais morreram num acidente de avião quando ela tinha 7 anos; achou um símbolo ocultista na turbina.
- Percebe o paranormal por cores; o cachorro Bolt usa uma roupa amaldiçoada de Energia.
- 🟡 **Twist:** os pais estão vivos no Centro Canário.
""", tags=["jogador", "hills"]),
    e("pj_rehreus", "personagem", "Rehreus Akeldama (agente)", "Única agente nascida em Paratus; sobrevivente do Paratium.", """
- Resgatada pela Rebelião junto com o Gota. Não tem a marca do acordo.
- Objetivos: descobrir quem administrava o coliseu, destruir a droga Rubra e o culto, descobrir quem matou seus pais e seu nome verdadeiro.
- 🟡 Ponte entre o grupo e a Mania; peça central do arco do torneio.
""", tags=["jogador", "paratium"]),
    e("pj_plague", "personagem", "Plague (agente)", "Médico de campo ligado ao Centro Canário.", "❓ Sem lore na ficha; pedir ao jogador. 🟡 Origem Religioso sugere ligação com a Eclésia.", tags=["jogador", "canário"], status=A),
    e("pj_rafael", "personagem", "Rafael Orleans (agente)", "Ocultista; a lore do personagem vai mudar.", "❓ Não usar como base por enquanto. Se mantiver o nome Orleans, o Thiago vai reagir.", tags=["jogador", "orleans"], status=A),

    # ------------------------------------------------------------------ relíquias
    e("poder_impossivel", "segredo", "O Poder Impossível", "O plano do Moisés: tornar-se um com o paranormal sem pagar custos.", """
Ele precisa de:
1. **O Desacorrentado**: alguém livre das correntes da realidade (a Chihiro).
2. **A Criança do Limiar**: alguém em quase simbiose com o outro lado (a Lívia).
3. **Os 4 Itens do Limiar**, um por elemento e bênção. Juntos abrem caminho para o quinto elemento: o **Medo**.
""", tags=["império", "plano"], status=P),
    e("catalisador", "reliquia", "Catalisador Erudito", "A pedra dourada da Chihiro; relíquia de Conhecimento (bênção Mental).", "A **verdadeira** está com a Mania. A **réplica**, que o Limus usava no peito, ficou com os jogadores e não funciona.", tags=["relíquia", "conhecimento"]),
    e("mao_vida", "reliquia", "Mão da Vida", "Relíquia de Morte (bênção Temporal) guardada pela Tribo Artuã.", "🟡 É a prótese do Ayo. Para pegá-la, seria preciso tirar o braço dele.", tags=["relíquia", "morte"], status=P),
    e("coroa", "reliquia", "Coroa Corrupta", "Relíquia de Sangue (bênção Física) no Jardim do Cupido.", "🟡 Transforma amor em obsessão; quem a usa não consegue largá-la.", tags=["relíquia", "sangue"], status=P),
    e("faixa", "reliquia", "Faixa do Campeão", "Relíquia de Energia (bênção Dimensional) e símbolo do trono.", "🟡 Só reconhece quem venceu a última grande luta do Paratium; não responde mais ao Moisés.", tags=["relíquia", "energia"], status=P),
    e("ancora", "reliquia", "A Âncora", "Artefato da Rebelião que engrossa a membrana e enfraquece o paranormal.", """
- Estaca de ferro em forma de âncora com um encaixe para um **núcleo** que pulsa.
- Cada núcleo rende uma ativação; chegam em segredo pelo Centro Canário, carregados com a energia da Renata.
- Formas: **Zona** (área por algumas horas), **Pulso** (3 rodadas), **Marca** (o Império aperta as marcas do acordo).
- Desligar: arrancar o núcleo (Crime ou Tecnologia) ou destruir a estaca.
- Avisos: zumbido grave, cores desbotando, rituais engasgando.
""", tags=["rebelião", "relíquia", "mecânica"]),
    e("marcas", "segredo", "As marcas do acordo", "Marcas nos pulsos recebidas no acordo com o Marceus.", "Pela marca da Gabriela dá para chamar o Marceus. O Império pode apertar as marcas para ativar a Âncora (forma Marca). A Rehreus não tem marca.", tags=["império", "mecânica"]),
    e("defesa_mar", "segredo", "A onda e a canção", "O sistema de defesa da ilha.", "O Ronaldo morreu porque ouviu a música e foi fraco a ela.", tags=["ilha"]),
    e("fontes_puras", "reliquia", "As fontes puras do Lírio", "Itens paranormais que caíram com o avião dos Hills.", "Os itens tinham sido apreendidos dos Orleans. São as mesmas fontes que o Moisés procura. Uma passou pelo Mercatu.", tags=["hills", "orleans"], status=P),
    e("rubra", "reliquia", "A droga Rubra", "Droga paranormal que a Rehreus quer destruir, junto com o culto.", "", tags=["droga"], status=A),

    # ------------------------------------------------------------------ lugares fora da cidade
    e("jardim", "local", "Jardim do Cupido", "Ruínas de uma civilização antiga, destruída numa guerra de outra época.", """
- Guarda a **Coroa Corrupta**.
- Protegido pelo conto de dois amantes (um guerreiro e uma arqueira) mortos juntos no campo de batalha.
- 🟡 O poema funciona como mapa; os amantes viraram guardiões de Sangue que só caem juntos.
- Texto do poema "Os Enamorados": ver a página Lore Fechada no Notion.
""", tags=["relíquia", "sangue"], status=P),
    e("esconderijo", "local", "Esconderijo da Rebelião", "Embaixo do Theatron, com entrada pelos bastidores.", "Uma Âncora fixa esconde o lugar dos rituais de detecção do Império.", tags=["rebelião"]),
    e("vila_ruinas", "local", "Vila de pedra em ruínas", "Onde a equipe encontrou as criaturas fantasmagóricas e o Marceus.", "", tags=["temporada 1"]),
    e("palacio", "local", "Palácio do Imperador", "Casa do Imperador, ao norte da cidade.", "🟡 Alvo do roubo do Diego no meio da temporada. A câmara da Lívia fica no coração do palácio.", tags=["império"]),
]

# (origem, destino, rótulo, visibilidade)
CONEXOES = [
    # públicas (entre entradas públicas)
    ("paratium", "cidade", "fica em", T), ("eclesia", "cidade", "fica em", T), ("mercatu", "cidade", "fica em", T),
    ("casa_zoe", "cidade", "fica em", T), ("hospitium", "cidade", "fica em", T), ("theatron", "cidade", "fica em", T),
    ("torre_sol", "cidade", "fica em", T), ("bencaos", "eclesia", "preparadas na", T), ("ser_cidadao", "paratium", "exige o teste no", T),
    # secretas
    ("moises", "imperio", "lidera", M), ("vanessa", "imperio", "membro de", M), ("marceus", "imperio", "membro de", M),
    ("remus", "imperio", "membro de", M), ("formata", "imperio", "membro de", M), ("marceus", "vanessa", "filho de", M),
    ("marceus", "petreus", "filho de", M), ("marceus", "mania", "meio-irmão de", M), ("moises", "andreias", "matou", M),
    ("livia", "andreias", "filha de", M), ("moises", "livia", "mantém presa", M), ("livia", "palacio", "presa no", M),
    ("moises", "palacio", "vive no", M), ("palacio", "cidade", "fica em", M), ("remus", "torre_sol", "controla o acesso à", M),
    ("formata", "paratium", "arma o", M), ("faixa", "paratium", "ligada ao", M), ("moises", "faixa", "conquistou", M),
    ("moises", "poder_impossivel", "busca o", M), ("livia", "poder_impossivel", "peça do", M), ("chihiro", "poder_impossivel", "peça do", M),
    ("catalisador", "poder_impossivel", "Item do Limiar", M), ("mao_vida", "poder_impossivel", "Item do Limiar", M),
    ("coroa", "poder_impossivel", "Item do Limiar", M), ("faixa", "poder_impossivel", "Item do Limiar", M),
    ("mania", "rebeliao", "lidera", M), ("petreus", "rebeliao", "fundou", M), ("mania", "petreus", "filha de", M),
    ("domu", "rebeliao", "membro de", M), ("domu", "mania", "protege", M), ("rebecca", "rebeliao", "membro de", M),
    ("gota", "rebeliao", "protegido pela", M), ("mania", "catalisador", "guarda", M), ("rebeliao", "esconderijo", "se esconde no", M),
    ("esconderijo", "theatron", "fica embaixo do", M), ("rebeliao", "ancora", "usa", M), ("rebeliao", "tribo_artua", "aliada de", M),
    ("lirio", "centro_canario", "vive no", M), ("renata", "centro_canario", "alimenta o", M), ("adrian", "centro_canario", "membro de", M),
    ("maia", "centro_canario", "membro de", M), ("theo", "centro_canario", "membro de", M), ("theo", "adrian", "sobrinho de", M),
    ("lirio", "renata", "casado com", M), ("pj_gabriela", "lirio", "filha de", M), ("pj_gabriela", "renata", "filha de", M),
    ("renata", "ancora", "carrega os núcleos da", M), ("lirio", "fontes_puras", "perdeu as", M), ("moises", "lirio", "lê o diário de", M),
    ("limus", "mercatu", "atende no", M), ("limus", "moises", "ex-parceiro de", M), ("limus", "andreias", "foi conselheiro de", M),
    ("limus", "tribo_artua", "firmou o pacto com", M), ("limus", "catalisador", "vendeu o", M), ("pj_diego", "limus", "trabalha para", M),
    ("thiago", "orleans", "membro de", M), ("thiago", "imperio", "negocia com", M), ("thiago", "pj_diego", "rival de", M),
    ("thiago", "fontes_puras", "procura as", M), ("pj_rafael", "orleans", "sobrenome", M),
    ("chihiro", "elie", "neta de", M), ("chihiro", "catalisador", "carregava o", M), ("elie", "catalisador", "roubou o", M),
    ("marceus", "chihiro", "levou", M), ("chihiro", "palacio", "presa no", M), ("chihiro", "livia", "acalma", M),
    ("ayo", "tribo_artua", "lidera", M), ("ayo", "mao_vida", "é a prótese de", M), ("mao_vida", "tribo_artua", "guardada pela", M),
    ("coroa", "jardim", "guardada no", M), ("pj_rehreus", "paratium", "sobreviveu ao", M), ("pj_rehreus", "gota", "sobreviveu com", M),
    ("pj_rehreus", "rebeliao", "deve a vida à", M), ("pj_rehreus", "rubra", "quer destruir", M), ("pj_plague", "centro_canario", "ligado ao", M),
    ("pj_plague", "maia", "salvo por", M), ("pj_gabriela", "rebeliao", "entrou na", M), ("pj_diego", "rebeliao", "aliado em parte", M),
    ("marcas", "marceus", "acordo com", M), ("equipe_desaparecida", "thiago", "inclui", M), ("joao", "ordem", "agente da", M),
    ("chihiro", "ordem", "psicóloga da", M), ("moises", "ordem", "ex-agente da", M), ("limus", "ordem", "ex-agente da", M),
    ("vila_ruinas", "marceus", "onde apareceu o", M), ("defesa_mar", "temporada1", "explica a onda da", M),
]
