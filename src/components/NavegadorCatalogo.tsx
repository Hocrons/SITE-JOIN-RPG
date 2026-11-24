"use client";

import { useMemo, useState } from "react";
import {
  FILTROS, TIPOS, detalhes, linhaCurta, normalizar, useCatalogo, type EntradaCatalogo, type Secao,
} from "@/lib/catalogo";
import { supabase } from "@/lib/supabase";

interface Props {
  mesaId: string;
  userId: string | null;
  /** Filtro inicial (ex.: "rituais" quando aberto pela seção de rituais). */
  filtroInicial?: string | null;
  onEscolher: (e: EntradaCatalogo, secao: Secao) => Promise<void> | void;
  onFechar: () => void;
}

const ELEMENTOS = ["Conhecimento", "Energia", "Morte", "Sangue", "Medo"];

export function NavegadorCatalogo({ mesaId, userId, filtroInicial, onEscolher, onFechar }: Props) {
  const { todos, carregando, erro } = useCatalogo(mesaId);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string | null>(filtroInicial ?? null);
  const [elemento, setElemento] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [adicionados, setAdicionados] = useState<Set<string>>(new Set());

  const mostraElemento = filtro === "rituais" || filtro === "paranormal" || filtro === "amald";

  const resultados = useMemo(() => {
    const tiposFiltro = filtro ? FILTROS.find((f) => f.id === filtro)?.tipos ?? [] : null;
    const termo = normalizar(busca.trim());
    return todos
      .filter((e) => !tiposFiltro || tiposFiltro.includes(e.tipo))
      .filter((e) => !elemento || String(e.dados.elemento ?? "").includes(elemento))
      .filter((e) => {
        if (!termo) return true;
        const alvo = normalizar(`${e.nome} ${e.resumo} ${linhaCurta(e)}`);
        return termo.split(/\s+/).every((t) => alvo.includes(t));
      })
      .slice(0, 120);
  }, [todos, busca, filtro, elemento]);

  async function escolher(e: EntradaCatalogo) {
    await onEscolher(e, TIPOS[e.tipo]?.secao ?? "inventario");
    setAdicionados((s) => new Set(s).add(e.id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 sm:items-center" role="dialog" aria-modal aria-label="Catálogo">
      <div className="folha folha-solida flex h-[92dvh] w-full max-w-xl flex-col text-tinta sm:h-[85dvh]">
        <header className="border-b border-ouro-escuro/25 px-4 pb-3 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="titulo text-xl text-marinho">Catálogo</h2>
            <button onClick={onFechar} className="px-2 text-2xl leading-none text-tinta-suave" aria-label="Fechar catálogo">
              ×
            </button>
          </div>
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar: katana, cura, sangue…"
            aria-label="Buscar no catálogo"
            className="campo mt-2 w-full"
          />
          <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
            <Chip ativo={!filtro} onClick={() => setFiltro(null)}>
              Tudo
            </Chip>
            {FILTROS.map((f) => (
              <Chip key={f.id} ativo={filtro === f.id} onClick={() => { setFiltro(f.id); setElemento(null); }}>
                {f.rotulo}
              </Chip>
            ))}
          </div>
          {mostraElemento && (
            <div className="-mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4">
              {ELEMENTOS.map((el) => (
                <Chip key={el} ativo={elemento === el} onClick={() => setElemento(elemento === el ? null : el)} pequeno>
                  {el}
                </Chip>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {carregando && <p className="py-6 text-center italic text-tinta-suave">Abrindo os arquivos da Ordem…</p>}
          {erro && <p className="py-4 text-pv">Não consegui carregar o catálogo: {erro}</p>}
          {!carregando && resultados.length === 0 && (
            <p className="py-6 text-center italic text-tinta-suave">Nada encontrado. Você pode criar um item novo abaixo.</p>
          )}
          <ul className="divide-y divide-ouro-escuro/15">
            {resultados.map((e) => {
              const exp = aberto === e.id;
              return (
                <li key={e.id} className="py-2">
                  <div className="flex items-start gap-2">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setAberto(exp ? null : e.id)} aria-expanded={exp}>
                      <span className="titulo text-marinho">{e.nome}</span>
                      {e.mesa_id && <span className="ml-1.5 text-xs italic text-ouro-escuro">da mesa</span>}
                      <span className="block truncate text-sm italic text-tinta-suave">
                        {TIPOS[e.tipo]?.rotulo ?? e.tipo}
                        {linhaCurta(e) ? `, ${linhaCurta(e)}` : ""}
                      </span>
                    </button>
                    <button
                      onClick={() => escolher(e)}
                      className={`shrink-0 rounded-sm px-3 py-1 text-sm ${adicionados.has(e.id) ? "text-emerald-700" : "border border-ouro-escuro/50 text-marinho hover:bg-ouro-claro/30"}`}
                    >
                      {adicionados.has(e.id) ? "Adicionado ✓" : "Adicionar"}
                    </button>
                  </div>
                  {exp && (
                    <div className="mt-1.5 rounded-sm bg-pergaminho/60 p-2.5 text-[0.95rem]">
                      {e.resumo && <p>{e.resumo}</p>}
                      {e.descricao && <p className="mt-1.5 whitespace-pre-wrap">{e.descricao}</p>}
                      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                        {detalhes(e).map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="text-tinta-suave">{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      {e.fonte && <p className="mt-1.5 text-xs italic text-tinta-suave">{e.fonte}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {resultados.length === 120 && <p className="py-2 text-center text-sm italic text-tinta-suave">Mostrando os 120 primeiros. Refine a busca.</p>}
        </div>

        <footer className="border-t border-ouro-escuro/25 px-4 py-3">
          {criando ? (
            <NovoItem
              mesaId={mesaId}
              userId={userId}
              onCriado={async (e) => {
                setCriando(false);
                await escolher(e);
              }}
              onCancelar={() => setCriando(false)}
            />
          ) : (
            <button onClick={() => setCriando(true)} className="w-full rounded-sm border border-dashed border-ouro-escuro/60 py-2 text-marinho">
              + Criar item ou habilidade da mesa
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Chip({ ativo, onClick, children, pequeno }: { ativo: boolean; onClick: () => void; children: React.ReactNode; pequeno?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`shrink-0 rounded-full border px-3 ${pequeno ? "py-0.5 text-sm" : "py-1"} ${
        ativo ? "selo-imperial" : "border-ouro-escuro/40 text-marinho"
      }`}
    >
      {children}
    </button>
  );
}

const TIPOS_CRIAVEIS = ["item", "arma", "protecao", "item_amaldicoado", "ritual", "poder_paranormal", "poder_classe"];

function NovoItem({
  mesaId, userId, onCriado, onCancelar,
}: { mesaId: string; userId: string | null; onCriado: (e: EntradaCatalogo) => void; onCancelar: () => void }) {
  const [tipo, setTipo] = useState("item");
  const [nome, setNome] = useState("");
  const [resumo, setResumo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [espacos, setEspacos] = useState("");
  const [extra, setExtra] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!nome.trim()) return setErro("Dê um nome.");
    const dados: Record<string, unknown> = {};
    if (categoria) dados.categoria = categoria;
    if (espacos) dados.espacos = Number(espacos);
    if (extra) {
      if (tipo === "arma") dados.dano = extra;
      else if (tipo === "ritual" || tipo === "poder_paranormal" || tipo === "item_amaldicoado") dados.elemento = extra;
    }
    const { data, error } = await supabase()
      .from("catalogo")
      .insert({ mesa_id: mesaId, tipo, nome: nome.trim(), resumo: resumo.trim(), dados, criado_por: userId, fonte: "Criado pela mesa" })
      .select()
      .single();
    if (error) return setErro(error.message);
    onCriado(data as EntradaCatalogo);
  }

  const rotuloExtra = tipo === "arma" ? "Dano (ex.: 1d8)" : ["ritual", "poder_paranormal", "item_amaldicoado"].includes(tipo) ? "Elemento" : null;

  return (
    <form onSubmit={salvar} className="grid gap-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="campo w-full min-w-0" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome" />
        <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          {TIPOS_CRIAVEIS.map((t) => (
            <option key={t} value={t}>
              {TIPOS[t].rotulo}
            </option>
          ))}
        </select>
      </div>
      <textarea className="campo min-h-16 w-full" placeholder="O que faz" value={resumo} onChange={(e) => setResumo(e.target.value)} aria-label="O que faz" />
      <div className="grid grid-cols-3 gap-2">
        <input className="campo w-full min-w-0" placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria" />
        <input className="campo w-full min-w-0" placeholder="Espaços" inputMode="numeric" value={espacos} onChange={(e) => setEspacos(e.target.value)} aria-label="Espaços" />
        {rotuloExtra && (
          <input className="campo w-full min-w-0" placeholder={rotuloExtra} value={extra} onChange={(e) => setExtra(e.target.value)} aria-label={rotuloExtra} />
        )}
      </div>
      {erro && <p className="text-sm text-pv">{erro}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancelar} className="px-3 text-tinta-suave underline">
          Cancelar
        </button>
        <button className="botao-ouro px-4 py-1.5">Criar e adicionar</button>
      </div>
    </form>
  );
}
