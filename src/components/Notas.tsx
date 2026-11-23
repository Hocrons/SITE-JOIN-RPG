"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  valor: string;
  onSalvar: (texto: string) => Promise<void>;
}

/** Bloco de notas que salva sozinho (1 s depois de parar de digitar). */
export function Notas({ valor, onSalvar }: Props) {
  const [texto, setTexto] = useState(valor);
  const [estado, setEstado] = useState<"salvo" | "editando" | "salvando" | "erro">("salvo");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoSalvo = useRef(valor);

  // Se mudou em outro aparelho e não estou digitando, atualiza.
  useEffect(() => {
    if (estado === "salvo" && valor !== ultimoSalvo.current) {
      setTexto(valor);
      ultimoSalvo.current = valor;
    }
  }, [valor, estado]);

  function mudar(t: string) {
    setTexto(t);
    setEstado("editando");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setEstado("salvando");
      try {
        await onSalvar(t);
        ultimoSalvo.current = t;
        setEstado("salvo");
      } catch {
        setEstado("erro");
      }
    }, 1000);
  }

  const aviso = {
    salvo: "Salvo",
    editando: "Digitando…",
    salvando: "Salvando…",
    erro: "Não salvou. Confira a conexão e digite de novo.",
  }[estado];

  return (
    <section className="folha flex min-h-[60dvh] flex-col px-4 pb-4 pt-3" aria-label="Bloco de notas">
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="titulo text-2xl text-marinho">Notas</h1>
        <span className={`text-sm italic ${estado === "erro" ? "text-pv" : "text-tinta-suave"}`} aria-live="polite">
          {aviso}
        </span>
      </div>
      <textarea
        value={texto}
        onChange={(e) => mudar(e.target.value)}
        placeholder="Pistas, nomes, suspeitas, o que o NPC disse…"
        aria-label="Suas anotações"
        className="min-h-0 flex-1 resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:italic placeholder:text-tinta-suave/60"
        style={{
          backgroundImage: "linear-gradient(transparent calc(1.75rem - 1px), rgba(126,97,24,0.18) 1px)",
          backgroundSize: "100% 1.75rem",
          lineHeight: "1.75rem",
        }}
      />
      <p className="mt-2 text-sm italic text-tinta-suave">Só você e o mestre veem estas notas.</p>
    </section>
  );
}
