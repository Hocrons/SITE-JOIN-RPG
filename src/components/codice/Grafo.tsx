"use client";

import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY,
  type Simulation, type SimulationLinkDatum, type SimulationNodeDatum,
} from "d3-force";
import { useEffect, useMemo, useRef, useState } from "react";

export interface NoGrafo {
  id: string;
  rotulo: string;
  cor: string;
  /** Desenhado tracejado e apagado (ex.: lore que só o mestre vê). */
  oculto?: boolean;
}

export interface ArestaGrafo {
  id: string;
  origem: string;
  destino: string;
  rotulo?: string;
  oculta?: boolean;
}

interface No extends SimulationNodeDatum, NoGrafo {
  grau: number;
}
interface Aresta extends SimulationLinkDatum<No> {
  id: string;
  rotulo?: string;
  oculta?: boolean;
}

interface Props {
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
  selecionado?: string | null;
  aoSelecionar?: (id: string | null) => void;
  escuro?: boolean;
  altura?: number | string;
}


/**
 * Grafo de conexões com física (d3-force), desenhado em SVG.
 * Arraste o fundo para mover, a roda (ou pinça) para dar zoom, arraste um ponto para soltá-lo noutro lugar.
 */
export function Grafo({ nos, arestas, selecionado, aoSelecionar, escuro, altura = 560 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<Simulation<No, Aresta> | null>(null);
  const nosRef = useRef<Map<string, No>>(new Map());
  const [, setQuadro] = useState(0);
  const [vista, setVista] = useState({ x: 0, y: 0, k: 1 });
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  const [sobre, setSobre] = useState<string | null>(null);
  // o desenho usa o tamanho real da caixa (no celular ela é alta e estreita)
  const [tam, setTam] = useState({ w: 900, h: 640 });
  const tamRef = useRef(tam);
  tamRef.current = tam;
  const LARGURA = tam.w;
  const ALTURA = tam.h;
  const enquadrou = useRef(false);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setTam({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // reaproveita posições anteriores para o grafo não "explodir" a cada mudança
  const { listaNos, listaArestas } = useMemo(() => {
    const ids = new Set(nos.map((n) => n.id));
    const grau = new Map<string, number>();
    const validas = arestas.filter((a) => ids.has(a.origem) && ids.has(a.destino));
    for (const a of validas) {
      grau.set(a.origem, (grau.get(a.origem) ?? 0) + 1);
      grau.set(a.destino, (grau.get(a.destino) ?? 0) + 1);
    }
    const antigos = nosRef.current;
    const listaNos: No[] = nos.map((n, i) => {
      const a = antigos.get(n.id);
      const ang = (i / Math.max(1, nos.length)) * Math.PI * 2;
      return {
        ...n,
        grau: grau.get(n.id) ?? 0,
        x: a?.x ?? tamRef.current.w / 2 + Math.cos(ang) * 200,
        y: a?.y ?? tamRef.current.h / 2 + Math.sin(ang) * 200,
        vx: a?.vx,
        vy: a?.vy,
      };
    });
    const mapa = new Map(listaNos.map((n) => [n.id, n]));
    nosRef.current = mapa;
    const listaArestas: Aresta[] = validas.map((a) => ({
      id: a.id,
      source: mapa.get(a.origem)!,
      target: mapa.get(a.destino)!,
      rotulo: a.rotulo,
      oculta: a.oculta,
    }));
    return { listaNos, listaArestas };
  }, [nos, arestas]);

  useEffect(() => {
    const reduzir = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sim = forceSimulation<No>(listaNos)
      .force("link", forceLink<No, Aresta>(listaArestas).id((d) => d.id).distance(90).strength(0.35))
      .force("carga", forceManyBody<No>().strength(-260))
      .force("centro", forceCenter(LARGURA / 2, ALTURA / 2))
      .force("x", forceX<No>(LARGURA / 2).strength(0.04))
      .force("y", forceY<No>(ALTURA / 2).strength(0.06))
      .force("colisao", forceCollide<No>().radius((d) => raio(d) + 14))
      .alpha(simRef.current ? 0.5 : 1);
    if (reduzir) {
      sim.stop();
      for (let i = 0; i < 300; i++) sim.tick();
      setQuadro((q) => q + 1);
      if (!enquadrou.current) {
        enquadrou.current = true;
        enquadrarRef.current();
      }
    } else {
      sim.on("tick", () => {
        setQuadro((q) => q + 1);
        // na primeira vez que assenta, enquadra tudo na caixa
        if (!enquadrou.current && sim.alpha() < 0.08) {
          enquadrou.current = true;
          enquadrarRef.current();
        }
      });
    }
    simRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [listaNos, listaArestas, LARGURA, ALTURA]);

  // ------------------------------------------------------------------ interação
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<
    | { tipo: "mover"; x0: number; y0: number; vx: number; vy: number; moveu: boolean }
    | { tipo: "no"; no: No; moveu: boolean; x0: number; y0: number }
    | { tipo: "pinca"; d0: number; k0: number; cx: number; cy: number; vx: number; vy: number }
    | null
  >(null);

  function ponto(ev: { clientX: number; clientY: number }) {
    const r = svgRef.current!.getBoundingClientRect();
    const { w, h } = tamRef.current;
    return { x: ((ev.clientX - r.left) * w) / r.width, y: ((ev.clientY - r.top) * h) / r.height };
  }
  function noMundo(p: { x: number; y: number }) {
    const v = vistaRef.current;
    return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k };
  }

  function aoApertar(ev: React.PointerEvent<SVGSVGElement>) {
    svgRef.current!.setPointerCapture(ev.pointerId);
    const p = ponto(ev);
    ponteiros.current.set(ev.pointerId, p);
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      gesto.current = {
        tipo: "pinca",
        d0: Math.hypot(a.x - b.x, a.y - b.y),
        k0: vista.k,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        vx: vista.x,
        vy: vista.y,
      };
      return;
    }
    const alvo = (ev.target as Element).closest("[data-no]")?.getAttribute("data-no");
    const no = alvo ? nosRef.current.get(alvo) : undefined;
    if (no) {
      no.fx = no.x;
      no.fy = no.y;
      gesto.current = { tipo: "no", no, moveu: false, x0: p.x, y0: p.y };
    } else {
      gesto.current = { tipo: "mover", x0: p.x, y0: p.y, vx: vista.x, vy: vista.y, moveu: false };
    }
  }

  function aoMover(ev: React.PointerEvent<SVGSVGElement>) {
    if (!ponteiros.current.has(ev.pointerId)) return;
    const p = ponto(ev);
    ponteiros.current.set(ev.pointerId, p);
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === "pinca" && ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      const k = limitar((g.k0 * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, g.d0));
      const mx = (g.cx - g.vx) / g.k0;
      const my = (g.cy - g.vy) / g.k0;
      setVista({ k, x: (a.x + b.x) / 2 - mx * k, y: (a.y + b.y) / 2 - my * k });
    } else if (g.tipo === "mover") {
      if (Math.hypot(p.x - g.x0, p.y - g.y0) > 4) g.moveu = true;
      setVista((v) => ({ ...v, x: g.vx + p.x - g.x0, y: g.vy + p.y - g.y0 }));
    } else if (g.tipo === "no") {
      if (Math.hypot(p.x - g.x0, p.y - g.y0) > 4) {
        if (!g.moveu) simRef.current?.alphaTarget(0.25).restart();
        g.moveu = true;
      }
      if (g.moveu) {
        const m = noMundo(p);
        g.no.fx = m.x;
        g.no.fy = m.y;
        if (!simRef.current || simRef.current.alpha() < 0.01) setQuadro((q) => q + 1);
      }
    }
  }

  function aoSoltar(ev: React.PointerEvent<SVGSVGElement>) {
    ponteiros.current.delete(ev.pointerId);
    const g = gesto.current;
    if (g?.tipo === "pinca") {
      gesto.current = null;
      return;
    }
    if (g?.tipo === "no") {
      simRef.current?.alphaTarget(0);
      if (!g.moveu) {
        g.no.fx = null;
        g.no.fy = null;
        aoSelecionar?.(g.no.id === selecionado ? null : g.no.id);
      }
      // arrastado: fica preso onde foi solto (duplo clique solta)
    } else if (g?.tipo === "mover" && !g.moveu) {
      aoSelecionar?.(null);
    }
    gesto.current = null;
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function roda(ev: WheelEvent) {
      ev.preventDefault();
      const p = ponto(ev);
      setVista((v) => {
        const k = limitar(v.k * Math.exp(-ev.deltaY * 0.0015));
        return { k, x: p.x - ((p.x - v.x) / v.k) * k, y: p.y - ((p.y - v.y) / v.k) * k };
      });
    }
    svg.addEventListener("wheel", roda, { passive: false });
    return () => svg.removeEventListener("wheel", roda);
  }, []);

  function zoom(f: number) {
    setVista((v) => {
      const k = limitar(v.k * f);
      const cx = LARGURA / 2;
      const cy = ALTURA / 2;
      return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
    });
  }

  const enquadrarRef = useRef(() => {});
  enquadrarRef.current = enquadrar;
  function enquadrar() {
    if (!listaNos.length) return setVista({ x: 0, y: 0, k: 1 });
    const xs = listaNos.map((n) => n.x ?? 0);
    const ys = listaNos.map((n) => n.y ?? 0);
    const [x0, x1, y0, y1] = [Math.min(...xs) - 70, Math.max(...xs) + 70, Math.min(...ys) - 30, Math.max(...ys) + 40];
    const k = limitar(Math.min(1.6, LARGURA / (x1 - x0), ALTURA / (y1 - y0)));
    setVista({ k, x: LARGURA / 2 - ((x0 + x1) / 2) * k, y: ALTURA / 2 - ((y0 + y1) / 2) * k });
  }

  // ------------------------------------------------------------------ desenho
  const foco = sobre ?? selecionado ?? null;
  const vizinhos = useMemo(() => {
    if (!foco) return null;
    const s = new Set([foco]);
    for (const a of listaArestas) {
      const o = (a.source as No).id;
      const d = (a.target as No).id;
      if (o === foco) s.add(d);
      if (d === foco) s.add(o);
    }
    return s;
  }, [foco, listaArestas]);

  // longe demais, só os pontos com mais ligações (e os do foco) mostram o nome, para não virar borrão
  function mostrarRotulo(n: No) {
    if (vizinhos?.has(n.id)) return true;
    if (vista.k >= 0.7 || listaNos.length <= 25) return !vizinhos;
    return !vizinhos && n.grau >= 4;
  }

  const c = escuro
    ? { texto: "#e6dcc4", contorno: "#0e1a30", linha: "rgba(226,194,119,.32)", linhaForte: "#e2c277", fundoRotulo: "#0e1a30", sel: "#e2c277" }
    : { texto: "#1c1409", contorno: "#f3e8cc", linha: "rgba(126,97,24,.45)", linhaForte: "#7e6118", fundoRotulo: "#f6eed8", sel: "#12284a" };

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label={`Grafo de conexões com ${listaNos.length} entradas`}
        className="block w-full touch-none select-none"
        style={{ height: altura, cursor: gesto.current?.tipo === "mover" ? "grabbing" : "grab" }}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
          {listaArestas.map((a) => {
            const s = a.source as No;
            const t = a.target as No;
            const ativa = vizinhos ? vizinhos.has(s.id) && vizinhos.has(t.id) && (s.id === foco || t.id === foco) : false;
            return (
              <line
                key={a.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={ativa ? c.linhaForte : c.linha}
                strokeWidth={(ativa ? 1.8 : 1) / Math.sqrt(vista.k)}
                strokeDasharray={a.oculta ? "4 4" : undefined}
                opacity={vizinhos && !ativa ? 0.25 : 1}
              />
            );
          })}
          {listaNos.map((n) => {
            const r = raio(n);
            const apagado = vizinhos && !vizinhos.has(n.id);
            const sel = n.id === selecionado;
            return (
              <g
                key={n.id}
                data-no={n.id}
                transform={`translate(${n.x} ${n.y})`}
                opacity={apagado ? 0.28 : n.oculto ? 0.75 : 1}
                style={{ cursor: "pointer" }}
                onPointerEnter={() => setSobre(n.id)}
                onPointerLeave={() => setSobre((s) => (s === n.id ? null : s))}
                onDoubleClick={() => {
                  n.fx = null;
                  n.fy = null;
                  simRef.current?.alpha(0.3).restart();
                }}
              >
                {sel && <circle r={r + 6} fill="none" stroke={c.sel} strokeWidth={2} />}
                <circle
                  r={r}
                  fill={n.oculto ? c.contorno : n.cor}
                  stroke={n.oculto ? n.cor : c.contorno}
                  strokeWidth={n.oculto ? 2 : 1.5}
                  strokeDasharray={n.oculto ? "3 2" : undefined}
                />
              </g>
            );
          })}
        </g>
      </svg>
      {/* Nomes em HTML por cima do desenho: legíveis também quando o celular força o modo escuro */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {listaArestas.map((a) => {
          const s0 = a.source as No;
          const t0 = a.target as No;
          if (!a.rotulo || !foco || (s0.id !== foco && t0.id !== foco)) return null;
          const x = (((s0.x ?? 0) + (t0.x ?? 0)) / 2) * vista.k + vista.x;
          const y = (((s0.y ?? 0) + (t0.y ?? 0)) / 2) * vista.k + vista.y;
          return (
            <span
              key={`r${a.id}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm px-1 text-[0.8rem] italic leading-tight ${escuro ? "bg-noite/80 text-nevoa" : "bg-pergaminho-claro/85 text-tinta"}`}
              style={{ left: x, top: y }}
            >
              {a.rotulo}
            </span>
          );
        })}
        {listaNos.map((n) => {
          if (!mostrarRotulo(n)) return null;
          const apagado = vizinhos && !vizinhos.has(n.id);
          const x = (n.x ?? 0) * vista.k + vista.x;
          const y = (n.y ?? 0) * vista.k + vista.y + raio(n) * vista.k + 3;
          const forte = n.id === selecionado || n.id === sobre;
          return (
            <span
              key={`n${n.id}`}
              className={`absolute -translate-x-1/2 whitespace-nowrap rounded-sm px-1 text-[0.86rem] leading-tight ${
                escuro ? "bg-noite/70 text-nevoa" : "bg-pergaminho-claro/75 text-tinta"
              } ${forte ? "font-semibold" : ""}`}
              style={{ left: x, top: y, opacity: apagado ? 0.35 : 1 }}
            >
              {n.rotulo.length > 24 ? n.rotulo.slice(0, 23) + "…" : n.rotulo}
            </span>
          );
        })}
      </div>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {[
          { r: "Aproximar", t: "+", f: () => zoom(1.3) },
          { r: "Afastar", t: "−", f: () => zoom(1 / 1.3) },
          { r: "Enquadrar tudo", t: "⤢", f: enquadrar },
        ].map((b) => (
          <button
            key={b.r}
            onClick={b.f}
            aria-label={b.r}
            title={b.r}
            className={`grid h-9 w-9 place-items-center rounded-sm border text-lg leading-none ${
              escuro ? "border-ouro/30 bg-noite-2/90 text-ouro-claro" : "border-ouro-escuro/40 bg-pergaminho-claro/95 text-marinho"
            }`}
          >
            {b.t}
          </button>
        ))}
      </div>
    </div>
  );
}

function raio(n: No) {
  return 7 + Math.min(10, Math.sqrt(n.grau) * 2.6);
}
function limitar(k: number) {
  return Math.min(4, Math.max(0.25, k));
}
