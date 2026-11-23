"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Cliente único do Supabase no navegador (sessão anônima guardada no localStorage). */
export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (veja o README).",
    );
  }
  cliente = createClient(url, chave, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "paratus-auth" },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return cliente;
}
