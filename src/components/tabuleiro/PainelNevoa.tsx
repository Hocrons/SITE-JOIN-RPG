"use client";

import { useMemo, useRef, useState } from "react";
import type { Cena, DadosCenas } from "@/lib/cenas";
import type { DadosNevoa } from "@/lib/nevoa";
import type { Ferramenta, PontoMundo } from "./Tabuleiro";

export interface EstadoNevoa {
  forma: "pincel" | "retangulo";
  modo: "cobrir" | "revelar";
}

/**
 * Ferramenta de pintar a névoa no tabuleiro. O pincel pinta enquanto arrasta; o retângulo
 * aplica ao soltar. O envio ao servidor acontece logo depois de soltar.
 */
export function useFerramentaNevoa(nevoa: DadosNevoa, cena: Cena | undefined, estado: EstadoNevoa | null, raioQuadrados: number) {
  const [cursor, setCursor] = useState<PontoMundo | null>(null);
  const [ret, setRet] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const ultimo = useRef<PontoMundo | null>(null);
  const raio = (cena?.grade_tamanho ?? 70) * raioQuadrados;

  return useMemo<Ferramenta | null>(() => {
    if (!estado || !cena) return null;
    const cor = estado.modo === "revelar" ? "#e2c277" : "#e0414b";
    return {
      cursor: "crosshair",
      inicio: (p) => {
        if (estado.forma === "pincel") {
          ultimo.current = p;
          nevoa.pintar({ tipo: "pincel", modo: estado.modo, pontos: [p], raio }, false);
        } else setRet({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      },
      mover: (p, apertado) => {
        setCursor(p);
        if (!apertado) return;
        if (estado.forma === "pincel" && ultimo.current) {
          nevoa.pintar({ tipo: "pincel", modo: estado.modo, pontos: [ultimo.current, p], raio }, false);
          ultimo.current = p;
        } else if (estado.forma === "retangulo") setRet((r) => (r ? { ...r, x1: p.x, y1: p.y } : r));
      },
      fim: (p) => {
        if (estado.forma === "pincel") {
          const u = p ?? ultimo.current;
          if (u) nevoa.pintar({ tipo: "pincel", modo: estado.modo, pontos: [u], raio }, true);
          ultimo.current = null;
        } else {
          setRet((r) => {
            if (r && p) nevoa.pintar({ tipo: "retangulo", modo: estado.modo, x0: r.x0, y0: r.y0, x1: p.x, y1: p.y }, true);
            return null;
          });
        }
      },
      previa: {
        cor,
        circulo: estado.forma === "pincel" && cursor ? { x: cursor.x, y: cursor.y, r: raio } : null,
        retangulo: ret ? { x: Math.min(ret.x0, ret.x1), y: Math.min(ret.y0, ret.y1), w: Math.abs(ret.x1 - ret.x0), h: Math.abs(ret.y1 - ret.y0) } : null,
      },
    };
  }, [estado, cena, nevoa, raio, cursor, ret]);
}

const FERRAMENTAS: { id: string; estado: EstadoNevoa | null; nome: string; icone: string }[] = [
  { id: "mover", estado: null, nome: "Mover o mapa", icone: "M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" },
  { id: "rp", estado: { forma: "pincel", modo: "revelar" }, nome: "Revelar com pincel", icone: "M4 20c4 0 5-3 5-5l9-9 3 3-9 9c-2 0-5 1-5 5z" },
  { id: "cp", estado: { forma: "pincel", modo: "cobrir" }, nome: "Cobrir com pincel", icone: "M4 20c4 0 5-3 5-5l9-9 3 3-9 9c-2 0-5 1-5 5zM14 4l2-2" },
  { id: "rr", estado: { forma: "retangulo", modo: "revelar" }, nome: "Revelar área", icone: "M4 4h16v16H4z" },
  { id: "cr", estado: { forma: "retangulo", modo: "cobrir" }, nome: "Cobrir área", icone: "M4 4h16v16H4zM4 4l16 16M20 4L4 20" },
];

/** Painel da névoa: ligar/desligar, escolher a ferramenta, tamanho do pincel, cobrir ou revelar tudo. */
export function PainelNevoa({
  cena, dados, nevoa, estado, onEstado, raio, onRaio,
}: {
  cena: Cena;
  dados: DadosCenas;
  nevoa: DadosNevoa;
  estado: EstadoNevoa | null;
  onEstado: (e: EstadoNevoa | null) => void;
  raio: number;
  onRaio: (r: number) => void;
}) {
  const atual = FERRAMENTAS.find((f) => f.estado?.forma === estado?.forma && f.estado?.modo === estado?.modo) ?? FERRAMENTAS[0];

  if (!cena.mapa_largura) return <p className="text-sm text-nevoa/60">Envie o mapa da cena para usar a névoa.</p>;

  return (
    <div className="grid gap-4">
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="titulo block text-ouro-claro">Névoa nesta cena</span>
          <span className="text-sm text-nevoa/50">{cena.nevoa_ativa ? "Ligada: os jogadores não veem as áreas cobertas." : "Desligada: os jogadores veem o mapa todo."}</span>
        </span>
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-[#b8912f]"
          checked={cena.nevoa_ativa}
          onChange={(e) => {
            const ligar = e.target.checked;
            // primeira vez: começa tudo coberto, e o mestre vai revelando
            if (ligar && !cena.nevoa_caminho) nevoa.tudo("cobrir");
            dados.salvar(cena.id, { nevoa_ativa: ligar });
            if (ligar) onEstado({ forma: "pincel", modo: "revelar" });
            else onEstado(null);
          }}
        />
      </label>

      <section className="grid gap-2">
        <h3 className="titulo text-ouro-claro">Ferramenta</h3>
        <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Ferramenta da névoa">
          {FERRAMENTAS.map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={atual.id === f.id}
              aria-label={f.nome}
              title={f.nome}
              onClick={() => onEstado(f.estado)}
              className={`grid h-11 place-items-center rounded-sm border ${
                atual.id === f.id ? "border-ouro bg-ouro/90 text-marinho" : "border-ouro/25 text-ouro-claro hover:bg-ouro/10"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={f.icone} />
              </svg>
            </button>
          ))}
        </div>
        <p className="text-sm text-nevoa/70">{atual.nome}</p>
        {atual.estado?.forma === "pincel" && (
          <label className="grid gap-1 text-sm text-nevoa/70">
            <span>
              Tamanho do pincel: <span className="numeros text-nevoa">{raio.toLocaleString("pt-BR")}</span> quadrado{raio === 1 ? "" : "s"} de raio
            </span>
            <input type="range" min={0.5} max={10} step={0.5} value={raio} onChange={(e) => onRaio(Number(e.target.value))} className="accent-[#b8912f]" />
          </label>
        )}
        <p className="text-xs text-nevoa/50">No celular, use dois dedos para mover e dar zoom enquanto pinta.</p>
      </section>

      <section className="flex flex-wrap gap-2">
        <button
          onClick={() => confirm("Cobrir o mapa inteiro com névoa?") && nevoa.tudo("cobrir")}
          className="rounded-sm border border-ouro/30 px-3 py-1.5 text-sm text-ouro-claro hover:bg-ouro/10"
        >
          Cobrir tudo
        </button>
        <button
          onClick={() => confirm("Revelar o mapa inteiro?") && nevoa.tudo("revelar")}
          className="rounded-sm border border-ouro/30 px-3 py-1.5 text-sm text-ouro-claro hover:bg-ouro/10"
        >
          Revelar tudo
        </button>
        <span className="self-center text-sm text-nevoa/50" aria-live="polite">
          {nevoa.salvando ? "Salvando…" : ""}
        </span>
      </section>

      <p className="text-sm text-nevoa/50">
        Para você, a névoa aparece meio transparente. Os jogadores veem escuridão, e tokens que não são de agentes somem quando estão dentro dela.
      </p>
    </div>
  );
}
