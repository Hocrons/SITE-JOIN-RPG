"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAoVivo } from "./aoVivo";
import { supabase } from "./supabase";
import type { Visibilidade } from "./tipos";

export type TipoLore = "personagem" | "faccao" | "local" | "reliquia" | "evento" | "segredo" | "nota";
export type StatusLore = "decidido" | "proposto" | "aberto";

export interface EntradaLore {
  id: string;
  mesa_id: string;
  tipo: TipoLore;
  titulo: string;
  resumo: string;
  texto: string;
  tags: string[];
  status: StatusLore;
  visibilidade: Visibilidade;
  criado_em: string;
  atualizado_em: string;
}

export interface ConexaoLore {
  id: string;
  mesa_id: string;
  origem_id: string;
  destino_id: string;
  rotulo: string;
  visibilidade: Visibilidade;
}

export interface ImagemLore {
  id: string;
  mesa_id: string;
  entrada_id: string;
  caminho: string;
  legenda: string;
  ordem: number;
}

interface Revelada {
  personagem_id: string;
  mesa_id: string;
  entrada_id?: string;
  conexao_id?: string;
}

interface NotaMestre {
  entrada_id: string;
  mesa_id: string;
  texto: string;
}

type L<T> = T & Record<string, unknown>;

/** Cores e nomes dos tipos. A cor é usada no grafo e nos marcadores da lista. */
export const TIPOS_LORE: { id: TipoLore; nome: string; plural: string; cor: string }[] = [
  { id: "personagem", nome: "Personagem", plural: "Personagens", cor: "#5b82cc" },
  { id: "faccao", nome: "Facção", plural: "Facções", cor: "#d9a033" },
  { id: "local", nome: "Local", plural: "Locais", cor: "#5fae9b" },
  { id: "reliquia", nome: "Relíquia", plural: "Relíquias", cor: "#c0392f" },
  { id: "evento", nome: "Evento", plural: "Eventos", cor: "#c98b5a" },
  { id: "segredo", nome: "Segredo", plural: "Segredos", cor: "#9a7cc4" },
  { id: "nota", nome: "Nota", plural: "Notas", cor: "#a99a7c" },
];
export const TIPO = Object.fromEntries(TIPOS_LORE.map((t) => [t.id, t])) as Record<TipoLore, (typeof TIPOS_LORE)[number]>;

export const STATUS_LORE: { id: StatusLore; nome: string; marca: string }[] = [
  { id: "decidido", nome: "Decidido", marca: "✓" },
  { id: "proposto", nome: "Proposto", marca: "~" },
  { id: "aberto", nome: "Em aberto", marca: "?" },
];

export const NOME_VISIBILIDADE: Record<Visibilidade, string> = {
  mestre: "Só o mestre",
  todos: "Todos",
  especificos: "Alguns jogadores",
};

/** Tira as marcas de planejamento do mestre (✅ 🟡 ❓) do texto que os jogadores leem. */
export function limparParaJogador(texto: string) {
  return texto.replace(/(✅|🟡|❓|🟢|🔴|⚫)️?\s?/g, "");
}

export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Toda a lore de uma mesa, sincronizada. O banco entrega a cada um só o que pode ver.
 * Esconder algo não gera evento para o jogador, então o mestre manda um aviso
 * por broadcast e todo mundo recarrega.
 */
export function useLore(mesaId: string | null | undefined, eMestre: boolean) {
  const porId = { chave: (x: Partial<{ id: string }>) => String(x.id) };
  const entradas = useAoVivo<L<EntradaLore>>("lore_entradas", mesaId, {
    ...porId,
    ordenar: (a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"),
  });
  const conexoes = useAoVivo<L<ConexaoLore>>("lore_conexoes", mesaId, porId);
  const imagens = useAoVivo<L<ImagemLore>>("lore_imagens", mesaId, {
    ...porId,
    ordenar: (a, b) => a.ordem - b.ordem,
  });
  const revEntradas = useAoVivo<L<Revelada>>("lore_entradas_reveladas", mesaId, {
    chave: (r) => `${r.entrada_id}:${r.personagem_id}`,
    ativo: eMestre,
  });
  const revConexoes = useAoVivo<L<Revelada>>("lore_conexoes_reveladas", mesaId, {
    chave: (r) => `${r.conexao_id}:${r.personagem_id}`,
    ativo: eMestre,
  });
  const notas = useAoVivo<L<NotaMestre>>("lore_notas_mestre", mesaId, {
    chave: (n) => String(n.entrada_id),
    ativo: eMestre,
  });

  const recarregarTudo = useRef<() => void>(() => {});
  recarregarTudo.current = () => {
    entradas.recarregar();
    conexoes.recarregar();
    imagens.recarregar();
    if (eMestre) {
      revEntradas.recarregar();
      revConexoes.recarregar();
    }
  };

  const canalRef = useRef<ReturnType<ReturnType<typeof supabase>["channel"]> | null>(null);
  useEffect(() => {
    if (!mesaId) return;
    const sb = supabase();
    const canal = sb
      .channel(`aviso-lore-${mesaId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "lore" }, () => recarregarTudo.current())
      .subscribe();
    canalRef.current = canal;
    const aoVoltar = () => document.visibilityState === "visible" && recarregarTudo.current();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      sb.removeChannel(canal);
      canalRef.current = null;
    };
  }, [mesaId]);

  const avisar = useCallback(() => {
    canalRef.current?.send({ type: "broadcast", event: "lore", payload: {} });
  }, []);

  const quemVeEntrada = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of revEntradas.linhas) m.set(r.entrada_id!, [...(m.get(r.entrada_id!) ?? []), r.personagem_id]);
    return m;
  }, [revEntradas.linhas]);
  const quemVeConexao = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of revConexoes.linhas) m.set(r.conexao_id!, [...(m.get(r.conexao_id!) ?? []), r.personagem_id]);
    return m;
  }, [revConexoes.linhas]);

  // ------------------------------------------------------------------ ações do mestre
  async function erro(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    if (error) {
      alert(error.message);
      return false;
    }
    return true;
  }

  async function criarEntrada(dados: Partial<EntradaLore>) {
    const { data, error } = await supabase()
      .from("lore_entradas")
      .insert({ mesa_id: mesaId, titulo: "Nova entrada", tipo: "nota", status: "aberto", ...dados })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return null;
    }
    entradas.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as L<EntradaLore>]));
    return data as EntradaLore;
  }

  async function salvarEntrada(id: string, patch: Partial<EntradaLore>) {
    entradas.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    return erro(supabase().from("lore_entradas").update(patch).eq("id", id));
  }

  async function excluirEntrada(id: string) {
    const caminhos = imagens.linhas.filter((i) => i.entrada_id === id).map((i) => i.caminho);
    if (caminhos.length) await supabase().storage.from("midia").remove(caminhos);
    const ok = await erro(supabase().from("lore_entradas").delete().eq("id", id));
    if (ok) {
      entradas.setLinhas((l) => l.filter((x) => x.id !== id));
      conexoes.setLinhas((l) => l.filter((c) => c.origem_id !== id && c.destino_id !== id));
      avisar();
    }
    return ok;
  }

  async function definirVisibilidade(tipo: "entrada" | "conexao", id: string, vis: Visibilidade, personagens: string[] = []) {
    const ok = await erro(
      supabase().rpc("lore_visibilidade", { p_tipo: tipo, p_id: id, p_visibilidade: vis, p_personagens: personagens }),
    );
    if (ok) {
      if (tipo === "entrada") entradas.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, visibilidade: vis } : x)));
      else conexoes.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, visibilidade: vis } : x)));
      revEntradas.recarregar();
      revConexoes.recarregar();
      avisar();
    }
    return ok;
  }

  async function criarConexao(origem: string, destino: string, rotulo: string, visibilidade: Visibilidade = "mestre") {
    const { data, error } = await supabase()
      .from("lore_conexoes")
      .insert({ mesa_id: mesaId, origem_id: origem, destino_id: destino, rotulo, visibilidade })
      .select()
      .single();
    if (error) return alert(error.message);
    conexoes.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as L<ConexaoLore>]));
    if (visibilidade !== "mestre") avisar();
  }

  async function salvarConexao(id: string, patch: Partial<ConexaoLore>) {
    conexoes.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    return erro(supabase().from("lore_conexoes").update(patch).eq("id", id));
  }

  async function excluirConexao(id: string) {
    if (await erro(supabase().from("lore_conexoes").delete().eq("id", id))) {
      conexoes.setLinhas((l) => l.filter((x) => x.id !== id));
      avisar();
    }
  }

  async function salvarNota(entradaId: string, texto: string) {
    notas.setLinhas((l) =>
      l.some((n) => n.entrada_id === entradaId)
        ? l.map((n) => (n.entrada_id === entradaId ? { ...n, texto } : n))
        : [...l, { entrada_id: entradaId, mesa_id: mesaId!, texto } as L<NotaMestre>],
    );
    return erro(
      supabase().from("lore_notas_mestre").upsert({ entrada_id: entradaId, mesa_id: mesaId, texto }, { onConflict: "entrada_id" }),
    );
  }

  async function enviarImagem(entradaId: string, arquivo: File) {
    if (arquivo.size > 8 * 1024 * 1024) return alert("A imagem precisa ter até 8 MB.");
    const ext = (arquivo.name.split(".").pop() || "jpg").toLowerCase();
    const caminho = `lore/${mesaId}/${entradaId}/${Date.now()}.${ext}`;
    const { error } = await supabase().storage.from("midia").upload(caminho, arquivo);
    if (error) return alert(`Não foi possível enviar a imagem: ${error.message}`);
    const ordem = imagens.linhas.filter((i) => i.entrada_id === entradaId).length;
    const { data, error: e2 } = await supabase()
      .from("lore_imagens")
      .insert({ mesa_id: mesaId, entrada_id: entradaId, caminho, legenda: "", ordem })
      .select()
      .single();
    if (e2) return alert(e2.message);
    imagens.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as L<ImagemLore>]));
  }

  async function excluirImagem(img: ImagemLore) {
    await supabase().storage.from("midia").remove([img.caminho]);
    if (await erro(supabase().from("lore_imagens").delete().eq("id", img.id)))
      imagens.setLinhas((l) => l.filter((x) => x.id !== img.id));
  }

  async function legendarImagem(id: string, legenda: string) {
    imagens.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, legenda } : x)));
    return erro(supabase().from("lore_imagens").update({ legenda }).eq("id", id));
  }

  return {
    entradas: entradas.linhas,
    conexoes: conexoes.linhas,
    imagens: imagens.linhas,
    notas: notas.linhas,
    status: entradas.status,
    quemVeEntrada,
    quemVeConexao,
    criarEntrada,
    salvarEntrada,
    excluirEntrada,
    definirVisibilidade,
    criarConexao,
    salvarConexao,
    excluirConexao,
    salvarNota,
    enviarImagem,
    excluirImagem,
    legendarImagem,
  };
}

export type DadosLore = ReturnType<typeof useLore>;

// ------------------------------------------------------------------ importação de markdown

export interface EntradaImportada {
  titulo: string;
  resumo: string;
  texto: string;
  status: StatusLore;
  tags: string[];
}

/**
 * Divide um markdown colado em entradas: cada título (#, ## ou ###, o nível escolhido) vira uma entrada.
 * ✅ 🟡 ❓ no título definem o status. Uma linha "Tags: a, b" vira tags.
 */
export function importarMarkdown(md: string, nivel: 1 | 2 | 3 = 2): EntradaImportada[] {
  const linhas = md.replace(/\r/g, "").split("\n");
  const cabecalho = new RegExp(`^#{1,${nivel}}\\s+(.+)$`);
  const blocos: { titulo: string; corpo: string[] }[] = [];
  for (const l of linhas) {
    const m = l.match(cabecalho);
    if (m) blocos.push({ titulo: m[1].trim(), corpo: [] });
    else if (blocos.length) blocos[blocos.length - 1].corpo.push(l);
  }
  return blocos
    .map(({ titulo, corpo }) => {
      let status: StatusLore = "aberto";
      if (/✅/.test(titulo)) status = "decidido";
      else if (/🟡/.test(titulo)) status = "proposto";
      const tituloLimpo = titulo.replace(/(✅|🟡|❓|\*\*|__)/g, "").trim();
      let tags: string[] = [];
      const corpoSemTags = corpo.filter((l) => {
        const t = l.match(/^\s*tags?\s*:\s*(.+)$/i);
        if (t) tags = t[1].split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
        return !t;
      });
      const texto = corpoSemTags.join("\n").replace(/^\s*---\s*$/gm, "").trim();
      const primeiro = texto.split(/\n\s*\n/)[0]?.replace(/^[-*>\s]+/, "").replace(/[*_`]/g, "").trim() ?? "";
      const resumo = primeiro.length > 160 ? primeiro.slice(0, 157).trimEnd() + "…" : primeiro;
      return { titulo: tituloLimpo, resumo, texto, status, tags };
    })
    .filter((e) => e.titulo);
}
