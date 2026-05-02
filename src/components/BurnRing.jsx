export default function BurnRing({ salary, totalExpenses, size = 200 }) {
  const pct = salary > 0 ? Math.min(totalExpenses / salary, 1) : 0
  const strokeW = 9
  const r = (size / 2) - strokeW - 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color = pct >= 0.9 ? 'var(--danger)' : pct >= 0.7 ? '#f07a20' : 'var(--amber)'
  const cx = size / 2
  const cy = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeW}
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease' }}
      />
      <text
        x={cx} y={cy - 7}
        textAnchor="middle"
        dominantBaseline="auto"
        fill={color}
        fontSize={size * 0.155}
        fontWeight="600"
        fontFamily="'Syne', sans-serif"
        style={{ transition: 'fill 0.4s ease' }}
      >
        {Math.round(pct * 100)}%
      </text>
      <text
        x={cx} y={cy + 12}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="rgba(255,255,255,0.35)"
        fontSize={size * 0.07}
        fontFamily="'Syne', sans-serif"
      >
        of salary
      </text>
    </svg>
  )
}
