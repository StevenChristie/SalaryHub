import { useState, useEffect, useRef } from 'react'

function usePreviousValue(value) {
  const ref = useRef()
  useEffect(() => { ref.current = value })
  return ref.current
}

export default function DailyAllowance({ salary, totalExpenses }) {
  const today = new Date()
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const daysLeft = lastDay.getDate() - today.getDate() + 1

  const remaining = Math.max(salary - totalExpenses, 0)
  const allowance = daysLeft > 0 ? remaining / daysLeft : 0

  const [displayVal, setDisplayVal] = useState(allowance)
  const [rolling, setRolling] = useState(false)
  const prevAllowance = usePreviousValue(allowance)

  useEffect(() => {
    if (prevAllowance === undefined) { setDisplayVal(allowance); return }
    if (Math.abs(allowance - (prevAllowance || 0)) < 0.01) return
    setRolling(true)
    let start = null
    const from = prevAllowance || 0
    const to = allowance
    const tick = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 600, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setDisplayVal(from + (to - from) * ease)
      if (p < 1) requestAnimationFrame(tick)
      else { setDisplayVal(to); setRolling(false) }
    }
    requestAnimationFrame(tick)
  }, [allowance])

  const isHealthy = allowance > 200
  const isWarning = allowance > 50 && allowance <= 200
  const isDanger  = allowance <= 50 && salary > 0

  const statusColor = isDanger ? 'var(--danger)' : isWarning ? '#f07a20' : 'var(--amber)'
  const statusText  = isDanger ? 'tight budget' : isWarning ? 'spend carefully' : 'looking good'
  const monthName   = today.toLocaleString('default', { month: 'long' })
  const monthProg   = (today.getDate() - 1) / Math.max(lastDay.getDate() - 1, 1)

  return (
    <div className="glass" style={S.card}>
      <p style={S.eyebrow}>Safe-to-Spend Today</p>

      <div style={{ ...S.heroNum, ...(rolling ? S.rolling : {}) }}>
        <span style={S.cur}>R</span>
        <span style={{ ...S.val, color: statusColor }}>
          {displayVal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div style={{ ...S.status, background: `${statusColor}15`, borderColor: `${statusColor}30` }}>
        <span style={{ color: statusColor }}>◉</span>
        <span style={{ color: statusColor, fontSize: 12 }}>{statusText}</span>
      </div>

      <div style={S.breakdown}>
        <div style={S.breakItem}>
          <span style={S.breakLabel}>Monthly balance</span>
          <span style={S.breakVal}>
            R {remaining.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <span style={S.breakDivider}>÷</span>
        <div style={S.breakItem}>
          <span style={S.breakLabel}>Days left in {monthName}</span>
          <span style={S.breakVal}>{daysLeft} days</span>
        </div>
      </div>

      <div style={S.monthStrip}>
        <div style={S.stripTrack}>
          <div style={{ ...S.monthFill, width: `${monthProg * 100}%`, background: statusColor }} />
        </div>
        <div style={S.monthLabels}>
          <span>1 {monthName}</span>
          <span style={{ color: statusColor, fontWeight: 600 }}>Today: {today.getDate()}</span>
          <span>{lastDay.getDate()}</span>
        </div>
      </div>
    </div>
  )
}

const S = {
  card: {
    borderRadius: 'var(--radius-lg)',
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-soft)',
  },
  heroNum: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    transition: 'opacity 0.1s ease',
  },
  rolling: {
    opacity: 0.7,
  },
  cur: {
    fontSize: 22,
    color: 'var(--text-soft)',
    fontFamily: 'var(--font-mono)',
  },
  val: {
    fontSize: 42,
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  status: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    border: '1px solid',
    width: 'fit-content',
    fontSize: 12,
  },
  breakdown: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  breakItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  breakLabel: {
    fontSize: 11,
    color: 'var(--text-soft)',
  },
  breakVal: {
    fontSize: 14,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text)',
    fontWeight: 500,
  },
  breakDivider: {
    fontSize: 20,
    color: 'var(--muted)',
    flexShrink: 0,
  },
  monthStrip: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  stripTrack: {
    height: 3,
    background: 'rgba(255,255,255,0.07)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  monthFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.6s ease',
  },
  monthLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: 'var(--text-soft)',
    fontFamily: 'var(--font-mono)',
  },
}
