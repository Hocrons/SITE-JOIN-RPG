"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export interface Ponto {
  x: number;
  y: number;
}
export interface Ping extends Ponto {
  id: string;
  cor: string;
  nome: string;
  em: number;
}
export interface Regua {
  de: Ponto;
  ate: Ponto;
  cor: string;
  nome: string;
}

export const DURACAO_PING = 1800;
const CORES = ["#5fb37c", "#4b9be5", "#e0a92e", "#c86bd8", "#e07a41", "#41c6c0"];
/** Cor estável por pessoa (o mestre é sempre dourado). */
export function corDe(chave: string | null | undefined, eMestre: boolean) {
  if (eMestre) return "#e2c277";
  let h = 0;
  for (const c of chave ?? "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

/**
 * Sinais passageiros da mesa (não são gravados): pings e réguas, por broadcast.
 * Cada cena tem o seu (quem está noutra cena não vê).
 */
export function useSinais(mesaId: string | null | undefined, cenaId: string | null | undefined, eu: { id: string; nome: string; cor: string }) {
  const [pings, setPings] = useState<Ping[]>([]);
  const [reguas, setReguas] = useState<Record<string, Regua & { ate_ms: number }>>({});
  const canal = useRef<ReturnType<ReturnType<typeof supabase>["channel"]> | null>(null);
  const euRef = useRef(eu);
  euRef.current = eu;

  useEffect(() => {
    if (!mesaId || !cenaId) return;
    const sb = supabase();
    const c = sb
      .channel(`sinais-${mesaId}-${cenaId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "ping" }, ({ payload }) => setPings((l) => [...l, { ...(payload as Ping), em: Date.now() }]))
      .on("broadcast", { event: "regua" }, ({ payload }) => {
        const p = payload as { quem: string; regua: Regua | null };
        setReguas((r) => {
          const n = { ...r };
          if (p.regua) n[p.quem] = { ...p.regua, ate_ms: Date.now() + 4000 };
          else delete n[p.quem];
          return n;
        });
      })
      .subscribe();
    canal.current = c;
    return () => {
      sb.removeChannel(c);
      canal.current = null;
      setPings([]);
      setReguas({});
    };
  }, [mesaId, cenaId]);

  // limpa pings velhos e réguas abandonadas
  useEffect(() => {
    if (!pings.length && !Object.keys(reguas).length) return;
    const id = setInterval(() => {
      const agora = Date.now();
      setPings((l) => (l.some((p) => agora - p.em > DURACAO_PING) ? l.filter((p) => agora - p.em <= DURACAO_PING) : l));
      setReguas((r) => {
        const vivos = Object.entries(r).filter(([, v]) => v.ate_ms > agora);
        return vivos.length === Object.keys(r).length ? r : Object.fromEntries(vivos);
      });
    }, 500);
    return () => clearInterval(id);
  }, [pings.length, reguas]);

  const pingar = useCallback((p: Ponto) => {
    const e = euRef.current;
    const ping = { id: `${e.id}-${Date.now()}`, x: p.x, y: p.y, cor: e.cor, nome: e.nome, em: Date.now() };
    setPings((l) => [...l, ping]);
    canal.current?.send({ type: "broadcast", event: "ping", payload: ping });
  }, []);

  const ultimo = useRef(0);
  /** Mostra a minha régua para todos (null = guardei a régua). */
  const transmitirRegua = useCallback((r: { de: Ponto; ate: Ponto } | null) => {
    const agora = Date.now();
    if (r && agora - ultimo.current < 70) return;
    ultimo.current = agora;
    const e = euRef.current;
    canal.current?.send({ type: "broadcast", event: "regua", payload: { quem: e.id, regua: r ? { ...r, cor: e.cor, nome: e.nome } : null } });
  }, []);

  return { pings, reguas: Object.values(reguas), pingar, transmitirRegua };
}

/** Distância na grade, em quadrados (diagonal conta como 1). */
export function quadradosEntre(a: Ponto, b: Ponto, tamanho: number) {
  return Math.round(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / tamanho);
}
