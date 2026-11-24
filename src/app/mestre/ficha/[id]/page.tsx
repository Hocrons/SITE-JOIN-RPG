"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FichaCompleta } from "@/components/FichaCompleta";
import { Inventario } from "@/components/Inventario";
import { varianteAtiva } from "@/lib/regras";
import { Notas } from "@/components/Notas";
import { CadernoLore } from "@/components/caderno/CadernoLore";
import { useSessao } from "@/lib/sessao";
import { useMesa } from "@/lib/useMesa";

/** Mestre abre a ficha completa de qualquer personagem (e as notas dele). */
export default function FichaPeloMestre() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { carregando, membro, mesa, eMestre, userId } = useSessao();
  const dados = useMesa(mesa?.id, true);
  const [aba, setAba] = useState<"ficha" | "itens" | "notas" | "lore">("ficha");

  useEffect(() => {
    if (!carregando && (!membro || !eMestre)) router.replace("/");
  }, [carregando, membro, eMestre, router]);

  const p = dados.personagens.linhas.find((x) => x.id === id);
  const privado = dados.privados.linhas.find((x) => x.personagem_id === id);

  return (
    <main className="mx-auto max-w-xl px-4 pb-12 pt-4">
      <nav className="mb-4 flex items-center gap-4">
        <Link href="/mestre" className="text-tinta-suave underline underline-offset-2">
          ← Voltar ao Escudo
        </Link>
        <div className="segmentos ml-auto !grid-cols-4 w-80" role="tablist">
          {(["ficha", "itens", "notas", "lore"] as const).map((a) => (
            <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={aba === a ? "!bg-marinho !text-ouro-claro" : ""}>
              {{ ficha: "Ficha", itens: "Itens", notas: "Notas", lore: "Lore" }[a]}
            </button>
          ))}
        </div>
      </nav>
      {!p && <p className="folha p-4 italic">Carregando a ficha…</p>}
      {p && aba === "ficha" && <FichaCompleta personagem={p} dados={dados} eMestre />}
      {p && aba === "itens" && (
        <Inventario
          personagem={p}
          forca={dados.detalhes.linhas.find((d) => d.personagem_id === p.id && d.variante === varianteAtiva(p))?.atributos?.FOR ?? 0}
          dados={dados}
          userId={userId}
        />
      )}
      {p && aba === "lore" && mesa && <CadernoLore mesaId={mesa.id} personagemId={p.id} somenteLeitura />}
      {p && aba === "notas" && (
        <Notas key={p.id} valor={privado?.anotacoes ?? ""} onSalvar={(t) => dados.salvarNotas(p.id, t)} />
      )}
    </main>
  );
}
