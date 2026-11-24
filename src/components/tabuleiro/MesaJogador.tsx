"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Sigilo } from "@/components/Sigilo";
import { useCenas } from "@/lib/cenas";
import { useNevoa } from "@/lib/nevoa";
import { useTokens } from "@/lib/tokens";
import type { Ficha, Personagem } from "@/lib/tipos";

const Tabuleiro = dynamic(() => import("@/components/tabuleiro/Tabuleiro").then((m) => m.Tabuleiro), {
  ssr: false,
  loading: () => <div className="grid h-[60dvh] place-items-center italic text-tinta-suave">Abrindo o tabuleiro…</div>,
});

/** Aba "Mesa" do jogador: a cena que o mestre pôs na mesa. */
export function MesaJogador({
  mesaId,
  meuPersonagem,
  personagens,
  fichas,
}: {
  mesaId: string;
  meuPersonagem: string | null;
  /** Só o próprio personagem chega completo (o banco filtra). */
  personagens: Personagem[];
  fichas: Ficha[];
}) {
  const { ativa } = useCenas(mesaId);
  const dt = useTokens(mesaId, ativa?.id);
  const [foco, setFoco] = useState<{ x: number; y: number; n: number } | null>(null);
  const nevoa = useNevoa(ativa, false);
  // na névoa, só os agentes continuam aparecendo
  const { coberto } = nevoa;
  const visiveis = useMemo(() => {
    if (!ativa || !nevoa.ativa) return dt.tokens;
    const s = ativa.grade_tamanho;
    return dt.tokens.filter(
      (t) =>
        t.faccao === "agente" ||
        t.personagem_id === meuPersonagem ||
        !coberto(ativa.grade_x + (t.coluna + t.tamanho / 2) * s, ativa.grade_y + (t.linha + t.tamanho / 2) * s),
    );
  }, [dt.tokens, ativa, nevoa.ativa, coberto, meuPersonagem]);
  const meu = dt.tokens.find((t) => meuPersonagem && t.personagem_id === meuPersonagem);
  if (!ativa) {
    return (
      <section className="folha relative overflow-hidden px-4 py-10 text-center">
        <Sigilo tamanho={150} className="pointer-events-none absolute -right-8 -top-8 text-ouro-escuro/15" />
        <h1 className="titulo text-2xl text-marinho">Mesa</h1>
        <p className="mt-1 text-tinta-suave">O mestre ainda não abriu uma cena. Quando abrir, o mapa aparece aqui.</p>
      </section>
    );
  }
  return (
    <div className="grid gap-2">
      <h1 className="titulo pincelada justify-self-start text-xl text-marinho">{ativa.nome}</h1>
      <Tabuleiro
        cena={ativa}
        foco={foco}
        extras={
          meu && (
            <BotaoFoco
              onClick={() => {
                const s = ativa.grade_tamanho;
                setFoco({
                  x: ativa.grade_x + (meu.coluna + meu.tamanho / 2) * s,
                  y: ativa.grade_y + (meu.linha + meu.tamanho / 2) * s,
                  n: (foco?.n ?? 0) + 1,
                });
              }}
            />
          )
        }
        nevoa={nevoa.canvas && nevoa.ativa ? { canvas: nevoa.canvas, versao: nevoa.versao, opacidade: 1 } : null}
        tokens={{
          tokens: visiveis,
          arrasto: dt.arrasto,
          personagens,
          fichas,
          podeMover: (t) => !!meuPersonagem && t.personagem_id === meuPersonagem,
          onMover: dt.mover,
          onArrastar: dt.transmitirArrasto,
        }}
        altura="max(320px, calc(100dvh - 232px))"
      />
    </div>
  );
}

function BotaoFoco({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Ir para o meu agente"
      title="Ir para o meu agente"
      className="grid h-10 w-10 place-items-center rounded-sm border border-ouro/35 bg-noite/90 text-ouro-claro shadow-lg hover:bg-noite-3"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    </button>
  );
}
