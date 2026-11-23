"use client";

/**
 * ETAPA 1 — Sala de teste ao vivo.
 * Mostra os personagens visíveis para quem entrou, com barras e botões rápidos,
 * sincronizados em tempo real. Nas próximas etapas vira Ficha (/ficha) e Escudo (/mestre).
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarraStatus } from "@/components/BarraStatus";
import { Brasao } from "@/components/Brasao";
import { useAoVivo } from "@/lib/aoVivo";
import { fichaAtiva } from "@/lib/regras";
import { useSessao } from "@/lib/sessao";
import { supabase } from "@/lib/supabase";
import type { CampoStatus, Ficha, LogAlteracao, Personagem } from "@/lib/tipos";

const CAMPOS: { campo: CampoStatus; rotulo: string; cor: string; max: keyof Ficha }[] = [
  { campo: "pv_atual", rotulo: "PV", cor: "bg-pv", max: "pv_max" },
  { campo: "san_atual", rotulo: "SAN", cor: "bg-san", max: "san_max" },
  { campo: "pe_atual", rotulo: "PE", cor: "bg-pe", max: "pe_max" },
  { campo: "pd_atual", rotulo: "PD", cor: "bg-pd", max: "pd_max" },
];

export default function SalaAoVivo() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre, sair } = useSessao();

  useEffect(() => {
    if (!carregando && !membro) router.replace("/");
  }, [carregando, membro, router]);

  const personagens = useAoVivo<Personagem & Record<string, unknown>>("personagens", mesa?.id, {
    chave: (p) => String(p.id),
    ordenar: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  });
  const fichas = useAoVivo<Ficha & Record<string, unknown>>("fichas", mesa?.id, {
    chave: (f) => `${f.personagem_id}:${f.variante}`,
  });
  const log = useAoVivo<LogAlteracao & Record<string, unknown>>("log_alteracoes", mesa?.id, {
    chave: (l) => String(l.id),
    ordenar: (a, b) => b.id - a.id,
    ativo: eMestre,
  });

  async function ajustar(p: Personagem, campo: CampoStatus, delta: number) {
    // Otimista: mostra já; o evento do servidor confirma (com o teto aplicado).
    personagens.setLinhas((l) =>
      l.map((x) => (x.id === p.id ? { ...x, [campo]: Math.max(0, (x[campo] ?? 0) + delta) } : x)),
    );
    const { error } = await supabase().rpc("ajustar_status", { p_personagem: p.id, p_campo: campo, p_delta: delta });
    if (error) {
      alert(error.message);
      personagens.recarregar();
    }
  }

  async function definir(p: Personagem, campo: CampoStatus, valor: number) {
    const { error } = await supabase().from("personagens").update({ [campo]: valor }).eq("id", p.id);
    if (error) alert(error.message);
  }

  async function ancoraGlobal() {
    if (!mesa) return;
    const { error } = await supabase().rpc("ancora_definir", { p_mesa: mesa.id, p_ativa: !mesa.ancora_global });
    if (error) alert(error.message);
  }

  async function desfazer() {
    if (!mesa) return;
    const { error } = await supabase().rpc("desfazer_ultima", { p_mesa: mesa.id });
    if (error) alert(error.message);
  }

  if (!mesa || !membro) return <p className="p-8 text-center">Carregando…</p>;

  const corStatus =
    personagens.status === "ao vivo" ? "bg-emerald-600" : personagens.status === "offline" ? "bg-pv" : "bg-pe";

  return (
    <main className={eMestre ? "tema-mestre" : ""}>
      <div className="mx-auto max-w-6xl px-4 py-5">
        <header className="mb-5 flex flex-wrap items-center gap-3">
          <Brasao tamanho={40} />
          <div className="mr-auto">
            <h1 className={`titulo text-xl ${eMestre ? "text-ouro-claro" : "text-marinho"}`}>{mesa.nome}</h1>
            <p className="text-xs opacity-75">
              {membro.nome_exibicao} · {eMestre ? "Mestre" : "Jogador"}
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-current/20 px-3 py-1 text-xs">
            <span className={`h-2 w-2 rounded-full ${corStatus}`} />
            {personagens.status}
            {personagens.ultimoEvento && (
              <span className="opacity-60">· último evento {personagens.ultimoEvento.toLocaleTimeString("pt-BR")}</span>
            )}
          </span>
          <button onClick={sair} className="text-xs underline opacity-75">
            sair
          </button>
        </header>

        {eMestre && (
          <div className="moldura-escura mb-5 flex flex-wrap items-center gap-3 p-3">
            <button onClick={ancoraGlobal} className="botao-ouro px-4 py-2 text-sm">
              ⚓ ÂNCORA {mesa.ancora_global ? "ON" : "OFF"}
            </button>
            <button onClick={desfazer} className="rounded border border-ouro/40 px-3 py-2 text-sm text-ouro-claro">
              ↶ desfazer última
            </button>
            <span className="text-xs opacity-60">Prévia de teste — o Escudo completo chega na Etapa 2.</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personagens.linhas.map((p) => {
            const f = fichaAtiva(p, fichas.linhas);
            const meu = membro.personagem_id === p.id;
            const editavel = eMestre || meu;
            return (
              <article
                key={p.id}
                className={`${eMestre ? "moldura-escura" : "moldura"} p-4 ${p.ancora_ativa ? "sob-ancora" : ""} ${
                  meu ? "ring-2 ring-ouro" : ""
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h2 className={`titulo text-lg ${eMestre ? "text-ouro-claro" : "text-marinho"}`}>{p.nome}</h2>
                    <p className="text-xs opacity-70">
                      {[p.classe, p.trilha, p.origem].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="titulo text-sm">NEX {f?.nex ?? "–"}%</span>
                    {p.ancora_ativa && <div className="text-xs">⚓ Âncora</div>}
                  </div>
                </div>
                <div className="grid gap-3">
                  {CAMPOS.filter(({ campo, max }) => {
                    if (campo === "pd_atual") return f?.pd_max != null || p.pd_atual != null;
                    if (p.usa_determinacao && (campo === "san_atual" || campo === "pe_atual")) return false;
                    return f?.[max] != null;
                  }).map(({ campo, rotulo, cor, max }) => (
                    <BarraStatus
                      key={campo}
                      rotulo={rotulo}
                      atual={(p[campo] as number) ?? 0}
                      max={(f?.[max] as number) ?? 0}
                      cor={cor}
                      editavel={editavel}
                      escuro={eMestre}
                      compacto={!editavel}
                      onDelta={(d) => ajustar(p, campo, d)}
                      onDefinir={(v) => definir(p, campo, v)}
                    />
                  ))}
                </div>
                {p.condicoes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.condicoes.map((c) => (
                      <span key={c} className="rounded-full bg-marinho px-2 py-0.5 text-xs text-ouro-claro">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {eMestre && (
          <section className="moldura-escura mt-6 p-4">
            <h2 className="titulo mb-2 text-ouro-claro">Log de alterações (ao vivo)</h2>
            <ul className="max-h-64 space-y-1 overflow-auto text-sm">
              {log.linhas.slice(0, 30).map((l) => (
                <li key={l.id} className={l.desfeito ? "line-through opacity-40" : ""}>
                  <span className="opacity-60">{new Date(l.criado_em).toLocaleTimeString("pt-BR")}</span>{" "}
                  <b>{l.autor}</b> · {l.personagem_nome} · {l.campo.replace("_atual", "").toUpperCase()}:{" "}
                  {JSON.stringify(l.antes)} → {JSON.stringify(l.depois)}
                </li>
              ))}
              {log.linhas.length === 0 && <li className="opacity-60">Nada ainda.</li>}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
