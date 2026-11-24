"use client";

import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group, Image as KImage, Label, Layer, Line, Rect, Shape, Stage, Tag, Text } from "react-konva";
import type { Cena } from "@/lib/cenas";
import { useUrlArquivo } from "@/lib/quadro";
import { DURACAO_PING, quadradosEntre, type Ping, type Ponto, type Regua } from "@/lib/sinais";
import { BotaoMapa } from "./BotaoMapa";
import { CamadaTokens, type PropsCamadaTokens } from "./CamadaTokens";

export interface Vista {
  x: number;
  y: number;
  k: number;
}

export interface PontoMundo {
  x: number;
  y: number;
}
export interface Ferramenta {
  cursor: string;
  inicio: (p: PontoMundo) => void;
  /** `pressionado` = com o botão/dedo apertado; sem ele, é só o cursor passando. */
  mover: (p: PontoMundo, pressionado: boolean) => void;
  fim: (p: PontoMundo | null) => void;
  /** Prévia (em coordenadas do mapa), por cima de tudo. */
  previa?: {
    circulo?: { x: number; y: number; r: number } | null;
    retangulo?: { x: number; y: number; w: number; h: number } | null;
    cor: string;
  };
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
  /** Tokens da cena (desenhados acima do mapa e da grade). */
  tokens?: Omit<PropsCamadaTokens, "cena" | "k">;
  /** Ferramenta ativa (névoa, régua…): o arrasto no mapa vai para ela em vez de mover a vista. */
  ferramenta?: Ferramenta | null;
  /** Máscara de névoa (opaco = coberto), desenhada acima do mapa e abaixo dos tokens. */
  nevoa?: { canvas: HTMLCanvasElement; versao: number; opacidade: number } | null;
  /** Pings e réguas (de todos) para desenhar. */
  pings?: Ping[];
  reguas?: Regua[];
  /** Segurar parado sobre o mapa dispara um ping. */
  onPing?: (p: Ponto) => void;
  /** Faixa por cima do mapa (ex.: de quem é a vez). */
  faixa?: React.ReactNode;
  /** Centraliza a vista neste ponto (px do mapa) sempre que `n` mudar. */
  foco?: { x: number; y: number; n: number } | null;
  /** Clique/toque no mapa fora de qualquer token. */
  onClicarFundo?: () => void;
  /** Informa a vista atual (para saber o centro da tela). */
  onVista?: (v: Vista, tela: { w: number; h: number }) => void;
}

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 6;
const limitar = (k: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k));

/**
 * Tabuleiro em canvas (Konva). Unidades do mundo = pixels do mapa original.
 * Abre pelo mapa leve e, no computador, troca pelo otimizado quando ele chega.
 */
export function Tabuleiro({ cena, modo = "navegar", onAlinhar, altura = "70dvh", camadas, extras, onClicarFundo, onVista, tokens, foco, ferramenta, nevoa, pings, reguas, onPing, faixa }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const [vista, setVista] = useState<Vista>({ x: 0, y: 0, k: 0.2 });
  const [telaCheia, setTelaCheia] = useState(false);
  const imagem = useImagemMapa(cena);
  const largura = cena.mapa_largura ?? 0;
  const alturaMapa = cena.mapa_altura ?? 0;
  const enquadradoPara = useRef<string | null>(null);

  const onVistaRef = useRef(onVista);
  onVistaRef.current = onVista;
  useEffect(() => {
    onVistaRef.current?.(vista, tam);
  }, [vista, tam]);

  const focoN = foco?.n;
  useEffect(() => {
    if (!foco || !tam.w) return;
    setVista((v) => {
      const k = Math.max(v.k, 0.6);
      return { k, x: tam.w / 2 - foco.x * k, y: tam.h / 2 - foco.y * k };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focoN]);

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

  // ferramenta: ignora quando há dois dedos (é pinça)
  const pressionado = useRef(false);
  function ferInicio(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!ferramenta) return;
    if ("touches" in e.evt && e.evt.touches.length > 1) {
      if (pressionado.current) ferramenta.fim(null);
      pressionado.current = false;
      return;
    }
    if ("button" in e.evt && e.evt.button !== 0) return;
    const m = mundo();
    if (!m) return;
    pressionado.current = true;
    ferramenta.inicio(m);
  }
  function ferMover(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!ferramenta) return;
    if ("touches" in e.evt && e.evt.touches.length > 1) return;
    const m = mundo();
    if (m) ferramenta.mover(m, pressionado.current);
  }
  function ferFim() {
    if (!ferramenta || !pressionado.current) return;
    pressionado.current = false;
    ferramenta.fim(mundo());
  }

  // segurar parado ~0,5 s = ping (se mexer, é arrasto do mapa e cancela)
  const segurar = useRef<{ t: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  function segurarInicio(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    cancelarSegurar();
    if (!onPing || ferramenta || modo !== "navegar") return;
    if ("touches" in e.evt && e.evt.touches.length > 1) return;
    if ("button" in e.evt && e.evt.button !== 0) return;
    const tela = stageRef.current?.getPointerPosition();
    const m = mundo();
    if (!tela || !m) return;
    segurar.current = {
      x: tela.x,
      y: tela.y,
      t: setTimeout(() => {
        segurar.current = null;
        const st = stageRef.current;
        if (st?.isDragging()) st.stopDrag();
        onPing(m);
      }, 500),
    };
  }
  function segurarMover() {
    const s0 = segurar.current;
    const tela = stageRef.current?.getPointerPosition();
    if (s0 && tela && Math.hypot(tela.x - s0.x, tela.y - s0.y) > 8) cancelarSegurar();
  }
  function cancelarSegurar() {
    if (segurar.current) clearTimeout(segurar.current.t);
    segurar.current = null;
  }

  // a máscara da névoa é um canvas que muda por dentro: redesenha a camada
  const camadaNevoa = useRef<Konva.Layer>(null);
  useEffect(() => {
    camadaNevoa.current?.batchDraw();
  }, [nevoa?.versao, nevoa?.canvas]);

  const semMapa = !cena.mapa_caminho && !cena.mapa_leve_caminho;

  return (
    <div className={telaCheia ? "fixed inset-0 z-50 bg-breu" : "relative w-full min-w-0"}>
      <div
        ref={caixa}
        className="relative w-full overflow-hidden rounded-sm border border-ouro/25 bg-[#0d0c0e] touch-none select-none"
        style={{ height: telaCheia ? "100dvh" : altura, cursor: ferramenta ? ferramenta.cursor : modo === "alinhar" ? "crosshair" : "grab" }}
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
            draggable={modo === "navegar" && !ferramenta}
            onDragMove={(e) => {
              if (e.target === stageRef.current) setVista((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
            }}
            onDragEnd={(e) => {
              if (e.target === stageRef.current) setVista((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
            }}
            onWheel={aoRodar}
            onClick={(e) => {
              if (modo === "navegar" && !ferramenta && e.target === stageRef.current) onClicarFundo?.();
            }}
            onTap={(e) => {
              if (modo === "navegar" && e.target === stageRef.current) onClicarFundo?.();
            }}
            onTouchMove={(e) => {
              segurarMover();
              aoTocarMover(e);
            }}
            onMouseDown={(e) => {
              alinharInicio();
              ferInicio(e);
              segurarInicio(e);
            }}
            onTouchStart={(e) => {
              alinharInicio();
              ferInicio(e);
              segurarInicio(e);
            }}
            onMouseMove={(e) => {
              alinharMover();
              ferMover(e);
              segurarMover();
            }}
            onMouseUp={() => {
              alinharFim();
              ferFim();
              cancelarSegurar();
            }}
            onMouseLeave={() => {
              cancelarSegurar();
              ferFim();
              ferramenta?.mover({ x: -1e9, y: -1e9 }, false);
            }}
            onTouchEnd={() => {
              pinca.current = null;
              cancelarSegurar();
              alinharFim();
              ferFim();
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
            {nevoa && (
              <Layer ref={camadaNevoa} listening={false}>
                <KImage image={nevoa.canvas} x={0} y={0} width={largura} height={alturaMapa} opacity={nevoa.opacidade} />
              </Layer>
            )}
            {tokens && <CamadaTokens {...tokens} cena={cena} k={vista.k} />}
            {camadas?.(vista)}
            {(!!pings?.length || !!reguas?.length) && (
              <Layer listening={false}>
                {reguas?.map((r, i) => (
                  <DesenhoRegua key={i} r={r} k={vista.k} cena={cena} />
                ))}
                {!!pings?.length && <Pings pings={pings} k={vista.k} s={cena.grade_tamanho} />}
              </Layer>
            )}
            {ferramenta?.previa && (
              <Layer listening={false}>
                {ferramenta.previa.circulo && (
                  <Circle
                    x={ferramenta.previa.circulo.x}
                    y={ferramenta.previa.circulo.y}
                    radius={ferramenta.previa.circulo.r}
                    stroke={ferramenta.previa.cor}
                    strokeWidth={2}
                    strokeScaleEnabled={false}
                    dash={[6, 4]}
                  />
                )}
                {ferramenta.previa.retangulo && (
                  <Rect
                    {...{ x: ferramenta.previa.retangulo.x, y: ferramenta.previa.retangulo.y }}
                    width={ferramenta.previa.retangulo.w}
                    height={ferramenta.previa.retangulo.h}
                    stroke={ferramenta.previa.cor}
                    strokeWidth={2}
                    strokeScaleEnabled={false}
                    dash={[6, 4]}
                    fill={ferramenta.previa.cor + "26"}
                  />
                )}
              </Layer>
            )}
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

        {faixa && <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-center">{faixa}</div>}

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

function DesenhoRegua({ r, k, cena }: { r: Regua; k: number; cena: Cena }) {
  const q = quadradosEntre(r.de, r.ate, cena.grade_tamanho);
  const m = q * cena.metros_por_quadrado;
  const texto = `${q} ${q === 1 ? "quadrado" : "quadrados"} · ${m.toLocaleString("pt-BR")} m`;
  const px = (n: number) => n / k;
  return (
    <Group>
      <Line points={[r.de.x, r.de.y, r.ate.x, r.ate.y]} stroke="rgba(10,9,12,0.7)" strokeWidth={px(7)} lineCap="round" />
      <Line points={[r.de.x, r.de.y, r.ate.x, r.ate.y]} stroke={r.cor} strokeWidth={px(3)} lineCap="round" dash={[px(10), px(6)]} />
      <Circle x={r.de.x} y={r.de.y} radius={px(5)} fill={r.cor} stroke="#0d0c0e" strokeWidth={px(1.5)} />
      <Circle x={r.ate.x} y={r.ate.y} radius={px(6)} fill={r.cor} stroke="#0d0c0e" strokeWidth={px(1.5)} />
      <Label x={r.ate.x + px(12)} y={r.ate.y - px(12)}>
        <Tag fill="rgba(13,12,16,0.9)" stroke={r.cor} strokeWidth={px(1)} cornerRadius={px(3)} />
        <Text text={texto} fontSize={px(14)} padding={px(6)} fill="#f1e9d6" />
      </Label>
    </Group>
  );
}

/** Pings: três ondas que se abrem e somem. */
function Pings({ pings, k, s }: { pings: Ping[]; k: number; s: number }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    let id = 0;
    const passo = () => {
      setAgora(Date.now());
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, []);
  const base = Math.max(s * 0.6, 18 / k);
  return (
    <>
      {pings.map((p) => {
        const t = (agora - p.em) / DURACAO_PING;
        if (t < 0 || t > 1) return null;
        return (
          <Group key={p.id} x={p.x} y={p.y}>
            {[0, 0.18, 0.36].map((atraso) => {
              const u = Math.min(1, Math.max(0, (t - atraso) / (1 - atraso)));
              if (u <= 0) return null;
              return <Circle key={atraso} radius={base * (0.3 + u * 1.6)} stroke={p.cor} strokeWidth={4 / k} opacity={1 - u} />;
            })}
            <Circle radius={5 / k} fill={p.cor} opacity={1 - t} />
            {t < 0.75 && (
              <Text text={p.nome} x={10 / k} y={-22 / k} fontSize={13 / k} fill="#f1e9d6" shadowColor="#000" shadowBlur={4 / k} opacity={1 - t / 0.75} />
            )}
          </Group>
        );
      })}
    </>
  );
}
