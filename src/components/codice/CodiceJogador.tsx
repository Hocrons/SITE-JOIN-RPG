"use client";

import { useMemo, useState } from "react";
import { TIPO, useLore } from "@/lib/lore";
import { Grafo } from "./Grafo";
import { LeituraEntrada } from "./LeituraEntrada";
import { filtrar, FiltrosCodice, ListaCodice, useFiltroCodice } from "./ListaCodice";

/** Aba "Códice" do jogador: só o que o mestre revelou para ele. */
export function CodiceJogador({ mesaId }: { mesaId: string }) {
  const lore = useLore(mesaId, false);
  const [modo, setModo] = useState<"lista" | "grafo">("lista");
  const [aberta, setAberta] = useState<string | null>(null);
  const [noGrafo, setNoGrafo] = useState<string | null>(null);
  const [filtro, setFiltro] = useFiltroCodice();

  const visiveis = useMemo(() => filtrar(lore.entradas, lore.conexoes, filtro), [lore.entradas, lore.conexoes, filtro]);
  const entrada = lore.entradas.find((e) => e.id === aberta);
  const destacada = lore.entradas.find((e) => e.id === noGrafo);
  const porId = new Map(lore.entradas.map((e) => [e.id, e]));
  const ligacoes = destacada
    ? lore.conexoes
        .filter((c) => c.origem_id === destacada.id || c.destino_id === destacada.id)
        .map((c) => {
          const sai = c.origem_id === destacada.id;
          return { c, sai, outra: porId.get(sai ? c.destino_id : c.origem_id)! };
        })
        .filter((l) => l.outra)
    : [];

  function abrir(id: string) {
    setAberta(id);
    window.scrollTo({ top: 0 });
  }

  if (entrada) {
    return (
      <div>
        <button onClick={() => setAberta(null)} className="mb-3 text-tinta-suave underline underline-offset-2">
          Voltar ao códice
        </button>
        <div className="folha p-4">
          <LeituraEntrada
            entrada={entrada}
            entradas={lore.entradas}
            conexoes={lore.conexoes}
            imagens={lore.imagens}
            eMestre={false}
            aoAbrir={abrir}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="titulo pincelada text-2xl text-marinho">Códice</h1>
          <p className="text-tinta-suave">Tudo o que você já descobriu. O mestre libera mais conforme a história anda.</p>
        </div>
      </div>

      {lore.entradas.length === 0 ? (
        <p className="folha p-4 italic text-tinta-suave">Nada foi revelado ainda. Quando o mestre liberar algo, aparece aqui.</p>
      ) : (
        <>
          <div className="segmentos" style={{ gridTemplateColumns: "1fr 1fr" }} role="tablist" aria-label="Modo de ver">
            {(["lista", "grafo"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modo === m}
                onClick={() => setModo(m)}
                className="titulo"
                style={modo === m ? { background: "var(--color-marinho)", color: "var(--color-pergaminho-claro)" } : undefined}
              >
                {m === "lista" ? "Lista" : "Conexões"}
              </button>
            ))}
          </div>
          <FiltrosCodice entradas={lore.entradas} filtro={filtro} setFiltro={setFiltro} eMestre={false} />

          {modo === "lista" ? (
            <div className="folha px-2 py-1">
              <ListaCodice entradas={visiveis} selecionado={null} aoAbrir={abrir} eMestre={false} />
            </div>
          ) : (
            <>
              <div className="folha overflow-hidden">
                <Grafo
                  nos={visiveis.map((e) => ({ id: e.id, rotulo: e.titulo, cor: TIPO[e.tipo].cor }))}
                  arestas={lore.conexoes.map((c) => ({ id: c.id, origem: c.origem_id, destino: c.destino_id, rotulo: c.rotulo }))}
                  selecionado={noGrafo}
                  aoSelecionar={setNoGrafo}
                  altura="min(58dvh, 520px)"
                />
              </div>
              {destacada ? (
                <div className="folha p-3">
                  <div className="flex items-start gap-3">
                    <span className="losango mt-2" style={{ background: TIPO[destacada.tipo].cor }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="titulo text-lg text-marinho">{destacada.titulo}</p>
                      {destacada.resumo && <p className="text-tinta">{destacada.resumo}</p>}
                    </div>
                    <button onClick={() => abrir(destacada.id)} className="shrink-0 rounded-sm border border-ouro-escuro/50 px-3 py-1 text-marinho">
                      Ler
                    </button>
                  </div>
                  {ligacoes.length > 0 && (
                    <ul className="mt-2 divide-y divide-ouro-escuro/15 border-t border-ouro-escuro/20">
                      {ligacoes.map(({ c, outra, sai }) => (
                        <li key={c.id}>
                          <button onClick={() => setNoGrafo(outra.id)} className="flex w-full items-baseline gap-1.5 py-1.5 text-left">
                            {sai ? (
                              <>
                                <i className="shrink-0 text-tinta-suave">{c.rotulo}</i>
                                <span className="font-semibold text-marinho underline decoration-ouro/60 underline-offset-[3px]">{outra.titulo}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-marinho underline decoration-ouro/60 underline-offset-[3px]">{outra.titulo}</span>
                                <i className="text-tinta-suave">{c.rotulo}</i>
                                <span className="text-tinta-suave">{destacada.titulo}</span>
                              </>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-tinta-suave">Toque num ponto para ver as ligações dele aqui embaixo. Arraste para mover e use dois dedos para aproximar.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
