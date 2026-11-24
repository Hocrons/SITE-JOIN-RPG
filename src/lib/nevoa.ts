"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Cena } from "./cenas";
import { useUrlArquivo } from "./quadro";
import { supabase } from "./supabase";

/** Lado maior da máscara. Num mapa de 8000 px dá ~5 px de mapa por pixel de névoa (as bordas ficam suaves). */
const LADO_MASCARA = 1600;

export type TracoNevoa =
  | { tipo: "pincel"; modo: "cobrir" | "revelar"; pontos: { x: number; y: number }[]; raio: number }
  | { tipo: "retangulo"; modo: "cobrir" | "revelar"; x0: number; y0: number; x1: number; y1: number };

/**
 * Névoa de uma cena: uma máscara em canvas (opaco = coberto), em escala reduzida do mapa.
 * O mestre pinta localmente e a máscara é enviada ao Storage logo depois (cada versão
 * em um arquivo novo); a cena guarda o caminho e todos recarregam pelo tempo real.
 */
export function useNevoa(cena: Cena | null | undefined, eMestre: boolean) {
  const largura = cena?.mapa_largura ?? 0;
  const altura = cena?.mapa_altura ?? 0;
  const escala = largura && altura ? Math.min(1, LADO_MASCARA / Math.max(largura, altura)) : 1;
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [versao, setVersao] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const enviado = useRef<string | null>(null);
  const pendente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = useUrlArquivo(cena?.nevoa_caminho ?? null);

  // canvas novo quando muda a cena ou o tamanho do mapa
  useEffect(() => {
    if (!largura || !altura) {
      setCanvas(null);
      return;
    }
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(largura * escala));
    c.height = Math.max(1, Math.round(altura * escala));
    // jogador: começa tudo coberto até a máscara chegar (nada vaza enquanto carrega)
    if (!eMestre) {
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#0d0c0e";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    setCanvas(c);
    enviado.current = null;
  }, [cena?.id, largura, altura, escala, eMestre]);

  // carrega a máscara salva (exceto a que eu mesmo acabei de enviar)
  useEffect(() => {
    if (!canvas) return;
    const caminho = cena?.nevoa_caminho ?? null;
    if (caminho && caminho === enviado.current) return;
    const ctx = canvas.getContext("2d")!;
    if (!caminho) {
      // sem máscara salva: para o jogador, névoa ligada = tudo coberto
      if (eMestre) ctx.clearRect(0, 0, canvas.width, canvas.height);
      else {
        ctx.fillStyle = "#0d0c0e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      setVersao((v) => v + 1);
      return;
    }
    if (!url) return;
    let vivo = true;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!vivo) return;
      ctx.globalCompositeOperation = "copy";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      setVersao((v) => v + 1);
    };
    img.src = url;
    return () => {
      vivo = false;
    };
  }, [canvas, cena?.nevoa_caminho, url, eMestre]);

  const enviar = useCallback(async () => {
    if (!canvas || !cena || !eMestre) return;
    setSalvando(true);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return setSalvando(false);
    const caminho = `cenas/${cena.mesa_id}/${cena.id}/nevoa-${Date.now()}.png`;
    const sb = supabase();
    const { error } = await sb.storage.from("midia").upload(caminho, blob, { contentType: "image/png", cacheControl: "31536000" });
    if (error) {
      setSalvando(false);
      alert(`Não foi possível salvar a névoa: ${error.message}`);
      return;
    }
    const antigo = cena.nevoa_caminho;
    enviado.current = caminho;
    const { error: e2 } = await sb.from("cenas").update({ nevoa_caminho: caminho }).eq("id", cena.id);
    if (!e2 && antigo && antigo !== caminho) await sb.storage.from("midia").remove([antigo]);
    if (cena.nevoa_ativa) await gerarRef.current();
    setSalvando(false);
  }, [canvas, cena, eMestre]);

  // ---------- versão dos jogadores (mapa com a névoa já pintada) ----------
  const imagensMapa = useRef<{ chave: string; boa: HTMLImageElement; leve: HTMLImageElement | null } | null>(null);
  const gerando = useRef<Promise<void> | null>(null);
  const deNovo = useRef(false);
  const cenaRef = useRef(cena);
  cenaRef.current = cena;

  const gerar = useCallback(async () => {
    // uma geração por vez; se pedirem no meio, roda de novo no fim com a névoa mais nova
    if (gerando.current) {
      deNovo.current = true;
      return gerando.current;
    }
    const tarefa = (async () => {
      do {
        deNovo.current = false;
        const c = cenaRef.current;
        if (!c || !canvas || !c.mapa_caminho || !eMestre) return;
        const sb = supabase();
        const chave = `${c.mapa_caminho}|${c.mapa_leve_caminho}`;
        if (imagensMapa.current?.chave !== chave) {
          const [boa, leve] = await Promise.all([carregar(c.mapa_caminho), c.mapa_leve_caminho ? carregar(c.mapa_leve_caminho) : Promise.resolve(null)]);
          if (!boa) return;
          imagensMapa.current = { chave, boa, leve };
        }
        const { boa, leve } = imagensMapa.current!;
        const ts = Date.now();
        const subir = async (img: HTMLImageElement, nome: string) => {
          const blob = await queimar(img, canvas);
          if (!blob) return null;
          const caminho = `cenas/${c.mesa_id}/${c.id}/jog-${ts}-${nome}.webp`;
          const { error } = await sb.storage.from("midia").upload(caminho, blob, { contentType: blob.type, cacheControl: "31536000" });
          return error ? null : caminho;
        };
        const nova = await subir(boa, "mapa");
        const novaLeve = leve ? await subir(leve, "leve") : nova;
        if (!nova) return;
        const antigos = [c.mapa_jogador_caminho, c.mapa_jogador_leve_caminho].filter((x): x is string => !!x && x !== nova && x !== novaLeve);
        const { error } = await sb
          .from("cenas")
          .update({ mapa_jogador_caminho: nova, mapa_jogador_leve_caminho: novaLeve, mapa_jogador_origem: c.mapa_caminho })
          .eq("id", c.id);
        if (!error && antigos.length) await sb.storage.from("midia").remove(antigos);
      } while (deNovo.current);
    })();
    gerando.current = tarefa.finally(() => {
      gerando.current = null;
    });
    return gerando.current;
  }, [canvas, eMestre]);
  const gerarRef = useRef(gerar);
  gerarRef.current = gerar;

  // névoa ligada sem versão dos jogadores (ou feita de um mapa antigo): faz agora
  useEffect(() => {
    if (!eMestre || !cena?.nevoa_ativa || !cena.mapa_caminho || !canvas || versao === 0) return;
    if (cena.mapa_jogador_origem === cena.mapa_caminho && cena.mapa_jogador_caminho) return;
    gerarRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eMestre, cena?.nevoa_ativa, cena?.mapa_caminho, cena?.mapa_jogador_origem, canvas, versao > 0]);

  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;
  const agendar = useCallback(() => {
    if (pendente.current) clearTimeout(pendente.current);
    pendente.current = setTimeout(() => {
      pendente.current = null;
      enviarRef.current();
    }, 450);
  }, []);
  // saiu da tela com algo por salvar: salva já
  useEffect(
    () => () => {
      if (pendente.current) {
        clearTimeout(pendente.current);
        enviarRef.current();
      }
    },
    [cena?.id],
  );

  /** Aplica um traço na máscara. `salvar` = fim do gesto (agenda o envio). */
  const pintar = useCallback(
    (t: TracoNevoa, salvar = true) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      ctx.save();
      ctx.scale(escala, escala);
      ctx.globalCompositeOperation = t.modo === "revelar" ? "destination-out" : "source-over";
      ctx.fillStyle = ctx.strokeStyle = "#0d0c0e";
      if (t.tipo === "pincel") {
        ctx.lineCap = ctx.lineJoin = "round";
        ctx.lineWidth = t.raio * 2;
        ctx.beginPath();
        const [p0, ...resto] = t.pontos;
        ctx.moveTo(p0.x, p0.y);
        if (!resto.length) ctx.lineTo(p0.x + 0.01, p0.y);
        for (const p of resto) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        const x = Math.min(t.x0, t.x1);
        const y = Math.min(t.y0, t.y1);
        ctx.fillRect(x, y, Math.abs(t.x1 - t.x0), Math.abs(t.y1 - t.y0));
      }
      ctx.restore();
      setVersao((v) => v + 1);
      if (salvar) agendar();
    },
    [canvas, escala, agendar],
  );

  const tudo = useCallback(
    (modo: "cobrir" | "revelar") => pintar({ tipo: "retangulo", modo, x0: 0, y0: 0, x1: largura, y1: altura }),
    [pintar, largura, altura],
  );

  /** O ponto (px do mapa) está coberto? */
  const coberto = useCallback(
    (x: number, y: number) => {
      if (!canvas || !cena?.nevoa_ativa) return false;
      const px = Math.floor(x * escala);
      const py = Math.floor(y * escala);
      if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return false;
      return canvas.getContext("2d")!.getImageData(px, py, 1, 1).data[3] > 127;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvas, escala, cena?.nevoa_ativa, versao],
  );

  return { canvas, versao, salvando, pintar, tudo, coberto, ativa: !!cena?.nevoa_ativa };
}

export type DadosNevoa = ReturnType<typeof useNevoa>;

async function carregar(caminho: string): Promise<HTMLImageElement | null> {
  const { data } = await supabase().storage.from("midia").createSignedUrl(caminho, 600);
  if (!data?.signedUrl) return null;
  return new Promise((ok) => {
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = data.signedUrl;
  });
}

/** O mapa com a névoa pintada por cima (o que o jogador pode baixar). */
async function queimar(mapa: HTMLImageElement, mascara: HTMLCanvasElement): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = mapa.naturalWidth;
  c.height = mapa.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(mapa, 0, 0);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(mascara, 0, 0, c.width, c.height);
  const webp = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85));
  if (webp?.type === "image/webp") return webp;
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
}
