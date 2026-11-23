"use client";

import { useState } from "react";
import { BarraStatus } from "./BarraStatus";
import { Condicoes } from "./Condicoes";
import { EditorFicha } from "./EditorFicha";
import { FotoPersonagem } from "./FotoPersonagem";
import { ATRIBUTOS, NOME_ATRIBUTO, descricaoPersonagem, varianteAtiva } from "@/lib/regras";
import type { CampoStatus, Ficha, Personagem } from "@/lib/tipos";
import type { DadosMesa } from "@/lib/useMesa";

export const CAMPOS_STATUS: {
  campo: CampoStatus; rotulo: string; nome: string; cor: string; corViva: string; max: keyof Ficha;
}[] = [
  { campo: "pv_atual", rotulo: "PV", nome: "Pontos de Vida", cor: "bg-pv", corViva: "bg-pv-vivo", max: "pv_max" },
  { campo: "san_atual", rotulo: "SAN", nome: "Sanidade", cor: "bg-san", corViva: "bg-san-vivo", max: "san_max" },
  { campo: "pe_atual", rotulo: "PE", nome: "Pontos de Esforço", cor: "bg-pe", corViva: "bg-pe-vivo", max: "pe_max" },
  { campo: "pd_atual", rotulo: "PD", nome: "Pontos de Determinação", cor: "bg-pd", corViva: "bg-pd-vivo", max: "pd_max" },
];

export function camposVisiveis(p: Personagem, f: Ficha | undefined) {
  return CAMPOS_STATUS.filter(({ campo, max }) => {
    if (campo === "pd_atual") return f?.pd_max != null || p.pd_atual != null || p.usa_determinacao;
    if (p.usa_determinacao && (campo === "san_atual" || campo === "pe_atual")) return false;
    return f?.[max] != null;
  });
}

interface Props {
  personagem: Personagem;
  dados: DadosMesa;
  eMestre: boolean;
}

/** A ficha inteira de um personagem, em pergaminho. Usada pelo jogador e pelo mestre. */
export function FichaCompleta({ personagem: p, dados, eMestre }: Props) {
  const [editando, setEditando] = useState(false);
  const v = varianteAtiva(p);
  const minhasFichas = dados.fichas.linhas.filter((f) => f.personagem_id === p.id);
  const meusDetalhes = dados.detalhes.linhas.filter((d) => d.personagem_id === p.id);
  const f = minhasFichas.find((x) => x.variante === v);
  const d = meusDetalhes.find((x) => x.variante === v);
  const pericias = [...(d?.pericias ?? [])].sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <section className={`folha px-4 pb-5 pt-4 ${p.ancora_ativa ? "sob-ancora" : ""}`} aria-label={`Ficha de ${p.nome}`}>
        <div className="flex items-start gap-3">
          <FotoPersonagem
            mesaId={p.mesa_id}
            personagemId={p.id}
            nome={p.nome}
            caminho={p.foto_caminho}
            tamanho={64}
            editavel
            onTrocar={(caminho) => dados.atualizarPersonagem(p.id, { foto_caminho: caminho })}
          />
          <div className="min-w-0 flex-1">
            <h1 className="titulo text-[1.9rem] leading-tight text-marinho">{p.nome}</h1>
            <p className="italic leading-snug text-tinta-suave">
              {descricaoPersonagem(p)}
              {eMestre && p.jogador ? `. Jogador: ${p.jogador}` : ""}
            </p>
          </div>
          <div className="shrink-0 pt-1 text-right">
            <p className="numeros text-2xl leading-none text-marinho">{f?.nex ?? "–"}%</p>
            <p className="text-sm italic text-tinta-suave">NEX</p>
          </div>
        </div>

        <div className={`meandro my-3 ${p.ancora_ativa ? "meandro-ancora" : ""}`} aria-hidden />
        {p.ancora_ativa && (
          <p className="-mt-1 mb-3 italic text-ardosia">⚓ A Âncora está ativa: você está usando a ficha de 50%.</p>
        )}

        <div className="grid gap-5">
          {camposVisiveis(p, f).map(({ campo, rotulo, nome, cor, max }) => (
            <BarraStatus
              key={campo}
              rotulo={rotulo}
              nomeCompleto={nome}
              atual={(p[campo] as number) ?? 0}
              max={(f?.[max] as number) ?? 0}
              cor={cor}
              editavel
              densidade="grande"
              onDelta={(delta) => dados.ajustar(p, campo, delta)}
              onDefinir={(valor) => dados.atualizarPersonagem(p.id, { [campo]: valor })}
              temp={campo === "pv_atual" ? p.pv_temp ?? 0 : undefined}
              onDefinirTemp={campo === "pv_atual" ? (valor) => dados.atualizarPersonagem(p.id, { pv_temp: valor }) : undefined}
            />
          ))}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-sm border border-ouro-escuro/30 px-3 py-2 text-center">
            <dt className="text-sm italic text-tinta-suave">Defesa</dt>
            <dd className="numeros text-3xl leading-tight text-marinho">{d?.defesa ?? "–"}</dd>
          </div>
          <div className="rounded-sm border border-ouro-escuro/30 px-3 py-2 text-center">
            <dt className="text-sm italic text-tinta-suave">Deslocamento</dt>
            <dd className="numeros text-3xl leading-tight text-marinho">{d?.deslocamento || "–"}</dd>
          </div>
        </dl>

        <h2 className="titulo mt-5 text-lg text-marinho">Atributos</h2>
        <ul className="mt-1.5 grid grid-cols-5 gap-2">
          {ATRIBUTOS.map((a) => (
            <li
              key={a}
              className="flex flex-col items-center rounded-sm border border-ouro-escuro/35 bg-pergaminho-claro/60 pb-1.5 pt-1"
              title={NOME_ATRIBUTO[a]}
            >
              <span className="numeros text-[1.7rem] leading-none text-marinho">{d?.atributos?.[a] ?? 0}</span>
              <span className="titulo mt-0.5 text-xs text-tinta-suave">{a}</span>
            </li>
          ))}
        </ul>

        <h2 className="titulo mt-5 text-lg text-marinho">Perícias</h2>
        {pericias.length > 0 ? (
          <ul className="mt-1 divide-y divide-ouro-escuro/15">
            {pericias.map((per) => (
              <li key={per.nome} className="flex items-baseline justify-between py-1.5">
                <span>
                  {per.nome} <span className="text-sm italic text-tinta-suave">({per.atributo})</span>
                </span>
                <span className="numeros text-marinho">{per.bonus >= 0 ? `+${per.bonus}` : per.bonus}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 italic text-tinta-suave">Nenhuma perícia cadastrada. Use “Editar ficha” para adicionar.</p>
        )}

        <h2 className="titulo mt-5 text-lg text-marinho">Condições</h2>
        <div className="mt-1.5">
          <Condicoes lista={p.condicoes} editavel onChange={(nova) => dados.atualizarPersonagem(p.id, { condicoes: nova })} />
        </div>

        <button onClick={() => setEditando(true)} className="botao-ouro mt-6 w-full py-2.5">
          Editar ficha
        </button>
      </section>

      {editando && (
        <EditorFicha
          personagem={p}
          fichas={minhasFichas}
          detalhes={meusDetalhes}
          eMestre={eMestre}
          dados={dados}
          onFechar={() => setEditando(false)}
        />
      )}
    </>
  );
}
