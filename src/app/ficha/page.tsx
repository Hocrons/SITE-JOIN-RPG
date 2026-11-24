"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brasao } from "@/components/Brasao";
import { Conexao } from "@/components/Conexao";
import { CodiceJogador } from "@/components/codice/CodiceJogador";
import { CadernoLore } from "@/components/caderno/CadernoLore";
import { FichaCompleta } from "@/components/FichaCompleta";
import { Inventario } from "@/components/Inventario";
import { Notas } from "@/components/Notas";
import { OrdemTurnos } from "@/components/OrdemTurnos";
import { useCombateAtivo } from "@/lib/combate";
import { Rolador } from "@/components/Rolador";
import { varianteAtiva } from "@/lib/regras";
import { useSessao } from "@/lib/sessao";
import { useMesa } from "@/lib/useMesa";

type Aba = "ficha" | "itens" | "dados" | "combate" | "codice" | "notas";

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: "ficha", rotulo: "Ficha", icone: "M4 3h12l4 4v14H4z M8 9h8 M8 13h8 M8 17h5" },
  { id: "itens", rotulo: "Itens", icone: "M4 8h16v12H4z M9 8V5h6v3 M4 13h16" },
  { id: "dados", rotulo: "Dados", icone: "M12 2l8.66 5v10L12 22l-8.66-5V7z M12 2v20 M3.34 7L20.66 17 M20.66 7L3.34 17" },
  { id: "combate", rotulo: "Combate", icone: "M5 19L19 5 M15 5h4v4 M9 19H5v-4 M5 5l5 5 M19 19l-5-5" },
  { id: "codice", rotulo: "Códice", icone: "M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z M5 16a4 4 0 0 1 4-4h9 M9 8h5" },
  { id: "notas", rotulo: "Notas", icone: "M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h4" },
];

export default function PaginaFicha() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre, sair, userId } = useSessao();
  const [aba, setAba] = useState<Aba>("ficha");
  const [notasModo, setNotasModo] = useState<"lore" | "bloco">("lore");
  const dados = useMesa(mesa?.id, false);
  const { ativo: combateAtivo } = useCombateAtivo(mesa?.id);

  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else if (eMestre) router.replace("/mestre");
  }, [carregando, membro, eMestre, router]);

  if (!mesa || !membro || eMestre) {
    return <p className="p-10 text-center text-lg italic text-tinta-suave">Abrindo sua ficha…</p>;
  }

  const eu = dados.personagens.linhas.find((p) => p.id === membro.personagem_id);
  const privado = dados.privados.linhas.find((p) => p.personagem_id === membro.personagem_id);
  const meusDetalhes = eu
    ? dados.detalhes.linhas.find((d) => d.personagem_id === eu.id && d.variante === varianteAtiva(eu))
    : undefined;
  const companheiros = dados.publico.linhas.filter((p) => p.id !== membro.personagem_id && !p.arquivado);

  return (
    <div className="pb-24">
      <main className="mx-auto max-w-xl px-4 pt-4">
        <header className="mb-4 flex items-center gap-3">
          <Brasao tamanho={30} />
          <p className="titulo mr-auto text-lg text-marinho">{mesa.nome}</p>
          <Conexao status={dados.personagens.status} escuro={false} />
          <button onClick={sair} className="text-sm text-tinta-suave underline underline-offset-2">
            Sair
          </button>
        </header>

        {aba === "ficha" &&
          (eu ? (
            <>
              <FichaCompleta personagem={eu} dados={dados} eMestre={false} />
              {companheiros.length > 0 && (
                <section className="mt-7" aria-label="Seus companheiros">
                  <h2 className="titulo mb-2 text-lg text-marinho">Seus companheiros</h2>
                  <ul className="folha divide-y divide-ouro-escuro/20 px-4">
                    {companheiros.map((c) => (
                      <li key={c.id} className="flex items-baseline justify-between gap-3 py-2.5">
                        <span className="titulo truncate text-marinho">{c.nome}</span>
                        <span className="numeros shrink-0 text-tinta-suave">NEX {c.nex ?? "–"}%</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ) : (
            <p className="folha p-4 italic">Carregando sua ficha…</p>
          ))}

        {aba === "itens" && eu && (
          <Inventario personagem={eu} forca={meusDetalhes?.atributos?.FOR ?? 0} dados={dados} userId={userId} />
        )}

        {aba === "dados" && eu && (
          <Rolador
            mesaId={mesa.id}
            personagemId={eu.id}
            atributos={meusDetalhes?.atributos}
            pericias={meusDetalhes?.pericias ?? []}
            eMestre={false}
          />
        )}

        {aba === "combate" && <OrdemTurnos mesaId={mesa.id} meuPersonagem={membro.personagem_id} />}

        {aba === "codice" && <CodiceJogador mesaId={mesa.id} />}

        {aba === "notas" && (
          <div className="grid gap-3">
            <div className="segmentos" style={{ gridTemplateColumns: "1fr 1fr" }} role="tablist" aria-label="Notas">
              {(["lore", "bloco"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={notasModo === m}
                  onClick={() => setNotasModo(m)}
                  className="titulo"
                  style={notasModo === m ? { background: "var(--color-marinho)", color: "var(--color-pergaminho-claro)" } : undefined}
                >
                  {m === "lore" ? "Minha lore" : "Bloco de notas"}
                </button>
              ))}
            </div>
            {notasModo === "lore" && membro.personagem_id ? (
              <CadernoLore mesaId={mesa.id} personagemId={membro.personagem_id} />
            ) : (
              <Notas
                key={membro.personagem_id ?? ""}
                valor={privado?.anotacoes ?? ""}
                onSalvar={(t) => dados.salvarNotas(membro.personagem_id!, t)}
              />
            )}
          </div>
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ouro-escuro/40 bg-pergaminho-claro/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        aria-label="Seções"
      >
        <ul className="mx-auto flex max-w-xl">
          {ABAS.map((a) => (
            <li key={a.id} className="flex-1">
              <button
                onClick={() => setAba(a.id)}
                aria-current={aba === a.id ? "page" : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2 ${
                  aba === a.id ? "text-marinho" : "text-tinta-suave/70"
                }`}
              >
                {a.id === "combate" && combateAtivo && aba !== "combate" && (
                  <span className="absolute ml-5 h-2.5 w-2.5 rounded-full bg-pv" aria-label="combate em andamento" />
                )}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d={a.icone} />
                </svg>
                <span className={`titulo text-sm ${aba === a.id ? "border-b-2 border-ouro" : "border-b-2 border-transparent"}`}>
                  {a.rotulo}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
