"""Classes, poderes de classe e trilhas (Livro de Regras, p. 22-35). Resumos com palavras próprias."""


def classe(nome, resumo, pagina):
    return {"tipo": "classe", "nome": nome, "classe": nome, "resumo": resumo, "fonte": f"Livro de Regras, p. {pagina}"}


def hab(c, nome, resumo, nex=None, pagina=None):
    return {"tipo": "habilidade_classe", "nome": nome, "classe": c, "nex": nex, "resumo": resumo,
            "fonte": f"Livro de Regras, p. {pagina}"}


def pod(c, nome, resumo, pre=None, pagina=None):
    return {"tipo": "poder_classe", "nome": nome, "classe": c, "prerequisitos": pre, "resumo": resumo,
            "fonte": f"Livro de Regras, p. {pagina}"}


def tri(c, trilha, nex, nome, resumo, pagina):
    return {"tipo": "habilidade_trilha", "nome": nome, "classe": c, "trilha": trilha, "nex": nex, "resumo": resumo,
            "fonte": f"Livro de Regras, p. {pagina}"}


C, E, O = "Combatente", "Especialista", "Ocultista"

CLASSES = [
    classe(C, "PV 20+Vig (+4+Vig por NEX), PE 2+Pre (+2+Pre por NEX), SAN 12 (+3 por NEX). Luta ou Pontaria, Fortitude ou Reflexos e 1+Int perícias. Armas simples e táticas, proteções leves.", 24),
    classe(E, "PV 16+Vig (+3+Vig por NEX), PE 3+Pre (+3+Pre por NEX), SAN 16 (+4 por NEX). 7+Int perícias. Armas simples e proteções leves.", 28),
    classe(O, "PV 12+Vig (+2+Vig por NEX), PE 4+Pre (+4+Pre por NEX), SAN 20 (+5 por NEX). Ocultismo, Vontade e 3+Int perícias. Armas simples.", 32),
]

HABILIDADES = [
    hab(C, "Ataque Especial", "2 PE: +5 no ataque ou no dano; a cada faixa de NEX, +1 PE compra mais +5 (até 5 PE e +20 em NEX 85%).", 5, 24),
    hab(E, "Eclético", "2 PE: conta como treinado na perícia do teste.", 5, 28),
    hab(E, "Perito", "Em duas perícias treinadas (não Luta nem Pontaria), 2 PE somam +1d6; o dado cresce com o NEX até 1d12.", 5, 28),
    hab(E, "Engenhosidade", "Com Eclético, +2 PE para contar como veterano (NEX 40%) ou +4 PE como expert (NEX 75%).", 40, 30),
    hab(O, "Escolhido pelo Outro Lado", "Conjura rituais: 1º círculo, 2º em NEX 25%, 3º em 55% e 4º em 85%. Começa com três rituais e aprende um a cada NEX.", 5, 32),
    hab("Todas", "Aumento de Atributo", "+1 em um atributo (máximo 5) em NEX 20%, 50%, 80% e 95%.", 20, 26),
    hab("Todas", "Grau de Treinamento", "Em NEX 35% e 70%, sobe o grau de algumas perícias (treinado → veterano → expert). Quantidade varia por classe.", 35, 26),
    hab("Todas", "Versatilidade", "Em NEX 50%, um poder da classe ou o primeiro poder de outra trilha da classe.", 50, 26),
]

PODERES = [
    # Combatente
    pod(C, "Armamento Pesado", "Proficiência com armas pesadas.", "For 2", 25),
    pod(C, "Artista Marcial", "Desarmado causa 1d6 letal e conta como arma ágil (1d8 em NEX 35%, 1d10 em 70%).", None, 25),
    pod(C, "Ataque de Oportunidade", "Reação e 1 PE: ataca quem sai do espaço adjacente.", None, 25),
    pod(C, "Combater com Duas Armas", "Com duas armas (uma leve), ataca com as duas ao agredir, com –1 dado nos ataques até seu próximo turno.", "Agi 3, treinado em Luta ou Pontaria", 25),
    pod(C, "Combate Defensivo", "Ao agredir, –1 dado nos ataques e +5 na Defesa até seu próximo turno.", "Int 2", 25),
    pod(C, "Golpe Demolidor", "1 PE: dois dados extras de dano ao quebrar ou atacar objetos.", "For 2, treinado em Luta", 25),
    pod(C, "Golpe Pesado", "Armas corpo a corpo causam um dado de dano a mais.", None, 25),
    pod(C, "Incansável", "Uma vez por cena, 2 PE para uma ação de investigação extra usando Força ou Agilidade.", None, 25),
    pod(C, "Presteza Atlética", "1 PE: facilitar a investigação com Força ou Agilidade; se passar, o próximo aliado ganha +1 dado.", None, 25),
    pod(C, "Proteção Pesada", "Proficiência com proteções pesadas.", "NEX 30%", 25),
    pod(C, "Reflexos Defensivos", "+2 em Defesa e nos testes de resistência.", "Agi 2", 25),
    pod(C, "Saque Rápido", "Sacar e guardar viram ação livre; recarrega uma vez por rodada como ação livre.", "Treinado em Iniciativa", 25),
    pod(C, "Segurar o Gatilho", "Ao acertar com arma de fogo, ataca de novo o mesmo alvo pagando PE crescente (2, 4…).", "NEX 60%", 26),
    pod(C, "Sentido Tático", "Movimento e 2 PE: soma o Intelecto em Defesa e resistências até o fim da cena.", "Int 2, treinado em Percepção e Tática", 26),
    pod(C, "Tanque de Guerra", "Com proteção pesada, +2 na Defesa e na resistência a dano dela.", "Proteção Pesada", 26),
    pod(C, "Tiro Certeiro", "Com arma de disparo, soma Agilidade no dano e ignora a penalidade por alvo em corpo a corpo.", "Treinado em Pontaria", 26),
    pod(C, "Tiro de Cobertura", "Ação padrão e 1 PE: Pontaria contra Vontade; se vencer, o alvo não sai do lugar e sofre –5 nos ataques. Efeito de medo.", None, 26),
    # Especialista
    pod(E, "Artista Marcial", "Desarmado causa 1d6 letal e conta como arma ágil (1d8 em NEX 35%, 1d10 em 70%).", None, 29),
    pod(E, "Balística Avançada", "Proficiência com armas táticas de fogo e +2 no dano com elas.", None, 29),
    pod(E, "Conhecimento Aplicado", "2 PE: usa Intelecto como atributo de qualquer perícia (exceto Luta e Pontaria).", "Int 2", 29),
    pod(E, "Hacker", "+5 em Tecnologia para invadir sistemas, e hackear leva só uma ação completa.", "Treinado em Tecnologia", 29),
    pod(E, "Mãos Rápidas", "1 PE: um teste de Crime vira ação livre.", "Agi 3, treinado em Crime", 29),
    pod(E, "Mochila de Utilidades", "Um item (exceto arma) conta uma categoria abaixo e ocupa 1 espaço a menos.", None, 29),
    pod(E, "Movimento Tático", "1 PE: ignora penalidade de terreno difícil e de escalar até o fim do turno.", "Treinado em Atletismo", 29),
    pod(E, "Na Trilha Certa", "Ao achar uma pista, paga PE para ganhar dados extras no próximo teste (acumula).", None, 29),
    pod(E, "Nerd", "Uma vez por cena, 2 PE e Atualidades DT 20 para uma informação útil na cena.", None, 29),
    pod(E, "Ninja Urbano", "Proficiência com armas táticas corpo a corpo e de disparo (não de fogo) e +2 no dano com elas.", None, 29),
    pod(E, "Pensamento Ágil", "Uma vez por rodada na investigação, 2 PE para procurar pistas de novo.", None, 30),
    pod(E, "Perito em Explosivos", "Soma Intelecto na DT dos seus explosivos e pode poupar alvos igual ao Intelecto.", None, 30),
    pod(E, "Primeira Impressão", "+2 dados no primeiro teste social (Diplomacia, Enganação, Intimidação ou Intuição) da cena.", None, 30),
    # Ocultista
    pod(O, "Camuflar Ocultismo", "Esconde sigilos com ação livre; +2 PE para conjurar sem gestos nem componentes (perceber exige Ocultismo DT 25).", None, 33),
    pod(O, "Criar Selo", "Fabrica selos paranormais de rituais conhecidos no interlúdio; máximo igual à Presença.", None, 33),
    pod(O, "Envolto em Mistério", "+5 em Enganação e Intimidação contra quem não é treinado em Ocultismo.", None, 33),
    pod(O, "Especialista em Elemento", "DT dos seus rituais de um elemento +2.", None, 33),
    pod(O, "Ferramentas Paranormais", "Um item paranormal conta uma categoria abaixo e você ativa itens paranormais sem pagar PE.", None, 33),
    pod(O, "Fluxo de Poder", "Mantém dois rituais sustentados com uma única ação livre.", "NEX 60%", 33),
    pod(O, "Guiado pelo Paranormal", "Uma vez por cena, 2 PE para uma ação de investigação extra.", None, 34),
    pod(O, "Identificação Paranormal", "+10 em Ocultismo para identificar criaturas, objetos ou rituais.", None, 34),
    pod(O, "Improvisar Componentes", "Uma vez por cena, Investigação DT 15 para achar componentes de um elemento.", None, 34),
    pod(O, "Intuição Paranormal", "Ao facilitar a investigação, soma Intelecto ou Presença.", None, 34),
    pod(O, "Mestre em Elemento", "Rituais de um elemento custam 1 PE a menos.", "Especialista em Elemento no mesmo elemento, NEX 45%", 34),
    pod(O, "Ritual Potente", "Soma Intelecto no dano ou na cura dos seus rituais.", "Int 2", 34),
    pod(O, "Ritual Predileto", "Um ritual conhecido custa 1 PE a menos.", None, 34),
    pod(O, "Tatuagem Ritualística", "Rituais pessoais que têm você como alvo custam 1 PE a menos.", None, 34),
    # Todas
    pod("Todas", "Transcender", "Ganha um poder paranormal, mas não recebe Sanidade nesse aumento de NEX. Pode repetir.", None, 26),
    pod("Todas", "Treinamento em Perícia", "Treina duas perícias (ou sobe para veterano a partir de NEX 35% e expert a partir de 70%). Pode repetir.", None, 26),
]

TRILHAS = [
    # Combatente
    tri(C, "Aniquilador", 10, "A Favorita", "Uma arma escolhida tem a categoria reduzida em I.", 26),
    tri(C, "Aniquilador", 40, "Técnica Secreta", "Categoria da favorita –II; 2 PE por efeito no ataque: Amplo (alvo extra adjacente) ou Destruidor (+1 no multiplicador).", 26),
    tri(C, "Aniquilador", 65, "Técnica Sublime", "Novos efeitos: Letal (+2 na margem, ou +5 se escolhido duas vezes) e Perfurante (ignora 5 de resistência).", 26),
    tri(C, "Aniquilador", 99, "Máquina de Matar", "Categoria da favorita –III, +2 na margem e um dado de dano a mais.", 26),
    tri(C, "Comandante de Campo", 10, "Inspirar Confiança", "Reação e 2 PE: um aliado em alcance curto rola de novo um teste.", 26),
    tri(C, "Comandante de Campo", 40, "Estrategista", "Ação padrão e 1 PE por aliado (até seu Intelecto): eles ganham uma ação de movimento extra.", 26),
    tri(C, "Comandante de Campo", 65, "Brecha na Guarda", "Reação e 2 PE quando um aliado causa dano: você ou outro aliado ataca o mesmo inimigo; alcances viram médio.", 26),
    tri(C, "Comandante de Campo", 99, "Oficial Comandante", "Ação padrão e 5 PE: cada aliado à vista em alcance médio ganha uma ação padrão extra.", 26),
    tri(C, "Guerreiro", 10, "Técnica Letal", "+2 na margem de ameaça corpo a corpo.", 27),
    tri(C, "Guerreiro", 40, "Revidar", "Ao bloquear, reação e 2 PE para contra-atacar.", 27),
    tri(C, "Guerreiro", 65, "Força Opressora", "Ao acertar, 1 PE para derrubar ou empurrar como ação livre; após derrubar, 1 PE para atacar de novo.", 27),
    tri(C, "Guerreiro", 99, "Potência Máxima", "Bônus do Ataque Especial corpo a corpo são dobrados.", 27),
    tri(C, "Operações Especiais", 10, "Iniciativa Aprimorada", "+5 em Iniciativa e uma ação de movimento extra na primeira rodada.", 27),
    tri(C, "Operações Especiais", 40, "Ataque Extra", "Uma vez por rodada, 2 PE para um ataque adicional.", 27),
    tri(C, "Operações Especiais", 65, "Surto de Adrenalina", "Uma vez por rodada, 5 PE por uma ação padrão ou de movimento extra.", 27),
    tri(C, "Operações Especiais", 99, "Sempre Alerta", "Uma ação padrão extra no início de cada combate.", 27),
    tri(C, "Tropa de Choque", 10, "Casca Grossa", "+1 PV a cada 5% de NEX e soma Vigor na resistência ao bloquear.", 27),
    tri(C, "Tropa de Choque", 40, "Cai Dentro", "Reação e 1 PE: um inimigo que ataca um aliado testa Vontade ou ataca você.", 27),
    tri(C, "Tropa de Choque", 65, "Duro de Matar", "Reação e 2 PE: metade do dano não paranormal (paranormal também a partir de NEX 85%).", 27),
    tri(C, "Tropa de Choque", 99, "Inquebrável", "Machucado: +5 Defesa e resistência 5. Morrendo: continua agindo.", 27),
    # Especialista
    tri(E, "Atirador de Elite", 10, "Mira de Elite", "Proficiência com armas de balas longas e soma Intelecto no dano delas.", 30),
    tri(E, "Atirador de Elite", 40, "Disparo Letal", "Ao mirar, 1 PE para +2 na margem do próximo ataque.", 30),
    tri(E, "Atirador de Elite", 65, "Disparo Impactante", "Com calibre grosso, 2 PE para derrubar, desarmar, empurrar ou quebrar à distância.", 30),
    tri(E, "Atirador de Elite", 99, "Atirar para Matar", "Crítico com arma de fogo causa dano máximo.", 30),
    tri(E, "Infiltrador", 10, "Ataque Furtivo", "Uma vez por rodada, 1 PE: +1d6 contra alvo desprevenido ou flanqueado (+2d6 em NEX 40%, +3d6 em 65%, +4d6 em 99%).", 31),
    tri(E, "Infiltrador", 40, "Gatuno", "+5 em Atletismo e Crime e anda normalmente escondido.", 31),
    tri(E, "Infiltrador", 65, "Assassinar", "Movimento e 3 PE: o próximo Ataque Furtivo dobra os dados extras e pode derrubar o alvo (Fortitude evita).", 31),
    tri(E, "Infiltrador", 99, "Sombra Fugaz", "3 PE: esconder-se depois de atacar sem a penalidade de –15.", 31),
    tri(E, "Médico de Campo", 10, "Paramédico", "Ação padrão e 2 PE: cura 2d10 de um aliado adjacente (+1d10 por +1 PE em NEX 40%, 65% e 99%). Exige Medicina e kit.", 31),
    tri(E, "Médico de Campo", 40, "Equipe de Trauma", "Ação padrão e 2 PE: remove uma condição negativa (exceto morrendo) de um aliado adjacente.", 31),
    tri(E, "Médico de Campo", 65, "Resgate", "Aproxima-se de aliado ferido como ação livre; curar dá +5 de Defesa aos dois; carregar pesa metade.", 31),
    tri(E, "Médico de Campo", 99, "Reanimação", "Uma vez por cena, ação completa e 10 PE: traz de volta quem morreu na cena (exceto dano massivo).", 31),
    tri(E, "Negociador", 10, "Eloquência", "Ação completa e 1 PE por alvo: teste social contra Vontade deixa os alvos fascinados enquanto você fala.", 31),
    tri(E, "Negociador", 40, "Discurso Motivador", "Ação padrão e 4 PE: você e aliados em alcance curto ganham +1 dado nas perícias (8 PE: +2 dados em NEX 65%).", 31),
    tri(E, "Negociador", 65, "Eu Conheço um Cara", "Uma vez por missão, pede um favor à sua rede de contatos (a critério do mestre).", 31),
    tri(E, "Negociador", 99, "Truque de Mestre", "5 PE: imita uma habilidade que viu um aliado usar na cena, pagando os custos dela.", 31),
    tri(E, "Técnico", 10, "Inventário Otimizado", "Soma Intelecto à Força para a capacidade de carga.", 31),
    tri(E, "Técnico", 40, "Remendão", "Ação completa e 1 PE: conserta temporariamente um equipamento quebrado; equipamento geral conta uma categoria abaixo.", 31),
    tri(E, "Técnico", 65, "Improvisar", "Ação completa e PE: cria uma versão funcional de um equipamento geral até o fim da cena.", 31),
    tri(E, "Técnico", 99, "Preparado para Tudo", "Movimento e 3 PE por categoria: “lembra” que tinha qualquer item (exceto armas) na bolsa.", 31),
    # Ocultista
    tri(O, "Conduíte", 10, "Ampliar Ritual", "+2 PE: aumenta o alcance em um passo ou dobra a área.", 34),
    tri(O, "Conduíte", 40, "Acelerar Ritual", "Uma vez por rodada, +4 PE para conjurar como ação livre.", 34),
    tri(O, "Conduíte", 65, "Anular Ritual", "Paga o custo de um ritual que o atinge e vence Ocultismo oposto para anulá-lo.", 34),
    tri(O, "Conduíte", 99, "Canalizar o Medo", "Aprende o ritual Canalizar o Medo.", 34),
    tri(O, "Flagelador", 10, "Poder do Flagelo", "Paga rituais com PV (2 PV por PE), recuperáveis só com descanso.", 35),
    tri(O, "Flagelador", 40, "Abraçar a Dor", "Reação e 2 PE: metade do dano não paranormal.", 35),
    tri(O, "Flagelador", 65, "Absorver Agonia", "Derrubar inimigos com um ritual dá PE temporários iguais ao círculo dele.", 35),
    tri(O, "Flagelador", 99, "Medo Tangível", "Aprende o ritual Medo Tangível.", 35),
    tri(O, "Graduado", 10, "Saber Ampliado", "Aprende um ritual de 1º círculo e mais um a cada novo círculo, fora do limite.", 35),
    tri(O, "Graduado", 40, "Grimório Ritualístico", "Grimório com rituais de 1º e 2º círculos igual ao Intelecto; conjurar dele exige folhear (ação completa).", 35),
    tri(O, "Graduado", 65, "Rituais Eficientes", "DT de todos os seus rituais +5.", 35),
    tri(O, "Graduado", 99, "Conhecendo o Medo", "Aprende o ritual Conhecendo o Medo.", 35),
    tri(O, "Intuitivo", 10, "Mente Sã", "+5 nos testes de resistência contra efeitos paranormais.", 35),
    tri(O, "Intuitivo", 40, "Presença Poderosa", "Soma Presença ao limite de PE por turno para conjurar.", 35),
    tri(O, "Intuitivo", 65, "Inabalável", "Resistência a dano mental e paranormal 10; passar em Vontade de meio dano anula o dano.", 35),
    tri(O, "Intuitivo", 99, "Presença do Medo", "Aprende o ritual Presença do Medo.", 35),
    tri(O, "Lâmina Paranormal", 10, "Lâmina Maldita", "Aprende Amaldiçoar Arma (ou ele custa 1 PE a menos) e ataca com Ocultismo com a arma amaldiçoada.", 35),
    tri(O, "Lâmina Paranormal", 40, "Gladiador Paranormal", "Cada acerto corpo a corpo dá 2 PE temporários (até seu limite de PE por cena).", 35),
    tri(O, "Lâmina Paranormal", 65, "Conjuração Marcial", "Uma vez por rodada, ao conjurar um ritual de ação padrão, 2 PE para atacar como ação livre.", 35),
    tri(O, "Lâmina Paranormal", 99, "Lâmina do Medo", "Aprende o ritual Lâmina do Medo.", 35),
]

TODOS = CLASSES + HABILIDADES + PODERES + TRILHAS
