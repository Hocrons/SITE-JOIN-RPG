/** Brasão original de Paratus: águia de asas abertas sob coroa, em escudo, com ramos de louro opcionais. */

function Louro({ lado }: { lado: 1 | -1 }) {
  // folhas ao longo de um arco, de baixo para cima
  const folhas = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const ang = (200 - t * 140) * (Math.PI / 180);
    const r = 98;
    const x = 100 + lado * Math.cos(ang) * -r;
    const y = 128 - Math.sin(ang) * -r * 0.98;
    const rot = lado * (t * 140 - 110);
    return { x, y, rot, s: 1 - t * 0.35 };
  });
  return (
    <g fill="url(#ouroB)">
      {folhas.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot}) scale(${f.s})`}>
          <ellipse cx={lado * 7} cy="-3" rx="9" ry="3.6" transform={`rotate(${lado * -25})`} />
          <ellipse cx={lado * -6} cy="3" rx="8" ry="3.2" transform={`rotate(${lado * 30})`} />
        </g>
      ))}
    </g>
  );
}

export function Brasao({
  tamanho = 96,
  louros = false,
  className = "",
}: {
  tamanho?: number;
  louros?: boolean;
  className?: string;
}) {
  const vb = louros ? "-12 -6 224 246" : "0 0 200 230";
  return (
    <svg
      width={tamanho}
      height={tamanho * (louros ? 246 / 224 : 1.15)}
      viewBox={vb}
      className={className}
      role="img"
      aria-label="Brasão de Paratus"
    >
      <defs>
        <linearGradient id="ouroB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1da95" />
          <stop offset="0.5" stopColor="#c9a23a" />
          <stop offset="1" stopColor="#7e6118" />
        </linearGradient>
        <linearGradient id="campoB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b3766" />
          <stop offset="1" stopColor="#0e1a30" />
        </linearGradient>
      </defs>

      {louros && (
        <>
          <Louro lado={1} />
          <Louro lado={-1} />
          <path d="M84 222 Q100 214 116 222" stroke="#b8912f" strokeWidth="3" fill="none" />
        </>
      )}

      {/* Escudo */}
      <path
        d="M100 38 L172 58 L172 128 C172 172 140 200 100 216 C60 200 28 172 28 128 L28 58 Z"
        fill="url(#campoB)"
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
        <path d="M96 100 L48 74 L52 84 L44 86 L54 96 L46 100 L58 108 L52 114 L66 116 L62 122 L92 118 Z" />
        <path d="M104 100 L152 74 L148 84 L156 86 L146 96 L154 100 L142 108 L148 114 L134 116 L138 122 L108 118 Z" />
        <path d="M100 82 C110 82 112 96 110 108 L114 150 L100 166 L86 150 L90 108 C88 96 90 82 100 82 Z" />
        <circle cx="102" cy="78" r="9" />
        <path d="M109 74 L121 78 L110 83 Z" />
        <path d="M88 160 L100 186 L112 160 L106 168 L100 160 L94 168 Z" />
        <path d="M78 150 C90 158 110 158 122 150" stroke="#c9a23a" strokeWidth="3" fill="none" />
      </g>
      <circle cx="104" cy="76" r="1.8" fill="#0e1a30" />
    </svg>
  );
}
