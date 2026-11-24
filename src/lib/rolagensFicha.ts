import { armaComMelhorias, type EntradaCatalogo, type ItemPersonagem } from "./catalogo";
import type { Preset } from "./dados";
import { normalizar } from "./catalogo";
import type { Atributo, Pericia } from "./tipos";

export interface RolagemFicha {
  preset: Preset;
  /** De onde veio (nome do item, ritual ou poder). */
  origem: string;
  /** Texto curto extra: custo em PE, modificações aplicadas… */
  nota?: string;
}

export interface GrupoFicha {
  titulo: string;
  itens: RolagemFicha[];
}

// "3d8+3", "2d6", "1d8 + 2" (sem pegar o "x 10" de "3d10 x 10")
const RE_DADOS = /(\d+d\d+(?:\s*[+-]\s*\d+(?!d))?)/gi;

function dadosNoTexto(texto: string | null | undefined): string[] {
  if (!texto) return [];
  const achados = [...texto.matchAll(RE_DADOS)].map((m) => m[1].replace(/\s/g, "").toLowerCase());
  return [...new Set(achados)];
}

function presetVirtual(id: string, campos: Partial<Preset> & Pick<Preset, "titulo" | "tipo" | "expressao">): Preset {
  return {
    id: `ficha:${id}`,
    mesa_id: "",
    personagem_id: null,
    atributo: null,
    bonus: 0,
    margem: 20,
    multiplicador: 2,
    ordem: 0,
    ...campos,
  };
}

function bonusPericia(pericias: Pericia[], nome: string) {
  return pericias.find((p) => normalizar(p.nome) === normalizar(nome))?.bonus ?? 0;
}

/**
 * Rolagens tiradas automaticamente dos itens, rituais e poderes da ficha.
 * Armas já somam a perícia (Luta ou Pontaria) e as modificações/maldições aplicadas.
 * Como são calculadas na hora, mudar uma modificação atualiza a rolagem sozinho.
 */
export function rolagensDaFicha(
  itens: ItemPersonagem[],
  catalogo: Map<string, EntradaCatalogo>,
  pericias: Pericia[],
  atributos: Partial<Record<Atributo, number>> = {},
): GrupoFicha[] {
  const armas: RolagemFicha[] = [];
  const rituais: RolagemFicha[] = [];
  const outros: RolagemFicha[] = [];
  const habilidades: RolagemFicha[] = [];

  for (const i of itens) {
    const c = i.catalogo_id ? catalogo.get(i.catalogo_id) : undefined;
    const d = (c?.dados ?? {}) as Record<string, unknown>;
    const mel = i.melhorias ?? [];

    if (c?.tipo === "arma" && d.dano) {
      const sub = String(d.subtipo ?? "");
      const corpo = /corpo a corpo/i.test(sub);
      const arremesso = /arremess/i.test(`${sub} ${c.resumo}`);
      const pericia = corpo ? "Luta" : "Pontaria";
      const atributo: Atributo = corpo ? "FOR" : "AGI";
      // corpo a corpo e arremesso somam a Força no dano (não multiplica no crítico)
      const forca = corpo || arremesso ? atributos.FOR ?? 0 : 0;
      const arma = armaComMelhorias(String(d.dano).split("/")[0], Number(d.margem ?? 20), Number(d.multiplicador ?? 2), mel, forca);
      armas.push({
        origem: i.nome,
        preset: presetVirtual(i.id, {
          titulo: i.nome,
          tipo: "arma",
          atributo,
          bonus: bonusPericia(pericias, pericia) + arma.ataque,
          margem: arma.margem,
          multiplicador: arma.multiplicador,
          expressao: arma.dano,
          dadosCrit: arma.dadosCrit,
        }),
        nota: [`${pericia}`, forca ? `Força +${forca} no dano` : null, mel.length ? mel.map((m) => m.nome).join(", ") : null]
          .filter(Boolean)
          .join("; "),
      });
      continue;
    }

    if (c?.tipo === "ritual") {
      const custo = Number(d.custo_pe ?? 0);
      const base = dadosNoTexto(c.resumo)[0];
      if (base) {
        rituais.push({
          origem: i.nome,
          preset: presetVirtual(`${i.id}:b`, { titulo: i.nome, tipo: "livre", expressao: base }),
          nota: custo ? `${custo} PE` : undefined,
        });
      }
      for (const [forma, rotulo] of [["discente", "discente"], ["verdadeiro", "verdadeiro"]] as const) {
        const txt = d[forma] ? String(d[forma]) : "";
        const expr = dadosNoTexto(txt).find((x) => !x.startsWith("+"));
        const extra = txt.match(/\+(\d+)\s*PE/i)?.[1];
        if (expr) {
          rituais.push({
            origem: i.nome,
            preset: presetVirtual(`${i.id}:${forma}`, { titulo: `${i.nome} (${rotulo})`, tipo: "livre", expressao: expr }),
            nota: extra ? `${custo + Number(extra)} PE` : undefined,
          });
        }
      }
      continue;
    }

    // demais itens, poderes e habilidades: qualquer dado citado no texto
    const textos = dadosNoTexto(c?.resumo ?? i.resumo);
    const destino = i.secao === "inventario" ? outros : habilidades;
    textos.forEach((expr, k) =>
      destino.push({
        origem: i.nome,
        preset: presetVirtual(`${i.id}:${k}`, {
          titulo: textos.length > 1 ? `${i.nome} (${expr})` : i.nome,
          tipo: "livre",
          expressao: expr,
        }),
        nota: (c?.resumo ?? i.resumo)?.slice(0, 90),
      }),
    );
  }

  return [
    { titulo: "Armas", itens: armas },
    { titulo: "Rituais", itens: rituais },
    { titulo: "Itens", itens: outros },
    { titulo: "Habilidades e poderes", itens: habilidades },
  ].filter((g) => g.itens.length);
}
