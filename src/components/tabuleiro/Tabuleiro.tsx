"use client";

import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image as KImage, Layer, Rect, Shape, Stage } from "react-konva";
import type { Cena } from "@/lib/cenas";
import { useUrlArquivo } from "@/lib/quadro";

export interface Vista {
  x: number;
  y: number;
  k: number;
}

export interface AlinhamentoGrade {
  tamanho: number;
  x: number;
  y: number;
}

interface Props {
  cena: Cena;
  /** "alinhar": arrastar sobre UM quadrado do mapa para ajustar a grade. */
  modo?: "navegar" | "alinhar";
  onAlinhar?: (a: AlinhamentoGrade) => void;
  altura?: string;
  /** Camadas extras (tokens, névoa…), desenhadas por cima do mapa e da grade. */
  camadas?: (vista: Vista) => React.ReactNode;
  /** Botões extras no canto (ferramentas das próximas etapas). */
  extras?: React.ReactNode;
}

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 6;
const limitar = (k: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k));

/**
 * Tabuleiro em canvas (Konva). Unidades do mundo = pixels do mapa original.
 * Abre pelo mapa leve e, no computador, troca pelo otimizado quando ele chega.
 */
export function Tabuleiro({ cena, modo = "navegar", onAlinhar, altura = "70dvh", camadas, extras }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [vista, setVista] = useState<Vista>({ x: 0, y: 0, k: 0.2 });
  const [telaCheia, setTelaCheia] = useState(false);
  const imagem = useImagemMapa(cena);
  const largura = cena.mapa_largura ?? 0;
  const alturaMapa = cena.mapa_altura ?? 0;
  const enquadradoPara = useRef<string | null>(null);

  // tamanho da caixa
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTam({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [telaCheia]);

  const enquadrar = useCallback(() => {
    if (!tam.w || !tam.h || !largura || !alturaMapa) return;
    const k = limitar(Math.min(tam.w / largura, tam.h / alturaMapa) * 0.96);
    setVista({ k, x: (tam.w - largura * k) / 2, y: (tam.h - alturaMapa * k) / 2 });
  }, [tam.w, tam.h, largura, alturaMapa]);

  // enquadra ao abrir uma cena (ou quando o mapa muda de tamanho)
  useEffect(() => {
    const chave = `${cena.id}:${largura}x${alturaMapa}:${tam.w > 0}`;
    if (!tam.w) return;
    if (enquadradoPara.current === chave && !reenquadrar.current) return;
    enquadradoPara.current = chave;
    reenquadrar.current = false;
    enquadrar();
  }, [cena.id, largura, alturaMapa, tam.w, tam.h, enquadrar]);

  // ao entrar/sair da tela cheia, reenquadra quando a caixa tiver o tamanho novo
  const reenquadrar = useRef(false);
  function alternarTelaCheia() {
    reenquadrar.current = true;
    setTelaCheia((t) => !t);
  }
  useEffect(() => {
    if (!telaCheia) return;
    const sair = (e: KeyboardEvent) => e.key === "Escape" && alternarTelaCheia();
    window.addEventListener("keydown", sair);
    return () => window.removeEventListener("keydown", sair);
  }, [telaCheia]);

  function zoomEm(px: number, py: number, fator: number) {
    setVista((v) => {
      const k = limitar(v.k * fator);
      return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
    });
  }

  // roda do mouse
  function aoRodar(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const p = stageRef.current?.getPointerPosition();
    if (!p) return;
    zoomEm(p.x, p.y, Math.exp(-e.evt.deltaY * 0.0015));
  }

  // pinça no celular
  const pinca = useRef<{ d: number; cx: number; cy: number } | null>(null);
  function aoTocarMover(e: Konva.KonvaEventObject<TouchEvent>) {
    const t = e.evt.touches;
    if (t.length !== 2) return;
    e.evt.preventDefault();
    const stage = stageRef.current!;
    if (stage.isDragging()) stage.stopDrag();
    const r = stage.container().getBoundingClientRect();
    const a = { x: t[0].clientX - r.left, y: t[0].clientY - r.top };
    const b = { x: t[1].clientX - r.left, y: t[1].clientY - r.top };
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const ant = pinca.current;
    pinca.current = { d, cx, cy };
    if (!ant) return;
    setVista((v) => {
      const k = limitar(v.k * (d / ant.d));
      // mantém o ponto sob os dedos e acompanha o arrasto dos dois dedos
      const mx = (ant.cx - v.x) / v.k;
      const my = (ant.cy - v.y) / v.k;
      return { k, x: cx - mx * k, y: cy - my * k };
    });
  }

  // alinhar a grade: arrastar um retângulo sobre um quadrado do mapa
  const [selecao, setSelecao] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  function mundo() {
    const p = stageRef.current?.getPointerPosition();
    if (!p) return null;
    return { x: (p.x - vista.x) / vista.k, y: (p.y - vista.y) / vista.k };
  }
  function alinharInicio() {
    if (modo !== "alinhar") return;
    const m = mundo();
    if (m) setSelecao({ x0: m.x, y0: m.y, x1: m.x, y1: m.y });
  }
  function alinharMover() {
    if (modo !== "alinhar" || !selecao) return;
    const m = mundo();
    if (m) setSelecao({ ...selecao, x1: m.x, y1: m.y });
  }
  function alinharFim() {
    if (modo !== "alinhar" || !selecao) return;
    const w = Math.abs(selecao.x1 - selecao.x0);
    const h = Math.abs(selecao.y1 - selecao.y0);
    setSelecao(null);
    if (w < 6 || h < 6) return;
    const tamanho = Math.round(((w + h) / 2) * 10) / 10;
    const x = Math.min(selecao.x0, selecao.x1);
    const y = Math.min(selecao.y0, selecao.y1);
    onAlinhar?.({ tamanho, x: Math.round((((x % tamanho) + tamanho) % tamanho) * 10) / 10, y: Math.round((((y % tamanho) + tamanho) % tamanho) * 10) / 10 });
  }

  const semMapa = !cena.mapa_caminho && !cena.mapa_leve_caminho;

  return (
    <div className={telaCheia ? "fixed inset-0 z-50 bg-breu" : "relative w-full min-w-0"}>
      <div
        ref={caixa}
        className="relative w-full overflow-hidden rounded-sm border border-ouro/25 bg-[#0d0c0e] touch-none select-none"
        style={{ height: telaCheia ? "100dvh" : altura, cursor: modo === "alinhar" ? "crosshair" : "grab" }}
      >
        {tam.w > 0 && (
          <div className="absolute inset-0">
          <Stage
            ref={stageRef}
            width={tam.w}
            height={tam.h}
            x={vista.x}
            y={vista.y}
            scaleX={vista.k}
            scaleY={vista.k}
            draggable={modo === "navegar"}
            onDragMove={(e) => {
              if (e.target === stageRef.current) setVista((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
            }}
            onDragEnd={(e) => {
              if (e.target === stageRef.current) setVista((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
            }}
            onWheel={aoRodar}
            onTouchMove={aoTocarMover}
            onMouseDown={alinharInicio}
            onTouchStart={alinharInicio}
            onMouseMove={alinharMover}
            onMouseUp={alinharFim}
            onTouchEnd={() => {
              pinca.current = null;
              alinharFim();
            }}
          >
            <Layer listening={false}>
              {imagem && <KImage image={imagem} x={0} y={0} width={largura} height={alturaMapa} perfectDrawEnabled={false} />}
              {cena.grade_visivel && largura > 0 && (
                <Shape
                  perfectDrawEnabled={false}
                  sceneFunc={(ctx) => {
                    const s = cena.grade_tamanho;
                    if (s * vista.k < 5) return; // longe demais: a grade viraria borrão
                    // só desenha a parte visível
                    const vx0 = Math.max(0, -vista.x / vista.k);
                    const vy0 = Math.max(0, -vista.y / vista.k);
                    const vx1 = Math.min(largura, (tam.w - vista.x) / vista.k);
                    const vy1 = Math.min(alturaMapa, (tam.h - vista.y) / vista.k);
                    if (vx1 <= vx0 || vy1 <= vy0) return;
                    const c = ctx._context;
                    c.save();
                    c.beginPath();
                    const gx0 = cena.grade_x + Math.floor((vx0 - cena.grade_x) / s) * s;
                    const gy0 = cena.grade_y + Math.floor((vy0 - cena.grade_y) / s) * s;
                    for (let x = gx0; x <= vx1; x += s) {
                      if (x < 0) continue;
                      c.moveTo(x, vy0);
                      c.lineTo(x, vy1);
                    }
                    for (let y = gy0; y <= vy1; y += s) {
                      if (y < 0) continue;
                      c.moveTo(vx0, y);
                      c.lineTo(vx1, y);
                    }
                    c.strokeStyle = cena.grade_cor;
                    c.lineWidth = 1 / vista.k;
                    c.stroke();
                    c.restore();
                  }}
                />
              )}
            </Layer>
            {camadas?.(vista)}
            {selecao && (
              <Layer listening={false}>
                <Rect
                  x={Math.min(selecao.x0, selecao.x1)}
                  y={Math.min(selecao.y0, selecao.y1)}
                  width={Math.abs(selecao.x1 - selecao.x0)}
                  height={Math.abs(selecao.y1 - selecao.y0)}
                  stroke="#e2c277"
                  strokeWidth={2 / vista.k}
                  dash={[6 / vista.k, 4 / vista.k]}
                  fill="rgba(226,194,119,0.15)"
                />
              </Layer>
            )}
          </Stage>
          </div>
        )}

        {semMapa && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center italic text-nevoa/60">
            Esta cena ainda não tem mapa.
          </p>
        )}
        {!semMapa && !imagem && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center italic text-nevoa/60">Carregando o mapa…</p>
        )}

        {modo === "alinhar" && (
          <p className="pointer-events-none absolute inset-x-2 top-2 rounded-sm bg-noite/90 px-3 py-2 text-center text-nevoa">
            Arraste sobre <b>um</b> quadrado do mapa, de canto a canto. A grade se ajusta ao tamanho e à posição dele.
          </p>
        )}

        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          {extras}
          <BotaoMapa rotulo="Aproximar" onClick={() => zoomEm(tam.w / 2, tam.h / 2, 1.3)}>+</BotaoMapa>
          <BotaoMapa rotulo="Afastar" onClick={() => zoomEm(tam.w / 2, tam.h / 2, 1 / 1.3)}>−</BotaoMapa>
          <BotaoMapa rotulo="Enquadrar o mapa" onClick={enquadrar}>⤢</BotaoMapa>
          <BotaoMapa rotulo={telaCheia ? "Sair da tela cheia" : "Tela cheia"} onClick={alternarTelaCheia}>
            {telaCheia ? "✕" : "⛶"}
          </BotaoMapa>
        </div>
      </div>
    </div>
  );
}

export function BotaoMapa({ rotulo, onClick, ativo, children }: { rotulo: string; onClick: () => void; ativo?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={ativo}
      className={`grid h-10 w-10 place-items-center rounded-sm border text-lg leading-none shadow-lg ${
        ativo ? "border-ouro bg-ouro/90 text-marinho" : "border-ouro/35 bg-noite/90 text-ouro-claro hover:bg-noite-3"
      }`}
    >
      {children}
    </button>
  );
}

/** Abre pelo mapa leve; no computador, troca pelo otimizado quando ele termina de carregar. */
function useImagemMapa(cena: Cena) {
  const urlLeve = useUrlArquivo(cena.mapa_leve_caminho ?? cena.mapa_caminho);
  const celular = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 900;
  const urlBoa = useUrlArquivo(celular ? null : cena.mapa_caminho);
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    setImg(null);
  }, [cena.id, cena.mapa_caminho]);

  useEffect(() => {
    if (!urlLeve) return;
    let vivo = true;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.decoding = "async";
    i.onload = () => vivo && setImg((atual) => atual ?? i);
    i.src = urlLeve;
    return () => {
      vivo = false;
    };
  }, [urlLeve]);

  useEffect(() => {
    if (!urlBoa) return;
    let vivo = true;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.decoding = "async";
    i.onload = () => {
      if (!vivo) return;
      (i.decode ? i.decode() : Promise.resolve()).catch(() => {}).finally(() => vivo && setImg(i));
    };
    i.src = urlBoa;
    return () => {
      vivo = false;
    };
  }, [urlBoa]);

  return img;
}
