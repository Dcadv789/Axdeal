'use client';

export const SCORE_RANGES = [
  { min: 0, max: 300, nivel: 1 as const, label: 'Baixo', color: '#ef4444' },
  { min: 301, max: 600, nivel: 2 as const, label: 'Regular', color: '#f97316' },
  { min: 601, max: 850, nivel: 3 as const, label: 'Bom', color: '#eab308' },
  { min: 851, max: 1000, nivel: 4 as const, label: 'Excelente', color: '#22c55e' },
];

export function getScoreNivel(score: number): (typeof SCORE_RANGES)[number] {
  const clamped = Math.max(0, Math.min(1000, Math.round(score)));
  const range = SCORE_RANGES.find((r) => clamped >= r.min && clamped <= r.max);
  return range ?? SCORE_RANGES[0];
}

// Cores do gradiente do arco (0→1000)
const ARC_GRADIENT = [
  { p: 0, r: 220, g: 38, b: 38 },
  { p: 0.25, r: 234, g: 88, b: 12 },
  { p: 0.5, r: 202, g: 138, b: 4 },
  { p: 0.75, r: 101, g: 163, b: 13 },
  { p: 1, r: 22, g: 163, b: 74 },
];

function getBallColor(percent: number): string {
  let i = 0;
  while (i < ARC_GRADIENT.length - 1 && ARC_GRADIENT[i + 1].p <= percent) i++;
  const a = ARC_GRADIENT[i];
  const b = ARC_GRADIENT[Math.min(i + 1, ARC_GRADIENT.length - 1)];
  const t = a.p === b.p ? 1 : (percent - a.p) / (b.p - a.p);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bv = Math.round(a.b + (b.b - a.b) * t);
  // Tom mais forte: escurecer ~20% para maior visibilidade
  const factor = 0.8;
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(bv * factor)})`;
}

interface QuizScoreGaugeProps {
  score: number;
  corPrimaria?: string;
  isDark?: boolean;
  size?: number;
  label?: string;
  labelSmall?: boolean;
}

export default function QuizScoreGauge({
  score,
  corPrimaria = '#0047FF',
  isDark = false,
  size = 260,
  label,
  labelSmall = false,
}: QuizScoreGaugeProps) {
  const scoreExibido = Math.max(0, Math.round(score));
  const percent = Math.min(scoreExibido / 1000, 1);
  const strokeWidth = Math.max(18, Math.round(24 * (size / 260)));
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const chordY = size - 24;

  // Arco para cima: sweep-flag 1 (clockwise = curva para cima em SVG)
  const pathD = `M ${strokeWidth / 2} ${chordY} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${chordY}`;

  // Score no centróide do semicírculo (arco para cima), +25px para baixo
  const scoreY = chordY - radius + (4 * radius) / (3 * Math.PI) + 25;
  const scoreSize = labelSmall ? 28 : 36;

  // Label abaixo do score: 30px (normal) ou 24px (small) de espaço
  const labelY = scoreY + (labelSmall ? 24 : 30);
  const labelFontSize = labelSmall ? 12 : 14;

  // Bolinha integrada ao arco: mapeamento linear 0→esquerda, 1000→direita
  const ballCy = chordY;
  const angle = Math.PI * (1 - percent);
  const ballR = strokeWidth * 0.58; // cobre a linha e um pouco mais para as laterais
  const ballX = cx + radius * Math.cos(angle);
  const ballY = ballCy - radius * Math.sin(angle);
  const ballColor = getBallColor(percent);

  const arcTop = chordY - radius;
  const padTop = strokeWidth / 2; // inclui o stroke no topo (evita ~12px vazio)
  const padBottom = 36;
  const vbMinY = arcTop - padTop;
  const vbHeight = chordY - vbMinY + padBottom;
  const viewBox = `0 ${vbMinY} ${size} ${vbHeight}`;

  return (
    <div className="flex flex-col items-center w-full overflow-visible" style={{ minHeight: vbHeight }}>
      <svg
        width={size}
        height={vbHeight}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMin meet"
        className="block"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient
            id={`gauge-bg-${size}-${score}`}
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={size}
            y2={0}
          >
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="25%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#ca8a04" />
            <stop offset="75%" stopColor="#65a30d" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
        <path
          d={pathD}
          fill="none"
          stroke={`url(#gauge-bg-${size}-${score})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={ballX}
          cy={ballY}
          r={ballR}
          fill={ballColor}
          stroke={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)'}
          strokeWidth={2}
        />
        <text
          x={cx}
          y={scoreY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={ballColor}
          style={{ fontSize: scoreSize, fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}
        >
          {scoreExibido}
        </text>
        {label && (
          <text
            x={cx}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={ballColor}
            style={{
              fontSize: labelFontSize,
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </text>
        )}
        <text
          x={strokeWidth / 2}
          y={chordY + strokeWidth / 2 + 18}
          textAnchor="middle"
          fill={isDark ? '#9ca3af' : '#6b7280'}
          style={{ fontSize: 11, fontFamily: 'system-ui, sans-serif' }}
        >
          0
        </text>
        <text
          x={size - strokeWidth / 2}
          y={chordY + strokeWidth / 2 + 18}
          textAnchor="middle"
          fill="#22c55e"
          style={{ fontSize: 11, fontFamily: 'system-ui, sans-serif' }}
        >
          1000
        </text>
      </svg>
    </div>
  );
}
