/** Brasão original de Paratus: águia de asas abertas sob uma coroa, em escudo. */
export function Brasao({ tamanho = 96, className = "" }: { tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho * 1.15}
      viewBox="0 0 200 230"
      className={className}
      role="img"
      aria-label="Brasão de Paratus"
    >
      <defs>
        <linearGradient id="ouroB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0d78a" />
          <stop offset="0.55" stopColor="#c9a23a" />
          <stop offset="1" stopColor="#8f7020" />
        </linearGradient>
      </defs>
      {/* Escudo */}
      <path
        d="M100 38 L172 58 L172 128 C172 172 140 200 100 216 C60 200 28 172 28 128 L28 58 Z"
        fill="#13203b"
        stroke="url(#ouroB)"
        strokeWidth="5"
      />
      <path
        d="M100 50 L162 67 L162 128 C162 166 135 190 100 204 C65 190 38 166 38 128 L38 67 Z"
        fill="none"
        stroke="#c9a23a"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      {/* Coroa */}
      <g fill="url(#ouroB)">
        <path d="M70 30 L78 8 L89 24 L100 2 L111 24 L122 8 L130 30 Z" />
        <rect x="68" y="30" width="64" height="8" rx="2" />
        <circle cx="78" cy="8" r="3.5" />
        <circle cx="100" cy="2" r="3.5" />
        <circle cx="122" cy="8" r="3.5" />
      </g>
      {/* Águia */}
      <g fill="url(#ouroB)">
        {/* asa esquerda: penas em degraus */}
        <path d="M96 100 L48 74 L52 84 L44 86 L54 96 L46 100 L58 108 L52 114 L66 116 L62 122 L92 118 Z" />
        {/* asa direita */}
        <path d="M104 100 L152 74 L148 84 L156 86 L146 96 L154 100 L142 108 L148 114 L134 116 L138 122 L108 118 Z" />
        {/* corpo */}
        <path d="M100 82 C110 82 112 96 110 108 L114 150 L100 166 L86 150 L90 108 C88 96 90 82 100 82 Z" />
        {/* cabeça e bico voltados à direita */}
        <circle cx="102" cy="78" r="9" />
        <path d="M109 74 L121 78 L110 83 Z" />
        {/* cauda */}
        <path d="M88 160 L100 186 L112 160 L106 168 L100 160 L94 168 Z" />
        {/* garras segurando um ramo */}
        <path d="M78 150 C90 158 110 158 122 150" stroke="#c9a23a" strokeWidth="3" fill="none" />
      </g>
      <circle cx="104" cy="76" r="1.8" fill="#13203b" />
    </svg>
  );
}
