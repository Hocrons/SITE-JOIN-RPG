"use client";

import { useState } from "react";
import { ATRIBUTOS, NOME_ATRIBUTO } from "@/lib/regras";
import type { Atributo, Ficha, FichaDetalhes, Pericia, Personagem, Variante } from "@/lib/tipos";
import type { DadosMesa } from "@/lib/useMesa";

interface Props {
  personagem: Personagem;
  fichas: Ficha[];
  detalhes: FichaDetalhes[];
  eMestre: boolean;
  dados: DadosMesa;
  onFechar: () => void;
}

type Rascunho = {
  ficha: Pick<Ficha, "nex" | "pv_max" | "san_max" | "pe_max" | "pd_max">;
  det: Pick<FichaDetalhes, "defesa" | "deslocamento" | "atributos" | "pericias">;
};

function rascunhoDe(v: Variante, fichas: Ficha[], detalhes: FichaDetalhes[]): Rascunho {
  const f = fichas.find((x) => x.variante === v);
  const d = detalhes.find((x) => x.variante === v);
  return {
    ficha: {
      nex: f?.nex ?? Number(v),
      pv_max: f?.pv_max ?? 0,
      san_max: f?.san_max ?? 0,
      pe_max: f?.pe_max ?? 0,
      pd_max: f?.pd_max ?? null,
    },
    det: {
      defesa: d?.defesa ?? null,
      deslocamento: d?.deslocamento ?? "",
      atributos: { AGI: 0, FOR: 0, INT: 0, PRE: 0, VIG: 0, ...(d?.atributos ?? {}) },
      pericias: [...(d?.pericias ?? [])],
    },
  };
}

function Numero({
  rotulo, valor, onChange, vazio = false,
}: { rotulo: string; valor: number | null; onChange: (n: number | null) => void; vazio?: boolean }) {
  return (
    <label className="grid gap-0.5 text-sm">
      <span className="text-tinta-suave">{rotulo}</span>
      <input
        className="campo numeros !py-1.5 text-lg"
        inputMode="numeric"
        value={valor ?? ""}
        placeholder={vazio ? "–" : "0"}
        onChange={(e) => {
          const t = e.target.value.trim();
          if (t === "" || t === "-") return onChange(vazio ? null : 0);
          const n = parseInt(t, 10);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    </label>
  );
}

export function EditorFicha({ personagem, fichas, detalhes, eMestre, dados, onFechar }: Props) {
  const [aba, setAba] = useState<Variante>(personagem.ancora_ativa ? "50" : "99");
  const [id, setId] = useState({
    nome: personagem.nome,
    classe: personagem.classe ?? "",
    trilha: personagem.trilha ?? "",
    origem: personagem.origem ?? "",
    tem_marca: personagem.tem_marca,
    usa_determinacao: personagem.usa_determinacao,
  });
  const [r, setR] = useState<Record<Variante, Rascunho>>({
    "99": rascunhoDe("99", fichas, detalhes),
    "50": rascunhoDe("50", fichas, detalhes),
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const atual = r[aba];
  const outra: Variante = aba === "99" ? "50" : "99";

  function mudarFicha(patch: Partial<Rascunho["ficha"]>) {
    setR((x) => ({ ...x, [aba]: { ...x[aba], ficha: { ...x[aba].ficha, ...patch } } }));
  }
  function mudarDet(patch: Partial<Rascunho["det"]>) {
    setR((x) => ({ ...x, [aba]: { ...x[aba], det: { ...x[aba].det, ...patch } } }));
  }
  function mudarPericia(i: number, patch: Partial<Pericia>) {
    mudarDet({ pericias: atual.det.pericias.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const patch: Partial<Personagem> = {
        nome: id.nome.trim() || personagem.nome,
        classe: id.classe.trim() || null,
        trilha: id.trilha.trim() || null,
        origem: id.origem.trim() || null,
      };
      if (eMestre) {
        patch.tem_marca = id.tem_marca;
        patch.usa_determinacao = id.usa_determinacao;
      }
      for (const v of ["99", "50"] as Variante[]) {
        await dados.atualizarFicha(personagem.id, v, r[v].ficha);
        await dados.atualizarDetalhes(personagem.id, v, {
          ...r[v].det,
          deslocamento: r[v].det.deslocamento || null,
          pericias: r[v].det.pericias.filter((p) => p.nome.trim()),
        });
      }
      await dados.atualizarPersonagem(personagem.id, patch);
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 sm:items-center" role="dialog" aria-modal aria-label="Editar ficha">
      <div className="folha folha-solida flex max-h-[92dvh] w-full max-w-lg flex-col !rounded-b-none sm:!rounded-sm">
        <header className="flex items-center justify-between border-b border-ouro-escuro/25 px-4 py-3">
          <h2 className="titulo text-xl text-marinho">Editar ficha</h2>
          <button onClick={onFechar} className="px-2 text-2xl leading-none text-tinta-suave" aria-label="Fechar sem salvar">
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-4 py-4">
          <section className="grid grid-cols-2 gap-3">
            <label className="col-span-2 grid gap-0.5 text-sm">
              <span className="text-tinta-suave">Nome</span>
              <input className="campo text-lg" value={id.nome} onChange={(e) => setId({ ...id, nome: e.target.value })} />
            </label>
            <label className="grid gap-0.5 text-sm">
              <span className="text-tinta-suave">Classe</span>
              <input className="campo" value={id.classe} onChange={(e) => setId({ ...id, classe: e.target.value })} />
            </label>
            <label className="grid gap-0.5 text-sm">
              <span className="text-tinta-suave">Trilha</span>
              <input className="campo" value={id.trilha} onChange={(e) => setId({ ...id, trilha: e.target.value })} />
            </label>
            <label className="col-span-2 grid gap-0.5 text-sm">
              <span className="text-tinta-suave">Origem</span>
              <input className="campo" value={id.origem} onChange={(e) => setId({ ...id, origem: e.target.value })} />
            </label>
            {eMestre && (
              <div className="col-span-2 grid gap-2 rounded-sm border border-ouro-escuro/30 p-3">
                <p className="titulo text-sm text-marinho">Só o mestre</p>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="!w-4" checked={id.tem_marca} onChange={(e) => setId({ ...id, tem_marca: e.target.checked })} />
                  Tem a Marca do Império
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="!w-4"
                    checked={id.usa_determinacao}
                    onChange={(e) => setId({ ...id, usa_determinacao: e.target.checked })}
                  />
                  Usa Determinação (PD substitui SAN e PE)
                </label>
              </div>
            )}
          </section>

          <div className="segmentos mt-5 !grid-cols-2" role="tablist" aria-label="Qual ficha editar">
            {(["99", "50"] as Variante[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={aba === v}
                onClick={() => setAba(v)}
                className={aba === v ? "!bg-marinho !text-ouro-claro" : ""}
              >
                Ficha {v}%
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-sm italic text-tinta-suave">
            {aba === "99" ? "Ficha normal." : "Ficha usada quando a Âncora está ativa."}
          </p>

          <section className="mt-3 grid grid-cols-3 gap-3">
            <Numero rotulo="NEX %" valor={atual.ficha.nex} onChange={(n) => mudarFicha({ nex: n ?? 0 })} />
            <Numero rotulo="Defesa" valor={atual.det.defesa} vazio onChange={(n) => mudarDet({ defesa: n })} />
            <label className="grid gap-0.5 text-sm">
              <span className="text-tinta-suave">Deslocamento</span>
              <input
                className="campo !py-1.5 text-lg"
                value={atual.det.deslocamento ?? ""}
                placeholder="9m"
                onChange={(e) => mudarDet({ deslocamento: e.target.value })}
              />
            </label>
            <Numero rotulo="PV máximo" valor={atual.ficha.pv_max} onChange={(n) => mudarFicha({ pv_max: n ?? 0 })} />
            <Numero rotulo="SAN máxima" valor={atual.ficha.san_max} onChange={(n) => mudarFicha({ san_max: n ?? 0 })} />
            <Numero rotulo="PE máximo" valor={atual.ficha.pe_max} onChange={(n) => mudarFicha({ pe_max: n ?? 0 })} />
            <Numero rotulo="PD máximo" valor={atual.ficha.pd_max} vazio onChange={(n) => mudarFicha({ pd_max: n })} />
          </section>

          <h3 className="titulo mt-5 text-lg text-marinho">Atributos</h3>
          <section className="mt-1 grid grid-cols-5 gap-2">
            {ATRIBUTOS.map((a) => (
              <label key={a} className="grid gap-0.5 text-center text-sm">
                <span className="titulo" title={NOME_ATRIBUTO[a]}>
                  {a}
                </span>
                <input
                  className="campo numeros !px-1 !py-1.5 text-center text-xl"
                  inputMode="numeric"
                  aria-label={NOME_ATRIBUTO[a]}
                  value={atual.det.atributos[a]}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    mudarDet({ atributos: { ...atual.det.atributos, [a]: Number.isNaN(n) ? 0 : n } });
                  }}
                />
              </label>
            ))}
          </section>

          <div className="mt-5 flex items-baseline justify-between">
            <h3 className="titulo text-lg text-marinho">Perícias</h3>
            {r[outra].det.pericias.length > 0 && (
              <button
                type="button"
                className="text-sm italic text-tinta-suave underline"
                onClick={() => mudarDet({ pericias: r[outra].det.pericias.map((p) => ({ ...p })) })}
              >
                Copiar da ficha {outra}%
              </button>
            )}
          </div>
          <ul className="mt-1 grid gap-2">
            {atual.det.pericias.map((p, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto_4.5rem_auto] items-center gap-2">
                <input
                  className="campo !py-1.5"
                  value={p.nome}
                  placeholder="Perícia"
                  aria-label="Nome da perícia"
                  onChange={(e) => mudarPericia(i, { nome: e.target.value })}
                />
                <select
                  className="campo !px-1 !py-1.5"
                  value={p.atributo}
                  aria-label="Atributo da perícia"
                  onChange={(e) => mudarPericia(i, { atributo: e.target.value as Atributo })}
                >
                  {ATRIBUTOS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <input
                  className="campo numeros !py-1.5 text-center"
                  inputMode="numeric"
                  aria-label="Bônus da perícia"
                  value={p.bonus}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    mudarPericia(i, { bonus: Number.isNaN(n) ? 0 : n });
                  }}
                />
                <button
                  type="button"
                  aria-label={`Remover ${p.nome || "perícia"}`}
                  className="px-1 text-xl text-pv"
                  onClick={() => mudarDet({ pericias: atual.det.pericias.filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 rounded-sm border border-dashed border-ouro-escuro/60 px-3 py-1.5 text-marinho"
            onClick={() => mudarDet({ pericias: [...atual.det.pericias, { nome: "", atributo: "AGI", bonus: 5 }] })}
          >
            + Adicionar perícia
          </button>
        </div>

        <footer className="flex items-center gap-3 border-t border-ouro-escuro/25 px-4 py-3">
          {erro && <p className="mr-auto text-sm text-pv">{erro}</p>}
          <button onClick={onFechar} className="ml-auto px-3 py-2 text-tinta-suave underline">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} className="botao-ouro px-5 py-2">
            {salvando ? "Salvando…" : "Salvar ficha"}
          </button>
        </footer>
      </div>
    </div>
  );
}
