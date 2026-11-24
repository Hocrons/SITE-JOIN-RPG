"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brasao } from "@/components/Brasao";
import { Conexao } from "@/components/Conexao";
import type { StatusConexao } from "@/lib/aoVivo";
import { JanelaBackup } from "@/components/mestre/JanelaBackup";
import { JanelaPins } from "@/components/mestre/JanelaPins";
import { IconeGlossario, JanelaGlossario } from "@/components/Glossario";
import { useCombateAtivo } from "@/lib/combate";
import { useSessao } from "@/lib/sessao";

const SECOES = [
  { href: "/mestre", rotulo: "Escudo", icone: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" },
  { href: "/mestre/mesa", rotulo: "Mesa", icone: "M3 5h18v14H3zM9 5v14M15 5v14M3 12h18" },
  { href: "/mestre/combate", rotulo: "Combate", icone: "M5 19 19 5M14 5h5v5M5 5l5 5M14 14l5 5M19 14v5h-5" },
  { href: "/mestre/lore", rotulo: "Códice", icone: "M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h9" },
  { href: "/mestre/linha", rotulo: "Linha", icone: "M3 12h18M7 12V7M12 12v5M17 12V7" },
  { href: "/mestre/quadro", rotulo: "Quadro", icone: "M4 5h16v14H4zM8 9l4 3 4-2" },
];

interface Props {
  /** O que esta tela é, em poucas palavras (aparece sob o nome da mesa). */
  subtitulo: string;
  status?: StatusConexao;
  /** Conteúdo largo (quadro) usa a tela toda. */
  largo?: boolean;
  children: React.ReactNode;
}

/**
 * Moldura de todas as telas do mestre: cabeçalho com a mesa, as seções (em cima no computador,
 * embaixo no celular) e o menu da mesa (backup, PINs, sair).
 */
export function CascaMestre({ subtitulo, status, largo, children }: Props) {
  const router = useRouter();
  const rota = usePathname();
  const { carregando, membro, mesa, eMestre, sair } = useSessao();
  const { ativo: combate } = useCombateAtivo(mesa?.id);
  const [menu, setMenu] = useState(false);
  const [janela, setJanela] = useState<"" | "pins" | "backup" | "glossario">("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (carregando) return;
    if (!membro) router.replace("/");
    else if (!eMestre) router.replace("/ficha");
  }, [carregando, membro, eMestre, router]);

  useEffect(() => {
    if (!menu) return;
    const fora = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [menu]);

  if (!mesa || !eMestre) {
    return <main className="tema-mestre grid place-items-center italic text-nevoa/60">Abrindo a Área do Mestre…</main>;
  }

  const ativa = (href: string) => (href === "/mestre" ? rota === "/mestre" : rota?.startsWith(href));

  return (
    <main className="tema-mestre pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-ouro/15 bg-noite/90 backdrop-blur">
        <div className={`mx-auto flex items-center gap-3 px-4 py-2.5 ${largo ? "max-w-none" : "max-w-7xl"}`}>
          <Brasao tamanho={32} />
          <div className="mr-auto min-w-0">
            <p className="titulo truncate text-lg leading-tight text-ouro-claro">{mesa.nome}</p>
            <p className="truncate text-sm italic text-nevoa/55">{subtitulo}</p>
          </div>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Seções do mestre">
            {SECOES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                aria-current={ativa(s.href) ? "page" : undefined}
                className={`relative rounded-sm px-3 py-1.5 ${ativa(s.href) ? "bg-ouro/90 text-marinho" : "text-nevoa/80 hover:bg-ouro/10 hover:text-ouro-claro"}`}
              >
                {s.rotulo}
                {s.href === "/mestre/combate" && combate && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sangue-vivo" title="Combate em andamento" />
                )}
              </Link>
            ))}
          </nav>
          {status && (
            <span className="hidden sm:block">
              <Conexao status={status} escuro />
            </span>
          )}
          <button
            onClick={() => setJanela("glossario")}
            title="Glossário de condições"
            aria-label="Glossário de condições"
            className="flex items-center gap-1.5 rounded-sm border border-ouro/30 px-2.5 py-1.5 text-ouro-claro hover:bg-ouro/10"
          >
            <IconeGlossario />
            <span className="hidden xl:inline">Condições</span>
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu(!menu)}
              aria-expanded={menu}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 rounded-sm border border-ouro/30 px-2.5 py-1.5 text-ouro-claro hover:bg-ouro/10"
            >
              Opções
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" />
              </svg>
            </button>
            {menu && (
              <div role="menu" className="painel absolute right-0 top-full z-40 mt-1 grid w-60 p-1.5 shadow-2xl">
                <p className="datilo px-2.5 pb-1 pt-0.5 text-sm text-nevoa/50">Código da mesa: {mesa.codigo}</p>
                <button role="menuitem" onClick={() => { setJanela("pins"); setMenu(false); }} className="rounded-sm px-2.5 py-2 text-left hover:bg-ouro/10">
                  PINs de acesso
                </button>
                <button role="menuitem" onClick={() => { setJanela("backup"); setMenu(false); }} className="rounded-sm px-2.5 py-2 text-left hover:bg-ouro/10">
                  Backup da mesa
                </button>
                <button role="menuitem" onClick={sair} className="rounded-sm px-2.5 py-2 text-left text-nevoa/70 hover:bg-ouro/10">
                  Sair da mesa
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`mx-auto px-4 py-4 ${largo ? "max-w-none" : "max-w-7xl"}`}>{children}</div>

      {/* seções no celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-ouro/20 bg-noite/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Seções do mestre"
      >
        {SECOES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            aria-current={ativa(s.href) ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[0.72rem] ${ativa(s.href) ? "text-ouro-claro" : "text-nevoa/55"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
              <path d={s.icone} />
            </svg>
            <span className={ativa(s.href) ? "border-b-2 border-ouro" : ""}>{s.rotulo}</span>
            {s.href === "/mestre/combate" && combate && <span className="absolute right-[30%] top-1.5 h-2 w-2 rounded-full bg-sangue-vivo" />}
          </Link>
        ))}
      </nav>

      {janela === "backup" && <JanelaBackup mesaId={mesa.id} mesaNome={mesa.nome} onFechar={() => setJanela("")} />}
      {janela === "glossario" && <JanelaGlossario onFechar={() => setJanela("")} />}
      {janela === "pins" && <JanelaPins mesaId={mesa.id} onFechar={() => setJanela("")} />}
    </main>
  );
}
