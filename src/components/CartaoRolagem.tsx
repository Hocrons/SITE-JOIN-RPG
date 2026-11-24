"use client";

import type { Rolagem, TermoRolagem } from "@/lib/tipos";

function Dado({ valor, faces, mantido, margem }: { valor: number; faces: number; mantido: boolean; margem: number }) {
  const critico = mantido && faces === 20 && valor >= margem;
  const falha = mantido && faces === 20 && valor === 1;
  const base = "numeros inline-grid min-w-[1.9rem] place-items-center rounded-sm border px-1 text-[0.95rem] leading-7";
  const estilo = !mantido
    ? "border-current/15 opacity-40 line-through"
    : critico
      ? "border-ouro-escuro bg-gradient-to-b from-ouro-claro to-ouro text-marinho"
      : falha
        ? "border-pv bg-pv text-pergaminho-claro"
        : "border-current/30";
  return (
    <span className={`${base} ${estilo}`} title={`d${faces}${mantido ? "" : " (descartado)"}`}>
      {valor}
    </span>
  );
}

function Termo({ t, margem }: { t: TermoRolagem; margem: number }) {
  if (t.tipo === "fixo") {
    const v = t.valor ?? 0;
    return <span className="numeros opacity-80">{v >= 0 ? `+ ${v}` : `− ${Math.abs(v)}`}</span>;
  }
  // marca quais dados ficaram (kh/kl): consome cada valor mantido uma vez
  const restantes = [...(t.mantidos ?? [])];
  const marcados = (t.dados ?? []).map((v) => {
    const i = restantes.indexOf(v);
    if (i >= 0) restantes.splice(i, 1);
    return { v, mantido: i >= 0 };
  });
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {(t.sinal ?? 1) < 0 && <span className="opacity-80">−</span>}
      <span className="mr-0.5 text-sm italic opacity-70">
        {t.qtd}d{t.faces}
        {t.manter === "kh1" ? " (maior)" : t.manter === "kl1" ? " (menor)" : ""}
      </span>
      {marcados.map((d, i) => (
        <Dado key={i} valor={d.v} faces={t.faces ?? 0} mantido={d.mantido} margem={margem} />
      ))}
    </span>
  );
}

interface Props {
  r: Rolagem;
  escuro?: boolean;
  destaque?: boolean;
}

/** Uma rolagem: quem, o quê, cada dado e o total. Crítico em dourado. */
export function CartaoRolagem({ r, escuro, destaque }: Props) {
  const margem = r.detalhes?.margem ?? 20;
  const termos = r.detalhes?.termos ?? [];
  const hora = new Date(r.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const fundo = escuro ? "border-ouro/20 bg-noite-2" : "border-ouro-escuro/30 bg-pergaminho-claro";

  return (
    <article
      className={`rounded-sm border px-3 py-2 ${fundo} ${r.critico ? "!border-ouro shadow-[0_0_0_1px_var(--color-ouro)]" : ""} ${
        destaque ? "ring-2 ring-ouro/60" : ""
      }`}
    >
      <header className="flex items-baseline gap-2">
        <span className={`titulo truncate ${escuro ? "text-ouro-claro" : "text-marinho"}`}>{r.autor}</span>
        {r.titulo && <span className="truncate italic opacity-80">{r.titulo}</span>}
        <span className="ml-auto shrink-0 text-xs opacity-50">{hora}</span>
      </header>
      <div className="mt-1 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          {termos.map((t, i) => (
            <Termo key={i} t={t} margem={margem} />
          ))}
        </div>
        <span className={`numeros shrink-0 text-[2rem] leading-none ${r.critico ? "text-ouro" : ""}`}>{r.total}</span>
      </div>
      {(r.critico || r.secreta || r.detalhes?.critico_aplicado) && (
        <footer className="mt-1 flex flex-wrap gap-2 text-sm">
          {r.critico && <span className="titulo text-ouro">Crítico!</span>}
          {r.detalhes?.critico_aplicado && <span className="italic opacity-80">dano crítico ({r.detalhes.dados_crit != null ? "dados da arma" : "dados"} ×{r.detalhes.multiplicador})</span>}
          {r.secreta && <span className="italic opacity-70">🔒 só o mestre vê</span>}
        </footer>
      )}
    </article>
  );
}
