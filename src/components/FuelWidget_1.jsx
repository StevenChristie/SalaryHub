import { useState, useEffect } from 'react'

const FUEL_PRICES = {
  inland:  { '95': 23.36, '93': 22.87 },
  coastal: { '95': 22.76, '93': 22.27 },
}

export default function FuelWidget({ onPetrolCost }) {
  const [location, setLocation] = useState('inland')
  const [grade, setGrade] = useState('95')
  const [tankSize, setTankSize] = useState(45)
  const [fillsPerMonth, setFillsPerMonth] = useState(3)
  const [isOpen, setIsOpen] = useState(false)

  const pricePerLitre = FUEL_PRICES[location][grade]
  const monthlyPetrol = Math.round(pricePerLitre * tankSize * fillsPerMonth * 100) / 100

  useEffect(() => { onPetrolCost(monthlyPetrol) }, [monthlyPetrol])

  return (
    <div className="glass" style={S.widget}>
      <div style={S.header} onClick={() => setIsOpen(!isOpen)}>
        <div style={S.headerLeft}>
          <span style={S.icon}>⛽</span>
          <div>
            <p style={S.widgetTitle}>Fuel Forecast</p>
            <p style={S.widgetSub}>April 2026 • SA Prices</p>
          </div>
        </div>
        <div style={S.headerRight}>
          <span style={S.costBadge}>
            R {monthlyPetrol.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </span>
          <span style={{ ...S.chevron, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ⌄
          </span>
        </div>
      </div>

      {isOpen && (
        <div style={S.body}>
          <div style={S.field}>
            <label style={S.fieldLabel}>Location</label>
            <div style={S.toggle}>
              <button
                style={{ ...S.toggleBtn, ...(location === 'inland' ? S.toggleActive : {}) }}
                onClick={() => setLocation('inland')}
              >Inland</button>
              <button
                style={{ ...S.toggleBtn, ...(location === 'coastal' ? S.toggleActive : {}) }}
                onClick={() => setLocation('coastal')}
              >Coastal</button>
            </div>
          </div>

          <div style={S.field}>
            <label style={S.fieldLabel}>Fuel Grade</label>
            <div style={S.toggle}>
              <button
                style={{ ...S.toggleBtn, ...(grade === '95' ? S.toggleActive : {}) }}
                onClick={() => setGrade('95')}
              >95 Unleaded</button>
              <button
                style={{ ...S.toggleBtn, ...(grade === '93' ? S.toggleActive : {}) }}
                onClick={() => setGrade('93')}
              >93 Unleaded</button>
            </div>
          </div>

          <div style={S.priceRow}>
            <span style={S.priceLabel}>Pump price</span>
            <span style={S.priceValue}>R {pricePerLitre.toFixed(2)}/L</span>
          </div>

          <div style={S.field}>
            <label style={S.fieldLabel}>
              Tank Size
              <span style={S.fieldValue}>{tankSize}L</span>
            </label>
            <input
              type="range" min="20" max="100" step="1"
              value={tankSize}
              onChange={e => setTankSize(Number(e.target.value))}
              style={S.slider}
            />
            <div style={S.sliderLabels}><span>20L</span><span>100L</span></div>
          </div>

          <div style={S.field}>
            <label style={S.fieldLabel}>
              Fill-ups / Month
              <span style={S.fieldValue}>{fillsPerMonth}×</span>
            </label>
            <div style={S.stepper}>
              <button style={S.stepBtn} onClick={() => setFillsPerMonth(Math.max(1, fillsPerMonth - 1))}>−</button>
              <span style={S.stepValue}>{fillsPerMonth}</span>
              <button style={S.stepBtn} onClick={() => setFillsPerMonth(Math.min(12, fillsPerMonth + 1))}>+</button>
            </div>
          </div>

          <div style={S.breakdown}>
            <span style={S.breakdownText}>
              R {pricePerLitre.toFixed(2)} × {tankSize}L × {fillsPerMonth}× =
            </span>
            <span style={S.breakdownTotal}>
              R {monthlyPetrol.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  widget: {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
  },
  widgetTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
  },
  widgetSub: {
    fontSize: 11,
    color: 'var(--text-soft)',
    marginTop: 1,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  costBadge: {
    fontSize: 14,
    fontFamily: 'var(--font-mono)',
    color: 'var(--amber)',
    fontWeight: 500,
  },
  chevron: {
    fontSize: 18,
    color: 'var(--muted)',
    transition: 'transform 0.2s ease',
    display: 'inline-block',
  },
  body: {
    padding: '0 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-soft)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldValue: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--amber)',
    fontSize: 13,
    fontWeight: 500,
  },
  toggle: {
    display: 'flex',
    gap: 4,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 'var(--radius-sm)',
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    color: 'var(--text-soft)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'var(--font-ui)',
  },
  toggleActive: {
    background: 'rgba(240,192,64,0.15)',
    color: 'var(--amber)',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  priceLabel: {
    fontSize: 12,
    color: 'var(--text-soft)',
  },
  priceValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--text)',
    fontWeight: 500,
  },
  slider: {
    width: '100%',
    accentColor: 'var(--amber)',
    cursor: 'pointer',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 10,
    color: 'var(--muted)',
    fontFamily: 'var(--font-mono)',
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    width: 'fit-content',
  },
  stepBtn: {
    width: 36,
    height: 36,
    fontSize: 18,
    color: 'var(--amber)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
  },
  stepValue: {
    width: 36,
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    color: 'var(--text)',
  },
  breakdown: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'rgba(240,192,64,0.06)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(240,192,64,0.12)',
    gap: 8,
  },
  breakdownText: {
    fontSize: 11,
    color: 'var(--text-soft)',
    fontFamily: 'var(--font-mono)',
  },
  breakdownTotal: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--amber)',
    fontWeight: 600,
    flexShrink: 0,
  },
}
