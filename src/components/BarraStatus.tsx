"use client";

import { useState } from "react";
import { alerta, pct } from "@/lib/regras";

interface Props {
  rotulo: string;
  atual: number;
  max: number;
  cor: string;              // classe tailwind de fundo, ex.: "bg-pv"
  editavel: boolean;
  escuro?: boolean;
  compacto?: boolean;
  onDelta: (delta: number) => void;
  onDefinir: (valor: number) => void;
  /** PV temporário (só na barra de PV). Fica acima do máximo, com visual dourado. */
  temp?: number;
  onDefinirTemp?: (valor: number) => void;
}

export function BarraStatus({
  rotulo, atual, max, cor, editavel, escuro, compacto, onDelta, onDefinir, temp, onDefinirTemp,
}: Props) {
  const [editando, setEditando] = useState<null | "atual" | "temp">(null);
  const [valor, setValor] = useState("");
  const nivel = alerta(atual, max);
  const aceitaTemp = temp !== undefined && !!onDefinirTemp;
  const t = temp ?? 0;

  // Com PV temporário, a trilha cresce: escala = máximo + temporário.
  const escala = Math.max(max, atual) + t;
  const larguraAtual = t > 0 ? pct(atual, escala) : pct(atual, max);
  const larguraTemp = t > 0 ? pct(t, escala) : 0;
  const posMax = t > 0 ? pct(max, escala) : 100;

  const fundoTrilho = escuro ? "bg-white/10" : "bg-tinta/10";
  const botao = escuro
    ? "border-ouro/40 text-ouro-claro hover:bg-ouro/10"
    : "border-ouro-escuro/40 text-marinho hover:bg-ouro/15";
  const inputCls = `w-16 rounded border px-1 text-right ${
    escuro ? "border-ouro/40 bg-noite text-white" : "border-ouro-escuro/40 bg-white"
  }`;

  function abrir(qual: "atual" | "temp") {
    setValor(String(qual === "atual" ? atual : t));
    setEditando(qual);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(valor, 10);
    if (!Number.isNaN(n)) {
      if (editando === "temp") onDefinirTemp?.(Math.max(0, n));
      else onDefinir(n);
    }
    setEditando(null);
  }

  return (
    <div
      className={`rounded-md ${nivel !== "ok" && t === 0 ? "alerta-pulsando" : ""} ${
        t > 0 ? "escudo-temp -m-1.5 p-1.5" : ""
      }`}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="titulo font-bold">{rotulo}</span>
        <div className="flex items-baseline gap-2">
          {t > 0 && editando !== "temp" && (
            <button
              type="button"
              disabled={!editavel}
              onClick={() => abrir("temp")}
              className="selo-temp tabular-nums"
              title="PV temporário (acima do máximo). Toque para alterar."
            >
              +{t} temp.
            </button>
          )}
          {editando ? (
            <form onSubmit={salvar} className="flex items-center gap-1">
              {editando === "temp" && <span className="text-xs">temp.</span>}
              <input
                autoFocus
                inputMode="numeric"
                className={inputCls}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                onBlur={() => setEditando(null)}
              />
              {editando === "atual" && <span className="tabular-nums">/ {max}</span>}
            </form>
          ) : (
            <button
              type="button"
              disabled={!editavel}
              onClick={() => abrir("atual")}
              className="tabular-nums disabled:cursor-default"
              title={editavel ? "Toque para digitar o valor" : undefined}
            >
              <b className={nivel === "zerado" ? "text-pv" : ""}>{atual}</b> / {max}
            </button>
          )}
        </div>
      </div>

      <div className={`relative h-3 overflow-hidden rounded-full ${fundoTrilho}`}>
        <div className={`absolute inset-y-0 left-0 ${cor} transition-all duration-300`} style={{ width: `${larguraAtual}%` }} />
        {t > 0 && (
          <>
            <div
              className="trilha-temp absolute inset-y-0 transition-all duration-300"
              style={{ left: `${larguraAtual}%`, width: `${larguraTemp}%` }}
            />
            {/* marca onde fica o máximo normal */}
            <div className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: `calc(${posMax}% - 1px)` }} />
          </>
        )}
      </div>

      {editavel && !compacto && (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {[-5, -1, +1, +5].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDelta(d)}
              className={`rounded border py-2 text-sm font-semibold tabular-nums active:scale-95 ${botao}`}
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      )}
      {editavel && !compacto && aceitaTemp && t === 0 && editando !== "temp" && (
        <button type="button" onClick={() => abrir("temp")} className="mt-1.5 text-xs underline opacity-70">
          + PV temporário
        </button>
      )}
    </div>
  );
}
