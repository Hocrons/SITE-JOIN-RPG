"use client";

import { useEffect, useState } from "react";
import { useAoVivo } from "@/lib/aoVivo";
import { supabase } from "@/lib/supabase";
import type { Personagem } from "@/lib/tipos";

type L<T> = T & Record<string, unknown>;
interface PinLegivel {
  mesa_id: string;
  personagem_id: string | null;
  pin: string;
  atualizado_em: string;
}

function pinAleatorio() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(n[0] % 10000).padStart(4, "0");
}

/** Tabela com o PIN de cada perfil da mesa: ver, copiar, trocar ou gerar novos. Só o mestre abre. */
export function JanelaPins({ mesaId, onFechar }: { mesaId: string; onFechar: () => void }) {
  const personagens = useAoVivo<L<Personagem>>("personagens", mesaId, {
    chave: (p) => String(p.id),
    ordenar: (a, b) => a.ordem - b.ordem,
  });
  const [pins, setPins] = useState<PinLegivel[]>([]);
  const [mostrar, setMostrar] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const { data, error } = await supabase().from("pins_legiveis").select("*").eq("mesa_id", mesaId);
    if (error) setAviso(error.message.includes("pins_legiveis") ? "Rode a migração 0016 no Supabase para ver os PINs." : error.message);
    else setPins((data ?? []) as PinLegivel[]);
  }
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesaId]);

  const linhas: { id: string | null; nome: string; detalhe: string }[] = [
    { id: null, nome: "Mestre", detalhe: "você" },
    ...personagens.linhas
      .filter((p) => p.tipo === "pj" && !p.arquivado)
      .map((p) => ({ id: p.id, nome: p.nome, detalhe: p.jogador ?? "" })),
  ];
  const pinDe = (id: string | null) => pins.find((x) => x.personagem_id === id)?.pin;

  async function definir(id: string | null, pin: string) {
    const { error } = await supabase().rpc("definir_pin", { p_mesa: mesaId, p_pin: pin, p_personagem: id });
    if (error) {
      alert(error.message);
      return false;
    }
    return true;
  }

  async function salvar(id: string | null) {
    const pin = valor.trim();
    if (pin.length < 4) return alert("O PIN precisa de pelo menos 4 caracteres.");
    if (await definir(id, pin)) {
      setEditando(null);
      setValor("");
      setMostrar(true);
      await carregar();
    }
  }

  async function gerarTodos() {
    if (!confirm("Gerar PINs novos para todos os jogadores? Os PINs antigos param de funcionar (quem já está dentro continua conectado). O seu PIN de mestre não muda.")) return;
    setOcupado(true);
    for (const l of linhas) if (l.id) await definir(l.id, pinAleatorio());
    setOcupado(false);
    setMostrar(true);
    await carregar();
  }

  async function copiarTudo() {
    const texto = linhas.map((l) => `${l.nome}: ${pinDe(l.id) ?? "?"}`).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Lista copiada.");
    } catch {
      setAviso("Não consegui copiar; selecione a tabela e copie à mão.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center sm:p-4" role="dialog" aria-modal aria-label="PINs de acesso">
      <div className="painel grid max-h-[92dvh] w-full max-w-lg gap-3 overflow-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="titulo text-xl text-ouro-claro">PINs de acesso</h2>
          <button onClick={onFechar} className="px-1 text-2xl leading-none text-nevoa/60" aria-label="Fechar">
            ×
          </button>
        </div>
        <p className="text-sm text-nevoa/65">
          Só você vê esta tabela. Trocar um PIN não desconecta quem já está dentro. PINs definidos antes desta versão aparecem como
          “desconhecido” até serem trocados.
        </p>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ouro/20 text-left text-sm text-nevoa/55">
              <th className="py-1.5 font-normal">Perfil</th>
              <th className="py-1.5 font-normal">PIN</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const pin = pinDe(l.id);
              const chave = l.id ?? "mestre";
              return (
                <tr key={chave} className="border-b border-ouro/10">
                  <td className="py-2 pr-2">
                    <span className="titulo block leading-tight text-ouro-claro">{l.nome}</span>
                    {l.detalhe && <span className="text-sm italic text-nevoa/50">{l.detalhe}</span>}
                  </td>
                  <td className="py-2 pr-2">
                    {editando === chave ? (
                      <form
                        className="flex gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          salvar(l.id);
                        }}
                      >
                        <input
                          autoFocus
                          inputMode="numeric"
                          autoComplete="off"
                          value={valor}
                          onChange={(e) => setValor(e.target.value)}
                          className="numeros w-24 rounded-sm border border-ouro/30 bg-noite px-2 py-1 text-center text-lg text-nevoa"
                          aria-label={`Novo PIN de ${l.nome}`}
                        />
                        <button className="rounded-sm bg-ouro/90 px-2.5 text-sm text-marinho">Salvar</button>
                      </form>
                    ) : pin ? (
                      <span className="numeros text-xl tracking-[0.2em] text-nevoa">{mostrar ? pin : "••••"}</span>
                    ) : (
                      <span className="text-sm italic text-nevoa/45">desconhecido</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {editando === chave ? (
                      <button onClick={() => setEditando(null)} className="text-sm text-nevoa/60 underline underline-offset-2">
                        Cancelar
                      </button>
                    ) : (
                      <span className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditando(chave);
                            setValor("");
                          }}
                          className="rounded-sm border border-ouro/30 px-2.5 py-1 text-sm text-ouro-claro hover:bg-ouro/10"
                        >
                          Trocar
                        </button>
                        {l.id && (
                          <button
                            onClick={async () => {
                              if (await definir(l.id, pinAleatorio())) {
                                setMostrar(true);
                                carregar();
                              }
                            }}
                            className="rounded-sm border border-ouro/30 px-2 py-1 text-sm text-ouro-claro hover:bg-ouro/10"
                            title="Gerar um PIN aleatório"
                            aria-label={`Gerar PIN aleatório para ${l.nome}`}
                          >
                            ⟳
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMostrar(!mostrar)} className="rounded-sm border border-ouro/30 px-3 py-1.5 text-ouro-claro hover:bg-ouro/10">
            {mostrar ? "Esconder PINs" : "Mostrar PINs"}
          </button>
          <button onClick={copiarTudo} className="rounded-sm border border-ouro/30 px-3 py-1.5 text-ouro-claro hover:bg-ouro/10">
            Copiar lista
          </button>
          <button onClick={gerarTodos} disabled={ocupado} className="botao-ouro ml-auto px-3 py-1.5">
            {ocupado ? "Gerando…" : "PINs novos para todos"}
          </button>
        </div>
        {aviso && (
          <p className="text-sm text-pd-vivo" role="status">
            {aviso}
          </p>
        )}
      </div>
    </div>
  );
}
