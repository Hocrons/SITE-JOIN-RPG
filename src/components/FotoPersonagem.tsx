"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  mesaId: string;
  personagemId: string;
  nome: string;
  caminho: string | null;
  tamanho?: number;
  editavel?: boolean;
  onTrocar?: (caminho: string) => void;
}

/** Medalhão com a foto (bucket privado; link assinado) ou as iniciais. */
export function FotoPersonagem({ mesaId, personagemId, nome, caminho, tamanho = 64, editavel, onTrocar }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    if (!caminho) {
      setUrl(null);
      return;
    }
    supabase()
      .storage.from("midia")
      .createSignedUrl(caminho, 60 * 60)
      .then(({ data }) => vivo && setUrl(data?.signedUrl ?? null));
    return () => {
      vivo = false;
    };
  }, [caminho]);

  async function enviar(arquivo: File) {
    if (!onTrocar) return;
    if (arquivo.size > 5 * 1024 * 1024) {
      alert("A foto precisa ter até 5 MB.");
      return;
    }
    setEnviando(true);
    const ext = (arquivo.name.split(".").pop() || "jpg").toLowerCase();
    const destino = `personagens/${mesaId}/${personagemId}/foto-${Date.now()}.${ext}`;
    const { error } = await supabase().storage.from("midia").upload(destino, arquivo, { upsert: true });
    setEnviando(false);
    if (error) return alert(`Não foi possível enviar a foto: ${error.message}`);
    onTrocar(destino);
  }

  const iniciais = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const medalhao = (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-ouro selo-imperial !border-ouro shadow-[inset_0_0_0_2px_rgba(243,232,204,0.6)]"
      style={{ width: tamanho, height: tamanho }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Foto de ${nome}`} className="h-full w-full object-cover" />
      ) : (
        <span className="titulo" style={{ fontSize: tamanho * 0.36 }}>
          {iniciais}
        </span>
      )}
      {enviando && <span className="absolute inset-0 grid place-items-center bg-marinho/70 text-xs">enviando…</span>}
    </span>
  );

  if (!editavel) return medalhao;

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      className="group relative rounded-full"
      title="Trocar foto"
      aria-label="Trocar foto"
    >
      {medalhao}
      <span className="absolute -bottom-1 -right-1 rounded-full border border-ouro-escuro bg-pergaminho-claro px-1.5 text-xs text-marinho">
        foto
      </span>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) enviar(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}
