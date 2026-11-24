"use client";

import { useEffect, useMemo, useState } from "react";
import {
  limparParaJogador, normalizar, STATUS_LORE, TIPO,
  type ConexaoLore, type EntradaLore, type ImagemLore,
} from "@/lib/lore";
import { supabase } from "@/lib/supabase";
import { Markdown } from "./Markdown";

interface Props {
  entrada: EntradaLore;
  entradas: EntradaLore[];
  conexoes: ConexaoLore[];
  imagens: ImagemLore[];
  eMestre: boolean;
  escuro?: boolean;
  aoAbrir: (id: string) => void;
  /** Controles extras do mestre (visibilidade, editar…), mostrados abaixo do título. */
  acoes?: React.ReactNode;
  /** Ações por conexão (mestre). */
  acoesConexao?: (c: ConexaoLore) => React.ReactNode;
}

export function LeituraEntrada({ entrada, entradas, conexoes, imagens, eMestre, escuro, aoAbrir, acoes, acoesConexao }: Props) {
  const tipo = TIPO[entrada.tipo];
  const status = STATUS_LORE.find((s) => s.id === entrada.status)!;
  const alvos = useMemo(() => new Map(entradas.map((e) => [normalizar(e.titulo), e.id])), [entradas]);
  const porId = useMemo(() => new Map(entradas.map((e) => [e.id, e])), [entradas]);
  const minhas = conexoes.filter((c) => c.origem_id === entrada.id || c.destino_id === entrada.id);
  const fotos = imagens.filter((i) => i.entrada_id === entrada.id);
  const limpar = (t: string) => (eMestre ? t : limparParaJogador(t));
  const suave = escuro ? "text-nevoa/65" : "text-tinta-suave";
  const forte = escuro ? "text-ouro-claro" : "text-marinho";

  return (
    <article className="surgir">
      <p className={`flex items-center gap-2 text-sm ${suave}`}>
        <span className="losango" style={{ background: tipo.cor }} aria-hidden />
        {tipo.nome}
        {eMestre && entrada.visibilidade === "mestre" && <span className="carimbo ml-1">só o mestre</span>}
        {eMestre && (
          <span className="ml-1 rounded-sm border border-current/30 px-1.5 text-xs" title="Status no planejamento">
            {status.nome}
          </span>
        )}
      </p>
      <h2 className={`titulo mt-1 text-2xl leading-tight ${forte}`}>{entrada.titulo}</h2>
      {entrada.resumo && <p className={`mt-1 text-lg italic leading-snug ${escuro ? "text-nevoa/85" : "text-tinta"}`}>{limpar(entrada.resumo)}</p>}
      {entrada.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Marcadores">
          {entrada.tags.map((t) => (
            <li key={t} className={`rounded-sm px-1.5 text-sm ${escuro ? "bg-noite-3 text-nevoa/80" : "bg-pergaminho-escuro/45 text-tinta-suave"}`}>
              {t}
            </li>
          ))}
        </ul>
      )}
      {acoes && <div className="mt-3">{acoes}</div>}

      {fotos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {fotos.map((f) => (
            <FotoLore key={f.id} imagem={f} escuro={escuro} />
          ))}
        </div>
      )}

      {entrada.texto && (
        <div className="mt-4">
          <Markdown texto={limpar(entrada.texto)} alvos={alvos} aoAbrir={aoAbrir} escuro={escuro} />
        </div>
      )}

      {minhas.length > 0 && (
        <section className="mt-6" aria-label="Conexões">
          <h3 className={`titulo mb-1.5 text-base ${suave}`}>Conexões</h3>
          <ul className={`divide-y ${escuro ? "divide-ouro/10" : "divide-ouro-escuro/15"}`}>
            {minhas.map((c) => {
              const origem = porId.get(c.origem_id);
              const destino = porId.get(c.destino_id);
              if (!origem || !destino) return null;
              const nome = (e: EntradaLore) =>
                e.id === entrada.id ? (
                  <span className={forte}>{e.titulo}</span>
                ) : (
                  <button onClick={() => aoAbrir(e.id)} className={`underline decoration-ouro/60 underline-offset-[3px] ${forte}`}>
                    {e.titulo}
                  </button>
                );
              return (
                <li key={c.id} className="flex flex-wrap items-baseline gap-x-1.5 py-1.5">
                  {nome(origem)}
                  <i className={suave}>{c.rotulo}</i>
                  {nome(destino)}
                  {acoesConexao && <span className="ml-auto">{acoesConexao(c)}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}

export function FotoLore({ imagem, escuro, children }: { imagem: ImagemLore; escuro?: boolean; children?: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    let vivo = true;
    supabase()
      .storage.from("midia")
      .createSignedUrl(imagem.caminho, 60 * 60)
      .then(({ data }) => vivo && setUrl(data?.signedUrl ?? null));
    return () => {
      vivo = false;
    };
  }, [imagem.caminho]);
  return (
    <figure className="min-w-0">
      <button
        onClick={() => setAberta(true)}
        className={`block aspect-[4/3] w-full overflow-hidden rounded-sm border ${escuro ? "border-ouro/25 bg-noite-3" : "border-ouro-escuro/30 bg-pergaminho-escuro/40"}`}
        aria-label={`Ampliar ${imagem.legenda || "imagem"}`}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={imagem.legenda} className="h-full w-full object-cover" />
        )}
      </button>
      {imagem.legenda && !children && <figcaption className="mt-0.5 text-sm italic opacity-80">{imagem.legenda}</figcaption>}
      {children}
      {aberta && url && (
        <div
          role="dialog"
          aria-label={imagem.legenda || "Imagem"}
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4"
          onClick={() => setAberta(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={imagem.legenda} className="max-h-[85dvh] max-w-full object-contain" />
          {imagem.legenda && <p className="mt-2 text-center italic text-nevoa">{imagem.legenda}</p>}
        </div>
      )}
    </figure>
  );
}
