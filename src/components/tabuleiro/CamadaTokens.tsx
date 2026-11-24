"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Circle, Ellipse, Group, Image as KImage, Layer, Rect, Text } from "react-konva";
import type { Cena } from "@/lib/cenas";
import { useUrlArquivo } from "@/lib/quadro";
import { fichaAtiva } from "@/lib/regras";
import { corFaccao, type Arrasto, type Token } from "@/lib/tokens";
import type { Ficha, Personagem } from "@/lib/tipos";

export interface PropsCamadaTokens {
  cena: Cena;
  tokens: Token[];
  k: number;
  arrasto: Arrasto;
  /** Personagens com status visíveis para quem está olhando (o banco já filtra). */
  personagens: Personagem[];
  fichas: Ficha[];
  podeMover: (t: Token) => boolean;
  selecionado?: string | null;
  destacado?: string | null;
  onSelecionar?: (t: Token) => void;
  onMover: (t: Token, coluna: number, linha: number) => void;
  onArrastar?: (t: Token, x: number, y: number, fim?: boolean) => void;
}

/** Camada dos tokens: imagem de corpo inteiro em pé sobre a base colorida pela facção. */
export function CamadaTokens(p: PropsCamadaTokens) {
  const s = p.cena.grade_tamanho;
  const larg = p.cena.mapa_largura ?? 0;
  const alt = p.cena.mapa_altura ?? 0;
  const porId = new Map(p.personagens.map((x) => [x.id, x]));
  return (
    <Layer>
      {p.tokens.map((t) => {
        const pers = t.personagem_id ? porId.get(t.personagem_id) : undefined;
        return (
          <NoToken
            key={t.id}
            t={t}
            s={s}
            gx={p.cena.grade_x}
            gy={p.cena.grade_y}
            limites={{ larg, alt }}
            k={p.k}
            remoto={p.arrasto[t.id]}
            personagem={pers}
            ficha={pers ? fichaAtiva(pers, p.fichas) : undefined}
            movel={p.podeMover(t)}
            selecionado={p.selecionado === t.id}
            destacado={p.destacado === t.id}
            onSelecionar={p.onSelecionar}
            onMover={p.onMover}
            onArrastar={p.onArrastar}
          />
        );
      })}
    </Layer>
  );
}

function NoToken({
  t,
  s,
  gx,
  gy,
  limites,
  k,
  remoto,
  personagem,
  ficha,
  movel,
  selecionado,
  destacado,
  onSelecionar,
  onMover,
  onArrastar,
}: {
  t: Token;
  s: number;
  gx: number;
  gy: number;
  limites: { larg: number; alt: number };
  k: number;
  remoto?: { x: number; y: number };
  personagem?: Personagem;
  ficha?: Ficha;
  movel: boolean;
  selecionado: boolean;
  destacado: boolean;
  onSelecionar?: (t: Token) => void;
  onMover: (t: Token, coluna: number, linha: number) => void;
  onArrastar?: (t: Token, x: number, y: number, fim?: boolean) => void;
}) {
  const lado = t.tamanho * s;
  const cor = corFaccao(t.faccao);
  const grupo = useRef<Konva.Group>(null);
  const [arrastando, setArrastando] = useState(false);
  const imagem = useImagem(t.imagem_caminho);
  const retrato = useImagem(t.imagem_caminho ? null : personagem?.foto_caminho);

  const xBanco = gx + t.coluna * s;
  const yBanco = gy + t.linha * s;
  // enquanto outra pessoa arrasta, mostra onde está a mão dela
  const x = !arrastando && remoto ? remoto.x : xBanco;
  const y = !arrastando && remoto ? remoto.y : yBanco;

  // a posição gravada mudou (ou a grade foi realinhada): reposiciona
  useEffect(() => {
    if (!arrastando) grupo.current?.position({ x, y });
  }, [x, y, arrastando]);

  const encaixar = (px: number, py: number) => {
    const maxC = Math.floor((limites.larg - gx) / s) - t.tamanho;
    const maxL = Math.floor((limites.alt - gy) / s) - t.tamanho;
    const minC = Math.ceil(-gx / s);
    const minL = Math.ceil(-gy / s);
    const c = Math.round((px - gx) / s);
    const l = Math.round((py - gy) / s);
    return {
      c: limites.larg ? Math.max(minC, Math.min(maxC, c)) : c,
      l: limites.alt ? Math.max(minL, Math.min(maxL, l)) : l,
    };
  };

  // tamanhos de tela (não crescem com o zoom)
  const px = (n: number) => n / k;
  const fonte = Math.max(px(11), Math.min(px(15), lado * 0.2));

  // corpo inteiro: largura do espaço, em pé na base, pode passar do quadrado para cima
  let figura: React.ReactNode = null;
  let topo = 0;
  if (imagem) {
    const prop = imagem.height / imagem.width;
    let w = lado * 0.96;
    let h = w * prop;
    if (h > lado * 1.9) {
      h = lado * 1.9;
      w = h / prop;
    }
    topo = lado * 0.92 - h;
    figura = (
      <KImage
        image={imagem}
        x={(lado - w) / 2}
        y={topo}
        width={w}
        height={h}
        shadowColor={cor}
        shadowBlur={px(destacado ? 14 : 7)}
        shadowOpacity={0.95}
        shadowForStrokeEnabled={false}
        perfectDrawEnabled={false}
      />
    );
  } else {
    // sem imagem: placa com o retrato do personagem ou as iniciais
    const m = lado * 0.1;
    const q = lado - 2 * m;
    topo = m;
    const crop = retrato ? recorteQuadrado(retrato) : undefined;
    figura = (
      <Group>
        <Rect x={m} y={m} width={q} height={q} cornerRadius={q * 0.12} fill="#1b1a20" stroke={cor} strokeWidth={px(2.5)} />
        {retrato ? (
          <Group clipFunc={(ctx) => ctx.roundRect?.(m + px(2), m + px(2), q - px(4), q - px(4), q * 0.1) ?? ctx.rect(m, m, q, q)}>
            <KImage image={retrato} x={m} y={m} width={q} height={q} crop={crop} perfectDrawEnabled={false} />
          </Group>
        ) : (
          <Text
            x={m}
            y={m}
            width={q}
            height={q}
            text={iniciais(t.nome)}
            align="center"
            verticalAlign="middle"
            fontFamily={fonteDe("titulo")}
            fontSize={q * 0.38}
            fill={cor}
          />
        )}
      </Group>
    );
  }

  // longe demais: só a figura (nome e barras virariam borrão em cima de tudo)
  const telaPx = lado * k;
  const barras = personagem && ficha && telaPx >= 18 ? montarBarras(personagem, ficha) : null;
  const comNome = telaPx >= 30 || selecionado || destacado;
  const yBarras = Math.min(topo, 0) - px(4) - (barras ? barras.length * px(6) : 0);

  return (
    <Group
      ref={grupo}
      x={x}
      y={y}
      opacity={t.oculto ? 0.55 : 1}
      draggable={movel}
      onMouseEnter={(e) => movel && (e.target.getStage()!.container().style.cursor = "grab")}
      onMouseLeave={(e) => (e.target.getStage()!.container().style.cursor = "")}
      onClick={() => onSelecionar?.(t)}
      onTap={() => onSelecionar?.(t)}
      onDragStart={(e) => {
        e.cancelBubble = true;
        setArrastando(true);
        grupo.current?.moveToTop();
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        onArrastar?.(t, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const { c, l } = encaixar(e.target.x(), e.target.y());
        const nx = gx + c * s;
        const ny = gy + l * s;
        e.target.position({ x: nx, y: ny });
        onArrastar?.(t, nx, ny, true);
        setArrastando(false);
        onMover(t, c, l);
      }}
    >
      {/* área que pega o clique/toque no espaço inteiro */}
      <Rect width={lado} height={lado} fill="rgba(0,0,0,0.001)" />
      {(selecionado || arrastando) && (
        <Rect width={lado} height={lado} stroke="#e2c277" strokeWidth={px(2)} dash={[px(6), px(4)]} fill="rgba(226,194,119,0.12)" />
      )}
      {destacado && <Rect width={lado} height={lado} stroke={cor} strokeWidth={px(3)} cornerRadius={px(4)} />}
      <Ellipse
        x={lado / 2}
        y={lado * 0.88}
        radiusX={lado * 0.42}
        radiusY={lado * 0.13}
        fill={cor}
        opacity={0.35}
        stroke={cor}
        strokeWidth={px(2)}
      />
      {figura}
      {t.oculto && <Rect width={lado} height={lado} stroke="#e8e2d4" strokeWidth={px(1.5)} dash={[px(3), px(3)]} listening={false} />}

      {barras &&
        barras.map((b, i) => (
          <Group key={b.id} x={lado * 0.05} y={yBarras + i * px(6)}>
            <Rect width={lado * 0.9} height={px(4.5)} fill="rgba(10,9,12,0.85)" cornerRadius={px(2)} />
            <Rect width={lado * 0.9 * b.frac} height={px(4.5)} fill={b.cor} cornerRadius={px(2)} />
          </Group>
        ))}
      {personagem?.ancora_ativa && telaPx >= 18 && (
        <Group x={lado - px(4)} y={yBarras - px(2)}>
          <Circle radius={px(9)} fill="#1a2440" stroke="#e2c277" strokeWidth={px(1.5)} />
          <Text text="⚓" fontSize={px(11)} x={-px(6)} y={-px(6.5)} width={px(12)} align="center" fill="#e2c277" />
        </Group>
      )}

      {comNome && (
        <Group x={lado / 2} y={lado * 0.98}>
          <Rect
            x={-medirTexto(t.nome, fonte) / 2 - px(5)}
            width={medirTexto(t.nome, fonte) + px(10)}
            height={fonte + px(5)}
            cornerRadius={px(3)}
            fill="rgba(13,12,16,0.82)"
            stroke={cor}
            strokeWidth={px(1)}
          />
          <Text
            x={-medirTexto(t.nome, fonte) / 2}
            y={px(2.5)}
            text={t.nome}
            fontSize={fonte}
            fontFamily={fonteDe("corpo")}
            fill="#f1e9d6"
          />
        </Group>
      )}
    </Group>
  );
}

function montarBarras(p: Personagem, f: Ficha) {
  const frac = (a: number, m: number) => (m > 0 ? Math.max(0, Math.min(1, a / m)) : 0);
  const pvMax = f.pv_max + 0;
  const l = [{ id: "pv", cor: "#d8262f", frac: frac(p.pv_atual + (p.pv_temp ?? 0), pvMax) }];
  if (p.usa_determinacao && f.pd_max) l.push({ id: "pd", cor: "#9c6ade", frac: frac(p.pd_atual ?? 0, f.pd_max) });
  else l.push({ id: "san", cor: "#4b7be5", frac: frac(p.san_atual, f.san_max) });
  if (!p.usa_determinacao) l.push({ id: "pe", cor: "#e0a92e", frac: frac(p.pe_atual, f.pe_max) });
  return l;
}

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const fontes: Record<string, string> = {};
/** As fontes do site (nomes gerados pelo next/font), para o canvas usar as mesmas. */
function fonteDe(tipo: "titulo" | "corpo") {
  if (fontes[tipo]) return fontes[tipo];
  if (typeof document === "undefined") return "Georgia, serif";
  let f = getComputedStyle(document.body).fontFamily;
  if (tipo === "titulo") {
    const el = document.querySelector(".titulo");
    if (el) f = getComputedStyle(el).fontFamily;
  }
  return (fontes[tipo] = f || "Georgia, serif");
}

let ctxMedida: CanvasRenderingContext2D | null = null;
function medirTexto(texto: string, fonte: number) {
  if (typeof document === "undefined") return texto.length * fonte * 0.5;
  ctxMedida ??= document.createElement("canvas").getContext("2d");
  if (!ctxMedida) return texto.length * fonte * 0.5;
  ctxMedida.font = `${fonte}px ${fonteDe("corpo")}`;
  return ctxMedida.measureText(texto).width;
}

function recorteQuadrado(img: HTMLImageElement) {
  const l = Math.min(img.width, img.height);
  return { x: (img.width - l) / 2, y: Math.max(0, (img.height - l) / 4), width: l, height: l };
}

/** Carrega uma imagem do Storage (cache de URL assinada compartilhado). */
function useImagem(caminho: string | null | undefined) {
  const url = useUrlArquivo(caminho ?? null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    let vivo = true;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => vivo && setImg(i);
    i.src = url;
    return () => {
      vivo = false;
    };
  }, [url]);
  return caminho ? img : null;
}
