/*
  Placeholder product illustrations for Coming Soon cards.

  These lived separately in the home and market pages, with the gradient ids
  renamed in each copy to stop them colliding. Sharing one definition means
  the art can only drift in one place. The ids are unique per shape here, so
  rendering the same component more than once on a page is safe.
*/

export function EggSvg() {
  return (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28 drop-shadow-sm">
      <defs>
        <radialGradient id="paEggSheen" cx="38%" cy="32%" r="68%">
          <stop offset="0%"   stopColor="#e8c99a" />
          <stop offset="60%"  stopColor="#c8a070" />
          <stop offset="100%" stopColor="#a07040" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="78" rx="42" ry="52" fill="#c8a882" stroke="#b08050" strokeWidth="1.5" />
      <ellipse cx="60" cy="78" rx="38" ry="48" fill="url(#paEggSheen)" />
      <ellipse cx="48" cy="62" rx="7" ry="11" fill="white" opacity="0.18" transform="rotate(-15 48 62)" />
    </svg>
  );
}

export function SixEggsSvg() {
  const eggs = [
    { cx: 44,  cy: 72,  rot: -6 },
    { cx: 110, cy: 68,  rot:  2 },
    { cx: 176, cy: 73,  rot:  7 },
    { cx: 44,  cy: 158, rot:  5 },
    { cx: 110, cy: 155, rot: -4 },
    { cx: 176, cy: 160, rot:  8 },
  ];
  return (
    <svg viewBox="0 0 220 230" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-3 drop-shadow-sm">
      <defs>
        <radialGradient id="paEggSheenSix" cx="38%" cy="32%" r="68%">
          <stop offset="0%"   stopColor="#e8c99a" />
          <stop offset="60%"  stopColor="#c8a070" />
          <stop offset="100%" stopColor="#a07040" />
        </radialGradient>
      </defs>
      {eggs.map((e, i) => (
        <g key={i} transform={`rotate(${e.rot} ${e.cx} ${e.cy})`}>
          <ellipse cx={e.cx} cy={e.cy} rx="24" ry="30" fill="#c8a882" stroke="#b08050" strokeWidth="1" />
          <ellipse cx={e.cx} cy={e.cy} rx="21" ry="27" fill="url(#paEggSheenSix)" />
          <ellipse
            cx={e.cx - 6} cy={e.cy - 10} rx="5" ry="7" fill="white" opacity="0.18"
            transform={`rotate(-15 ${e.cx - 6} ${e.cy - 10})`}
          />
        </g>
      ))}
    </svg>
  );
}

export function HoneyJarSvg() {
  return (
    <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28 drop-shadow-sm">
      <defs>
        <linearGradient id="paHoneyBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#d99a2b" />
          <stop offset="35%"  stopColor="#f5c451" />
          <stop offset="70%"  stopColor="#e0a72f" />
          <stop offset="100%" stopColor="#b8801f" />
        </linearGradient>
        <linearGradient id="paHoneyLid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#8a5a1e" />
          <stop offset="40%"  stopColor="#b8823a" />
          <stop offset="100%" stopColor="#7a4d18" />
        </linearGradient>
      </defs>
      <rect x="34" y="20" width="52" height="15" rx="4" fill="url(#paHoneyLid)" />
      <rect x="43" y="35" width="34" height="9" fill="#e8b757" />
      <path
        d="M34,44 h52 a6,6 0 0 1 6,6 v56 a10,10 0 0 1 -10,10 h-44 a10,10 0 0 1 -10,-10 v-56 a6,6 0 0 1 6,-6 z"
        fill="url(#paHoneyBody)" stroke="#a8721c" strokeWidth="1.5"
      />
      <rect x="44" y="55" width="8" height="44" rx="4" fill="white" opacity="0.22" />
    </svg>
  );
}
