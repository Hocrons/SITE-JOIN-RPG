"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/codice/Markdown";
import {
  COR, CORES_NOTA, useQuadro, useUrlArquivo,
  type ArquivoMesa, type Cartao, type DadosQuadro, type Ligacao,
} from "@/lib/quadro";

interface Props {
  mesaId: string;
  eMestre: boolean;
  /** Altura do quadro (CSS). */
  altura?: string;
}

type Selecao = { tipo: "cartao" | "ligacao"; id: string } | null;
type Gesto =
  | { tipo: "pan"; x0: number; y0: number; vx: number; vy: number; moveu: boolean }
  | { tipo: "cartao"; id: string; dx: number; dy: number; x0: number; y0: number; moveu: boolean }
  | { tipo: "pinca"; d0: number; k0: number; mx: number; my: number }
  | null;

const LIMITE = (k: number) => Math.min(2.5, Math.max(0.2, k));

/**
 * Quadro de investigação: cartões (arquivos do mestre e notas de qualquer um) presos com alfinete
 * e ligados por fios. Todos mexem ao mesmo tempo.
 */
export function Quadro({ mesaId, eMestre, altura = "70dvh" }: Props) {
  const q = useQuadro(mesaId);
  const vp = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState({ x: 40, y: 40, k: 0.8 });
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  const [sel, setSel] = useState<Selecao>(null);
  const [ligandoDe, setLigandoDe] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, { x: number; y: number }>>({});
  const [gaveta, setGaveta] = useState(false);
  const [vendo, setVendo] = useState<ArquivoMesa | null>(null);
  const [editandoNota, setEditandoNota] = useState<Cartao | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const gesto = useRef<Gesto>(null);
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const enquadrado = useRef(false);

  const arquivoPorId = useMemo(() => new Map(q.arquivos.map((a) => [a.id, a])), [q.arquivos]);
  const cartoes = q.cartoes.map((c) => (local[c.id] ? { ...c, ...local[c.id] } : c));
  const cartaoPorId = new Map(cartoes.map((c) => [c.id, c]));

  // enquadra tudo na primeira carga
  useEffect(() => {
    if (enquadrado.current || !q.cartoes.length || !vp.current) return;
    enquadrado.current = true;
    enquadrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.cartoes.length]);

  // Esc cancela ligação/seleção
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLigandoDe(null);
        setSel(null);
        setTelaCheia(false);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  function ponto(ev: { clientX: number; clientY: number }) {
    const r = vp.current!.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function mundo(p: { x: number; y: number }) {
    const v = vistaRef.current;
    return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k };
  }

  function enquadrar() {
    const el = vp.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (!q.cartoes.length) return setVista({ x: width / 2 - 100, y: height / 3, k: 0.9 });
    const x0 = Math.min(...q.cartoes.map((c) => c.x)) - 40;
    const y0 = Math.min(...q.cartoes.map((c) => c.y)) - 40;
    const x1 = Math.max(...q.cartoes.map((c) => c.x + c.largura)) + 40;
    const y1 = Math.max(...q.cartoes.map((c) => c.y + c.largura * 1.2)) + 40;
    const k = LIMITE(Math.min(width / (x1 - x0), height / (y1 - y0), 1.2));
    setVista({ k, x: (width - (x1 - x0) * k) / 2 - x0 * k, y: (height - (y1 - y0) * k) / 2 - y0 * k });
  }

  function centroMundo() {
    const r = vp.current!.getBoundingClientRect();
    return mundo({ x: r.width / 2, y: r.height / 2 });
  }

  // ------------------------------------------------------------------ gestos
  function aoApertar(ev: React.PointerEvent<HTMLDivElement>) {
    if ((ev.target as Element).closest("[data-sem-gesto]")) return;
    vp.current!.setPointerCapture(ev.pointerId);
    const p = ponto(ev);
    ponteiros.current.set(ev.pointerId, p);
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      const v = vistaRef.current;
      const meio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesto.current = { tipo: "pinca", d0: Math.hypot(a.x - b.x, a.y - b.y), k0: v.k, mx: (meio.x - v.x) / v.k, my: (meio.y - v.y) / v.k };
      return;
    }
    const idCartao = (ev.target as Element).closest("[data-cartao]")?.getAttribute("data-cartao");
    const idLig = (ev.target as Element).closest("[data-ligacao]")?.getAttribute("data-ligacao");
    if (idCartao) {
      const c = cartaoPorId.get(idCartao)!;
      const m = mundo(p);
      gesto.current = { tipo: "cartao", id: idCartao, dx: m.x - c.x, dy: m.y - c.y, x0: p.x, y0: p.y, moveu: false };
    } else if (idLig) {
      gesto.current = null;
      setSel({ tipo: "ligacao", id: idLig });
    } else {
      const v = vistaRef.current;
      gesto.current = { tipo: "pan", x0: p.x, y0: p.y, vx: v.x, vy: v.y, moveu: false };
    }
  }

  function aoMover(ev: React.PointerEvent<HTMLDivElement>) {
    if (!ponteiros.current.has(ev.pointerId)) return;
    const p = ponto(ev);
    ponteiros.current.set(ev.pointerId, p);
    const g = gesto.current;
    if (!g) return;
    if (g.tipo === "pinca" && ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      const k = LIMITE((g.k0 * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, g.d0));
      setVista({ k, x: (a.x + b.x) / 2 - g.mx * k, y: (a.y + b.y) / 2 - g.my * k });
    } else if (g.tipo === "pan") {
      if (Math.hypot(p.x - g.x0, p.y - g.y0) > 4) g.moveu = true;
      setVista((v) => ({ ...v, x: g.vx + p.x - g.x0, y: g.vy + p.y - g.y0 }));
    } else if (g.tipo === "cartao") {
      if (!g.moveu && Math.hypot(p.x - g.x0, p.y - g.y0) < 5) return;
      g.moveu = true;
      const m = mundo(p);
      const pos = { x: m.x - g.dx, y: m.y - g.dy };
      setLocal((l) => ({ ...l, [g.id]: pos }));
      q.moverAoVivo(g.id, pos.x, pos.y);
    }
  }

  async function aoSoltar(ev: React.PointerEvent<HTMLDivElement>) {
    ponteiros.current.delete(ev.pointerId);
    const g = gesto.current;
    gesto.current = null;
    if (!g || g.tipo === "pinca") return;
    if (g.tipo === "pan") {
      if (!g.moveu) {
        setSel(null);
      }
      return;
    }
    if (g.moveu) {
      const pos = local[g.id] ?? cartaoPorId.get(g.id);
      if (pos) await q.moverCartao(g.id, pos.x, pos.y);
      setLocal((l) => {
        const n = { ...l };
        delete n[g.id];
        return n;
      });
      return;
    }
    // toque simples num cartão
    if (ligandoDe) {
      if (ligandoDe !== g.id) await q.ligar(ligandoDe, g.id);
      setLigandoDe(null);
      setSel({ tipo: "cartao", id: g.id });
      return;
    }
    setSel({ tipo: "cartao", id: g.id });
  }

  useEffect(() => {
    const el = vp.current;
    if (!el) return;
    function roda(ev: WheelEvent) {
      ev.preventDefault();
      const r = el!.getBoundingClientRect();
      const p = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      setVista((v) => {
        const k = LIMITE(v.k * Math.exp(-ev.deltaY * 0.0015));
        return { k, x: p.x - ((p.x - v.x) / v.k) * k, y: p.y - ((p.y - v.y) / v.k) * k };
      });
    }
    el.addEventListener("wheel", roda, { passive: false });
    return () => el.removeEventListener("wheel", roda);
  }, [telaCheia]);

  function zoom(f: number) {
    const r = vp.current!.getBoundingClientRect();
    setVista((v) => {
      const k = LIMITE(v.k * f);
      const cx = r.width / 2;
      const cy = r.height / 2;
      return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
    });
  }

  function mostrar(c: Cartao) {
    const r = vp.current!.getBoundingClientRect();
    const k = Math.max(vistaRef.current.k, 0.8);
    setVista({ k, x: r.width / 2 - (c.x + c.largura / 2) * k, y: r.height / 3 - c.y * k });
    setSel({ tipo: "cartao", id: c.id });
  }

  async function novaNota() {
    const m = centroMundo();
    const n = await q.criarCartao({ tipo: "nota", texto: "", cor: "amarelo", x: Math.round(m.x - 90 + rand(30)), y: Math.round(m.y - 60 + rand(30)), largura: 180 });
    if (n) {
      setSel({ tipo: "cartao", id: n.id });
      setEditandoNota(n);
    }
  }

  async function porNoQuadro(a: ArquivoMesa) {
    const ja = q.cartoes.find((c) => c.arquivo_id === a.id);
    if (ja) {
      setGaveta(false);
      return mostrar(ja);
    }
    const m = centroMundo();
    const largura = a.tipo === "imagem" ? 220 : 200;
    const n = await q.criarCartao({ tipo: "arquivo", arquivo_id: a.id, x: Math.round(m.x - largura / 2 + rand(40)), y: Math.round(m.y - 80 + rand(40)), largura });
    if (n) {
      setGaveta(false);
      setSel({ tipo: "cartao", id: n.id });
    }
  }

  // ------------------------------------------------------------------ desenho
  const selCartao = sel?.tipo === "cartao" ? cartaoPorId.get(sel.id) : undefined;
  const selLig = sel?.tipo === "ligacao" ? q.ligacoes.find((l) => l.id === sel.id) : undefined;
  const foraDoQuadro = q.arquivos.filter((a) => !q.cartoes.some((c) => c.arquivo_id === a.id)).length;
  const grade = 40 * vista.k;

  return (
    <div className={telaCheia ? "fixed inset-0 z-50 flex flex-col bg-pergaminho" : "relative"}>
      {/* barra do quadro */}
      <div className={`flex flex-wrap items-center gap-2 ${telaCheia ? "px-3 py-2" : "mb-2"}`}>
        <button onClick={novaNota} className="botao-ouro px-3 py-1.5">
          + Nota
        </button>
        <button onClick={() => setGaveta(true)} className="rounded-sm border border-ouro-escuro/50 bg-pergaminho-claro px-3 py-1.5 text-marinho">
          Arquivos{" "}
          <span className="numeros text-sm text-tinta-suave">
            {q.arquivos.length}
            {foraDoQuadro ? `, ${foraDoQuadro} fora do quadro` : ""}
          </span>
        </button>
        <span className="ml-auto flex gap-1">
          <BotaoIcone rotulo="Afastar" onClick={() => zoom(1 / 1.25)}>−</BotaoIcone>
          <BotaoIcone rotulo="Aproximar" onClick={() => zoom(1.25)}>+</BotaoIcone>
          <BotaoIcone rotulo="Enquadrar tudo" onClick={enquadrar}>⤢</BotaoIcone>
          <BotaoIcone rotulo={telaCheia ? "Sair da tela cheia" : "Tela cheia"} onClick={() => setTelaCheia(!telaCheia)}>
            {telaCheia ? "✕" : "⛶"}
          </BotaoIcone>
        </span>
      </div>

      {/* a superfície */}
      <div
        ref={vp}
        className="quadro-superficie relative touch-none select-none overflow-hidden rounded-sm"
        style={{
          height: telaCheia ? undefined : altura,
          flex: telaCheia ? 1 : undefined,
          backgroundSize: `${grade}px ${grade}px, 100% 100%`,
          backgroundPosition: `${vista.x}px ${vista.y}px, 0 0`,
          cursor: gesto.current?.tipo === "pan" ? "grabbing" : "grab",
        }}
        onPointerDown={aoApertar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        role="application"
        aria-label="Quadro de investigação. Arraste para mover, toque num cartão para escolher."
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.k})` }}>
          {/* fios */}
          <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1" aria-hidden>
            {q.ligacoes.map((l) => {
              const a = cartaoPorId.get(l.origem_id);
              const b = cartaoPorId.get(l.destino_id);
              if (!a || !b) return null;
              const d = caminhoFio(a, b);
              const ativa = sel?.id === l.id || sel?.id === a.id || sel?.id === b.id;
              return (
                <g key={l.id} data-ligacao={l.id} style={{ cursor: "pointer" }}>
                  <path d={d} stroke="transparent" strokeWidth={16} fill="none" vectorEffect="non-scaling-stroke" />
                  <path d={d} stroke="rgba(40,20,10,.25)" strokeWidth={3} fill="none" vectorEffect="non-scaling-stroke" transform="translate(1.5 2.5)" />
                  <path d={d} stroke={ativa ? "#c23a2b" : "#9b2a1f"} strokeWidth={ativa ? 3 : 2.2} fill="none" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
          </svg>
          {/* cartões */}
          {cartoes.map((c) => (
            <CartaoQuadro
              key={c.id}
              c={c}
              arquivo={c.arquivo_id ? arquivoPorId.get(c.arquivo_id) : undefined}
              selecionado={sel?.id === c.id}
              alvoLigacao={!!ligandoDe && ligandoDe !== c.id}
            />
          ))}
          {/* rótulos dos fios (HTML, legível no modo escuro forçado) */}
          {q.ligacoes.map((l) => {
            const a = cartaoPorId.get(l.origem_id);
            const b = cartaoPorId.get(l.destino_id);
            if (!a || !b || !l.rotulo) return null;
            const m = meioFio(a, b);
            return (
              <span
                key={`r${l.id}`}
                data-ligacao={l.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap rounded-sm bg-pergaminho-claro/90 px-1.5 text-sm italic text-tinta shadow-sm"
                style={{ left: m.x, top: m.y, fontSize: `${12 / Math.sqrt(vista.k)}px` }}
              >
                {l.rotulo}
              </span>
            );
          })}
        </div>

        {q.cartoes.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 px-6 text-center text-lg italic text-tinta-suave">
            {eMestre
              ? "O quadro está vazio. Envie arquivos em “Arquivos” ou prenda uma nota."
              : "O quadro está vazio. Prenda uma nota ou espere o mestre mandar arquivos."}
          </p>
        )}

        {ligandoDe && (
          <div data-sem-gesto className="absolute inset-x-2 top-2 flex items-center gap-2 rounded-sm bg-marinho px-3 py-2 text-pergaminho-claro shadow-lg">
            <span className="flex-1">Toque no cartão que você quer ligar a “{tituloCartao(cartaoPorId.get(ligandoDe), arquivoPorId)}”.</span>
            <button onClick={() => setLigandoDe(null)} className="underline underline-offset-2">
              Cancelar
            </button>
          </div>
        )}

        {/* ações do que está selecionado */}
        {(selCartao || selLig) && !ligandoDe && (
          <div data-sem-gesto className="folha-solida absolute inset-x-2 bottom-2 p-2.5 shadow-xl sm:left-auto sm:right-2 sm:w-[26rem]">
            {selCartao ? (
              <AcoesCartao
                c={selCartao}
                arquivo={selCartao.arquivo_id ? arquivoPorId.get(selCartao.arquivo_id) : undefined}
                q={q}
                eMestre={eMestre}
                aoAbrir={setVendo}
                aoEditar={setEditandoNota}
                aoLigar={() => setLigandoDe(selCartao.id)}
                aoFechar={() => setSel(null)}
              />
            ) : selLig ? (
              <AcoesLigacao l={selLig} q={q} aoFechar={() => setSel(null)} />
            ) : null}
          </div>
        )}
      </div>

      {gaveta && <Gaveta q={q} eMestre={eMestre} aoFechar={() => setGaveta(false)} aoPor={porNoQuadro} aoAbrir={setVendo} />}
      {vendo && <Visualizador a={vendo} aoFechar={() => setVendo(null)} />}
      {editandoNota && (
        <EditorNota
          c={editandoNota}
          aoSalvar={async (texto, cor) => {
            await q.salvarCartao(editandoNota.id, { texto, cor });
            setEditandoNota(null);
          }}
          aoFechar={async () => {
            // nota nova deixada em branco some do quadro
            const atual = q.cartoes.find((x) => x.id === editandoNota.id);
            if (atual && atual.tipo === "nota" && !atual.texto.trim()) await q.tirarCartao(atual.id);
            setEditandoNota(null);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ peças

function CartaoQuadro({ c, arquivo, selecionado, alvoLigacao }: { c: Cartao; arquivo?: ArquivoMesa; selecionado: boolean; alvoLigacao: boolean }) {
  const url = useUrlArquivo(arquivo?.tipo === "imagem" ? arquivo.caminho : null);
  const giro = ((hash(c.id) % 7) - 3) * 0.6; // −1,8° a +1,8°, sempre o mesmo para o mesmo cartão
  const cor = COR[c.cor] ?? COR.papel;
  const anel = selecionado ? "outline outline-2 outline-offset-4 outline-marinho" : alvoLigacao ? "outline outline-2 outline-dashed outline-offset-4 outline-[#9b2a1f]" : "";

  let corpo: React.ReactNode;
  if (c.tipo === "nota") {
    corpo = (
      <div className="px-3 pb-2 pt-4" style={{ background: cor.fundo, borderBottom: `3px solid ${cor.borda}` }}>
        <p className="whitespace-pre-wrap break-words text-[1.05rem] leading-snug text-tinta">{c.texto || <i className="text-tinta-suave">Nota vazia</i>}</p>
        {c.autor && <p className="mt-1.5 text-right text-sm italic text-tinta-suave">{c.autor}</p>}
      </div>
    );
  } else if (!arquivo) {
    corpo = <div className="bg-pergaminho-claro p-3 italic text-tinta-suave">Arquivo removido</div>;
  } else if (arquivo.tipo === "imagem") {
    corpo = (
      <div className="bg-[#fbf8f0] p-2 pb-1">
        <div className="aspect-[4/3] w-full overflow-hidden bg-pergaminho-escuro/40">
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={arquivo.titulo} draggable={false} className="h-full w-full object-cover" />
          )}
        </div>
        <p className="mt-1 truncate px-0.5 text-center italic text-tinta">{arquivo.titulo}</p>
      </div>
    );
  } else if (arquivo.tipo === "pdf") {
    corpo = (
      <div className="flex items-center gap-2.5 bg-[#f7f2e4] p-3">
        <span className="grid h-12 w-10 shrink-0 place-items-center border border-pv/50 bg-white text-xs font-semibold text-pv">PDF</span>
        <span className="min-w-0 font-semibold leading-snug text-marinho">{arquivo.titulo}</span>
      </div>
    );
  } else {
    corpo = (
      <div className="bg-[#f7f2e4] px-3 pb-3 pt-4">
        <p className="font-semibold leading-snug text-marinho">{arquivo.titulo}</p>
        <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-[0.95rem] leading-snug text-tinta">{arquivo.texto}</p>
      </div>
    );
  }

  return (
    <div
      data-cartao={c.id}
      className={`absolute cursor-grab shadow-[0_3px_8px_rgba(40,25,10,.28)] ${anel}`}
      style={{ left: c.x, top: c.y, width: c.largura, transform: `rotate(${giro}deg)` }}
    >
      {corpo}
      <span className="alfinete" aria-hidden />
    </div>
  );
}

function AcoesCartao({
  c, arquivo, q, eMestre, aoAbrir, aoEditar, aoLigar, aoFechar,
}: {
  c: Cartao;
  arquivo?: ArquivoMesa;
  q: DadosQuadro;
  eMestre: boolean;
  aoAbrir: (a: ArquivoMesa) => void;
  aoEditar: (c: Cartao) => void;
  aoLigar: () => void;
  aoFechar: () => void;
}) {
  const b = "rounded-sm border border-ouro-escuro/40 px-2.5 py-1 text-marinho";
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline gap-2">
        <p className="min-w-0 flex-1 truncate font-semibold text-marinho">{c.tipo === "nota" ? `Nota${c.autor ? ` de ${c.autor}` : ""}` : arquivo?.titulo}</p>
        <button onClick={aoFechar} className="px-1 text-xl leading-none text-tinta-suave" aria-label="Fechar">
          ×
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {arquivo && (
          <button className="botao-ouro px-3 py-1" onClick={() => aoAbrir(arquivo)}>
            Abrir
          </button>
        )}
        {c.tipo === "nota" && (
          <button className="botao-ouro px-3 py-1" onClick={() => aoEditar(c)}>
            Editar
          </button>
        )}
        {arquivo && eMestre && (
          <button
            className={b}
            onClick={() => {
              const t = prompt("Novo nome do arquivo", arquivo.titulo)?.trim();
              if (t && t !== arquivo.titulo) q.salvarArquivo(arquivo.id, { titulo: t.slice(0, 160) });
            }}
          >
            Renomear
          </button>
        )}
        <button className={b} onClick={aoLigar}>
          Ligar com fio
        </button>
        <button className={b} onClick={() => q.salvarCartao(c.id, { largura: Math.max(130, c.largura - 40) })} aria-label="Diminuir">
          Menor
        </button>
        <button className={b} onClick={() => q.salvarCartao(c.id, { largura: Math.min(520, c.largura + 40) })} aria-label="Aumentar">
          Maior
        </button>
        <button
          className="px-2 py-1 text-pv underline underline-offset-2"
          onClick={async () => {
            const msg = c.tipo === "nota" ? "Apagar esta nota do quadro?" : "Tirar este arquivo do quadro? Ele continua guardado em Arquivos.";
            if (!confirm(msg)) return;
            await q.tirarCartao(c.id);
            aoFechar();
          }}
        >
          {c.tipo === "nota" ? "Apagar" : "Tirar do quadro"}
        </button>
      </div>
    </div>
  );
}

function AcoesLigacao({ l, q, aoFechar }: { l: Ligacao; q: DadosQuadro; aoFechar: () => void }) {
  const [rotulo, setRotulo] = useState(l.rotulo);
  useEffect(() => setRotulo(l.rotulo), [l.id, l.rotulo]);
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        q.rotularLigacao(l.id, rotulo.trim());
        aoFechar();
      }}
    >
      <div className="flex items-baseline gap-2">
        <p className="flex-1 font-semibold text-marinho">Fio</p>
        <button type="button" onClick={aoFechar} className="px-1 text-xl leading-none text-tinta-suave" aria-label="Fechar">
          ×
        </button>
      </div>
      <div className="flex gap-2">
        <input
          className="campo min-w-0 flex-1 py-1"
          value={rotulo}
          onChange={(e) => setRotulo(e.target.value)}
          placeholder="O que liga os dois? (opcional)"
          aria-label="Rótulo do fio"
          maxLength={60}
        />
        <button className="botao-ouro px-3">Salvar</button>
      </div>
      <button
        type="button"
        className="justify-self-start text-pv underline underline-offset-2"
        onClick={async () => {
          await q.desligar(l.id);
          aoFechar();
        }}
      >
        Cortar o fio
      </button>
    </form>
  );
}

function EditorNota({ c, aoSalvar, aoFechar }: { c: Cartao; aoSalvar: (texto: string, cor: string) => void; aoFechar: () => void }) {
  const [texto, setTexto] = useState(c.texto);
  const [cor, setCor] = useState(c.cor);
  return (
    <div role="dialog" aria-modal="true" aria-label="Nota" className="fixed inset-0 z-[60] grid place-items-end bg-black/45 sm:place-items-center">
      <form
        className="folha-solida grid w-full max-w-md gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          aoSalvar(texto, cor);
        }}
      >
        <h2 className="titulo text-lg text-marinho">Nota no quadro</h2>
        <textarea
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={600}
          className="campo min-h-36 w-full text-lg"
          placeholder="Uma pista, uma suspeita, uma pergunta…"
          aria-label="Texto da nota"
          style={{ background: (COR[cor] ?? COR.papel).fundo }}
        />
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-sm text-tinta-suave">Cor do papel</legend>
          {CORES_NOTA.map((k) => (
            <label key={k.id} className="cursor-pointer">
              <input type="radio" name="cor" value={k.id} checked={cor === k.id} onChange={() => setCor(k.id)} className="peer sr-only" />
              <span
                className="block h-9 w-9 rounded-sm border-2 peer-checked:outline peer-checked:outline-2 peer-checked:outline-offset-2 peer-checked:outline-marinho peer-focus-visible:outline peer-focus-visible:outline-2"
                style={{ background: k.fundo, borderColor: k.borda }}
                title={k.nome}
              />
              <span className="sr-only">{k.nome}</span>
            </label>
          ))}
        </fieldset>
        <div className="flex gap-2">
          <button className="botao-ouro px-5 py-1.5" disabled={!texto.trim()}>
            Prender no quadro
          </button>
          <button type="button" className="px-2 text-tinta-suave underline underline-offset-2" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function Gaveta({
  q, eMestre, aoFechar, aoPor, aoAbrir,
}: {
  q: DadosQuadro;
  eMestre: boolean;
  aoFechar: () => void;
  aoPor: (a: ArquivoMesa) => void;
  aoAbrir: (a: ArquivoMesa) => void;
}) {
  const arquivoInput = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState<{ titulo: string; texto: string } | null>(null);
  const [renomeando, setRenomeando] = useState<{ id: string; titulo: string } | null>(null);
  return (
    <div role="dialog" aria-modal="true" aria-label="Arquivos da mesa" className="fixed inset-0 z-[60] flex justify-end bg-black/40" onClick={aoFechar}>
      <aside className="folha-solida flex h-full w-full max-w-md flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-baseline gap-2 border-b border-ouro-escuro/25 px-4 py-3">
          <h2 className="titulo flex-1 text-xl text-marinho">Arquivos da mesa</h2>
          <button onClick={aoFechar} className="px-1 text-2xl leading-none text-tinta-suave" aria-label="Fechar">
            ×
          </button>
        </header>
        {eMestre && (
          <div className="grid gap-2 border-b border-ouro-escuro/20 px-4 py-3">
            <p className="text-sm text-tinta-suave">Tudo o que você enviar fica registrado aqui e todos da mesa podem abrir.</p>
            <div className="flex gap-2">
              <button className="botao-ouro flex-1 py-1.5" disabled={enviando} onClick={() => arquivoInput.current?.click()}>
                {enviando ? "Enviando…" : "Enviar imagem ou PDF"}
              </button>
              <button className="rounded-sm border border-ouro-escuro/50 px-3 text-marinho" onClick={() => setTexto({ titulo: "", texto: "" })}>
                Novo texto
              </button>
            </div>
            <input
              ref={arquivoInput}
              type="file"
              accept="image/*,application/pdf"
              multiple
              hidden
              onChange={async (e) => {
                const lista = [...(e.target.files ?? [])];
                e.target.value = "";
                setEnviando(true);
                for (const f of lista) await q.enviarArquivo(f, f.name.replace(/\.[^.]+$/, ""));
                setEnviando(false);
              }}
            />
            {texto && (
              <form
                className="grid gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await q.criarTexto(texto.titulo, texto.texto)) setTexto(null);
                }}
              >
                <input className="campo" placeholder="Título (ex.: Carta encontrada no porto)" value={texto.titulo} onChange={(e) => setTexto({ ...texto, titulo: e.target.value })} required aria-label="Título do texto" />
                <textarea className="campo min-h-28" placeholder="O conteúdo, como os jogadores vão ler" value={texto.texto} onChange={(e) => setTexto({ ...texto, texto: e.target.value })} aria-label="Conteúdo do texto" />
                <div className="flex gap-2">
                  <button className="botao-ouro px-4 py-1">Registrar</button>
                  <button type="button" className="text-tinta-suave underline underline-offset-2" onClick={() => setTexto(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        <ul className="flex-1 divide-y divide-ouro-escuro/15 overflow-auto px-4">
          {q.arquivos.map((a) => {
            const noQuadro = q.cartoes.some((c) => c.arquivo_id === a.id);
            return (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <Miniatura a={a} />
                <div className="min-w-0 flex-1">
                  {renomeando?.id === a.id ? (
                    <form
                      className="flex gap-1.5"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const t = renomeando.titulo.trim();
                        if (t && t !== a.titulo) await q.salvarArquivo(a.id, { titulo: t });
                        setRenomeando(null);
                      }}
                    >
                      <input
                        autoFocus
                        className="campo min-w-0 flex-1 py-0.5"
                        value={renomeando.titulo}
                        maxLength={160}
                        onChange={(e) => setRenomeando({ id: a.id, titulo: e.target.value })}
                        onKeyDown={(e) => e.key === "Escape" && setRenomeando(null)}
                        aria-label="Novo nome"
                      />
                      <button className="botao-ouro px-2 text-sm">Salvar</button>
                    </form>
                  ) : (
                    <button onClick={() => aoAbrir(a)} className="block w-full truncate text-left font-semibold text-marinho underline decoration-ouro/50 underline-offset-[3px]">
                      {a.titulo}
                    </button>
                  )}
                  <p className="text-sm text-tinta-suave">
                    {{ imagem: "Imagem", pdf: "PDF", texto: "Texto" }[a.tipo]}, {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                    {noQuadro ? ", no quadro" : ""}
                  </p>
                </div>
                <button onClick={() => aoPor(a)} className="shrink-0 rounded-sm border border-ouro-escuro/50 px-2.5 py-1 text-sm text-marinho">
                  {noQuadro ? "Mostrar" : "Pôr no quadro"}
                </button>
                {eMestre && renomeando?.id !== a.id && (
                  <button
                    onClick={() => setRenomeando({ id: a.id, titulo: a.titulo })}
                    className="shrink-0 px-1 text-tinta-suave hover:text-marinho"
                    aria-label={`Renomear ${a.titulo}`}
                    title="Renomear"
                  >
                    ✎
                  </button>
                )}
                {eMestre && (
                  <button
                    onClick={() => confirm(`Apagar “${a.titulo}” de vez? Some do quadro e dos arquivos.`) && q.apagarArquivo(a)}
                    className="shrink-0 px-1 text-tinta-suave hover:text-pv"
                    aria-label={`Apagar ${a.titulo}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
          {q.arquivos.length === 0 && (
            <li className="py-4 italic text-tinta-suave">{eMestre ? "Nenhum arquivo enviado ainda." : "O mestre ainda não mandou arquivos."}</li>
          )}
        </ul>
      </aside>
    </div>
  );
}

function Miniatura({ a }: { a: ArquivoMesa }) {
  const url = useUrlArquivo(a.tipo === "imagem" ? a.caminho : null);
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-ouro-escuro/30 bg-pergaminho-escuro/30 text-xs font-semibold text-tinta-suave">
      {a.tipo === "imagem" && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : a.tipo === "pdf" ? (
        "PDF"
      ) : (
        "Txt"
      )}
    </span>
  );
}

function Visualizador({ a, aoFechar }: { a: ArquivoMesa; aoFechar: () => void }) {
  const url = useUrlArquivo(a.caminho);
  return (
    <div role="dialog" aria-modal="true" aria-label={a.titulo} className="fixed inset-0 z-[70] flex flex-col bg-black/85 p-3" onClick={aoFechar}>
      <div className="mb-2 flex items-center gap-3 text-pergaminho-claro" onClick={(e) => e.stopPropagation()}>
        <p className="titulo min-w-0 flex-1 truncate text-lg">{a.titulo}</p>
        {url && a.tipo !== "texto" && (
          <a href={url} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">
            Abrir em nova aba
          </a>
        )}
        <button onClick={aoFechar} className="px-1 text-3xl leading-none" aria-label="Fechar">
          ×
        </button>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center" onClick={(e) => e.stopPropagation()}>
        {a.tipo === "imagem" && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={a.titulo} className="max-h-full max-w-full object-contain" />
        )}
        {a.tipo === "pdf" && url && <iframe src={url} title={a.titulo} className="h-full w-full max-w-4xl rounded-sm bg-white" />}
        {a.tipo === "texto" && (
          <div className="folha-solida max-h-full w-full max-w-2xl overflow-auto p-5">
            <Markdown texto={a.texto} />
          </div>
        )}
        {a.tipo !== "texto" && !url && <p className="italic text-pergaminho-claro/70">Carregando…</p>}
      </div>
    </div>
  );
}

function BotaoIcone({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={rotulo} title={rotulo} className="grid h-9 w-9 place-items-center rounded-sm border border-ouro-escuro/50 bg-pergaminho-claro text-lg leading-none text-marinho">
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ geometria

/** Fio de alfinete a alfinete, com uma barriga para baixo como barbante de verdade. */
function caminhoFio(a: Cartao, b: Cartao) {
  const p = { x: a.x + a.largura / 2, y: a.y + 4 };
  const q = { x: b.x + b.largura / 2, y: b.y + 4 };
  const dist = Math.hypot(q.x - p.x, q.y - p.y);
  const cx = (p.x + q.x) / 2;
  const cy = (p.y + q.y) / 2 + Math.min(120, dist * 0.15);
  return `M${p.x},${p.y} Q${cx},${cy} ${q.x},${q.y}`;
}
function meioFio(a: Cartao, b: Cartao) {
  const p = { x: a.x + a.largura / 2, y: a.y + 4 };
  const q = { x: b.x + b.largura / 2, y: b.y + 4 };
  const dist = Math.hypot(q.x - p.x, q.y - p.y);
  // ponto médio da curva quadrática: (p + 2c + q) / 4
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 + Math.min(120, dist * 0.15) / 2 };
}

function tituloCartao(c: Cartao | undefined, arquivos: Map<string, ArquivoMesa>) {
  if (!c) return "";
  if (c.tipo === "nota") return c.texto.slice(0, 30) || "nota";
  return arquivos.get(c.arquivo_id ?? "")?.titulo ?? "arquivo";
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function rand(n: number) {
  return Math.round((Math.random() - 0.5) * n);
}
