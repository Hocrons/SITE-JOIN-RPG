"""Itens amaldiçoados (Livro de Regras, p. 144-151). Resumos com palavras próprias."""


def m(alvo, nome, elemento, resumo, pagina):
    return {"tipo": "maldicao", "nome": nome, "elemento": elemento, "subtipo": f"Maldição para {alvo}",
            "resumo": resumo, "fonte": f"Livro de Regras, p. {pagina}"}


def esp(nome, elemento, resumo, pagina, categoria="II", espacos=1):
    return {"tipo": "item_amaldicoado", "nome": nome, "elemento": elemento, "categoria": categoria, "espacos": espacos,
            "resumo": resumo, "fonte": f"Livro de Regras, p. {pagina}"}


MALDICOES = [
    # armas
    m("armas", "Antielemento", "Conhecimento", "Contra criaturas de um elemento, 2 PE por ataque: +4d8 de dano se acertar.", 145),
    m("armas", "Ritualística", "Conhecimento", "Guarda um ritual pago antes; ao acertar, descarrega no alvo como ação livre.", 145),
    m("armas", "Senciente", "Conhecimento", "Movimento e 2 PE: a arma flutua e ataca sozinha uma vez por rodada (1 PE por turno para manter).", 146),
    m("armas", "Lancinante", "Sangue", "+1d8 de dano de Sangue, multiplicado no crítico.", 146),
    m("armas", "Predadora", "Sangue", "Ignora camuflagem e cobertura parcial, aumenta o alcance e dobra a margem de ameaça.", 146),
    m("armas", "Sanguinária", "Sangue", "Deixa o alvo sangrando (acumula); no crítico, o alvo fica fraco e você ganha 2d10 PV temporários.", 146),
    m("armas", "Empuxo", "Energia", "Arma corpo a corpo pode ser arremessada com um dado extra de dano e volta para sua mão.", 146),
    m("armas", "Energética", "Energia", "2 PE por ataque: +5 no ataque, ignora resistência e o dano vira Energia.", 146),
    m("armas", "Vibrante", "Energia", "Concede Ataque Extra (ou reduz o custo dele em 1 PE).", 146),
    m("armas", "Consumidora", "Morte", "Alvos atingidos ficam lentos; 2 PE ao atacar deixam o alvo imóvel 1 rodada.", 146),
    m("armas", "Erosiva", "Morte", "+1d8 de Morte; 2 PE ao atacar causam 2d4 de Morte por duas rodadas.", 146),
    m("armas", "Repulsora", "Morte", "+2 de Defesa empunhada; ao bloquear, 2 PE dão +5 de Defesa.", 147),
    # proteções
    m("proteções", "Abascanta", "Conhecimento", "+5 contra rituais; uma vez por cena, reflete um ritual pagando o custo dele.", 146),
    m("proteções", "Profética", "Conhecimento", "Resistência a Conhecimento 10 e 2 PE para rolar de novo um teste de resistência.", 147),
    m("proteções", "Sombria", "Conhecimento", "+5 em Furtividade sem penalidade de carga; pode parecer roupa comum.", 147),
    m("proteções", "Cinética", "Energia", "+2 de Defesa e resistência a dano 2 (leve ou escudo) ou 5 (pesada).", 147),
    m("proteções", "Lépida", "Energia", "+10 em Atletismo e +3m de deslocamento; 2 PE para escalar, ignorar terreno difícil e quedas até 9m.", 147),
    m("proteções", "Voltaica", "Energia", "Resistência a Energia 10; 2 PE para causar 2d6 de Energia em quem estiver adjacente a cada turno.", 147),
    m("proteções", "Letárgica", "Morte", "+2 de Defesa e chance de ignorar dano extra de crítico e ataque furtivo.", 147),
    m("proteções", "Repulsiva", "Morte", "Resistência a Morte 10; 2 PE para que atacantes corpo a corpo sofram 2d8 de Morte.", 147),
    m("proteções", "Regenerativa", "Sangue", "Resistência a Sangue 10; movimento e 1 PE para curar 1d12 PV.", 147),
    m("proteções", "Sádica", "Sangue", "+1 em ataque e dano para cada 10 de dano sofrido desde seu último turno.", 147),
    # acessórios
    m("acessórios", "Carisma", "Conhecimento", "+1 em Presença (não dá PE).", 147),
    m("acessórios", "Conjuração", "Conhecimento", "Permite conjurar um ritual de 1º círculo (ou reduz o custo dele em 1 PE).", 147),
    m("acessórios", "Escudo Mental", "Conhecimento", "Resistência mental 10.", 147),
    m("acessórios", "Reflexão", "Conhecimento", "Uma vez por rodada, reflete um ritual pagando o custo dele.", 147),
    m("acessórios", "Sagacidade", "Conhecimento", "+1 em Intelecto (não dá perícias).", 147),
    m("acessórios", "Defesa", "Energia", "+5 de Defesa.", 147),
    m("acessórios", "Destreza", "Energia", "+1 em Agilidade.", 147),
    m("acessórios", "Potência", "Energia", "+1 na DT dos seus rituais e habilidades.", 147),
    m("acessórios", "Esforço Adicional", "Morte", "+5 PE após um dia de uso.", 147),
    m("acessórios", "Disposição", "Sangue", "+1 em Vigor.", 147),
    m("acessórios", "Pujança", "Sangue", "+1 em Força.", 147),
    m("acessórios", "Vitalidade", "Sangue", "+15 PV após um dia de uso.", 147),
    m("acessórios", "Proteção Elemental", "Varia", "Resistência 10 contra um elemento.", 147),
]

ESPECIAIS = [
    esp("Pérola de Sangue", "Sangue", "Absorver: +5 em testes de Agilidade, Força e Vigor na cena; depois, Fortitude DT 20 ou fadiga (ou pior).", 148),
    esp("Coração Pulsante", "Sangue", "Reação: reduz um dano à metade; Fortitude crescente a cada uso ou o coração é destruído.", 148),
    esp("Coroa de Espinhos", "Sangue", "Reação: transforma dano mental em dano de Sangue, mas impede recuperar Sanidade descansando.", 148),
    esp("Frasco de Vitalidade", "Sangue", "Guarda até 20 PV do seu próprio sangue para beber depois (pode enjoar).", 148),
    esp("Punhos Enraivecidos", "Sangue", "Desarmado causa 1d8 de Sangue; cada acerto permite outro ataque pagando PE crescente.", 149),
    esp("Seringa de Transfiguração", "Sangue", "Coleta sangue de alguém e dá a aparência dessa pessoa a outra por um dia.", 149),
    esp("Amarras Mortais", "Morte", "Ação padrão e 2 PE: agarrar em alcance curto com +10, e puxar o alvo para perto.", 149),
    esp("Casaco de Lodo", "Morte", "Resistência 5 a corte, impacto, Morte e perfuração, mas vulnerável a balístico e Energia.", 149),
    esp("Coletora", "Morte", "Punhal que mata quem está morrendo e guarda 1d8 PE (até 20) para você usar; causa pesadelos.", 149),
    esp("Crânio Espiral", "Morte", "Ação livre: uma ação padrão extra na rodada; Vontade crescente ou envelhece 1d4 anos.", 149),
    esp("Vislumbre do Fim", "Morte", "Óculos que mostram o tempo de vida de pessoas comuns, ou a pior resistência e as vulnerabilidades de criaturas.", 149),
    esp("Anéis do Elo Mental", "Conhecimento", "Dois usuários ficam ligados por telepatia e compartilham Vontade, dano mental e condições de medo.", 149),
    esp("Lanterna Reveladora", "Conhecimento", "1 PE: luz com os efeitos de Terceiro Olho por uma cena; atrai criaturas de Sangue.", 149),
    esp("Frasco de Lodo", "Morte", "Em ferida recente cura 6d8+20; em ferida antiga pode curar ou infeccionar. Uso único.", 149),
    esp("Máscara das Pessoas nas Sombras", "Conhecimento", "Resistência a Conhecimento 10 e 2 PE para viajar entre sombras em alcance médio.", 149),
    esp("Munição Jurada", "Conhecimento", "Bala vinculada a um ser: +10 no ataque, margem dobrada e +6d12; obsessão pelo alvo.", 150),
    esp("Pergaminho da Pertinácia", "Conhecimento", "Ação padrão: 5 PE temporários na cena; Ocultismo crescente ou se desfaz.", 150),
    esp("Arcabuz dos Moretti", "Energia", "Arma de fogo simples de uma mão, +2 no ataque, dano sorteado por 1d6 (de 2d4 a 2d20), sem munição.", 150),
    esp("Bateria Reversa", "Energia", "Descarrega ou recarrega aparelhos em alcance curto; pode explodir (12d6).", 150),
    esp("Peitoral da Segunda Chance", "Energia", "Ao chegar a 0 PV, gasta 5 PE e reanima com 4d10 PV; pequena chance de matar na hora.", 151),
    esp("Relógio de Arnaldo", "Energia", "1 PE (crescente no dia) para rolar de novo um dado com resultado 1.", 151),
    esp("Talismã da Sorte", "Energia", "Reação e 3 PE ao sofrer dano: 1d4 decide se evita o dano ou dobra.", 151),
    esp("Teclado de Conexão Neural", "Energia", "Liga sua mente ao computador: +10 para hackear e metade do tempo, mas 1d6 de dano mental por rodada.", 151),
    esp("Tela do Pesadelo", "Energia", "2 PE: quem tocar a tela vê uma ilusão aterradora (atordoado e 4d6 de dano mental até passar).", 151),
    esp("Veículo Energizado", "Energia", "Não precisa de combustível; o motorista pode atravessar um obstáculo com Pilotagem DT 25.", 151),
    esp("Jaqueta de Veríssimo", "Medo", "Resistência a dano paranormal 15; reação e 2 PE para receber o dano no lugar de um aliado. Item único.", 151, "IV"),
    esp("Dedo Decepado", "Varia", "Concede um poder paranormal do antigo dono; pode atrapalhar o descanso e chocar quem vê.", 151),
    esp("Selos Paranormais", "Varia", "Cada selo guarda um ritual que se conjura ao ler em voz alta; categoria igual ao círculo.", 151, None),
]

TODOS = MALDICOES + ESPECIAIS
