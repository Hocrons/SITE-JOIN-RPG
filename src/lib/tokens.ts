"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAoVivo } from "./aoVivo";
import { supabase } from "./supabase";

export type Faccao = "agente" | "aliado" | "neutro" | "inimigo" | "paranormal";

export interface Token {
  id: string;
  mesa_id: string;
  cena_id: string;
  personagem_id: string | null;
  nome: string;
  imagem_caminho: string | null;
  tamanho: number;
  coluna: number;
  linha: number;
  faccao: Faccao;
  oculto: boolean;
  criado_em: string;
  atualizado_em: string;
}

type L<T> = T & Record<string, unknown>;

export const FACCOES: { id: Faccao; nome: string; cor: string }[] = [
  { id: "agente", nome: "Agente", cor: "#e2c277" },
  { id: "aliado", nome: "Aliado", cor: "#5fb37c" },
  { id: "neutro", nome: "Neutro", cor: "#b5ad9c" },
  { id: "inimigo", nome: "Inimigo", cor: "#e0414b" },
  { id: "paranormal", nome: "Paranormal", cor: "#a77bf0" },
];
export const corFaccao = (f: Faccao) => FACCOES.find((x) => x.id === f)?.cor ?? "#b5ad9c";

/** Posição (em px do mapa) que outra pessoa está arrastando agora. */
export type Arrasto = Record<string, { x: number; y: number; ate: number }>;

/**
 * Tokens da mesa, ao vivo. O banco filtra: o jogador só recebe os tokens visíveis
 * da cena que está na mesa. Esconder um token não gera evento para o jogador,
 * então o mestre avisa por broadcast e todos recarregam.
 * Enquanto alguém arrasta, a posição vai por broadcast (sem gravar) para todos verem
 * o movimento; ao soltar, grava no banco.
 */
export function useTokens(mesaId: string | null | undefined, cenaId: string | null | undefined) {
  const todos = useAoVivo<L<Token>>("tokens", mesaId, {
    chave: (t) => String(t.id),
    // os grandes por baixo dos pequenos
    ordenar: (a, b) => b.tamanho - a.tamanho || a.criado_em.localeCompare(b.criado_em),
  });
  const recarregar = useRef(todos.recarregar);
  recarregar.current = todos.recarregar;
  const canal = useRef<ReturnType<ReturnType<typeof supabase>["channel"]> | null>(null);
  const [arrasto, setArrasto] = useState<Arrasto>({});

  useEffect(() => {
    if (!mesaId) return;
    const sb = supabase();
    const c = sb
      .channel(`aviso-token-${mesaId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "recarregar" }, () => recarregar.current())
      .on("broadcast", { event: "arrastando" }, ({ payload }) => {
        const p = payload as { id: string; x: number; y: number; fim?: boolean };
        setArrasto((a) => {
          if (p.fim) {
            const n = { ...a };
            delete n[p.id];
            return n;
          }
          return { ...a, [p.id]: { x: p.x, y: p.y, ate: Date.now() + 3000 } };
        });
      })
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

  // trocou a cena: busca de novo (o jogador passa a receber outros tokens)
  useEffect(() => {
    if (cenaId) recarregar.current();
  }, [cenaId]);

  // arrastos esquecidos (quem arrastava fechou a página) somem sozinhos
  useEffect(() => {
    const id = setInterval(() => {
      setArrasto((a) => {
        const agora = Date.now();
        const vivos = Object.entries(a).filter(([, v]) => v.ate > agora);
        return vivos.length === Object.keys(a).length ? a : Object.fromEntries(vivos);
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const avisar = useCallback(() => canal.current?.send({ type: "broadcast", event: "recarregar", payload: {} }), []);

  const ultimoEnvio = useRef(0);
  /** Manda a posição do arrasto (no máximo ~12 vezes por segundo). Token oculto não é transmitido. */
  const transmitirArrasto = useCallback((t: Token, x: number, y: number, fim = false) => {
    if (t.oculto) return;
    const agora = Date.now();
    if (!fim && agora - ultimoEnvio.current < 80) return;
    ultimoEnvio.current = agora;
    canal.current?.send({ type: "broadcast", event: "arrastando", payload: { id: t.id, x, y, fim } });
  }, []);

  const tokens = useMemo(() => todos.linhas.filter((t) => t.cena_id === cenaId), [todos.linhas, cenaId]);

  async function erro(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    if (error) {
      alert(error.message);
      todos.recarregar();
      return false;
    }
    return true;
  }

  async function criar(dados: Partial<Token> & { cena_id: string; nome: string }, imagem?: File | null) {
    const { data, error } = await supabase()
      .from("tokens")
      .insert({ mesa_id: mesaId, ...dados })
      .select()
      .single();
    if (error) {
      alert(error.message.includes("tokens_um_por_personagem") ? "Esse agente já está nesta cena." : error.message);
      return null;
    }
    let t = data as L<Token>;
    todos.setLinhas((l) => (l.some((x) => x.id === t.id) ? l : [...l, t]));
    if (imagem) {
      const caminho = await enviarImagem(t, imagem);
      if (caminho) t = { ...t, imagem_caminho: caminho };
    }
    return t as Token;
  }

  async function salvar(t: Token, patch: Partial<Token>) {
    todos.setLinhas((l) => l.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    const ok = await erro(supabase().from("tokens").update(patch).eq("id", t.id));
    if (ok && patch.oculto === true) avisar();
    return ok;
  }

  async function mover(t: Token, coluna: number, linha: number) {
    if (t.coluna === coluna && t.linha === linha) return;
    todos.setLinhas((l) => l.map((x) => (x.id === t.id ? { ...x, coluna, linha } : x)));
    const { data, error } = await supabase().rpc("token_mover", { p_token: t.id, p_coluna: coluna, p_linha: linha });
    if (error) {
      alert(error.message);
      todos.recarregar();
    } else if (data) {
      const r = data as L<Token>;
      todos.setLinhas((l) => l.map((x) => (x.id === r.id ? { ...x, ...r } : x)));
    }
  }

  async function excluir(t: Token) {
    if (t.imagem_caminho) await supabase().storage.from("midia").remove([t.imagem_caminho]);
    if (await erro(supabase().from("tokens").delete().eq("id", t.id))) {
      todos.setLinhas((l) => l.filter((x) => x.id !== t.id));
    }
  }

  /** Imagem do token: PNG com fundo transparente, reduzida para até 512 px (mantém a transparência). */
  async function enviarImagem(t: Token, arquivo: File) {
    if (!arquivo.type.startsWith("image/")) {
      alert("A imagem do token precisa ser PNG, WebP ou JPG.");
      return null;
    }
    let blob: Blob = arquivo;
    let ext = (arquivo.name.split(".").pop() || "png").toLowerCase();
    try {
      const r = await reduzirComTransparencia(arquivo, 512);
      blob = r.blob;
      ext = r.ext;
    } catch {
      /* envia o original */
    }
    const caminho = `tokens/${mesaId}/${t.id}/${Date.now()}.${ext}`;
    const { error } = await supabase().storage.from("midia").upload(caminho, blob, { contentType: blob.type, cacheControl: "31536000" });
    if (error) {
      alert(`Não foi possível enviar a imagem: ${error.message}`);
      return null;
    }
    const antiga = t.imagem_caminho;
    await salvar(t, { imagem_caminho: caminho });
    if (antiga) await supabase().storage.from("midia").remove([antiga]);
    return caminho;
  }

  async function removerImagem(t: Token) {
    const antiga = t.imagem_caminho;
    if ((await salvar(t, { imagem_caminho: null })) && antiga) await supabase().storage.from("midia").remove([antiga]);
  }

  /** Cópia ao lado (ex.: vários cultistas iguais). A imagem é copiada no Storage. */
  async function duplicar(t: Token) {
    const novo = await criar({
      cena_id: t.cena_id,
      nome: proximoNome(
        t.nome,
        tokens.map((x) => x.nome),
      ),
      faccao: t.faccao,
      tamanho: t.tamanho,
      oculto: t.oculto,
      coluna: t.coluna + t.tamanho,
      linha: t.linha,
    });
    if (!novo || !t.imagem_caminho) return novo;
    const ext = t.imagem_caminho.split(".").pop();
    const destino = `tokens/${mesaId}/${novo.id}/${Date.now()}.${ext}`;
    const { error } = await supabase().storage.from("midia").copy(t.imagem_caminho, destino);
    if (!error) await salvar(novo, { imagem_caminho: destino });
    return novo;
  }

  return {
    tokens,
    status: todos.status,
    arrasto,
    criar,
    salvar,
    mover,
    excluir,
    enviarImagem,
    removerImagem,
    duplicar,
    transmitirArrasto,
    avisar,
  };
}

export type DadosTokens = ReturnType<typeof useTokens>;

function proximoNome(nome: string, existentes: string[]) {
  const base = nome.replace(/\s+\d+$/, "");
  let n = 2;
  while (existentes.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

async function reduzirComTransparencia(arquivo: File, lado: number) {
  const bitmap = await createImageBitmap(arquivo);
  const r = recorteVisivel(bitmap);
  const f = Math.min(1, lado / Math.max(r.w, r.h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(r.w * f));
  canvas.height = Math.max(1, Math.round(r.h * f));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  return { blob: png!, ext: "png" };
}

/** Área com conteúdo (ignora a sobra transparente em volta da figura). */
function recorteVisivel(b: ImageBitmap) {
  const tudo = { x: 0, y: 0, w: b.width, h: b.height };
  const f = Math.min(1, 400 / Math.max(b.width, b.height));
  const w = Math.max(1, Math.round(b.width * f));
  const h = Math.max(1, Math.round(b.height * f));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return tudo;
  ctx.drawImage(b, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return tudo; // tudo transparente
  const m = 2; // margem para o brilho da facção não cortar
  x0 = Math.max(0, x0 - m);
  y0 = Math.max(0, y0 - m);
  x1 = Math.min(w - 1, x1 + m);
  y1 = Math.min(h - 1, y1 + m);
  return { x: x0 / f, y: y0 / f, w: (x1 - x0 + 1) / f, h: (y1 - y0 + 1) / f };
}
