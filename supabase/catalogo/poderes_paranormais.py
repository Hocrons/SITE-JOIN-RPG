"""Poderes paranormais (Livro de Regras, p. 114-116). Resumos com palavras próprias."""


def poder(nome, elemento, resumo, afinidade, pre=None, pagina=115):
    return {
        "tipo": "poder_paranormal", "nome": nome, "elemento": elemento, "resumo": resumo,
        "afinidade": afinidade, "prerequisitos": pre, "fonte": f"Livro de Regras, p. {pagina}",
    }


TODOS = [
    poder("Aprender Ritual", "Varia", "Aprende um ritual de 1º círculo (2º a partir de NEX 45%, 3º a partir de 75%) e pode trocar um ritual conhecido. Pode ser escolhido várias vezes; conta como poder do elemento do ritual.", None, pagina=114),
    poder("Resistir a (Elemento)", "Varia", "Resistência 10 contra Conhecimento, Energia, Morte ou Sangue (à escolha).", "Resistência sobe para 20.", pagina=114),
    # Conhecimento
    poder("Expansão de Conhecimento", "Conhecimento", "Aprende um poder de outra classe (cumprindo os pré-requisitos dele).", "Aprende um segundo poder de outra classe.", "Conhecimento 1"),
    poder("Percepção Paranormal", "Conhecimento", "Ao procurar pistas, pode rolar de novo um dado abaixo de 10 (fica com o novo resultado).", "Pode rolar de novo até dois dados.", None),
    poder("Precognição", "Conhecimento", "+2 em Defesa e nos testes de resistência.", "Imune a desprevenido.", "Conhecimento 1"),
    poder("Sensitivo", "Conhecimento", "+5 em Diplomacia, Intimidação e Intuição.", "Em testes opostos com essas perícias, o oponente sofre –1 dado.", None),
    poder("Visão do Oculto", "Conhecimento", "+5 em Percepção e visão no escuro.", "Ignora camuflagem.", None),
    # Energia
    poder("Afortunado", "Energia", "Uma vez por rolagem, rola de novo um 1 em dado que não seja d20.", "Também uma vez por teste, rola de novo um 1 no d20.", None),
    poder("Campo Protetor", "Energia", "Ao se esquivar, pode gastar 1 PE para ganhar +5 em Defesa.", "Também +5 em Reflexos; passar num Reflexos de meio dano anula o dano todo até seu próximo turno.", "Energia 1"),
    poder("Causalidade Fortuita", "Energia", "Na investigação, a DT para achar pistas cai 5 até você encontrar uma.", "A redução de 5 vale sempre.", None),
    poder("Golpe de Sorte", "Energia", "+1 na margem de ameaça dos seus ataques.", "+1 no multiplicador de crítico.", "Energia 1"),
    poder("Manipular Entropia", "Energia", "2 PE: um alvo em alcance curto (não você) rola de novo um dado de um teste de perícia.", "O alvo rola de novo todos os dados que você escolher.", "Energia 1"),
    # Morte
    poder("Encarar a Morte", "Morte", "Em cenas de ação, limite de gasto de PE +1 (não muda a DT).", "O aumento vira +3 no total.", None),
    poder("Escapar da Morte", "Morte", "Uma vez por cena, dano que o levaria a 0 PV o deixa com 1 PV (exceto dano massivo).", "Evita o dano por completo; com dano massivo fica com 1 PV.", "Morte 1"),
    poder("Potencial Aprimorado", "Morte", "+1 PE por NEX, acompanhando os próximos aumentos.", "+2 PE por NEX no total.", None),
    poder("Potencial Reaproveitado", "Morte", "Uma vez por rodada, ao passar num teste de resistência, ganha 2 PE temporários (somem no fim da cena).", "Ganha 3 PE temporários.", None),
    poder("Surto Temporal", "Morte", "Uma vez por cena, no seu turno, 3 PE para uma ação padrão extra.", "Pode usar uma vez por turno.", "Morte 2"),
    # Sangue
    poder("Anatomia Insana", "Sangue", "50% de chance (par em 1d4) de ignorar o dano extra de crítico ou ataque furtivo.", "Imune a críticos e ataques furtivos.", "Sangue 2", 116),
    poder("Arma de Sangue", "Sangue", "Movimento e 2 PE: cria uma arma natural (1d6 de Sangue) até o fim da cena; ao agredir, 1 PE por um ataque extra com ela.", "A arma fica permanente e causa 1d10.", None, 116),
    poder("Sangue de Ferro", "Sangue", "+2 PV por NEX, acompanhando os próximos aumentos.", "+5 em Fortitude e imunidade a venenos e doenças.", None, 116),
    poder("Sangue Fervente", "Sangue", "Enquanto machucado, +1 em Agilidade ou Força (escolhe a cada vez).", "O bônus sobe para +2.", "Sangue 2", 116),
    poder("Sangue Vivo", "Sangue", "Na primeira vez machucado na cena, ganha cura acelerada 2 (até metade dos PV máximos).", "Cura acelerada 5.", "Sangue 1", 116),
]
