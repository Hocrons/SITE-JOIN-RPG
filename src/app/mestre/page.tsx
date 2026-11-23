"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarraStatus } from "@/components/BarraStatus";
import { Brasao } from "@/components/Brasao";
import { Condicoes } from "@/components/Condicoes";
import { Conexao } from "@/components/Conexao";
import { camposVisiveis } from "@/components/FichaCompleta";
import { FotoPersonagem } from "@/components/FotoPersonagem";
import { Rolador } from "@/components/Rolador";
import { alerta, descricaoPersonagem, fichaAtiva, varianteAtiva } from "@/lib/regras";
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

export default function Escudo() {
  const router = useRouter();
  const { carregando, membro, mesa, eMestre, sair } = useSessao();
  const dados = useMesa(mesa?.id, true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [pinsAbertos, setPinsAbertos] = useState(false);
  const [dadosAbertos, setDadosAbertos] = useState(false);

  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else if (!eMestre) router.replace("/ficha");
  }, [carregando, membro, eMestre, router]);

  if (!mesa || !eMestre) {
    return <main className="tema-mestre grid place-items-center italic text-nevoa/60">Abrindo o Escudo…</main>;
  }

  const pjs = dados.personagens.linhas.filter((p) => p.tipo === "pj" && !p.arquivado);
  const sel = [...selecionados];

  function alternar(id: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const ancora = (ativa: boolean, ids: string[] | null, modo: "zona" | "marca" = "zona") =>
    rpc("ancora_definir", { p_mesa: mesa.id, p_ativa: ativa, p_personagens: ids, p_modo: modo });

  async function salvarGrupo() {
    const nome = prompt("Nome do grupo (ex.: Equipe da floresta):");
    if (!nome?.trim()) return;
    const { error } = await supabase()
      .from("grupos_ancora")
      .insert({ mesa_id: mesa!.id, nome: nome.trim(), personagem_ids: sel });
    if (error) alert(error.message);
  }

  async function apagarGrupo(id: string, nome: string) {
    if (!confirm(`Apagar o grupo "${nome}"? Os personagens não são afetados.`)) return;
    const { error } = await supabase().from("grupos_ancora").delete().eq("id", id);
    if (error) alert(error.message);
  }

  return (
    <main className="tema-mestre">
      <div className="mx-auto max-w-7xl px-5 py-5">
        <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Brasao tamanho={38} />
          <div className="mr-auto">
            <h1 className="titulo text-2xl text-ouro-claro">{mesa.nome}</h1>
            <p className="text-sm italic text-nevoa/60">Escudo do Mestre · código {mesa.codigo}</p>
          </div>
          <Conexao status={dados.personagens.status} escuro />
          <button onClick={() => setPinsAbertos(true)} className="rounded-sm border border-ouro/35 px-3 py-1.5 text-sm text-ouro-claro hover:bg-ouro/10">
            PINs de acesso
          </button>
          <button onClick={sair} className="text-sm text-nevoa/60 underline underline-offset-2 hover:text-nevoa">
            Sair da mesa
          </button>
        </header>

        {/* Âncora */}
        <section className="painel mb-4 grid gap-3 p-3" aria-label="Âncora">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => ancora(!mesa.ancora_global, null)}
              aria-pressed={mesa.ancora_global}
              className={
                mesa.ancora_global
                  ? "titulo rounded-sm border border-ardosia bg-ardosia/30 px-4 py-2 text-nevoa"
                  : "botao-ouro px-4 py-2"
              }
            >
              ⚓ {mesa.ancora_global ? "Desligar a Âncora para todos" : "Ligar a Âncora para todos"}
            </button>
            <button
              onClick={() => rpc("desfazer_ultima", { p_mesa: mesa.id })}
              className="rounded-sm border border-ouro/35 px-3 py-2 text-ouro-claro hover:bg-ouro/10"
            >
              ↶ Desfazer a última mudança
            </button>
            <span className="ml-auto text-sm italic text-nevoa/55">
              {sel.length === 0
                ? "Marque personagens nos cartões para agir só neles."
                : `${sel.length} selecionado${sel.length > 1 ? "s" : ""}`}
            </span>
          </div>

          {sel.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-ouro/15 pt-3">
              <span className="text-sm text-nevoa/70">Zona / Pulso nos selecionados:</span>
              <button onClick={() => ancora(true, sel)} className="rounded-sm bg-ouro/90 px-3 py-1.5 text-sm text-marinho hover:bg-ouro-claro">
                Ligar
              </button>
              <button onClick={() => ancora(false, sel)} className="rounded-sm border border-ouro/35 px-3 py-1.5 text-sm text-ouro-claro">
                Desligar
              </button>
              <button onClick={salvarGrupo} className="rounded-sm border border-ouro/35 px-3 py-1.5 text-sm text-ouro-claro">
                Salvar como grupo
              </button>
              <button onClick={() => setSelecionados(new Set())} className="text-sm text-nevoa/60 underline">
                Limpar seleção
              </button>
            </div>
          )}

          {dados.grupos.linhas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-ouro/15 pt-3">
              <span className="text-sm text-nevoa/70">Grupos salvos:</span>
              {dados.grupos.linhas.map((g) => (
                <span key={g.id} className="flex items-center overflow-hidden rounded-sm border border-ouro/30 text-sm">
                  <button
                    onClick={() => setSelecionados(new Set(g.personagem_ids))}
                    className="px-2.5 py-1 text-ouro-claro hover:bg-ouro/10"
                    title="Selecionar este grupo"
                  >
                    {g.nome}
                  </button>
                  <button onClick={() => ancora(true, g.personagem_ids)} className="border-l border-ouro/20 px-2 py-1 hover:bg-ouro/10" title="Ligar a Âncora neste grupo">
                    ⚓
                  </button>
                  <button onClick={() => ancora(false, g.personagem_ids)} className="border-l border-ouro/20 px-2 py-1 text-nevoa/60 hover:bg-ouro/10" title="Desligar neste grupo">
                    ○
                  </button>
                  <button onClick={() => apagarGrupo(g.id, g.nome)} className="border-l border-ouro/20 px-2 py-1 text-nevoa/40 hover:text-pv-vivo" aria-label={`Apagar grupo ${g.nome}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Personagens */}
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
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

        {/* Registro */}
        <section className="painel mt-5 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="titulo text-lg text-ouro-claro">Registro de mudanças</h2>
            <span className="text-sm italic text-nevoa/45">o desfazer reverte o último bloco</span>
          </div>
          <ol className="max-h-72 space-y-1 overflow-auto">
            {dados.log.linhas.slice(0, 60).map((l) => (
              <li key={l.id} className={`flex gap-3 ${l.desfeito ? "line-through opacity-40" : ""}`}>
                <time className="numeros w-14 shrink-0 text-sm text-nevoa/50">
                  {new Date(l.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </time>
                <span>
                  <b className="font-semibold text-ouro-claro">{l.autor}</b> mudou {NOME_CAMPO[l.campo] ?? l.campo} de{" "}
                  {l.personagem_nome}: <span className="numeros">{valorLog(l.antes)}</span> →{" "}
                  <span className="numeros">{valorLog(l.depois)}</span>
                </span>
              </li>
            ))}
            {dados.log.linhas.length === 0 && <li className="italic text-nevoa/50">Nenhuma mudança ainda.</li>}
          </ol>
        </section>
      </div>

      <button
        onClick={() => setDadosAbertos((x) => !x)}
        aria-expanded={dadosAbertos}
        className="botao-ouro fixed bottom-5 right-5 z-30 px-5 py-3 shadow-lg"
      >
        {dadosAbertos ? "Fechar dados" : "⚀ Dados"}
      </button>
      {dadosAbertos && (
        <aside
          className="fixed inset-y-0 right-0 z-20 w-full max-w-md overflow-y-auto border-l border-ouro/25 bg-noite/97 px-4 pb-24 pt-5 shadow-2xl backdrop-blur"
          aria-label="Dados do mestre"
        >
          <h2 className="titulo mb-3 text-xl text-ouro-claro">Dados</h2>
          <Rolador mesaId={mesa.id} personagemId={null} eMestre escuro />
        </aside>
      )}

      {pinsAbertos && <JanelaPins mesaId={mesa.id} pjs={pjs} onFechar={() => setPinsAbertos(false)} />}
    </main>
  );
}

function CartaoEscudo({
  p, dados, selecionado, onSelecionar, onMarca,
}: {
  p: Personagem;
  dados: ReturnType<typeof useMesa>;
  selecionado: boolean;
  onSelecionar: () => void;
  onMarca: () => void;
}) {
  const f = fichaAtiva(p, dados.fichas.linhas);
  const d = dados.detalhes.linhas.find((x) => x.personagem_id === p.id && x.variante === varianteAtiva(p));
  const perigo = !!f && (alerta(p.pv_atual, f.pv_max) !== "ok" || alerta(p.san_atual, f.san_max) !== "ok");

  return (
    <article
      className={`painel group p-4 ${p.ancora_ativa ? "sob-ancora" : ""} ${perigo ? "em-perigo" : ""} ${
        selecionado ? "ring-2 ring-ouro" : ""
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <label className="mt-1 flex cursor-pointer items-center" title="Selecionar para a Âncora">
          <input type="checkbox" checked={selecionado} onChange={onSelecionar} className="h-4 w-4 accent-[#b8912f]" aria-label={`Selecionar ${p.nome}`} />
        </label>
        <FotoPersonagem mesaId={p.mesa_id} personagemId={p.id} nome={p.nome} caminho={p.foto_caminho} tamanho={44} />
        <div className="min-w-0 flex-1">
          <h2 className="titulo truncate text-xl leading-tight text-ouro-claro">{p.nome}</h2>
          <p className="truncate text-sm italic text-nevoa/60">
            {p.jogador ? `${p.jogador}, ` : ""}
            {descricaoPersonagem(p)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="numeros text-lg leading-none">NEX {f?.nex ?? "–"}%</p>
          <p className="mt-1 text-sm text-nevoa/70">
            Defesa <span className="numeros text-nevoa">{d?.defesa ?? "–"}</span>
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {p.ancora_ativa ? (
          <span className="rounded-sm border border-ardosia bg-ardosia/25 px-2 py-0.5">⚓ Âncora ativa, ficha de 50%</span>
        ) : (
          <span className="text-nevoa/50">Ficha de 99%</span>
        )}
        {p.tem_marca ? (
          <button onClick={onMarca} className="ml-auto rounded-sm border border-ouro/35 px-2 py-0.5 text-ouro-claro hover:bg-ouro/10">
            {p.ancora_ativa ? "Soltar a Marca" : "Ativar a Marca"}
          </button>
        ) : (
          <span className="ml-auto italic text-nevoa/45">sem Marca do Império</span>
        )}
      </div>

      <div className="grid gap-3.5">
        {camposVisiveis(p, f).map(({ campo, rotulo, nome, corViva, max }) => (
          <BarraStatus
            key={campo}
            rotulo={rotulo}
            nomeCompleto={nome}
            atual={(p[campo] as number) ?? 0}
            max={(f?.[max] as number) ?? 0}
            cor={corViva}
            editavel
            densidade="painel"
            onDelta={(delta) => dados.ajustar(p, campo, delta)}
            onDefinir={(valor) => dados.atualizarPersonagem(p.id, { [campo]: valor })}
            temp={campo === "pv_atual" ? p.pv_temp ?? 0 : undefined}
            onDefinirTemp={campo === "pv_atual" ? (valor) => dados.atualizarPersonagem(p.id, { pv_temp: valor }) : undefined}
          />
        ))}
      </div>

      <div className="mt-3">
        <Condicoes lista={p.condicoes} editavel escuro onChange={(nova) => dados.atualizarPersonagem(p.id, { condicoes: nova })} />
      </div>

      <Link href={`/mestre/ficha/${p.id}`} className="mt-3 inline-block text-sm text-ouro-claro underline underline-offset-2">
        Abrir ficha completa
      </Link>
    </article>
  );
}

function JanelaPins({ mesaId, pjs, onFechar }: { mesaId: string; pjs: Personagem[]; onFechar: () => void }) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [ok, setOk] = useState<Record<string, boolean>>({});
  const linhas: { id: string; nome: string }[] = [{ id: "mestre", nome: "Mestre (você)" }, ...pjs.map((p) => ({ id: p.id, nome: p.nome }))];

  async function salvar(id: string) {
    const pin = (valores[id] ?? "").trim();
    if (pin.length < 4) return alert("O PIN precisa de pelo menos 4 caracteres.");
    const { error } = await supabase().rpc("definir_pin", {
      p_mesa: mesaId,
      p_pin: pin,
      p_personagem: id === "mestre" ? null : id,
    });
    if (error) return alert(error.message);
    setOk((o) => ({ ...o, [id]: true }));
    setValores((v) => ({ ...v, [id]: "" }));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal aria-label="PINs de acesso">
      <div className="painel w-full max-w-md p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="titulo text-xl text-ouro-claro">PINs de acesso</h2>
          <button onClick={onFechar} className="text-2xl leading-none text-nevoa/60" aria-label="Fechar">
            ×
          </button>
        </div>
        <p className="mb-4 text-sm italic text-nevoa/60">
          Os PINs ficam embaralhados no banco, então não dá para ver o atual, só definir um novo. Quem já está dentro continua conectado.
        </p>
        <ul className="grid gap-2">
          {linhas.map((l) => (
            <li key={l.id} className="grid grid-cols-[1fr_7rem_auto] items-center gap-2">
              <span className="titulo truncate">{l.nome}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="novo PIN"
                aria-label={`Novo PIN de ${l.nome}`}
                value={valores[l.id] ?? ""}
                onChange={(e) => {
                  setValores((v) => ({ ...v, [l.id]: e.target.value }));
                  setOk((o) => ({ ...o, [l.id]: false }));
                }}
                className="numeros rounded-sm border border-ouro/30 bg-noite px-2 py-1 text-center text-nevoa placeholder:text-nevoa/30"
              />
              <button
                onClick={() => salvar(l.id)}
                className={`w-20 rounded-sm px-2 py-1 text-sm ${ok[l.id] ? "text-emerald-400" : "border border-ouro/35 text-ouro-claro hover:bg-ouro/10"}`}
              >
                {ok[l.id] ? "Trocado" : "Trocar"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
