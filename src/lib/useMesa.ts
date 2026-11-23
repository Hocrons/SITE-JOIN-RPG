"use client";

import { useCallback } from "react";
import { useAoVivo } from "./aoVivo";
import { supabase } from "./supabase";
import type {
  CampoStatus, Ficha, FichaDetalhes, GrupoAncora, LogAlteracao, Personagem, PersonagemPrivado,
  PersonagemPublico, Variante,
} from "./tipos";

type L<T> = T & Record<string, unknown>;

/**
 * Todos os dados ao vivo de uma mesa que o usuário pode ver.
 * O banco filtra: jogador recebe só o próprio personagem completo; mestre recebe tudo.
 */
export function useMesa(mesaId: string | null | undefined, eMestre: boolean) {
  const personagens = useAoVivo<L<Personagem>>("personagens", mesaId, {
    chave: (p) => String(p.id),
    ordenar: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  });
  const fichas = useAoVivo<L<Ficha>>("fichas", mesaId, {
    chave: (f) => `${f.personagem_id}:${f.variante}`,
  });
  const detalhes = useAoVivo<L<FichaDetalhes>>("fichas_detalhes", mesaId, {
    chave: (f) => `${f.personagem_id}:${f.variante}`,
  });
  const privados = useAoVivo<L<PersonagemPrivado>>("personagens_privado", mesaId, {
    chave: (p) => String(p.personagem_id),
  });
  const publico = useAoVivo<L<PersonagemPublico>>("personagens_publico", mesaId, {
    chave: (p) => String(p.id),
    ordenar: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  });
  const log = useAoVivo<L<LogAlteracao>>("log_alteracoes", mesaId, {
    chave: (l) => String(l.id),
    ordenar: (a, b) => b.id - a.id,
    ativo: eMestre,
  });
  const grupos = useAoVivo<L<GrupoAncora>>("grupos_ancora", mesaId, {
    chave: (g) => String(g.id),
    ordenar: (a, b) => a.nome.localeCompare(b.nome),
    ativo: eMestre,
  });

  const { setLinhas: setPersonagens, recarregar: recarregarPersonagens } = personagens;

  /** +/- atômico no servidor; mostra na hora (o servidor confirma com o teto aplicado). */
  const ajustar = useCallback(
    async (p: Personagem, campo: CampoStatus, delta: number) => {
      setPersonagens((l) =>
        l.map((x) => {
          if (x.id !== p.id) return x;
          if (campo === "pv_atual" && delta < 0 && x.pv_temp > 0) {
            const sobra = x.pv_temp + delta;
            return { ...x, pv_temp: Math.max(0, sobra), pv_atual: Math.max(0, x.pv_atual + Math.min(0, sobra)) };
          }
          return { ...x, [campo]: Math.max(0, ((x[campo] as number) ?? 0) + delta) };
        }),
      );
      const { error } = await supabase().rpc("ajustar_status", { p_personagem: p.id, p_campo: campo, p_delta: delta });
      if (error) {
        alert(error.message);
        recarregarPersonagens();
      }
    },
    [setPersonagens, recarregarPersonagens],
  );

  const atualizarPersonagem = useCallback(
    async (id: string, patch: Partial<Personagem>) => {
      setPersonagens((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      const { error } = await supabase().from("personagens").update(patch).eq("id", id);
      if (error) {
        alert(error.message);
        recarregarPersonagens();
      }
    },
    [setPersonagens, recarregarPersonagens],
  );

  const atualizarFicha = useCallback(async (id: string, variante: Variante, patch: Partial<Ficha>) => {
    const { error } = await supabase().from("fichas").update(patch).eq("personagem_id", id).eq("variante", variante);
    if (error) throw error;
  }, []);

  const atualizarDetalhes = useCallback(
    async (id: string, variante: Variante, patch: Partial<FichaDetalhes>) => {
      const { error } = await supabase()
        .from("fichas_detalhes")
        .update(patch)
        .eq("personagem_id", id)
        .eq("variante", variante);
      if (error) throw error;
    },
    [],
  );

  const salvarNotas = useCallback(async (id: string, anotacoes: string) => {
    const { error } = await supabase().from("personagens_privado").update({ anotacoes }).eq("personagem_id", id);
    if (error) throw error;
  }, []);

  return {
    personagens, fichas, detalhes, privados, publico, log, grupos,
    ajustar, atualizarPersonagem, atualizarFicha, atualizarDetalhes, salvarNotas,
  };
}

export type DadosMesa = ReturnType<typeof useMesa>;
