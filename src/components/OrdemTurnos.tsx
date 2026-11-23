"use client";

import { Nome } from "@/components/Nome";
import { useAoVivo } from "@/lib/aoVivo";
import { ordenarTurnos, useCombateAtivo, type ParticipantePublico } from "@/lib/combate";
import { pct } from "@/lib/regras";

type L<T> = T & Record<string, unknown>;

/** Visão do jogador: ordem de turnos ao vivo, sem PV das ameaças (a menos que o mestre libere). */
export function OrdemTurnos({ mesaId, meuPersonagem }: { mesaId: string; meuPersonagem: string | null }) {
  const { ativo } = useCombateAtivo(mesaId);
  const publico = useAoVivo<L<ParticipantePublico>>("participantes_publico", mesaId, { chave: (p) => String(p.id) });
  const lista = ordenarTurnos(publico.linhas.filter((p) => p.combate_id === ativo?.id));
  const vez = lista.find((p) => p.id === ativo?.vez_id);
  const minhaVez = !!vez && vez.personagem_id === meuPersonagem;

  if (!ativo) {
    return (
      <section className="folha px-4 py-8 text-center">
        <h1 className="titulo text-2xl text-marinho">Combate</h1>
        <p className="mt-2 italic text-tinta-suave">Nenhum combate em andamento. Quando o mestre começar um, a ordem de turnos aparece aqui.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-3" aria-label="Ordem de turnos">
      <div className={`folha px-4 py-3 ${minhaVez ? "!border-ouro shadow-[0_0_0_2px_var(--color-ouro)]" : ""}`}>
        <h1 className="titulo text-2xl text-marinho">{ativo.nome}</h1>
        <p className="text-tinta-suave">
          Rodada <span className="numeros text-marinho">{ativo.rodada}</span>
          {vez ? `. Vez de ${vez.nome}.` : ". Aguardando o mestre começar."}
        </p>
        {minhaVez && <p className="titulo mt-2 rounded-sm bg-marinho px-3 py-2 text-center text-lg text-ouro-claro">É a sua vez!</p>}
      </div>

      <ol className="folha divide-y divide-ouro-escuro/20 px-2" aria-live="polite">
        {lista.map((p, i) => {
          const naVez = p.id === ativo.vez_id;
          const eu = p.personagem_id === meuPersonagem && !!meuPersonagem;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 px-2 py-2.5 ${naVez ? "rounded-sm bg-ouro-claro/35" : ""} ${p.derrotado ? "opacity-45" : ""}`}
              aria-current={naVez ? "step" : undefined}
            >
              <span className="numeros w-6 text-center text-tinta-suave">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className={`titulo truncate ${p.derrotado ? "line-through" : "text-marinho"}`}>
                  <Nome>{p.nome}</Nome>
                  {eu && <span className="ml-1.5 text-sm italic text-ouro-escuro">você</span>}
                  {p.derrotado && <span className="ml-1.5 text-sm italic text-tinta-suave">derrotado</span>}
                </p>
                {p.pv_max != null && p.tipo !== "pj" && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="trilho flex-1" style={{ height: 6 }}>
                      <div className="preenchimento bg-pv" style={{ width: `${pct(p.pv_atual ?? 0, p.pv_max)}%` }} />
                    </div>
                    <span className="numeros text-sm text-tinta-suave">
                      {p.pv_atual}/{p.pv_max}
                    </span>
                  </div>
                )}
                {p.condicoes.length > 0 && <p className="text-sm italic text-tinta-suave">{p.condicoes.join(", ")}</p>}
              </div>
              {naVez && <span className="titulo rounded-sm bg-marinho px-2 py-0.5 text-xs text-ouro-claro">NA VEZ</span>}
              {p.iniciativa != null && <span className="numeros w-8 text-right text-tinta-suave">{p.iniciativa}</span>}
            </li>
          );
        })}
        {lista.length === 0 && <li className="px-2 py-4 italic text-tinta-suave">O mestre está montando o combate…</li>}
      </ol>
    </section>
  );
}
