"use client";

import dynamic from "next/dynamic";
import { Sigilo } from "@/components/Sigilo";
import { useCenas } from "@/lib/cenas";

const Tabuleiro = dynamic(() => import("@/components/tabuleiro/Tabuleiro").then((m) => m.Tabuleiro), {
  ssr: false,
  loading: () => <div className="grid h-[60dvh] place-items-center italic text-tinta-suave">Abrindo o tabuleiro…</div>,
});

/** Aba "Mesa" do jogador: a cena que o mestre pôs na mesa. */
export function MesaJogador({ mesaId }: { mesaId: string }) {
  const { ativa } = useCenas(mesaId);
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
      <Tabuleiro cena={ativa} altura="max(320px, calc(100dvh - 232px))" />
    </div>
  );
}
