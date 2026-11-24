"use client";

export function BotaoMapa({ rotulo, onClick, ativo, children }: { rotulo: string; onClick: () => void; ativo?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={ativo}
      className={`grid h-10 w-10 place-items-center rounded-sm border text-lg leading-none shadow-lg ${
        ativo ? "border-ouro bg-ouro/90 text-marinho" : "border-ouro/35 bg-noite/90 text-ouro-claro hover:bg-noite-3"
      }`}
    >
      {children}
    </button>
  );
}

/** Faixa "Rodada N · vez de X" por cima do tabuleiro. */
export function FaixaVez({ rodada, nome, minhaVez, onVer }: { rodada: number; nome: string; minhaVez?: boolean; onVer?: () => void }) {
  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 rounded-sm border px-3 py-1.5 shadow-lg ${
        minhaVez ? "selo-imperial border-ouro" : "border-ouro/40 bg-noite/90 text-nevoa"
      }`}
      role="status"
    >
      <span className="numeros text-sm opacity-70">Rodada {rodada}</span>
      <span className="titulo">{minhaVez ? "É a sua vez!" : `Vez de ${nome}`}</span>
      {onVer && (
        <button onClick={onVer} className="ml-1 rounded-sm border border-ouro/40 px-2 py-0.5 text-sm text-ouro-claro hover:bg-ouro/10">
          Ver
        </button>
      )}
    </div>
  );
}

export function IconeRegua() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M3 17L17 3l4 4L7 21z" />
      <path d="M7 13l2 2M10 10l2 2M13 7l2 2" />
    </svg>
  );
}
