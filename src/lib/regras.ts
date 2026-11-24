import { CONDICOES } from "./condicoes";
import type { Atributo, Ficha, Personagem, Variante } from "./tipos";

/** Ficha em uso: Âncora ativa => 50%, senão 99%. */
export function varianteAtiva(p: Pick<Personagem, "ancora_ativa">): Variante {
  return p.ancora_ativa ? "50" : "99";
}

export function fichaAtiva(p: Personagem, fichas: Ficha[]): Ficha | undefined {
  const v = varianteAtiva(p);
  return fichas.find((f) => f.personagem_id === p.id && f.variante === v);
}

export function pct(atual: number, max: number): number {
  if (!max || max <= 0) return 0;
  return Math.max(0, Math.min(100, (atual / max) * 100));
}

export type Alerta = "ok" | "baixo" | "zerado";

/** Destaque do Escudo: abaixo de 25% = baixo; 0 = zerado. */
export function alerta(atual: number, max: number): Alerta {
  if (atual <= 0) return "zerado";
  if (max > 0 && atual / max < 0.25) return "baixo";
  return "ok";
}

/**
 * Teste da Ordem Paranormal: rola d20 igual ao atributo e fica com o MAIOR;
 * com atributo 0 (ou menos), rola 2d20 e fica com o MENOR. Soma o bônus da perícia.
 */
export function expressaoTeste(valorAtributo: number, bonus: number): string {
  const dados = valorAtributo > 0 ? `${valorAtributo}d20kh1` : "2d20kl1";
  if (!bonus) return dados;
  return bonus > 0 ? `${dados}+${bonus}` : `${dados}${bonus}`;
}

export const ATRIBUTOS: Atributo[] = ["AGI", "FOR", "INT", "PRE", "VIG"];

export function descricaoPersonagem(p: Pick<Personagem, "classe" | "trilha" | "origem">): string {
  const classe = p.trilha ? `${p.classe ?? ""} (${p.trilha})` : p.classe;
  return [classe, p.origem && `origem ${p.origem}`].filter(Boolean).join(", ");
}

/** Condições comuns de Ordem Paranormal (sugestões; qualquer texto é aceito). */
export const CONDICOES_SUGERIDAS = CONDICOES.filter((c) => !c.automatica).map((c) => c.nome);

export const NOME_ATRIBUTO: Record<Atributo, string> = {
  AGI: "Agilidade", FOR: "Força", INT: "Intelecto", PRE: "Presença", VIG: "Vigor",
};
