"use client";

import { useMemo, useRef, useState } from "react";
import { ControleVisibilidade, type Jogador } from "@/components/codice/EdicaoMestre";
import { LeituraEntrada } from "@/components/codice/LeituraEntrada";
import { SeloVisibilidade } from "@/components/codice/ListaCodice";
import { Markdown } from "@/components/codice/Markdown";
import { useLinhaTempo, type DadosLinha, type Evento } from "@/lib/linhaTempo";
import { limparParaJogador, normalizar, TIPO, useLore } from "@/lib/lore";
import { useUrlArquivo } from "@/lib/quadro";

interface Props {
  mesaId: string;
  eMestre: boolean;
  escuro?: boolean;
  jogadores?: Jogador[];
}

/** A história em ordem: eras, eventos, datas, sessões e as entradas do Códice ligadas a cada um. */
export function LinhaDoTempo({ mesaId, eMestre, escuro, jogadores = [] }: Props) {
  const linha = useLinhaTempo(mesaId, eMestre);
  const lore = useLore(mesaId, eMestre);
  const [busca, setBusca] = useState("");
  const [era, setEra] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [entradaAberta, setEntradaAberta] = useState<string | null>(null);

  const t = escuro
    ? { titulo: "text-ouro-claro", texto: "text-nevoa/90", sutil: "text-nevoa/55", campo: "w-full rounded-sm border border-ouro/25 bg-noite px-2.5 py-1.5 text-nevoa placeholder:text-nevoa/40", cartao: "painel", espinha: "bg-ouro/35", chip: "border-ouro/30 text-ouro-claro" }
    : { titulo: "text-marinho", texto: "text-tinta", sutil: "text-tinta-suave", campo: "campo w-full py-1.5", cartao: "folha", espinha: "bg-ouro-escuro/45", chip: "border-ouro-escuro/40 text-marinho" };

  const eras = useMemo(() => [...new Set(linha.eventos.map((e) => e.era).filter(Boolean))], [linha.eventos]);
  const termo = normalizar(busca.trim());
  const visiveis = linha.eventos.filter(
    (e) => (!era || e.era === era) && (!termo || normalizar(`${e.titulo} ${e.descricao} ${e.data_rotulo} ${e.sessao}`).includes(termo)),
  );
  // agrupa eventos seguidos da mesma era
  const grupos: { era: string; eventos: Evento[] }[] = [];
  for (const e of visiveis) {
    const ult = grupos[grupos.length - 1];
    if (ult && ult.era === e.era) ult.eventos.push(e);
    else grupos.push({ era: e.era, eventos: [e] });
  }
  const entradaPorId = new Map(lore.entradas.map((e) => [e.id, e]));
  const alvos = useMemo(() => new Map(lore.entradas.map((e) => [normalizar(e.titulo), e.id])), [lore.entradas]);
  const entrada = entradaAberta ? entradaPorId.get(entradaAberta) : undefined;

  async function novo() {
    const ev = await linha.criar({ era: era || eras[eras.length - 1] || "" });
    if (ev) setEditando(ev.id);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex gap-2">
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar na linha do tempo" aria-label="Buscar na linha do tempo" className={t.campo} />
          {eMestre && (
            <button onClick={novo} className="botao-ouro shrink-0 px-4">
              Novo evento
            </button>
          )}
        </div>
        {eras.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Eras">
            {["", ...eras].map((e) => (
              <button
                key={e || "todas"}
                aria-pressed={era === e}
                onClick={() => setEra(e)}
                className={`rounded-sm border px-2.5 py-0.5 text-sm ${
                  era === e ? (escuro ? "border-ouro bg-ouro/90 text-marinho" : "border-marinho bg-marinho text-pergaminho-claro") : t.chip
                }`}
              >
                {e || "Todas as eras"}
              </button>
            ))}
          </div>
        )}
      </div>

      {linha.eventos.length === 0 ? (
        <p className={`${t.cartao} p-4 italic ${t.sutil}`}>
          {eMestre ? "Nenhum evento ainda. Comece pelo que aconteceu primeiro." : "Nada foi revelado na linha do tempo ainda."}
        </p>
      ) : visiveis.length === 0 ? (
        <p className={`italic ${t.sutil}`}>Nenhum evento com esse filtro.</p>
      ) : (
        grupos.map((g, gi) => (
          <section key={`${g.era}-${gi}`} aria-label={g.era || "Sem era"}>
            {g.era && (
              <h2 className={`titulo mb-2 flex items-center gap-3 text-xl ${t.titulo}`}>
                {g.era}
                <span className={`h-px flex-1 ${t.espinha}`} aria-hidden />
              </h2>
            )}
            <ol className="relative grid gap-3 pl-6">
              <span className={`absolute bottom-2 left-[7px] top-2 w-0.5 ${t.espinha}`} aria-hidden />
              {g.eventos.map((ev) => {
                const indice = linha.eventos.findIndex((x) => x.id === ev.id);
                const ligadas = linha.vinculos.filter((v) => v.evento_id === ev.id).map((v) => entradaPorId.get(v.entrada_id)).filter(Boolean);
                const oculto = ev.visibilidade === "mestre";
                return (
                  <li key={ev.id} className="relative">
                    <span
                      className={`absolute -left-6 top-4 h-3.5 w-3.5 rotate-45 border-2 ${oculto ? (escuro ? "border-dashed border-ouro/60 bg-noite" : "border-dashed border-ouro-escuro bg-pergaminho-claro") : escuro ? "border-ouro bg-ouro" : "border-ouro-escuro bg-ouro"}`}
                      aria-hidden
                    />
                    {editando === ev.id && eMestre ? (
                      <EditorEvento
                        ev={ev}
                        linha={linha}
                        eras={eras}
                        entradas={lore.entradas}
                        jogadores={jogadores}
                        escuro={escuro}
                        aoFechar={() => setEditando(null)}
                      />
                    ) : (
                      <article className={`${t.cartao} p-3.5 ${oculto && eMestre ? "opacity-80" : ""}`}>
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm italic ${t.sutil}`}>
                              {ev.data_rotulo || "Sem data"}
                              {ev.aproximada ? " (data aproximada)" : ""}
                              {ev.sessao ? <span className="not-italic">{`, sessão ${ev.sessao}`}</span> : null}
                            </p>
                            <h3 className={`titulo text-lg leading-snug ${t.titulo}`}>{ev.titulo}</h3>
                          </div>
                          {eMestre && (
                            <span className="flex shrink-0 items-center gap-1">
                              <SeloVisibilidade vis={ev.visibilidade} />
                              <button onClick={() => linha.mover(ev.id, -1)} disabled={indice === 0} className={`px-1.5 disabled:opacity-30 ${t.sutil}`} aria-label="Mais cedo" title="Mais cedo">
                                ↑
                              </button>
                              <button onClick={() => linha.mover(ev.id, 1)} disabled={indice === linha.eventos.length - 1} className={`px-1.5 disabled:opacity-30 ${t.sutil}`} aria-label="Mais tarde" title="Mais tarde">
                                ↓
                              </button>
                              <button onClick={() => setEditando(ev.id)} className={`rounded-sm border px-2 py-0.5 text-sm ${t.chip}`}>
                                Editar
                              </button>
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 grid gap-3 sm:grid-cols-[1fr_auto]">
                          {ev.descricao && (
                            <div className={t.texto}>
                              <Markdown texto={eMestre ? ev.descricao : limparParaJogador(ev.descricao)} alvos={alvos} aoAbrir={setEntradaAberta} escuro={escuro} />
                            </div>
                          )}
                          {ev.imagem_caminho && <ImagemEvento caminho={ev.imagem_caminho} titulo={ev.titulo} />}
                        </div>
                        {ligadas.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="No Códice">
                            {ligadas.map((en) => (
                              <li key={en!.id}>
                                <button onClick={() => setEntradaAberta(en!.id)} className={`flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-sm ${t.chip}`}>
                                  <span className="losango" style={{ background: TIPO[en!.tipo].cor }} aria-hidden />
                                  {en!.titulo}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      {entrada && (
        <div role="dialog" aria-modal="true" aria-label={entrada.titulo} className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={() => setEntradaAberta(null)}>
          <div className={`${escuro ? "painel" : "folha-solida"} max-h-[85dvh] w-full max-w-xl overflow-auto p-4`} onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex justify-end">
              <button onClick={() => setEntradaAberta(null)} className={`px-2 text-2xl leading-none ${t.sutil}`} aria-label="Fechar">
                ×
              </button>
            </div>
            <LeituraEntrada
              entrada={entrada}
              entradas={lore.entradas}
              conexoes={lore.conexoes}
              imagens={lore.imagens}
              eMestre={eMestre}
              escuro={escuro}
              aoAbrir={setEntradaAberta}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ImagemEvento({ caminho, titulo }: { caminho: string; titulo: string }) {
  const url = useUrlArquivo(caminho);
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button onClick={() => setAberta(true)} className="block h-28 w-40 overflow-hidden border border-ouro-escuro/30 bg-pergaminho-escuro/30 shadow-sm" aria-label={`Ampliar imagem de ${titulo}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </button>
      {aberta && url && (
        <div role="dialog" aria-label={titulo} className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" onClick={() => setAberta(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={titulo} className="max-h-[88dvh] max-w-full object-contain" />
        </div>
      )}
    </>
  );
}

function EditorEvento({
  ev, linha, eras, entradas, jogadores, escuro, aoFechar,
}: {
  ev: Evento;
  linha: DadosLinha;
  eras: string[];
  entradas: { id: string; titulo: string }[];
  jogadores: Jogador[];
  escuro?: boolean;
  aoFechar: () => void;
}) {
  const [f, setF] = useState({
    titulo: ev.titulo,
    data_rotulo: ev.data_rotulo,
    era: ev.era,
    aproximada: ev.aproximada,
    sessao: ev.sessao,
    descricao: ev.descricao,
  });
  const [salvando, setSalvando] = useState(false);
  const [ligar, setLigar] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);
  const campo = escuro
    ? "w-full rounded-sm border border-ouro/25 bg-noite px-2.5 py-1.5 text-nevoa placeholder:text-nevoa/40"
    : "campo w-full py-1.5";
  const rot = `grid gap-0.5 text-sm ${escuro ? "text-nevoa/70" : "text-tinta-suave"}`;
  const ligadas = linha.vinculos.filter((v) => v.evento_id === ev.id).map((v) => v.entrada_id);
  const porId = new Map(entradas.map((e) => [e.id, e]));

  return (
    <form
      className={`${escuro ? "painel" : "folha"} grid gap-3 p-3.5`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.titulo.trim()) return;
        setSalvando(true);
        const ok = await linha.salvar(ev.id, { ...f, titulo: f.titulo.trim() });
        setSalvando(false);
        if (ok) aoFechar();
      }}
    >
      <label className={rot}>
        Título
        <input className={`${campo} titulo text-lg`} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={rot}>
          Data (como quiser)
          <input className={campo} value={f.data_rotulo} onChange={(e) => setF({ ...f, data_rotulo: e.target.value })} placeholder="Jan/2025, Ano 312…" />
        </label>
        <label className={rot}>
          Era
          <input className={campo} list={`eras-${ev.id}`} value={f.era} onChange={(e) => setF({ ...f, era: e.target.value })} placeholder="Temporada 1" />
          <datalist id={`eras-${ev.id}`}>
            {eras.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </label>
        <label className={rot}>
          Sessão
          <input className={campo} value={f.sessao} onChange={(e) => setF({ ...f, sessao: e.target.value })} placeholder="12" />
        </label>
      </div>
      <label className={`flex items-center gap-2 text-sm ${escuro ? "text-nevoa/80" : "text-tinta"}`}>
        <input type="checkbox" className="h-4 w-4 accent-[#b8912f]" checked={f.aproximada} onChange={(e) => setF({ ...f, aproximada: e.target.checked })} />
        Data aproximada
      </label>
      <label className={rot}>
        Descrição (markdown; [[Título]] liga ao Códice)
        <textarea className={`${campo} min-h-28`} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
      </label>

      <div className="grid gap-1.5">
        <span className={rot}>Imagem</span>
        <div className="flex flex-wrap items-center gap-2">
          {ev.imagem_caminho && <ImagemEvento caminho={ev.imagem_caminho} titulo={ev.titulo} />}
          <button type="button" onClick={() => arquivo.current?.click()} className={`rounded-sm border px-2.5 py-1 text-sm ${escuro ? "border-ouro/30 text-ouro-claro" : "border-ouro-escuro/40 text-marinho"}`}>
            {ev.imagem_caminho ? "Trocar imagem" : "Pôr imagem"}
          </button>
          {ev.imagem_caminho && (
            <button type="button" onClick={() => linha.tirarImagem(ev)} className="text-sm text-pv-vivo underline underline-offset-2">
              Tirar
            </button>
          )}
          <input
            ref={arquivo}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const a = e.target.files?.[0];
              e.target.value = "";
              if (a) linha.enviarImagem(ev, a);
            }}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <span className={rot}>Ligado ao Códice</span>
        <div className="flex flex-wrap gap-1.5">
          {ligadas.map((id) => (
            <span key={id} className={`flex items-center gap-1 rounded-sm border px-2 py-0.5 text-sm ${escuro ? "border-ouro/30 text-ouro-claro" : "border-ouro-escuro/40 text-marinho"}`}>
              {porId.get(id)?.titulo ?? "?"}
              <button type="button" onClick={() => linha.desvincular(ev.id, id)} aria-label="Desligar" className="px-0.5 opacity-70 hover:opacity-100">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <select className={campo} value={ligar} onChange={(e) => setLigar(e.target.value)} aria-label="Ligar a uma entrada do Códice">
            <option value="">Ligar a uma entrada…</option>
            {entradas
              .filter((e) => !ligadas.includes(e.id))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titulo}
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!ligar}
            onClick={() => {
              linha.vincular(ev.id, ligar);
              setLigar("");
            }}
            className={`shrink-0 rounded-sm border px-3 text-sm disabled:opacity-40 ${escuro ? "border-ouro/30 text-ouro-claro" : "border-ouro-escuro/40 text-marinho"}`}
          >
            Ligar
          </button>
        </div>
        <p className={`text-sm ${escuro ? "text-nevoa/50" : "text-tinta-suave"}`}>O jogador só vê a ligação se também puder ver a entrada do Códice.</p>
      </div>

      <div className="grid gap-1.5">
        <span className={rot}>Quem vê (muda na hora)</span>
        <ControleVisibilidade
          vis={ev.visibilidade}
          quem={linha.quemVe.get(ev.id) ?? []}
          jogadores={jogadores}
          aoMudar={(v, ids) => linha.definirVisibilidade(ev.id, v, ids)}
        />
      </div>

      <div className="flex items-center gap-2">
        <button className="botao-ouro px-5 py-1.5" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar evento"}
        </button>
        <button type="button" onClick={aoFechar} className={`px-2 underline underline-offset-2 ${escuro ? "text-nevoa/70" : "text-tinta-suave"}`}>
          Fechar
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirm(`Apagar o evento “${ev.titulo}”?`)) return;
            await linha.excluir(ev);
            aoFechar();
          }}
          className="ml-auto px-2 text-sm text-pv-vivo underline underline-offset-2"
        >
          Apagar
        </button>
      </div>
    </form>
  );
}
