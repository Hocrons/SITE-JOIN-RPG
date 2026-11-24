"use client";

import { Nome } from "@/components/Nome";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Condicoes } from "@/components/Condicoes";
import { CascaMestre } from "@/components/mestre/CascaMestre";
import { useAoVivo } from "@/lib/aoVivo";
import {
  descreverIniciativa, ordenarTurnos, porIniciativa, rolarIniciativa, useCombateAtivo,
  type ModeloAmeaca, type Participante, type TipoParticipante,
} from "@/lib/combate";
import { alerta, fichaAtiva, pct, varianteAtiva } from "@/lib/regras";
import { useSessao } from "@/lib/sessao";
import { supabase } from "@/lib/supabase";
import type { Personagem } from "@/lib/tipos";
import { useMesa } from "@/lib/useMesa";

type L<T> = T & Record<string, unknown>;

async function db<T = unknown>(p: PromiseLike<{ error: { message: string } | null; data: unknown }>): Promise<T | null> {
  const { error, data } = await p;
  if (error) alert(error.message);
  return (data as T) ?? null;
}

export default function Combate() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre } = useSessao();
  const dados = useMesa(mesa?.id, true);
  const { combates, ativo } = useCombateAtivo(mesa?.id);
  const participantes = useAoVivo<L<Participante>>("participantes", mesa?.id, { chave: (p) => String(p.id) });
  const modelos = useAoVivo<L<ModeloAmeaca>>("modelos_ameaca", mesa?.id, {
    chave: (m) => String(m.id),
    ordenar: (a, b) => a.nome.localeCompare(b.nome),
  });
  const [arrastando, setArrastando] = useState<string | null>(null);

  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else if (!eMestre) router.replace("/ficha");
  }, [carregando, membro, eMestre, router]);

  const lista = useMemo(
    () => ordenarTurnos(participantes.linhas.filter((p) => p.combate_id === ativo?.id)),
    [participantes.linhas, ativo?.id],
  );

  if (!mesa || !eMestre) {
    return <main className="tema-mestre grid place-items-center italic text-nevoa/60">Abrindo o combate…</main>;
  }

  const pjs = dados.personagens.linhas.filter((p) => p.tipo === "pj" && !p.arquivado);
  const pjNoCombate = new Set(lista.map((p) => p.personagem_id).filter(Boolean));
  const personagemDe = (p: Participante) => (p.personagem_id ? pjs.find((x) => x.id === p.personagem_id) : undefined);

  function setLocal(id: string, patch: Partial<Participante>) {
    participantes.setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  async function mudar(id: string, patch: Partial<Participante>) {
    setLocal(id, patch);
    await db(supabase().from("participantes").update(patch).eq("id", id));
  }
  async function salvarOrdem(nova: Participante[]) {
    participantes.setLinhas((l) => l.map((x) => {
      const k = nova.findIndex((n) => n.id === x.id);
      return k >= 0 ? { ...x, ordem: k } : x;
    }));
    await Promise.all(nova.map((n, k) => supabase().from("participantes").update({ ordem: k }).eq("id", n.id)));
  }

  // ---------- iniciativa ----------
  function bonusPJ(p: Personagem) {
    const d = dados.detalhes.linhas.find((x) => x.personagem_id === p.id && x.variante === varianteAtiva(p));
    const per = d?.pericias?.find((x) => x.nome.toLowerCase().startsWith("inici"));
    return { dados: d?.atributos?.AGI ?? 1, bonus: per?.bonus ?? 0 };
  }

  async function rolarTodos(soVazios: boolean) {
    const alvos = lista.filter((p) => !p.derrotado && (!soVazios || p.iniciativa == null));
    const resultados = alvos.map((p) => {
      const pj = personagemDe(p);
      const base = pj ? bonusPJ(pj) : { dados: p.iniciativa_dados, bonus: p.iniciativa_bonus };
      return { id: p.id, iniciativa: rolarIniciativa(base.dados, base.bonus).total, dados: base.dados, bonus: base.bonus };
    });
    const atualizados = lista.map((p) => {
      const r = resultados.find((x) => x.id === p.id);
      return r ? { ...p, iniciativa: r.iniciativa, iniciativa_dados: r.dados, iniciativa_bonus: r.bonus } : p;
    });
    participantes.setLinhas((l) => l.map((x) => atualizados.find((a) => a.id === x.id) ?? x));
    await Promise.all(
      resultados.map((r) =>
        supabase().from("participantes").update({ iniciativa: r.iniciativa, iniciativa_dados: r.dados, iniciativa_bonus: r.bonus }).eq("id", r.id),
      ),
    );
    await salvarOrdem(porIniciativa(atualizados));
  }

  // ---------- turnos ----------
  async function passarTurno(dir: 1 | -1) {
    if (!ativo) return;
    const vivos = lista.filter((p) => !p.derrotado);
    if (vivos.length === 0) return;
    const i = vivos.findIndex((p) => p.id === ativo.vez_id);
    let j = i + dir;
    let rodada = ativo.rodada;
    if (i === -1) j = 0;
    else if (j >= vivos.length) {
      j = 0;
      rodada += 1;
    } else if (j < 0) {
      j = vivos.length - 1;
      rodada = Math.max(1, rodada - 1);
    }
    combates.setLinhas((l) => l.map((c) => (c.id === ativo.id ? { ...c, vez_id: vivos[j].id, rodada } : c)));
    await db(supabase().from("combates").update({ vez_id: vivos[j].id, rodada }).eq("id", ativo.id));
  }

  // ---------- dano / cura ----------
  async function aplicar(p: Participante, valor: number) {
    if (!valor) return;
    const pj = personagemDe(p);
    if (pj) return dados.ajustar(pj, "pv_atual", valor);
    const max = p.pv_max ?? 0;
    const novo = Math.max(0, Math.min(max || Infinity, (p.pv_atual ?? 0) + valor));
    await mudar(p.id, { pv_atual: novo, ...(novo === 0 ? { derrotado: true } : {}) });
  }

  async function remover(p: Participante) {
    if (!confirm(`Tirar ${p.nome} do combate?`)) return;
    if (ativo?.vez_id === p.id) await passarTurno(1);
    participantes.setLinhas((l) => l.filter((x) => x.id !== p.id));
    await db(supabase().from("participantes").delete().eq("id", p.id));
  }

  async function encerrar() {
    if (!ativo || !confirm("Encerrar o combate? A ordem some da tela dos jogadores.")) return;
    await db(supabase().from("combates").update({ ativo: false }).eq("id", ativo.id));
  }

  async function iniciar(nome: string) {
    await db(supabase().from("combates").insert({ mesa_id: mesa!.id, nome: nome.trim() || "Combate" }));
  }

  // ---------- adicionar ----------
  async function adicionarPJs(ids: string[]) {
    if (!ativo) return;
    const linhas = ids.map((id, k) => {
      const pj = pjs.find((x) => x.id === id)!;
      const b = bonusPJ(pj);
      return {
        combate_id: ativo.id, personagem_id: id, nome: pj.nome, tipo: "pj" as TipoParticipante,
        iniciativa_dados: b.dados, iniciativa_bonus: b.bonus, ordem: lista.length + k,
      };
    });
    const data = await db<Participante[]>(supabase().from("participantes").insert(linhas).select());
    if (data) participantes.setLinhas((l) => [...l, ...(data as L<Participante>[])]);
  }

  async function adicionarAmeacas(a: NovaAmeaca) {
    if (!ativo) return;
    const linhas = Array.from({ length: a.qtd }, (_, k) => ({
      combate_id: ativo.id,
      nome: a.qtd > 1 ? `${a.nome} ${k + 1}` : a.nome,
      tipo: a.tipo,
      pv_atual: a.pv,
      pv_max: a.pv,
      defesa: a.defesa,
      iniciativa_dados: a.dados,
      iniciativa_bonus: a.bonus,
      anotacoes: a.anotacoes,
      ordem: lista.length + k,
    }));
    const data = await db<Participante[]>(supabase().from("participantes").insert(linhas).select());
    if (data) participantes.setLinhas((l) => [...l, ...(data as L<Participante>[])]);
    if (a.salvar) {
      await db(
        supabase().from("modelos_ameaca").insert({
          mesa_id: mesa!.id, nome: a.nome, tipo: a.tipo, pv_max: a.pv, defesa: a.defesa,
          iniciativa_dados: a.dados, iniciativa_bonus: a.bonus, anotacoes: a.anotacoes,
        }),
      );
    }
  }

  const vez = lista.find((p) => p.id === ativo?.vez_id);

  return (
    <CascaMestre subtitulo="Combate e iniciativa">
      <div className="">

        {!ativo ? (
          <NovoCombate onIniciar={iniciar} />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
            <section className="grid gap-3" aria-label="Ordem de turnos">
              <div className="painel flex flex-wrap items-center gap-3 p-3">
                <div className="mr-auto">
                  <p className="titulo text-xl text-ouro-claro">{ativo.nome}</p>
                  <p className="text-sm text-nevoa/70">
                    Rodada <span className="numeros text-nevoa">{ativo.rodada}</span>
                    {vez ? (
                      <>
                        . Vez de <b className="text-ouro-claro">{vez.nome}</b>
                      </>
                    ) : (
                      <span className="italic">. Ninguém na vez ainda.</span>
                    )}
                  </p>
                </div>
                <button onClick={() => passarTurno(-1)} className="rounded-sm border border-ouro/35 px-3 py-2 text-ouro-claro hover:bg-ouro/10">
                  ← Turno anterior
                </button>
                <button onClick={() => passarTurno(1)} className="botao-ouro px-4 py-2">
                  {vez ? "Próximo turno →" : "Começar →"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <button onClick={() => rolarTodos(false)} className="rounded-sm border border-ouro/35 px-3 py-1.5 text-ouro-claro hover:bg-ouro/10">
                  ⚀ Rolar iniciativa de todos
                </button>
                <button onClick={() => rolarTodos(true)} className="rounded-sm border border-ouro/35 px-3 py-1.5 text-ouro-claro hover:bg-ouro/10">
                  Rolar só quem está sem
                </button>
                <button onClick={() => salvarOrdem(porIniciativa(lista))} className="rounded-sm border border-ouro/35 px-3 py-1.5 text-ouro-claro hover:bg-ouro/10">
                  Ordenar por iniciativa
                </button>
                <span className="italic text-nevoa/45">Arraste as linhas para reordenar. Empate: use o campo “desempate”.</span>
                <button onClick={encerrar} className="ml-auto text-nevoa/60 underline underline-offset-2 hover:text-pv-vivo">
                  Encerrar combate
                </button>
              </div>

              <ol className="grid gap-2">
                {lista.map((p, i) => (
                  <LinhaParticipante
                    key={p.id}
                    p={p}
                    pj={personagemDe(p)}
                    pvPJ={(() => {
                      const pj = personagemDe(p);
                      if (!pj) return null;
                      const f = fichaAtiva(pj, dados.fichas.linhas);
                      return { atual: pj.pv_atual, max: f?.pv_max ?? 0, temp: pj.pv_temp };
                    })()}
                    naVez={ativo.vez_id === p.id}
                    primeiro={i === 0}
                    ultimo={i === lista.length - 1}
                    arrastando={arrastando === p.id}
                    onArrastar={() => setArrastando(p.id)}
                    onSoltar={async () => {
                      if (!arrastando || arrastando === p.id) return setArrastando(null);
                      const nova = lista.filter((x) => x.id !== arrastando);
                      nova.splice(i, 0, lista.find((x) => x.id === arrastando)!);
                      setArrastando(null);
                      await salvarOrdem(nova);
                    }}
                    onMover={async (dir) => {
                      const nova = [...lista];
                      [nova[i], nova[i + dir]] = [nova[i + dir], nova[i]];
                      await salvarOrdem(nova);
                    }}
                    onMudar={(patch) => mudar(p.id, patch)}
                    onCondicoesPJ={(c) => {
                      const pj = personagemDe(p);
                      if (pj) dados.atualizarPersonagem(pj.id, { condicoes: c });
                    }}
                    onAplicar={(v) => aplicar(p, v)}
                    onVez={async () => {
                      combates.setLinhas((l) => l.map((c) => (c.id === ativo.id ? { ...c, vez_id: p.id } : c)));
                      await db(supabase().from("combates").update({ vez_id: p.id }).eq("id", ativo.id));
                    }}
                    onRemover={() => remover(p)}
                  />
                ))}
                {lista.length === 0 && (
                  <li className="painel p-6 text-center italic text-nevoa/55">Adicione os agentes e as ameaças no painel ao lado.</li>
                )}
              </ol>
            </section>

            <aside className="grid gap-3" aria-label="Adicionar ao combate">
              <AdicionarPJs pjs={pjs.filter((p) => !pjNoCombate.has(p.id))} onAdicionar={adicionarPJs} />
              <NovaAmeacaForm onAdicionar={adicionarAmeacas} />
              <Modelos
                modelos={modelos.linhas}
                onUsar={(m, qtd) =>
                  adicionarAmeacas({
                    nome: m.nome, tipo: m.tipo, pv: m.pv_max, defesa: m.defesa, dados: m.iniciativa_dados,
                    bonus: m.iniciativa_bonus, anotacoes: m.anotacoes, qtd, salvar: false,
                  })
                }
                onApagar={async (m) => {
                  if (!confirm(`Apagar o modelo "${m.nome}"?`)) return;
                  modelos.setLinhas((l) => l.filter((x) => x.id !== m.id));
                  await db(supabase().from("modelos_ameaca").delete().eq("id", m.id));
                }}
              />
            </aside>
          </div>
        )}
      </div>
    </CascaMestre>
  );
}

/* ---------------------------------------------------------------------- */

function NovoCombate({ onIniciar }: { onIniciar: (nome: string) => void }) {
  const [nome, setNome] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onIniciar(nome);
      }}
      className="painel mx-auto mt-10 grid max-w-md gap-3 p-6 text-center"
    >
      <p className="titulo text-xl text-ouro-claro">Nenhum combate em andamento</p>
      <p className="text-nevoa/65">Comece um combate para montar a ordem de turnos. Os jogadores veem a ordem ao vivo, sem o PV das ameaças.</p>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome (ex.: Emboscada no farol)"
        aria-label="Nome do combate"
        className="rounded-sm border border-ouro/30 bg-noite px-3 py-2 text-nevoa placeholder:text-nevoa/35"
      />
      <button className="botao-ouro py-2.5">Começar combate</button>
    </form>
  );
}

const ROTULO_TIPO: Record<TipoParticipante, string> = { pj: "Agente", npc: "NPC", ameaca: "Ameaça" };

function LinhaParticipante({
  p, pj, pvPJ, naVez, primeiro, ultimo, arrastando, onArrastar, onSoltar, onMover, onMudar, onCondicoesPJ, onAplicar, onVez, onRemover,
}: {
  p: Participante;
  pj: Personagem | undefined;
  pvPJ: { atual: number; max: number; temp: number } | null;
  naVez: boolean;
  primeiro: boolean;
  ultimo: boolean;
  arrastando: boolean;
  onArrastar: () => void;
  onSoltar: () => void;
  onMover: (dir: 1 | -1) => void;
  onMudar: (patch: Partial<Participante>) => void;
  onCondicoesPJ: (c: string[]) => void;
  onAplicar: (v: number) => void;
  onVez: () => void;
  onRemover: () => void;
}) {
  const [valor, setValor] = useState("");
  const [aberto, setAberto] = useState(false);
  const pv = pvPJ ?? (p.pv_max != null ? { atual: p.pv_atual ?? 0, max: p.pv_max, temp: 0 } : null);
  const nivel = pv ? alerta(pv.atual, pv.max) : "ok";
  const condicoes = pj ? pj.condicoes : p.condicoes;

  function aplicarValor(sinal: 1 | -1) {
    const n = parseInt(valor, 10);
    if (!Number.isNaN(n) && n > 0) onAplicar(sinal * n);
    setValor("");
  }

  return (
    <li
      draggable
      onDragStart={onArrastar}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onSoltar}
      className={`painel p-3 transition ${naVez ? "!border-ouro shadow-[0_0_0_2px_var(--color-ouro)]" : ""} ${
        p.derrotado ? "opacity-45" : ""
      } ${arrastando ? "opacity-40" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="cursor-grab select-none text-nevoa/35" aria-hidden title="Arraste para reordenar">
          ⠿
        </span>
        <label className="grid text-center text-xs text-nevoa/55">
          inic.
          <input
            className="numeros w-14 rounded-sm border border-ouro/30 bg-noite px-1 py-1 text-center text-lg text-nevoa"
            inputMode="numeric"
            aria-label={`Iniciativa de ${p.nome}`}
            value={p.iniciativa ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              onMudar({ iniciativa: Number.isNaN(n) ? null : n });
            }}
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            {naVez && <span className="titulo rounded-sm bg-ouro px-1.5 text-xs text-marinho">NA VEZ</span>}
            <span className={`titulo text-lg ${p.derrotado ? "line-through" : "text-ouro-claro"}`}>
              <Nome>{p.nome}</Nome>
            </span>
            <span className="text-sm italic text-nevoa/55">
              {ROTULO_TIPO[p.tipo]}
              {p.defesa != null && `, Defesa ${p.defesa}`}
              {!pj && `, ${descreverIniciativa(p.iniciativa_dados, p.iniciativa_bonus)}`}
            </span>
          </div>
          {pv && (
            <div className="mt-1 flex items-center gap-2">
              <div className="trilho flex-1" style={{ height: 8 }}>
                <div className="preenchimento bg-pv-vivo" style={{ width: `${pct(pv.atual, pv.max)}%` }} />
              </div>
              <span className={`numeros w-24 text-right text-sm ${nivel !== "ok" ? "text-[#e0897f]" : ""}`}>
                {pv.atual}
                {pv.temp ? <span className="text-ouro-claro">+{pv.temp}</span> : null} / {pv.max}
              </span>
            </div>
          )}
          {condicoes.length > 0 && <p className="mt-1 text-sm text-ouro-claro/80">{condicoes.join(", ")}</p>}
        </div>

        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            aplicarValor(-1);
          }}
        >
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            aria-label={`Valor de dano ou cura para ${p.nome}`}
            className="numeros w-16 rounded-sm border border-ouro/30 bg-noite px-2 py-1.5 text-center text-nevoa placeholder:text-nevoa/30"
          />
          <button className="rounded-sm bg-pv-vivo/85 px-2.5 py-1.5 text-sm text-white hover:bg-pv-vivo">Dano</button>
          <button type="button" onClick={() => aplicarValor(1)} className="rounded-sm bg-emerald-700/80 px-2.5 py-1.5 text-sm text-white hover:bg-emerald-700">
            Cura
          </button>
        </form>

        <div className="flex items-center gap-1 text-sm">
          <button onClick={() => onMover(-1)} disabled={primeiro} className="rounded-sm px-1.5 py-1 text-nevoa/60 hover:bg-ouro/10 disabled:opacity-25" aria-label={`Subir ${p.nome}`}>
            ↑
          </button>
          <button onClick={() => onMover(1)} disabled={ultimo} className="rounded-sm px-1.5 py-1 text-nevoa/60 hover:bg-ouro/10 disabled:opacity-25" aria-label={`Descer ${p.nome}`}>
            ↓
          </button>
          <button onClick={() => setAberto((x) => !x)} aria-expanded={aberto} className="rounded-sm px-2 py-1 text-ouro-claro hover:bg-ouro/10">
            {aberto ? "Fechar" : "Mais"}
          </button>
        </div>
      </div>

      {aberto && (
        <div className="mt-3 grid gap-3 border-t border-ouro/15 pt-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-nevoa/60">Condições</p>
            <Condicoes lista={condicoes} editavel escuro onChange={(c) => (pj ? onCondicoesPJ(c) : onMudar({ condicoes: c }))} />
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1 text-nevoa/70">
                desempate
                <input
                  className="numeros w-12 rounded-sm border border-ouro/30 bg-noite px-1 py-0.5 text-center text-nevoa"
                  inputMode="numeric"
                  value={p.desempate}
                  onChange={(e) => onMudar({ desempate: parseInt(e.target.value, 10) || 0 })}
                />
              </label>
              {!pj && (
                <>
                  <label className="flex items-center gap-1 text-nevoa/70">
                    PV máx.
                    <input
                      className="numeros w-14 rounded-sm border border-ouro/30 bg-noite px-1 py-0.5 text-center text-nevoa"
                      inputMode="numeric"
                      value={p.pv_max ?? ""}
                      onChange={(e) => onMudar({ pv_max: parseInt(e.target.value, 10) || null })}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-nevoa/70">
                    Defesa
                    <input
                      className="numeros w-12 rounded-sm border border-ouro/30 bg-noite px-1 py-0.5 text-center text-nevoa"
                      inputMode="numeric"
                      value={p.defesa ?? ""}
                      onChange={(e) => onMudar({ defesa: parseInt(e.target.value, 10) || null })}
                    />
                  </label>
                </>
              )}
            </div>
            {!pj && (
              <label className="flex items-center gap-2 text-nevoa/80">
                <input type="checkbox" checked={p.pv_visivel} onChange={(e) => onMudar({ pv_visivel: e.target.checked })} className="h-4 w-4 accent-[#b8912f]" />
                Mostrar o PV para os jogadores
              </label>
            )}
            <label className="flex items-center gap-2 text-nevoa/80">
              <input type="checkbox" checked={p.derrotado} onChange={(e) => onMudar({ derrotado: e.target.checked })} className="h-4 w-4 accent-[#b8912f]" />
              Derrotado (pula na vez)
            </label>
            {!pj && (
              <textarea
                defaultValue={p.anotacoes}
                onBlur={(e) => e.target.value !== p.anotacoes && onMudar({ anotacoes: e.target.value })}
                placeholder="Anotações do mestre (ataques, fraquezas…)"
                className="min-h-14 rounded-sm border border-ouro/25 bg-noite px-2 py-1 text-nevoa placeholder:text-nevoa/30"
              />
            )}
            <div className="flex gap-3">
              <button onClick={onVez} className="text-ouro-claro underline underline-offset-2">
                Passar a vez para {p.nome}
              </button>
              <button onClick={onRemover} className="ml-auto text-nevoa/60 underline underline-offset-2 hover:text-pv-vivo">
                Tirar do combate
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function AdicionarPJs({ pjs, onAdicionar }: { pjs: Personagem[]; onAdicionar: (ids: string[]) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  if (pjs.length === 0) return null;
  return (
    <section className="painel p-3">
      <h2 className="titulo mb-2 text-ouro-claro">Agentes</h2>
      <div className="grid gap-1">
        {pjs.map((p) => (
          <label key={p.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sel.has(p.id)}
              onChange={() => setSel((s) => {
                const n = new Set(s);
                if (n.has(p.id)) n.delete(p.id);
                else n.add(p.id);
                return n;
              })}
              className="h-4 w-4 accent-[#b8912f]"
            />
            {p.nome}
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            onAdicionar([...sel]);
            setSel(new Set());
          }}
          disabled={sel.size === 0}
          className="rounded-sm border border-ouro/35 px-3 py-1.5 text-sm text-ouro-claro disabled:opacity-40"
        >
          Adicionar marcados
        </button>
        <button onClick={() => onAdicionar(pjs.map((p) => p.id))} className="botao-ouro px-3 py-1.5 text-sm">
          Todos
        </button>
      </div>
    </section>
  );
}

interface NovaAmeaca {
  nome: string;
  tipo: "npc" | "ameaca";
  pv: number;
  defesa: number | null;
  dados: number;
  bonus: number;
  anotacoes: string;
  qtd: number;
  salvar: boolean;
}

function NovaAmeacaForm({ onAdicionar }: { onAdicionar: (a: NovaAmeaca) => void }) {
  const vazio: NovaAmeaca = { nome: "", tipo: "ameaca", pv: 20, defesa: 12, dados: 1, bonus: 0, anotacoes: "", qtd: 1, salvar: false };
  const [a, setA] = useState<NovaAmeaca>(vazio);
  const campo = "numeros w-full rounded-sm border border-ouro/30 bg-noite px-2 py-1 text-center text-nevoa";
  const n = (v: string, min = 0) => Math.max(min, parseInt(v, 10) || 0);
  return (
    <form
      className="painel grid gap-2 p-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!a.nome.trim()) return;
        onAdicionar({ ...a, nome: a.nome.trim() });
        setA({ ...vazio, tipo: a.tipo });
      }}
    >
      <h2 className="titulo text-ouro-claro">Ameaça rápida</h2>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={a.nome}
          onChange={(e) => setA({ ...a, nome: e.target.value })}
          placeholder="Nome (ex.: Cão de Sangue)"
          aria-label="Nome da ameaça"
          className="rounded-sm border border-ouro/30 bg-noite px-2 py-1.5 text-base text-nevoa placeholder:text-nevoa/35"
        />
        <select value={a.tipo} onChange={(e) => setA({ ...a, tipo: e.target.value as "npc" | "ameaca" })} aria-label="Tipo" className="rounded-sm border border-ouro/30 bg-noite px-1 text-nevoa">
          <option value="ameaca">Ameaça</option>
          <option value="npc">NPC</option>
        </select>
      </div>
      <div className="grid grid-cols-5 gap-2 text-center text-xs text-nevoa/60">
        <label>PV<input className={campo} inputMode="numeric" value={a.pv} onChange={(e) => setA({ ...a, pv: n(e.target.value, 1) })} /></label>
        <label>Defesa<input className={campo} inputMode="numeric" value={a.defesa ?? ""} onChange={(e) => setA({ ...a, defesa: e.target.value ? n(e.target.value) : null })} /></label>
        <label>d20 inic.<input className={campo} inputMode="numeric" value={a.dados} onChange={(e) => setA({ ...a, dados: n(e.target.value) })} /></label>
        <label>+ bônus<input className={campo} inputMode="numeric" value={a.bonus} onChange={(e) => setA({ ...a, bonus: parseInt(e.target.value, 10) || 0 })} /></label>
        <label>Qtd.<input className={campo} inputMode="numeric" value={a.qtd} onChange={(e) => setA({ ...a, qtd: Math.min(20, n(e.target.value, 1)) })} /></label>
      </div>
      <textarea
        value={a.anotacoes}
        onChange={(e) => setA({ ...a, anotacoes: e.target.value })}
        placeholder="Ataques, resistências, notas"
        className="min-h-12 rounded-sm border border-ouro/25 bg-noite px-2 py-1 text-nevoa placeholder:text-nevoa/30"
      />
      <label className="flex items-center gap-2 text-nevoa/75">
        <input type="checkbox" checked={a.salvar} onChange={(e) => setA({ ...a, salvar: e.target.checked })} className="h-4 w-4 accent-[#b8912f]" />
        Também salvar como modelo
      </label>
      <button className="botao-ouro py-2">Adicionar ao combate</button>
    </form>
  );
}

function Modelos({
  modelos, onUsar, onApagar,
}: { modelos: ModeloAmeaca[]; onUsar: (m: ModeloAmeaca, qtd: number) => void; onApagar: (m: ModeloAmeaca) => void }) {
  const [qtd, setQtd] = useState<Record<string, number>>({});
  if (modelos.length === 0) return null;
  return (
    <section className="painel p-3 text-sm">
      <h2 className="titulo mb-2 text-ouro-claro">Modelos salvos</h2>
      <ul className="grid gap-1.5">
        {modelos.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-nevoa">{m.nome}</span>
              <span className="block truncate text-xs italic text-nevoa/50">
                PV {m.pv_max}
                {m.defesa != null && `, Defesa ${m.defesa}`}, {descreverIniciativa(m.iniciativa_dados, m.iniciativa_bonus)}
              </span>
            </span>
            <input
              className="numeros w-10 rounded-sm border border-ouro/30 bg-noite px-1 py-0.5 text-center text-nevoa"
              inputMode="numeric"
              aria-label={`Quantidade de ${m.nome}`}
              value={qtd[m.id] ?? 1}
              onChange={(e) => setQtd({ ...qtd, [m.id]: Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
            />
            <button onClick={() => onUsar(m, qtd[m.id] ?? 1)} className="rounded-sm border border-ouro/35 px-2 py-0.5 text-ouro-claro hover:bg-ouro/10">
              +
            </button>
            <button onClick={() => onApagar(m)} className="px-1 text-nevoa/40 hover:text-pv-vivo" aria-label={`Apagar modelo ${m.nome}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
