"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type StatusConexao = "conectando" | "ao vivo" | "offline";

interface Opcoes<T> {
  /** Identificador único da linha (precisa usar só colunas da chave primária). */
  chave: (linha: Partial<T>) => string;
  /** Ordenação aplicada após cada mudança. */
  ordenar?: (a: T, b: T) => number;
  /** Ligar/desligar (ex.: só para o mestre). */
  ativo?: boolean;
}

/**
 * Lê todas as linhas de uma tabela de uma mesa e mantém tudo sincronizado em tempo real.
 * O banco (RLS) decide o que cada um recebe — tanto na leitura quanto nos eventos.
 */
export function useAoVivo<T extends Record<string, unknown>>(
  tabela: string,
  mesaId: string | null | undefined,
  { chave, ordenar, ativo = true }: Opcoes<T>,
) {
  const [linhas, setLinhas] = useState<T[]>([]);
  const [status, setStatus] = useState<StatusConexao>("conectando");
  const [ultimoEvento, setUltimoEvento] = useState<Date | null>(null);
  const chaveRef = useRef(chave);
  const ordenarRef = useRef(ordenar);
  chaveRef.current = chave;
  ordenarRef.current = ordenar;

  const aplicarOrdem = useCallback((l: T[]) => {
    const o = ordenarRef.current;
    return o ? [...l].sort(o) : l;
  }, []);

  const recarregar = useCallback(async () => {
    if (!mesaId || !ativo) return;
    const { data, error } = await supabase().from(tabela).select("*").eq("mesa_id", mesaId);
    if (!error && data) setLinhas(aplicarOrdem(data as T[]));
  }, [tabela, mesaId, ativo, aplicarOrdem]);

  useEffect(() => {
    if (!mesaId || !ativo) {
      setLinhas([]);
      return;
    }
    const sb = supabase();
    recarregar(); // carrega já, mesmo que o tempo real demore a conectar
    const canal = sb
      .channel(`${tabela}-${mesaId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tabela, filter: `mesa_id=eq.${mesaId}` },
        (payload: RealtimePostgresChangesPayload<T>) => {
          setUltimoEvento(new Date());
          setLinhas((atual) => {
            const k = chaveRef.current;
            if (payload.eventType === "DELETE") {
              const alvo = k(payload.old as Partial<T>);
              return atual.filter((l) => k(l) !== alvo);
            }
            const nova = payload.new as T;
            const alvo = k(nova);
            const existe = atual.some((l) => k(l) === alvo);
            const lista = existe ? atual.map((l) => (k(l) === alvo ? nova : l)) : [...atual, nova];
            return aplicarOrdem(lista);
          });
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setStatus("ao vivo");
          recarregar(); // ao (re)conectar, busca tudo de novo para não perder nada
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("offline");
        }
      });
    return () => {
      sb.removeChannel(canal);
    };
  }, [tabela, mesaId, ativo, recarregar, aplicarOrdem]);

  return { linhas, setLinhas, status, ultimoEvento, recarregar };
}
