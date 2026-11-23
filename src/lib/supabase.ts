"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Cliente único do Supabase no navegador (sessão anônima guardada no localStorage). */
export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Aceita o nome novo do Supabase (PUBLISHABLE_KEY) e o antigo (ANON_KEY).
  const chave =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veja o README).",
    );
  }
  cliente = createClient(url, chave, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "paratus-auth" },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return cliente;
}
