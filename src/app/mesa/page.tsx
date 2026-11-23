"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSessao } from "@/lib/sessao";

/** Encaminha para a área certa: mestre → Escudo; jogador → ficha. */
export default function Mesa() {
  const router = useRouter();
  const { carregando, membro } = useSessao();
  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else router.replace(membro.papel === "mestre" ? "/mestre" : "/ficha");
  }, [carregando, membro, router]);
  return <p className="p-10 text-center text-lg italic text-tinta-suave">Abrindo a mesa…</p>;
}
