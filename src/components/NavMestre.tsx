"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/mestre", rotulo: "Escudo" },
  { href: "/mestre/combate", rotulo: "Combate" },
];

/** Abas da Área do Mestre. */
export function NavMestre({ emCombate }: { emCombate?: boolean }) {
  const atual = usePathname();
  return (
    <nav aria-label="Área do Mestre" className="flex gap-1 rounded-sm border border-ouro/25 p-0.5">
      {LINKS.map((l) => {
        const ativo = atual === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={ativo ? "page" : undefined}
            className={`titulo relative rounded-sm px-3 py-1 text-sm ${ativo ? "bg-ouro/90 text-marinho" : "text-ouro-claro hover:bg-ouro/10"}`}
          >
            {l.rotulo}
            {l.href === "/mestre/combate" && emCombate && !ativo && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-pv-vivo" aria-label="combate em andamento" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
