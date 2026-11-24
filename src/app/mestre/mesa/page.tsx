"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CascaMestre } from "@/components/mestre/CascaMestre";
import { PainelCena } from "@/components/tabuleiro/PainelCena";
import { useCenas } from "@/lib/cenas";
import { useSessao } from "@/lib/sessao";

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

  // abre a cena ativa (ou a primeira) ao chegar
  useEffect(() => {
    if (aberta && dados.cenas.some((c) => c.id === aberta)) return;
    setAberta(dados.ativa?.id ?? dados.cenas[0]?.id ?? null);
  }, [dados.cenas, dados.ativa, aberta]);

  const cena = dados.cenas.find((c) => c.id === aberta);

  return (
    <CascaMestre subtitulo={dados.ativa ? `Mesa: os jogadores veem “${dados.ativa.nome}”` : "Mesa: nenhuma cena para os jogadores"} status={dados.status} largo>
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
                dados.salvar(cena.id, { grade_tamanho: a.tamanho, grade_x: a.x, grade_y: a.y, grade_visivel: true });
                setAlinhando(false);
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
          <aside className="painel p-4 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto" aria-label="Configurar cena">
            <PainelCena key={cena.id} cena={cena} dados={dados} alinhando={alinhando} onAlinhar={() => setAlinhando(!alinhando)} />
          </aside>
        )}
      </div>
    </CascaMestre>
  );
}
