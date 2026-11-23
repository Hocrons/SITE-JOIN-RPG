"""Itens do Capítulo 3 do Livro de Regras. Efeitos resumidos com palavras próprias (não é o texto do livro)."""

F = "Livro de Regras, cap. 3"


def item(tipo, nome, categoria, espacos, resumo, subtipo=None, pagina=None, **extra):
    d = {"tipo": tipo, "nome": nome, "categoria": categoria, "espacos": espacos, "resumo": resumo,
         "subtipo": subtipo, "fonte": f"Livro de Regras, p. {pagina}" if pagina else F}
    d.update(extra)
    return d


PROTECOES = [
    item("protecao", "Proteção leve", "I", 2, "Defesa +5. Jaqueta grossa ou colete balístico.", pagina=62, defesa=5),
    item("protecao", "Proteção pesada", "II", 5, "Defesa +10 e resistência 2 a balístico, corte, impacto e perfuração; –5 nas perícias afetadas por carga.", pagina=62, defesa=10),
    item("protecao", "Escudo", "I", 2, "Defesa +2, soma com a proteção. Ocupa uma mão; conta como proteção pesada para proficiência.", pagina=62, defesa=2),
]

MODIFICACOES = [
    # armas corpo a corpo e disparo
    item("modificacao", "Certeira", None, None, "+2 nos testes de ataque.", "Armas corpo a corpo e de disparo", 60),
    item("modificacao", "Cruel", None, None, "+2 nas rolagens de dano.", "Armas corpo a corpo e de disparo", 60),
    item("modificacao", "Discreta (arma)", None, None, "+10 para ocultar a arma; permite o teste sem treino.", "Armas corpo a corpo e de disparo", 60),
    item("modificacao", "Perigosa", None, None, "Margem de ameaça +2.", "Armas corpo a corpo e de disparo", 60),
    item("modificacao", "Tática", None, None, "Sacar a arma vira ação livre.", "Armas", 60),
    # armas de fogo
    item("modificacao", "Alongada", None, None, "+2 nos testes de ataque.", "Armas de fogo", 60),
    item("modificacao", "Calibre grosso", None, None, "Soma mais um dado de dano do mesmo tipo.", "Armas de fogo", 60),
    item("modificacao", "Compensador", None, None, "Elimina a penalidade de rajadas.", "Armas de fogo", 60),
    item("modificacao", "Discreta (arma de fogo)", None, None, "+5 para ocultar e ocupa 1 espaço a menos.", "Armas de fogo", 60),
    item("modificacao", "Ferrolho automático", None, None, "A arma passa a ser automática.", "Armas de fogo", 60),
    item("modificacao", "Mira laser", None, None, "Margem de ameaça +2.", "Armas de fogo", 60),
    item("modificacao", "Mira telescópica", None, None, "Aumenta o alcance da arma e do Ataque Furtivo.", "Armas de fogo", 60),
    item("modificacao", "Silenciador", None, None, "Diminui em 10 a penalidade de Furtividade para se esconder depois de atirar.", "Armas de fogo", 60),
    item("modificacao", "Visão de calor", None, None, "Ignora camuflagem.", "Armas de fogo", 60),
    # munições
    item("modificacao", "Dum dum", None, None, "Multiplicador de crítico +1.", "Munições", 60),
    item("modificacao", "Explosiva", None, None, "+2d6 de dano.", "Munições", 60),
    # proteções
    item("modificacao", "Antibombas", None, None, "+5 nos testes de resistência contra efeitos de área.", "Proteções", 62),
    item("modificacao", "Blindada", None, None, "Resistência a dano passa a 5; ocupa 1 espaço a mais.", "Proteções", 62),
    item("modificacao", "Discreta (proteção)", None, None, "+5 para ocultar; ocupa 1 espaço a menos. Não combina com Reforçada.", "Proteções", 62),
    item("modificacao", "Reforçada", None, None, "Defesa +2; ocupa 1 espaço a mais. Não combina com Discreta.", "Proteções", 62),
    # acessórios
    item("modificacao", "Aprimorado", None, None, "O bônus de perícia do acessório sobe para +5.", "Acessórios", 64),
    item("modificacao", "Discreto (acessório)", None, None, "Miniaturizado ou disfarçado: +5 para ocultar, 1 espaço a menos.", "Acessórios", 64),
    item("modificacao", "Função adicional", None, None, "+2 em mais uma perícia, com aprovação do mestre.", "Acessórios", 64),
    item("modificacao", "Instrumental", None, None, "Funciona também como um kit de perícia.", "Acessórios", 64),
]

MUNICOES = [
    item("municao", "Balas curtas", "0", 1, "Pacote para pistolas, revólveres e submetralhadoras.", pagina=58),
    item("municao", "Balas longas", "I", 1, "Pacote para fuzis e metralhadoras.", pagina=58),
    item("municao", "Cartuchos", "I", 1, "Pacote para espingardas.", pagina=58),
    item("municao", "Combustível", "I", 1, "Carga para lança-chamas.", pagina=58),
    item("municao", "Flechas", "0", 1, "Aljava para arcos e bestas.", pagina=58),
    item("municao", "Foguete", "I", 1, "Um disparo de bazuca.", pagina=58),
]

GERAIS = [
    item("item", "Kit de perícia", "0", 1, "Necessário para certas perícias; sem ele, –5 no teste. Há um kit para cada perícia que pede.", "Acessório", 63),
    item("item", "Utensílio", "I", 1, "Objeto útil (lupa, notebook, smartphone…) que dá +2 em uma perícia, exceto Luta e Pontaria. Precisa estar empunhado.", "Acessório", 63),
    item("item", "Vestimenta", "I", 1, "Roupa que dá +2 em uma perícia, exceto Luta e Pontaria. Máximo de duas ao mesmo tempo; vestir é ação completa.", "Acessório", 63),
    item("item", "Granada de atordoamento", "0", 1, "Raio de 6m em alcance médio: alvos ficam atordoados 1 rodada (Fortitude reduz para ofuscado e surdo).", "Explosivo", 64),
    item("item", "Granada de fragmentação", "I", 1, "Raio de 6m: 8d6 de perfuração (Reflexos reduz à metade).", "Explosivo", 64),
    item("item", "Granada de fumaça", "0", 1, "Raio de 6m: cegueira e camuflagem total por 2 rodadas.", "Explosivo", 64),
    item("item", "Granada incendiária", "I", 1, "Raio de 6m: 6d6 de fogo e em chamas (Reflexos reduz o dano e evita as chamas).", "Explosivo", 64),
    item("item", "Mina antipessoal", "I", 1, "Detonada à distância: cone de 6m, 12d6 de perfuração (Reflexos reduz). Instalar pede Tática DT 15.", "Explosivo", 64),
    item("item", "Algemas", "0", 1, "Prende pulsos (–5 em testes com as mãos, impede conjurar) ou prende a um objeto. Escapar: Acrobacia DT 30.", "Operacional", 64),
    item("item", "Arpéu", "0", 1, "Gancho com corda; fixar pede Pontaria DT 15 e dá +5 em Atletismo para subir.", "Operacional", 65),
    item("item", "Bandoleira", "I", 1, "Uma vez por rodada, sacar ou guardar um item é ação livre.", "Operacional", 65),
    item("item", "Binóculos", "0", 1, "+5 em Percepção para observar à distância.", "Operacional", 65),
    item("item", "Bloqueador de sinal", "I", 1, "Impede celulares em alcance médio de se conectarem.", "Operacional", 65),
    item("item", "Cicatrizante", "I", 1, "Ação padrão, consome o item: cura 2d8+2 PV em você ou em alguém adjacente.", "Operacional", 65),
    item("item", "Corda", "0", 1, "10 metros; +5 em Atletismo para descer e serve para amarrar.", "Operacional", 65),
    item("item", "Equipamento de sobrevivência", "0", 2, "+5 em Sobrevivência para acampar e se orientar, e permite esses testes sem treino.", "Operacional", 65),
    item("item", "Lanterna tática", "I", 1, "Ilumina; ação de movimento para ofuscar um ser em alcance curto por 1 rodada (uma vez por cena por alvo).", "Operacional", 65),
    item("item", "Máscara de gás", "0", 1, "+10 em Fortitude contra efeitos respiratórios.", "Operacional", 66),
    item("item", "Mochila militar", "I", None, "Não ocupa espaço e aumenta a carga em 2 espaços.", "Operacional", 66),
    item("item", "Óculos de visão térmica", "I", 1, "Elimina a penalidade por camuflagem.", "Operacional", 66),
    item("item", "Pé de cabra", "0", 1, "+5 em Força para arrombar; em combate conta como bastão.", "Operacional", 66),
    item("item", "Pistola de dardos", "I", 1, "Ataque à distância; o alvo atingido fica inconsciente até o fim da cena (Fortitude reduz). Vem com 2 dardos.", "Operacional", 66),
    item("item", "Pistola sinalizadora", "0", 1, "Sinalizador luminoso; como arma de disparo leve causa 2d6 de fogo em alcance curto. 2 cargas.", "Operacional", 66),
    item("item", "Soqueira", "0", 1, "+1 no dano desarmado; aceita modificações e maldições de armas corpo a corpo.", "Operacional", 66),
    item("item", "Spray de pimenta", "I", 1, "Ação padrão, alvo adjacente fica cego por 1d4 rodadas (Fortitude evita). Dois usos.", "Operacional", 66),
    item("item", "Taser", "I", 1, "Ação padrão, alvo adjacente sofre 1d6 de eletricidade e fica atordoado 1 rodada (Fortitude evita). Dois usos.", "Operacional", 66),
    item("item", "Traje hazmat", "I", 2, "+5 contra efeitos ambientais e resistência a químico 10.", "Operacional", 66),
    # paranormais
    item("item", "Amarras de (elemento)", "II", 1, "Contra criaturas vulneráveis ao elemento: armadilha de 3x3m que imobiliza (2 PE) ou laço que paralisa em alcance curto (1 PE, +1 PE por rodada).", "Paranormal", 66),
    item("item", "Câmera de aura paranormal", "II", 1, "Ação padrão e 1 PE por foto: revela auras paranormais, na cor do elemento.", "Paranormal", 66),
    item("item", "Componentes ritualísticos de (elemento)", "0", 1, "Necessários para conjurar rituais daquele elemento (não existem de Medo).", "Paranormal", 66),
    item("item", "Emissor de pulsos paranormais", "II", 1, "Ação completa e 1 PE: atrai criaturas de um elemento e afasta as do elemento oposto (Vontade evita).", "Paranormal", 67),
    item("item", "Escuta de ruídos paranormais", "II", 1, "2 PE para gravar por 24h; ouvir a gravação dá +5 em Ocultismo para identificar criaturas.", "Paranormal", 67),
    item("item", "Medidor de estabilidade da Membrana", None, None, "Com Ocultismo, avalia o estado da Membrana numa área e o risco de manifestação.", "Paranormal", 67),
    item("item", "Scanner de manifestação paranormal de (elemento)", "II", 1, "Ação padrão e 1 PE por rodada: indica a direção de manifestações do elemento em alcance longo.", "Paranormal", 67),
]

TODOS = PROTECOES + MODIFICACOES + MUNICOES + GERAIS
