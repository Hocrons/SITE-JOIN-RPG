import type { StatusConexao } from "@/lib/aoVivo";

export function Conexao({ status, escuro }: { status: StatusConexao; escuro: boolean }) {
  const texto = status === "ao vivo" ? "Ao vivo" : status === "offline" ? "Sem conexão" : "Conectando";
  const cor = status === "ao vivo" ? "bg-emerald-500" : status === "offline" ? "bg-pv-vivo" : "bg-pe-vivo";
  return (
    <span className={`flex items-center gap-1.5 text-sm ${escuro ? "text-nevoa/75" : "text-tinta-suave"}`}>
      <span className={`h-2 w-2 rounded-full ${cor}`} aria-hidden />
      {texto}
    </span>
  );
}
