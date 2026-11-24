"use client";

import { useEffect, useRef, useState } from "react";
import type { Cena } from "@/lib/cenas";
import { corFaccao, FACCOES, type DadosTokens, type Faccao, type Token } from "@/lib/tokens";
import type { Personagem } from "@/lib/tipos";

const CAMPO = "w-full rounded-sm border border-ouro/25 bg-noite px-2.5 py-1.5 text-nevoa placeholder:text-nevoa/40";
const TAMANHOS = [
  { n: 1, nome: "1×1 · normal" },
  { n: 2, nome: "2×2 · grande" },
  { n: 3, nome: "3×3 · enorme" },
  { n: 4, nome: "4×4 · colossal" },
  { n: 6, nome: "6×6" },
];

/** Tokens da cena: colocar agentes, criar NPCs, mostrar/esconder e editar. */
export function PainelTokens({
  cena, dt, personagens, selecionado, onSelecionar, centro,
}: {
  cena: Cena;
  dt: DadosTokens;
  personagens: Personagem[];
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
  /** Quadrado no centro da tela, onde os tokens novos aparecem. */
  centro: () => { c: number; l: number };
}) {
  const naCena = new Set(dt.tokens.map((t) => t.personagem_id).filter(Boolean));
  const agentesFora = personagens.filter((p) => p.tipo === "pj" && !p.arquivado && !naCena.has(p.id));
  const sel = dt.tokens.find((t) => t.id === selecionado) ?? null;

  async function colocarAgentes(lista: Personagem[]) {
    const { c, l } = centro();
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i];
      await dt.criar({
        cena_id: cena.id,
        personagem_id: p.id,
        nome: p.nome.split(" ")[0],
        faccao: "agente",
        coluna: c + (i % 4),
        linha: l + Math.floor(i / 4),
      });
    }
  }

  return (
    <div className="grid gap-5">
      {sel && <EditorToken key={sel.id} t={sel} dt={dt} personagens={personagens} onFechar={() => onSelecionar(null)} />}

      <section className="grid gap-2">
        <h3 className="titulo text-ouro-claro">Agentes</h3>
        {agentesFora.length === 0 ? (
          <p className="text-sm text-nevoa/50">Todos os agentes já estão nesta cena.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {agentesFora.map((p) => (
              <button key={p.id} onClick={() => colocarAgentes([p])} className="rounded-sm border border-ouro/30 px-2.5 py-1 text-sm text-ouro-claro hover:bg-ouro/10">
                + {p.nome}
              </button>
            ))}
            {agentesFora.length > 1 && (
              <button onClick={() => colocarAgentes(agentesFora)} className="botao-ouro px-2.5 py-1 text-sm">
                Colocar todos
              </button>
            )}
          </div>
        )}
      </section>

      <NovoToken cena={cena} dt={dt} personagens={personagens} centro={centro} onCriado={(t) => onSelecionar(t.id)} />

      <section className="grid gap-1.5">
        <h3 className="titulo text-ouro-claro">Nesta cena</h3>
        {dt.tokens.length === 0 && <p className="text-sm text-nevoa/50">Nenhum token ainda.</p>}
        <ul className="grid gap-1">
          {dt.tokens.map((t) => (
            <li key={t.id} className={`flex items-center gap-2 rounded-sm px-2 py-1 ${t.id === selecionado ? "bg-ouro/15" : "hover:bg-ouro/5"}`}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: corFaccao(t.faccao) }} aria-hidden />
              <button onClick={() => onSelecionar(t.id)} className={`min-w-0 flex-1 truncate text-left ${t.oculto ? "text-nevoa/50 italic" : "text-nevoa"}`}>
                {t.nome}
                {t.tamanho > 1 && <span className="numeros ml-1 text-xs text-nevoa/50">{t.tamanho}×{t.tamanho}</span>}
              </button>
              <BotaoOlho t={t} dt={dt} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BotaoOlho({ t, dt }: { t: Token; dt: DadosTokens }) {
  return (
    <button
      onClick={() => dt.salvar(t, { oculto: !t.oculto })}
      title={t.oculto ? "Escondido dos jogadores. Clique para revelar." : "Visível para os jogadores. Clique para esconder."}
      aria-label={t.oculto ? `Revelar ${t.nome}` : `Esconder ${t.nome}`}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-sm border ${t.oculto ? "border-nevoa/20 text-nevoa/50" : "border-ouro/35 text-ouro-claro"}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        {t.oculto && <path d="M4 4l16 16" />}
      </svg>
    </button>
  );
}

function SeletorFaccao({ valor, onMudar }: { valor: Faccao; onMudar: (f: Faccao) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Facção">
      {FACCOES.map((f) => (
        <button
          key={f.id}
          role="radio"
          aria-checked={valor === f.id}
          onClick={() => onMudar(f.id)}
          className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 text-sm ${valor === f.id ? "border-ouro bg-ouro/15 text-nevoa" : "border-ouro/20 text-nevoa/70"}`}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.cor }} aria-hidden />
          {f.nome}
        </button>
      ))}
    </div>
  );
}

function SeletorVinculo({ valor, personagens, onMudar }: { valor: string | null; personagens: Personagem[]; onMudar: (id: string | null) => void }) {
  const opcoes = personagens.filter((p) => !p.arquivado);
  return (
    <label className="grid gap-0.5 text-sm text-nevoa/70">
      Ligado à ficha
      <select className={CAMPO} value={valor ?? ""} onChange={(e) => onMudar(e.target.value || null)}>
        <option value="">Nenhuma</option>
        {opcoes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
            {p.tipo !== "pj" ? ` (${p.tipo === "npc" ? "NPC" : "ameaça"})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function NovoToken({
  cena, dt, personagens, centro, onCriado,
}: {
  cena: Cena;
  dt: DadosTokens;
  personagens: Personagem[];
  centro: () => { c: number; l: number };
  onCriado: (t: Token) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [faccao, setFaccao] = useState<Faccao>("inimigo");
  const [tamanho, setTamanho] = useState(1);
  const [oculto, setOculto] = useState(true);
  const [vinculo, setVinculo] = useState<string | null>(null);
  const [imagem, setImagem] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="justify-self-start rounded-sm border border-ouro/35 px-4 py-1.5 text-ouro-claro hover:bg-ouro/10">
        Novo token (NPC, criatura…)
      </button>
    );
  }

  return (
    <form
      className="grid gap-2.5 rounded-sm border border-ouro/25 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!nome.trim()) return;
        setEnviando(true);
        const { c, l } = centro();
        const t = await dt.criar({ cena_id: cena.id, nome: nome.trim(), faccao, tamanho, oculto, personagem_id: vinculo, coluna: c, linha: l }, imagem);
        setEnviando(false);
        if (t) {
          setNome("");
          setImagem(null);
          setAberto(false);
          onCriado(t);
        }
      }}
    >
      <h3 className="titulo text-ouro-claro">Novo token</h3>
      <input className={CAMPO} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex.: Cultista)" maxLength={60} aria-label="Nome do token" autoFocus />
      <SeletorFaccao valor={faccao} onMudar={setFaccao} />
      <label className="grid gap-0.5 text-sm text-nevoa/70">
        Tamanho
        <select className={CAMPO} value={tamanho} onChange={(e) => setTamanho(Number(e.target.value))}>
          {TAMANHOS.map((t) => (
            <option key={t.n} value={t.n}>
              {t.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => arquivo.current?.click()} className="rounded-sm border border-ouro/30 px-3 py-1 text-sm text-ouro-claro hover:bg-ouro/10">
          {imagem ? "Trocar imagem" : "Escolher imagem"}
        </button>
        <span className="min-w-0 truncate text-sm text-nevoa/60">{imagem?.name ?? "PNG de corpo inteiro com fundo transparente"}</span>
        <input ref={arquivo} type="file" accept="image/png,image/webp,image/*" hidden onChange={(e) => setImagem(e.target.files?.[0] ?? null)} />
      </div>
      <SeletorVinculo valor={vinculo} personagens={personagens} onMudar={setVinculo} />
      <label className="flex items-center gap-2 text-sm text-nevoa/80">
        <input type="checkbox" className="h-4 w-4 accent-[#b8912f]" checked={oculto} onChange={(e) => setOculto(e.target.checked)} />
        Começar escondido dos jogadores
      </label>
      <div className="flex gap-2">
        <button className="botao-ouro px-4 py-1.5" disabled={!nome.trim() || enviando}>
          {enviando ? "Colocando…" : "Colocar no mapa"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="px-3 text-sm text-nevoa/60 underline underline-offset-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function EditorToken({ t, dt, personagens, onFechar }: { t: Token; dt: DadosTokens; personagens: Personagem[]; onFechar: () => void }) {
  const [nome, setNome] = useState(t.nome);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  useEffect(() => setNome(t.nome), [t.nome]);

  return (
    <section className="grid gap-2.5 rounded-sm border border-ouro/50 bg-ouro/5 p-3" aria-label={`Editar ${t.nome}`}>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: corFaccao(t.faccao) }} aria-hidden />
        <h3 className="titulo mr-auto truncate text-ouro-claro">{t.nome}</h3>
        <button onClick={onFechar} className="text-sm text-nevoa/60 underline underline-offset-2">
          Fechar
        </button>
      </div>
      <input
        className={CAMPO}
        value={nome}
        maxLength={60}
        aria-label="Nome do token"
        onChange={(e) => setNome(e.target.value)}
        onBlur={() => nome.trim() && nome !== t.nome && dt.salvar(t, { nome: nome.trim() })}
      />
      <label className="flex items-center gap-2 text-sm text-nevoa/80">
        <input type="checkbox" className="h-4 w-4 accent-[#b8912f]" checked={!t.oculto} onChange={(e) => dt.salvar(t, { oculto: !e.target.checked })} />
        Visível para os jogadores
      </label>
      <SeletorFaccao valor={t.faccao} onMudar={(f) => dt.salvar(t, { faccao: f })} />
      <label className="grid gap-0.5 text-sm text-nevoa/70">
        Tamanho
        <select className={CAMPO} value={t.tamanho} onChange={(e) => dt.salvar(t, { tamanho: Number(e.target.value) })}>
          {TAMANHOS.map((x) => (
            <option key={x.n} value={x.n}>
              {x.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => arquivo.current?.click()}
          disabled={enviando}
          className="rounded-sm border border-ouro/30 px-3 py-1 text-sm text-ouro-claro hover:bg-ouro/10 disabled:opacity-60"
        >
          {enviando ? "Enviando…" : t.imagem_caminho ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {t.imagem_caminho && (
          <button onClick={() => dt.removerImagem(t)} className="text-sm text-nevoa/60 underline underline-offset-2">
            Tirar imagem
          </button>
        )}
        <input
          ref={arquivo}
          type="file"
          accept="image/png,image/webp,image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setEnviando(true);
            await dt.enviarImagem(t, f);
            setEnviando(false);
          }}
        />
      </div>
      <SeletorVinculo valor={t.personagem_id} personagens={personagens} onMudar={(id) => dt.salvar(t, { personagem_id: id })} />
      <p className="text-xs text-nevoa/50">
        {t.personagem_id
          ? "Mostra as barras de PV, SAN e PE da ficha. Cada jogador só vê as barras do próprio agente."
          : "Sem ficha ligada, o token não mostra barras."}
      </p>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => dt.duplicar(t)} className="rounded-sm border border-ouro/30 px-3 py-1 text-sm text-ouro-claro hover:bg-ouro/10">
          Duplicar
        </button>
        <button
          onClick={() => confirm(`Tirar “${t.nome}” do mapa?`) && (dt.excluir(t), onFechar())}
          className="text-sm text-pv-vivo underline underline-offset-2"
        >
          Tirar do mapa
        </button>
      </div>
    </section>
  );
}
