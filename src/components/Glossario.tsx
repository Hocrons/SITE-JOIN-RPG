"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONDICOES, NOME_GRUPO, REGRA_GERAL, condicao, type Condicao } from "@/lib/condicoes";

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Glossário de condições com busca. Abre já numa condição, se pedirem. */
export function JanelaGlossario({ onFechar, inicial, escuro = true }: { onFechar: () => void; inicial?: string; escuro?: boolean }) {
  const [busca, setBusca] = useState(inicial ? (condicao(inicial)?.nome ?? inicial) : "");
  const campo = useRef<HTMLInputElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;
  useEffect(() => {
    // no celular, não abre o teclado sozinho
    if (window.matchMedia("(pointer: fine)").matches) campo.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const lista = useMemo(() => {
    const q = sem(busca.trim());
    if (!q) return CONDICOES;
    // nome primeiro, depois quem cita no texto
    const porNome = CONDICOES.filter((c) => sem(c.nome).includes(q));
    const porTexto = CONDICOES.filter((c) => !porNome.includes(c) && sem(`${c.texto} ${c.grupo ?? ""}`).includes(q));
    return [...porNome, ...porTexto];
  }, [busca]);

  const t = escuro
    ? { caixa: "painel", titulo: "text-ouro-claro", sutil: "text-nevoa/60", texto: "text-nevoa", campo: "rounded-sm border border-ouro/30 bg-noite px-3 py-2 text-nevoa placeholder:text-nevoa/40", divide: "divide-ouro/10" }
    : { caixa: "folha-solida", titulo: "text-marinho", sutil: "text-tinta-suave", texto: "text-tinta", campo: "campo", divide: "divide-ouro-escuro/20" };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center sm:p-4" role="dialog" aria-modal aria-label="Glossário de condições" onClick={onFechar}>
      <div className={`${t.caixa} grid max-h-[92dvh] w-full max-w-2xl grid-rows-[auto_auto_1fr] gap-3 p-5`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={`titulo text-xl ${t.titulo}`}>Condições</h2>
          <button onClick={onFechar} className={`text-sm underline underline-offset-2 ${t.sutil}`}>
            Fechar
          </button>
        </div>
        <input
          ref={campo}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar: caído, Defesa, medo…"
          aria-label="Buscar condição"
          className={t.campo}
        />
        <div className="min-h-0 overflow-y-auto pr-1">
          <ul className={`divide-y ${t.divide}`}>
            {lista.map((c) => (
              <ItemGlossario key={c.nome} c={c} t={t} aoClicar={(n) => setBusca(n)} />
            ))}
          </ul>
          {lista.length === 0 && <p className={`py-4 italic ${t.sutil}`}>Nenhuma condição com “{busca}”.</p>}
          <p className={`mt-4 border-t pt-3 text-sm ${t.sutil} ${escuro ? "border-ouro/15" : "border-ouro-escuro/20"}`}>
            {REGRA_GERAL} <span className="italic">Livro de Regras, p. 310–311.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ItemGlossario({ c, t, aoClicar }: { c: Condicao; t: { titulo: string; sutil: string; texto: string }; aoClicar: (nome: string) => void }) {
  const ligar = (nomes: string[]) =>
    nomes.map((n, i) => (
      <span key={n}>
        {i > 0 && ", "}
        <button onClick={() => aoClicar(n)} className="underline underline-offset-2">
          {n.toLowerCase()}
        </button>
      </span>
    ));
  return (
    <li className="py-2.5">
      <h3 className={`titulo text-lg ${t.titulo}`}>
        {c.nome}
        {c.grupo && <span className={`ml-2 text-sm font-normal italic ${t.sutil}`}>condição de {NOME_GRUPO[c.grupo]}</span>}
        {c.automatica && <span className={`ml-2 text-sm font-normal italic ${t.sutil}`}>automática</span>}
      </h3>
      <p className={t.texto}>{c.texto}</p>
      {(c.inclui?.length || c.agrava) && (
        <p className={`mt-0.5 text-sm ${t.sutil}`}>
          {c.inclui?.length ? <>Inclui: {ligar(c.inclui)}. </> : null}
          {c.agrava ? <>Se receber de novo: {ligar([c.agrava])}.</> : null}
        </p>
      )}
    </li>
  );
}

export function IconeGlossario() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 21V5M9 8h6M9 12h4" />
    </svg>
  );
}
