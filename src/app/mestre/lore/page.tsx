"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Brasao } from "@/components/Brasao";
import { Conexao } from "@/components/Conexao";
import { NavMestre } from "@/components/NavMestre";
import {
  ControleVisibilidade, EditorEntrada, ImportarMarkdown, NotasSecretas, NovaConexao, type Jogador,
} from "@/components/codice/EdicaoMestre";
import { Grafo } from "@/components/codice/Grafo";
import { LeituraEntrada } from "@/components/codice/LeituraEntrada";
import { filtrar, FiltrosCodice, ListaCodice, SeloVisibilidade, useFiltroCodice } from "@/components/codice/ListaCodice";
import { useAoVivo } from "@/lib/aoVivo";
import { useCombateAtivo } from "@/lib/combate";
import { TIPO, useLore } from "@/lib/lore";
import { useSessao } from "@/lib/sessao";
import type { Personagem } from "@/lib/tipos";

type L<T> = T & Record<string, unknown>;

export default function CodiceMestre() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre } = useSessao();
  const lore = useLore(mesa?.id, true);
  const { ativo: combate } = useCombateAtivo(mesa?.id);
  const personagens = useAoVivo<L<Personagem>>("personagens", mesa?.id, {
    chave: (p) => String(p.id),
    ordenar: (a, b) => a.ordem - b.ordem,
  });
  const [aberta, setAberta] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [vista, setVista] = useState<"entrada" | "grafo">("grafo");
  const [importar, setImportar] = useState(false);
  const [filtro, setFiltro] = useFiltroCodice();

  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else if (!eMestre) router.replace("/ficha");
  }, [carregando, membro, eMestre, router]);

  const visiveis = useMemo(() => filtrar(lore.entradas, lore.conexoes, filtro), [lore.entradas, lore.conexoes, filtro]);
  const jogadores: Jogador[] = personagens.linhas
    .filter((p) => p.tipo === "pj" && !p.arquivado)
    .map((p) => ({ id: p.id, nome: p.nome.split(" ")[0] }));

  if (!mesa || !eMestre) {
    return <main className="tema-mestre grid place-items-center italic text-nevoa/60">Abrindo o códice…</main>;
  }

  const entrada = lore.entradas.find((e) => e.id === aberta);
  const reveladas = lore.entradas.filter((e) => e.visibilidade !== "mestre").length;

  function abrir(id: string | null, ir = true) {
    setAberta(id);
    setEditando(false);
    if (id && ir) setVista("entrada");
  }

  async function nova() {
    const e = await lore.criarEntrada({ titulo: "Nova entrada", tipo: "nota", status: "aberto", visibilidade: "mestre" });
    if (e) {
      setAberta(e.id);
      setEditando(true);
      setVista("entrada");
    }
  }

  return (
    <main className="tema-mestre">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Brasao tamanho={38} />
          <div className="mr-auto">
            <h1 className="titulo text-2xl text-ouro-claro">{mesa.nome}</h1>
            <p className="text-sm italic text-nevoa/60">
              Códice da lore: <span className="numeros not-italic text-nevoa/80">{lore.entradas.length}</span> entradas,{" "}
              <span className="numeros not-italic text-nevoa/80">{reveladas}</span> reveladas
            </p>
          </div>
          <NavMestre emCombate={!!combate} />
          <Conexao status={lore.status} escuro />
        </header>

        <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="painel grid gap-3 p-3 lg:sticky lg:top-4" aria-label="Entradas do códice">
            <div className="flex gap-2">
              <button onClick={nova} className="botao-ouro flex-1 py-1.5">
                Nova entrada
              </button>
              <button
                onClick={() => setImportar(true)}
                className="rounded-sm border border-ouro/30 px-3 text-sm text-ouro-claro hover:bg-ouro/10"
              >
                Importar
              </button>
            </div>
            <FiltrosCodice entradas={lore.entradas} filtro={filtro} setFiltro={setFiltro} eMestre escuro />
            <div className="-mx-1 max-h-[60dvh] overflow-auto lg:max-h-[calc(100dvh-330px)]">
              <ListaCodice entradas={visiveis} selecionado={aberta} aoAbrir={(id) => abrir(id)} eMestre escuro />
            </div>
          </aside>

          <section className="grid gap-3" aria-label="Detalhe">
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-sm border border-ouro/30" role="tablist">
                {(["grafo", "entrada"] as const).map((v) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={vista === v}
                    disabled={v === "entrada" && !entrada}
                    onClick={() => setVista(v)}
                    className={`titulo px-4 py-1 text-sm disabled:opacity-35 ${vista === v ? "bg-ouro/90 text-marinho" : "text-ouro-claro hover:bg-ouro/10"}`}
                  >
                    {v === "grafo" ? "Grafo" : "Entrada"}
                  </button>
                ))}
              </div>
              {vista === "grafo" && (
                <p className="text-sm italic text-nevoa/50">
                  Tracejado: só o mestre vê. Clique para ver as ligações; arraste para reorganizar.
                </p>
              )}
            </div>

            {vista === "grafo" ? (
              <>
                <div className="painel overflow-hidden">
                  <Grafo
                    escuro
                    nos={visiveis.map((e) => ({ id: e.id, rotulo: e.titulo, cor: TIPO[e.tipo].cor, oculto: e.visibilidade === "mestre" }))}
                    arestas={lore.conexoes.map((c) => ({
                      id: c.id, origem: c.origem_id, destino: c.destino_id, rotulo: c.rotulo, oculta: c.visibilidade === "mestre",
                    }))}
                    selecionado={aberta}
                    aoSelecionar={(id) => abrir(id, false)}
                    altura="min(72dvh, 720px)"
                  />
                </div>
                {entrada && (
                  <div className="painel flex flex-wrap items-center gap-3 p-3">
                    <span className="losango" style={{ background: TIPO[entrada.tipo].cor }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="titulo text-ouro-claro">{entrada.titulo}</p>
                      <p className="line-clamp-1 text-sm text-nevoa/65">{entrada.resumo}</p>
                    </div>
                    <SeloVisibilidade vis={entrada.visibilidade} />
                    <button onClick={() => setVista("entrada")} className="rounded-sm border border-ouro/30 px-3 py-1 text-sm text-ouro-claro hover:bg-ouro/10">
                      Abrir
                    </button>
                  </div>
                )}
              </>
            ) : entrada ? (
              <div className="painel p-4 sm:p-5">
                {editando ? (
                  <EditorEntrada key={entrada.id} entrada={entrada} lore={lore} aoFechar={() => setEditando(false)} />
                ) : (
                  <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
                    <LeituraEntrada
                      entrada={entrada}
                      entradas={lore.entradas}
                      conexoes={lore.conexoes}
                      imagens={lore.imagens}
                      eMestre
                      escuro
                      aoAbrir={(id) => abrir(id)}
                      acoesConexao={(c) => (
                        <span className="flex items-center gap-2">
                          <ControleVisibilidade
                            compacto
                            vis={c.visibilidade}
                            quem={lore.quemVeConexao.get(c.id) ?? []}
                            jogadores={jogadores}
                            aoMudar={(v, ids) => lore.definirVisibilidade("conexao", c.id, v, ids)}
                          />
                          <button
                            onClick={() => confirm(`Apagar a conexão “${c.rotulo}”?`) && lore.excluirConexao(c.id)}
                            className="text-sm text-nevoa/40 hover:text-pv-vivo"
                            aria-label={`Apagar conexão ${c.rotulo}`}
                          >
                            ✕
                          </button>
                        </span>
                      )}
                    />
                    <div className="grid content-start gap-4">
                      <section className="grid gap-2" aria-label="Quem vê esta entrada">
                        <h3 className="titulo text-ouro-claro">Quem vê</h3>
                        <ControleVisibilidade
                          vis={entrada.visibilidade}
                          quem={lore.quemVeEntrada.get(entrada.id) ?? []}
                          jogadores={jogadores}
                          aoMudar={(v, ids) => lore.definirVisibilidade("entrada", entrada.id, v, ids)}
                        />
                        <p className="text-sm text-nevoa/55">
                          Os jogadores leem título, resumo, texto e imagens. As marcas ✅ 🟡 ❓ somem para eles. Conexões só aparecem
                          se as duas pontas e a própria conexão estiverem reveladas.
                        </p>
                      </section>
                      <div className="flex gap-2">
                        <button onClick={() => setEditando(true)} className="botao-ouro flex-1 py-1.5">
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Apagar “${entrada.titulo}” e todas as conexões dela? Não dá para desfazer.`)) {
                              if (await lore.excluirEntrada(entrada.id)) abrir(null);
                            }
                          }}
                          className="rounded-sm border border-pv-vivo/50 px-3 text-sm text-pv-vivo hover:bg-pv/20"
                        >
                          Apagar
                        </button>
                      </div>
                      <NotasSecretas entradaId={entrada.id} lore={lore} />
                      <section className="grid gap-2" aria-label="Nova conexão">
                        <h3 className="titulo text-ouro-claro">Ligar a outra entrada</h3>
                        <NovaConexao entrada={entrada} lore={lore} />
                      </section>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="painel p-5 italic text-nevoa/60">Escolha uma entrada na lista ou no grafo.</p>
            )}
          </section>
        </div>
      </div>
      {importar && (
        <ImportarMarkdown
          lore={lore}
          aoFechar={(primeira) => {
            setImportar(false);
            if (primeira) abrir(primeira);
          }}
        />
      )}
    </main>
  );
}
