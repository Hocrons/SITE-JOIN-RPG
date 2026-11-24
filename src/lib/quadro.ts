"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAoVivo } from "./aoVivo";
import { supabase } from "./supabase";

export type TipoArquivo = "imagem" | "pdf" | "texto";

export interface ArquivoMesa {
  id: string;
  mesa_id: string;
  titulo: string;
  tipo: TipoArquivo;
  caminho: string | null;
  texto: string;
  enviado_por: string | null;
  criado_em: string;
}

export interface Cartao {
  id: string;
  mesa_id: string;
  tipo: "arquivo" | "nota";
  arquivo_id: string | null;
  texto: string;
  cor: string;
  x: number;
  y: number;
  largura: number;
  criado_por: string | null;
  autor: string | null;
  atualizado_em: string;
}

export interface Ligacao {
  id: string;
  mesa_id: string;
  origem_id: string;
  destino_id: string;
  rotulo: string;
}

type L<T> = T & Record<string, unknown>;

/** Cores das notas: papéis envelhecidos, não neon. */
export const CORES_NOTA: { id: string; nome: string; fundo: string; borda: string }[] = [
  { id: "papel", nome: "Papel", fundo: "#f6ecd2", borda: "#c9b07a" },
  { id: "amarelo", nome: "Amarelo", fundo: "#f2dc8c", borda: "#c9a53e" },
  { id: "rosa", nome: "Rosa", fundo: "#efc6bd", borda: "#c58b7f" },
  { id: "azul", nome: "Azul", fundo: "#c9d7e8", borda: "#7f98b8" },
  { id: "verde", nome: "Verde", fundo: "#cfdfbf", borda: "#8fa877" },
];
export const COR = Object.fromEntries(CORES_NOTA.map((c) => [c.id, c]));

/**
 * O quadro da mesa, ao vivo. Enquanto alguém arrasta um cartão, a posição vai por broadcast
 * (rápido, sem gravar); ao soltar, grava no banco.
 */
export function useQuadro(mesaId: string | null | undefined) {
  const porId = { chave: (x: Partial<{ id: string }>) => String(x.id) };
  const arquivos = useAoVivo<L<ArquivoMesa>>("arquivos_mesa", mesaId, {
    ...porId,
    ordenar: (a, b) => b.criado_em.localeCompare(a.criado_em),
  });
  const cartoes = useAoVivo<L<Cartao>>("quadro_cartoes", mesaId, porId);
  const ligacoes = useAoVivo<L<Ligacao>>("quadro_ligacoes", mesaId, porId);

  // posições "ao vivo" de quem está arrastando agora (de outros aparelhos)
  const [aoVivo, setAoVivo] = useState<Record<string, { x: number; y: number }>>({});
  const canal = useRef<ReturnType<ReturnType<typeof supabase>["channel"]> | null>(null);
  const ultimoEnvio = useRef(0);

  useEffect(() => {
    if (!mesaId) return;
    const sb = supabase();
    const c = sb
      .channel(`quadro-${mesaId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "mover" }, ({ payload }) => {
        const p = payload as { id: string; x: number; y: number };
        setAoVivo((m) => ({ ...m, [p.id]: { x: p.x, y: p.y } }));
      })
      .subscribe();
    canal.current = c;
    return () => {
      sb.removeChannel(c);
      canal.current = null;
    };
  }, [mesaId]);

  // quando a posição gravada chega pelo banco, a posição ao vivo daquele cartão sai
  useEffect(() => {
    setAoVivo((m) => {
      let mudou = false;
      const n = { ...m };
      for (const c of cartoes.linhas) {
        const v = n[c.id];
        if (v && Math.abs(v.x - c.x) < 1 && Math.abs(v.y - c.y) < 1) {
          delete n[c.id];
          mudou = true;
        }
      }
      return mudou ? n : m;
    });
  }, [cartoes.linhas]);

  const moverAoVivo = useCallback((id: string, x: number, y: number) => {
    const agora = performance.now();
    if (agora - ultimoEnvio.current < 60) return;
    ultimoEnvio.current = agora;
    canal.current?.send({ type: "broadcast", event: "mover", payload: { id, x, y } });
  }, []);

  async function erro(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    if (error) {
      alert(error.message);
      return false;
    }
    return true;
  }

  async function criarCartao(dados: Partial<Cartao>) {
    const { data, error } = await supabase()
      .from("quadro_cartoes")
      .insert({ mesa_id: mesaId, tipo: "nota", ...dados })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return null;
    }
    cartoes.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as L<Cartao>]));
    return data as Cartao;
  }

  async function salvarCartao(id: string, patch: Partial<Cartao>) {
    cartoes.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    return erro(supabase().from("quadro_cartoes").update(patch).eq("id", id));
  }

  async function moverCartao(id: string, x: number, y: number) {
    canal.current?.send({ type: "broadcast", event: "mover", payload: { id, x, y } });
    return salvarCartao(id, { x: Math.round(x), y: Math.round(y) });
  }

  async function tirarCartao(id: string) {
    if (await erro(supabase().from("quadro_cartoes").delete().eq("id", id))) {
      cartoes.setLinhas((l) => l.filter((x) => x.id !== id));
      ligacoes.setLinhas((l) => l.filter((x) => x.origem_id !== id && x.destino_id !== id));
    }
  }

  async function ligar(origem: string, destino: string) {
    if (origem === destino) return;
    const ja = ligacoes.linhas.find(
      (l) => (l.origem_id === origem && l.destino_id === destino) || (l.origem_id === destino && l.destino_id === origem),
    );
    if (ja) return;
    const { data, error } = await supabase()
      .from("quadro_ligacoes")
      .insert({ mesa_id: mesaId, origem_id: origem, destino_id: destino })
      .select()
      .single();
    if (error) return alert(error.message);
    ligacoes.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as L<Ligacao>]));
  }

  async function rotularLigacao(id: string, rotulo: string) {
    ligacoes.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, rotulo } : x)));
    return erro(supabase().from("quadro_ligacoes").update({ rotulo }).eq("id", id));
  }

  async function desligar(id: string) {
    if (await erro(supabase().from("quadro_ligacoes").delete().eq("id", id)))
      ligacoes.setLinhas((l) => l.filter((x) => x.id !== id));
  }

  // ------------------------------------------------------------------ arquivos (mestre)
  async function enviarArquivo(arquivo: File, titulo: string) {
    if (arquivo.size > 20 * 1024 * 1024) {
      alert("O arquivo precisa ter até 20 MB.");
      return null;
    }
    const pdf = arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name);
    const imagem = arquivo.type.startsWith("image/");
    if (!pdf && !imagem) {
      alert("Envie uma imagem ou um PDF. Para texto, use “Novo texto”.");
      return null;
    }
    const id = crypto.randomUUID();
    const ext = (arquivo.name.split(".").pop() || (pdf ? "pdf" : "jpg")).toLowerCase();
    const caminho = `quadro/${mesaId}/${id}.${ext}`;
    const up = await supabase().storage.from("midia").upload(caminho, arquivo, { contentType: arquivo.type || undefined });
    if (up.error) {
      alert(`Não foi possível enviar: ${up.error.message}`);
      return null;
    }
    const { data, error } = await supabase()
      .from("arquivos_mesa")
      .insert({ id, mesa_id: mesaId, titulo: titulo.trim() || arquivo.name, tipo: pdf ? "pdf" : "imagem", caminho })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return null;
    }
    arquivos.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [data as L<ArquivoMesa>, ...l]));
    return data as ArquivoMesa;
  }

  async function criarTexto(titulo: string, texto: string) {
    const { data, error } = await supabase()
      .from("arquivos_mesa")
      .insert({ mesa_id: mesaId, titulo: titulo.trim(), tipo: "texto", texto })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return null;
    }
    arquivos.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [data as L<ArquivoMesa>, ...l]));
    return data as ArquivoMesa;
  }

  async function salvarArquivo(id: string, patch: Partial<ArquivoMesa>) {
    arquivos.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    return erro(supabase().from("arquivos_mesa").update(patch).eq("id", id));
  }

  async function apagarArquivo(a: ArquivoMesa) {
    if (a.caminho) await supabase().storage.from("midia").remove([a.caminho]);
    if (await erro(supabase().from("arquivos_mesa").delete().eq("id", a.id))) {
      arquivos.setLinhas((l) => l.filter((x) => x.id !== a.id));
      cartoes.setLinhas((l) => l.filter((x) => x.arquivo_id !== a.id));
    }
  }

  return {
    arquivos: arquivos.linhas,
    cartoes: cartoes.linhas.map((c) => (aoVivo[c.id] ? { ...c, ...aoVivo[c.id] } : c)),
    ligacoes: ligacoes.linhas,
    status: cartoes.status,
    moverAoVivo,
    moverCartao,
    criarCartao,
    salvarCartao,
    tirarCartao,
    ligar,
    rotularLigacao,
    desligar,
    enviarArquivo,
    criarTexto,
    salvarArquivo,
    apagarArquivo,
  };
}

export type DadosQuadro = ReturnType<typeof useQuadro>;

/** URL temporária (1 h) de um arquivo do storage privado. */
const cacheUrl = new Map<string, { url: string; ate: number }>();
export function useUrlArquivo(caminho: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => {
    const c = caminho ? cacheUrl.get(caminho) : undefined;
    return c && c.ate > Date.now() ? c.url : null;
  });
  useEffect(() => {
    if (!caminho) return;
    const c = cacheUrl.get(caminho);
    if (c && c.ate > Date.now()) {
      setUrl(c.url);
      return;
    }
    let vivo = true;
    supabase()
      .storage.from("midia")
      .createSignedUrl(caminho, 3600)
      .then(({ data }) => {
        if (!data?.signedUrl) return;
        cacheUrl.set(caminho, { url: data.signedUrl, ate: Date.now() + 50 * 60 * 1000 });
        if (vivo) setUrl(data.signedUrl);
      });
    return () => {
      vivo = false;
    };
  }, [caminho]);
  return url;
}
