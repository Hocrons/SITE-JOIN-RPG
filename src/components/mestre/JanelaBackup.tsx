"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const NOMES: Record<string, string> = {
  personagens: "personagens",
  personagem_itens: "itens e habilidades",
  lore_entradas: "entradas do Códice",
  lore_conexoes: "conexões do Códice",
  eventos: "eventos da linha do tempo",
  notas_pessoais: "notas dos cadernos",
  arquivos_mesa: "arquivos do quadro",
  quadro_cartoes: "cartões do quadro",
  presets_dados: "presets de dados",
};

interface Backup {
  formato: string;
  exportado_em: string;
  mesa_id: string;
  mesa_nome: string;
  tabelas: Record<string, unknown[]>;
}

/** Baixar a mesa inteira em JSON, ou voltar a mesa a um backup. */
export function JanelaBackup({ mesaId, mesaNome, onFechar }: { mesaId: string; mesaNome: string; onFechar: () => void }) {
  const [ocupado, setOcupado] = useState<"" | "baixando" | "restaurando">("");
  const [lido, setLido] = useState<Backup | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  async function baixar() {
    setErro(null);
    setOcupado("baixando");
    const { data, error } = await supabase().rpc("exportar_mesa", { p_mesa: mesaId });
    setOcupado("");
    if (error) return setErro(error.message);
    const quando = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "h");
    const nome = `backup-${mesaNome.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${quando}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setFeito(`Backup baixado: ${nome}`);
  }

  async function ler(f: File) {
    setErro(null);
    setFeito(null);
    try {
      const j = JSON.parse(await f.text()) as Backup;
      if (j.formato !== "paratus-backup" || !j.tabelas) throw new Error("Este arquivo não é um backup do site.");
      if (j.mesa_id !== mesaId) throw new Error(`Este backup é da mesa “${j.mesa_nome}”. Ele só pode ser restaurado nela.`);
      setLido(j);
    } catch (e) {
      setLido(null);
      setErro(e instanceof Error && !(e instanceof SyntaxError) ? e.message : "Não consegui ler o arquivo. Ele precisa ser o .json baixado aqui.");
    }
  }

  async function restaurar() {
    if (!lido) return;
    setOcupado("restaurando");
    const { error } = await supabase().rpc("restaurar_mesa", { p_mesa: mesaId, p_backup: lido });
    setOcupado("");
    if (error) return setErro(error.message);
    setLido(null);
    setFeito("Mesa restaurada. Recarregando…");
    setTimeout(() => location.reload(), 1200);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Backup da mesa">
      <div className="painel grid max-h-[90dvh] w-full max-w-lg gap-4 overflow-auto p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="titulo text-xl text-ouro-claro">Backup da mesa</h2>
          <button onClick={onFechar} className="px-1 text-2xl leading-none text-nevoa/60" aria-label="Fechar">
            ×
          </button>
        </div>

        <section className="grid gap-2">
          <h3 className="titulo text-ouro-claro">Baixar</h3>
          <p className="text-nevoa/75">
            Um arquivo .json com tudo da mesa: fichas, PINs, itens, Códice, linha do tempo, cadernos e quadro. Imagens e PDFs não vão
            dentro do arquivo; eles continuam guardados no site.
          </p>
          <button onClick={baixar} disabled={!!ocupado} className="botao-ouro justify-self-start px-5 py-1.5">
            {ocupado === "baixando" ? "Preparando…" : "Baixar backup"}
          </button>
        </section>

        <section className="grid gap-2 border-t border-ouro/15 pt-4">
          <h3 className="titulo text-ouro-claro">Restaurar</h3>
          <p className="text-nevoa/75">
            Volta a mesa exatamente ao estado do backup: o que foi criado depois some. Os jogadores continuam conectados. O histórico de
            “desfazer” é zerado.
          </p>
          <button
            onClick={() => arquivo.current?.click()}
            disabled={!!ocupado}
            className="justify-self-start rounded-sm border border-ouro/35 px-4 py-1.5 text-ouro-claro hover:bg-ouro/10"
          >
            Escolher arquivo de backup
          </button>
          <input
            ref={arquivo}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) ler(f);
            }}
          />
          {lido && (
            <div className="grid gap-2 rounded-sm border border-pv-vivo/40 bg-pv/15 p-3">
              <p>
                Backup de <b>{new Date(lido.exportado_em).toLocaleString("pt-BR")}</b> com{" "}
                {Object.entries(NOMES)
                  .map(([k, nome]) => `${lido.tabelas[k]?.length ?? 0} ${nome}`)
                  .join(", ")}
                .
              </p>
              <p className="font-semibold text-pv-vivo">Tudo o que mudou na mesa depois dessa data vai ser perdido.</p>
              <div className="flex gap-2">
                <button onClick={restaurar} disabled={!!ocupado} className="rounded-sm bg-pv px-4 py-1.5 text-white hover:bg-pv-vivo">
                  {ocupado === "restaurando" ? "Restaurando…" : "Restaurar este backup"}
                </button>
                <button onClick={() => setLido(null)} className="px-2 text-nevoa/70 underline underline-offset-2">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>

        {erro && <p className="rounded-sm border border-pv/50 bg-pv/15 p-2 text-pv-vivo" role="alert">{erro}</p>}
        {feito && <p className="text-pd-vivo" role="status">{feito}</p>}
      </div>
    </div>
  );
}
