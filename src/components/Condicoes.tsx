"use client";

import { useId, useState } from "react";
import { CONDICOES_SUGERIDAS } from "@/lib/regras";

interface Props {
  lista: string[];
  editavel: boolean;
  escuro?: boolean;
  onChange: (nova: string[]) => void;
}

/** Condições como etiquetas: toque no × para tirar, digite (com sugestões) para pôr. */
export function Condicoes({ lista, editavel, escuro, onChange }: Props) {
  const [texto, setTexto] = useState("");
  const idLista = useId();

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const c = texto.trim();
    if (!c) return;
    const nome = c.charAt(0).toUpperCase() + c.slice(1);
    if (!lista.some((x) => x.toLowerCase() === nome.toLowerCase())) onChange([...lista, nome]);
    setTexto("");
  }

  // vermelho-sangue com a cor de texto do lugar: legível no papel, na mesa escura e na Área do Mestre
  const etiqueta = escuro
    ? "border border-sangue-vivo/50 bg-sangue/20 text-nevoa"
    : "border border-sangue-vivo/55 bg-sangue/15 text-tinta";

  return (
    <div>
      <ul className="flex flex-wrap gap-1.5">
        {lista.map((c) => (
          <li key={c} className={`flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm ${etiqueta}`}>
            {c}
            {editavel && (
              <button
                type="button"
                onClick={() => onChange(lista.filter((x) => x !== c))}
                aria-label={`Tirar ${c}`}
                className="-mr-1 px-1 opacity-70 hover:opacity-100"
              >
                ×
              </button>
            )}
          </li>
        ))}
        {lista.length === 0 && (
          <li className={`text-sm italic ${escuro ? "text-nevoa/45" : "text-tinta-suave"}`}>Nenhuma condição</li>
        )}
      </ul>
      {editavel && (
        <form onSubmit={adicionar} className="mt-2 flex gap-2">
          <input
            list={idLista}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Adicionar condição"
            aria-label="Adicionar condição"
            className={
              escuro
                ? "min-w-0 flex-1 rounded-sm border border-ouro/25 bg-noite px-2 py-1 text-sm text-nevoa placeholder:text-nevoa/35"
                : "campo min-w-0 flex-1 !py-1.5 text-base"
            }
          />
          <datalist id={idLista}>
            {CONDICOES_SUGERIDAS.filter((c) => !lista.includes(c)).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button
            className={
              escuro
                ? "rounded-sm border border-ouro/35 px-3 text-sm text-ouro-claro hover:bg-ouro/10"
                : "rounded-sm border border-ouro-escuro/50 px-3 text-marinho hover:bg-ouro-claro/30"
            }
          >
            Pôr
          </button>
        </form>
      )}
    </div>
  );
}
