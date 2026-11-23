"""Origens (Livro de Regras, p. 16-21). Perícias são dados de regra; poderes resumidos com palavras próprias."""


def o(nome, pericias, poder, resumo, pagina):
    return {"tipo": "origem", "nome": nome, "pericias": pericias, "subtipo": f"Poder: {poder}",
            "resumo": resumo, "fonte": f"Livro de Regras, p. {pagina}"}


TODOS = [
    o("Acadêmico", "Ciências e Investigação", "Saber é Poder", "2 PE: +5 em um teste de Intelecto.", 16),
    o("Agente de Saúde", "Intuição e Medicina", "Técnica Medicinal", "Soma seu Intelecto aos PV que você cura.", 16),
    o("Amnésico", "Duas à escolha do mestre", "Vislumbres do Passado", "Uma vez por sessão, Intelecto DT 10 para reconhecer algo do passado: 1d4 PE temporários e talvez uma pista.", 16),
    o("Artista", "Artes e Enganação", "Magnum Opus", "Uma vez por missão, alguém o reconhece: +5 em testes de Presença contra essa pessoa.", 17),
    o("Atleta", "Acrobacia e Atletismo", "110%", "2 PE: +5 em um teste de Força ou Agilidade (exceto Luta e Pontaria).", 17),
    o("Chef", "Fortitude e Profissão (cozinheiro)", "Ingrediente Secreto", "No interlúdio, quem comer seu prato recebe o benefício de dois pratos.", 17),
    o("Criminoso", "Crime e Furtividade", "O Crime Compensa", "Leva para a próxima missão um item encontrado, sem contar no limite da patente.", 18),
    o("Cultista Arrependido", "Ocultismo e Religião", "Traços do Outro Lado", "Começa com um poder paranormal, mas com metade da Sanidade da classe.", 18),
    o("Desgarrado", "Fortitude e Sobrevivência", "Calejado", "+1 PV a cada 5% de NEX.", 18),
    o("Engenheiro", "Profissão e Tecnologia", "Ferramentas Favoritas", "Um item (exceto arma) conta como uma categoria abaixo.", 18),
    o("Executivo", "Diplomacia e Profissão", "Processo Otimizado", "2 PE: +5 em teste estendido ou para revisar documentos.", 18),
    o("Investigador", "Investigação e Percepção", "Faro para Pistas", "Uma vez por cena, 1 PE: +5 para procurar pistas.", 19),
    o("Lutador", "Luta e Reflexos", "Mão Pesada", "+2 no dano corpo a corpo.", 19),
    o("Magnata", "Diplomacia e Pilotagem", "Patrocinador da Ordem", "Limite de crédito sempre um acima.", 20),
    o("Mercenário", "Iniciativa e Intimidação", "Posição de Combate", "No primeiro turno de cada cena de ação, 2 PE por uma ação de movimento extra.", 20),
    o("Militar", "Pontaria e Tática", "Para Bellum", "+2 no dano com armas de fogo.", 20),
    o("Operário", "Fortitude e Profissão", "Ferramenta de Trabalho", "Escolhe uma arma ligada à profissão: sabe usá-la e ganha +1 em ataque, dano e margem de ameaça.", 20),
    o("Policial", "Percepção e Pontaria", "Patrulha", "+2 em Defesa.", 20),
    o("Religioso", "Religião e Vontade", "Acalentar", "+5 em Religião para acalmar; quem é acalmado recupera 1d6 + sua Presença de Sanidade.", 21),
    o("Servidor Público", "Intuição e Vontade", "Espírito Cívico", "1 PE: +2 no bônus quando ajuda alguém.", 21),
    o("Teórico da Conspiração", "Investigação e Ocultismo", "Eu Já Sabia", "Resistência a dano mental igual ao seu Intelecto.", 21),
    o("T.I.", "Investigação e Tecnologia", "Motor de Busca", "Com internet, 2 PE para trocar um teste de perícia por Tecnologia (a critério do mestre).", 21),
    o("Trabalhador Rural", "Adestramento e Sobrevivência", "Desbravador", "2 PE: +5 em Adestramento ou Sobrevivência; terreno difícil não reduz seu deslocamento.", 21),
    o("Trambiqueiro", "Crime e Enganação", "Impostor", "Uma vez por cena, 2 PE para trocar um teste de perícia por Enganação.", 21),
    o("Universitário", "Atualidades e Investigação", "Dedicação", "+1 PE e mais 1 a cada NEX ímpar; limite de PE por turno +1.", 21),
    o("Vítima", "Reflexos e Vontade", "Cicatrizes Psicológicas", "+1 de Sanidade a cada 5% de NEX.", 21),
]
