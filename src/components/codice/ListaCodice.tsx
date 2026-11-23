"use client";

import { useMemo, useState } from "react";
import {
  NOME_VISIBILIDADE, normalizar, STATUS_LORE, TIPO, TIPOS_LORE,
  type ConexaoLore, type EntradaLore, type StatusLore, type TipoLore,
} from "@/lib/lore";
import type { Visibilidade } from "@/lib/tipos";

interface Props {
  entradas: EntradaLore[];
  conexoes: ConexaoLore[];
  selecionado: string | null;
  aoAbrir: (id: string) => void;
  eMestre: boolean;
  escuro?: boolean;
  /** Recebe a lista filtrada (o grafo usa o mesmo filtro). */
  aoFiltrar?: (ids: Set<string>) => void;
}

export interface FiltroCodice {
  busca: string;
  tipos: Set<TipoLore>;
  tag: string;
  ligadoA: string;
  status: StatusLore | "";
  vis: Visibilidade | "";
}

export function filtrar(entradas: EntradaLore[], conexoes: ConexaoLore[], f: FiltroCodice) {
  const termo = normalizar(f.busca.trim());
  let ligados: Set<string> | null = null;
  if (f.ligadoA) {
    ligados = new Set([f.ligadoA]);
    for (const c of conexoes) {
      if (c.origem_id === f.ligadoA) ligados.add(c.destino_id);
      if (c.destino_id === f.ligadoA) ligados.add(c.origem_id);
    }
  }
  return entradas.filter(
    (e) =>
      (!f.tipos.size || f.tipos.has(e.tipo)) &&
      (!f.tag || e.tags.includes(f.tag)) &&
      (!ligados || ligados.has(e.id)) &&
      (!f.status || e.status === f.status) &&
      (!f.vis || e.visibilidade === f.vis) &&
      (!termo ||
        normalizar(`${e.titulo} ${e.resumo} ${e.tags.join(" ")} ${e.texto}`).includes(termo)),
  );
}

export function useFiltroCodice() {
  return useState<FiltroCodice>({ busca: "", tipos: new Set(), tag: "", ligadoA: "", status: "", vis: "" });
}

export function FiltrosCodice({
  entradas, filtro, setFiltro, eMestre, escuro,
}: {
  entradas: EntradaLore[];
  filtro: FiltroCodice;
  setFiltro: (f: FiltroCodice) => void;
  eMestre: boolean;
  escuro?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const tags = useMemo(() => [...new Set(entradas.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b, "pt-BR")), [entradas]);
  const ancoras = entradas.filter((e) => e.tipo === "faccao" || e.tipo === "local");
  const presentes = new Set(entradas.map((e) => e.tipo));
  const campo = escuro
    ? "w-full rounded-sm border border-ouro/25 bg-noite px-2.5 py-1.5 text-nevoa placeholder:text-nevoa/40"
    : "campo w-full py-1.5";
  const ativos = (filtro.tag ? 1 : 0) + (filtro.ligadoA ? 1 : 0) + (filtro.status ? 1 : 0) + (filtro.vis ? 1 : 0);
  const chip = (on: boolean) =>
    `flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-sm ${
      escuro
        ? on ? "border-ouro bg-ouro/15 text-ouro-claro" : "border-ouro/20 text-nevoa/70 hover:border-ouro/50"
        : on ? "border-marinho bg-marinho text-pergaminho-claro" : "border-ouro-escuro/35 text-tinta-suave hover:border-ouro-escuro"
    }`;

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <input
          type="search"
          value={filtro.busca}
          onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
          placeholder="Buscar no códice"
          aria-label="Buscar no códice"
          className={campo}
        />
        <button
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          className={`shrink-0 rounded-sm border px-2.5 text-sm ${escuro ? "border-ouro/25 text-ouro-claro" : "border-ouro-escuro/40 text-marinho"}`}
        >
          Filtros{ativos ? ` (${ativos})` : ""}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipos">
        {TIPOS_LORE.filter((t) => presentes.has(t.id)).map((t) => {
          const on = filtro.tipos.has(t.id);
          return (
            <button
              key={t.id}
              aria-pressed={on}
              className={chip(on)}
              onClick={() => {
                const s = new Set(filtro.tipos);
                if (on) s.delete(t.id);
                else s.add(t.id);
                setFiltro({ ...filtro, tipos: s });
              }}
            >
              <span className="losango" style={{ background: t.cor }} aria-hidden />
              {t.plural}
            </button>
          );
        })}
      </div>
      {aberto && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-0.5 text-sm">
            Marcador
            <select className={campo} value={filtro.tag} onChange={(e) => setFiltro({ ...filtro, tag: e.target.value })}>
              <option value="">Todos</option>
              {tags.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-0.5 text-sm">
            Ligado a facção ou local
            <select className={campo} value={filtro.ligadoA} onChange={(e) => setFiltro({ ...filtro, ligadoA: e.target.value })}>
              <option value="">Qualquer</option>
              {ancoras.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.titulo}
                </option>
              ))}
            </select>
          </label>
          {eMestre && (
            <>
              <label className="grid gap-0.5 text-sm">
                Status
                <select className={campo} value={filtro.status} onChange={(e) => setFiltro({ ...filtro, status: e.target.value as StatusLore | "" })}>
                  <option value="">Qualquer</option>
                  {STATUS_LORE.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-0.5 text-sm">
                Quem vê
                <select className={campo} value={filtro.vis} onChange={(e) => setFiltro({ ...filtro, vis: e.target.value as Visibilidade | "" })}>
                  <option value="">Qualquer</option>
                  {(Object.keys(NOME_VISIBILIDADE) as Visibilidade[]).map((v) => (
                    <option key={v} value={v}>
                      {NOME_VISIBILIDADE[v]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {ativos > 0 && (
            <button
              className={`justify-self-start text-sm underline underline-offset-2 ${escuro ? "text-nevoa/70" : "text-tinta-suave"}`}
              onClick={() => setFiltro({ ...filtro, tag: "", ligadoA: "", status: "", vis: "" })}
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Lista de entradas (já filtrada). No mestre, mostra quem vê cada uma. */
export function ListaCodice({ entradas, selecionado, aoAbrir, eMestre, escuro }: Omit<Props, "conexoes" | "aoFiltrar">) {
  if (!entradas.length) {
    return <p className={`px-1 py-4 italic ${escuro ? "text-nevoa/55" : "text-tinta-suave"}`}>Nada encontrado com esse filtro.</p>;
  }
  return (
    <ul className={`divide-y ${escuro ? "divide-ouro/10" : "divide-ouro-escuro/15"}`}>
      {entradas.map((e) => {
        const sel = e.id === selecionado;
        return (
          <li key={e.id}>
            <button
              onClick={() => aoAbrir(e.id)}
              aria-current={sel ? "true" : undefined}
              className={`flex w-full items-start gap-2.5 px-2 py-2 text-left ${
                escuro ? (sel ? "bg-ouro/12" : "hover:bg-noite-3/60") : sel ? "bg-ouro-claro/35" : "hover:bg-pergaminho-escuro/25"
              }`}
            >
              <span className="losango mt-2" style={{ background: TIPO[e.tipo].cor }} aria-label={TIPO[e.tipo].nome} />
              <span className="min-w-0 flex-1">
                <span className={`titulo block truncate ${escuro ? "text-ouro-claro" : "text-marinho"}`}>{e.titulo}</span>
                {e.resumo && (
                  <span className={`line-clamp-1 text-sm ${escuro ? "text-nevoa/60" : "text-tinta-suave"}`}>{e.resumo}</span>
                )}
              </span>
              {eMestre && <SeloVisibilidade vis={e.visibilidade} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function SeloVisibilidade({ vis }: { vis: Visibilidade }) {
  const rotulo = NOME_VISIBILIDADE[vis];
  const cor = vis === "mestre" ? "text-nevoa/40" : vis === "todos" ? "text-pd-vivo" : "text-ouro-claro";
  return (
    <span className={`mt-1 shrink-0 ${cor}`} title={rotulo} aria-label={rotulo}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        {vis === "mestre" ? (
          <path d="M3 3l18 18M10.6 6.2A9.6 9.6 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.7 3.3M6.4 7.6C4.2 9.2 3 12 3 12s4 6 9 6a8.6 8.6 0 0 0 4-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        ) : vis === "todos" ? (
          <path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        ) : (
          <path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
        )}
      </svg>
    </span>
  );
}
