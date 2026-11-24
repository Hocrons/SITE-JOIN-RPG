"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Brasao } from "@/components/Brasao";
import { NavMestre } from "@/components/NavMestre";
import { Quadro } from "@/components/quadro/Quadro";
import { useCombateAtivo } from "@/lib/combate";
import { useSessao } from "@/lib/sessao";

/** Quadro de investigação visto pelo mestre: o mesmo dos jogadores, mais o envio de arquivos. */
export default function QuadroMestre() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre } = useSessao();
  const { ativo: combate } = useCombateAtivo(mesa?.id);

  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else if (!eMestre) router.replace("/ficha");
  }, [carregando, membro, eMestre, router]);

  if (!mesa || !eMestre) {
    return <main className="tema-mestre grid place-items-center italic text-nevoa/60">Abrindo o quadro…</main>;
  }

  return (
    <main className="tema-mestre">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Brasao tamanho={38} />
          <div className="mr-auto">
            <h1 className="titulo text-2xl text-ouro-claro">{mesa.nome}</h1>
            <p className="text-sm italic text-nevoa/60">Quadro de investigação: todos da mesa mexem juntos, ao vivo</p>
          </div>
          <NavMestre emCombate={!!combate} />
        </header>
        <Quadro mesaId={mesa.id} eMestre altura="calc(100dvh - 160px)" />
      </div>
    </main>
  );
}
