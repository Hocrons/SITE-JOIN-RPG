/**
 * Sigilo da Membrana: marca original da campanha (não é um sigilo oficial de Ordem Paranormal).
 * Um círculo partido em quatro (as quatro bênçãos), um losango com meandro (o Império)
 * e um rasgo atravessando tudo (a membrana fina de Paratus).
 */
export function Sigilo({ tamanho = 64, className = "", rasgo = true }: { tamanho?: number; className?: string; rasgo?: boolean }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" fill="none" className={className} aria-hidden>
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M50 6a44 44 0 0 1 31 13" />
        <path d="M94 50a44 44 0 0 1-13 31" />
        <path d="M50 94a44 44 0 0 1-31-13" />
        <path d="M6 50a44 44 0 0 1 13-31" />
        <path d="M50 20 80 50 50 80 20 50Z" />
        <path d="M50 34v10h8v8H42V38h12" strokeWidth="2" />
        <circle cx="50" cy="6" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="94" cy="50" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="50" cy="94" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="6" cy="50" r="2.2" fill="currentColor" stroke="none" />
      </g>
      {rasgo && (
        <path d="M57 2 52 24 59 33 47 52 56 63 45 82 50 98" stroke="var(--color-sangue-vivo)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
