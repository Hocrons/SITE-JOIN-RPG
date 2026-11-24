"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Cena, DadosCenas } from "@/lib/cenas";

const CAMPO = "min-w-0 rounded-sm border border-ouro/25 bg-noite px-2.5 py-1.5 text-nevoa placeholder:text-nevoa/40";

export function regioesDe(cenas: Cena[]) {
  return [...new Set(cenas.map((c) => c.regiao ?? "").filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Escolher a cena: grupos por região que abrem e fecham, ordem dentro da região,
 * duplicar e criar. Fica num painel que abre por cima do tabuleiro.
 */
export function SeletorCenas({
  dados, aberta, onAbrir,
}: {
  dados: DadosCenas;
  aberta: Cena | undefined;
  onAbrir: (c: Cena) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const [nome, setNome] = useState("");
  const [regiao, setRegiao] = useState("");
  const [ocupado, setOcupado] = useState("");
  const idRegioes = useId();

  const grupos = useMemo(() => {
    const m = new Map<string, Cena[]>();
    for (const c of dados.cenas) m.set(c.regiao ?? "", [...(m.get(c.regiao ?? "") ?? []), c]);
    // "sem região" por último
    return [...m.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "pt-BR")));
  }, [dados.cenas]);
  const regioes = regioesDe(dados.cenas);

  // ao abrir uma cena, a região dela já vem preenchida para a próxima
  useEffect(() => {
    if (aberta) setRegiao(aberta.regiao ?? "");
  }, [aberta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("pointerdown", fora);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", fora);
      window.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative">
      <button
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="flex max-w-full items-center gap-2 rounded-sm border border-ouro/35 bg-noite/80 px-3 py-1.5 text-left hover:bg-ouro/10"
      >
        {aberta?.ativa && <span className="h-2 w-2 shrink-0 rounded-full bg-pd-vivo" title="Na mesa dos jogadores" />}
        <span className="min-w-0 truncate">
          {aberta?.regiao && <span className="text-nevoa/55">{aberta.regiao} · </span>}
          <span className="titulo text-ouro-claro">{aberta?.nome ?? "Escolher cena"}</span>
        </span>
        <span className="text-sm text-nevoa/50">{dados.cenas.length} cena{dados.cenas.length === 1 ? "" : "s"}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className={`shrink-0 text-ouro-claro transition-transform ${aberto ? "rotate-180" : ""}`}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {aberto && (
        <div className="painel absolute left-0 top-full z-30 mt-1 grid max-h-[75dvh] w-[min(380px,calc(100vw-2rem))] grid-rows-[1fr_auto] shadow-2xl" role="dialog" aria-label="Cenas">
          <div className="min-h-0 overflow-y-auto p-2">
            {grupos.length === 0 && <p className="p-2 italic text-nevoa/55">Nenhuma cena ainda. Crie a primeira aqui embaixo.</p>}
            {grupos.map(([r, lista]) => (
              <Grupo
                key={r || "-"}
                regiao={r}
                lista={lista}
                aberta={aberta}
                dados={dados}
                temAtiva={lista.some((c) => c.ativa)}
                comecaAberto={!aberta || (aberta.regiao ?? "") === r || grupos.length <= 3}
                onAbrir={(c) => {
                  onAbrir(c);
                  setAberto(false);
                }}
                onDuplicar={async (c) => {
                  const nova = await dados.duplicar(c, setOcupado);
                  if (nova) onAbrir(nova);
                }}
              />
            ))}
          </div>

          <form
            className="grid gap-1.5 border-t border-ouro/20 p-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!nome.trim()) return;
              const c = await dados.criar(nome, regiao);
              setNome("");
              if (c) {
                onAbrir(c);
                setAberto(false);
              }
            }}
          >
            {ocupado && <p className="text-sm text-ouro-claro" aria-live="polite">{ocupado}</p>}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nova cena" aria-label="Nome da nova cena" maxLength={80} className={CAMPO} />
              <input
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
                list={idRegioes}
                placeholder="Região"
                aria-label="Região da nova cena"
                maxLength={60}
                className={CAMPO}
              />
              <datalist id={idRegioes}>
                {regioes.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <button className="rounded-sm border border-ouro/35 px-3 text-ouro-claro hover:bg-ouro/10 disabled:opacity-50" disabled={!nome.trim()}>
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Grupo({
  regiao, lista, aberta, dados, temAtiva, comecaAberto, onAbrir, onDuplicar,
}: {
  regiao: string;
  lista: Cena[];
  aberta: Cena | undefined;
  dados: DadosCenas;
  temAtiva: boolean;
  comecaAberto: boolean;
  onAbrir: (c: Cena) => void;
  onDuplicar: (c: Cena) => void;
}) {
  const [aberto, setAberto] = useState(comecaAberto);
  const [renomeando, setRenomeando] = useState(false);
  const [nome, setNome] = useState(regiao);

  return (
    <section className="mb-1">
      <div className="flex items-center gap-1">
        <button onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1.5 py-1 text-left hover:bg-ouro/5">
          <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden className={`shrink-0 text-ouro-claro transition-transform ${aberto ? "rotate-90" : ""}`}>
            <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {renomeando ? null : (
            <span className={`titulo truncate ${regiao ? "text-ouro-claro" : "italic text-nevoa/60"}`}>{regiao || "Sem região"}</span>
          )}
          {!renomeando && <span className="numeros text-sm text-nevoa/45">{lista.length}</span>}
          {!aberto && temAtiva && <span className="h-2 w-2 rounded-full bg-pd-vivo" title="A cena dos jogadores está aqui" />}
        </button>
        {renomeando ? (
          <form
            className="flex flex-1 gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              dados.renomearRegiao(regiao, nome);
              setRenomeando(false);
            }}
          >
            <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus maxLength={60} aria-label="Novo nome da região" className={`${CAMPO} flex-1 py-1`} />
            <button className="px-2 text-sm text-ouro-claro">OK</button>
          </form>
        ) : (
          regiao && (
            <button onClick={() => setRenomeando(true)} className="px-1.5 text-sm text-nevoa/45 hover:text-ouro-claro" aria-label={`Renomear a região ${regiao}`} title="Renomear região">
              ✎
            </button>
          )
        )}
      </div>

      {aberto && (
        <ul className="ml-4 border-l border-ouro/15 pl-1">
          {lista.map((c, i) => (
            <li key={c.id} className={`group flex items-center gap-1 rounded-sm ${c.id === aberta?.id ? "bg-ouro/15" : "hover:bg-ouro/5"}`}>
              <button onClick={() => onAbrir(c)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left">
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.ativa ? "bg-pd-vivo" : "bg-transparent"}`} title={c.ativa ? "Na mesa dos jogadores" : undefined} />
                <span className="truncate text-nevoa">{c.nome}</span>
                {!c.mapa_caminho && <span className="shrink-0 text-xs italic text-nevoa/40">sem mapa</span>}
              </button>
              <BotaoLinha rotulo={`Subir ${c.nome}`} onClick={() => dados.mover(c, -1)} desligado={i === 0}>
                ↑
              </BotaoLinha>
              <BotaoLinha rotulo={`Descer ${c.nome}`} onClick={() => dados.mover(c, 1)} desligado={i === lista.length - 1}>
                ↓
              </BotaoLinha>
              <BotaoLinha rotulo={`Duplicar ${c.nome}`} onClick={() => onDuplicar(c)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="8" y="8" width="12" height="12" rx="1.5" />
                  <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
                </svg>
              </BotaoLinha>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BotaoLinha({ rotulo, onClick, desligado, children }: { rotulo: string; onClick: () => void; desligado?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={desligado}
      aria-label={rotulo}
      title={rotulo}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-nevoa/55 hover:bg-ouro/10 hover:text-ouro-claro disabled:opacity-25"
    >
      {children}
    </button>
  );
}
