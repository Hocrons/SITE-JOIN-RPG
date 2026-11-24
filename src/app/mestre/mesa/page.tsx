"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Vista } from "@/components/tabuleiro/Tabuleiro";
import { CascaMestre } from "@/components/mestre/CascaMestre";
import { PainelCena } from "@/components/tabuleiro/PainelCena";
import { PainelNevoa, useFerramentaNevoa, type EstadoNevoa } from "@/components/tabuleiro/PainelNevoa";
import { PainelTokens } from "@/components/tabuleiro/PainelTokens";
import { useNevoa } from "@/lib/nevoa";
import { useCenas } from "@/lib/cenas";
import { useSessao } from "@/lib/sessao";
import { useTokens } from "@/lib/tokens";
import { useMesa } from "@/lib/useMesa";

const Tabuleiro = dynamic(() => import("@/components/tabuleiro/Tabuleiro").then((m) => m.Tabuleiro), {
  ssr: false,
  loading: () => <div className="grid h-[60dvh] place-items-center italic text-nevoa/50">Abrindo o tabuleiro…</div>,
});

/** Mesa (tabuleiro) do mestre: cenas, mapa, grade e qual cena os jogadores veem. */
export default function MesaMestre() {
  const { mesa } = useSessao();
  const dados = useCenas(mesa?.id);
  const [aberta, setAberta] = useState<string | null>(null);
  const [alinhando, setAlinhando] = useState(false);
  const [nova, setNova] = useState("");
  const [lado, setLado] = useState<"cena" | "tokens" | "nevoa">("tokens");
  const [estadoNevoa, setEstadoNevoa] = useState<EstadoNevoa | null>(null);
  const [raioNevoa, setRaioNevoa] = useState(1.5);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const fichas = useMesa(mesa?.id, true);
  const vistaAtual = useRef<{ v: Vista; w: number; h: number } | null>(null);

  // abre a cena ativa (ou a primeira) ao chegar
  useEffect(() => {
    if (aberta && dados.cenas.some((c) => c.id === aberta)) return;
    setAberta(dados.ativa?.id ?? dados.cenas[0]?.id ?? null);
  }, [dados.cenas, dados.ativa, aberta]);

  const cena = dados.cenas.find((c) => c.id === aberta);
  const dt = useTokens(mesa?.id, cena?.id);
  const nevoa = useNevoa(cena, true);
  // a ferramenta da névoa só vale com a aba da névoa aberta
  const ferramenta = useFerramentaNevoa(nevoa, cena, lado === "nevoa" ? estadoNevoa : null, raioNevoa);

  const centro = useCallback(() => {
    const a = vistaAtual.current;
    if (!cena || !a) return { c: 0, l: 0 };
    const s = cena.grade_tamanho;
    const wx = (a.w / 2 - a.v.x) / a.v.k;
    const wy = (a.h / 2 - a.v.y) / a.v.k;
    return {
      c: Math.floor((wx - cena.grade_x) / s),
      l: Math.floor((wy - cena.grade_y) / s),
    };
  }, [cena]);

  return (
    <CascaMestre
      subtitulo={dados.ativa ? `Mesa: os jogadores veem “${dados.ativa.nome}”` : "Mesa: nenhuma cena para os jogadores"}
      status={dados.status}
      largo
    >
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Cenas">
            {dados.cenas.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={c.id === aberta}
                onClick={() => {
                  setAberta(c.id);
                  setAlinhando(false);
                  setEstadoNevoa(null);
                  setSelecionado(null);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-sm border px-3 py-1.5 ${
                  c.id === aberta ? "border-ouro bg-ouro/90 text-marinho" : "border-ouro/25 text-nevoa/80 hover:bg-ouro/10"
                }`}
              >
                {c.ativa && <span className="h-2 w-2 rounded-full bg-pd-vivo" title="Na mesa dos jogadores" />}
                {c.nome}
              </button>
            ))}
            <form
              className="flex shrink-0 gap-1"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!nova.trim()) return;
                const c = await dados.criar(nova);
                setNova("");
                if (c) setAberta(c.id);
              }}
            >
              <input
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                placeholder="Nova cena"
                aria-label="Nome da nova cena"
                maxLength={80}
                className="w-36 rounded-sm border border-ouro/25 bg-noite px-2.5 py-1.5 text-nevoa placeholder:text-nevoa/40"
              />
              <button className="rounded-sm border border-ouro/35 px-3 text-ouro-claro hover:bg-ouro/10" disabled={!nova.trim()}>
                Criar
              </button>
            </form>
          </div>

          {cena ? (
            <Tabuleiro
              cena={cena}
              modo={alinhando ? "alinhar" : "navegar"}
              onAlinhar={(a) => {
                dados.salvar(cena.id, {
                  grade_tamanho: a.tamanho,
                  grade_x: a.x,
                  grade_y: a.y,
                  grade_visivel: true,
                });
                setAlinhando(false);
              }}
              onVista={(v, t) => {
                vistaAtual.current = { v, w: t.w, h: t.h };
              }}
              onClicarFundo={() => setSelecionado(null)}
              ferramenta={alinhando ? null : ferramenta}
              nevoa={nevoa.canvas && cena.nevoa_ativa ? { canvas: nevoa.canvas, versao: nevoa.versao, opacidade: 0.5 } : null}
              tokens={{
                tokens: dt.tokens,
                arrasto: dt.arrasto,
                personagens: fichas.personagens.linhas,
                fichas: fichas.fichas.linhas,
                podeMover: () => !alinhando && !ferramenta,
                selecionado,
                onSelecionar: (t) => {
                  setSelecionado(t.id);
                  setLado("tokens");
                },
                onMover: dt.mover,
                onArrastar: dt.transmitirArrasto,
              }}
              altura={typeof window !== "undefined" && window.innerWidth < 1024 ? "62dvh" : "calc(100dvh - 190px)"}
            />
          ) : (
            <div className="painel grid h-[50dvh] place-items-center p-6 text-center italic text-nevoa/60">
              Crie a primeira cena (ex.: “Paratium”) e envie o mapa dela.
            </div>
          )}
        </div>

        {cena && (
          <aside
            className="painel p-4 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
            aria-label="Configurar cena"
          >
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-sm border border-ouro/20 p-1" role="tablist" aria-label="Painel">
              {(["tokens", "nevoa", "cena"] as const).map((x) => (
                <button
                  key={x}
                  role="tab"
                  aria-selected={lado === x}
                  onClick={() => setLado(x)}
                  className={`rounded-sm py-1.5 titulo ${lado === x ? "bg-ouro/90 text-marinho" : "text-nevoa/70 hover:bg-ouro/10"}`}
                >
                  {x === "tokens" ? `Tokens (${dt.tokens.length})` : x === "nevoa" ? "Névoa" : "Cena"}
                </button>
              ))}
            </div>
            {lado === "nevoa" ? (
              <PainelNevoa
                cena={cena}
                dados={dados}
                nevoa={nevoa}
                estado={estadoNevoa}
                onEstado={setEstadoNevoa}
                raio={raioNevoa}
                onRaio={setRaioNevoa}
              />
            ) : lado === "cena" ? (
              <PainelCena key={cena.id} cena={cena} dados={dados} alinhando={alinhando} onAlinhar={() => setAlinhando(!alinhando)} />
            ) : (
              <PainelTokens
                cena={cena}
                dt={dt}
                personagens={fichas.personagens.linhas}
                selecionado={selecionado}
                onSelecionar={setSelecionado}
                centro={centro}
              />
            )}
          </aside>
        )}
      </div>
    </CascaMestre>
  );
}
