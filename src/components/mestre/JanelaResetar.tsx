"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Personagem } from "@/lib/tipos";

const PARTES = [
  { id: "status", nome: "Status", detalhe: "PV, SAN, PE e PD cheios (ficha de 99%), PV temporário zerado e fora da Âncora", padrao: true },
  { id: "condicoes", nome: "Condições", detalhe: "tira todas as condições", padrao: true },
  { id: "registro", nome: "Registro de alterações", detalhe: "apaga o histórico de dano, cura e mudanças (o “desfazer” deixa de ter o que desfazer)", padrao: true },
  { id: "anotacoes", nome: "Anotações", detalhe: "apaga o bloco de notas da ficha", padrao: false },
  { id: "rolagens", nome: "Rolagens", detalhe: "apaga as rolagens de dados desses personagens", padrao: false },
] as const;
type Parte = (typeof PARTES)[number]["id"];

/** Limpar fichas bagunçadas: escolhe quem e o quê. Só o mestre. */
export function JanelaResetar({ mesaId, onFechar, onBackup }: { mesaId: string; onFechar: () => void; onBackup: () => void }) {
  const [pers, setPers] = useState<Personagem[]>([]);
  const [quem, setQuem] = useState<Set<string>>(new Set());
  const [oque, setOque] = useState<Set<Parte>>(new Set(PARTES.filter((p) => p.padrao).map((p) => p.id)));
  const [ocupado, setOcupado] = useState(false);
  const [feito, setFeito] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .from("personagens")
      .select("*")
      .eq("mesa_id", mesaId)
      .eq("arquivado", false)
      .order("ordem")
      .then(({ data }) => {
        const l = (data ?? []) as Personagem[];
        setPers(l);
        setQuem(new Set(l.filter((p) => p.tipo === "pj").map((p) => p.id)));
      });
  }, [mesaId]);

  const alternar = <T,>(s: Set<T>, v: T) => {
    const n = new Set(s);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };

  async function resetar() {
    const nomes = pers.filter((p) => quem.has(p.id)).map((p) => p.nome);
    const partes = PARTES.filter((p) => oque.has(p.id)).map((p) => p.nome.toLowerCase());
    if (!confirm(`Resetar ${partes.join(", ")} de: ${nomes.join(", ")}?\n\nNão dá para desfazer (só com um backup).`)) return;
    setOcupado(true);
    const { error } = await supabase().rpc("resetar_fichas", {
      p_mesa: mesaId,
      p_personagens: [...quem],
      p_status: oque.has("status"),
      p_condicoes: oque.has("condicoes"),
      p_anotacoes: oque.has("anotacoes"),
      p_registro: oque.has("registro"),
      p_rolagens: oque.has("rolagens"),
    });
    setOcupado(false);
    if (error) {
      alert(error.message.includes("resetar_fichas") ? "Rode a migração 0024 no Supabase para usar o reset." : error.message);
      return;
    }
    setFeito(`Pronto: ${nomes.length} ficha${nomes.length === 1 ? "" : "s"} resetada${nomes.length === 1 ? "" : "s"}.`);
  }

  const grupos: { titulo: string; lista: Personagem[] }[] = [
    { titulo: "Agentes", lista: pers.filter((p) => p.tipo === "pj") },
    { titulo: "NPCs e ameaças", lista: pers.filter((p) => p.tipo !== "pj") },
  ].filter((g) => g.lista.length);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center sm:p-4" role="dialog" aria-modal aria-label="Resetar fichas">
      <div className="painel grid max-h-[92dvh] w-full max-w-lg gap-4 overflow-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="titulo text-xl text-ouro-claro">Resetar fichas</h2>
          <button onClick={onFechar} className="text-sm text-nevoa/60 underline underline-offset-2">
            Fechar
          </button>
        </div>

        {feito ? (
          <div className="grid gap-3">
            <p className="text-nevoa">{feito}</p>
            <button
              onClick={() => window.location.reload()}
              className="botao-ouro justify-self-start px-4 py-1.5"
            >
              Recarregar a página
            </button>
            <p className="text-sm text-nevoa/55">Os jogadores veem os status na hora; anotações e rolagens atualizam quando eles voltarem à página.</p>
          </div>
        ) : (
          <>
            <section className="grid gap-2">
              <h3 className="titulo text-ouro-claro">O que limpar</h3>
              {PARTES.map((p) => (
                <label key={p.id} className="flex items-start gap-2.5">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[#b8912f]" checked={oque.has(p.id)} onChange={() => setOque(alternar(oque, p.id))} />
                  <span>
                    <span className="text-nevoa">{p.nome}</span>
                    <span className="block text-sm text-nevoa/55">{p.detalhe}</span>
                  </span>
                </label>
              ))}
            </section>

            {grupos.map((g) => (
              <section key={g.titulo} className="grid gap-1.5">
                <div className="flex items-baseline justify-between">
                  <h3 className="titulo text-ouro-claro">{g.titulo}</h3>
                  <button
                    onClick={() => {
                      const todos = g.lista.every((p) => quem.has(p.id));
                      const n = new Set(quem);
                      for (const p of g.lista) {
                        if (todos) n.delete(p.id);
                        else n.add(p.id);
                      }
                      setQuem(n);
                    }}
                    className="text-sm text-nevoa/60 underline underline-offset-2"
                  >
                    {g.lista.every((p) => quem.has(p.id)) ? "Desmarcar todos" : "Marcar todos"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.lista.map((p) => (
                    <label key={p.id} className={`flex items-center gap-2 rounded-sm border px-2.5 py-1 ${quem.has(p.id) ? "border-ouro/60 bg-ouro/10 text-nevoa" : "border-ouro/20 text-nevoa/60"}`}>
                      <input type="checkbox" className="h-4 w-4 accent-[#b8912f]" checked={quem.has(p.id)} onChange={() => setQuem(alternar(quem, p.id))} />
                      {p.nome}
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <p className="text-sm text-nevoa/55">
              Não dá para desfazer.{" "}
              <button onClick={onBackup} className="text-ouro-claro underline underline-offset-2">
                Fazer um backup antes
              </button>{" "}
              se quiser poder voltar.
            </p>

            <button
              onClick={resetar}
              disabled={ocupado || quem.size === 0 || oque.size === 0}
              className="justify-self-start rounded-sm border border-pv-vivo/70 bg-pv/30 px-4 py-2 text-nevoa hover:bg-pv/45 disabled:opacity-50"
            >
              {ocupado ? "Resetando…" : `Resetar ${quem.size} ficha${quem.size === 1 ? "" : "s"}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
