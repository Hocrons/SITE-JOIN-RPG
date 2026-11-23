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
}

export function BarraStatus({ rotulo, atual, max, cor, editavel, escuro, compacto, onDelta, onDefinir }: Props) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const nivel = alerta(atual, max);

  const fundoTrilho = escuro ? "bg-white/10" : "bg-tinta/10";
  const botao = escuro
    ? "border-ouro/40 text-ouro-claro hover:bg-ouro/10"
    : "border-ouro-escuro/40 text-marinho hover:bg-ouro/15";

  return (
    <div className={nivel !== "ok" ? "rounded-md alerta-pulsando" : ""}>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="titulo font-bold">{rotulo}</span>
        {editando ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(valor, 10);
              if (!Number.isNaN(n)) onDefinir(n);
              setEditando(false);
            }}
            className="flex items-center gap-1"
          >
            <input
              autoFocus
              inputMode="numeric"
              className={`w-16 rounded border px-1 text-right ${escuro ? "border-ouro/40 bg-noite text-white" : "border-ouro-escuro/40 bg-white"}`}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onBlur={() => setEditando(false)}
            />
            <span className="tabular-nums">/ {max}</span>
          </form>
        ) : (
          <button
            type="button"
            disabled={!editavel}
            onClick={() => {
              setValor(String(atual));
              setEditando(true);
            }}
            className="tabular-nums disabled:cursor-default"
            title={editavel ? "Toque para digitar o valor" : undefined}
          >
            <b className={nivel === "zerado" ? "text-pv" : ""}>{atual}</b> / {max}
          </button>
        )}
      </div>
      <div className={`h-3 overflow-hidden rounded-full ${fundoTrilho}`}>
        <div className={`h-full ${cor} transition-all duration-300`} style={{ width: `${pct(atual, max)}%` }} />
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
    </div>
  );
}
