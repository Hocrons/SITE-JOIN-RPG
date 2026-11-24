"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizar } from "@/lib/lore";

interface Props {
  texto: string;
  /** Títulos conhecidos (normalizados) → id, para transformar [[Título]] em link. */
  alvos?: Map<string, string>;
  aoAbrir?: (id: string) => void;
  /** Link para algo que ainda não existe: se informado, vira um link que cria a nota. */
  aoCriar?: (titulo: string) => void;
  escuro?: boolean;
}

/**
 * Markdown com tabelas e listas (GFM) e links no estilo Obsidian: [[Título]] ou [[Título|texto]].
 * Um link para algo que o leitor não pode ver vira texto comum, sem denunciar que existe.
 */
export function Markdown({ texto, alvos, aoAbrir, aoCriar, escuro }: Props) {
  const comLinks = texto.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, alvo: string, apelido?: string) => {
    const id = alvos?.get(normalizar(alvo.trim()));
    const rotulo = (apelido ?? alvo).trim();
    if (id) return `[${rotulo}](#lore:${id})`;
    return aoCriar ? `[${rotulo}](#novo:${encodeURIComponent(alvo.trim())})` : rotulo;
  });
  return (
    <div className={`texto-lore ${escuro ? "texto-lore-escuro" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#lore:")) {
              const id = href.slice(6);
              return (
                <button type="button" className="link-lore" onClick={() => aoAbrir?.(id)}>
                  {children}
                </button>
              );
            }
            if (href?.startsWith("#novo:")) {
              const titulo = decodeURIComponent(href.slice(6));
              return (
                <button type="button" className="link-lore link-lore-novo" title={`Criar a nota “${titulo}”`} onClick={() => aoCriar?.(titulo)}>
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            );
          },
          img: () => null,
        }}
      >
        {comLinks}
      </ReactMarkdown>
    </div>
  );
}
