"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAoVivo } from "./aoVivo";
import { supabase } from "./supabase";

export interface Cena {
  id: string;
  mesa_id: string;
  nome: string;
  regiao: string;
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
  nevoa_ativa: boolean;
  nevoa_caminho: string | null;
  mapa_jogador_caminho: string | null;
  mapa_jogador_leve_caminho: string | null;
  mapa_jogador_origem: string | null;
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
    ordenar: (a, b) => (a.regiao ?? "").localeCompare(b.regiao ?? "", "pt-BR") || a.ordem - b.ordem || a.nome.localeCompare(b.nome),
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

  async function criar(nome: string, regiao = "") {
    const r = regiao.trim();
    const ordem = cenas.linhas.filter((c) => (c.regiao ?? "") === r).reduce((m, c) => Math.max(m, c.ordem), -1) + 1;
    const { data, error } = await supabase().from("cenas").insert({ mesa_id: mesaId, nome: nome.trim(), regiao: r, ordem }).select().single();
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
    const caminhos = [c.mapa_caminho, c.mapa_leve_caminho, c.mapa_original_caminho, c.nevoa_caminho, c.mapa_jogador_caminho, c.mapa_jogador_leve_caminho].filter(Boolean) as string[];
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

  /** Sobe ou desce a cena dentro da região dela. */
  async function mover(c: Cena, dir: -1 | 1) {
    const grupo = cenas.linhas.filter((x) => (x.regiao ?? "") === (c.regiao ?? ""));
    const i = grupo.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= grupo.length) return;
    const nova = [...grupo];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    const ordens = new Map(nova.map((x, k) => [x.id, k]));
    cenas.setLinhas((l) => l.map((x) => (ordens.has(x.id) ? { ...x, ordem: ordens.get(x.id)! } : x)));
    await Promise.all(nova.map((x, k) => (x.ordem === k ? null : supabase().from("cenas").update({ ordem: k }).eq("id", x.id))));
  }

  /** Troca o nome de uma região em todas as cenas dela. */
  async function renomearRegiao(antiga: string, nova: string) {
    const n = nova.trim();
    if (n === antiga) return;
    cenas.setLinhas((l) => l.map((x) => ((x.regiao ?? "") === antiga ? { ...x, regiao: n } : x)));
    await erro(supabase().from("cenas").update({ regiao: n }).eq("mesa_id", mesaId).eq("regiao", antiga));
  }

  /**
   * Cópia completa da cena: mapa, grade, névoa e tokens (com as imagens).
   * A cópia nasce fora da mesa dos jogadores.
   */
  async function duplicar(c: Cena, aoProgredir?: (t: string) => void) {
    const sb = supabase();
    aoProgredir?.("Copiando a cena…");
    const ordem = cenas.linhas.filter((x) => (x.regiao ?? "") === (c.regiao ?? "")).reduce((m, x) => Math.max(m, x.ordem), -1) + 1;
    const {
      id: _id, ativa: _a, criado_em: _c, atualizado_em: _u,
      mapa_caminho, mapa_leve_caminho, mapa_original_caminho, nevoa_caminho, mapa_jogador_caminho, mapa_jogador_leve_caminho,
      ...resto
    } = c as Cena & { criado_em?: string };
    void _id; void _a; void _c; void _u;
    const { data, error } = await sb
      .from("cenas")
      .insert({ ...resto, nome: `${c.nome} (cópia)`.slice(0, 80), ordem, ativa: false })
      .select()
      .single();
    if (error || !data) {
      alert(error?.message ?? "Não foi possível duplicar.");
      aoProgredir?.("");
      return null;
    }
    const nova = data as Cena;
    cenas.setLinhas((l) => (l.some((x) => x.id === nova.id) ? l : [...l, nova as L<Cena>]));

    // arquivos: mesma estrutura, na pasta da cena nova
    aoProgredir?.("Copiando o mapa…");
    const arquivos = { mapa_caminho, mapa_leve_caminho, mapa_original_caminho, nevoa_caminho, mapa_jogador_caminho, mapa_jogador_leve_caminho };
    const patch: Record<string, string | null> = {};
    const feitos = new Map<string, string>();
    for (const [campo, caminho] of Object.entries(arquivos)) {
      if (!caminho) continue;
      if (!feitos.has(caminho)) {
        const destino = caminho.replace(`/${c.id}/`, `/${nova.id}/`);
        const { error: e } = await sb.storage.from("midia").copy(caminho, destino);
        feitos.set(caminho, e ? "" : destino);
      }
      patch[campo] = feitos.get(caminho) || null;
    }
    if (patch.mapa_caminho) patch.mapa_jogador_origem = patch.mapa_caminho;
    if (Object.keys(patch).length) {
      await sb.from("cenas").update(patch).eq("id", nova.id);
      cenas.setLinhas((l) => l.map((x) => (x.id === nova.id ? { ...x, ...patch } : x)));
    }

    // tokens, com as imagens
    aoProgredir?.("Copiando os tokens…");
    const { data: tokens } = await sb.from("tokens").select("*").eq("cena_id", c.id);
    for (const t of (tokens ?? []) as Record<string, unknown>[]) {
      const { id: _t, cena_id: _ce, criado_em: _tc, atualizado_em: _tu, imagem_caminho, ...dadosToken } = t;
      void _t; void _ce; void _tc; void _tu;
      const { data: novo } = await sb.from("tokens").insert({ ...dadosToken, cena_id: nova.id, imagem_caminho: null }).select("id").single();
      if (!novo || !imagem_caminho) continue;
      const origem = String(imagem_caminho);
      const destino = `tokens/${mesaId}/${novo.id}/${origem.split("/").pop()}`;
      const { error: e } = await sb.storage.from("midia").copy(origem, destino);
      if (!e) await sb.from("tokens").update({ imagem_caminho: destino }).eq("id", novo.id);
    }
    aoProgredir?.("");
    return nova;
  }

  return { cenas: cenas.linhas, ativa, status: cenas.status, criar, salvar, ativar, excluir, enviarMapa, mover, renomearRegiao, duplicar };
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
