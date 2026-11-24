"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CORES_GRADE, type Cena, type DadosCenas } from "@/lib/cenas";
import { regioesDe } from "./SeletorCenas";

const CAMPO = "w-full rounded-sm border border-ouro/25 bg-noite px-2.5 py-1.5 text-nevoa placeholder:text-nevoa/40";

/** Configuração de uma cena: nome, mapa, grade e quem vê. */
export function PainelCena({
  cena, dados, alinhando, onAlinhar,
}: {
  cena: Cena;
  dados: DadosCenas;
  alinhando: boolean;
  onAlinhar: () => void;
}) {
  const [nome, setNome] = useState(cena.nome);
  const [progresso, setProgresso] = useState("");
  const arquivo = useRef<HTMLInputElement>(null);
  useEffect(() => setNome(cena.nome), [cena.id, cena.nome]);

  const g = (patch: Partial<Cena>) => dados.salvar(cena.id, patch);
  const s = cena.grade_tamanho;

  return (
    <div className="grid gap-4">
      <label className="grid gap-0.5 text-sm text-nevoa/70">
        Nome da cena
        <input
          className={`${CAMPO} titulo text-lg`}
          value={nome}
          maxLength={80}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome.trim() && nome !== cena.nome && g({ nome: nome.trim() })}
        />
      </label>

      <CampoRegiao cena={cena} dados={dados} />

      <section className="grid gap-2">
        <h3 className="titulo text-ouro-claro">Quem vê</h3>
        {cena.ativa ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="carimbo !text-pd-vivo">na mesa dos jogadores</span>
            <button onClick={() => dados.ativar(null)} className="rounded-sm border border-ouro/30 px-3 py-1.5 text-sm text-ouro-claro hover:bg-ouro/10">
              Tirar da mesa
            </button>
          </div>
        ) : (
          <button onClick={() => dados.ativar(cena.id)} className="botao-ouro justify-self-start px-4 py-1.5">
            Mostrar aos jogadores
          </button>
        )}
        <p className="text-sm text-nevoa/50">Os jogadores só veem a cena que está na mesa. As outras ficam escondidas, com o mapa e tudo.</p>
      </section>

      <section className="grid gap-2">
        <h3 className="titulo text-ouro-claro">Mapa</h3>
        {cena.mapa_largura ? (
          <p className="text-sm text-nevoa/60">
            <span className="numeros">
              {cena.mapa_largura} × {cena.mapa_altura}
            </span>{" "}
            px. Jogadores no celular recebem uma versão leve; no computador, uma versão otimizada.
          </p>
        ) : (
          <p className="text-sm text-nevoa/60">Imagem de até 50 MB (JPG, PNG ou WebP; mapas de até uns 8000 px vão bem).</p>
        )}
        <button
          onClick={() => arquivo.current?.click()}
          disabled={!!progresso}
          className="justify-self-start rounded-sm border border-ouro/35 px-4 py-1.5 text-ouro-claro hover:bg-ouro/10 disabled:opacity-60"
        >
          {progresso || (cena.mapa_caminho ? "Trocar o mapa" : "Enviar o mapa")}
        </button>
        <input
          ref={arquivo}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) dados.enviarMapa(cena, f, setProgresso);
          }}
        />
      </section>

      <section className="grid gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="titulo text-ouro-claro">Grade</h3>
          <label className="flex items-center gap-2 text-sm text-nevoa/80">
            <input type="checkbox" className="h-4 w-4 accent-[#b8912f]" checked={cena.grade_visivel} onChange={(e) => g({ grade_visivel: e.target.checked })} />
            Mostrar
          </label>
        </div>
        <button
          onClick={onAlinhar}
          aria-pressed={alinhando}
          className={`justify-self-start rounded-sm px-4 py-1.5 ${alinhando ? "bg-ouro/90 text-marinho" : "border border-ouro/35 text-ouro-claro hover:bg-ouro/10"}`}
        >
          {alinhando ? "Arraste sobre um quadrado no mapa…" : "Alinhar pelo mapa"}
        </button>
        <Regulador rotulo="Tamanho do quadrado (px do mapa)" valor={s} min={8} max={400} passo={0.5} onMudar={(v) => g({ grade_tamanho: v })} />
        <Regulador rotulo="Deslocamento X" valor={cena.grade_x} min={0} max={s} passo={0.5} onMudar={(v) => g({ grade_x: v })} />
        <Regulador rotulo="Deslocamento Y" valor={cena.grade_y} min={0} max={s} passo={0.5} onMudar={(v) => g({ grade_y: v })} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-nevoa/70">Cor</span>
          {CORES_GRADE.map((c) => (
            <button
              key={c.id}
              onClick={() => g({ grade_cor: c.id })}
              aria-pressed={cena.grade_cor === c.id}
              title={c.nome}
              aria-label={`Grade ${c.nome.toLowerCase()}`}
              className={`h-7 w-7 rounded-sm border-2 ${cena.grade_cor === c.id ? "border-ouro" : "border-ouro/20"}`}
              style={{ background: `linear-gradient(135deg, #2a2520 50%, #bfae8a 50%)`, boxShadow: `inset 0 0 0 3px ${c.id}` }}
            />
          ))}
        </div>
        <label className="grid gap-0.5 text-sm text-nevoa/70">
          Metros por quadrado
          <input
            type="number"
            step="0.5"
            min="0.5"
            className={`${CAMPO} numeros w-28`}
            value={cena.metros_por_quadrado}
            onChange={(e) => Number(e.target.value) > 0 && g({ metros_por_quadrado: Number(e.target.value) })}
          />
        </label>
      </section>

      <button
        onClick={() => confirm(`Apagar a cena “${cena.nome}” e o mapa dela?`) && dados.excluir(cena)}
        className="justify-self-start text-sm text-pv-vivo underline underline-offset-2"
      >
        Apagar cena
      </button>
    </div>
  );
}

/** Número + controle deslizante + botões de ajuste fino (±0,5). */
function Regulador({ rotulo, valor, min, max, passo, onMudar }: { rotulo: string; valor: number; min: number; max: number; passo: number; onMudar: (v: number) => void }) {
  const [texto, setTexto] = useState(String(valor));
  useEffect(() => setTexto(String(valor)), [valor]);
  const fixar = (v: number) => onMudar(Math.round(Math.min(max, Math.max(min, v)) * 10) / 10);
  return (
    <div className="grid gap-1">
      <span className="text-sm text-nevoa/70">{rotulo}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => fixar(valor - passo)} className="h-8 w-8 rounded-sm border border-ouro/25 text-ouro-claro" aria-label={`${rotulo}: menos`}>
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={passo}
          value={valor}
          onChange={(e) => fixar(Number(e.target.value))}
          className="min-w-0 flex-1 accent-[#b8912f]"
          aria-label={rotulo}
        />
        <button onClick={() => fixar(valor + passo)} className="h-8 w-8 rounded-sm border border-ouro/25 text-ouro-claro" aria-label={`${rotulo}: mais`}>
          +
        </button>
        <input
          inputMode="decimal"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => {
            const v = Number(texto.replace(",", "."));
            if (Number.isFinite(v)) fixar(v);
            else setTexto(String(valor));
          }}
          className="numeros w-16 rounded-sm border border-ouro/25 bg-noite px-1.5 py-1 text-center text-nevoa"
          aria-label={`${rotulo} (número)`}
        />
      </div>
    </div>
  );
}

function CampoRegiao({ cena, dados }: { cena: Cena; dados: DadosCenas }) {
  const [valor, setValor] = useState(cena.regiao ?? "");
  const id = useId();
  useEffect(() => setValor(cena.regiao ?? ""), [cena.id, cena.regiao]);
  const salvar = () => {
    const r = valor.trim();
    if (r === (cena.regiao ?? "")) return;
    // entra no fim da região nova
    const ordem = dados.cenas.filter((c) => (c.regiao ?? "") === r).reduce((m, c) => Math.max(m, c.ordem), -1) + 1;
    dados.salvar(cena.id, { regiao: r, ordem });
  };
  return (
    <label className="grid gap-0.5 text-sm text-nevoa/70">
      Região
      <input
        className={CAMPO}
        value={valor}
        list={id}
        maxLength={60}
        placeholder="Ex.: Paratium"
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      />
      <datalist id={id}>
        {regioesDe(dados.cenas).map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </label>
  );
}
