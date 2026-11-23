"use client";

/**
 * Sala ao vivo (Etapa 1). Jogador: a própria ficha em destaque + companheiros.
 * Mestre: todos lado a lado no painel escuro. Nas próximas etapas vira /ficha e /mestre.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarraStatus } from "@/components/BarraStatus";
import { Brasao } from "@/components/Brasao";
import { useAoVivo, type StatusConexao } from "@/lib/aoVivo";
import { alerta, fichaAtiva } from "@/lib/regras";
import { useSessao } from "@/lib/sessao";
import { supabase } from "@/lib/supabase";
import type { CampoStatus, Ficha, LogAlteracao, Personagem } from "@/lib/tipos";

type Linha<T> = T & Record<string, unknown>;

const CAMPOS: { campo: CampoStatus; rotulo: string; nome: string; cor: string; corViva: string; max: keyof Ficha }[] = [
  { campo: "pv_atual", rotulo: "PV", nome: "Pontos de Vida", cor: "bg-pv", corViva: "bg-pv-vivo", max: "pv_max" },
  { campo: "san_atual", rotulo: "SAN", nome: "Sanidade", cor: "bg-san", corViva: "bg-san-vivo", max: "san_max" },
  { campo: "pe_atual", rotulo: "PE", nome: "Pontos de Esforço", cor: "bg-pe", corViva: "bg-pe-vivo", max: "pe_max" },
  { campo: "pd_atual", rotulo: "PD", nome: "Pontos de Determinação", cor: "bg-pd", corViva: "bg-pd-vivo", max: "pd_max" },
];

const NOME_CAMPO: Record<string, string> = {
  pv_atual: "PV", pv_temp: "PV temporário", san_atual: "SAN", pe_atual: "PE", pd_atual: "PD",
  condicoes: "condições", ancora_ativa: "Âncora",
};

function descricao(p: Personagem) {
  const classe = p.trilha ? `${p.classe} (${p.trilha})` : p.classe;
  return [classe, p.origem && `origem ${p.origem}`].filter(Boolean).join(", ");
}

function camposVisiveis(p: Personagem, f: Ficha | undefined) {
  return CAMPOS.filter(({ campo, max }) => {
    if (campo === "pd_atual") return f?.pd_max != null || p.pd_atual != null;
    if (p.usa_determinacao && (campo === "san_atual" || campo === "pe_atual")) return false;
    return f?.[max] != null;
  });
}

function emPerigo(p: Personagem, f: Ficha | undefined) {
  if (!f) return false;
  return alerta(p.pv_atual, f.pv_max) !== "ok" || alerta(p.san_atual, f.san_max) !== "ok";
}

function valorLog(v: unknown) {
  if (v === true) return "ligada";
  if (v === false) return "desligada";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "nenhuma";
  return String(v ?? "–");
}

function Conexao({ status, escuro }: { status: StatusConexao; escuro: boolean }) {
  const texto = status === "ao vivo" ? "Ao vivo" : status === "offline" ? "Sem conexão" : "Conectando";
  const cor = status === "ao vivo" ? "bg-emerald-500" : status === "offline" ? "bg-pv-vivo" : "bg-pe-vivo";
  return (
    <span className={`flex items-center gap-1.5 text-sm ${escuro ? "text-nevoa/75" : "text-tinta-suave"}`}>
      <span className={`h-2 w-2 rounded-full ${cor}`} aria-hidden />
      {texto}
    </span>
  );
}

export default function SalaAoVivo() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre, sair } = useSessao();

  useEffect(() => {
    if (!carregando && !membro) router.replace("/");
  }, [carregando, membro, router]);

  const personagens = useAoVivo<Linha<Personagem>>("personagens", mesa?.id, {
    chave: (p) => String(p.id),
    ordenar: (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  });
  const fichas = useAoVivo<Linha<Ficha>>("fichas", mesa?.id, {
    chave: (f) => `${f.personagem_id}:${f.variante}`,
  });
  const log = useAoVivo<Linha<LogAlteracao>>("log_alteracoes", mesa?.id, {
    chave: (l) => String(l.id),
    ordenar: (a, b) => b.id - a.id,
    ativo: eMestre,
  });

  async function ajustar(p: Personagem, campo: CampoStatus, delta: number) {
    personagens.setLinhas((l) =>
      l.map((x) => {
        if (x.id !== p.id) return x;
        if (campo === "pv_atual" && delta < 0 && x.pv_temp > 0) {
          const sobra = x.pv_temp + delta;
          return { ...x, pv_temp: Math.max(0, sobra), pv_atual: Math.max(0, x.pv_atual + Math.min(0, sobra)) };
        }
        return { ...x, [campo]: Math.max(0, (x[campo] ?? 0) + delta) };
      }),
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

  if (!mesa || !membro) {
    return <p className="serifa p-10 text-center text-lg italic text-tinta-suave">Abrindo a mesa…</p>;
  }

  const barras = (p: Personagem, f: Ficha | undefined, densidade: "grande" | "painel" | "mini", editavel: boolean) =>
    camposVisiveis(p, f).map(({ campo, rotulo, nome, cor, corViva, max }) => (
      <BarraStatus
        key={campo}
        rotulo={rotulo}
        nomeCompleto={nome}
        atual={(p[campo] as number) ?? 0}
        max={(f?.[max] as number) ?? 0}
        cor={densidade === "painel" ? corViva : cor}
        editavel={editavel}
        densidade={densidade}
        onDelta={(d) => ajustar(p, campo, d)}
        onDefinir={(v) => definir(p, campo, v)}
        temp={campo === "pv_atual" ? p.pv_temp ?? 0 : undefined}
        onDefinirTemp={campo === "pv_atual" ? (v) => definir(p, "pv_temp", v) : undefined}
      />
    ));

  /* ------------------------------ MESTRE ------------------------------ */
  if (eMestre) {
    return (
      <main className="tema-mestre">
        <div className="mx-auto max-w-7xl px-5 py-5">
          <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Brasao tamanho={38} />
            <div className="mr-auto">
              <h1 className="titulo text-2xl text-ouro-claro">{mesa.nome}</h1>
              <p className="text-sm italic text-nevoa/60">Escudo do Mestre</p>
            </div>
            <Conexao status={personagens.status} escuro />
            <button onClick={sair} className="text-sm text-nevoa/60 underline underline-offset-2 hover:text-nevoa">
              Sair da mesa
            </button>
          </header>

          <div className="painel mb-5 flex flex-wrap items-center gap-3 p-3">
            <button
              onClick={ancoraGlobal}
              aria-pressed={mesa.ancora_global}
              className={
                mesa.ancora_global
                  ? "titulo rounded-sm border border-ardosia bg-ardosia/30 px-4 py-2 text-nevoa"
                  : "botao-ouro px-4 py-2"
              }
            >
              ⚓ {mesa.ancora_global ? "Desligar a Âncora" : "Ligar a Âncora para todos"}
            </button>
            <button
              onClick={desfazer}
              className="rounded-sm border border-ouro/35 px-3 py-2 text-ouro-claro hover:bg-ouro/10"
            >
              ↶ Desfazer a última mudança
            </button>
            <span className="text-sm italic text-nevoa/50">Prévia: o Escudo completo chega na Etapa 2.</span>
          </div>

          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {personagens.linhas.map((p) => {
              const f = fichaAtiva(p, fichas.linhas);
              const perigo = emPerigo(p, f);
              return (
                <article
                  key={p.id}
                  className={`painel group p-4 ${p.ancora_ativa ? "sob-ancora" : ""} ${
                    perigo ? "em-perigo" : ""
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="titulo truncate text-xl text-ouro-claro">{p.nome}</h2>
                      <p className="truncate text-sm italic text-nevoa/60">
                        {p.jogador ? `${p.jogador}, ` : ""}
                        {descricao(p)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="numeros text-lg leading-none">NEX {f?.nex ?? "–"}%</p>
                      {p.ancora_ativa && <p className="mt-1 text-sm italic text-nevoa/70">⚓ ficha de 50%</p>}
                    </div>
                  </div>
                  <div className="grid gap-3.5">{barras(p, f, "painel", true)}</div>
                  {p.condicoes.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {p.condicoes.map((c) => (
                        <li key={c} className="rounded-sm border border-ouro/30 px-2 text-sm text-ouro-claro">
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>

          <section className="painel mt-5 p-4">
            <h2 className="titulo mb-2 text-lg text-ouro-claro">Registro de mudanças</h2>
            <ol className="max-h-64 space-y-1 overflow-auto">
              {log.linhas.slice(0, 40).map((l) => (
                <li key={l.id} className={`flex gap-3 ${l.desfeito ? "line-through opacity-40" : ""}`}>
                  <time className="numeros w-16 shrink-0 text-sm text-nevoa/50">
                    {new Date(l.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </time>
                  <span>
                    <b className="font-semibold text-ouro-claro">{l.autor}</b> mudou {NOME_CAMPO[l.campo] ?? l.campo} de{" "}
                    {l.personagem_nome}: <span className="numeros">{valorLog(l.antes)}</span> →{" "}
                    <span className="numeros">{valorLog(l.depois)}</span>
                  </span>
                </li>
              ))}
              {log.linhas.length === 0 && <li className="italic text-nevoa/50">Nenhuma mudança ainda nesta sessão.</li>}
            </ol>
          </section>
        </div>
      </main>
    );
  }

  /* ------------------------------ JOGADOR ------------------------------ */
  const eu = personagens.linhas.find((p) => p.id === membro.personagem_id);
  const outros = personagens.linhas.filter((p) => p.id !== membro.personagem_id);
  const minhaFicha = eu ? fichaAtiva(eu, fichas.linhas) : undefined;

  return (
    <main className="mx-auto max-w-xl px-4 pb-12 pt-4">
      <header className="mb-4 flex items-center gap-3">
        <Brasao tamanho={32} />
        <p className="titulo mr-auto text-lg text-marinho">{mesa.nome}</p>
        <Conexao status={personagens.status} escuro={false} />
        <button onClick={sair} className="text-sm text-tinta-suave underline underline-offset-2">
          Sair
        </button>
      </header>

      {eu ? (
        <section className={`folha px-4 pb-5 pt-4 ${eu.ancora_ativa ? "sob-ancora" : ""}`} aria-label="Sua ficha">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="titulo text-[2rem] leading-tight text-marinho">{eu.nome}</h1>
              <p className="italic text-tinta-suave">{descricao(eu)}</p>
            </div>
            <div className="shrink-0 pt-1 text-right">
              <p className="numeros text-2xl leading-none text-marinho">{minhaFicha?.nex ?? "–"}%</p>
              <p className="text-sm italic text-tinta-suave">NEX</p>
            </div>
          </div>

          <div className={`meandro my-3 ${eu.ancora_ativa ? "meandro-ancora" : ""}`} aria-hidden />
          {eu.ancora_ativa && (
            <p className="-mt-1 mb-3 italic text-ardosia">
              ⚓ A Âncora está ativa: você está usando a ficha de 50%.
            </p>
          )}

          <div className="grid gap-5">{barras(eu, minhaFicha, "grande", true)}</div>

          {eu.condicoes.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {eu.condicoes.map((c) => (
                <li key={c} className="rounded-sm bg-marinho px-2 text-sm text-ouro-claro">
                  {c}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="folha p-4 italic">Seu personagem não foi encontrado nesta mesa. Peça ao mestre para conferir.</p>
      )}

      {outros.length > 0 && (
        <section className="mt-7" aria-label="Seus companheiros">
          <h2 className="titulo mb-2 text-lg text-marinho">Seus companheiros</h2>
          <ul className="folha divide-y divide-ouro-escuro/20 px-4">
            {outros.map((p) => {
              const f = fichaAtiva(p, fichas.linhas);
              return (
                <li key={p.id} className={`py-3 ${p.ancora_ativa ? "sob-ancora" : ""}`}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="titulo truncate text-base text-marinho">
                      {p.nome}
                      {p.ancora_ativa && <span className="ml-1.5 text-sm text-ardosia" title="Sob a Âncora">⚓</span>}
                    </span>
                    <span className="numeros shrink-0 text-sm text-tinta-suave">NEX {f?.nex ?? "–"}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">{barras(p, f, "mini", false)}</div>
                  {p.condicoes.length > 0 && (
                    <p className="mt-1 text-sm italic text-tinta-suave">{p.condicoes.join(", ")}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
