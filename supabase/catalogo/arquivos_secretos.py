"""Conteúdo para jogadores dos Arquivos Secretos (1 a 9). Dados de regra + resumos com palavras próprias."""

CUSTO = {1: 1, 2: 3, 3: 6, 4: 10}


def _f(ed, pag):
    return f"Arquivos Secretos {ed}, p. {pag}"


def origem(ed, pag, nome, pericias, poder, resumo):
    return {"tipo": "origem", "nome": nome, "pericias": pericias, "subtipo": f"Poder: {poder}", "resumo": resumo, "fonte": _f(ed, pag)}


def poder_classe(ed, pag, classe, nome, resumo, pre=None):
    return {"tipo": "poder_classe", "nome": nome, "classe": classe, "prerequisitos": pre, "resumo": resumo, "fonte": _f(ed, pag)}


def poder_geral(ed, pag, nome, resumo, pre=None):
    return {"tipo": "poder_geral", "nome": nome, "prerequisitos": pre, "resumo": resumo, "fonte": _f(ed, pag)}


def poder_par(ed, pag, nome, elemento, resumo, afinidade=None, pre=None):
    return {"tipo": "poder_paranormal", "nome": nome, "elemento": elemento, "resumo": resumo, "afinidade": afinidade,
            "prerequisitos": pre, "fonte": _f(ed, pag)}


def trilha(ed, pag, classe, nome_trilha, nex, nome, resumo):
    return {"tipo": "habilidade_trilha", "nome": nome, "classe": classe, "trilha": nome_trilha, "nex": nex, "resumo": resumo, "fonte": _f(ed, pag)}


def ritual(ed, pag, nome, elemento, circulo, execucao, alcance, alvo, duracao, resistencia, resumo, discente=None, verdadeiro=None):
    return {"tipo": "ritual", "nome": nome, "elemento": elemento, "circulo": circulo, "custo_pe": CUSTO[circulo],
            "execucao": execucao, "alcance": alcance, "alvo": alvo, "duracao": duracao, "resistencia": resistencia,
            "resumo": resumo, "discente": discente, "verdadeiro": verdadeiro, "fonte": _f(ed, pag)}


def item(ed, pag, tipo, nome, resumo, categoria=None, espacos=None, elemento=None, subtipo=None, **extra):
    d = {"tipo": tipo, "nome": nome, "resumo": resumo, "categoria": categoria, "espacos": espacos, "elemento": elemento,
         "subtipo": subtipo, "fonte": _f(ed, pag)}
    d.update(extra)
    return d


def uso(ed, pag, pericia, nome, resumo):
    return {"tipo": "uso_pericia", "nome": nome, "subtipo": pericia, "resumo": resumo, "fonte": _f(ed, pag)}


E, C, O = "Especialista", "Combatente", "Ocultista"

AS1 = [
    origem(1, 43, "Ferido por Ritual", "Ocultismo e uma perícia pelo elemento (Sangue: Fortitude; Morte: Vontade; Conhecimento ou Energia: Reflexos)",
           "Mácula Ritualística", "Aprende um ritual de 1º círculo do elemento que o marcou e o conjura de graça uma vez por cena (fora do limite), mas sofre –1 dado contra efeitos desse elemento."),
    origem(1, 43, "Transtornado Arrependido", "Luta e Ocultismo", "Sofrimento de Sangue",
           "Resistência 2 a dano mental, +1 para cada dois rituais ou poderes de Sangue; o descanso é sempre uma categoria pior."),
    uso(1, 43, "Ocultismo", "Blindar a Mente", "Veterano, DT 20: ação completa e 1 PE para +5 no próximo teste de Vontade da cena. Num aliado: DT 25 e ele testa Vontade DT 20 ou perde 1d4 SAN."),
    poder_classe(1, 44, O, "Ritual Intenso", "Soma Presença no dano e na cura dos seus rituais.", "Pre 2"),
    poder_classe(1, 44, O, "Acostumado a Maldição de (Elemento)", "Não perde Sanidade pelo preço da maldição de itens do elemento escolhido (outros efeitos continuam).", "Int 2, conjurar ritual de 2º círculo do elemento"),
    poder_classe(1, 44, O, "Saúde Sobrenatural", "Uma vez por cena, movimento e 3 PE: PV temporários iguais a Presença x10.", "Int 2, Pre 2, conjurar ritual de 1º círculo"),
    poder_classe(1, 44, O, "Reter Ritual de Combate", "Com a regra opcional Reter Ritual, pode mudar para cena a duração de rituais retidos (1 PE por ritual ao perder a retenção).", "Int 2, conjurar ritual de 1º círculo"),
    trilha(1, 45, O, "Maledictólogo", 10, "Identificação Macabra", "1 PE: +1d10 para identificar itens amaldiçoados ou rituais; identificar item como ação completa sofre só –1 dado."),
    trilha(1, 45, O, "Maledictólogo", 40, "Compreensão de Maldições", "No interlúdio, 3 PE e Ocultismo (DT 10 +5 por categoria): aprende o ritual de um item ou transfere as maldições dele para outro item ou uma tatuagem. Custa Sanidade."),
    trilha(1, 45, O, "Maledictólogo", 65, "Reproduzir Maldição", "Memoriza uma maldição conhecida e a aplica a outro item até o fim da missão (3 PE, Ocultismo, custa Sanidade)."),
    trilha(1, 45, O, "Maledictólogo", 99, "Maldição Suprema", "Ao reproduzir maldições, trata o item como três categorias abaixo."),
    poder_geral(1, 46, "(Habilidade) Aprimorada", "A DT de uma habilidade ou ritual sobe +2 (pode escolher duas vezes o mesmo, total +5)."),
    poder_geral(1, 46, "Cicatrizes Expostas", "Movimento para expor a cicatriz: +1d8 de dano, mas –1 dado em Vontade e em testes que pedem calma, até o fim da cena.", "Ter cicatrizes"),
    poder_geral(1, 46, "Instintos Urbanos", "Treino em Crime (ou +2); Crime DT 20 num lugar fechado revela rota de fuga: movimento extra ao fugir e +2 de Defesa.", "Agi 2"),
    poder_geral(1, 46, "Curiosidade Oculta", "Treino em Ocultismo (ou +2) e 2 PE para usar Ocultismo no lugar de Vontade.", "Int 2"),
    poder_geral(1, 46, "Especialista Esotérico", "Combina até três catalisadores ritualísticos num mesmo ritual.", "Int 3, conjurar ritual de 2º círculo, Domínio Esotérico"),
    poder_par(1, 47, "Ferro Maculado", "Sangue", "Movimento e 2 PV: um projétil causa +1d6 de Sangue uma vez.", "O dano vira +1d8."),
    poder_par(1, 47, "Sangue Corrosivo", "Sangue", "Movimento e 1 PE: até o fim da cena, quem o fere estando adjacente sofre 1d10 de Sangue.", "O dano vira 2d10."),
    poder_par(1, 47, "Placas Sanguinolentas", "Sangue", "Ao conjurar um ritual de Sangue, Defesa + círculo do ritual até seu próximo turno.", "O bônus vira círculo +2.", "Conjurar ritual de Sangue"),
    poder_par(1, 47, "Sangue Prazeroso", "Sangue", "Machucado: resistência a dano 5.", "Também +20 PV temporários uma vez por cena.", "Sangue 1"),
    ritual(1, 48, "Passagem de Conhecimento", "Sangue e Conhecimento", 2, "completa", "toque", "1 pessoa", "cena", "Vontade evita",
           "Domina o corpo do alvo ou troca de corpo com ele (cada um usa os atributos físicos do outro). Morte de um corpo prende ou mata quem está nele.",
           "+3 PE: alcance curto e dura 1 dia (2º círculo).", "+7 PE: alcance médio e permanente (4º círculo e afinidade)."),
    ritual(1, 50, "Passagem de Conhecimento Expandido", "Sangue e Conhecimento", 4, "1 dia", "curto", "10 pessoas", "veja texto", None,
           "Transfere a consciência de cinco voluntários para cinco corpos inconscientes. Exige conhecer Passagem de Conhecimento."),
    item(1, 54, "item", "Agrupador Ritualístico", "Segura até quatro componentes ou catalisadores, que contam como empunhados.", "II", 1, subtipo="Paranormal"),
    item(1, 54, "item", "Amuleto Sinalizador de (Elemento)", "Dá um sinal visível quando uma criatura do elemento entra em alcance longo, mesmo atrás de paredes.", "II", 1, subtipo="Paranormal"),
    item(1, 54, "item", "Rubra", "Droga paranormal: +5 em Força, Agilidade e Vigor e 10 PV temporários; depois perde atributos físicos até dormir e arrisca insanidade.", "II", 1, subtipo="Paranormal"),
    item(1, 55, "item_amaldicoado", "Arpão do Pescador", "Arma simples arremessável: 1d8 perfuração +1d12 Sangue, crítico x3; o alvo atingido no arremesso fica lento até arrancar.", "III", 1, "Sangue"),
    item(1, 55, "item_amaldicoado", "Combustível de Sangue", "Munição de lança-chamas ou galão: dano vira Sangue e os dados sobem uma categoria.", "III", 1, "Sangue"),
    item(1, 55, "item_amaldicoado", "Marreta Transtornada", "Arma tática de duas mãos: 2d10 impacto +2d12 Sangue, crítico x4; custa 1d6 PV para empunhar ou atacar e pode quebrar ossos no crítico.", "IV", 2, "Sangue"),
]

AS2 = [
    item(2, 21, "item", "Kit de Escalada", "Utensílio: +2 em Atletismo para escalar.", "I", 2, subtipo="Recurso"),
    item(2, 21, "item", "Bandagem", "Ação padrão, consome: cura 2d4+2 PV e remove sangrando (você ou alguém adjacente).", "I", 0.5, subtipo="Recurso"),
    item(2, 21, "item", "Bússola", "Utensílio: +2 em Sobrevivência para se orientar.", "I", 1, subtipo="Recurso"),
    item(2, 21, "item", "Pedra de Amolar", "Interlúdio: uma arma de corte ou perfuração causa +1d4 na próxima cena em que for usada.", "I", 0.5, subtipo="Recurso"),
    item(2, 21, "item", "Caixa de Ferramentas", "Utensílio: +2 em Profissão quando as ferramentas fizerem sentido.", "I", 2, subtipo="Recurso"),
    item(2, 21, "item", "Dose de Álcool", "+2 contra infecções e doenças por contato; com bandagem, a cura vira 2d8+2. Inflamável.", "I", 0.5, subtipo="Recurso"),
    item(2, 21, "item", "Incenso", "Interlúdio: todos na cena recuperam 1d4 PE (uma vez por dia).", "I", 0.5, subtipo="Recurso"),
    ritual(2, 65, "Mapa Sanguíneo", "Sangue", 2, "padrão", "toque", "1 superfície", "cena", "Vontade evita",
           "Desenha com sangue um mapa que mostra, em tempo real, onde estão todos os seres num raio de 1km.",
           "+3 PE: também mostra a condição de saúde de cada um."),
    ritual(2, 66, "Capturar Momento", "Morte", 2, "padrão", "médio", "esfera de 18m de raio", "permanente até ser dissipado", None,
           "Marca um local com um símbolo invisível que capta imagens e sons; você pode ver e ouvir por ele à distância.",
           "+3 PE: pode explodir o símbolo (4d8 de Morte em quem ele capta, Fortitude reduz).", "+7 PE: como discente, com 8d8 (3º círculo)."),
    ritual(2, 66, "Labirinto Mental", "Conhecimento", 2, "padrão", "médio", "1 pessoa", "1d4 rodadas", "Vontade evita",
           "Prende a mente do alvo: ele gasta as ações andando em direções aleatórias; testa de novo a cada turno.",
           "+3 PE: alcance longo.", "+7 PE: alcance longo e dura a cena (3º círculo)."),
    ritual(2, 67, "Rajada Caótica", "Energia", 2, "padrão", "médio", "1 ser", "instantânea", "Reflexos reduz à metade",
           "Raio de 8d6 de Energia.", "+3 PE: 8d8.", "+7 PE: 8d10 e pode disparar de novo a cada turno pela cena (3º círculo)."),
    item(2, 67, "item_amaldicoado", "A Antena", "Arma improvisada de duas mãos (1d6 impacto); +3 na DT dos seus rituais e guarda um ritual para soltar depois com ação padrão.", "IV", 2, "Medo"),
    poder_classe(2, 75, O, "Dominar Habilidade Ritualística", "Aprende uma habilidade de trilha de ocultista de outra trilha, respeitando o NEX. Até três vezes.", "Int 3, treinado em Ocultismo, conjurar rituais"),
    poder_geral(2, 74, "Prática com Materiais Ritualísticos", "Em conjurações complexas, não sofre a penalidade por materiais específicos da entidade.", "Int 2, treinado em Ocultismo, conjurar rituais"),
    item(2, 75, "item", "Catalisador Sofisticado e Horrorizado", "Vestível, não se gasta: uma vez por cena recebe 3d6 para somar (um por ritual) ao dano, à cura ou à DT de rituais.", "III", 1, subtipo="Paranormal"),
    poder_geral(2, 83, "Arte da Música Macabra", "Ação padrão e 2 PE: um ser que ouve você ganha +5 no próximo dano, +2 na margem, +5 no ataque ou +9m de alcance.", "Int 2 ou Pre 2, treinado em Ocultismo, conjurar rituais"),
    poder_geral(2, 83, "Sintonização Mental com Proteção", "Interlúdio e 3 PE: a proteção vestida usa outro atributo no lugar de Agilidade para a Defesa.", "Int 2 ou Pre 2, treinado em Ocultismo, conjurar rituais"),
    poder_geral(2, 83, "Sintonização Mental com Arma", "Interlúdio e 3 PE: a arma empunhada usa o atributo escolhido para ataque e dano.", "Int 2 ou Pre 2, treinado em Ocultismo, conjurar rituais"),
    poder_classe(2, 87, C, "Marteladas", "Ação completa e 3 PE: três ataques desarmados somados como um só dano (Fortitude reduz).", "For 2, treinado em Luta, Artista Marcial"),
    poder_geral(2, 87, "Movimentação Tática", "1 PE: dobra o deslocamento ao ir para cobertura ou para um inimigo.", "For 2, treinado em Atletismo e Tática"),
    poder_geral(2, 87, "Sentido Tático (Militar)", "Imune a desprevenido; ao causar dano, 2 PE para o alvo falhar em Furtividade contra você por 1 rodada.", "Pre 2, treinado em Percepção e Tática"),
]

AS3 = [
    poder_classe(3, 108, O, "Flagelo Bem Aproveitado", "Poder do Flagelo passa a custar 1 PV por PE.", "Escolhido pelo Outro Lado, Poder do Flagelo"),
    poder_classe(3, 108, O, "Recuperação Flagelante", "Uma vez entre interlúdios, recupera por outros meios os PV gastos com Poder do Flagelo (até 3 usos se repetido).", "Escolhido pelo Outro Lado, Poder do Flagelo"),
    poder_classe(3, 108, C, "Guardião da Tropa", "Reação e 2 PE: recebe no lugar de um aliado adjacente um ataque ou efeito de alvo único; se resistir, recupera 1 SAN.", "Ataque Especial, Casca Grossa"),
    poder_classe(3, 108, C, "Vitalidade Sofrida", "PV da classe passam a 24+Vig iniciais e 6+Vig por NEX, inclusive retroativamente.", "Ataque Especial"),
    poder_geral(3, 108, "Ambidestria", "Ataca com duas armas ao agredir (–1d20 nos ataques); com Combater com Duas Armas, sem penalidade e com armas de uma mão.", "For 2 ou Agi 2, treinado em Luta"),
    poder_geral(3, 109, "Entrada Triunfal", "Uma vez por sessão, ao anunciar sua chegada, +1d20 no primeiro teste no ambiente (pode passar para um aliado).", "Pre 2"),
    poder_geral(3, 109, "Papinho Sedutor", "1 PE: +5 num teste de Presença para seduzir; quem se apaixona pode virar problema.", "Pre 2"),
    poder_par(3, 109, "Instrumento Elétrico de Combate", "Energia", "Transforma um instrumento que você toca numa arma de Energia de duas mãos: ataque com Artes em alcance curto, 2d8 + Presença.", "Atinge todos os alvos escolhidos em alcance curto."),
    poder_par(3, 109, "Conhecimento de Direção Precognitiva", "Conhecimento", "+5 em Percepção ou Sobrevivência para se orientar até um lugar, mesmo sem conhecê-lo.", "O bônus vira +10."),
    item(3, 112, "item", "Bloody Mary Batizada", "Beber remove uma condição mental ou de medo, mas causa 2d4 de dano mental.", "II", 1, subtipo="Geral"),
    item(3, 112, "arma", "Garra do Harpia", "Arma tática ágil de duas mãos, arremessável; ao causar dano, 2 PE para agarrar. Item único.", "I", 2, subtipo="Táticas, Corpo a Corpo – Duas Mãos",
         dano="2d8", critico="19", margem=19, multiplicador=2, tipo_dano="corte", alcance="Curto"),
    item(3, 112, "item", "Paçoca", "Prato rápido; uma vez por dia, em ocasiões especiais, recupera 1d8+1 PV, PE e SAN.", "0", 0.5, subtipo="Geral"),
    item(3, 113, "item", "Crânio Dominador", "Ação padrão e 2 PE: correntes paralisam até dois alvos em alcance curto (Reflexos evita). Uma vez a cada 24h.", "III", 1, subtipo="Paranormal"),
    item(3, 113, "item", "Gaiola do Corvo", "Aberta no chão, cobre 18m de Lodo: terreno difícil e 3d10 de Morte por rodada; quem cai morrendo vira cinzas.", "IV", 2, subtipo="Paranormal"),
    item(3, 114, "item_amaldicoado", "Camiseta Psikolera", "Vestimenta: machucado, seu dano ganha +2d8 de Sangue.", "II", 1, "Sangue"),
    item(3, 114, "item_amaldicoado", "Dupla Obsessiva", "Maça e florete amaldiçoados (com dano extra de Sangue); ataca com as duas e pode receber ataques por um aliado.", "III", 2, "Sangue"),
    item(3, 115, "item_amaldicoado", "Armadura de Guevara (Couraças)", "Proteção pesada de Sangue: Defesa +10 (cresce até +20), 0 espaços, RD física 5 e Sangue 10, vulnerável a Morte; pode dominar o usuário.", "III", 0, "Sangue"),
]

AS4 = [
    origem(4, 64, "Influencer Paranormal", "Enganação e Tecnologia", "Quem Não Arrisca, Não Petisca",
           "+2 para resistir a condições mentais e de medo; ao falhar num desses testes, +1d20 no próximo teste da cena."),
    origem(4, 64, "Caçador de Recompensas", "Crime e Investigação", "Registrar o Paranormal",
           "Uma vez por cena, ação padrão e 2 PE para registrar uma criatura ou ritual; no interlúdio, o registro dá bônus para identificar a criatura ou deixa você conjurar o ritual até o próximo interlúdio."),
    uso(4, 64, "Tecnologia", "Obter Informações", "DT 5, ação completa: pesquisa rápida na internet sobre um lugar ou pessoa; uma informação, +1 a cada 5 pontos acima da DT."),
    poder_classe(4, 65, C, "Chuva de Balas", "Pacotes de munição duram o dobro e rajadas causam dois dados extras de dano."),
    poder_classe(4, 65, C, "Combatente Esforçado", "+1 PE por NEX.", "For 3 ou Vig 3"),
    poder_classe(4, 65, C, "Treinamento Militarizado", "Exercitar-se no interlúdio não gasta ação e o bônus vira +1d8 (também usável no dano)."),
    poder_classe(4, 65, E, "Análise Conturbada", "Na investigação, ação padrão: quem aceitar ouvir suas teorias rola 1d6 e ganha isso em testes de Int e Pre na cena, mas perde o mesmo em SAN."),
    poder_classe(4, 65, E, "Profissão Perigo", "Ação completa e 4 PE: desmonta um item e o transforma num item operacional de categoria e espaços até iguais. Três vezes por missão."),
    poder_classe(4, 65, E, "Quase Novo", "Na manutenção do interlúdio, o item ganha +10 PV e uma modificação temporária até o próximo interlúdio."),
    poder_classe(4, 66, O, "Terrores Noturnos", "Ao dormir, 1d100: acima de 50, +2 PE; até 50, descanso precário e –1d4 SAN, mas pode usar uma vez um poder paranormal ou ritual que cumpra."),
    poder_classe(4, 66, O, "Explorador da Névoa", "Uma vez por cena, 2 PE para sentir o estado da Membrana; se danificada, perde 1 SAN e seus rituais custam 1 PE a menos."),
    poder_geral(4, 66, "Sinestesia Paranormal", "Com a Membrana danificada, perde 1d6 SAN e troca os atributos de dois pares de perícias até sair da área."),
    poder_geral(4, 66, "Gororoba", "No interlúdio, alimenta-se uma vez sem gastar ação nem precisar de comida."),
    poder_geral(4, 66, "Ruído Branco", "Em ambientes movimentados, +1d6 em Investigação e Percepção; uma vez por cena, 1 PE para ouvir uma conversa útil.", "Int 3"),
    poder_geral(4, 67, "Uma Última Olhada", "Uma vez por cena, 2 PE na última rodada da investigação: o grupo ganha mais uma rodada."),
    poder_par(4, 67, "Sobrepor Imprevisível", "Energia", "Uma vez por rodada, no início, reação: rola 1d20 e soma (par) ou subtrai (ímpar) da iniciativa.", "Rola 2d20 e escolhe."),
    poder_par(4, 67, "Foco Gravitacional", "Energia", "2 PE: voo 9m até o fim do turno; cada uso extra na missão tem 10% cumulativos de falhar e cair (4d6).", "A chance cumulativa cai para 5%."),
    poder_par(4, 67, "Traço de Inconsistência", "Energia", "Reação e 2 PE: sua identidade some das imagens digitais capturadas naquele momento.", "Nunca aparece em imagens digitais e sua voz sai distorcida em gravações."),
    ritual(4, 68, "Backup", "Energia", 2, "completa", "curto", "veja texto", "1 dia", None,
           "Cria uma cópia de Energia sua num raio de 5km; reação para trocar de lugar com ela (perde 2d4 SAN). Dano na cópia dissipa.",
           "+3 PE: permanente e pode ver e ouvir pela cópia (3º círculo).", "+7 PE: também fala por ela, muda a aparência e pode explodir 6d6 ao trocar (4º círculo e afinidade)."),
    trilha(4, 69, E, "Granadeiro Blaster", 10, "Meus Bebês", "Treino em Profissão (químico) ou +5; começa a missão com explosivos autorais (um a mais por habilidade da trilha), uma categoria abaixo."),
    trilha(4, 69, E, "Granadeiro Blaster", 40, "O Calor do Momento", "Uma vez por cena, ação padrão e PE para improvisar um explosivo autoral; usa granadas 40mm como arremessáveis."),
    trilha(4, 70, E, "Granadeiro Blaster", 65, "Fogo Amigo", "Ganha Perito em Explosivos (ou melhora); áreas dos seus explosivos crescem +6m."),
    trilha(4, 70, E, "Granadeiro Blaster", 99, "Memória Muscular", "Saca explosivos autorais como ação livre, usa-os como movimento por 4 PE e eles causam o dobro de dados."),
    item(4, 70, "item_amaldicoado", "Granada Ctrl+C Ctrl+V", "Granada de 8d6 de Energia em 6m; a cada par num d4, explode de novo em outro ponto (até quatro vezes).", "II", 1, "Energia"),
    item(4, 70, "item", "Granada de Gás Lacrimogêneo", "Raio de 6m: 4d6 químico, enjoado e asfixiado (Fortitude reduz e evita o enjoo).", "I", 1, subtipo="Explosivo"),
    item(4, 70, "item", "Granada de Tinta", "Raio de 6m: alvos ficam vulneráveis e com –2d20 em Furtividade na cena (Reflexos evita).", "0", 1, subtipo="Explosivo"),
    item(4, 71, "arma", "Lançador de Granadas", "Arma de fogo pesada de duas mãos, alcance longo; dispara granadas 40mm (até 6 carregadas).", "II", 2, subtipo="Pesadas, À Distância – Duas Mãos", alcance="Longo"),
    item(4, 71, "modificacao", "Adesiva", "A granada gruda no alvo atingido, que falha nos testes contra ela.", subtipo="Granadas"),
    item(4, 71, "modificacao", "Dupla", "A granada ganha o efeito de outra granada de categoria igual ou menor.", subtipo="Granadas"),
    item(4, 71, "modificacao", "Programada", "Você define em quantos turnos a granada explode.", subtipo="Granadas"),
    item(4, 71, "municao", "Granada 40mm", "Granada para lançador; cada uma dura um disparo.", None, 1),
]

AS5 = [
    origem(5, 54, "Ufólogo", "Ciências e Ocultismo", "Minha Teoria Absurda",
           "Uma vez por cena de interlúdio, apresenta uma teoria ao grupo: ganha 1d4+1 PE temporários; se ela se provar certa no fim da missão, +1 PE máximo."),
    origem(5, 54, "Funcionário de Beira de Estrada", "Fortitude e Intuição", "Turno Invertido",
           "Uma vez por missão, recebe os benefícios de dormir no interlúdio sem dormir; +2 contra efeitos que deixam inconsciente."),
    uso(5, 55, "Tecnologia", "Rastrear Trilha Digital", "Veterano, 1d4+1 ações completas: refaz o trajeto de um aparelho eletrônico (DT 20 a 30 conforme o caminho)."),
    poder_classe(5, 55, C, "Aura de Confiança", "Aliados a até 18m ganham +5 em Iniciativa e contra presença perturbadora."),
    poder_classe(5, 55, C, "Fôlego de Emergência", "Uma vez por cena, machucado e com ameaça presente, movimento para recuperar 2d8+Vig PV ou 1d8+Vig PE."),
    poder_classe(5, 55, C, "Parede de Carne", "Aliados adjacentes recebem cobertura leve (+5 na Defesa).", "Vig 3 ou For 3"),
    poder_classe(5, 55, E, "Adepto do Escuro", "Ignora camuflagem por escuridão e ganha +5 em Investigação e Percepção na penumbra."),
    poder_classe(5, 55, E, "Saudosista Hi-Tech", "+5 em Tecnologia com aparelhos antigos e para consertar eletrônicos; ação extra na primeira rodada de hacking."),
    poder_classe(5, 55, E, "Treinado nas Telas", "1 PE: soma Intelecto em Iniciativa ou Reflexos."),
    poder_classe(5, 56, O, "Desafiar o Ego", "Uma vez por rodada, reação e 3 PE: inverte um bônus ou penalidade em dados que um ser em alcance curto recebeu."),
    poder_classe(5, 56, O, "Catálogo de Criaturas Ambulante", "Identifica criaturas como ação de movimento e até só por vestígios.", "Identificação Paranormal"),
    poder_classe(5, 56, O, "Meditação Ocultista", "Nova ação de interlúdio: recupera PE igual ao dobro do seu limite por turno (varia com a condição de meditação)."),
    poder_geral(5, 56, "Apaixonado por Veículos", "Treino em Pilotagem (ou +2) e +1 dado para proteger o veículo.", "Agi 2"),
    poder_geral(5, 56, "Ruído de Comunicação", "Uma vez por rodada, reação e 1 PE ao ver um aliado atacar: se acertar, soma sua Presença ao dano; se errar, recupera o PE.", "Pre 2"),
    poder_geral(5, 57, "Direção Defensiva", "Treino em Pilotagem (ou +2); dirigindo, todos no veículo ganham +2 na Defesa e nas resistências."),
    poder_par(5, 57, "Dead Man Switch", "Conhecimento", "Machucado, transmite a um aliado em alcance médio o seu grau de treinamento numa perícia, até se recuperar ou morrer.", "Até três alvos e uma perícia a mais; se morrer, dura até o fim da missão."),
    poder_par(5, 57, "Ácido Corrosivo", "Energia", "1 PE: na cena, +2 no ataque e +5 no dano desarmado (químico), ou numa arma que será destruída no fim da cena.", "+4 no ataque e +10 no dano.", "Energia 1"),
    poder_par(5, 57, "Paralinguística Ampliada", "Conhecimento", "+5 para decifrar linguagens do Outro Lado e aprende Compreensão Paranormal (ou ele custa 1 PE a menos).", "Bônus +10 e fica sempre sob Compreensão Paranormal verdadeira."),
    trilha(5, 58, O, "Criptologista do Oculto", 10, "Método Intuitivo", "Ganha Criar Selo e cria 2 selos por ação de interlúdio (+1 por habilidade da trilha)."),
    trilha(5, 58, O, "Criptologista do Oculto", 40, "Caligrafia Eficiente", "Seus selos ficam mais fáceis de usar (Ocultismo DT 10 + custo) e +5 para identificar rituais."),
    trilha(5, 58, O, "Criptologista do Oculto", 65, "Decifrar à Distância", "Usa selos em alcance curto só lendo mentalmente; +5 para decifrar sigilos."),
    trilha(5, 58, O, "Criptologista do Oculto", 99, "Selo Supremo", "Seus selos dispensam Ocultismo, têm DT +5, +3 dados de dano e formas avançadas de graça."),
]

AS6 = [
    origem(6, 66, "Cientista Ex-Panacea", "Atualidades e Ciências", "Existe uma Explicação", "2 PE: usa Ciências no lugar de Ocultismo."),
    origem(6, 66, "Cobaia Sobrevivente", "Fortitude e Vontade", "Forças para Enfrentar",
           "Cenas ligadas ao seu trauma o deixam abalado, mas 2 PE dão imunidade a medo até o fim da cena."),
    origem(6, 67, "Segurança Ex-Panacea", "Luta e Pontaria", "Técnicas de Contenção", "2 PE: +5 num teste de manobra de combate."),
    poder_classe(6, 67, C, "Análise Combativa", "+5 com Ciente das Cicatrizes e +2 contra ameaças já analisadas por ele.", "Ciente das Cicatrizes"),
    poder_classe(6, 67, C, "Especialista em Proteção Leve", "Com proteção leve, +2 na Defesa e em Reflexos."),
    poder_classe(6, 68, E, "Médico da Salvação", "Paramédico usa d12 e, uma vez por rodada, 3 PE para usá-lo como ação de movimento.", "Paramédico"),
    poder_classe(6, 68, E, "Doutor em Emergências", "Cicatrizantes e medicamentos aplicados por você curam +1d8; +5 em Medicina para tratar e o paciente ganha +10 contra a doença ou veneno.", "Especialista em Emergências"),
    poder_classe(6, 68, E, "Resgatar da Morte", "2 PE: sucesso automático em primeiros socorros (uma vez por cena por pessoa).", "Veterano em Medicina"),
    poder_classe(6, 68, E, "Farmacêutico de Campo", "No interlúdio, com kit de medicina, fabrica um cicatrizante ou medicamento pagando PE pela categoria.", "Treinado em Medicina e Profissão (químico)"),
    poder_classe(6, 68, E, "Veterano da Equipe de Trauma", "Equipe de Trauma remove até três condições.", "Paramédico, Equipe de Trauma"),
    poder_classe(6, 69, O, "Barreira do Oculto", "Ao conjurar ritual do elemento, paga PE para +2 de Defesa por PE por 1 rodada.", "Especialista em Elemento no elemento, NEX 30%"),
    poder_classe(6, 69, O, "Grão-Mestre em Elemento", "Ao conjurar ritual do elemento, 1 PE para um efeito extra num alvo (aliado é beneficiado, inimigo sofre uma condição), ignorando imunidades.",
                 "Mestre em Elemento no elemento, NEX 60%"),
    poder_geral(6, 70, "Muito Sorrateiro", "Começa cenas de furtividade com visibilidade reduzida em 1d4 e +3 em Furtividade.", "Sorrateiro"),
    poder_geral(6, 70, "Adaptação Climática", "+2 em Fortitude e sem dano por calor ou frio extremos.", "Vig 2"),
    poder_geral(6, 70, "Especialista em Armas Improvisadas", "Sem penalidade com armas improvisadas e +1 dado de dano com elas.", "For 2 ou Agi 2, treinado em Luta"),
    poder_par(6, 71, "Escudo Espiral Temporal", "Morte", "Uma vez por rodada, reação e 2 PE: RD 20 contra um projétil (que vira cinza) ou RD 10 contra uma arma corpo a corpo (que sofre 10 de dano). Não funciona contra Energia.",
              "Sem limite por rodada e a arma sofre 20.", "Morte 2"),
    poder_par(6, 71, "Grilhões de Lodo", "Morte", "2 PE: área de 9m por uma cena; quem está nela sofre 3d6 de Morte e fica lento (Fortitude reduz).", "6d6 e a condição vira enredado."),
    poder_par(6, 71, "Salto de Dados", "Energia", "Marca um símbolo (2 PE); depois, reação e 3 PE para voltar ao estado exato da marcação, perdendo a memória desse intervalo.", "O símbolo dura 1 ano.", "Energia 2"),
    ritual(6, 72, "Hesitação Forçada", "Conhecimento", 1, "padrão", "curto", "1 pessoa", "sustentada", "Vontade parcial",
           "A cada turno, se falhar em Vontade, o alvo rola de novo o maior dado dos testes dele. Dois sucessos seguidos encerram.",
           "+2 PE: qualquer ser, e quem falha não pode agir contra você (2º círculo).", "+5 PE: efeito inverso: o alvo fica superconfiante e se joga na frente dos aliados (3º círculo e afinidade)."),
    item(6, 73, "arma", "Lança-nitrogênio", "Arma de fogo pesada de duas mãos: linha de 1,5m em alcance curto, 6d6 de frio e enreda pelo gelo (Fortitude reduz para lento). Usa combustível.", "III", 2,
         subtipo="Pesadas, À Distância – Duas Mãos", dano="6d6", critico="x2", margem=20, multiplicador=2, tipo_dano="frio", alcance="Curto"),
    item(6, 73, "item_amaldicoado", "Anel Invertido", "Reação e 2 PE contra dano de um nidere: RD 4d10.", "II", 0.5, "Morte"),
    item(6, 73, "item", "Aplicador de Adrenalina", "Ação padrão: 2d8+2 PV temporários, +3m e +2 em testes físicos até o fim da cena; depois, fatigado.", "I", 1, subtipo="Medicamento"),
    item(6, 74, "modificacao", "Emulsificante Químico", "O medicamento ganha o efeito de outro de categoria igual ou menor.", subtipo="Medicamentos"),
    item(6, 74, "modificacao", "Potencializador Químico", "Melhora o medicamento: +5 no bônus, +2d8 de cura ou PV temporários, ou dois usos por cena.", subtipo="Medicamentos"),
    item(6, 75, "maldicao", "Aceleração Espiral", "Medicamento: 3 PE por uma ação padrão extra; Fortitude DT 20 ou perde 2d8 PV.", elemento="Morte", subtipo="Maldição para medicamentos"),
    item(6, 75, "maldicao", "Esforço Espiral", "Medicamento: recupera também 1d8+1 PE; Fortitude DT 20 ou envelhece 1 ano e fica frustrado.", elemento="Morte", subtipo="Maldição para medicamentos"),
    item(6, 76, "item", "Gás Neurotóxico", "Veneno de inalação, Fortitude DT 25: paralisado (se passar, imóvel).", "III", subtipo="Veneno"),
    item(6, 76, "item", "Batracotoxina", "Veneno de contato, Fortitude DT 25: exausto, paralisado e asfixiado (se passar, exausto).", "III", subtipo="Veneno"),
    item(6, 76, "item", "Ricina", "Veneno de inalação, Fortitude DT 25: perde 4d6 PV por rodada até ser curado (se passar, 2d6 por algumas rodadas).", "III", subtipo="Veneno"),
    item(6, 76, "item", "Cianeto de Potássio", "Veneno de ingestão, Fortitude DT 25: inconsciente e asfixiado (se passar, asfixiado).", "III", subtipo="Veneno"),
    item(6, 76, "item", "Toxina Cardiotóxica", "Veneno de ferimento, Fortitude DT 25: 0 PV e morrendo (se passar, perde metade dos PV).", "III", subtipo="Veneno"),
]

AS7 = [
    ritual(7, 76, "Vampirismo", "Sangue", 2, "completa", "toque", "1 pessoa", "cena", None,
           "Transforma um corpo numa refeição paranormal: quem come escolhe vasos sanguíneos para curar, rastrear, aprender uma perícia, ganhar ataque ou um ritual do alvo.",
           "+5 PE: versões mais fortes dos efeitos.", "+10 PE: efeitos máximos (4º círculo e afinidade)."),
    item(7, 79, "item", "Pé de Coelho", "Vestido: uma vez por cena, +1d4 em todos os testes; se o d4 sair ímpar, você machuca o pé (1d4 PV).", "I", 1, subtipo="Paranormal"),
    item(7, 79, "item", "Sal Dourado", "Linha ou círculo de sal que barra criaturas de Sangue de VD até 80 (Vontade DT 20).", "I", 1, subtipo="Paranormal"),
    item(7, 79, "item_amaldicoado", "Terço Maculado", "Vestido, herda a súplica de outra pessoa: +2d10 ao agir por ela; não sai do corpo e pune quem age contra a súplica.", "II", 1, "Sangue"),
    uso(7, 80, "Religião", "Resguardar Espírito", "Treinado, DT 20, ação completa: um breve rito dá +2 em Vontade até o fim da cena (você ou alguém adjacente)."),
    origem(7, 80, "Exorcizado", "Fortitude e Ocultismo", "O Que Restou",
           "RD 5 contra um elemento (exceto Medo), mas perde 2 SAN no primeiro contato com ele em cada cena."),
    origem(7, 80, "Sensitivo Rebelde", "Intuição e Vontade", "Sussurros e Vultos", "Perde 2 SAN para +5 em Diplomacia, Enganação, Intimidação ou Intuição."),
    trilha(7, 81, E, "Monstruoso (Especialista)", 10, "Ser Experimentado", "Escolhe um elemento e faz um experimento diário no próprio corpo: cura e ganha efeitos do elemento (tamanho, ações, perícias ou mobilidade), usando outro atributo para os PE. Penalidade social."),
    trilha(7, 82, E, "Monstruoso (Especialista)", 40, "Ser Testado", "Experimento mais forte: cura 2d8+2 e pode sacrificar pontos de um atributo para ampliar o efeito do elemento."),
    trilha(7, 83, E, "Monstruoso (Especialista)", 65, "Ser Expurgado", "Troca um braço por uma parte paranormal do elemento, com poderes próprios; Presença –1."),
    trilha(7, 84, E, "Monstruoso (Especialista)", 99, "Ser Apavorante", "Forma final do elemento: efeitos máximos, +1 no atributo e um ritual de 4º círculo; Presença –1."),
    trilha(7, 85, O, "Monstruoso (Ocultista)", 10, "Ser Escarificado", "Escarificação diária com componente do elemento: recupera PE e usa outro atributo para PE e DT dos rituais (+1 nele). Penalidade social."),
    trilha(7, 86, O, "Monstruoso (Ocultista)", 40, "Ser Perfurado", "Tatuagem Ritualística vale para os rituais do elemento marcados na pele; conjura um deles como reação em certas condições; +5 em concentração."),
    trilha(7, 87, O, "Monstruoso (Ocultista)", 65, "Ser Rasgado", "Efeito extra ao conjurar rituais do elemento e DT +2 neles; Presença –1."),
    trilha(7, 88, O, "Monstruoso (Ocultista)", 99, "Ser Mutilado", "Conjura rituais marcados sem fala, gestos nem componentes; +1 no atributo e aprende um ritual de 4º círculo do elemento e um de Medo."),
]

AS9 = [
    origem(9, 38, "Treinado pela Hell Hunters", "Luta e Fortitude, ou Pontaria e Reflexos", "Resistência do Treinamento",
           "Com Luta e Fortitude: +2 PV e +1 PV a cada 10% de NEX. Com Pontaria e Reflexos: +1 PE e +1 PE a cada 10% de NEX."),
    origem(9, 38, "Veterano de Conflito Armado", "Luta e Pontaria", "Full Metal Jacket", "2 PE: ignora as penalidades num teste de Luta ou Pontaria."),
    uso(9, 39, "Tática", "Analisar Perigo", "Treinado, DT 15, movimento, uma vez por cena: +2 em testes e na Defesa até o fim do próximo turno (+1 a cada 5 acima da DT)."),
    poder_classe(9, 39, C, "Tática de Abordagem", "Nova ação de interlúdio: planeja contra uma ameaça e ganha dados de tática (d6) para somar a testes, dano ou cura do grupo.", "Int 1, veterano em Tática"),
    poder_classe(9, 39, C, "Municiador Ambulante", "Nova ação de interlúdio: prepara pacotes de munição (1d6 por ponto de Int) que não ocupam espaço.", "Int 2"),
    poder_classe(9, 39, C, "Ripostar Ousado", "Reação e 2 PE contra um ataque corpo a corpo: +5 na Defesa e, se ele errar, +5 no contra-ataque.", "Agi 2, treinado em Luta"),
    poder_classe(9, 39, C, "Tiro Intuitivo", "Sem mirar, 2 PE: +2 na margem de ameaça do ataque à distância.", "Veterano em Pontaria"),
    trilha(9, 40, C, "Incursor", 10, "CQB", "Treino em Pontaria (ou Luta, ou +2 nas duas) e 1 PE anula a penalidade contra alvo em corpo a corpo."),
    trilha(9, 40, C, "Incursor", 40, "Entrada Explosiva", "+5 para usar explosivos e 1 PE para instalar mina ou carga como ação de movimento."),
    trilha(9, 40, C, "Incursor", 65, "Proteger Reféns", "Reação e 2 PE: recebe no lugar de um refém a até 3m o efeito negativo; mais 2 PE para reduzir o dano à metade."),
    trilha(9, 40, C, "Incursor", 99, "Alvo-prioritário", "Sabe o VD dos inimigos; 5 PE marca um alvo: com VD até 200, qualquer dano seu o zera; acima disso, +5 na margem."),
    trilha(9, 41, E, "Piloto de Drone", 10, "Companheiro Drone", "Recebe um drone de combate tático como aliado, do tipo escolhido."),
    trilha(9, 41, E, "Piloto de Drone", 40, "Protetor dos Drones", "Uma modificação grátis no drone e 3 PE para ele evitar um efeito negativo."),
    trilha(9, 42, E, "Piloto de Drone", 65, "Ás dos Drones", "Mais duas modificações e 3 PE para repetir um teste que falhou usando o drone."),
    trilha(9, 42, E, "Piloto de Drone", 99, "Mestre dos Drones", "Mais três modificações (ou um segundo drone) e proteger o drone custa só 1 PE."),
    item(9, 42, "item", "Aríete Portátil", "Duas mãos: +10 para arrombar.", "I", 2, subtipo="Operacional"),
    item(9, 43, "item", "Boroscópio Articulado", "Câmera num cabo de 3m com visão no escuro para olhar e investigar por frestas.", "I", 1, subtipo="Operacional"),
    item(9, 43, "protecao", "Capacete Tático", "Proteção pesada vestida: 25% de chance de ignorar dano extra de crítico ou ataque furtivo.", "II", 1),
    item(9, 43, "arma", "Designated Marksman Rifle (DMR)", "Fuzil tático de duas mãos; Ataque Furtivo até alcance médio e, se veterano em Pontaria, +5 na margem ao mirar.", "III", 3,
         subtipo="Táticas, Armas de Fogo – Duas Mãos", dano="2d10", critico="19/x3", margem=19, multiplicador=3, tipo_dano="balístico", alcance="Médio"),
    item(9, 44, "item", "Drone de Combate Tático", "Aliado drone (voo 12m, raio de 5km) de um tipo: Atirador, Espião, Hacker, Inteligente, Médico, Protetor ou Utilitário. Cada modificação soma outro tipo.", "III", 2, subtipo="Operacional"),
    item(9, 46, "protecao", "Escudo Balístico LED", "Escudo (proteção pesada): Defesa +2 e resistência balística 10; cobertura leve para quem está atrás; lanterna que ofusca.", "II", 2, defesa=2),
    item(9, 46, "arma", "Espingarda Serrada", "Arma de fogo tática de uma mão; metade do dano a partir de alcance médio. Usa cartuchos.", "I", 1,
         subtipo="Táticas, Armas de Fogo – Uma Mão", dano="3d6", critico="x3", margem=20, multiplicador=3, tipo_dano="balístico", alcance="Curto"),
    item(9, 47, "arma", "Lançador de Granadas Portátil", "Como o lançador de granadas, mas com uma granada por vez.", "II", 1, subtipo="Pesadas, À Distância – Uma Mão", alcance="Longo"),
    item(9, 47, "arma", "Machado Tático", "Arma tática ágil de uma mão, arremessável; +2 ao contra-atacar e pode ser sacrificado num bloqueio (2 PE) para +20 de RD.", "II", 1,
         subtipo="Táticas, Corpo a Corpo – Uma Mão", dano="1d8", critico="x3", margem=20, multiplicador=3, tipo_dano="corte", alcance="Curto"),
    item(9, 47, "arma", "Pistola Taser", "Arma de disparo de uma mão: 2d6 de eletricidade e atordoa 1 rodada (Fortitude evita, uma vez por cena por alvo). Usa dardos condutores.", "II", 1,
         subtipo="Táticas, Armas de Disparo – Uma Mão", dano="2d6", critico="x3", margem=20, multiplicador=3, tipo_dano="eletricidade", alcance="Curto"),
    item(9, 47, "municao", "Dardos condutores", "Munição da pistola taser.", "I", 1),
]

TODOS = AS1 + AS2 + AS3 + AS4 + AS5 + AS6 + AS7 + AS9
