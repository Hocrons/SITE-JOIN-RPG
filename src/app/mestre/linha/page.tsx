"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Brasao } from "@/components/Brasao";
import { NavMestre } from "@/components/NavMestre";
import { LinhaDoTempo } from "@/components/linha/LinhaDoTempo";
import { useAoVivo } from "@/lib/aoVivo";
import { useCombateAtivo } from "@/lib/combate";
import { useSessao } from "@/lib/sessao";
import type { Personagem } from "@/lib/tipos";

type L<T> = T & Record<string, unknown>;

/** Linha do tempo do mestre: tudo, com edição e "quem vê" por evento. */
export default function LinhaMestre() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre } = useSessao();
  const { ativo: combate } = useCombateAtivo(mesa?.id);
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
    <main className="tema-mestre">
      <div className="mx-auto max-w-4xl px-4 py-5">
        <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Brasao tamanho={38} />
          <div className="mr-auto">
            <h1 className="titulo text-2xl text-ouro-claro">{mesa.nome}</h1>
            <p className="text-sm italic text-nevoa/60">Linha do tempo. Losango vazado: só você vê.</p>
          </div>
          <NavMestre emCombate={!!combate} />
        </header>
        <LinhaDoTempo mesaId={mesa.id} eMestre escuro jogadores={jogadores} />
      </div>
    </main>
  );
}
