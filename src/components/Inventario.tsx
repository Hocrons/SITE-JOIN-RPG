"use client";

import { useState } from "react";
import { NavegadorCatalogo } from "./NavegadorCatalogo";
import {
  TIPOS, armaComMelhorias, capacidadeCarga, categoriaFinal, detalhes, linhaCurta, useCatalogo, useItensPersonagem,
  type EntradaCatalogo, type ItemPersonagem, type Melhoria, type Secao,
} from "@/lib/catalogo";
import { supabase } from "@/lib/supabase";
import type { Personagem } from "@/lib/tipos";
import type { DadosMesa } from "@/lib/useMesa";

interface Props {
  personagem: Personagem;
  forca: number;
  dados: DadosMesa;
  userId: string | null;
}

const SECOES: { id: Secao; titulo: string; vazio: string; filtro: string | null }[] = [
  { id: "inventario", titulo: "Inventário", vazio: "Nenhum item ainda.", filtro: "armas" },
  { id: "habilidades", titulo: "Habilidades e poderes", vazio: "Origem, poderes de classe, trilha e poderes paranormais aparecem aqui.", filtro: "classe" },
  { id: "rituais", titulo: "Rituais", vazio: "Nenhum ritual conhecido.", filtro: "rituais" },
];

export function Inventario({ personagem: p, forca, dados, userId }: Props) {
  const itens = useItensPersonagem(p.mesa_id, p.id);
  const { todos: catalogo } = useCatalogo(p.mesa_id);
  const [catalogoAberto, setCatalogoAberto] = useState<string | null | false>(false);
  const [aberto, setAberto] = useState<string | null>(null);
  /** Item que vai receber a próxima modificação/maldição escolhida no catálogo. */
  const [alvo, setAlvo] = useState<string | null>(null);
  /** Modificação/maldição escolhida no catálogo geral, esperando o item. */
  const [semItem, setSemItem] = useState<EntradaCatalogo | null>(null);

  const porId = new Map(catalogo.map((c) => [c.id, c]));
  const temMochila = itens.linhas.some((i) => normal(i.nome) === "mochila militar");
  const capacidade = capacidadeCarga(forca, temMochila ? 2 : 0);
  const usados = itens.linhas
    .filter((i) => i.secao === "inventario")
    .reduce((s, i) => s + (Number(i.espacos) || 0) * Math.max(1, i.quantidade), 0);

  const aceitaMelhoria = (i: ItemPersonagem) =>
    i.secao === "inventario" && ["arma", "municao", "protecao", "item", "item_amaldicoado"].includes(i.tipo ?? "");

  async function aplicar(i: ItemPersonagem, e: EntradaCatalogo) {
    const atuais = i.melhorias ?? [];
    if (atuais.some((m) => m.nome === e.nome)) return alert(`${i.nome} já tem ${e.nome}. Iguais não se acumulam.`);
    const nova: Melhoria = {
      id: crypto.randomUUID(),
      catalogo_id: e.id,
      nome: e.nome,
      tipo: e.tipo === "maldicao" ? "maldicao" : "modificacao",
      efeito: e.resumo,
      elemento: (e.dados.elemento as string) ?? null,
    };
    await mudar(i, { melhorias: [...atuais, nova] });
    setAberto(i.id);
  }

  async function tirarMelhoria(i: ItemPersonagem, m: Melhoria) {
    if (!confirm(`Tirar ${m.nome} de ${i.nome}?`)) return;
    await mudar(i, { melhorias: (i.melhorias ?? []).filter((x) => x.id !== m.id) });
  }

  async function adicionar(e: EntradaCatalogo, secao: Secao) {
    if (e.tipo === "modificacao" || e.tipo === "maldicao") {
      const item = alvo ? itens.linhas.find((x) => x.id === alvo) : undefined;
      if (item) return aplicar(item, e);
      return setSemItem(e);
    }
    const d = e.dados as Record<string, unknown>;
    const ordem = itens.linhas.filter((i) => i.secao === secao).length;
    const { data, error } = await supabase()
      .from("personagem_itens")
      .insert({
        personagem_id: p.id,
        catalogo_id: e.id,
        secao,
        tipo: e.tipo,
        nome: e.nome,
        resumo: e.resumo,
        categoria: (d.categoria as string) ?? null,
        espacos: (d.espacos as number) ?? null,
        ordem,
      })
      .select()
      .single();
    if (error) return alert(error.message);
    itens.setLinhas((l) => (l.some((x) => x.id === data.id) ? l : [...l, data as ItemPersonagem & Record<string, unknown>]));
  }

  async function mudar(i: ItemPersonagem, patch: Partial<ItemPersonagem>) {
    itens.setLinhas((l) => l.map((x) => (x.id === i.id ? { ...x, ...patch } : x)));
    const { error } = await supabase().from("personagem_itens").update(patch).eq("id", i.id);
    if (error) {
      alert(error.message);
      itens.recarregar();
    }
  }

  async function remover(i: ItemPersonagem) {
    if (!confirm(`Tirar "${i.nome}" da ficha?`)) return;
    itens.setLinhas((l) => l.filter((x) => x.id !== i.id));
    const { error } = await supabase().from("personagem_itens").delete().eq("id", i.id);
    if (error) {
      alert(error.message);
      itens.recarregar();
    }
  }

  function conjurar(i: ItemPersonagem, c: EntradaCatalogo | undefined) {
    const custo = Number(c?.dados.custo_pe ?? 0);
    if (!custo) return;
    if (p.pe_atual < custo) return alert(`Você tem ${p.pe_atual} PE; ${i.nome} custa ${custo}.`);
    dados.ajustar(p, "pe_atual", -custo);
  }

  return (
    <div className="grid gap-5">
      {SECOES.map((s) => {
        const lista = itens.linhas.filter((i) => i.secao === s.id);
        return (
          <section key={s.id} className="folha px-4 pb-4 pt-3" aria-label={s.titulo}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h2 className="titulo text-xl text-marinho">{s.titulo}</h2>
              {s.id === "inventario" && (
                <span className={`numeros text-sm ${usados > capacidade ? "text-pv" : "text-tinta-suave"}`} title="Espaços usados / capacidade (5 por ponto de Força)">
                  {usados} / {capacidade} espaços
                </span>
              )}
              {s.id === "rituais" && <span className="numeros text-sm text-tinta-suave">PE {p.pe_atual}</span>}
            </div>
            {s.id === "inventario" && usados > capacidade && (
              <p className="mb-1 text-sm italic text-pv">Sobrecarregado: acima da capacidade de carga.</p>
            )}
            <ul className="divide-y divide-ouro-escuro/15">
              {lista.map((i) => {
                const c = i.catalogo_id ? porId.get(i.catalogo_id) : undefined;
                const exp = aberto === i.id;
                const mel = i.melhorias ?? [];
                const cat = categoriaFinal(i);
                const curta = mel.length
                  ? [cat.texto && `cat. ${cat.texto}`, i.espacos != null && `${i.espacos} esp.`, `${mel.length} ${mel.length === 1 ? "melhoria" : "melhorias"}`]
                      .filter(Boolean)
                      .join(", ")
                  : c
                    ? linhaCurta(c)
                    : [i.categoria && `cat. ${i.categoria}`, i.espacos && `${i.espacos} esp.`].filter(Boolean).join(", ");
                const arma =
                  c?.tipo === "arma" && c.dados.dano && mel.length
                    ? armaComMelhorias(
                        String(c.dados.dano).split("/")[0],
                        Number(c.dados.margem ?? 20),
                        Number(c.dados.multiplicador ?? 2),
                        mel,
                        /corpo a corpo|arremess/i.test(String(c.dados.subtipo ?? "")) ? forca : 0,
                      )
                    : null;
                return (
                  <li key={i.id} className="py-2">
                    <div className="flex items-start gap-2">
                      <button className="min-w-0 flex-1 text-left" onClick={() => setAberto(exp ? null : i.id)} aria-expanded={exp}>
                        <span className="titulo text-marinho">
                          {i.nome}
                          {i.quantidade > 1 && <span className="numeros ml-1 text-tinta-suave">×{i.quantidade}</span>}
                        </span>
                        <span className="block truncate text-sm italic text-tinta-suave">
                          {TIPOS[i.tipo ?? ""]?.rotulo ?? "Item"}
                          {curta ? `, ${curta}` : ""}
                        </span>
                      </button>
                      {s.id === "rituais" && c?.dados.custo_pe ? (
                        <button
                          onClick={() => conjurar(i, c)}
                          className="shrink-0 rounded-sm border border-ouro-escuro/50 px-2.5 py-1 text-sm text-marinho hover:bg-ouro-claro/30"
                          title="Gasta o custo básico em PE"
                        >
                          Conjurar −{String(c.dados.custo_pe)} PE
                        </button>
                      ) : null}
                    </div>
                    {exp && (
                      <div className="mt-1.5 rounded-sm bg-pergaminho/60 p-2.5 text-[0.95rem]">
                        {(c?.resumo || i.resumo) && <p>{c?.resumo || i.resumo}</p>}
                        {c?.descricao && <p className="mt-1.5 whitespace-pre-wrap">{c.descricao}</p>}
                        {aceitaMelhoria(i) && (
                          <div className="mt-2 border-t border-ouro-escuro/20 pt-2">
                            <p className="titulo text-sm text-marinho">Modificações e maldições</p>
                            {mel.length > 0 ? (
                              <ul className="mt-1 grid gap-1">
                                {mel.map((m) => (
                                  <li key={m.id} className="flex items-start gap-2">
                                    <span className={`losango mt-1.5 ${m.tipo === "maldicao" ? "bg-pv" : "bg-ouro-escuro"}`} aria-hidden />
                                    <span className="min-w-0 flex-1">
                                      <b className="font-semibold text-marinho">{m.nome}</b>
                                      {m.tipo === "maldicao" && m.elemento ? <span className="text-tinta-suave"> ({m.elemento})</span> : null}
                                      <span className="block text-sm">{m.efeito}</span>
                                    </span>
                                    <button onClick={() => tirarMelhoria(i, m)} className="px-1 text-tinta-suave hover:text-pv" aria-label={`Tirar ${m.nome}`}>
                                      ✕
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm italic text-tinta-suave">Nenhuma ainda.</p>
                            )}
                            {cat.soma > 0 && (
                              <p className="mt-1 text-sm">
                                Categoria{" "}
                                <b className="numeros">{cat.texto ?? "?"}</b>
                                {cat.base != null && (
                                  <span className="text-tinta-suave">
                                    {" "}(base {i.categoria}, +{cat.soma} pelas melhorias)
                                  </span>
                                )}
                              </p>
                            )}
                            {arma && (
                              <p className="mt-0.5 text-sm">
                                Com as melhorias:{" "}
                                <span className="numeros">
                                  dano {arma.dano}, crítico {arma.margem}/×{arma.multiplicador}
                                  {arma.ataque ? `, ataque +${arma.ataque}` : ""}
                                </span>
                              </p>
                            )}
                            <button
                              onClick={() => {
                                setAlvo(i.id);
                                setCatalogoAberto("melhorias");
                              }}
                              className="mt-1.5 rounded-sm border border-ouro-escuro/40 px-2.5 py-1 text-sm text-marinho"
                            >
                              + Modificação ou maldição
                            </button>
                          </div>
                        )}
                        {c && (
                          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                            {detalhes(c).map(([k, v]) => (
                              <div key={k} className="contents">
                                <dt className="text-tinta-suave">{k}</dt>
                                <dd>{v}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        <label className="mt-2 block text-sm">
                          <span className="text-tinta-suave">Sua anotação</span>
                          <textarea
                            className="campo mt-0.5 min-h-14 w-full text-base"
                            defaultValue={i.nota}
                            placeholder="Munição restante, quem deu…"
                            onBlur={(e) => e.target.value !== i.nota && mudar(i, { nota: e.target.value })}
                          />
                        </label>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          {s.id === "inventario" && (
                            <span className="flex items-center overflow-hidden rounded-sm border border-ouro-escuro/40">
                              <button className="px-2.5 py-1" onClick={() => mudar(i, { quantidade: Math.max(1, i.quantidade - 1) })} aria-label="Menos um">
                                −
                              </button>
                              <span className="numeros px-2">{i.quantidade}</span>
                              <button className="px-2.5 py-1" onClick={() => mudar(i, { quantidade: i.quantidade + 1 })} aria-label="Mais um">
                                +
                              </button>
                            </span>
                          )}
                          {c?.tipo === "arma" && c.dados.dano ? (
                            <span className="text-tinta-suave">Pronta para rolar em Dados, na aba “Da ficha”.</span>
                          ) : null}
                          <button onClick={() => remover(i)} className="ml-auto px-2 py-1 text-pv underline underline-offset-2">
                            Tirar da ficha
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {lista.length === 0 && <li className="py-2 italic text-tinta-suave">{s.vazio}</li>}
            </ul>
            <button
              onClick={() => setCatalogoAberto(s.filtro)}
              className="mt-2 w-full rounded-sm border border-dashed border-ouro-escuro/60 py-2 text-marinho"
            >
              + Adicionar do catálogo
            </button>
          </section>
        );
      })}

      {catalogoAberto !== false && (
        <NavegadorCatalogo
          mesaId={p.mesa_id}
          userId={userId}
          filtroInicial={catalogoAberto}
          onEscolher={adicionar}
          onFechar={() => {
            setCatalogoAberto(false);
            setAlvo(null);
          }}
        />
      )}

      {semItem && (
        <div role="dialog" aria-modal="true" aria-label={`Aplicar ${semItem.nome}`} className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center">
          <div className="folha-solida w-full max-w-md p-4">
            <h2 className="titulo text-lg text-marinho">Aplicar {semItem.nome} em qual item?</h2>
            <p className="text-sm text-tinta-suave">
              {semItem.tipo === "maldicao" ? "Maldições" : "Modificações"} entram no item e aumentam a categoria dele.
            </p>
            <ul className="mt-2 max-h-72 divide-y divide-ouro-escuro/15 overflow-auto">
              {itens.linhas.filter(aceitaMelhoria).map((i) => (
                <li key={i.id}>
                  <button
                    className="w-full py-2 text-left"
                    onClick={() => {
                      const e = semItem;
                      setSemItem(null);
                      setCatalogoAberto(false);
                      aplicar(i, e);
                    }}
                  >
                    <span className="titulo text-marinho">{i.nome}</span>
                    <span className="block text-sm italic text-tinta-suave">{TIPOS[i.tipo ?? ""]?.rotulo ?? "Item"}</span>
                  </button>
                </li>
              ))}
              {!itens.linhas.some(aceitaMelhoria) && (
                <li className="py-2 italic text-tinta-suave">Adicione primeiro uma arma, proteção ou acessório ao inventário.</li>
              )}
            </ul>
            <button className="mt-2 text-tinta-suave underline underline-offset-2" onClick={() => setSemItem(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function normal(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
