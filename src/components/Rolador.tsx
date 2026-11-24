"use client";

import { useState } from "react";
import { CartaoRolagem } from "./CartaoRolagem";
import { useAoVivo } from "@/lib/aoVivo";
import { useCatalogo, useItensPersonagem } from "@/lib/catalogo";
import { rolagensDaFicha } from "@/lib/rolagensFicha";
import { descreverPreset, expressaoDoTeste, expressaoValida, rolar, type Preset, type TipoPreset } from "@/lib/dados";
import { textoPenalidade, type EstadoCondicoes } from "@/lib/condicoes";
import { normalizar } from "@/lib/catalogo";
import { ATRIBUTOS, NOME_ATRIBUTO, expressaoTeste } from "@/lib/regras";
import { supabase } from "@/lib/supabase";
import type { Atributo, Pericia, Rolagem } from "@/lib/tipos";

type L<T> = T & Record<string, unknown>;

interface Props {
  mesaId: string;
  /** null = mestre rolando por si */
  personagemId: string | null;
  atributos?: Partial<Record<Atributo, number>>;
  pericias?: Pericia[];
  eMestre: boolean;
  escuro?: boolean;
  /** Condições do personagem: tiram dados dos testes e ataques. */
  condicoes?: EstadoCondicoes;
}


export function Rolador({ mesaId, personagemId, atributos, pericias = [], eMestre, escuro, condicoes }: Props) {
  /** Penalidade das condições num teste (perícia achada pelo título do preset). */
  function penalidade(p: { atributo: Atributo | null; titulo?: string; tipo?: string }, atributoFixo?: Atributo) {
    if (!condicoes) return { n: 0, de: [] as string[] };
    const atributo = atributoFixo ?? p.atributo;
    const pericia = p.tipo === "arma" ? null : pericias.find((x) => p.titulo && normalizar(p.titulo).includes(normalizar(x.nome)))?.nome ?? null;
    return condicoes.dados({ atributo, pericia, ataque: p.tipo === "arma", corpoACorpo: p.tipo === "arma" && atributo === "FOR" });
  }
  function exprComPenalidade(a: Atributo, bonus: number, n: number) {
    return n ? expressaoTeste((atributos?.[a] ?? 0) - n, bonus) : expressaoDoTeste(atributos, a, bonus);
  }
  const [expr, setExpr] = useState("");
  const [secreta, setSecreta] = useState(false);
  const [ultimos, setUltimos] = useState<Rolagem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [rolando, setRolando] = useState(false);
  const [organizando, setOrganizando] = useState(false);
  const [editando, setEditando] = useState<Partial<Preset> | null>(null);

  const feed = useAoVivo<L<Rolagem>>("rolagens", mesaId, {
    chave: (r) => String(r.id),
    ordenar: (a, b) => b.id - a.id,
    limite: { coluna: "id", n: 40 },
  });
  const todosPresets = useAoVivo<L<Preset>>("presets_dados", mesaId, {
    chave: (p) => String(p.id),
    ordenar: (a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo),
  });
  const presets = todosPresets.linhas.filter((p) => (p.personagem_id ?? null) === personagemId);

  // rolagens que saem sozinhas da ficha (armas com modificações, rituais, itens e poderes com dados)
  const itensFicha = useItensPersonagem(personagemId ? mesaId : null, personagemId);
  const { todos: catalogo } = useCatalogo(personagemId ? mesaId : null);
  const daFicha = personagemId
    ? rolagensDaFicha(itensFicha.linhas, new Map(catalogo.map((c) => [c.id, c])), pericias, atributos)
    : [];
  const totalFicha = daFicha.reduce((n, g) => n + g.itens.length, 0);
  const [abaPresets, setAbaPresets] = useState<"ficha" | "meus">("ficha");
  const mostrarFicha = !!personagemId && abaPresets === "ficha";

  async function chamar(pedido: Parameters<typeof rolar>[0]): Promise<Rolagem> {
    const r = await rolar({ ...pedido, secreta });
    feed.setLinhas((l) => (l.some((x) => x.id === r.id) ? l : [r as L<Rolagem>, ...l]));
    return r;
  }

  /** Rola uma ou mais coisas em sequência e mostra todas no topo. */
  async function executar(...passos: ((anteriores: Rolagem[]) => Parameters<typeof rolar>[0])[]) {
    setErro(null);
    setRolando(true);
    const feitos: Rolagem[] = [];
    try {
      for (const passo of passos) feitos.push(await chamar(passo(feitos)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível rolar.");
    } finally {
      setUltimos(feitos);
      setRolando(false);
    }
  }

  const base = { mesaId, personagemId };

  function rolarPreset(p: Preset) {
    const pen = penalidade(p);
    const teste = () => ({
      ...base,
      expressao: exprComPenalidade((p.atributo ?? "AGI") as Atributo, p.bonus, pen.n),
      titulo: `${p.tipo === "arma" ? `${p.titulo}: ataque` : p.titulo}${pen.n ? ` ${textoPenalidade(pen)}` : ""}`,
      margem: p.margem,
    });
    if (p.tipo === "teste") return executar(teste);
    if (p.tipo === "arma") {
      // ataque + dano num toque só; se o ataque critar, o dano já sai crítico
      return executar(teste, ([ataque]) => ({
        ...base,
        expressao: p.expressao,
        titulo: `${p.titulo}: dano${ataque.critico ? " crítico" : ""}`,
        multiplicador: p.multiplicador,
        critico: ataque.critico,
        dadosCrit: p.dadosCrit,
      }));
    }
    if (p.tipo === "dano") return executar(() => ({ ...base, expressao: p.expressao, titulo: p.titulo, multiplicador: p.multiplicador }));
    return executar(() => ({ ...base, expressao: p.expressao, titulo: p.titulo }));
  }

  function rolarDanoCritico(p: Preset) {
    return executar(() => ({
      ...base,
      expressao: p.expressao,
      titulo: `${p.titulo}: dano crítico`,
      multiplicador: p.multiplicador,
      critico: true,
      dadosCrit: p.dadosCrit,
    }));
  }

  async function mover(p: Preset, dir: -1 | 1) {
    const i = presets.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= presets.length) return;
    const nova = [...presets];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    todosPresets.setLinhas((l) => l.map((x) => {
      const k = nova.findIndex((n) => n.id === x.id);
      return k >= 0 ? { ...x, ordem: k } : x;
    }));
    await Promise.all(nova.map((n, k) => supabase().from("presets_dados").update({ ordem: k }).eq("id", n.id)));
  }

  async function apagar(p: Preset) {
    if (!confirm(`Apagar o preset "${p.titulo}"?`)) return;
    const { error } = await supabase().from("presets_dados").delete().eq("id", p.id);
    if (error) alert(error.message);
  }

  // estilos dos dois temas
  const t = escuro
    ? {
        painel: "painel",
        titulo: "text-ouro-claro",
        sutil: "text-nevoa/55",
        borda: "border-ouro/25",
        chip: "border border-ouro/30 text-ouro-claro hover:bg-ouro/10",
        input: "rounded-sm border border-ouro/30 bg-noite px-3 py-2 text-nevoa placeholder:text-nevoa/35",
      }
    : {
        painel: "folha",
        titulo: "text-marinho",
        sutil: "text-tinta-suave",
        borda: "border-ouro-escuro/25",
        chip: "border border-ouro-escuro/40 text-marinho hover:bg-ouro-claro/30",
        input: "campo",
      };

  return (
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0">
      {/* Resultado mais recente (ataque e dano aparecem juntos) */}
      {ultimos.length > 0 && (
        <section aria-live="polite" aria-label="Último resultado" className="grid gap-2">
          {ultimos.map((r) => (
            <CartaoRolagem key={r.id} r={r} escuro={escuro} destaque />
          ))}
        </section>
      )}
      {erro && <p className="rounded-sm border border-pv/40 bg-pv/10 p-2 text-sm text-pv-vivo">{erro}</p>}

      {condicoes && <AvisoCondicoes c={condicoes} escuro={escuro} />}

      {/* Rolagem livre + testes */}
      <section className={`${t.painel} grid gap-3 p-4`}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!expressaoValida(expr)) return setErro("Use a notação de dados, por exemplo 2d6+3 ou 1d20+5.");
            executar(() => ({ ...base, expressao: expr }));
          }}
        >
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="2d6+1d8+3"
            aria-label="Dados para rolar"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className={`numeros min-w-0 flex-1 text-lg ${t.input}`}
          />
          <button className="botao-ouro px-5" disabled={!expr || rolando}>
            Rolar
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {["1d20", "1d6", "2d6", "1d8", "1d10", "1d12", "1d100"].map((d) => (
            <button key={d} type="button" onClick={() => executar(() => ({ ...base, expressao: d }))} className={`numeros rounded-sm px-2.5 py-1 ${t.chip}`} disabled={rolando}>
              {d}
            </button>
          ))}
        </div>

        {atributos && (
          <div>
            <p className={`mb-1.5 text-sm italic ${t.sutil}`}>
              Teste de atributo: d20 iguais ao atributo, fica o maior. Com 0, rola 2d20 e fica o menor.
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {ATRIBUTOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  title={NOME_ATRIBUTO[a]}
                  onClick={() => {
                    const pen = penalidade({ atributo: a });
                    executar(() => ({
                      ...base,
                      expressao: exprComPenalidade(a, 0, pen.n),
                      titulo: `Teste de ${NOME_ATRIBUTO[a]}${pen.n ? ` ${textoPenalidade(pen)}` : ""}`,
                    }));
                  }}
                  className={`flex flex-col items-center rounded-sm py-1.5 ${t.chip}`}
                  disabled={rolando}
                >
                  <span className="titulo text-sm">{a}</span>
                  <span className="numeros text-lg leading-none">{atributos[a] ?? 0}d20</span>
                  {penalidade({ atributo: a }).n > 0 && (
                    <span className="numeros text-xs text-pv-vivo">–{penalidade({ atributo: a }).n}d</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className={`flex items-center gap-2 ${t.sutil}`}>
          <input type="checkbox" checked={secreta} onChange={(e) => setSecreta(e.target.checked)} className="h-4 w-4 accent-[#b8912f]" />
          {eMestre ? "Rolagem secreta (só você vê)" : "Rolar só para o mestre"}
        </label>
      </section>

      {/* Presets */}
      <section className={`${t.painel} p-4`}>
        {personagemId && (
          <div className={`mb-3 grid grid-cols-2 overflow-hidden rounded-sm border ${t.borda}`} role="tablist" aria-label="Presets">
            {(["ficha", "meus"] as const).map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={abaPresets === a}
                onClick={() => setAbaPresets(a)}
                className={`titulo py-1.5 ${
                  abaPresets === a ? (escuro ? "bg-ouro/90 text-marinho" : "bg-marinho text-pergaminho-claro") : t.titulo
                }`}
              >
                {a === "ficha" ? "Da ficha" : "Meus presets"}{" "}
                <span className="numeros text-sm opacity-75">{a === "ficha" ? totalFicha : presets.length}</span>
              </button>
            ))}
          </div>
        )}
        {mostrarFicha ? (
          <div className="grid min-w-0 gap-3">
            {daFicha.map((g) => (
              <div key={g.titulo} className="min-w-0">
                <h3 className={`titulo mb-0.5 text-sm ${t.sutil}`}>{g.titulo}</h3>
                <ul className={`divide-y ${escuro ? "divide-ouro/10" : "divide-ouro-escuro/15"}`}>
                  {g.itens.map(({ preset: p, nota }) => (
                    <li key={p.id} className="flex items-center gap-2 py-1.5">
                      <button onClick={() => rolarPreset(p)} disabled={rolando} className="min-w-0 flex-1 text-left">
                        <span className={`titulo block truncate ${t.titulo}`}>{p.titulo}</span>
                        <span className={`line-clamp-2 text-sm italic ${t.sutil}`}>
                          {descreverPreset(p)}
                          {nota ? ` (${nota})` : ""}
                        </span>
                        {(p.tipo === "arma" || p.tipo === "teste") && penalidade(p).n > 0 && (
                          <span className="block text-sm text-pv-vivo">{textoPenalidade(penalidade(p))} no ataque</span>
                        )}
                        {g.titulo === "Rituais" && !!condicoes?.custoPE && (
                          <span className="block text-sm text-pv-vivo">+{condicoes.custoPE} PE (alquebrado)</span>
                        )}
                      </button>
                      {p.tipo === "arma" && (
                        <button
                          onClick={() => rolarDanoCritico(p)}
                          disabled={rolando}
                          className={`shrink-0 rounded-sm px-2 py-1 text-sm ${t.chip}`}
                          title="Rolar só o dano, já como crítico"
                        >
                          crítico
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const { id: _id, ...resto } = p;
                          void _id;
                          setEditando({ ...resto });
                          setAbaPresets("meus");
                        }}
                        className={`shrink-0 rounded-sm px-2 py-1 text-sm ${t.chip}`}
                        title="Copiar para Meus presets e ajustar"
                        aria-label={`Copiar ${p.titulo} para meus presets`}
                      >
                        ✎
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {totalFicha === 0 && (
              <p className={`py-1 italic ${t.sutil}`}>
                Armas, rituais e itens com dados que você adicionar na aba Itens aparecem aqui prontos para rolar, já com as
                modificações e maldições.
              </p>
            )}
          </div>
        ) : (
        <>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className={`titulo text-lg ${t.titulo}`}>{eMestre ? "Presets do mestre" : "Seus presets"}</h2>
          {presets.length > 0 && (
            <button onClick={() => setOrganizando((x) => !x)} className={`text-sm underline underline-offset-2 ${t.sutil}`}>
              {organizando ? "Pronto" : "Organizar"}
            </button>
          )}
        </div>
        <ul className={`divide-y ${escuro ? "divide-ouro/10" : "divide-ouro-escuro/15"}`}>
          {presets.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 py-1.5">
              <button
                onClick={() => !organizando && rolarPreset(p)}
                disabled={rolando || organizando}
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                <span className={`titulo block truncate ${t.titulo}`}>{p.titulo}</span>
                <span className={`block truncate text-sm italic ${t.sutil}`}>{descreverPreset(p)}</span>
              </button>
              {organizando ? (
                <span className="flex shrink-0 gap-1">
                  <button onClick={() => mover(p, -1)} disabled={i === 0} className={`rounded-sm px-2 py-1 disabled:opacity-30 ${t.chip}`} aria-label={`Subir ${p.titulo}`}>
                    ↑
                  </button>
                  <button onClick={() => mover(p, 1)} disabled={i === presets.length - 1} className={`rounded-sm px-2 py-1 disabled:opacity-30 ${t.chip}`} aria-label={`Descer ${p.titulo}`}>
                    ↓
                  </button>
                  <button onClick={() => setEditando(p)} className={`rounded-sm px-2 py-1 ${t.chip}`} aria-label={`Editar ${p.titulo}`}>
                    ✎
                  </button>
                  <button onClick={() => apagar(p)} className="rounded-sm px-2 py-1 text-pv-vivo" aria-label={`Apagar ${p.titulo}`}>
                    ×
                  </button>
                </span>
              ) : p.tipo === "dano" || p.tipo === "arma" ? (
                <button
                  onClick={() => rolarDanoCritico(p)}
                  disabled={rolando}
                  className={`shrink-0 rounded-sm px-2 py-1 text-sm ${t.chip}`}
                  title="Rolar só o dano, já como crítico"
                >
                  crítico
                </button>
              ) : (
                <span className={`shrink-0 text-xl ${t.sutil}`} aria-hidden>
                  ⚀
                </span>
              )}
            </li>
          ))}
          {presets.length === 0 && (
            <li className={`py-2 italic ${t.sutil}`}>
              Salve as rolagens que você usa sempre, como “Katana” ou “Furtividade”, e role com um toque.
            </li>
          )}
        </ul>
        <button
          onClick={() =>
            setEditando({ titulo: "", tipo: atributos ? "teste" : "livre", atributo: "AGI", bonus: 0, margem: 20, multiplicador: 2, expressao: "" })
          }
          className={`mt-2 w-full rounded-sm border border-dashed py-2 ${escuro ? "border-ouro/40 text-ouro-claro" : "border-ouro-escuro/60 text-marinho"}`}
        >
          + Novo preset
        </button>
        </>
        )}
      </section>

      {/* Perícias da ficha */}
      {pericias.length > 0 && atributos && (
        <section className={`${t.painel} p-4`}>
          <h2 className={`titulo mb-2 text-lg ${t.titulo}`}>Perícias</h2>
          <div className="flex flex-wrap gap-1.5">
            {[...pericias]
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((per) => (
                <button
                  key={per.nome}
                  onClick={() => {
                    const pen = condicoes ? condicoes.dados({ atributo: per.atributo, pericia: per.nome }) : { n: 0, de: [] };
                    executar(() => ({
                      ...base,
                      expressao: exprComPenalidade(per.atributo, per.bonus, pen.n),
                      titulo: `${per.nome}${pen.n ? ` ${textoPenalidade(pen)}` : ""}`,
                    }));
                  }}
                  className={`rounded-sm px-2.5 py-1 ${t.chip}`}
                  disabled={rolando}
                >
                  {per.nome} <span className="numeros opacity-70">{per.bonus >= 0 ? `+${per.bonus}` : per.bonus}</span>
                </button>
              ))}
          </div>
        </section>
      )}

      {/* Feed da mesa */}
      <section aria-label="Rolagens da mesa">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className={`titulo text-lg ${t.titulo}`}>Rolagens da mesa</h2>
          {eMestre && feed.linhas.length > 0 && (
            <button
              onClick={async () => {
                if (!confirm("Apagar todo o histórico de rolagens da mesa?")) return;
                const { error } = await supabase().from("rolagens").delete().eq("mesa_id", mesaId);
                if (error) alert(error.message);
                else feed.setLinhas([]);
              }}
              className={`text-sm underline underline-offset-2 ${t.sutil}`}
            >
              Limpar histórico
            </button>
          )}
        </div>
        <div className="grid gap-2">
          {feed.linhas.map((r) => (
            <CartaoRolagem key={r.id} r={r} escuro={escuro} />
          ))}
          {feed.linhas.length === 0 && <p className={`italic ${t.sutil}`}>Ninguém rolou nada ainda.</p>}
        </div>
      </section>

      {editando && (
        <EditorPreset
          inicial={editando}
          mesaId={mesaId}
          personagemId={personagemId}
          ordem={presets.length}
          temAtributos={!!atributos}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

const TIPOS: { id: TipoPreset; nome: string; ajuda: string }[] = [
  { id: "teste", nome: "Teste", ajuda: "Atributo + bônus de perícia (ex.: Furtividade)." },
  { id: "arma", nome: "Arma", ajuda: "Um toque rola o ataque e o dano. Se o ataque critar, o dano já sai crítico." },
  { id: "dano", nome: "Dano", ajuda: "Só os dados de dano." },
  { id: "livre", nome: "Livre", ajuda: "Qualquer combinação de dados." },
];

function EditorPreset({
  inicial, mesaId, personagemId, ordem, temAtributos, onFechar,
}: {
  inicial: Partial<Preset>;
  mesaId: string;
  personagemId: string | null;
  ordem: number;
  temAtributos: boolean;
  onFechar: () => void;
}) {
  const [p, setP] = useState<Partial<Preset>>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const tipos = temAtributos ? TIPOS : TIPOS.filter((x) => x.id === "dano" || x.id === "livre");
  const usaAtributo = p.tipo === "teste" || p.tipo === "arma";
  const usaExpressao = p.tipo !== "teste";
  const usaMult = p.tipo === "arma" || p.tipo === "dano";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!p.titulo?.trim()) return setErro("Dê um título ao preset.");
    if (usaExpressao && !expressaoValida(p.expressao ?? "")) return setErro("Dados inválidos. Exemplo: 1d10+2.");
    const linha = {
      mesa_id: mesaId,
      personagem_id: personagemId,
      titulo: p.titulo.trim(),
      tipo: p.tipo,
      expressao: usaExpressao ? (p.expressao ?? "").replace(/\s/g, "") : "",
      atributo: usaAtributo ? p.atributo : null,
      bonus: usaAtributo ? p.bonus ?? 0 : 0,
      margem: p.margem ?? 20,
      multiplicador: p.multiplicador ?? 2,
    };
    const q = p.id
      ? supabase().from("presets_dados").update(linha).eq("id", p.id)
      : supabase().from("presets_dados").insert({ ...linha, ordem });
    const { error } = await q;
    if (error) return setErro(error.message);
    onFechar();
  }

  const n = (v: string) => {
    const x = parseInt(v, 10);
    return Number.isNaN(x) ? 0 : x;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 sm:items-center" role="dialog" aria-modal aria-label="Preset de dados">
      <form onSubmit={salvar} className="folha folha-solida w-full max-w-md p-4 text-tinta">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="titulo text-xl text-marinho">{p.id ? "Editar preset" : "Novo preset"}</h2>
          <button type="button" onClick={onFechar} className="px-2 text-2xl leading-none text-tinta-suave" aria-label="Fechar">
            ×
          </button>
        </div>
        <label className="grid gap-0.5 text-sm">
          <span className="text-tinta-suave">Título</span>
          <input className="campo text-lg" value={p.titulo ?? ""} onChange={(e) => setP({ ...p, titulo: e.target.value })} placeholder="Katana" />
        </label>

        <div className={`segmentos mt-3 ${tipos.length === 4 ? "" : "!grid-cols-2"}`} role="radiogroup" aria-label="Tipo">
          {tipos.map((x) => (
            <button
              type="button"
              key={x.id}
              role="radio"
              aria-checked={p.tipo === x.id}
              onClick={() => setP({ ...p, tipo: x.id })}
              className={p.tipo === x.id ? "!bg-marinho !text-ouro-claro" : ""}
            >
              {x.nome}
            </button>
          ))}
        </div>
        <p className="mt-1 text-sm italic text-tinta-suave">{TIPOS.find((x) => x.id === p.tipo)?.ajuda}</p>

        {usaAtributo && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <label className="grid gap-0.5 text-sm">
              <span className="text-tinta-suave">Atributo</span>
              <select className="campo" value={p.atributo ?? "AGI"} onChange={(e) => setP({ ...p, atributo: e.target.value as Atributo })}>
                {ATRIBUTOS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-0.5 text-sm">
              <span className="text-tinta-suave">Bônus</span>
              <input className="campo numeros" inputMode="numeric" value={p.bonus ?? 0} onChange={(e) => setP({ ...p, bonus: n(e.target.value) })} />
            </label>
            <label className="grid gap-0.5 text-sm">
              <span className="text-tinta-suave">Crítico em</span>
              <input className="campo numeros" inputMode="numeric" value={p.margem ?? 20} onChange={(e) => setP({ ...p, margem: n(e.target.value) || 20 })} />
            </label>
          </div>
        )}

        {usaExpressao && (
          <div className={`mt-3 grid gap-2 ${usaMult ? "grid-cols-[1fr_6rem]" : ""}`}>
            <label className="grid gap-0.5 text-sm">
              <span className="text-tinta-suave">{p.tipo === "livre" ? "Dados" : "Dados de dano"}</span>
              <input
                className="campo numeros"
                value={p.expressao ?? ""}
                placeholder={p.tipo === "livre" ? "3d20+5" : "1d10+2"}
                autoCapitalize="none"
                onChange={(e) => setP({ ...p, expressao: e.target.value })}
              />
            </label>
            {usaMult && (
              <label className="grid gap-0.5 text-sm">
                <span className="text-tinta-suave">Multiplicador</span>
                <input className="campo numeros" inputMode="numeric" value={p.multiplicador ?? 2} onChange={(e) => setP({ ...p, multiplicador: n(e.target.value) || 2 })} />
              </label>
            )}
          </div>
        )}
        {usaAtributo && (
          <p className="mt-2 text-sm italic text-tinta-suave">O atributo é lido da ficha ativa: com a Âncora ligada, o teste usa os valores da ficha de 50%.</p>
        )}

        {erro && <p className="mt-2 text-sm text-pv">{erro}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onFechar} className="px-3 py-2 text-tinta-suave underline">
            Cancelar
          </button>
          <button className="botao-ouro px-5 py-2">Salvar preset</button>
        </div>
      </form>
    </div>
  );
}

/** Lembrete do que as condições estão mudando nas rolagens. */
function AvisoCondicoes({ c, escuro }: { c: EstadoCondicoes; escuro?: boolean }) {
  const linhas: string[] = [];
  const geral = c.dados({ atributo: null });
  if (geral.n) linhas.push(`Todos os testes: –${geral.n}d (${geral.de.join(", ")}).`);
  const porAtr = new Map<string, Atributo[]>();
  for (const a of ATRIBUTOS) {
    const p = c.dados({ atributo: a });
    if (p.n > geral.n) {
      const k = `–${p.n}d (${p.de.join(", ")})`;
      porAtr.set(k, [...(porAtr.get(k) ?? []), a]);
    }
  }
  for (const [k, as] of porAtr) linhas.push(`Testes de ${as.join(", ")}: ${k}.`);
  const ataque = c.dados({ atributo: null, ataque: true });
  if (ataque.n > geral.n) linhas.push(`Ataques: –${ataque.n}d (${ataque.de.join(", ")}).`);
  const cac = c.dados({ atributo: null, ataque: true, corpoACorpo: true });
  if (cac.n > ataque.n) linhas.push(`Ataques corpo a corpo: –${cac.n}d (${cac.de.join(", ")}).`);
  if (c.custoPE) linhas.push(`Rituais e habilidades custam +${c.custoPE} PE.`);
  if (c.acoes) linhas.push(c.acoes.tipo === "nenhuma" ? `Sem ações (${c.acoes.de}).` : c.acoes.tipo === "uma" ? `Só uma ação padrão ou de movimento (${c.acoes.de}).` : `Só ações mentais (${c.acoes.de}).`);
  if (!linhas.length) return null;
  return (
    <section
      className={`rounded-sm border px-3 py-2 text-sm ${escuro ? "border-sangue-vivo/50 bg-sangue/20 text-nevoa" : "border-sangue-vivo/50 bg-sangue/10 text-tinta"}`}
      aria-label="Condições nas rolagens"
    >
      <p className="titulo">As condições já entram nas rolagens</p>
      <ul className="mt-0.5 list-disc pl-5">
        {linhas.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}
