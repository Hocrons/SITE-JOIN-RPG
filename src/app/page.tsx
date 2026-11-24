"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brasao } from "@/components/Brasao";
import { Sigilo } from "@/components/Sigilo";
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

  const [outraMesa, setOutraMesa] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [mesaEncontrada, setMesaEncontrada] = useState<{ id: string; nome: string; personagens: OpcaoPersonagem[] } | null>(null);
  const [escolha, setEscolha] = useState<OpcaoPersonagem | "mestre" | null>(null);
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const jaNaMesa = !!(membro && mesa) && !outraMesa && !mesaEncontrada;

  async function buscarMesa(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const { data, error } = await supabase().rpc("mesa_por_codigo", { p_codigo: codigo });
      if (error) throw error;
      const linha = (data as { mesa_id: string; nome: string; personagens: OpcaoPersonagem[] }[])?.[0];
      if (!linha) {
        setErro("Nenhuma mesa com esse código. Confira com o mestre.");
        return;
      }
      setMesaEncontrada({ id: linha.mesa_id, nome: linha.nome, personagens: linha.personagens });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível buscar a mesa.");
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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center px-6 pb-8 pt-12">
      <div className="relative grid place-items-center">
        <Sigilo tamanho={260} rasgo={false} className="pointer-events-none absolute text-ouro/15" />
        <Brasao tamanho={150} louros className="surgir relative drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)]" />
      </div>
      <h1 className="titulo pincelada mt-5 text-center text-[2.75rem] leading-none tracking-[0.18em] text-marinho">PARATUS</h1>
      <div className="meandro mt-4 w-40" aria-hidden />
      <p className="mt-3 text-center text-lg italic text-tinta-suave">onde a membrana da realidade é fina</p>

      <div className="mt-8 w-full">
        {carregando && <p className="text-center italic text-tinta-suave">Abrindo os portões…</p>}
        {erroSessao && <p className="rounded-sm border border-pv/40 bg-pv/10 p-3 text-pv">{erroSessao}</p>}

        {/* Já está numa mesa */}
        {!carregando && jaNaMesa && (
          <div className="text-center">
            <p className="text-tinta-suave">
              Você está em <span className="titulo text-marinho">{mesa!.nome}</span> como{" "}
              <span className="titulo text-marinho">{membro!.nome_exibicao}</span>.
            </p>
            <button className="botao-ouro mt-4 w-full py-3" onClick={() => router.push("/mesa")}>
              Voltar à mesa
            </button>
            {minhasMesas
              .filter((m) => m.mesa_id !== mesa!.id)
              .map((m) => (
                <button key={m.mesa_id} className="mt-3 block w-full text-tinta-suave underline" onClick={() => trocarMesa(m.mesa_id)}>
                  Ir para a mesa de {m.nome_exibicao}
                </button>
              ))}
            <button className="mt-3 text-tinta-suave underline underline-offset-2" onClick={() => setOutraMesa(true)}>
              Entrar com outro código ou personagem
            </button>
          </div>
        )}

        {/* 1. Código */}
        {!carregando && !jaNaMesa && !mesaEncontrada && (
          <form onSubmit={buscarMesa}>
            <label htmlFor="codigo" className="titulo mb-2 block text-center text-marinho">
              Código da mesa
            </label>
            <input
              id="codigo"
              className="campo numeros w-full text-center text-2xl uppercase tracking-[0.3em]"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ""))}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="botao-ouro mt-3 w-full py-3" disabled={!codigo || ocupado}>
              {ocupado ? "Procurando a mesa…" : "Procurar mesa"}
            </button>
          </form>
        )}

        {/* 2. Quem é você */}
        {mesaEncontrada && !escolha && (
          <section>
            <p className="mb-3 text-center text-lg">
              <span className="titulo text-marinho">{mesaEncontrada.nome}</span>
              <span className="italic text-tinta-suave">. Quem é você?</span>
            </p>
            <ul className="folha divide-y divide-ouro-escuro/20">
              {mesaEncontrada.personagens.map((p) => (
                <li key={p.id}>
                  <button
                    className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left hover:bg-ouro-claro/20"
                    onClick={() => setEscolha(p)}
                  >
                    <span className="titulo text-lg text-marinho">{p.nome}</span>
                    <span className="truncate italic text-tinta-suave">{p.jogador}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="titulo mt-3 w-full rounded-sm border border-ouro-escuro bg-marinho px-4 py-3 text-ouro-claro hover:bg-marinho-medio"
              onClick={() => setEscolha("mestre")}
            >
              Sou o mestre
            </button>
            <button
              className="mt-4 w-full text-tinta-suave underline underline-offset-2"
              onClick={() => {
                setMesaEncontrada(null);
                setErro(null);
              }}
            >
              Usar outro código
            </button>
          </section>
        )}

        {/* 3. PIN */}
        {mesaEncontrada && escolha && (
          <form onSubmit={confirmarPin} className="text-center">
            <label htmlFor="pin" className="block">
              <span className="italic text-tinta-suave">PIN de </span>
              <span className="titulo text-xl text-marinho">{escolha === "mestre" ? "Mestre" : escolha.nome}</span>
            </label>
            <input
              id="pin"
              className="campo numeros mt-3 w-full text-center text-3xl tracking-[0.5em]"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <button className="botao-ouro mt-3 w-full py-3" disabled={pin.length < 4 || ocupado}>
              {ocupado ? "Conferindo…" : "Entrar na mesa"}
            </button>
            <button
              type="button"
              className="mt-4 text-tinta-suave underline underline-offset-2"
              onClick={() => {
                setEscolha(null);
                setPin("");
                setErro(null);
              }}
            >
              Escolher outro personagem
            </button>
          </form>
        )}

        {erro && (
          <p role="alert" className="mt-4 rounded-sm border border-pv/40 bg-pv/10 p-3 text-center text-pv">
            {erro}
          </p>
        )}
      </div>

      <Link href="/nova-mesa" className="mt-auto pt-12 text-tinta-suave underline underline-offset-2">
        Criar uma mesa para outra campanha
      </Link>
    </main>
  );
}
