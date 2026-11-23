"use client";

import { useState } from "react";
import { alerta, pct } from "@/lib/regras";

/** Palavras do próprio sistema para cada estado crítico. */
const ROTULO_ZERADO: Record<string, string> = { PV: "Morrendo", SAN: "Enlouquecendo", PE: "Sem PE", PD: "Sem PD" };

interface Props {
  rotulo: string;
  nomeCompleto: string;      // para leitores de tela: "Pontos de Vida"
  atual: number;
  max: number;
  cor: string;               // classe de fundo, ex.: "bg-pv"
  editavel: boolean;
  /** "grande" = ficha do próprio jogador; "painel" = Escudo; "mini" = linha de companheiro */
  densidade?: "grande" | "painel" | "mini";
  onDelta?: (delta: number) => void;
  onDefinir?: (valor: number) => void;
  /** PV temporário (só na barra de PV). Fica acima do máximo, com visual dourado. */
  temp?: number;
  onDefinirTemp?: (valor: number) => void;
}

export function BarraStatus({
  rotulo, nomeCompleto, atual, max, cor, editavel, densidade = "grande",
  onDelta, onDefinir, temp, onDefinirTemp,
}: Props) {
  const [editando, setEditando] = useState<null | "atual" | "temp">(null);
  const [valor, setValor] = useState("");
  const nivel = alerta(atual, max);
  const t = temp ?? 0;
  const aceitaTemp = temp !== undefined && !!onDefinirTemp;

  const escala = Math.max(max, atual) + t;
  const larguraAtual = t > 0 ? pct(atual, escala) : pct(atual, max);
  const larguraTemp = t > 0 ? pct(t, escala) : 0;
  const posMax = t > 0 ? pct(max, escala) : 100;

  const trilho = (
    <div
      className="trilho"
      role="meter"
      aria-label={nomeCompleto}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={atual}
      style={densidade === "mini" ? { height: 6 } : undefined}
    >
      <div className={`preenchimento ${cor}`} style={{ width: `${larguraAtual}%` }} />
      {t > 0 && (
        <>
          <div className="trilha-temp absolute inset-y-0" style={{ left: `${larguraAtual}%`, width: `${larguraTemp}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-white/85" style={{ left: `calc(${posMax}% - 1px)` }} />
        </>
      )}
    </div>
  );

  if (densidade === "mini") {
    return (
      <div className="min-w-0">
        <div className="mb-0.5 flex items-baseline justify-between gap-1 text-[0.8rem] leading-none">
          <span className="titulo">{rotulo}</span>
          <span className={`numeros ${nivel !== "ok" ? "text-pv" : "opacity-80"}`}>
            {atual}
            {t > 0 && <span className="text-ouro-escuro">+{t}</span>}
          </span>
        </div>
        {trilho}
      </div>
    );
  }

  function abrir(qual: "atual" | "temp") {
    setValor(String(qual === "atual" ? atual : t));
    setEditando(qual);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(valor, 10);
    if (!Number.isNaN(n)) {
      if (editando === "temp") onDefinirTemp?.(Math.max(0, n));
      else onDefinir?.(n);
    }
    setEditando(null);
  }

  const grande = densidade === "grande";
  const inputCls = `numeros w-16 rounded-sm border px-1 text-right ${
    grande ? "border-ouro-escuro/50 bg-white/70 text-xl" : "border-ouro/40 bg-noite text-nevoa"
  }`;

  return (
    <div className={t > 0 ? "escudo-temp rounded-sm" : ""}>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className={`titulo ${grande ? "text-lg" : "text-sm"}`} title={nomeCompleto}>
            {rotulo}
          </span>
          {nivel === "zerado" && <span className="etiqueta-alerta">{ROTULO_ZERADO[rotulo] ?? "Zerado"}</span>}
          {!grande && editavel && aceitaTemp && t === 0 && editando !== "temp" && (
            <button
              type="button"
              onClick={() => abrir("temp")}
              title="Dar PV temporário"
              className="text-xs italic text-nevoa/45 underline decoration-dotted underline-offset-2 hover:text-ouro-claro"
            >
              + temp.
            </button>
          )}
          {nivel === "baixo" && t === 0 && (
            <span className={`text-sm italic ${grande ? "text-pv" : "text-[#e0897f]"}`}>baixo</span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          {t > 0 && editando !== "temp" && (
            <button
              type="button"
              disabled={!editavel}
              onClick={() => abrir("temp")}
              className="selo-temp numeros"
              title="PV temporário, acima do máximo"
            >
              +{t} temp.
            </button>
          )}
          {editando ? (
            <form onSubmit={salvar} className="flex items-baseline gap-1">
              {editando === "temp" && <span className="text-sm italic">temporário</span>}
              <input
                autoFocus
                inputMode="numeric"
                aria-label={editando === "temp" ? "PV temporário" : `${nomeCompleto} atual`}
                className={inputCls}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                onBlur={() => setEditando(null)}
              />
              {editando === "atual" && <span className="numeros opacity-70">/ {max}</span>}
            </form>
          ) : (
            <button
              type="button"
              disabled={!editavel}
              onClick={() => abrir("atual")}
              className="numeros leading-none disabled:cursor-default"
              title={editavel ? "Toque para digitar o valor" : undefined}
            >
              <span className={`${grande ? "text-[1.7rem]" : "text-xl"} ${nivel !== "ok" ? (grande ? "text-pv" : "text-[#e0897f]") : ""}`}>
                {atual}
              </span>
              <span className={`${grande ? "text-base" : "text-sm"} opacity-60`}> / {max}</span>
            </button>
          )}
        </div>
      </div>

      {trilho}

      {editavel && onDelta && (
        <div className={`segmentos ajuste ${grande ? "mt-2.5" : "mt-2"}`} role="group" aria-label={`Ajustar ${nomeCompleto}`}>
          {[-5, -1, +1, +5].map((d) => (
            <button key={d} type="button" onClick={() => onDelta(d)} aria-label={`${d > 0 ? "+" : ""}${d} ${rotulo}`}>
              {d > 0 ? `+${d}` : `−${Math.abs(d)}`}
            </button>
          ))}
        </div>
      )}
      {grande && editavel && aceitaTemp && t === 0 && editando !== "temp" && (
        <button
          type="button"
          onClick={() => abrir("temp")}
          className="mt-1.5 text-sm italic text-tinta-suave underline decoration-dotted underline-offset-2"
        >
          dar PV temporário
        </button>
      )}
    </div>
  );
}
