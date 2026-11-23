"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brasao } from "@/components/Brasao";
import { supabase } from "@/lib/supabase";
import { useSessao } from "@/lib/sessao";

interface OpcaoPersonagem {
  id: string;
  nome: string;
  jogador: string | null;
}

export default function Entrada() {
  const router = useRouter();
  const { carregando, erro: erroSessao, membro, mesa, minhasMesas, entrar, trocarMesa } = useSessao();

  const [codigo, setCodigo] = useState("");
  const [mesaEncontrada, setMesaEncontrada] = useState<{ id: string; nome: string; personagens: OpcaoPersonagem[] } | null>(null);
  const [escolha, setEscolha] = useState<OpcaoPersonagem | "mestre" | null>(null);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function buscarMesa(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const { data, error } = await supabase().rpc("mesa_por_codigo", { p_codigo: codigo });
      if (error) throw error;
      const linha = (data as { mesa_id: string; nome: string; personagens: OpcaoPersonagem[] }[])?.[0];
      if (!linha) {
        setErro("Nenhuma mesa com esse código.");
        return;
      }
      setMesaEncontrada({ id: linha.mesa_id, nome: linha.nome, personagens: linha.personagens });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar a mesa.");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarPin(e: React.FormEvent) {
    e.preventDefault();
    if (!escolha) return;
    setOcupado(true);
    setErro(null);
    const falha = await entrar(codigo, pin, escolha === "mestre" ? null : escolha.id);
    setOcupado(false);
    if (falha) {
      setErro(falha);
      setPin("");
      return;
    }
    router.push("/mesa");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-10">
      <Brasao tamanho={92} />
      <h1 className="titulo mt-4 text-center text-3xl font-bold text-marinho">PARATUS</h1>
      <p className="serifa mt-1 text-center text-lg italic text-tinta-suave">
        onde a membrana da realidade é fina
      </p>

      {carregando && <p className="mt-10 text-tinta-suave">Abrindo os portões…</p>}
      {erroSessao && <p className="mt-6 rounded bg-pv/10 p-3 text-sm text-pv">{erroSessao}</p>}

      {!carregando && membro && mesa && !mesaEncontrada && (
        <div className="moldura mt-8 w-full p-5 text-center">
          <p className="text-sm text-tinta-suave">Você está na mesa</p>
          <p className="titulo text-xl text-marinho">{mesa.nome}</p>
          <p className="serifa text-lg">como {membro.nome_exibicao}</p>
          <button className="botao-ouro mt-4 w-full py-3" onClick={() => router.push("/mesa")}>
            CONTINUAR
          </button>
          {minhasMesas.length > 1 && (
            <div className="mt-4 text-left text-sm">
              <p className="mb-1 text-tinta-suave">Outras mesas:</p>
              {minhasMesas
                .filter((m) => m.mesa_id !== mesa.id)
                .map((m) => (
                  <button key={m.mesa_id} className="block underline" onClick={() => trocarMesa(m.mesa_id)}>
                    {m.nome_exibicao} — trocar
                  </button>
                ))}
            </div>
          )}
          <p className="mt-4 text-xs text-tinta-suave">Ou entre em outra mesa / personagem abaixo.</p>
        </div>
      )}

      {!carregando && !mesaEncontrada && (
        <form onSubmit={buscarMesa} className="moldura mt-6 w-full p-5">
          <label className="titulo mb-2 block text-sm text-marinho">CÓDIGO DA MESA</label>
          <input
            className="campo w-full text-center text-xl uppercase tracking-[0.3em]"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="PARATUS"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <button className="botao-ouro mt-4 w-full py-3" disabled={!codigo || ocupado}>
            {ocupado ? "BUSCANDO…" : "ENTRAR"}
          </button>
        </form>
      )}

      {mesaEncontrada && !escolha && (
        <section className="mt-6 w-full">
          <h2 className="titulo mb-3 text-center text-lg text-marinho">{mesaEncontrada.nome}</h2>
          <p className="serifa mb-4 text-center text-lg">Quem é você?</p>
          <div className="grid gap-3">
            {mesaEncontrada.personagens.map((p) => (
              <button
                key={p.id}
                className="moldura flex items-center justify-between px-4 py-3 text-left transition hover:-translate-y-0.5"
                onClick={() => setEscolha(p)}
              >
                <span className="titulo text-lg text-marinho">{p.nome}</span>
                <span className="text-sm text-tinta-suave">{p.jogador}</span>
              </button>
            ))}
            <button
              className="mt-2 rounded-md border border-ouro-escuro bg-marinho px-4 py-3 text-left text-ouro-claro"
              onClick={() => setEscolha("mestre")}
            >
              <span className="titulo">Sou o Mestre</span>
            </button>
          </div>
          <button className="mt-4 w-full text-sm underline" onClick={() => setMesaEncontrada(null)}>
            ← outro código
          </button>
        </section>
      )}

      {mesaEncontrada && escolha && (
        <form onSubmit={confirmarPin} className="moldura mt-6 w-full p-5 text-center">
          <p className="text-sm text-tinta-suave">PIN de</p>
          <p className="titulo mb-4 text-xl text-marinho">{escolha === "mestre" ? "Mestre" : escolha.nome}</p>
          <input
            className="campo w-full text-center text-2xl tracking-[0.5em]"
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button className="botao-ouro mt-4 w-full py-3" disabled={pin.length < 4 || ocupado}>
            {ocupado ? "VERIFICANDO…" : "CONFIRMAR"}
          </button>
          <button
            type="button"
            className="mt-3 text-sm underline"
            onClick={() => {
              setEscolha(null);
              setPin("");
              setErro(null);
            }}
          >
            ← voltar
          </button>
        </form>
      )}

      {erro && <p className="mt-4 w-full rounded bg-pv/10 p-3 text-center text-sm text-pv">{erro}</p>}

      <Link href="/nova-mesa" className="mt-auto pt-10 text-sm text-tinta-suave underline">
        Criar uma nova mesa (outra campanha)
      </Link>
    </main>
  );
}
