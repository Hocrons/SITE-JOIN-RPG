"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Grafo } from "@/components/codice/Grafo";
import { LeituraEntrada } from "@/components/codice/LeituraEntrada";
import { Markdown } from "@/components/codice/Markdown";
import { normalizar, useLore } from "@/lib/lore";
import { linksDe, useCaderno, type NotaPessoal } from "@/lib/lorePessoal";

interface Props {
  mesaId: string;
  personagemId: string;
  /** Mestre lendo o caderno de um jogador. */
  somenteLeitura?: boolean;
}

const COR_NOTA = "#12284a";
const COR_CODICE = "#b8912f";

/**
 * Caderno de lore pessoal no estilo Obsidian: notas em markdown, [[links]] entre elas
 * (e para o Códice), "mencionada em" e o grafo das ligações.
 */
export function CadernoLore({ mesaId, personagemId, somenteLeitura }: Props) {
  const caderno = useCaderno(mesaId, personagemId);
  const lore = useLore(mesaId, false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [codiceAberto, setCodiceAberto] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [modo, setModo] = useState<"lista" | "grafo">("lista");
  const [busca, setBusca] = useState("");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [noGrafo, setNoGrafo] = useState<string | null>(null);

  const { notas } = caderno;
  const porTitulo = useMemo(() => new Map(notas.map((n) => [normalizar(n.titulo), n])), [notas]);
  // links podem apontar para notas (prioridade) ou para entradas do Códice que o jogador já vê
  const alvos = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of lore.entradas) m.set(normalizar(e.titulo), `codice:${e.id}`);
    for (const n of notas) m.set(normalizar(n.titulo), n.id);
    return m;
  }, [notas, lore.entradas]);

  const nota = notas.find((n) => n.id === aberta);

  function abrirAlvo(id: string) {
    if (id.startsWith("codice:")) return setCodiceAberto(id.slice(7));
    setAberta(id);
    setEditando(false);
    window.scrollTo({ top: 0 });
  }

  async function criarEAbrir(titulo: string) {
    if (somenteLeitura || !titulo.trim()) return;
    const n = await caderno.criar(titulo);
    if (n) {
      setAberta(n.id);
      setEditando(true);
    }
  }

  const termo = normalizar(busca.trim());
  const filtradas = termo ? notas.filter((n) => normalizar(`${n.titulo} ${n.texto} ${n.tags.join(" ")}`).includes(termo)) : notas;

  const entradaCodice = lore.entradas.find((e) => e.id === codiceAberto);
  const modalCodice = entradaCodice && (
    <div role="dialog" aria-modal="true" aria-label={entradaCodice.titulo} className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={() => setCodiceAberto(null)}>
      <div className="folha-solida max-h-[85dvh] w-full max-w-xl overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex justify-between">
          <span className="text-sm italic text-tinta-suave">Do Códice</span>
          <button onClick={() => setCodiceAberto(null)} className="px-2 text-2xl leading-none text-tinta-suave" aria-label="Fechar">
            ×
          </button>
        </div>
        <LeituraEntrada
          entrada={entradaCodice}
          entradas={lore.entradas}
          conexoes={lore.conexoes}
          imagens={lore.imagens}
          eMestre={false}
          aoAbrir={(id) => setCodiceAberto(id)}
        />
      </div>
    </div>
  );

  // ------------------------------------------------------------------ uma nota aberta
  if (nota) {
    const mencoes = notas.filter((n) => n.id !== nota.id && linksDe(n.texto).includes(normalizar(nota.titulo)));
    return (
      <div className="grid gap-3">
        <button onClick={() => setAberta(null)} className="justify-self-start text-tinta-suave underline underline-offset-2">
          Voltar ao caderno
        </button>
        <article className="folha p-4">
          {editando ? (
            <EditorNota
              key={nota.id}
              nota={nota}
              notas={notas}
              titulosCodice={lore.entradas.map((e) => e.titulo)}
              caderno={caderno}
              aoFechar={() => setEditando(false)}
            />
          ) : (
            <>
              <div className="flex items-start gap-2">
                <h2 className="titulo min-w-0 flex-1 text-2xl leading-tight text-marinho">{nota.titulo}</h2>
                {!somenteLeitura && (
                  <>
                    <button
                      onClick={() => caderno.salvar(nota.id, { fixada: !nota.fixada })}
                      className={`shrink-0 rounded-sm border px-2 py-1 text-sm ${nota.fixada ? "border-marinho bg-marinho text-pergaminho-claro" : "border-ouro-escuro/40 text-marinho"}`}
                      aria-pressed={nota.fixada}
                      title="Fixar no topo do caderno"
                    >
                      {nota.fixada ? "Fixada" : "Fixar"}
                    </button>
                    <button onClick={() => setEditando(true)} className="botao-ouro shrink-0 px-3 py-1">
                      Editar
                    </button>
                  </>
                )}
              </div>
              {nota.tags.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Marcadores">
                  {nota.tags.map((t) => (
                    <li key={t} className="rounded-sm bg-pergaminho-escuro/45 px-1.5 text-sm text-tinta-suave">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                {nota.texto.trim() ? (
                  <Markdown texto={nota.texto} alvos={alvos} aoAbrir={abrirAlvo} aoCriar={somenteLeitura ? undefined : criarEAbrir} />
                ) : (
                  <p className="italic text-tinta-suave">{somenteLeitura ? "Nota vazia." : "Nota vazia. Toque em Editar para escrever."}</p>
                )}
              </div>
            </>
          )}
        </article>

        <section className="folha p-4" aria-label="Mencionada em">
          <h3 className="titulo mb-1 text-marinho">Mencionada em</h3>
          {mencoes.length ? (
            <ul className="divide-y divide-ouro-escuro/15">
              {mencoes.map((n) => (
                <li key={n.id}>
                  <button onClick={() => abrirAlvo(n.id)} className="w-full py-1.5 text-left">
                    <span className="font-semibold text-marinho">{n.titulo}</span>
                    <span className="block line-clamp-2 text-sm text-tinta-suave">{trecho(n.texto, nota.titulo)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-tinta-suave">
              Nenhuma nota liga para esta ainda. Escreva [[{nota.titulo}]] em outra nota para ligar.
            </p>
          )}
        </section>

        {!somenteLeitura && !editando && (
          <button
            onClick={async () => {
              if (!confirm(`Apagar a nota “${nota.titulo}”? Os links para ela viram links vazios.`)) return;
              await caderno.excluir(nota.id);
              setAberta(null);
            }}
            className="justify-self-end px-2 text-sm text-pv underline underline-offset-2"
          >
            Apagar nota
          </button>
        )}
        {modalCodice}
      </div>
    );
  }

  // ------------------------------------------------------------------ o caderno
  const fantasmas = new Map<string, string>();
  const arestas: { id: string; origem: string; destino: string }[] = [];
  for (const n of notas) {
    for (const alvo of linksDe(n.texto)) {
      const destino = porTitulo.get(alvo);
      let id: string;
      if (destino) id = destino.id;
      else {
        const c = lore.entradas.find((e) => normalizar(e.titulo) === alvo);
        id = c ? `codice:${c.id}` : `fantasma:${alvo}`;
        if (!fantasmas.has(id)) fantasmas.set(id, c ? c.titulo : tituloDoLink(n.texto, alvo));
      }
      if (id !== n.id) arestas.push({ id: `${n.id}>${id}`, origem: n.id, destino: id });
    }
  }
  const nos = [
    ...notas.map((n) => ({ id: n.id, rotulo: n.titulo, cor: COR_NOTA })),
    ...[...fantasmas].map(([id, rotulo]) => ({ id, rotulo, cor: id.startsWith("codice:") ? COR_CODICE : "#8a7a5a", oculto: id.startsWith("fantasma:") })),
  ];
  const sel = noGrafo ? nos.find((n) => n.id === noGrafo) : undefined;

  return (
    <div className="grid gap-3">
      <div>
        <h1 className="titulo pincelada text-2xl text-marinho">{somenteLeitura ? "Lore do jogador" : "Minha lore"}</h1>
        <p className="text-tinta-suave">
          {somenteLeitura
            ? "O caderno pessoal deste personagem. Só ele e você veem."
            : "Seu caderno: escreva o que descobriu e ligue as ideias com [[Título]]. Só você e o mestre veem."}
        </p>
      </div>

      {!somenteLeitura && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            criarEAbrir(novoTitulo);
            setNovoTitulo("");
          }}
        >
          <input
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            placeholder="Título da nova nota"
            aria-label="Título da nova nota"
            maxLength={120}
            className="campo min-w-0 flex-1"
          />
          <button className="botao-ouro shrink-0 px-4" disabled={!novoTitulo.trim()}>
            Criar
          </button>
        </form>
      )}

      {notas.length > 0 && (
        <>
          <div className="segmentos" style={{ gridTemplateColumns: "1fr 1fr" }} role="tablist" aria-label="Modo de ver">
            {(["lista", "grafo"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modo === m}
                onClick={() => setModo(m)}
                className="titulo"
                style={modo === m ? { background: "var(--color-marinho)", color: "var(--color-pergaminho-claro)" } : undefined}
              >
                {m === "lista" ? "Notas" : "Conexões"}
              </button>
            ))}
          </div>
        </>
      )}

      {notas.length === 0 ? (
        <p className="folha p-4 italic text-tinta-suave">
          {somenteLeitura ? "Este jogador ainda não escreveu nada." : "Nenhuma nota ainda. Comece por um nome, um lugar ou uma suspeita."}
        </p>
      ) : modo === "lista" ? (
        <>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nas notas" aria-label="Buscar nas notas" className="campo w-full py-1.5" />
          <ul className="folha divide-y divide-ouro-escuro/15 px-2 py-1">
            {filtradas.map((n) => {
              const saem = linksDe(n.texto).length;
              const chegam = notas.filter((o) => o.id !== n.id && linksDe(o.texto).includes(normalizar(n.titulo))).length;
              return (
                <li key={n.id}>
                  <button onClick={() => abrirAlvo(n.id)} className="flex w-full items-start gap-2 px-1 py-2 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[1.08rem] font-semibold text-marinho">
                        {n.fixada && <span className="mr-1 text-ouro-escuro" aria-label="Fixada">◆</span>}
                        {n.titulo}
                      </span>
                      <span className="line-clamp-1 text-sm text-tinta">{previa(n.texto) || <i className="text-tinta-suave">vazia</i>}</span>
                    </span>
                    {saem + chegam > 0 && (
                      <span className="numeros mt-1 shrink-0 text-sm text-tinta-suave" title={`${saem} links saem, ${chegam} chegam`}>
                        {saem + chegam} {saem + chegam === 1 ? "ligação" : "ligações"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtradas.length === 0 && <li className="px-1 py-3 italic text-tinta-suave">Nada encontrado.</li>}
          </ul>
        </>
      ) : (
        <>
          <div className="folha overflow-hidden">
            <Grafo nos={nos} arestas={arestas} selecionado={noGrafo} aoSelecionar={setNoGrafo} altura="min(58dvh, 520px)" />
          </div>
          {sel ? (
            <div className="folha flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-marinho">{sel.rotulo}</span>
                <span className="text-sm text-tinta-suave">
                  {sel.id.startsWith("codice:") ? "Entrada do Códice" : sel.id.startsWith("fantasma:") ? "Ainda não existe" : "Nota"}
                </span>
              </span>
              {sel.id.startsWith("fantasma:") ? (
                !somenteLeitura && (
                  <button onClick={() => criarEAbrir(sel.rotulo)} className="shrink-0 rounded-sm border border-ouro-escuro/50 px-3 py-1 text-marinho">
                    Criar nota
                  </button>
                )
              ) : (
                <button onClick={() => abrirAlvo(sel.id)} className="shrink-0 rounded-sm border border-ouro-escuro/50 px-3 py-1 text-marinho">
                  Abrir
                </button>
              )}
            </div>
          ) : (
            <p className="text-tinta-suave">
              Azul: suas notas. Dourado: entradas do Códice. Tracejado: links para notas que ainda não existem.
            </p>
          )}
        </>
      )}
      {modalCodice}
    </div>
  );
}

// ------------------------------------------------------------------ edição

function EditorNota({
  nota, notas, titulosCodice, caderno, aoFechar,
}: {
  nota: NotaPessoal;
  notas: NotaPessoal[];
  titulosCodice: string[];
  caderno: ReturnType<typeof useCaderno>;
  aoFechar: () => void;
}) {
  const [titulo, setTitulo] = useState(nota.titulo);
  const [texto, setTexto] = useState(nota.texto);
  const [tags, setTags] = useState(nota.tags.join(", "));
  const [estado, setEstado] = useState<"salvo" | "editando" | "salvando" | "erro">("salvo");
  const [sugestao, setSugestao] = useState<{ termo: string; inicio: number } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<string | null>(null);

  async function gravar(t: string) {
    setEstado("salvando");
    try {
      await caderno.salvar(nota.id, { texto: t });
      pendente.current = null;
      setEstado("salvo");
    } catch {
      setEstado("erro");
    }
  }

  function mudarTexto(t: string, cursor: number) {
    setTexto(t);
    setEstado("editando");
    pendente.current = t;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => gravar(t), 900);
    // [[ abre as sugestões de link
    const antes = t.slice(0, cursor);
    const m = antes.match(/\[\[([^\]\n|]*)$/);
    setSugestao(m ? { termo: m[1], inicio: cursor - m[1].length } : null);
  }

  // salva o que faltar ao sair do editor
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendente.current != null) caderno.salvar(nota.id, { texto: pendente.current }).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const opcoes = sugestao
    ? [...new Set([...notas.filter((n) => n.id !== nota.id).map((n) => n.titulo), ...titulosCodice])]
        .filter((t) => normalizar(t).includes(normalizar(sugestao.termo)))
        .slice(0, 6)
    : [];

  function escolher(t: string) {
    if (!sugestao || !area.current) return;
    const fim = area.current.selectionStart;
    const depois = texto.slice(fim).replace(/^[^\]\n]*\]\]/, "");
    const novo = `${texto.slice(0, sugestao.inicio)}${t}]]`;
    const completo = novo + depois;
    mudarTexto(completo, novo.length);
    setSugestao(null);
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(novo.length, novo.length);
    });
  }

  const aviso = { salvo: "Salvo", editando: "Digitando…", salvando: "Salvando…", erro: "Não salvou. Confira a conexão." }[estado];

  return (
    <div className="grid gap-3">
      <label className="grid gap-0.5 text-sm text-tinta-suave">
        Título
        <input
          className="campo titulo text-xl text-marinho"
          value={titulo}
          maxLength={120}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={async () => {
            if (!(await caderno.renomear(nota, titulo))) setTitulo(nota.titulo);
          }}
        />
      </label>
      <div className="grid gap-1">
        <div className="flex items-baseline justify-between text-sm text-tinta-suave">
          <span id="rot-nota">Texto (markdown). Digite [[ para ligar a outra nota.</span>
          <span className={estado === "erro" ? "text-pv" : ""} aria-live="polite">
            {aviso}
          </span>
        </div>
        <textarea
          ref={area}
          aria-labelledby="rot-nota"
          value={texto}
          onChange={(e) => mudarTexto(e.target.value, e.target.selectionStart)}
          onBlur={() => setTimeout(() => setSugestao(null), 150)}
          className="campo min-h-[45dvh] w-full text-lg leading-relaxed"
          placeholder={"O Limus sabe mais do que diz.\nVer [[Mercatu]] e [[Thiago Orleans]]."}
        />
        {sugestao && (opcoes.length > 0 || sugestao.termo.trim()) && (
          <ul className="folha-solida divide-y divide-ouro-escuro/15 p-1" role="listbox" aria-label="Ligar a">
            {opcoes.map((t) => (
              <li key={t}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(t)} className="w-full px-2 py-1.5 text-left text-marinho">
                  {t}
                </button>
              </li>
            ))}
            {sugestao.termo.trim() && !opcoes.some((t) => normalizar(t) === normalizar(sugestao.termo)) && (
              <li>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(sugestao.termo.trim())} className="w-full px-2 py-1.5 text-left italic text-tinta-suave">
                  Ligar a “{sugestao.termo.trim()}” (nota nova)
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      <label className="grid gap-0.5 text-sm text-tinta-suave">
        Marcadores, separados por vírgula
        <input
          className="campo"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onBlur={() => {
            const lista = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
            if (lista.join(",") !== nota.tags.join(",")) caderno.salvar(nota.id, { tags: lista }).catch(() => {});
          }}
          placeholder="suspeito, mercatu"
        />
      </label>
      <button
        onClick={async () => {
          if (timer.current) clearTimeout(timer.current);
          if (pendente.current != null) await gravar(pendente.current);
          aoFechar();
        }}
        className="botao-ouro justify-self-start px-5 py-1.5"
      >
        Pronto
      </button>
    </div>
  );
}

function previa(texto: string) {
  return texto.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b ?? a).replace(/[#*_>`-]/g, "").replace(/\s+/g, " ").trim();
}

function trecho(texto: string, titulo: string) {
  const i = normalizar(texto).indexOf(`[[${normalizar(titulo)}`);
  const ini = Math.max(0, i - 50);
  return (ini > 0 ? "…" : "") + previa(texto.slice(ini, i + titulo.length + 80));
}

function tituloDoLink(texto: string, alvoNormalizado: string) {
  for (const m of texto.matchAll(/\[\[([^\]|]+)/g)) if (normalizar(m[1].trim()) === alvoNormalizado) return m[1].trim();
  return alvoNormalizado;
}
