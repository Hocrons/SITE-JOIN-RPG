"use client";

import { useAoVivo } from "./aoVivo";
import { normalizar } from "./lore";
import { supabase } from "./supabase";

export interface NotaPessoal {
  id: string;
  mesa_id: string;
  personagem_id: string;
  titulo: string;
  texto: string;
  tags: string[];
  fixada: boolean;
  criado_em: string;
  atualizado_em: string;
}

type L<T> = T & Record<string, unknown>;

const RE_LINK = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/** Títulos citados com [[...]] num texto (normalizados, sem repetir). */
export function linksDe(texto: string): string[] {
  return [...new Set([...texto.matchAll(RE_LINK)].map((m) => normalizar(m[1].trim())))];
}

/** Troca [[Antigo]] (e [[Antigo|apelido]]) por [[Novo]] num texto. */
export function renomearLinks(texto: string, antigo: string, novo: string) {
  const alvo = normalizar(antigo.trim());
  return texto.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, (todo, t: string, apelido?: string) =>
    normalizar(t.trim()) === alvo ? `[[${novo}${apelido ?? ""}]]` : todo,
  );
}

/** Caderno de um personagem, ao vivo. Só o dono e o mestre recebem estas linhas do banco. */
export function useCaderno(mesaId: string | null | undefined, personagemId: string | null | undefined) {
  const todas = useAoVivo<L<NotaPessoal>>("notas_pessoais", personagemId ? mesaId : null, {
    chave: (n) => String(n.id),
    ordenar: (a, b) => Number(b.fixada) - Number(a.fixada) || b.atualizado_em.localeCompare(a.atualizado_em),
  });
  const notas = todas.linhas.filter((n) => n.personagem_id === personagemId);

  async function criar(titulo: string, texto = "") {
    const t = titulo.trim().slice(0, 120);
    const existente = notas.find((n) => normalizar(n.titulo) === normalizar(t));
    if (existente) return existente;
    const { data, error } = await supabase()
      .from("notas_pessoais")
      .insert({ personagem_id: personagemId, titulo: t, texto })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return null;
    }
    todas.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [data as L<NotaPessoal>, ...l]));
    return data as NotaPessoal;
  }

  async function salvar(id: string, patch: Partial<NotaPessoal>) {
    todas.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...patch, atualizado_em: new Date().toISOString() } : x)));
    const { error } = await supabase().from("notas_pessoais").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  }

  /** Renomeia e corrige os [[links]] das outras notas, como o Obsidian faz. */
  async function renomear(nota: NotaPessoal, novo: string) {
    const t = novo.trim().slice(0, 120);
    if (!t || t === nota.titulo) return true;
    if (notas.some((n) => n.id !== nota.id && normalizar(n.titulo) === normalizar(t))) {
      alert(`Já existe uma nota chamada “${t}”.`);
      return false;
    }
    try {
      await salvar(nota.id, { titulo: t });
      const afetadas = notas.filter((n) => n.id !== nota.id && linksDe(n.texto).includes(normalizar(nota.titulo)));
      await Promise.all(afetadas.map((n) => salvar(n.id, { texto: renomearLinks(n.texto, nota.titulo, t) })));
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível renomear.");
      return false;
    }
  }

  async function excluir(id: string) {
    const { error } = await supabase().from("notas_pessoais").delete().eq("id", id);
    if (error) return alert(error.message);
    todas.setLinhas((l) => l.filter((x) => x.id !== id));
  }

  return { notas, status: todas.status, criar, salvar, renomear, excluir };
}
