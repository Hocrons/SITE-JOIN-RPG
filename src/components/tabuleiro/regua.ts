"use client";

import { useMemo, useRef, useState } from "react";
import type { Cena } from "@/lib/cenas";
import type { Ponto, Regua } from "@/lib/sinais";
import type { Ferramenta } from "./Tabuleiro";

/** Centro do quadrado onde o ponto está. */
export function centroDoQuadrado(cena: Cena, p: Ponto): Ponto {
  const s = cena.grade_tamanho;
  return {
    x: cena.grade_x + (Math.floor((p.x - cena.grade_x) / s) + 0.5) * s,
    y: cena.grade_y + (Math.floor((p.y - cena.grade_y) / s) + 0.5) * s,
  };
}

/**
 * Régua: arraste de um quadrado a outro. A medida vai para todos enquanto você
 * arrasta e some pouco depois de soltar.
 */
export function useFerramentaRegua(
  cena: Cena | null | undefined,
  ativa: boolean,
  eu: { nome: string; cor: string },
  transmitir: (r: { de: Ponto; ate: Ponto } | null) => void,
) {
  const [regua, setRegua] = useState<{ de: Ponto; ate: Ponto } | null>(null);
  const some = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ferramenta = useMemo<Ferramenta | null>(() => {
    if (!ativa || !cena) return null;
    return {
      cursor: "crosshair",
      inicio: (p) => {
        if (some.current) clearTimeout(some.current);
        const c = centroDoQuadrado(cena, p);
        setRegua({ de: c, ate: c });
      },
      mover: (p, apertado) => {
        if (!apertado) return;
        setRegua((r) => {
          if (!r) return r;
          const n = { de: r.de, ate: centroDoQuadrado(cena, p) };
          if (n.ate.x !== r.ate.x || n.ate.y !== r.ate.y) transmitir(n);
          return n;
        });
      },
      fim: () => {
        // a medida fica um instante na tela e depois some (para todos)
        some.current = setTimeout(() => {
          setRegua(null);
          transmitir(null);
        }, 2500);
      },
    };
  }, [ativa, cena, transmitir]);

  const minha: Regua | null = regua ? { ...regua, cor: eu.cor, nome: eu.nome } : null;
  return { ferramenta, minha };
}
