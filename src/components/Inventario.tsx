"use client";

import { useState } from "react";
import { NavegadorCatalogo } from "./NavegadorCatalogo";
import {
  TIPOS, capacidadeCarga, detalhes, linhaCurta, useCatalogo, useItensPersonagem, type EntradaCatalogo, type ItemPersonagem, type Secao,
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

  const porId = new Map(catalogo.map((c) => [c.id, c]));
  const temMochila = itens.linhas.some((i) => normal(i.nome) === "mochila militar");
  const capacidade = capacidadeCarga(forca, temMochila ? 2 : 0);
  const usados = itens.linhas
    .filter((i) => i.secao === "inventario")
    .reduce((s, i) => s + (Number(i.espacos) || 0) * Math.max(1, i.quantidade), 0);

  async function adicionar(e: EntradaCatalogo, secao: Secao) {
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

  async function criarPreset(i: ItemPersonagem, c: EntradaCatalogo) {
    const d = c.dados as Record<string, string | number | undefined>;
    const dano = String(d.dano ?? "").split("/")[0];
    const corpoACorpo = String(d.subtipo ?? "").includes("Corpo a Corpo");
    const { error } = await supabase().from("presets_dados").insert({
      mesa_id: p.mesa_id,
      personagem_id: p.id,
      titulo: i.nome,
      tipo: "arma",
      atributo: corpoACorpo ? "FOR" : "AGI",
      bonus: 0,
      margem: Number(d.margem ?? 20),
      multiplicador: Number(d.multiplicador ?? 2),
      expressao: dano,
    });
    if (error) return alert(error.message);
    alert(`Preset "${i.nome}" criado na aba Dados. Ajuste o bônus da perícia (Luta ou Pontaria) lá.`);
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
                const curta = c ? linhaCurta(c) : [i.categoria && `cat. ${i.categoria}`, i.espacos && `${i.espacos} esp.`].filter(Boolean).join(", ");
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
                            placeholder="Munição restante, quem deu, modificações…"
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
                            <button onClick={() => criarPreset(i, c)} className="rounded-sm border border-ouro-escuro/40 px-2.5 py-1 text-marinho">
                              Criar preset de dados
                            </button>
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
          onFechar={() => setCatalogoAberto(false)}
        />
      )}
    </div>
  );
}

function normal(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
