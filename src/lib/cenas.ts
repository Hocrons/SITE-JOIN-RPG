"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAoVivo } from "./aoVivo";
import { supabase } from "./supabase";

export interface Cena {
  id: string;
  mesa_id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
  mapa_caminho: string | null;
  mapa_leve_caminho: string | null;
  mapa_original_caminho: string | null;
  mapa_largura: number | null;
  mapa_altura: number | null;
  grade_tamanho: number;
  grade_x: number;
  grade_y: number;
  grade_visivel: boolean;
  grade_cor: string;
  metros_por_quadrado: number;
  atualizado_em: string;
}

type L<T> = T & Record<string, unknown>;

export const CORES_GRADE = [
  { id: "rgba(20,14,8,0.45)", nome: "Escura" },
  { id: "rgba(255,248,230,0.45)", nome: "Clara" },
  { id: "rgba(226,194,119,0.6)", nome: "Dourada" },
  { id: "rgba(216,38,47,0.5)", nome: "Vermelha" },
];

/**
 * Cenas da mesa, ao vivo. O mestre recebe todas; o jogador só a ativa.
 * Trocar de cena esconde a anterior do jogador sem gerar evento, então o
 * mestre avisa por broadcast e todo mundo recarrega.
 */
export function useCenas(mesaId: string | null | undefined) {
  const cenas = useAoVivo<L<Cena>>("cenas", mesaId, {
    chave: (c) => String(c.id),
    ordenar: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  });
  const recarregar = useRef(cenas.recarregar);
  recarregar.current = cenas.recarregar;
  const canal = useRef<ReturnType<ReturnType<typeof supabase>["channel"]> | null>(null);

  useEffect(() => {
    if (!mesaId) return;
    const sb = supabase();
    const c = sb
      .channel(`aviso-cena-${mesaId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "cena" }, () => recarregar.current())
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
  const avisar = useCallback(() => canal.current?.send({ type: "broadcast", event: "cena", payload: {} }), []);

  // se sobrar mais de uma marcada como ativa no aparelho, vale a mais recente
  const ativa = useMemo(
    () => cenas.linhas.filter((c) => c.ativa).sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))[0] ?? null,
    [cenas.linhas],
  );

  async function erro(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    if (error) {
      alert(error.message);
      return false;
    }
    return true;
  }

  async function criar(nome: string) {
    const ordem = cenas.linhas.reduce((m, c) => Math.max(m, c.ordem), -1) + 1;
    const { data, error } = await supabase().from("cenas").insert({ mesa_id: mesaId, nome: nome.trim(), ordem }).select().single();
    if (error) {
      alert(error.message);
      return null;
    }
    cenas.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as L<Cena>]));
    return data as Cena;
  }

  async function salvar(id: string, patch: Partial<Cena>) {
    cenas.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    return erro(supabase().from("cenas").update(patch).eq("id", id));
  }

  async function ativar(id: string | null) {
    const ok = await erro(supabase().rpc("cena_ativar", { p_mesa: mesaId, p_cena: id }));
    if (ok) {
      const agora = new Date().toISOString();
      cenas.setLinhas((l) => l.map((x) => ({ ...x, ativa: x.id === id, atualizado_em: x.id === id ? agora : x.atualizado_em })));
      avisar();
    }
  }

  async function excluir(c: Cena) {
    const caminhos = [c.mapa_caminho, c.mapa_leve_caminho, c.mapa_original_caminho].filter(Boolean) as string[];
    if (caminhos.length) await supabase().storage.from("midia").remove(caminhos);
    if (await erro(supabase().from("cenas").delete().eq("id", c.id))) {
      cenas.setLinhas((l) => l.filter((x) => x.id !== c.id));
      if (c.ativa) avisar();
    }
  }

  /**
   * Sobe o mapa em três tamanhos: o original, um otimizado (até 4096 px) e um leve (até 2048 px).
   * O tabuleiro abre pelo leve e troca pelo otimizado no computador; o original fica guardado.
   */
  async function enviarMapa(c: Cena, arquivo: File, aoProgredir?: (t: string) => void) {
    if (!arquivo.type.startsWith("image/")) return alert("O mapa precisa ser uma imagem (JPG, PNG ou WebP).");
    if (arquivo.size > 50 * 1024 * 1024) return alert("O mapa precisa ter até 50 MB.");
    aoProgredir?.("Lendo a imagem…");
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(arquivo);
    } catch {
      return alert("Não consegui abrir essa imagem. Tente salvar como JPG ou PNG.");
    }
    const largura = bitmap.width;
    const altura = bitmap.height;
    aoProgredir?.("Preparando as versões do mapa…");
    const otimizado = await reduzir(bitmap, 4096);
    const leve = await reduzir(bitmap, 2048);
    bitmap.close();

    const base = `cenas/${mesaId}/${c.id}/${Date.now()}`;
    const ext = (arquivo.name.split(".").pop() || "png").toLowerCase();
    const envios: [string, Blob, string][] = [
      [`${base}-original.${ext}`, arquivo, arquivo.type],
      [`${base}-mapa.${otimizado.ext}`, otimizado.blob, otimizado.blob.type],
      [`${base}-leve.${leve.ext}`, leve.blob, leve.blob.type],
    ];
    for (let i = 0; i < envios.length; i++) {
      aoProgredir?.(`Enviando (${i + 1} de 3)…`);
      const [caminho, blob, tipo] = envios[i];
      const { error } = await supabase().storage.from("midia").upload(caminho, blob, { contentType: tipo, cacheControl: "31536000" });
      if (error) {
        aoProgredir?.("");
        return alert(`Não foi possível enviar o mapa: ${error.message}`);
      }
    }
    const antigos = [c.mapa_caminho, c.mapa_leve_caminho, c.mapa_original_caminho].filter(Boolean) as string[];
    await salvar(c.id, {
      mapa_original_caminho: envios[0][0],
      mapa_caminho: envios[1][0],
      mapa_leve_caminho: envios[2][0],
      mapa_largura: largura,
      mapa_altura: altura,
    });
    if (antigos.length) await supabase().storage.from("midia").remove(antigos);
    if (c.ativa) avisar();
    aoProgredir?.("");
  }

  return { cenas: cenas.linhas, ativa, status: cenas.status, criar, salvar, ativar, excluir, enviarMapa };
}

export type DadosCenas = ReturnType<typeof useCenas>;

async function reduzir(bitmap: ImageBitmap, lado: number) {
  const f = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * f));
  const h = Math.max(1, Math.round(bitmap.height * f));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
  if (blob && blob.type === "image/webp") return { blob, ext: "webp" };
  const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  return { blob: jpg!, ext: "jpg" };
}
