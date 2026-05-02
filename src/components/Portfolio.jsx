import { useState, useEffect } from 'react'
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

const ALLOCATION_COLORS = ['#f0c040', '#5ec278', '#6c8ef0', '#e07b40', '#c45ec2', '#40c4c4', '#e05555', '#a0c440']

async function fetchPrice(ticker) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      { headers: { Accept: 'application/json' } }
    )
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    return meta ? { price: meta.regularMarketPrice, prevClose: meta.chartPreviousClose } : null
  } catch {
    return null
  }
}

export default function Portfolio({ userId, onValueChange }) {
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchingPrices, setFetchingPrices] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ ticker: '', name: '', shares: '', avgBuyPrice: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users', userId, 'holdings'), snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setHoldings(items)
      setLoading(false)
    })
    return unsub
  }, [userId])

  const totalValue = holdings.reduce((sum, h) => sum + (h.shares * (h.currentPrice || h.avgBuyPrice)), 0)
  const totalCost  = holdings.reduce((sum, h) => sum + (h.shares * h.avgBuyPrice), 0)
  const totalPnL   = totalValue - totalCost
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

  useEffect(() => { onValueChange(totalValue) }, [totalValue])

  const refreshPrices = async () => {
    if (holdings.length === 0) return
    setFetchingPrices(true)
    await Promise.all(holdings.map(async h => {
      const result = await fetchPrice(h.ticker)
      if (result) {
        try {
          await updateDoc(doc(db, 'users', userId, 'holdings', h.id), {
            currentPrice: result.price,
            prevClose: result.prevClose,
            lastUpdated: serverTimestamp(),
          })
        } catch {}
      }
    }))
    setFetchingPrices(false)
  }

  const handleAdd = async () => {
    const shares = parseFloat(form.shares)
    const avgBuyPrice = parseFloat(form.avgBuyPrice)
    if (!form.ticker.trim() || !form.name.trim() || !shares || !avgBuyPrice) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'users', userId, 'holdings'), {
        ticker: form.ticker.trim().toUpperCase(),
        name: form.name.trim(),
        shares,
        avgBuyPrice,
        currentPrice: avgBuyPrice,
        prevClose: null,
        lastUpdated: serverTimestamp(),
      })
      setForm({ ticker: '', name: '', shares: '', avgBuyPrice: '' })
      setAdding(false)
    } catch (err) {
      console.error('Add holding error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await deleteDoc(doc(db, 'users', userId, 'holdings', id))
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 28, height: 28, border: '2px solid rgba(240,192,64,0.15)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={S.root}>
      {/* Summary header */}
      <div style={S.summary}>
        <div style={S.summaryMain}>
          <p style={S.summaryLabel}>Portfolio Value</p>
          <div style={S.summaryVal}>
            <span style={S.summaryCur}>R</span>
            <span style={S.summaryNum}>{totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div style={S.summaryRight}>
          <div style={{ ...S.pnlBadge, background: totalPnL >= 0 ? 'rgba(94,194,120,0.12)' : 'rgba(224,85,85,0.12)', borderColor: totalPnL >= 0 ? 'rgba(94,194,120,0.25)' : 'rgba(224,85,85,0.25)' }}>
            <span style={{ color: totalPnL >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
              {totalPnL >= 0 ? '+' : ''}R {Math.abs(totalPnL).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ color: totalPnL >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 11 }}>
              {totalPnL >= 0 ? '▲' : '▼'} {Math.abs(totalPnLPct).toFixed(2)}%
            </span>
          </div>
          <div style={S.headerActions}>
            <button style={S.refreshBtn} onClick={refreshPrices} disabled={fetchingPrices} title="Refresh prices from Yahoo Finance">
              {fetchingPrices
                ? <span style={{ width: 12, height: 12, border: '1.5px solid rgba(240,192,64,0.3)', borderTopColor: 'var(--amber)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                : <RefreshIcon />}
              <span>{fetchingPrices ? 'Refreshing…' : 'Refresh Prices'}</span>
            </button>
            <button style={S.addBtn} onClick={() => setAdding(!adding)}>
              {adding ? '× Cancel' : '+ Add Holding'}
            </button>
          </div>
        </div>
      </div>

      {/* Allocation strip */}
      {holdings.length > 0 && (
        <div style={S.allocStrip}>
          <div style={S.allocBar}>
            {holdings.map((h, i) => {
              const w = totalValue > 0 ? ((h.shares * (h.currentPrice || h.avgBuyPrice)) / totalValue) * 100 : 0
              return (
                <div key={h.id} title={`${h.ticker}: ${w.toFixed(1)}%`}
                  style={{ width: `${w}%`, background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length], height: '100%', transition: 'width 0.5s ease' }}
                />
              )
            })}
          </div>
          <div style={S.allocLegend}>
            {holdings.map((h, i) => {
              const val = h.shares * (h.currentPrice || h.avgBuyPrice)
              const pct = totalValue > 0 ? (val / totalValue) * 100 : 0
              return (
                <span key={h.id} style={S.allocItem}>
                  <span style={{ ...S.allocDot, background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }} />
                  {h.ticker} {pct.toFixed(0)}%
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div style={S.addForm}>
          <div style={S.formGrid}>
            <input style={S.formInput} placeholder="Ticker (e.g. MTN.JO, AAPL)" value={form.ticker}
              onChange={e => setForm(f => ({ ...f, ticker: e.target.value }))} />
            <input style={S.formInput} placeholder="Name (e.g. MTN Group)" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input style={S.formInput} type="number" placeholder="Shares" value={form.shares}
              onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} min="0" step="any" />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 10, fontSize: 12, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>R</span>
              <input style={{ ...S.formInput, paddingLeft: 22, width: '100%' }} type="number" placeholder="Avg buy price" value={form.avgBuyPrice}
                onChange={e => setForm(f => ({ ...f, avgBuyPrice: e.target.value }))} min="0" step="any" />
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-soft)' }}>
            For JSE stocks, append <strong style={{ color: 'var(--amber)' }}>.JO</strong> to the ticker (e.g. MTN.JO). US stocks use the standard ticker.
          </p>
          <button
            style={{ ...S.saveHoldingBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleAdd}
            disabled={saving}
          >
            {saving ? 'Adding…' : 'Add Holding'}
          </button>
        </div>
      )}

      {/* Holdings list */}
      {holdings.length === 0 && !adding ? (
        <div style={S.empty}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="23" stroke="rgba(240,192,64,0.1)" strokeWidth="1" strokeDasharray="4 4"/>
            <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="rgba(240,192,64,0.3)" fontSize="20">📈</text>
          </svg>
          <p style={S.emptyText}>No holdings yet.</p>
          <p style={S.emptyHint}>Add your EasyEquities positions to track your portfolio.</p>
        </div>
      ) : (
        <div style={S.holdingsList}>
          {holdings.map((h, i) => {
            const curPrice = h.currentPrice || h.avgBuyPrice
            const curVal = h.shares * curPrice
            const cost = h.shares * h.avgBuyPrice
            const pnl = curVal - cost
            const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
            const dayChange = h.prevClose ? ((curPrice - h.prevClose) / h.prevClose) * 100 : null
            const isHovered = hoveredId === h.id

            return (
              <div
                key={h.id}
                style={{ ...S.holdingRow, background: isHovered ? 'rgba(255,255,255,0.025)' : 'transparent' }}
                onMouseEnter={() => setHoveredId(h.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div style={S.holdingLeft}>
                  <span style={{ ...S.holdingDot, background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }} />
                  <div>
                    <p style={S.holdingTicker}>{h.ticker}</p>
                    <p style={S.holdingName}>{h.name}</p>
                  </div>
                </div>
                <div style={S.holdingMid}>
                  <p style={S.holdingPrice}>R {curPrice.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  {dayChange !== null && (
                    <p style={{ fontSize: 10, color: dayChange >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                      {dayChange >= 0 ? '▲' : '▼'} {Math.abs(dayChange).toFixed(2)}% today
                    </p>
                  )}
                </div>
                <div style={S.holdingRight}>
                  <p style={S.holdingVal}>R {curVal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p style={{ fontSize: 11, color: pnl >= 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                    {pnl >= 0 ? '+' : ''}R {Math.abs(pnl).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                  </p>
                </div>
                <button
                  style={{ ...S.deleteBtn, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? 'auto' : 'none' }}
                  onClick={() => handleDelete(h.id)}
                  disabled={deletingId === h.id}
                >
                  {deletingId === h.id
                    ? <span style={{ width: 12, height: 12, border: '1.5px solid rgba(224,85,85,0.3)', borderTopColor: 'var(--danger)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    : <TrashIcon />
                  }
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
  )
}

const S = {
  root: { display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' },
  summary: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, padding: '20px 24px',
    background: 'rgba(255,255,255,0.025)', borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  summaryMain: {},
  summaryLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 6 },
  summaryVal: { display: 'flex', alignItems: 'baseline', gap: 4 },
  summaryCur: { fontSize: 18, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' },
  summaryNum: { fontSize: 38, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)' },
  summaryRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 },
  pnlBadge: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid' },
  headerActions: { display: 'flex', gap: 8, alignItems: 'center' },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-soft)', fontSize: 11, fontFamily: 'var(--font-ui)', cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  addBtn: {
    padding: '7px 14px', borderRadius: 'var(--radius-sm)',
    background: 'rgba(240,192,64,0.12)', border: '1px solid rgba(240,192,64,0.25)',
    color: 'var(--amber)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)', cursor: 'pointer',
    transition: 'all 0.2s ease', whiteSpace: 'nowrap',
  },
  allocStrip: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '14px 20px', background: 'rgba(255,255,255,0.02)',
    borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)',
  },
  allocBar: { height: 6, display: 'flex', borderRadius: 4, overflow: 'hidden', gap: 1 },
  allocLegend: { display: 'flex', flexWrap: 'wrap', gap: '4px 12px' },
  allocItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)' },
  allocDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  addForm: {
    display: 'flex', flexDirection: 'column', gap: 10,
    padding: '16px 20px', background: 'rgba(255,255,255,0.02)',
    borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)',
    animation: 'fadeUp 0.2s ease forwards',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  formInput: {
    width: '100%', padding: '9px 12px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-ui)',
  },
  saveHoldingBtn: {
    padding: '10px', borderRadius: 'var(--radius-sm)',
    background: 'var(--amber)', color: '#07070d',
    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-ui)', cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 10, padding: '48px 24px',
  },
  emptyText: { fontSize: 14, color: 'var(--text-soft)' },
  emptyHint: { fontSize: 12, color: 'var(--muted)', textAlign: 'center' },
  holdingsList: {
    background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden',
  },
  holdingRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s ease',
  },
  holdingLeft: { display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 180px' },
  holdingDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  holdingTicker: { fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' },
  holdingName: { fontSize: 11, color: 'var(--text-soft)', marginTop: 1 },
  holdingMid: { flex: 1 },
  holdingPrice: { fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 500 },
  holdingRight: { textAlign: 'right', flex: '0 0 200px' },
  holdingVal: { fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 600 },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.2)',
    color: 'var(--danger)', cursor: 'pointer', transition: 'opacity 0.15s ease', flexShrink: 0,
  },
}
