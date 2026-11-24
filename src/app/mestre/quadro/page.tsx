"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CascaMestre } from "@/components/mestre/CascaMestre";
import { Quadro } from "@/components/quadro/Quadro";
import { useSessao } from "@/lib/sessao";

/** Quadro de investigação visto pelo mestre: o mesmo dos jogadores, mais o envio de arquivos. */
export default function QuadroMestre() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre } = useSessao();

  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else if (!eMestre) router.replace("/ficha");
  }, [carregando, membro, eMestre, router]);

  if (!mesa || !eMestre) {
    return <main className="tema-mestre grid place-items-center italic text-nevoa/60">Abrindo o quadro…</main>;
  }

  return (
    <CascaMestre subtitulo="Quadro de investigação, ao vivo para todos" largo>
      <div className="">
        <Quadro mesaId={mesa.id} eMestre altura="calc(100dvh - 160px)" />
      </div>
    </CascaMestre>
  );
}
