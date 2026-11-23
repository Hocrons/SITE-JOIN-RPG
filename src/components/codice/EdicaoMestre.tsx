"use client";

import { useEffect, useRef, useState } from "react";
import {
  importarMarkdown, NOME_VISIBILIDADE, STATUS_LORE, TIPOS_LORE,
  type DadosLore, type EntradaLore, type TipoLore,
} from "@/lib/lore";
import type { Visibilidade } from "@/lib/tipos";
import { FotoLore } from "./LeituraEntrada";
import { Markdown } from "./Markdown";

export interface Jogador {
  id: string;
  nome: string;
}

const CURTO: Record<Visibilidade, string> = { mestre: "Só o mestre", todos: "Todos", especificos: "Alguns" };
const CAMPO = "w-full rounded-sm border border-ouro/25 bg-noite px-2.5 py-1.5 text-nevoa placeholder:text-nevoa/40 focus:border-ouro";
const BOTAO = "rounded-sm border border-ouro/30 px-2.5 py-1 text-sm text-ouro-claro hover:bg-ouro/10 disabled:opacity-40";

/** Quem vê: só o mestre, todos, ou jogadores escolhidos. Muda na hora, em tempo real. */
export function ControleVisibilidade({
  vis, quem, jogadores, aoMudar, compacto,
}: {
  vis: Visibilidade;
  quem: string[];
  jogadores: Jogador[];
  aoMudar: (vis: Visibilidade, ids: string[]) => Promise<unknown>;
  compacto?: boolean;
}) {
  const [ocupado, setOcupado] = useState(false);
  async function mudar(v: Visibilidade, ids: string[]) {
    setOcupado(true);
    await aoMudar(v, ids);
    setOcupado(false);
  }
  const marcados = new Set(vis === "especificos" ? quem : []);

  const corpo = (
    <div className="grid gap-2" aria-busy={ocupado}>
      <div className="flex overflow-hidden rounded-sm border border-ouro/30" role="radiogroup" aria-label="Quem vê">
        {(["mestre", "todos", "especificos"] as Visibilidade[]).map((v) => (
          <button
            key={v}
            role="radio"
            aria-checked={vis === v}
            disabled={ocupado}
            onClick={() => (v === "especificos" ? mudar(v, quem.length ? quem : []) : mudar(v, []))}
            className={`flex-1 px-2.5 py-1 text-sm ${
              vis === v
                ? v === "mestre" ? "bg-noite-3 text-nevoa" : v === "todos" ? "bg-pd/70 text-white" : "bg-ouro/85 text-marinho"
                : "text-nevoa/70 hover:bg-ouro/10"
            } ${v !== "mestre" ? "border-l border-ouro/20" : ""}`}
          >
            {CURTO[v]}
          </button>
        ))}
      </div>
      {vis === "especificos" && (
        <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
          <legend className="sr-only">Jogadores que veem</legend>
          {jogadores.map((j) => (
            <label key={j.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                className="accent-[#b8912f]"
                checked={marcados.has(j.id)}
                disabled={ocupado}
                onChange={(e) => {
                  const s = new Set(marcados);
                  if (e.target.checked) s.add(j.id);
                  else s.delete(j.id);
                  mudar("especificos", [...s]);
                }}
              />
              {j.nome}
            </label>
          ))}
          {marcados.size === 0 && <span className="text-sm italic text-ouro-claro/80">Ninguém marcado ainda.</span>}
        </fieldset>
      )}
    </div>
  );

  if (!compacto) return corpo;
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none text-sm text-nevoa/60 hover:text-ouro-claro" title="Quem vê esta conexão">
        {NOME_VISIBILIDADE[vis]}
      </summary>
      <div className="painel absolute right-0 z-20 mt-1 w-80 p-2.5 shadow-xl">{corpo}</div>
    </details>
  );
}

/** Edição de uma entrada: campos, texto em markdown com prévia, imagens e notas secretas. */
export function EditorEntrada({
  entrada, lore, aoFechar,
}: {
  entrada: EntradaLore;
  lore: DadosLore;
  aoFechar: () => void;
}) {
  const [f, setF] = useState({
    titulo: entrada.titulo,
    tipo: entrada.tipo,
    status: entrada.status,
    resumo: entrada.resumo,
    texto: entrada.texto,
    tags: entrada.tags.join(", "),
  });
  const [previa, setPrevia] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const fotos = lore.imagens.filter((i) => i.entrada_id === entrada.id);
  const mudou =
    f.titulo !== entrada.titulo || f.tipo !== entrada.tipo || f.status !== entrada.status ||
    f.resumo !== entrada.resumo || f.texto !== entrada.texto || f.tags !== entrada.tags.join(", ");

  async function salvar() {
    if (!f.titulo.trim()) return alert("A entrada precisa de um título.");
    setSalvando(true);
    const ok = await lore.salvarEntrada(entrada.id, {
      titulo: f.titulo.trim(),
      tipo: f.tipo,
      status: f.status,
      resumo: f.resumo.trim(),
      texto: f.texto,
      tags: f.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    });
    setSalvando(false);
    if (ok) aoFechar();
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_150px]">
        <label className="grid gap-0.5 text-sm text-nevoa/70">
          Título
          <input className={`${CAMPO} titulo text-lg`} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required />
        </label>
        <label className="grid gap-0.5 text-sm text-nevoa/70">
          Tipo
          <select className={CAMPO} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoLore })}>
            {TIPOS_LORE.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-0.5 text-sm text-nevoa/70">
          Status
          <select className={CAMPO} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as EntradaLore["status"] })}>
            {STATUS_LORE.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-0.5 text-sm text-nevoa/70">
        Resumo (uma linha, aparece na lista)
        <input className={CAMPO} value={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.value })} />
      </label>
      <label className="grid gap-0.5 text-sm text-nevoa/70">
        Marcadores, separados por vírgula
        <input className={CAMPO} value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="império, palácio" />
      </label>
      <div className="grid gap-1">
        <div className="flex items-baseline justify-between text-sm text-nevoa/70">
          <span id="rot-texto">Texto (markdown; [[Título]] liga a outra entrada)</span>
          <button type="button" className="underline underline-offset-2" onClick={() => setPrevia(!previa)}>
            {previa ? "Editar" : "Prévia"}
          </button>
        </div>
        {previa ? (
          <div className="min-h-48 rounded-sm border border-ouro/20 p-3">
            <Markdown texto={f.texto} escuro />
          </div>
        ) : (
          <textarea
            aria-labelledby="rot-texto"
            className={`${CAMPO} min-h-72 font-[inherit] leading-relaxed`}
            value={f.texto}
            onChange={(e) => setF({ ...f, texto: e.target.value })}
          />
        )}
      </div>

      <div className="grid gap-1.5">
        <p className="text-sm text-nevoa/70">Imagens (seguem a visibilidade da entrada)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {fotos.map((img) => (
            <FotoLore key={img.id} imagem={img} escuro>
              <input
                className={`${CAMPO} mt-1 py-1 text-sm`}
                defaultValue={img.legenda}
                placeholder="Legenda"
                aria-label="Legenda"
                onBlur={(e) => e.target.value !== img.legenda && lore.legendarImagem(img.id, e.target.value)}
              />
              <button type="button" className="mt-0.5 text-sm text-pv-vivo underline underline-offset-2" onClick={() => lore.excluirImagem(img)}>
                Remover
              </button>
            </FotoLore>
          ))}
          <button
            type="button"
            onClick={() => arquivo.current?.click()}
            className="grid aspect-[4/3] place-items-center rounded-sm border border-dashed border-ouro/35 text-sm text-ouro-claro hover:bg-ouro/5"
          >
            Adicionar imagem
          </button>
          <input
            ref={arquivo}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const a = e.target.files?.[0];
              if (a) lore.enviarImagem(entrada.id, a);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t border-ouro/15 bg-noite-2/95 px-4 py-2.5 backdrop-blur">
        <button type="submit" disabled={salvando || !mudou} className="botao-ouro px-4 py-1.5">
          {salvando ? "Salvando…" : "Salvar entrada"}
        </button>
        <button type="button" className={BOTAO} onClick={aoFechar}>
          {mudou ? "Descartar" : "Fechar"}
        </button>
        {mudou && <span className="text-sm italic text-ouro-claro/80">Alterações não salvas</span>}
      </div>
    </form>
  );
}

/** Notas que nunca saem da Área do Mestre. Salva ao sair do campo. */
export function NotasSecretas({ entradaId, lore }: { entradaId: string; lore: DadosLore }) {
  const atual = lore.notas.find((n) => n.entrada_id === entradaId)?.texto ?? "";
  const [texto, setTexto] = useState(atual);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  useEffect(() => setTexto(atual), [atual, entradaId]);
  return (
    <section className="rounded-sm border border-dashed border-ouro/30 p-3" aria-label="Notas secretas">
      <div className="mb-1.5">
        <h3 className="titulo text-ouro-claro">Notas secretas</h3>
        <span className="text-sm italic text-nevoa/50" aria-live="polite">
          {estado === "salvando" ? "Salvando…" : estado === "salvo" ? "Salvo" : "Nunca aparecem para os jogadores"}
        </span>
      </div>
      <textarea
        className={`${CAMPO} min-h-28`}
        value={texto}
        aria-label="Notas secretas"
        placeholder="Ganchos, segredos, o que ainda não foi decidido…"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={async () => {
          if (texto === atual) return;
          setEstado("salvando");
          await lore.salvarNota(entradaId, texto);
          setEstado("salvo");
        }}
      />
      {texto && texto === atual && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-nevoa/60">Ver formatado</summary>
          <div className="mt-2">
            <Markdown texto={texto} escuro />
          </div>
        </details>
      )}
    </section>
  );
}

/** Nova conexão a partir da entrada aberta. */
export function NovaConexao({ entrada, lore }: { entrada: EntradaLore; lore: DadosLore }) {
  const [destino, setDestino] = useState("");
  const [rotulo, setRotulo] = useState("");
  const [sentido, setSentido] = useState<"sai" | "chega">("sai");
  const outras = lore.entradas.filter((e) => e.id !== entrada.id);
  return (
    <form
      className="grid gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!destino || !rotulo.trim()) return;
        const [o, d] = sentido === "sai" ? [entrada.id, destino] : [destino, entrada.id];
        await lore.criarConexao(o, d, rotulo.trim());
        setRotulo("");
        setDestino("");
      }}
    >
      <select className={CAMPO} value={sentido} onChange={(e) => setSentido(e.target.value as "sai" | "chega")} aria-label="Sentido">
        <option value="sai">Esta entrada é…</option>
        <option value="chega">A outra entrada é…</option>
      </select>
      <input className={CAMPO} value={rotulo} onChange={(e) => setRotulo(e.target.value)} placeholder="Relação (ex.: filha de)" aria-label="Relação" />
      <select className={CAMPO} value={destino} onChange={(e) => setDestino(e.target.value)} aria-label="Outra entrada">
        <option value="">Escolha a entrada</option>
        {outras.map((o) => (
          <option key={o.id} value={o.id}>
            {o.titulo}
          </option>
        ))}
      </select>
      <p className="text-sm text-nevoa/55">
        {sentido === "sai" ? `${entrada.titulo} ${rotulo || "…"} ${lore.entradas.find((x) => x.id === destino)?.titulo ?? "…"}` : `${lore.entradas.find((x) => x.id === destino)?.titulo ?? "…"} ${rotulo || "…"} ${entrada.titulo}`}
      </p>
      <button type="submit" className={BOTAO} disabled={!destino || !rotulo.trim()}>
        Criar conexão (só o mestre vê)
      </button>
    </form>
  );
}

/** Colar markdown e transformar em várias entradas (todas entram como "só o mestre"). */
export function ImportarMarkdown({ lore, aoFechar }: { lore: DadosLore; aoFechar: (primeira?: string) => void }) {
  const [texto, setTexto] = useState("");
  const [nivel, setNivel] = useState<1 | 2 | 3>(2);
  const [tipo, setTipo] = useState<TipoLore>("nota");
  const [importando, setImportando] = useState(false);
  const partes = importarMarkdown(texto, nivel);
  const existentes = new Set(lore.entradas.map((e) => e.titulo.toLowerCase()));

  async function importar() {
    setImportando(true);
    let primeira: string | undefined;
    for (const p of partes) {
      const nova = await lore.criarEntrada({ ...p, tipo, visibilidade: "mestre" });
      primeira ??= nova?.id;
    }
    setImportando(false);
    aoFechar(primeira);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Importar markdown" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="painel grid max-h-[90dvh] w-full max-w-3xl gap-3 overflow-auto p-5">
        <h2 className="titulo text-xl text-ouro-claro">Importar markdown</h2>
        <p className="text-nevoa/75">
          Cole um texto do Notion ou do Obsidian. Cada título vira uma entrada; ✅ 🟡 ❓ no título viram o status e uma linha
          “Tags: a, b” vira marcadores. Tudo entra como <b>só o mestre</b>.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-0.5 text-sm text-nevoa/70">
            Separar por títulos até o nível
            <select className={CAMPO} value={nivel} onChange={(e) => setNivel(Number(e.target.value) as 1 | 2 | 3)}>
              <option value={1}># (só os maiores)</option>
              <option value={2}>## (padrão)</option>
              <option value={3}>###</option>
            </select>
          </label>
          <label className="grid gap-0.5 text-sm text-nevoa/70">
            Tipo das novas entradas
            <select className={CAMPO} value={tipo} onChange={(e) => setTipo(e.target.value as TipoLore)}>
              {TIPOS_LORE.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea
          className={`${CAMPO} min-h-56`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"## Mania Plutão\nTags: rebelião\nLíder da Rebelião, filha do Petreus…"}
          aria-label="Markdown para importar"
        />
        {partes.length > 0 && (
          <div>
            <p className="mb-1 text-sm text-nevoa/70">
              {partes.length} {partes.length === 1 ? "entrada" : "entradas"} encontradas:
            </p>
            <ul className="max-h-40 overflow-auto text-sm">
              {partes.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-ouro-claro">{p.titulo}</span>
                  {existentes.has(p.titulo.toLowerCase()) && <span className="italic text-pe-vivo">já existe uma com esse título</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-2">
          <button className="botao-ouro px-4 py-1.5" disabled={!partes.length || importando} onClick={importar}>
            {importando ? "Importando…" : `Importar ${partes.length || ""}`}
          </button>
          <button className={BOTAO} onClick={() => aoFechar()}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
