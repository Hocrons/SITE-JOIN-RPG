"use client";

import { useId, useState } from "react";
import { JanelaGlossario } from "@/components/Glossario";
import { aplicarCondicao, condicao, type EstadoCondicoes } from "@/lib/condicoes";
import { CONDICOES_SUGERIDAS } from "@/lib/regras";

interface Props {
  lista: string[];
  editavel: boolean;
  escuro?: boolean;
  onChange: (nova: string[]) => void;
  /** Estado calculado (mostra as condições incluídas e as automáticas pelo PV/SAN). */
  estado?: EstadoCondicoes;
}

/**
 * Condições como etiquetas. Toque numa etiqueta para ler o que ela faz; ao pôr uma,
 * a explicação aparece logo abaixo. Repetir uma condição que agrava troca pela mais grave.
 */
export function Condicoes({ lista, editavel, escuro, onChange, estado }: Props) {
  const [texto, setTexto] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [glossario, setGlossario] = useState<string | null | undefined>(undefined);
  const idLista = useId();

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const c = texto.trim();
    if (!c) return;
    const r = aplicarCondicao(lista, c);
    if (r.lista !== lista) onChange(r.lista);
    setAviso(r.aviso ?? null);
    setAberta(r.aplicada);
    setTexto("");
  }

  const etiqueta = escuro ? "border border-sangue-vivo/50 bg-sangue/20 text-nevoa" : "border border-sangue-vivo/55 bg-sangue/15 text-tinta";
  const secundaria = escuro ? "border border-dashed border-nevoa/30 text-nevoa/75" : "border border-dashed border-tinta-suave/50 text-tinta-suave";
  const sutil = escuro ? "text-nevoa/55" : "text-tinta-suave";
  const extras = (estado?.ativas ?? []).filter((a) => !lista.some((x) => x.toLowerCase() === a.nome.toLowerCase()));
  const info = aberta ? condicao(aberta) : undefined;

  return (
    <div>
      <ul className="flex flex-wrap gap-1.5">
        {lista.map((c) => (
          <li key={c} className={`flex items-center rounded-sm text-sm ${etiqueta} ${aberta === c ? "ring-2 ring-ouro/60" : ""}`}>
            <button type="button" onClick={() => setAberta(aberta === c ? null : c)} className="px-2 py-0.5" aria-expanded={aberta === c}>
              {c}
            </button>
            {editavel && (
              <button
                type="button"
                onClick={() => {
                  onChange(lista.filter((x) => x !== c));
                  if (aberta === c) setAberta(null);
                  setAviso(null);
                }}
                aria-label={`Tirar ${c}`}
                className="-ml-1 px-1.5 opacity-70 hover:opacity-100"
              >
                ×
              </button>
            )}
          </li>
        ))}
        {extras.map((a) => (
          <li key={a.nome}>
            <button
              type="button"
              onClick={() => setAberta(aberta === a.nome ? null : a.nome)}
              className={`rounded-sm px-2 py-0.5 text-sm ${secundaria}`}
              title={a.automatica ? "Automática pelo PV/SAN" : `Vem de ${a.via}`}
            >
              {a.nome}
              <span className="ml-1 text-xs italic opacity-75">{a.automatica ? "auto" : `por ${a.via?.toLowerCase()}`}</span>
            </button>
          </li>
        ))}
        {lista.length === 0 && extras.length === 0 && <li className={`text-sm italic ${sutil}`}>Nenhuma condição</li>}
        <li>
          <button type="button" onClick={() => setGlossario(null)} className={`px-1 py-0.5 text-sm underline underline-offset-2 ${sutil}`}>
            Glossário
          </button>
        </li>
      </ul>

      {aviso && <p className={`mt-2 text-sm font-semibold ${escuro ? "text-ouro-claro" : "text-sangue"}`}>{aviso}</p>}
      {info && (
        <div className={`mt-2 rounded-sm border px-3 py-2 ${escuro ? "border-ouro/25 bg-noite/60" : "border-ouro-escuro/30 bg-pergaminho-claro/70"}`} role="note">
          <p className={`titulo ${escuro ? "text-ouro-claro" : "text-marinho"}`}>{info.nome}</p>
          <p className={escuro ? "text-nevoa" : "text-tinta"}>{info.texto}</p>
          {(info.inclui?.length || info.agrava) && (
            <p className={`text-sm ${sutil}`}>
              {info.inclui?.length ? `Inclui: ${info.inclui.join(", ").toLowerCase()}. ` : ""}
              {info.agrava ? `Se receber de novo: ${info.agrava.toLowerCase()}.` : ""}
            </p>
          )}
        </div>
      )}

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
            {CONDICOES_SUGERIDAS.map((c) => (
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

      {glossario !== undefined && <JanelaGlossario escuro={!!escuro} inicial={glossario ?? undefined} onFechar={() => setGlossario(undefined)} />}
    </div>
  );
}
