"use client";

import { useTema, type PreferenciaTema } from "@/lib/tema";

const ORDEM: PreferenciaTema[] = ["auto", "claro", "escuro"];
const NOME: Record<PreferenciaTema, string> = { auto: "Tema automático", claro: "Tema claro", escuro: "Tema escuro" };

/** Botão que alterna o tema: automático → claro → escuro. */
export function SeletorTema() {
  const { pref, mudar } = useTema();
  const prox = ORDEM[(ORDEM.indexOf(pref) + 1) % ORDEM.length];
  return (
    <button
      onClick={() => mudar(prox)}
      className="grid h-8 w-8 place-items-center rounded-full border border-ouro-escuro/40 text-tinta-suave"
      title={`${NOME[pref]}. Toque para ${NOME[prox].toLowerCase()}.`}
      aria-label={`${NOME[pref]}. Mudar para ${NOME[prox].toLowerCase()}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        {pref === "claro" ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
          </>
        ) : pref === "escuro" ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  );
}
