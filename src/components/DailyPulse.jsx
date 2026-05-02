import { useState, useEffect } from 'react'
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function shortDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-ZA', { weekday: 'short' }).slice(0, 3)
}

export default function DailyPulse({ userId, dailyAllowance }) {
  const [spends, setSpends] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const days = last7Days()
  const today = todayStr()

  useEffect(() => {
    const cutoff = days[0]
    const ref = query(
      collection(db, 'users', userId, 'dailySpends'),
      where('date', '>=', cutoff),
      orderBy('date', 'asc')
    )
    const unsub = onSnapshot(ref, snap => {
      setSpends(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [userId])

  const byDay = days.reduce((acc, d) => {
    acc[d] = spends.filter(s => s.date === d).reduce((sum, s) => sum + s.amount, 0)
    return acc
  }, {})

  const todaySpent = byDay[today] || 0
  const todayPct = dailyAllowance > 0 ? Math.min(todaySpent / dailyAllowance, 1) : 0
  const weekTotal = Object.values(byDay).reduce((a, b) => a + b, 0)
  const weekAvg = weekTotal / 7
  const maxDay = Math.max(...Object.values(byDay), dailyAllowance * 0.1, 1)

  const meterColor = todayPct >= 1 ? 'var(--danger)' : todayPct >= 0.75 ? '#f07a20' : 'var(--amber)'

  const handleSave = async () => {
    const amt = parseFloat(amount.replace(/,/g, ''))
    if (!amt || amt <= 0) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'users', userId, 'dailySpends'), {
        amount: amt,
        note: note.trim() || null,
        date: today,
        createdAt: serverTimestamp(),
      })
      setAmount('')
      setNote('')
      setAdding(false)
    } catch (err) {
      console.error('Spend save error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 28, height: 28, border: '2px solid rgba(240,192,64,0.15)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={S.root}>
      {/* Today's meter */}
      <div style={S.meterCard}>
        <div style={S.meterLeft}>
          <p style={S.meterLabel}>Spent Today</p>
          <div style={S.meterAmount}>
            <span style={S.meterCur}>R</span>
            <span style={{ ...S.meterVal, color: meterColor }}>
              {todaySpent.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p style={S.meterSub}>
            of R {dailyAllowance.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} allowance
          </p>
          <div style={S.barTrack}>
            <div style={{ ...S.barFill, width: `${todayPct * 100}%`, background: meterColor }} />
          </div>
          {todayPct >= 1 && (
            <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Daily limit reached</p>
          )}
        </div>
        <button style={S.quickAddBtn} onClick={() => setAdding(!adding)}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{adding ? '×' : '+'}</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
            {adding ? 'CANCEL' : 'LOG SPEND'}
          </span>
        </button>
      </div>

      {/* Quick add form */}
      {adding && (
        <div style={S.addForm}>
          <div style={S.addAmountRow}>
            <span style={S.addCur}>R</span>
            <input
              type="text"
              inputMode="decimal"
              style={S.addAmountInput}
              placeholder="0.00"
              value={amount}
              autoFocus
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setAdding(false) }}
            />
          </div>
          <input
            type="text"
            style={S.addNoteInput}
            placeholder="Note (optional — e.g. Lunch, Uber)"
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={40}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setAdding(false) }}
          />
          <button
            style={{ ...S.logBtn, opacity: (!amount || saving) ? 0.5 : 1 }}
            onClick={handleSave}
            disabled={!amount || saving}
          >
            {saving ? 'Saving…' : 'Log Spend'}
          </button>
        </div>
      )}

      {/* 7-day strip */}
      <div style={S.strip}>
        <p style={S.stripTitle}>This Week</p>
        <div style={S.stripBars}>
          {days.map(d => {
            const amt = byDay[d]
            const pct = amt / maxDay
            const isToday = d === today
            const barColor = amt === 0 ? 'rgba(255,255,255,0.06)' : amt > dailyAllowance ? 'var(--danger)' : amt > dailyAllowance * 0.75 ? '#f07a20' : 'var(--amber)'
            return (
              <div key={d} style={S.stripCol}>
                <div style={S.stripBarWrap}>
                  <div style={{ ...S.stripBar, height: `${Math.max(pct * 100, amt > 0 ? 8 : 2)}%`, background: barColor, opacity: isToday ? 1 : 0.6 }} />
                </div>
                <span style={{ ...S.stripDay, color: isToday ? 'var(--amber)' : 'var(--muted)', fontWeight: isToday ? 700 : 400 }}>
                  {shortDay(d)}
                </span>
                {amt > 0 && (
                  <span style={S.stripAmt}>
                    {amt >= 1000 ? `${(amt / 1000).toFixed(1)}k` : Math.round(amt)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Week stat */}
      <div style={S.weekStat}>
        <div style={S.statItem}>
          <span style={S.statLabel}>Week total</span>
          <span style={S.statVal}>R {weekTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div style={S.statDivider} />
        <div style={S.statItem}>
          <span style={S.statLabel}>Daily avg (7d)</span>
          <span style={{ ...S.statVal, color: weekAvg > dailyAllowance ? 'var(--danger)' : 'var(--text)' }}>
            R {weekAvg.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div style={S.statDivider} />
        <div style={S.statItem}>
          <span style={S.statLabel}>Daily allowance</span>
          <span style={{ ...S.statVal, color: 'var(--amber)' }}>
            R {dailyAllowance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  )
}

const S = {
  root: { display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' },
  meterCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 20, padding: '20px 24px',
    background: 'rgba(255,255,255,0.025)', borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  meterLeft: { flex: 1 },
  meterLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 6 },
  meterAmount: { display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 2 },
  meterCur: { fontSize: 16, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' },
  meterVal: { fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1 },
  meterSub: { fontSize: 11, color: 'var(--text-soft)', marginBottom: 10 },
  barTrack: { height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.3s ease' },
  quickAddBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 4, width: 64, height: 64, borderRadius: 'var(--radius-md)',
    background: 'rgba(240,192,64,0.1)', border: '1px solid rgba(240,192,64,0.25)',
    color: 'var(--amber)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease',
    fontFamily: 'var(--font-ui)',
  },
  addForm: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '16px', background: 'rgba(255,255,255,0.025)',
    borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)',
    animation: 'fadeUp 0.2s ease forwards',
  },
  addAmountRow: { position: 'relative', display: 'flex', alignItems: 'center' },
  addCur: { position: 'absolute', left: 12, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', fontSize: 14, pointerEvents: 'none' },
  addAmountInput: {
    width: '100%', padding: '10px 12px 10px 26px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,220,100,0.2)',
    borderRadius: 'var(--radius-sm)', color: 'var(--amber)', fontSize: 20,
    fontFamily: 'var(--font-mono)', fontWeight: 600,
  },
  addNoteInput: {
    width: '100%', padding: '9px 12px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13,
    fontFamily: 'var(--font-ui)',
  },
  logBtn: {
    padding: '10px', borderRadius: 'var(--radius-sm)',
    background: 'var(--amber)', color: '#07070d',
    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-ui)', cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  strip: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px',
  },
  stripTitle: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 12 },
  stripBars: { display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 },
  stripCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' },
  stripBarWrap: { flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' },
  stripBar: { width: '100%', borderRadius: '3px 3px 2px 2px', minHeight: 2, transition: 'height 0.6s ease, background 0.3s ease' },
  stripDay: { fontSize: 10, fontFamily: 'var(--font-ui)', transition: 'color 0.2s ease' },
  stripAmt: { fontSize: 9, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' },
  weekStat: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden',
  },
  statItem: { flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  statLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)' },
  statVal: { fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 500 },
  statDivider: { width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.06)' },
}
