import type { Atributo } from "./tipos";

/**
 * Condições do Livro de Regras (Apêndice, p. 310–311), com texto resumido e os
 * efeitos que o site consegue aplicar sozinho na ficha.
 *
 * Penalidades em dados: "–1d" tira um d20 do teste (com 0 ou menos dados, rola 2d20 e fica com o pior).
 * Regra do livro: condições com o mesmo efeito não se acumulam (vale a mais severa).
 */

export type GrupoCondicao = "medo" | "mental" | "paralisia" | "sentidos" | "fadiga";

/** Onde a penalidade em dados vale. */
export type AlvoDados =
  | { tipo: "testes" }
  | { tipo: "pericias" }
  | { tipo: "ataque" }
  | { tipo: "ataque_cac" }
  | { tipo: "atributos"; atributos: Atributo[] }
  | { tipo: "pericias_de"; atributos: Atributo[] }
  | { tipo: "pericia"; nome: string };

export interface EfeitosCondicao {
  dados?: { alvo: AlvoDados; n: number }[];
  /** Penalidade na Defesa (vale a mais severa). */
  defesa?: number;
  /** Caído: Defesa contra corpo a corpo e contra ataques à distância. */
  defesaCaido?: boolean;
  deslocamento?: "metade" | "zero" | "1,5m";
  custoPE?: number;
  acoes?: "nenhuma" | "uma" | "mentais";
  falhaReflexos?: boolean;
  rd?: number;
}

export interface Condicao {
  nome: string;
  grupo?: GrupoCondicao;
  /** Uma linha, para etiquetas e avisos. */
  resumo: string;
  /** Explicação completa (em palavras nossas, fiel ao livro). */
  texto: string;
  /** Outras condições que esta já inclui. */
  inclui?: string[];
  /** Se receber de novo, vira esta. */
  agrava?: string;
  efeitos?: EfeitosCondicao;
  /** Vem sozinha do PV (o site mostra, não precisa marcar). */
  automatica?: boolean;
}

const FIS: Atributo[] = ["AGI", "FOR", "VIG"];
const MEN: Atributo[] = ["INT", "PRE"];

export const CONDICOES: Condicao[] = [
  {
    nome: "Abalado",
    grupo: "medo",
    resumo: "–1d em todos os testes.",
    texto: "Sofre –1d em todos os testes. Se ficar abalado de novo, fica apavorado no lugar.",
    agrava: "Apavorado",
    efeitos: { dados: [{ alvo: { tipo: "testes" }, n: 1 }] },
  },
  {
    nome: "Agarrado",
    grupo: "paralisia",
    resumo: "Desprevenido e imóvel; –1d em ataques e só ataca com arma leve.",
    texto:
      "Fica desprevenido e imóvel, sofre –1d em testes de ataque e só pode atacar com armas leves. Quem atira à distância num alvo envolvido no agarrão tem 50% de chance de acertar o alvo errado.",
    inclui: ["Desprevenido", "Imóvel"],
    efeitos: { dados: [{ alvo: { tipo: "ataque" }, n: 1 }] },
  },
  {
    nome: "Alquebrado",
    grupo: "mental",
    resumo: "Habilidades e rituais custam +1 PE.",
    texto: "O custo em PE das habilidades e dos rituais do personagem aumenta em +1.",
    efeitos: { custoPE: 1 },
  },
  {
    nome: "Apavorado",
    grupo: "medo",
    resumo: "–2d em perícias e precisa fugir da fonte do medo.",
    texto:
      "Sofre –2d em testes de perícia e deve fugir da fonte do medo do jeito mais eficiente possível. Pode parar quando a perder de vista ou estiver além de alcance médio. Se não puder fugir, age normalmente, mas não pode se aproximar da fonte por vontade própria.",
    efeitos: { dados: [{ alvo: { tipo: "pericias" }, n: 2 }] },
  },
  {
    nome: "Asfixiado",
    resumo: "Sem respirar: aguenta rodadas iguais ao Vigor, depois fica morrendo.",
    texto:
      "Não consegue respirar. Pode prender o fôlego por um total de rodadas igual ao Vigor; cada vez que sofre dano nesse estado, esse total cai 1. No fim do turno da última rodada, fica morrendo.",
  },
  {
    nome: "Atordoado",
    grupo: "mental",
    resumo: "Desprevenido e sem ações.",
    texto: "Fica desprevenido e não pode fazer ações.",
    inclui: ["Desprevenido"],
    efeitos: { acoes: "nenhuma" },
  },
  {
    nome: "Caído",
    resumo: "–2d em ataques corpo a corpo, anda 1,5m; –5 Defesa contra corpo a corpo, +5 contra distância.",
    texto:
      "Deitado no chão. Sofre –2d em ataques corpo a corpo e o deslocamento cai para 1,5m. Sofre –5 na Defesa contra ataques corpo a corpo, mas recebe +5 na Defesa contra ataques à distância.",
    efeitos: { dados: [{ alvo: { tipo: "ataque_cac" }, n: 2 }], deslocamento: "1,5m", defesaCaido: true },
  },
  {
    nome: "Cego",
    grupo: "sentidos",
    resumo: "Desprevenido e lento; –2d em perícias de Agilidade e Força.",
    texto:
      "Fica desprevenido e lento, não pode usar Percepção para observar e sofre –2d em perícias de Agilidade ou Força. Todos os alvos dos seus ataques têm camuflagem total. Escuridão total deixa cego quem não enxerga no escuro.",
    inclui: ["Desprevenido", "Lento"],
    efeitos: { dados: [{ alvo: { tipo: "pericias_de", atributos: ["AGI", "FOR"] }, n: 2 }] },
  },
  {
    nome: "Confuso",
    grupo: "mental",
    resumo: "Age ao acaso: rola 1d6 no início do turno.",
    texto:
      "Age de modo aleatório. No início de cada turno, role 1d6: 1) anda numa direção sorteada com 1d8; 2–3) não faz ações e fica balbuciando; 4–5) ataca o ser mais próximo com a arma que estiver empunhando (ou a si mesmo, se estiver sozinho: só role o dano); 6) a condição acaba e age normalmente.",
  },
  {
    nome: "Debilitado",
    resumo: "–2d em testes de Agilidade, Força e Vigor.",
    texto: "Sofre –2d em testes de Agilidade, Força e Vigor. Se ficar debilitado de novo, fica inconsciente no lugar.",
    agrava: "Inconsciente",
    efeitos: { dados: [{ alvo: { tipo: "atributos", atributos: FIS }, n: 2 }] },
  },
  {
    nome: "Desprevenido",
    resumo: "–5 na Defesa e –1d em Reflexos.",
    texto: "Despreparado para reagir: sofre –5 na Defesa e –1d em Reflexos. Você fica desprevenido contra inimigos que não consegue perceber.",
    efeitos: { defesa: 5, dados: [{ alvo: { tipo: "pericia", nome: "Reflexos" }, n: 1 }] },
  },
  {
    nome: "Doente",
    resumo: "Sob efeito de uma doença (veja a doença).",
    texto: "Sob efeito de uma doença. Os efeitos dependem da doença.",
  },
  {
    nome: "Em Chamas",
    resumo: "1d6 de dano de fogo no início de cada turno.",
    texto:
      "Pegando fogo: sofre 1d6 de dano de fogo no início de cada turno. Pode gastar uma ação padrão para apagar com as mãos; entrar na água também apaga.",
  },
  {
    nome: "Enjoado",
    resumo: "Só uma ação padrão ou de movimento por rodada.",
    texto: "Só pode fazer uma ação padrão ou uma de movimento por rodada (não as duas).",
    efeitos: { acoes: "uma" },
  },
  {
    nome: "Enlouquecendo",
    resumo: "SAN 0: se começar 3 turnos assim na cena, fica insano.",
    texto:
      "Com Sanidade 0. Se começar três turnos enlouquecendo na mesma cena (seguidos ou não), a mente sucumbe e o personagem fica insano: vira um NPC do mestre. Acaba com um teste de Diplomacia (DT 20) de alguém ou qualquer efeito que cure pelo menos 1 de Sanidade.",
    automatica: true,
  },
  {
    nome: "Enredado",
    grupo: "paralisia",
    resumo: "Lento e vulnerável; –1d em ataques.",
    texto: "Fica lento e vulnerável e sofre –1d em testes de ataque.",
    inclui: ["Lento", "Vulnerável"],
    efeitos: { dados: [{ alvo: { tipo: "ataque" }, n: 1 }] },
  },
  {
    nome: "Envenenado",
    resumo: "Efeito e duração dependem do veneno.",
    texto:
      "O efeito depende do veneno: pode ser outra condição (como fraco ou enjoado) ou dano a cada rodada (como 1d12 de veneno). Sem duração descrita, dura a cena. Dano recorrente de veneno sempre se acumula, mesmo de fontes iguais.",
  },
  {
    nome: "Esmorecido",
    grupo: "mental",
    resumo: "–2d em testes de Intelecto e Presença.",
    texto: "Sofre –2d em testes de Intelecto e Presença.",
    efeitos: { dados: [{ alvo: { tipo: "atributos", atributos: MEN }, n: 2 }] },
  },
  {
    nome: "Exausto",
    grupo: "fadiga",
    resumo: "Debilitado, lento e vulnerável.",
    texto: "Fica debilitado, lento e vulnerável. Se ficar exausto de novo, fica inconsciente no lugar.",
    inclui: ["Debilitado", "Lento", "Vulnerável"],
    agrava: "Inconsciente",
  },
  {
    nome: "Fascinado",
    grupo: "mental",
    resumo: "–2d em Percepção e só pode observar o que o fascinou.",
    texto:
      "Com a atenção presa em algo: sofre –2d em Percepção e não pode fazer ações, só observar o que o fascinou. Qualquer ação hostil contra ele acaba com a condição; sacudi-lo para tirá-lo desse estado gasta uma ação padrão.",
    efeitos: { dados: [{ alvo: { tipo: "pericia", nome: "Percepção" }, n: 2 }], acoes: "nenhuma" },
  },
  {
    nome: "Fatigado",
    grupo: "fadiga",
    resumo: "Fraco e vulnerável.",
    texto: "Fica fraco e vulnerável. Se ficar fatigado de novo, fica exausto no lugar.",
    inclui: ["Fraco", "Vulnerável"],
    agrava: "Exausto",
  },
  {
    nome: "Fraco",
    resumo: "–1d em testes de Agilidade, Força e Vigor.",
    texto: "Sofre –1d em testes de Agilidade, Força e Vigor. Se ficar fraco de novo, fica debilitado no lugar.",
    agrava: "Debilitado",
    efeitos: { dados: [{ alvo: { tipo: "atributos", atributos: FIS }, n: 1 }] },
  },
  {
    nome: "Frustrado",
    grupo: "mental",
    resumo: "–1d em testes de Intelecto e Presença.",
    texto: "Sofre –1d em testes de Intelecto e Presença. Se ficar frustrado de novo, fica esmorecido no lugar.",
    agrava: "Esmorecido",
    efeitos: { dados: [{ alvo: { tipo: "atributos", atributos: MEN }, n: 1 }] },
  },
  {
    nome: "Imóvel",
    grupo: "paralisia",
    resumo: "Deslocamento 0m.",
    texto: "Todas as formas de deslocamento caem para 0m.",
    efeitos: { deslocamento: "zero" },
  },
  {
    nome: "Inconsciente",
    resumo: "Indefeso e sem ações (nem reações).",
    texto: "Fica indefeso e não pode fazer ações, nem reações. Sacudir alguém para acordá-lo gasta uma ação padrão.",
    inclui: ["Indefeso"],
    efeitos: { acoes: "nenhuma" },
  },
  {
    nome: "Indefeso",
    resumo: "–10 na Defesa, falha em Reflexos e pode sofrer golpe de misericórdia.",
    texto: "Conta como desprevenido, mas sofre –10 na Defesa, falha automaticamente em Reflexos e pode sofrer golpes de misericórdia.",
    inclui: ["Desprevenido"],
    efeitos: { defesa: 10, falhaReflexos: true },
  },
  {
    nome: "Lento",
    grupo: "paralisia",
    resumo: "Deslocamento pela metade; não corre nem faz investida.",
    texto: "Todas as formas de deslocamento caem pela metade (arredonde para baixo, em passos de 1,5m) e não pode correr nem fazer investidas.",
    efeitos: { deslocamento: "metade" },
  },
  {
    nome: "Machucado",
    resumo: "Menos da metade dos PV.",
    texto: "O personagem tem menos da metade dos seus pontos de vida totais.",
    automatica: true,
  },
  {
    nome: "Morrendo",
    resumo: "0 PV: inconsciente; morre se passar mais de 3 rodadas assim na cena.",
    texto:
      "Com 0 pontos de vida. Fica inconsciente e, se terminar mais de três rodadas (seguidas ou não) morrendo na mesma cena, morre. Acaba quando volta a ter pelo menos 1 PV.",
    inclui: ["Inconsciente"],
    automatica: true,
  },
  {
    nome: "Ofuscado",
    grupo: "sentidos",
    resumo: "–1d em ataques e em Percepção.",
    texto: "Sofre –1d em testes de ataque e de Percepção.",
    efeitos: {
      dados: [
        { alvo: { tipo: "ataque" }, n: 1 },
        { alvo: { tipo: "pericia", nome: "Percepção" }, n: 1 },
      ],
    },
  },
  {
    nome: "Paralisado",
    grupo: "paralisia",
    resumo: "Imóvel e indefeso; só ações puramente mentais.",
    texto: "Fica imóvel e indefeso e só pode fazer ações puramente mentais.",
    inclui: ["Imóvel", "Indefeso"],
    efeitos: { acoes: "mentais" },
  },
  {
    nome: "Pasmo",
    grupo: "mental",
    resumo: "Sem ações.",
    texto: "Não pode fazer ações.",
    efeitos: { acoes: "nenhuma" },
  },
  {
    nome: "Perturbado",
    resumo: "Menos da metade da SAN; sem penalidade, mas conta para efeitos.",
    texto: "Com menos da metade da Sanidade total. Sozinha não dá penalidade, mas é pré-requisito de certas habilidades e efeitos.",
    automatica: true,
  },
  {
    nome: "Petrificado",
    resumo: "Inconsciente, com resistência a dano 10.",
    texto: "Fica inconsciente e recebe resistência a dano 10.",
    inclui: ["Inconsciente"],
    efeitos: { rd: 10 },
  },
  {
    nome: "Sangrando",
    resumo: "Vigor DT 20 no início do turno; falhou, perde 1d6 PV.",
    texto: "Com um ferimento aberto. No início de cada turno, faz um teste de Vigor (DT 20): se passar, estabiliza e a condição acaba; se falhar, perde 1d6 PV e continua sangrando.",
  },
  {
    nome: "Surdo",
    grupo: "sentidos",
    resumo: "–2d em Iniciativa e não ouve; condição ruim para rituais.",
    texto: "Não pode usar Percepção para ouvir e sofre –2d em Iniciativa. Também conta como condição ruim para conjurar rituais.",
    efeitos: { dados: [{ alvo: { tipo: "pericia", nome: "Iniciativa" }, n: 2 }] },
  },
  {
    nome: "Surpreendido",
    resumo: "Desprevenido e sem ações.",
    texto: "Não percebeu os inimigos: fica desprevenido e não pode fazer ações.",
    inclui: ["Desprevenido"],
    efeitos: { acoes: "nenhuma" },
  },
  {
    nome: "Vulnerável",
    resumo: "–5 na Defesa.",
    texto: "Sofre –5 na Defesa.",
    efeitos: { defesa: 5 },
  },
];

export const NOME_GRUPO: Record<GrupoCondicao, string> = {
  medo: "medo",
  mental: "mental",
  paralisia: "paralisia",
  sentidos: "sentidos",
  fadiga: "fadiga",
};

export const REGRA_GERAL =
  "Várias condições ao mesmo tempo: aplique todas. Efeitos iguais não se somam; vale o mais severo (desprevenido e vulnerável dão –5 na Defesa, não –10). Salvo indicação, as condições acabam no fim da cena.";

const sem = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
const POR_NOME = new Map(CONDICOES.map((c) => [sem(c.nome), c]));
export function condicao(nome: string): Condicao | undefined {
  return POR_NOME.get(sem(nome));
}

/**
 * Pôr uma condição numa lista, seguindo o livro: se já tem e ela agrava
 * (abalado → apavorado, fraco → debilitado…), troca pela mais grave.
 */
export function aplicarCondicao(lista: string[], nova: string): { lista: string[]; aviso?: string; aplicada: string } {
  const c = condicao(nova);
  const nome = c?.nome ?? nova.charAt(0).toUpperCase() + nova.slice(1);
  const ja = lista.some((x) => sem(x) === sem(nome));
  if (ja && c?.agrava) {
    const pior = c.agrava;
    const resto = lista.filter((x) => sem(x) !== sem(nome) && sem(x) !== sem(pior));
    return { lista: [...resto, pior], aviso: `${nome} de novo vira ${pior}.`, aplicada: pior };
  }
  if (ja) return { lista, aplicada: nome };
  return { lista: [...lista, nome], aplicada: nome };
}

export interface Penalidade {
  n: number;
  de: string[];
}

export interface EstadoCondicoes {
  /** Todas as condições em efeito (marcadas + as que elas incluem + automáticas), com a origem. */
  ativas: { nome: string; via?: string; automatica?: boolean }[];
  defesa: { penalidade: number; de: string[] } | null;
  caido: boolean;
  deslocamento: { tipo: "metade" | "zero" | "1,5m"; de: string } | null;
  custoPE: number;
  acoes: { tipo: "nenhuma" | "uma" | "mentais"; de: string } | null;
  falhaReflexos: boolean;
  rd: number;
  /** Penalidade em dados de um teste. */
  dados: (t: { atributo: Atributo | null; pericia?: string | null; ataque?: boolean; corpoACorpo?: boolean }) => Penalidade;
}

/** Junta as condições marcadas (e as automáticas pelo PV/SAN) num efeito só para a ficha. */
export function resolverCondicoes(
  marcadas: string[],
  status?: { pv: number; pvMax: number; san?: number; sanMax?: number },
): EstadoCondicoes {
  const ativas: EstadoCondicoes["ativas"] = [];
  const vistos = new Set<string>();
  const incluir = (nome: string, via?: string, automatica?: boolean) => {
    const c = condicao(nome);
    const n = c?.nome ?? nome;
    if (vistos.has(sem(n))) return;
    vistos.add(sem(n));
    ativas.push({ nome: n, via, automatica });
    for (const i of c?.inclui ?? []) incluir(i, via ?? n);
  };
  for (const m of marcadas) incluir(m);
  if (status && status.pvMax > 0) {
    if (status.pv <= 0) incluir("Morrendo", undefined, true);
    else if (status.pv < status.pvMax / 2) incluir("Machucado", undefined, true);
  }
  if (status?.sanMax && status.san != null) {
    if (status.san <= 0) incluir("Enlouquecendo", undefined, true);
    else if (status.san < status.sanMax / 2) incluir("Perturbado", undefined, true);
  }

  let defesa: EstadoCondicoes["defesa"] = null;
  let deslocamento: EstadoCondicoes["deslocamento"] = null;
  let acoes: EstadoCondicoes["acoes"] = null;
  let custoPE = 0;
  let falhaReflexos = false;
  let rd = 0;
  let caido = false;
  const regrasDados: { alvo: AlvoDados; n: number; de: string }[] = [];
  const gravDesl = { "1,5m": 1, metade: 1, zero: 3 } as const;
  const gravAcoes = { uma: 1, mentais: 2, nenhuma: 3 } as const;

  for (const a of ativas) {
    const e = condicao(a.nome)?.efeitos;
    if (!e) continue;
    // quem explica o efeito: a condição marcada (agarrado), não a incluída (imóvel)
    const origem = a.via ?? a.nome;
    if (e.defesa) {
      if (!defesa || e.defesa > defesa.penalidade) defesa = { penalidade: e.defesa, de: [origem] };
      else if (e.defesa === defesa.penalidade && !defesa.de.includes(origem)) defesa.de.push(origem);
    }
    if (e.defesaCaido) caido = true;
    if (e.deslocamento && (!deslocamento || gravDesl[e.deslocamento] > gravDesl[deslocamento.tipo])) deslocamento = { tipo: e.deslocamento, de: origem };
    if (e.acoes && (!acoes || gravAcoes[e.acoes] > gravAcoes[acoes.tipo])) acoes = { tipo: e.acoes, de: origem };
    if (e.custoPE) custoPE = Math.max(custoPE, e.custoPE);
    if (e.falhaReflexos) falhaReflexos = true;
    if (e.rd) rd = Math.max(rd, e.rd);
    for (const d of e.dados ?? []) regrasDados.push({ ...d, de: origem });
  }

  const dados: EstadoCondicoes["dados"] = (t) => {
    const per = t.pericia ? sem(t.pericia) : null;
    // efeito igual (mesmo alvo) não acumula: guarda o mais severo de cada alvo
    const porAlvo = new Map<string, { n: number; de: string[] }>();
    for (const r of regrasDados) {
      const vale =
        r.alvo.tipo === "testes" ||
        (r.alvo.tipo === "pericias" && !!t.pericia) ||
        (r.alvo.tipo === "ataque" && !!t.ataque) ||
        (r.alvo.tipo === "ataque_cac" && !!t.ataque && !!t.corpoACorpo) ||
        (r.alvo.tipo === "atributos" && !!t.atributo && r.alvo.atributos.includes(t.atributo)) ||
        (r.alvo.tipo === "pericias_de" && !!t.pericia && !!t.atributo && r.alvo.atributos.includes(t.atributo)) ||
        (r.alvo.tipo === "pericia" && per === sem(r.alvo.nome));
      if (!vale) continue;
      const chave = JSON.stringify(r.alvo);
      const atual = porAlvo.get(chave);
      if (!atual || r.n > atual.n) porAlvo.set(chave, { n: r.n, de: [r.de] });
      else if (r.n === atual.n && !atual.de.includes(r.de)) atual.de.push(r.de);
    }
    let n = 0;
    const de: string[] = [];
    for (const v of porAlvo.values()) {
      n += v.n;
      for (const x of v.de) if (!de.includes(x)) de.push(x);
    }
    return { n, de };
  };

  return { ativas, defesa, caido, deslocamento, custoPE, acoes, falhaReflexos, rd, dados };
}

/** Deslocamento com as condições ("9m" + lento → "4,5m"). Devolve null se não der para calcular. */
export function deslocamentoComCondicoes(base: string | null | undefined, d: EstadoCondicoes["deslocamento"]): string | null {
  if (!d) return null;
  if (d.tipo === "zero") return "0m";
  const m = Number(String(base ?? "").replace(",", ".").match(/[\d.]+/)?.[0]);
  if (d.tipo === "1,5m") return Number.isFinite(m) && m < 1.5 ? `${fmt(m)}m` : "1,5m";
  if (!Number.isFinite(m)) return null;
  const metade = Math.floor(m / 2 / 1.5) * 1.5;
  return `${fmt(metade)}m`;
}
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Dados que sobram depois da penalidade (0 ou menos = 2d20, fica com o pior). */
export function dadosComPenalidade(atributo: number, penalidade: number) {
  return atributo - penalidade;
}

/** Estado das condições de um personagem, com as automáticas pelo PV/SAN da ficha em uso. */
export function condicoesDoPersonagem(
  p: { condicoes: string[]; pv_atual: number; san_atual: number; usa_determinacao?: boolean | null },
  f: { pv_max: number; san_max: number } | undefined,
) {
  return resolverCondicoes(p.condicoes ?? [], {
    pv: p.pv_atual,
    pvMax: f?.pv_max ?? 0,
    ...(p.usa_determinacao ? {} : { san: p.san_atual, sanMax: f?.san_max ?? 0 }),
  });
}

/** "–1d (Fraco, Abalado)" */
export function textoPenalidade(pen: Penalidade) {
  return pen.n ? `–${pen.n}d (${pen.de.join(", ")})` : "";
}
