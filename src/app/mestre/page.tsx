"use client";

import Link from "next/link";
import { useState } from "react";
import { Condicoes } from "@/components/Condicoes";
import { camposVisiveis } from "@/components/FichaCompleta";
import { FotoPersonagem } from "@/components/FotoPersonagem";
import { OrdemTurnos } from "@/components/OrdemTurnos";
import { Rolador } from "@/components/Rolador";
import { CascaMestre } from "@/components/mestre/CascaMestre";
import { useCombateAtivo } from "@/lib/combate";
import { alerta, descricaoPersonagem, fichaAtiva, pct, varianteAtiva } from "@/lib/regras";
import { useSessao } from "@/lib/sessao";
import { supabase } from "@/lib/supabase";
import type { Personagem } from "@/lib/tipos";
import { useMesa } from "@/lib/useMesa";

const NOME_CAMPO: Record<string, string> = {
  pv_atual: "PV", pv_temp: "PV temporário", san_atual: "SAN", pe_atual: "PE", pd_atual: "PD",
  condicoes: "condições", ancora_ativa: "Âncora",
};

function valorLog(v: unknown) {
  if (v === true) return "ligada";
  if (v === false) return "desligada";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "nenhuma";
  return String(v ?? "–");
}

async function rpc(nome: string, args: Record<string, unknown>) {
  const { data, error } = await supabase().rpc(nome, args);
  if (error) alert(error.message);
  return data;
}

type Dados = ReturnType<typeof useMesa>;
type Lado = "dados" | "combate" | "registro";

export default function Escudo() {
  const { mesa } = useSessao();
  const dados = useMesa(mesa?.id, true);
  return (
    <CascaMestre subtitulo="Escudo do Mestre" status={dados.personagens.status}>
      {mesa && <ConteudoEscudo mesaId={mesa.id} ancoraGlobal={mesa.ancora_global} dados={dados} />}
    </CascaMestre>
  );
}

function ConteudoEscudo({ mesaId, ancoraGlobal, dados }: { mesaId: string; ancoraGlobal: boolean; dados: Dados }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [lado, setLado] = useState<Lado>("dados");
  const [movel, setMovel] = useState<"mesa" | Lado>("mesa");
  const { ativo: combate } = useCombateAtivo(mesaId);

  const pjs = dados.personagens.linhas.filter((p) => p.tipo === "pj" && !p.arquivado);
  const sel = [...selecionados];
  const sobAncora = pjs.filter((p) => p.ancora_ativa);

  const ancora = (ativa: boolean, ids: string[] | null, modo: "zona" | "marca" = "zona") =>
    rpc("ancora_definir", { p_mesa: mesaId, p_ativa: ativa, p_personagens: ids, p_modo: modo });

  function alternar(id: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function salvarGrupo() {
    const nome = prompt("Nome do grupo (ex.: Equipe da floresta):");
    if (!nome?.trim()) return;
    const { error } = await supabase().from("grupos_ancora").insert({ mesa_id: mesaId, nome: nome.trim(), personagem_ids: sel });
    if (error) alert(error.message);
  }

  const lateral = (qual: Lado) =>
    qual === "dados" ? (
      <Rolador mesaId={mesaId} personagemId={null} eMestre escuro />
    ) : qual === "combate" ? (
      <div className="grid gap-3">
        <OrdemTurnos mesaId={mesaId} meuPersonagem={null} />
        <Link href="/mestre/combate" className="botao-ouro py-2 text-center">
          {combate ? "Abrir o painel de combate" : "Começar um combate"}
        </Link>
      </div>
    ) : (
      <Registro dados={dados} />
    );

  return (
    <>
      {/* troca de painel no celular */}
      <div className="mb-3 grid grid-cols-4 overflow-hidden rounded-sm border border-ouro/25 lg:hidden" role="tablist" aria-label="Escudo">
        {(["mesa", "dados", "combate", "registro"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={movel === m}
            onClick={() => setMovel(m)}
            className={`relative py-2 text-[0.95rem] ${movel === m ? "bg-ouro/90 text-marinho" : "text-nevoa/75"}`}
          >
            {{ mesa: "Mesa", dados: "Dados", combate: "Combate", registro: "Registro" }[m]}
            {m === "combate" && combate && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sangue-vivo" />}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`grid gap-3 ${movel === "mesa" ? "" : "hidden lg:grid"}`}>
          {/* Âncora */}
          <section
            className={`painel flex flex-wrap items-center gap-2 p-2.5 ${ancoraGlobal ? "border-ardosia" : ""}`}
            aria-label="Âncora"
          >
            <span className="flex items-center gap-2 px-1">
              <span className={`h-2.5 w-2.5 rounded-full ${ancoraGlobal || sobAncora.length ? "bg-ardosia shadow-[0_0_0_3px_rgba(111,118,132,.35)]" : "bg-pd-vivo"}`} aria-hidden />
              <span className="text-nevoa/85">
                {ancoraGlobal
                  ? "Âncora ligada para todos"
                  : sobAncora.length
                    ? `Âncora em ${sobAncora.map((p) => p.nome.split(" ")[0]).join(", ")}`
                    : "Âncora desligada"}
              </span>
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              {sel.length > 0 ? (
                <>
                  <span className="text-sm text-nevoa/60">{sel.length} selecionado{sel.length > 1 ? "s" : ""}:</span>
                  <button onClick={() => ancora(true, sel)} className="rounded-sm bg-ouro/90 px-3 py-1.5 text-sm text-marinho">
                    Ligar
                  </button>
                  <button onClick={() => ancora(false, sel)} className="rounded-sm border border-ouro/35 px-3 py-1.5 text-sm text-ouro-claro">
                    Desligar
                  </button>
                  <button onClick={salvarGrupo} className="rounded-sm border border-ouro/35 px-3 py-1.5 text-sm text-ouro-claro">
                    Salvar grupo
                  </button>
                  <button onClick={() => setSelecionados(new Set())} className="px-1.5 text-sm text-nevoa/55 underline underline-offset-2">
                    Limpar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => ancora(!ancoraGlobal, null)}
                  aria-pressed={ancoraGlobal}
                  className={ancoraGlobal ? "rounded-sm border border-ardosia bg-ardosia/30 px-3 py-1.5 text-nevoa" : "botao-ouro px-3 py-1.5"}
                >
                  {ancoraGlobal ? "Desligar para todos" : "Ligar para todos"}
                </button>
              )}
              <button
                onClick={() => rpc("desfazer_ultima", { p_mesa: mesaId })}
                className="rounded-sm border border-ouro/30 px-3 py-1.5 text-sm text-ouro-claro hover:bg-ouro/10"
                title="Desfaz o último bloco de mudanças (veja em Registro)"
              >
                ↶ Desfazer
              </button>
            </span>
            {dados.grupos.linhas.length > 0 && (
              <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-ouro/10 pt-2">
                <span className="datilo text-sm text-nevoa/45">grupos</span>
                {dados.grupos.linhas.map((g) => (
                  <span key={g.id} className="flex items-center overflow-hidden rounded-sm border border-ouro/25 text-sm">
                    <button onClick={() => setSelecionados(new Set(g.personagem_ids))} className="px-2.5 py-1 text-ouro-claro hover:bg-ouro/10" title="Selecionar este grupo">
                      {g.nome}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Apagar o grupo "${g.nome}"?`)) return;
                        const { error } = await supabase().from("grupos_ancora").delete().eq("id", g.id);
                        if (error) alert(error.message);
                      }}
                      className="border-l border-ouro/20 px-2 py-1 text-nevoa/40 hover:text-pv-vivo"
                      aria-label={`Apagar grupo ${g.nome}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Personagens */}
          <div className="grid items-start gap-3 xl:grid-cols-2">
            {pjs.map((p) => (
              <CartaoEscudo
                key={p.id}
                p={p}
                dados={dados}
                selecionado={selecionados.has(p.id)}
                onSelecionar={() => alternar(p.id)}
                onMarca={() => ancora(!p.ancora_ativa, [p.id], "marca")}
              />
            ))}
          </div>
        </div>

        {/* lateral: no computador fica fixa; no celular vira uma das abas */}
        <aside className={`lg:sticky lg:top-[4.5rem] ${movel === "mesa" ? "hidden lg:block" : ""}`} aria-label="Ferramentas">
          <div className="mb-2 hidden grid-cols-3 overflow-hidden rounded-sm border border-ouro/25 lg:grid" role="tablist">
            {(["dados", "combate", "registro"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={lado === m}
                onClick={() => setLado(m)}
                className={`relative py-1.5 ${lado === m ? "bg-ouro/90 text-marinho" : "text-nevoa/75 hover:bg-ouro/10"}`}
              >
                {{ dados: "Dados", combate: "Combate", registro: "Registro" }[m]}
                {m === "combate" && combate && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sangue-vivo" />}
              </button>
            ))}
          </div>
          <div className="lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pr-1">
            <div className="lg:hidden">{movel !== "mesa" && lateral(movel)}</div>
            <div className="hidden lg:block">{lateral(lado)}</div>
          </div>
        </aside>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ cartão de personagem

function CartaoEscudo({
  p, dados, selecionado, onSelecionar, onMarca,
}: {
  p: Personagem;
  dados: Dados;
  selecionado: boolean;
  onSelecionar: () => void;
  onMarca: () => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [condicao, setCondicao] = useState(false);
  const f = fichaAtiva(p, dados.fichas.linhas);
  const d = dados.detalhes.linhas.find((x) => x.personagem_id === p.id && x.variante === varianteAtiva(p));
  const campos = camposVisiveis(p, f);
  const perigo = !!f && (alerta(p.pv_atual, f.pv_max) !== "ok" || alerta(p.san_atual, f.san_max) !== "ok");
  const campoAberto = campos.find((c) => c.campo === aberto);

  return (
    <article
      className={`painel relative p-3 ${p.ancora_ativa ? "sob-ancora" : ""} ${perigo ? "em-perigo" : ""} ${selecionado ? "outline outline-2 outline-offset-2 outline-ouro" : ""}`}
    >
      <header className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={onSelecionar}
          className="h-5 w-5 shrink-0 accent-[#b8912f]"
          aria-label={`Selecionar ${p.nome} para a Âncora`}
          title="Selecionar para a Âncora"
        />
        <FotoPersonagem mesaId={p.mesa_id} personagemId={p.id} nome={p.nome} caminho={p.foto_caminho} tamanho={38} />
        <div className="min-w-0 flex-1">
          <Link href={`/mestre/ficha/${p.id}`} className="titulo block truncate text-lg leading-tight text-ouro-claro hover:underline" title="Abrir a ficha completa">
            {p.nome}
          </Link>
          <p className="truncate text-sm italic text-nevoa/55">
            {p.jogador ? `${p.jogador}, ` : ""}
            {descricaoPersonagem(p)}
          </p>
        </div>
        <div className="shrink-0 text-right leading-tight">
          <p className="numeros">NEX {f?.nex ?? "–"}%</p>
          <p className="text-sm text-nevoa/60">
            Def. <span className="numeros text-nevoa">{d?.defesa ?? "–"}</span>
          </p>
        </div>
      </header>

      {/* status compactos: toque para ajustar */}
      <div className="mt-2.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${campos.length}, minmax(0,1fr))` }}>
        {campos.map(({ campo, rotulo, corViva, max }) => {
          const atual = (p[campo] as number) ?? 0;
          const teto = (f?.[max] as number) ?? 0;
          const temp = campo === "pv_atual" ? p.pv_temp ?? 0 : 0;
          const ativo = aberto === campo;
          return (
            <button
              key={campo}
              onClick={() => setAberto(ativo ? null : campo)}
              aria-expanded={ativo}
              className={`rounded-sm border px-2 py-1.5 text-left ${ativo ? "border-ouro bg-ouro/10" : "border-ouro/15 hover:border-ouro/40"}`}
            >
              <span className="flex items-baseline justify-between gap-1">
                <span className="text-sm text-nevoa/70">{rotulo}</span>
                <span className="numeros text-lg leading-none">
                  {atual}
                  {temp > 0 && <span className="text-ouro-claro">+{temp}</span>}
                  <span className="text-sm text-nevoa/45">/{teto}</span>
                </span>
              </span>
              <span className="trilho mt-1.5 block" style={{ height: 5 }}>
                <span className={`preenchimento block ${corViva}`} style={{ width: `${pct(atual, teto)}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      {campoAberto && (
        <AjusteStatus
          key={campoAberto.campo}
          rotulo={campoAberto.nome}
          campo={campoAberto.campo}
          atual={(p[campoAberto.campo] as number) ?? 0}
          temp={campoAberto.campo === "pv_atual" ? p.pv_temp ?? 0 : null}
          onDelta={(n) => dados.ajustar(p, campoAberto.campo, n)}
          onDefinir={(n) => dados.atualizarPersonagem(p.id, { [campoAberto.campo]: n })}
          onTemp={(n) => dados.atualizarPersonagem(p.id, { pv_temp: n })}
          onFechar={() => setAberto(null)}
        />
      )}

      {/* condições */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {p.condicoes.map((c) => (
          <span key={c} className="flex items-center gap-1 rounded-sm border border-sangue-vivo/50 bg-sangue/20 px-2 py-0.5 text-sm text-nevoa">
            {c}
            <button onClick={() => dados.atualizarPersonagem(p.id, { condicoes: p.condicoes.filter((x) => x !== c) })} aria-label={`Tirar ${c}`} className="text-nevoa/60 hover:text-nevoa">
              ×
            </button>
          </span>
        ))}
        {!condicao ? (
          <>
            <button onClick={() => setCondicao(true)} className="rounded-sm border border-dashed border-ouro/30 px-2 py-0.5 text-sm text-nevoa/60 hover:text-ouro-claro">
              + condição
            </button>
            <span className="ml-auto flex items-center gap-2">
              {p.ancora_ativa && <span className="datilo text-sm text-nevoa/60">ficha 50%</span>}
              {p.tem_marca ? (
                <button
                  onClick={onMarca}
                  aria-pressed={p.ancora_ativa}
                  className={`rounded-sm border px-2 py-0.5 text-sm ${p.ancora_ativa ? "border-ardosia bg-ardosia/30 text-nevoa" : "border-ouro/30 text-ouro-claro hover:bg-ouro/10"}`}
                  title="A Marca do Império aplica a Âncora só neste personagem"
                >
                  {p.ancora_ativa ? "Soltar Marca" : "Marca"}
                </button>
              ) : (
                <span className="text-sm italic text-nevoa/35" title="Não tem a Marca do Império">sem Marca</span>
              )}
            </span>
          </>
        ) : (
          <div className="w-full">
            <Condicoes
              lista={[]}
              editavel
              escuro
              onChange={(nova) => {
                const c = nova[0];
                if (c && !p.condicoes.includes(c)) dados.atualizarPersonagem(p.id, { condicoes: [...p.condicoes, c] });
                setCondicao(false);
              }}
            />
          </div>
        )}
      </div>
    </article>
  );
}

/** Ajuste rápido de um status: passos prontos e um valor exato de dano ou cura. */
function AjusteStatus({
  rotulo, campo, atual, temp, onDelta, onDefinir, onTemp, onFechar,
}: {
  rotulo: string;
  campo: string;
  atual: number;
  temp: number | null;
  onDelta: (n: number) => void;
  onDefinir: (n: number) => void;
  onTemp: (n: number) => void;
  onFechar: () => void;
}) {
  const [valor, setValor] = useState("");
  const [tempTexto, setTempTexto] = useState("");
  const n = Math.abs(parseInt(valor, 10)) || 0;
  const passo = "numeros rounded-sm border border-ouro/20 py-2 hover:bg-ouro/10";
  const [menos, mais] = campo === "pv_atual" ? ["Dano", "Cura"] : campo === "san_atual" ? ["Perde", "Recupera"] : ["Gasta", "Recupera"];
  return (
    <div className="mt-2 grid gap-2 rounded-sm border border-ouro/25 bg-noite/60 p-2.5" role="group" aria-label={`Ajustar ${rotulo}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-nevoa/70">{rotulo}</span>
        <button onClick={onFechar} className="px-1 text-lg leading-none text-nevoa/50" aria-label="Fechar ajuste">
          ×
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {[-10, -5, -1, 1, 5, 10].map((d) => (
          <button key={d} onClick={() => onDelta(d)} className={`${passo} ${d < 0 ? "text-pv-vivo" : "text-pd-vivo"}`}>
            {d > 0 ? `+${d}` : `−${-d}`}
          </button>
        ))}
      </div>
      <form
        className="grid grid-cols-[1fr_auto_auto_auto] gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (n) onDelta(-n);
          setValor("");
        }}
      >
        <input
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="valor"
          aria-label="Valor"
          className="numeros min-w-0 rounded-sm border border-ouro/25 bg-noite px-2 py-1.5 text-center text-lg text-nevoa placeholder:text-nevoa/30"
        />
        <button className="rounded-sm bg-sangue px-3 text-nevoa disabled:opacity-40" disabled={!n}>
          {menos}
        </button>
        <button type="button" onClick={() => { if (n) onDelta(n); setValor(""); }} className="rounded-sm bg-pd/80 px-3 text-white disabled:opacity-40" disabled={!n}>
          {mais}
        </button>
        <button type="button" onClick={() => { if (valor !== "") onDefinir(n); setValor(""); }} className="rounded-sm border border-ouro/30 px-2.5 text-sm text-ouro-claro disabled:opacity-40" disabled={valor === ""} title={`Pôr ${rotulo} exatamente neste valor`}>
          Fixar
        </button>
      </form>
      {temp != null && (
        <form
          className="flex flex-wrap items-center gap-2 text-sm text-nevoa/70"
          onSubmit={(e) => {
            e.preventDefault();
            if (tempTexto === "") return;
            onTemp(Math.max(0, parseInt(tempTexto, 10) || 0));
            setTempTexto("");
          }}
        >
          <span>
            PV temporário <span className="numeros text-base text-ouro-claro">{temp}</span>
          </span>
          <input
            inputMode="numeric"
            value={tempTexto}
            onChange={(e) => setTempTexto(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="novo"
            aria-label="PV temporário exato"
            className="numeros w-20 rounded-sm border border-ouro/25 bg-noite px-2 py-1 text-center text-base text-nevoa placeholder:text-nevoa/30"
          />
          <button className="rounded-sm border border-ouro/30 px-2.5 py-1 text-ouro-claro disabled:opacity-40" disabled={tempTexto === ""}>
            Definir
          </button>
          {temp > 0 && (
            <button type="button" onClick={() => onTemp(0)} className="text-nevoa/55 underline underline-offset-2">
              zerar
            </button>
          )}
        </form>
      )}
      <p className="text-sm text-nevoa/45">
        Atual: <span className="numeros">{atual}</span>.{campo === "pv_atual" ? " Dano gasta o PV temporário primeiro." : ""}
      </p>
    </div>
  );
}

function Registro({ dados }: { dados: Dados }) {
  return (
    <section className="painel p-3">
      <h2 className="titulo mb-1 text-ouro-claro">Registro de mudanças</h2>
      <p className="mb-2 text-sm text-nevoa/50">O “Desfazer” reverte o último bloco desta lista.</p>
      <ol className="grid gap-1">
        {dados.log.linhas.slice(0, 80).map((l) => (
          <li key={l.id} className={`flex gap-2.5 text-[0.95rem] ${l.desfeito ? "line-through opacity-40" : ""}`}>
            <time className="numeros w-11 shrink-0 text-sm text-nevoa/45">
              {new Date(l.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </time>
            <span>
              {l.personagem_nome}: {NOME_CAMPO[l.campo] ?? l.campo} <span className="numeros">{valorLog(l.antes)}</span> →{" "}
              <span className="numeros">{valorLog(l.depois)}</span>
              <span className="text-nevoa/45"> ({l.autor})</span>
            </span>
          </li>
        ))}
        {dados.log.linhas.length === 0 && <li className="italic text-nevoa/50">Nenhuma mudança ainda.</li>}
      </ol>
    </section>
  );
}
