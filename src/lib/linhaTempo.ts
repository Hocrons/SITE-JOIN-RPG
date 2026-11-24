"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAoVivo } from "./aoVivo";
import { supabase } from "./supabase";
import type { Visibilidade } from "./tipos";

export interface Evento {
  id: string;
  mesa_id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  data_rotulo: string;
  era: string;
  aproximada: boolean;
  sessao: string;
  imagem_caminho: string | null;
  visibilidade: Visibilidade;
  atualizado_em: string;
}

interface Revelado {
  evento_id: string;
  personagem_id: string;
  mesa_id: string;
}
interface Vinculo {
  evento_id: string;
  entrada_id: string;
  mesa_id: string;
}

type L<T> = T & Record<string, unknown>;

/**
 * Linha do tempo da mesa. O banco entrega a cada um só os eventos que pode ver.
 * Como na lore, esconder algo avisa os jogadores por broadcast para recarregarem.
 */
export function useLinhaTempo(mesaId: string | null | undefined, eMestre: boolean) {
  const eventos = useAoVivo<L<Evento>>("eventos", mesaId, {
    chave: (e) => String(e.id),
    ordenar: (a, b) => Number(a.ordem) - Number(b.ordem) || a.titulo.localeCompare(b.titulo),
  });
  const revelados = useAoVivo<L<Revelado>>("eventos_revelados", mesaId, {
    chave: (r) => `${r.evento_id}:${r.personagem_id}`,
    ativo: eMestre,
  });
  const vinculos = useAoVivo<L<Vinculo>>("eventos_entradas", mesaId, {
    chave: (v) => `${v.evento_id}:${v.entrada_id}`,
  });

  const recarregar = useRef<() => void>(() => {});
  recarregar.current = () => {
    eventos.recarregar();
    vinculos.recarregar();
    if (eMestre) revelados.recarregar();
  };
  const canal = useRef<ReturnType<ReturnType<typeof supabase>["channel"]> | null>(null);
  useEffect(() => {
    if (!mesaId) return;
    const sb = supabase();
    const c = sb
      .channel(`aviso-linha-${mesaId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "linha" }, () => recarregar.current())
      .subscribe();
    canal.current = c;
    const aoVoltar = () => document.visibilityState === "visible" && recarregar.current();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      sb.removeChannel(c);
      canal.current = null;
    };
  }, [mesaId]);
  const avisar = useCallback(() => canal.current?.send({ type: "broadcast", event: "linha", payload: {} }), []);

  const quemVe = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of revelados.linhas) m.set(r.evento_id, [...(m.get(r.evento_id) ?? []), r.personagem_id]);
    return m;
  }, [revelados.linhas]);

  async function erro(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    if (error) {
      alert(error.message);
      return false;
    }
    return true;
  }

  async function criar(dados: Partial<Evento>) {
    const ultima = eventos.linhas.reduce((m, e) => Math.max(m, Number(e.ordem)), 0);
    const { data, error } = await supabase()
      .from("eventos")
      .insert({ mesa_id: mesaId, titulo: "Novo evento", ordem: ultima + 10, visibilidade: "mestre", ...dados })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return null;
    }
    eventos.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as L<Evento>]));
    return data as Evento;
  }

  async function salvar(id: string, patch: Partial<Evento>) {
    eventos.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const ok = await erro(supabase().from("eventos").update(patch).eq("id", id));
    if (ok) avisar();
    return ok;
  }

  async function excluir(ev: Evento) {
    if (ev.imagem_caminho) await supabase().storage.from("midia").remove([ev.imagem_caminho]);
    if (await erro(supabase().from("eventos").delete().eq("id", ev.id))) {
      eventos.setLinhas((l) => l.filter((x) => x.id !== ev.id));
      avisar();
    }
  }

  async function definirVisibilidade(id: string, vis: Visibilidade, personagens: string[] = []) {
    const ok = await erro(supabase().rpc("evento_visibilidade", { p_id: id, p_visibilidade: vis, p_personagens: personagens }));
    if (ok) {
      eventos.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, visibilidade: vis } : x)));
      revelados.recarregar();
      avisar();
    }
    return ok;
  }

  /** Move um evento para antes/depois do vizinho (troca as posições). */
  async function mover(id: string, dir: -1 | 1) {
    const lista = eventos.linhas;
    const i = lista.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= lista.length) return;
    const a = lista[i];
    const b = lista[j];
    let oa = Number(b.ordem);
    const ob = Number(a.ordem);
    if (oa === ob) oa = ob + dir; // mesma posição: desempata
    eventos.setLinhas((l) => l.map((x) => (x.id === a.id ? { ...x, ordem: oa } : x.id === b.id ? { ...x, ordem: ob } : x)));
    await Promise.all([
      supabase().from("eventos").update({ ordem: oa }).eq("id", a.id),
      supabase().from("eventos").update({ ordem: ob }).eq("id", b.id),
    ]);
    avisar();
  }

  async function vincular(eventoId: string, entradaId: string) {
    const { error } = await supabase().from("eventos_entradas").insert({ evento_id: eventoId, entrada_id: entradaId });
    if (error && !/duplicate/i.test(error.message)) return alert(error.message);
    vinculos.setLinhas((l) =>
      l.some((v) => v.evento_id === eventoId && v.entrada_id === entradaId)
        ? l
        : [...l, { evento_id: eventoId, entrada_id: entradaId, mesa_id: mesaId! } as L<Vinculo>],
    );
    avisar();
  }

  async function desvincular(eventoId: string, entradaId: string) {
    if (await erro(supabase().from("eventos_entradas").delete().eq("evento_id", eventoId).eq("entrada_id", entradaId))) {
      vinculos.setLinhas((l) => l.filter((v) => !(v.evento_id === eventoId && v.entrada_id === entradaId)));
      avisar();
    }
  }

  async function enviarImagem(ev: Evento, arquivo: File) {
    if (arquivo.size > 8 * 1024 * 1024) return alert("A imagem precisa ter até 8 MB.");
    const ext = (arquivo.name.split(".").pop() || "jpg").toLowerCase();
    const caminho = `linha/${mesaId}/${ev.id}/${Date.now()}.${ext}`;
    const { error } = await supabase().storage.from("midia").upload(caminho, arquivo);
    if (error) return alert(`Não foi possível enviar a imagem: ${error.message}`);
    if (ev.imagem_caminho) await supabase().storage.from("midia").remove([ev.imagem_caminho]);
    await salvar(ev.id, { imagem_caminho: caminho });
  }

  async function tirarImagem(ev: Evento) {
    if (ev.imagem_caminho) await supabase().storage.from("midia").remove([ev.imagem_caminho]);
    await salvar(ev.id, { imagem_caminho: null });
  }

  return {
    eventos: eventos.linhas,
    vinculos: vinculos.linhas,
    quemVe,
    status: eventos.status,
    criar,
    salvar,
    excluir,
    definirVisibilidade,
    mover,
    vincular,
    desvincular,
    enviarImagem,
    tirarImagem,
  };
}

export type DadosLinha = ReturnType<typeof useLinhaTempo>;
