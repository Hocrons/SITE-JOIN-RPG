"use client";

import { useEffect, useState } from "react";
import { useAoVivo } from "./aoVivo";
import { supabase } from "./supabase";

export type Secao = "inventario" | "habilidades" | "rituais";

export interface EntradaCatalogo {
  id: string;
  mesa_id: string | null;
  tipo: string;
  nome: string;
  dados: Record<string, unknown>;
  resumo: string;
  descricao: string;
  fonte: string | null;
  criado_por: string | null;
}

export interface ItemPersonagem {
  id: string;
  personagem_id: string;
  mesa_id: string;
  catalogo_id: string | null;
  secao: Secao;
  tipo: string | null;
  nome: string;
  resumo: string;
  categoria: string | null;
  espacos: number | null;
  quantidade: number;
  nota: string;
  equipado: boolean;
  ordem: number;
}

export const TIPOS: Record<string, { rotulo: string; plural: string; secao: Secao }> = {
  arma: { rotulo: "Arma", plural: "Armas", secao: "inventario" },
  protecao: { rotulo: "Proteção", plural: "Proteções", secao: "inventario" },
  item: { rotulo: "Item", plural: "Itens gerais", secao: "inventario" },
  municao: { rotulo: "Munição", plural: "Munições", secao: "inventario" },
  modificacao: { rotulo: "Modificação", plural: "Modificações", secao: "inventario" },
  item_amaldicoado: { rotulo: "Item amaldiçoado", plural: "Itens amaldiçoados", secao: "inventario" },
  maldicao: { rotulo: "Maldição", plural: "Maldições", secao: "inventario" },
  ritual: { rotulo: "Ritual", plural: "Rituais", secao: "rituais" },
  poder_paranormal: { rotulo: "Poder paranormal", plural: "Poderes paranormais", secao: "habilidades" },
  poder_classe: { rotulo: "Poder de classe", plural: "Poderes de classe", secao: "habilidades" },
  habilidade_trilha: { rotulo: "Habilidade de trilha", plural: "Trilhas", secao: "habilidades" },
  habilidade_classe: { rotulo: "Habilidade de classe", plural: "Habilidades de classe", secao: "habilidades" },
  poder_geral: { rotulo: "Poder geral", plural: "Poderes gerais", secao: "habilidades" },
  uso_pericia: { rotulo: "Uso de perícia", plural: "Usos de perícia", secao: "habilidades" },
  origem: { rotulo: "Origem", plural: "Origens", secao: "habilidades" },
  classe: { rotulo: "Classe", plural: "Classes", secao: "habilidades" },
};

export const FILTROS: { id: string; rotulo: string; tipos: string[] }[] = [
  { id: "armas", rotulo: "Armas", tipos: ["arma", "municao"] },
  { id: "equip", rotulo: "Equipamento", tipos: ["protecao", "item", "modificacao"] },
  { id: "amald", rotulo: "Amaldiçoados", tipos: ["item_amaldicoado", "maldicao"] },
  { id: "rituais", rotulo: "Rituais", tipos: ["ritual"] },
  { id: "paranormal", rotulo: "Poderes paranormais", tipos: ["poder_paranormal"] },
  { id: "classe", rotulo: "Classes e trilhas", tipos: ["classe", "habilidade_classe", "poder_classe", "habilidade_trilha"] },
  { id: "gerais", rotulo: "Poderes gerais", tipos: ["poder_geral"] },
  { id: "origem", rotulo: "Origens e perícias", tipos: ["origem", "uso_pericia"] },
];

/** Linhas de detalhe para mostrar, conforme o tipo. */
export function detalhes(e: Pick<EntradaCatalogo, "tipo" | "dados">): [string, string][] {
  const d = e.dados as Record<string, string | number | null | undefined>;
  const par = (r: string, v: unknown): [string, string] | null =>
    v === null || v === undefined || v === "" ? null : [r, String(v)];
  const lista: ([string, string] | null)[] = [];
  switch (e.tipo) {
    case "arma":
      lista.push(par("Dano", d.dano), par("Crítico", d.critico), par("Alcance", d.alcance), par("Tipo", d.tipo_dano),
        par("Categoria", d.categoria), par("Espaços", d.espacos), par("Grupo", d.subtipo));
      break;
    case "ritual":
      lista.push(par("Elemento", d.elemento), par("Círculo", d.circulo ? `${d.circulo}º` : null), par("Custo", d.custo_pe ? `${d.custo_pe} PE` : null),
        par("Execução", d.execucao), par("Alcance", d.alcance), par("Alvo / área", d.alvo), par("Duração", d.duracao),
        par("Resistência", d.resistencia), par("Discente", d.discente), par("Verdadeiro", d.verdadeiro));
      break;
    case "poder_paranormal":
      lista.push(par("Elemento", d.elemento), par("Pré-requisito", d.prerequisitos), par("Afinidade", d.afinidade));
      break;
    case "poder_classe":
      lista.push(par("Classe", d.classe), par("Pré-requisito", d.prerequisitos));
      break;
    case "poder_geral":
      lista.push(par("Pré-requisito", d.prerequisitos));
      break;
    case "uso_pericia":
      lista.push(par("Perícia", d.subtipo));
      break;
    case "habilidade_trilha":
      lista.push(par("Trilha", d.trilha ? `${d.trilha} (${d.classe})` : null), par("NEX", d.nex ? `${d.nex}%` : null));
      break;
    case "habilidade_classe":
      lista.push(par("Classe", d.classe), par("NEX", d.nex ? `${d.nex}%` : null));
      break;
    case "origem":
      lista.push(par("Perícias", d.pericias), par("Poder", typeof d.subtipo === "string" ? d.subtipo.replace("Poder: ", "") : null));
      break;
    case "maldicao":
      lista.push(par("Elemento", d.elemento), par("Aplica-se a", typeof d.subtipo === "string" ? d.subtipo.replace("Maldição para ", "") : null));
      break;
    default:
      lista.push(par("Elemento", d.elemento), par("Categoria", d.categoria), par("Espaços", d.espacos), par("Defesa", d.defesa ? `+${d.defesa}` : null),
        par("Grupo", d.subtipo));
  }
  return lista.filter(Boolean) as [string, string][];
}

/** Uma linha curta para a lista (ex.: "1d10 · crítico 19 · 2 espaços"). */
export function linhaCurta(e: Pick<EntradaCatalogo, "tipo" | "dados">): string {
  const d = e.dados as Record<string, string | number | null | undefined>;
  const partes: (string | null)[] = [];
  if (e.tipo === "arma") partes.push(String(d.dano ?? ""), d.critico ? `crítico ${d.critico}` : null, d.categoria ? `cat. ${d.categoria}` : null);
  else if (e.tipo === "ritual") partes.push(String(d.elemento ?? ""), d.circulo ? `${d.circulo}º círculo` : null, d.custo_pe ? `${d.custo_pe} PE` : null);
  else if (e.tipo === "habilidade_trilha") partes.push(String(d.trilha ?? ""), d.nex ? `NEX ${d.nex}%` : null);
  else if (e.tipo === "poder_classe" || e.tipo === "habilidade_classe") partes.push(String(d.classe ?? ""));
  else if (e.tipo === "poder_paranormal" || e.tipo === "maldicao") partes.push(String(d.elemento ?? ""));
  else if (e.tipo === "origem") partes.push(String(d.pericias ?? ""));
  else if (e.tipo === "uso_pericia") partes.push(String(d.subtipo ?? ""));
  else if (e.tipo === "poder_geral") partes.push(d.prerequisitos ? `requer ${d.prerequisitos}` : null);
  else partes.push(d.categoria != null ? `cat. ${d.categoria}` : null, d.espacos != null ? `${d.espacos} esp.` : null);
  return partes.filter(Boolean).join(", ");
}

// O catálogo base (livros) é grande e não muda: busca uma vez por sessão.
let cacheBase: EntradaCatalogo[] | null = null;
let promessaBase: Promise<EntradaCatalogo[]> | null = null;

async function carregarBase(): Promise<EntradaCatalogo[]> {
  if (cacheBase) return cacheBase;
  if (!promessaBase) {
    promessaBase = (async () => {
      const todos: EntradaCatalogo[] = [];
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase()
          .from("catalogo")
          .select("*")
          .is("mesa_id", null)
          .order("nome")
          .range(de, de + 999);
        if (error) throw error;
        todos.push(...((data ?? []) as EntradaCatalogo[]));
        if (!data || data.length < 1000) break;
      }
      cacheBase = todos;
      return todos;
    })();
  }
  return promessaBase;
}

/** Catálogo base + entradas da mesa (estas ao vivo). */
export function useCatalogo(mesaId: string | null | undefined) {
  const [base, setBase] = useState<EntradaCatalogo[]>(cacheBase ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const daMesa = useAoVivo<EntradaCatalogo & Record<string, unknown>>("catalogo", mesaId, {
    chave: (e) => String(e.id),
    ordenar: (a, b) => a.nome.localeCompare(b.nome),
  });

  useEffect(() => {
    let vivo = true;
    carregarBase()
      .then((b) => vivo && setBase(b))
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : String(e)));
    return () => {
      vivo = false;
    };
  }, []);

  const todos = [...daMesa.linhas, ...base];
  return { todos, base, daMesa: daMesa.linhas, erro, carregando: base.length === 0 && !erro };
}

/** Itens da ficha de um personagem (ao vivo). */
export function useItensPersonagem(mesaId: string | null | undefined, personagemId: string | null | undefined) {
  const todos = useAoVivo<ItemPersonagem & Record<string, unknown>>("personagem_itens", mesaId, {
    chave: (i) => String(i.id),
    ordenar: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  });
  return { ...todos, linhas: todos.linhas.filter((i) => i.personagem_id === personagemId) };
}

/** Normaliza para busca sem acento. */
export function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Capacidade de carga em espaços: 5 por ponto de Força (Força 0 = 2). */
export function capacidadeCarga(forca: number, extra = 0) {
  return (forca > 0 ? forca * 5 : 2) + extra;
}
