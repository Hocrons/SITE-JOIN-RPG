"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CascaMestre } from "@/components/mestre/CascaMestre";
import { LinhaDoTempo } from "@/components/linha/LinhaDoTempo";
import { useAoVivo } from "@/lib/aoVivo";
import { useSessao } from "@/lib/sessao";
import type { Personagem } from "@/lib/tipos";

type L<T> = T & Record<string, unknown>;

/** Linha do tempo do mestre: tudo, com edição e "quem vê" por evento. */
export default function LinhaMestre() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre } = useSessao();
  const personagens = useAoVivo<L<Personagem>>("personagens", mesa?.id, {
    chave: (p) => String(p.id),
    ordenar: (a, b) => a.ordem - b.ordem,
  });

  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else if (!eMestre) router.replace("/ficha");
  }, [carregando, membro, eMestre, router]);

  if (!mesa || !eMestre) {
    return <main className="tema-mestre grid place-items-center italic text-nevoa/60">Abrindo a linha do tempo…</main>;
  }

  const jogadores = personagens.linhas
    .filter((p) => p.tipo === "pj" && !p.arquivado)
    .map((p) => ({ id: p.id, nome: p.nome.split(" ")[0] }));

  return (
    <CascaMestre subtitulo="Linha do tempo. Losango vazado: só você vê.">
      <div className="mx-auto max-w-4xl">
        <LinhaDoTempo mesaId={mesa.id} eMestre escuro jogadores={jogadores} />
      </div>
    </CascaMestre>
  );
}
