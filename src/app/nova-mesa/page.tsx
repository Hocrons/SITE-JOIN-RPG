"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brasao } from "@/components/Brasao";
import { useSessao } from "@/lib/sessao";

export default function NovaMesa() {
  const router = useRouter();
  const { criarMesa } = useSessao();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const falha = await criarMesa(nome, codigo, pin);
    setOcupado(false);
    if (falha) return setErro(falha);
    router.push("/mesa");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-10">
      <Brasao tamanho={72} louros />
      <h1 className="titulo mt-3 text-3xl text-marinho">Nova mesa</h1>
      <form onSubmit={enviar} className="folha mt-6 grid w-full gap-4 p-5">
        <label className="grid gap-1 text-sm">
          Nome da campanha
          <input className="campo" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          Código de entrada (o que os jogadores digitam)
          <input
            className="campo uppercase tracking-widest"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            minLength={3}
            maxLength={20}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          PIN do mestre (mínimo 4 caracteres)
          <input className="campo" type="password" value={pin} onChange={(e) => setPin(e.target.value)} minLength={4} required />
        </label>
        <button className="botao-ouro py-3" disabled={ocupado}>
          {ocupado ? "Criando a mesa…" : "Criar mesa"}
        </button>
        {erro && <p className="rounded bg-pv/10 p-2 text-sm text-pv">{erro}</p>}
      </form>
      <Link href="/" className="mt-6 text-sm underline">
        Voltar à entrada
      </Link>
    </main>
  );
}
