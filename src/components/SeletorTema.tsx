"use client";

import { useEffect, useState } from "react";
import { useTema } from "@/lib/tema";

/**
 * Alterna entre papel claro e noite. Sem escolha salva, segue o celular;
 * depois do primeiro toque, fica o que a pessoa escolheu.
 */
export function SeletorTema() {
  const { mudar } = useTema();
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const ler = () => setEscuro(document.documentElement.dataset.tema === "escuro");
    ler();
    const obs = new MutationObserver(ler);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => obs.disconnect();
  }, []);

  const rotulo = escuro ? "Tema escuro. Mudar para o claro" : "Tema claro. Mudar para o escuro";
  return (
    <button
      onClick={() => mudar(escuro ? "claro" : "escuro")}
      className="grid h-8 w-8 place-items-center rounded-full border border-ouro-escuro/40 text-tinta-suave"
      title={rotulo}
      aria-label={rotulo}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        {escuro ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
          </>
        )}
      </svg>
    </button>
  );
}
