"use client";

import { useEffect, useState } from "react";

export type PreferenciaTema = "auto" | "claro" | "escuro";

const CHAVE = "paratus-tema";

/** Script que roda antes da página pintar, para não piscar claro antes do escuro. */
export const SCRIPT_TEMA = `(function(){try{var p=localStorage.getItem("${CHAVE}")||"auto";var e=p==="escuro"||(p==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.tema=e?"escuro":"claro";}catch(_){}})();`;

function aplicar(p: PreferenciaTema) {
  const escuro = p === "escuro" || (p === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
}

/** Tema do jogador: automático (segue o celular), claro ou escuro. Fica salvo neste aparelho. */
export function useTema() {
  const [pref, setPref] = useState<PreferenciaTema>("auto");
  useEffect(() => {
    let p: PreferenciaTema = "auto";
    try {
      p = (localStorage.getItem(CHAVE) as PreferenciaTema) || "auto";
    } catch {}
    setPref(p);
    aplicar(p);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const f = () => {
      let atual: PreferenciaTema = "auto";
      try {
        atual = (localStorage.getItem(CHAVE) as PreferenciaTema) || "auto";
      } catch {}
      if (atual === "auto") aplicar("auto");
    };
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  function mudar(p: PreferenciaTema) {
    setPref(p);
    try {
      localStorage.setItem(CHAVE, p);
    } catch {}
    aplicar(p);
  }
  return { pref, mudar };
}
