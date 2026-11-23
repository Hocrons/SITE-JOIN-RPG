"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import type { Membro, Mesa } from "./tipos";

const CHAVE_MESA = "paratus.mesa";

interface EstadoSessao {
  carregando: boolean;
  erro: string | null;
  userId: string | null;
  membro: Membro | null;       // vínculo com a mesa atual
  mesa: Mesa | null;
  minhasMesas: Membro[];
  eMestre: boolean;
  entrar: (codigo: string, pin: string, personagemId: string | null) => Promise<string | null>;
  criarMesa: (nome: string, codigo: string, pin: string) => Promise<string | null>;
  trocarMesa: (mesaId: string) => void;
  sair: () => Promise<void>;
  recarregar: () => Promise<void>;
}

const Ctx = createContext<EstadoSessao | null>(null);

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [minhasMesas, setMinhasMesas] = useState<Membro[]>([]);
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [mesaAtualId, setMesaAtualId] = useState<string | null>(null);

  const garantirUsuario = useCallback(async (): Promise<string> => {
    const sb = supabase();
    const { data } = await sb.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const { data: novo, error } = await sb.auth.signInAnonymously();
    if (error || !novo.user) {
      throw new Error(
        "Não consegui criar a sessão. Confira se o login anônimo está ativado no Supabase.",
      );
    }
    return novo.user.id;
  }, []);

  const recarregar = useCallback(async () => {
    try {
      const uid = await garantirUsuario();
      setUserId(uid);
      const sb = supabase();
      const { data: vinculos, error } = await sb
        .from("membros")
        .select("*")
        .eq("user_id", uid)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      const lista = (vinculos ?? []) as Membro[];
      setMinhasMesas(lista);

      const salvo = typeof window !== "undefined" ? localStorage.getItem(CHAVE_MESA) : null;
      const atual = lista.find((m) => m.mesa_id === salvo) ?? lista[0] ?? null;
      setMesaAtualId(atual?.mesa_id ?? null);
      if (atual) {
        const { data: m } = await sb.from("mesas").select("*").eq("id", atual.mesa_id).single();
        setMesa((m as Mesa) ?? null);
      } else {
        setMesa(null);
      }
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, [garantirUsuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // A mesa em si (nome, Âncora global) também é ao vivo.
  useEffect(() => {
    if (!mesaAtualId) return;
    const sb = supabase();
    const canal = sb
      .channel(`mesa-${mesaAtualId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mesas", filter: `id=eq.${mesaAtualId}` },
        (payload) => setMesa(payload.new as Mesa),
      )
      .subscribe();
    return () => {
      sb.removeChannel(canal);
    };
  }, [mesaAtualId]);

  const entrar = useCallback(
    async (codigo: string, pin: string, personagemId: string | null) => {
      await garantirUsuario();
      const { data, error } = await supabase().rpc("entrar_mesa", {
        p_codigo: codigo,
        p_pin: pin,
        p_personagem: personagemId,
      });
      if (error) return error.message;
      if (!data?.ok) return (data?.erro as string) ?? "Não foi possível entrar.";
      localStorage.setItem(CHAVE_MESA, data.mesa_id);
      await recarregar();
      return null;
    },
    [garantirUsuario, recarregar],
  );

  const criarMesa = useCallback(
    async (nome: string, codigo: string, pin: string) => {
      await garantirUsuario();
      const { data, error } = await supabase().rpc("criar_mesa", {
        p_nome: nome,
        p_codigo: codigo,
        p_pin_mestre: pin,
      });
      if (error) {
        if (error.message.includes("duplicate")) return "Já existe uma mesa com esse código.";
        if (error.message.includes("codigo_check")) return "Código: 3 a 20 letras, números ou hífen.";
        return error.message;
      }
      localStorage.setItem(CHAVE_MESA, data as string);
      await recarregar();
      return null;
    },
    [garantirUsuario, recarregar],
  );

  const trocarMesa = useCallback(
    (mesaId: string) => {
      localStorage.setItem(CHAVE_MESA, mesaId);
      setCarregando(true);
      recarregar();
    },
    [recarregar],
  );

  const sair = useCallback(async () => {
    if (mesaAtualId) await supabase().rpc("sair_mesa", { p_mesa: mesaAtualId });
    localStorage.removeItem(CHAVE_MESA);
    await recarregar();
  }, [mesaAtualId, recarregar]);

  const membro = minhasMesas.find((m) => m.mesa_id === mesaAtualId) ?? null;

  const valor = useMemo<EstadoSessao>(
    () => ({
      carregando,
      erro,
      userId,
      membro,
      mesa,
      minhasMesas,
      eMestre: membro?.papel === "mestre",
      entrar,
      criarMesa,
      trocarMesa,
      sair,
      recarregar,
    }),
    [carregando, erro, userId, membro, mesa, minhasMesas, entrar, criarMesa, trocarMesa, sair, recarregar],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSessao(): EstadoSessao {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSessao precisa estar dentro de <SessaoProvider>");
  return v;
}
