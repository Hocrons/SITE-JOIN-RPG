"""Eventos iniciais da linha do tempo de Paratus (do Notion do mestre).
Só o resumo da Temporada 1 até o time skip entra visível para todos; o resto, só o mestre."""

T, M = "todos", "mestre"
PASSADO, T1, SKIP = "Passado da ilha", "Temporada 1", "Time skip"

# (ordem, data, era, aproximada, titulo, descricao, visibilidade, [chaves de entradas do Códice])
EVENTOS = [
    (10, "Outra época", PASSADO, True, "As ruínas do Jardim do Cupido chegam à ilha",
     "Uma civilização destruída numa guerra de outra época vai parar em Paratus, com a Coroa Corrupta e o conto dos dois amantes.", M, ["jardim", "coroa"]),
    (20, "Um imperador antes de Andreias", PASSADO, True, "Elie foge da ilha com o Catalisador Erudito",
     "Aos 15 anos recebe a bênção e pouco depois escapa levando a pedra dourada. Fora da ilha, vira avó do Breno e da Chihiro.", M, ["elie", "catalisador"]),
    (30, "Anos atrás", PASSADO, True, "Petreus funda a Rebelião",
     "Petreus Plutão, o Eterno, começa a Rebelião. Mais tarde a doença do paranormal o petrifica.", M, ["petreus", "rebeliao"]),
    (40, "Anos atrás", PASSADO, True, "Moisés e Calebe chegam à ilha",
     "Dois agentes da Ordem, atrás da civilização perdida. Os registros dos dois são censurados.", M, ["moises", "limus", "ordem"]),
    (50, "Anos atrás", PASSADO, True, "O pacto de paz com a Tribo Artuã",
     "Calebe, conselheiro de Andreias, firma a paz com a tribo e recebe o crânio de alce com a espiral.", M, ["andreias", "limus", "tribo_artua"]),
    (60, "Quando a Gabi tinha 7 anos", PASSADO, False, "O avião dos Hills cai em Paratus",
     "Lírio e Renata caem na ilha com as fontes puras apreendidas dos Orleans. Renata vira energia pura; Lírio perde os itens.", M, ["lirio", "renata", "fontes_puras", "pj_gabriela"]),
    (70, "Anos atrás", PASSADO, True, "Moisés mata Andreias no Paratium",
     "Moisés desafia o imperador, vence, toma a Faixa do Campeão e o trono. Tenta eliminar Calebe com um ritual: o corpo vira lodo. A filha de Andreias, Lívia, é escondida no palácio.", M, ["moises", "andreias", "faixa", "limus", "livia"]),
    (75, "Depois do golpe", PASSADO, True, "Moisés rompe o pacto com a Tribo Artuã",
     "Ayo perde a mão protegendo a tribo. Desde então a tribo teme o Império.", M, ["ayo", "tribo_artua", "moises"]),
    (80, "Antes da temporada", PASSADO, True, "Rehreus e Gota sobrevivem ao Paratium",
     "Só os dois saem vivos do cativeiro no coliseu, muito feridos, e são resgatados pela Rebelião.", M, ["pj_rehreus", "gota", "rebeliao", "paratium"]),
    (100, "Jan/2025", T1, False, "A equipe de pesquisa da Ordem desaparece",
     "A caminho de Trindade e Martim Vaz, a equipe some. Só as malas são encontradas boiando.", T, ["temporada1"]),
    (105, "Jan/2025", T1, False, "A onda traz os pesquisadores para a ilha",
     "Dias antes dos agentes, a equipe chega a Paratus. Thiago some com a pasta; Letícia morre no teste do Paratium; Renato fica; Murilo desaparece.", M, ["equipe_desaparecida", "thiago", "defesa_mar"]),
    (110, "2025", T1, False, "A missão de resgate parte no Princesa Calíope",
     "Breno convoca, Gabriela lidera. Uma onda gigante e uma canção atraente atingem o barco; a pedra da Chihiro cria uma barreira dourada.", T, ["temporada1", "pj_gabriela"]),
    (120, "2025", T1, False, "A equipe acorda numa praia",
     "O navegador Ronaldo está morto, com cortes profundos no peito e no pescoço.", T, ["temporada1"]),
    (130, "2025", T1, False, "O acordo com Marceus",
     "Na vila de pedra em ruínas, Marceus oferece a entrada em Paratus em troca do teste no Paratium. A equipe recebe marcas nos pulsos.", T, ["temporada1", "marceus", "vila_ruinas"]),
    (140, "2025", T1, False, "Marceus leva a Chihiro",
     "Logo depois do acordo, a Chihiro some numa nuvem dourada.", T, ["temporada1"]),
    (150, "2025", T1, False, "O Vendedor do Mercatu",
     "Um vendedor com crânio de alce carrega no peito uma pedra igual à da Chihiro e oferece trocá-la por um serviço.", T, ["temporada1", "mercatu"]),
    (160, "2025", T1, False, "O teste de boas-vindas no Paratium",
     "A equipe passa pelo teste. O Plague sai ferido e é levado pela Dra. Maia ao Centro Canário.", M, ["paratium", "pj_plague", "maia"]),
    (170, "Fim da Parte 1", T1, False, "A morte de João Hozorio",
     "O agente veterano morre no fim da Parte 1.", M, ["joao"]),
    (180, "Fim da Parte 1", T1, False, "O puzzle da Eclésia",
     "Diego e Rafa ficam presos num puzzle com dois integrantes da Rebelião, que depois convidam a equipe para o grupo.", M, ["eclesia", "rebeliao", "pj_diego", "pj_rafael"]),
    (200, "Meses", SKIP, True, "Meses presos na ilha",
     "Sem conseguir sair, os agentes passam meses em Paratus e cada um encontra o próprio caminho.", T, ["temporada1"]),
]
