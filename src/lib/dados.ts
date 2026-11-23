"use client";

import { expressaoTeste } from "./regras";
import { supabase } from "./supabase";
import type { Atributo, Rolagem } from "./tipos";

export type TipoPreset = "teste" | "arma" | "dano" | "livre";

export interface Preset {
  id: string;
  mesa_id: string;
  personagem_id: string | null;
  titulo: string;
  tipo: TipoPreset;
  expressao: string;
  atributo: Atributo | null;
  bonus: number;
  margem: number;
  multiplicador: number;
  ordem: number;
}

const RE_EXPRESSAO = /^[+-]?(\d*d\d+(k[hl]\d+)?|\d+)([+-](\d*d\d+(k[hl]\d+)?|\d+))*$/;

/** Mesma validação do servidor (aceita espaços e maiúsculas). */
export function expressaoValida(e: string): boolean {
  return RE_EXPRESSAO.test(e.toLowerCase().replace(/\s/g, ""));
}

export interface PedidoRolagem {
  mesaId: string;
  expressao: string;
  titulo?: string | null;
  personagemId?: string | null;
  secreta?: boolean;
  margem?: number;
  multiplicador?: number;
  critico?: boolean;
}

/** Rola no servidor (o sorteio acontece no banco, então ninguém trapaceia). */
export async function rolar(p: PedidoRolagem): Promise<Rolagem> {
  const { data, error } = await supabase().rpc("rolar", {
    p_mesa: p.mesaId,
    p_expressao: p.expressao,
    p_titulo: p.titulo ?? null,
    p_personagem: p.personagemId ?? null,
    p_secreta: p.secreta ?? false,
    p_margem: p.margem ?? 20,
    p_multiplicador: p.multiplicador ?? 2,
    p_critico: p.critico ?? false,
  });
  if (error) throw new Error(error.message);
  return data as Rolagem;
}

/** Expressão de teste da Ordem a partir do atributo atual (respeita a ficha ativa). */
export function expressaoDoTeste(atributos: Partial<Record<Atributo, number>> | undefined, a: Atributo, bonus: number) {
  return expressaoTeste(atributos?.[a] ?? 0, bonus);
}

export function descreverPreset(p: Preset): string {
  const bonus = p.bonus ? (p.bonus > 0 ? ` +${p.bonus}` : ` ${p.bonus}`) : "";
  const margem = p.margem && p.margem < 20 ? `, crítico ${p.margem}` : "";
  switch (p.tipo) {
    case "teste":
      return `Teste de ${p.atributo ?? "?"}${bonus}${margem}`;
    case "arma":
      return `Ataque ${p.atributo ?? "?"}${bonus}${margem}; dano ${p.expressao} ×${p.multiplicador}`;
    case "dano":
      return `Dano ${p.expressao}, crítico ×${p.multiplicador}`;
    default:
      return p.expressao;
  }
}
