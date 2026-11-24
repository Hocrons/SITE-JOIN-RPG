"use client";

import { useAoVivo } from "./aoVivo";

export interface Combate {
  id: string;
  mesa_id: string;
  nome: string;
  ativo: boolean;
  rodada: number;
  vez_id: string | null;
  criado_em: string;
}

export type TipoParticipante = "pj" | "npc" | "ameaca";

export interface Participante {
  id: string;
  combate_id: string;
  mesa_id: string;
  personagem_id: string | null;
  nome: string;
  tipo: TipoParticipante;
  iniciativa: number | null;
  iniciativa_dados: number;
  iniciativa_bonus: number;
  desempate: number;
  ordem: number;
  pv_atual: number | null;
  pv_max: number | null;
  defesa: number | null;
  condicoes: string[];
  anotacoes: string;
  pv_visivel: boolean;
  derrotado: boolean;
}

export interface ParticipantePublico {
  id: string;
  combate_id: string;
  mesa_id: string;
  personagem_id: string | null;
  nome: string;
  tipo: TipoParticipante;
  iniciativa: number | null;
  ordem: number;
  condicoes: string[];
  derrotado: boolean;
  pv_atual: number | null;
  pv_max: number | null;
}

export interface ModeloAmeaca {
  id: string;
  mesa_id: string;
  nome: string;
  tipo: "npc" | "ameaca";
  pv_max: number;
  defesa: number | null;
  iniciativa_dados: number;
  iniciativa_bonus: number;
  anotacoes: string;
}

type L<T> = T & Record<string, unknown>;

/** Ordem de turnos: posição manual (ordem), depois iniciativa, depois desempate. */
export function ordenarTurnos<T extends { ordem: number; iniciativa: number | null; desempate?: number; nome: string }>(l: T[]): T[] {
  return [...l].sort(
    (a, b) =>
      a.ordem - b.ordem ||
      (b.iniciativa ?? -999) - (a.iniciativa ?? -999) ||
      (b.desempate ?? 0) - (a.desempate ?? 0) ||
      a.nome.localeCompare(b.nome),
  );
}

/** Ordenação "de verdade" por iniciativa (usada pelo botão Ordenar). */
export function porIniciativa(l: Participante[]): Participante[] {
  return [...l].sort(
    (a, b) =>
      (b.iniciativa ?? -999) - (a.iniciativa ?? -999) ||
      b.desempate - a.desempate ||
      b.iniciativa_bonus - a.iniciativa_bonus ||
      a.nome.localeCompare(b.nome),
  );
}

/** Teste da Ordem: N d20 fica o maior; com 0 (ou menos), 2d20 fica o menor. */
export function rolarIniciativa(dados: number, bonus: number) {
  const n = dados > 0 ? dados : 2;
  const rolados = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 20));
  const escolhido = dados > 0 ? Math.max(...rolados) : Math.min(...rolados);
  return { total: escolhido + bonus, rolados, escolhido };
}

export function descreverIniciativa(dados: number, bonus: number) {
  const base = dados > 0 ? `${dados}d20` : "2d20 (menor)";
  return bonus ? `${base}${bonus > 0 ? "+" : ""}${bonus}` : base;
}

export function useCombateAtivo(mesaId: string | null | undefined) {
  const combates = useAoVivo<L<Combate>>("combates", mesaId, {
    chave: (c) => String(c.id),
    ordenar: (a, b) => b.criado_em.localeCompare(a.criado_em),
  });
  const ativo = combates.linhas.find((c) => c.ativo) ?? null;
  return { combates, ativo };
}

/** De quem é a vez no combate ativo (para destacar o token no tabuleiro). */
export function useVez(mesaId: string | null | undefined) {
  const { ativo } = useCombateAtivo(mesaId);
  const publico = useAoVivo<L<ParticipantePublico>>("participantes_publico", mesaId, { chave: (p) => String(p.id) });
  const vez = ativo?.vez_id ? (publico.linhas.find((p) => p.id === ativo.vez_id) ?? null) : null;
  return { combate: ativo, vez };
}

/** Acha o token de um participante: pela ficha ligada ou, sem ficha, pelo nome. */
export function tokenDaVez<T extends { id: string; personagem_id: string | null; nome: string }>(
  vez: { personagem_id: string | null; nome: string } | null,
  tokens: T[],
): T | null {
  if (!vez) return null;
  if (vez.personagem_id) {
    const t = tokens.find((x) => x.personagem_id === vez.personagem_id);
    if (t) return t;
  }
  const nome = vez.nome.trim().toLocaleLowerCase("pt-BR");
  return tokens.find((x) => x.nome.trim().toLocaleLowerCase("pt-BR") === nome) ?? null;
}
