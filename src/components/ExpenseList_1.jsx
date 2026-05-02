import { useState, useRef } from 'react'
import { collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export default function ExpenseList({ userId, expenses, onExpensesChange }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const nameRef = useRef(null)

  const handleAddClick = () => {
    setAdding(true)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  const handleCancel = () => {
    setAdding(false)
    setNewName('')
    setNewAmount('')
  }

  const handleSave = async () => {
    const name = newName.trim()
    const amount = parseFloat(newAmount.replace(/,/g, ''))
    if (!name || !amount || amount <= 0) return
    setSaving(true)
    try {
      const ref = collection(db, 'users', userId, 'expenses')
      const docRef = await addDoc(ref, { name, amount, essential: true, createdAt: serverTimestamp() })
      onExpensesChange([...expenses, { id: docRef.id, name, amount, essential: true }])
      setNewName('')
      setNewAmount('')
      setAdding(false)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (expenseId) => {
    setDeletingId(expenseId)
    try {
      await deleteDoc(doc(db, 'users', userId, 'expenses', expenseId))
      onExpensesChange(expenses.filter(e => e.id !== expenseId))
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleEssential = async (expense) => {
    const next = expense.essential !== false ? false : true
    try {
      await updateDoc(doc(db, 'users', userId, 'expenses', expense.id), { essential: next })
      onExpensesChange(expenses.map(e => e.id === expense.id ? { ...e, essential: next } : e))
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const essentialTotal = expenses.filter(e => e.essential !== false).reduce((sum, e) => sum + e.amount, 0)
  const optionalTotal = expenses.filter(e => e.essential === false).reduce((sum, e) => sum + e.amount, 0)

  return (
    <div style={S.root}>
      <div style={S.listHeader}>
        <div>
          <h3 style={S.listTitle}>Monthly Expenses</h3>
          <p style={S.listSub}>
            {expenses.length === 0
              ? 'Your canvas is empty — start adding'
              : `${expenses.length} item${expenses.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button style={S.addBtn} onClick={handleAddClick}>
          <span style={S.addIcon}>+</span>
          <span>Add Expense</span>
        </button>
      </div>

      <div style={S.list}>
        {expenses.length === 0 && !adding && (
          <div style={S.empty}>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="27" stroke="rgba(240,192,64,0.12)" strokeWidth="1" strokeDasharray="4 4"/>
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="rgba(240,192,64,0.35)" fontSize="22">+</text>
            </svg>
            <p style={S.emptyText}>No expenses yet.</p>
            <p style={S.emptyHint}>Click "Add Expense" to start building your budget.</p>
          </div>
        )}

        {expenses.map((expense, i) => {
          const isEssential = expense.essential !== false
          const isHovered = hoveredId === expense.id
          return (
            <div
              key={expense.id}
              style={{ ...S.row, background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent' }}
              onMouseEnter={() => setHoveredId(expense.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div style={S.rowLeft}>
                <span style={{ ...S.rowDot, background: isEssential ? 'var(--amber)' : 'rgba(255,255,255,0.2)' }} />
                <span style={S.rowName}>{expense.name}</span>
              </div>
              <div style={S.rowRight}>
                <span style={S.rowAmount}>
                  R {expense.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button
                  className={isEssential ? 'pill-essential' : 'pill-optional'}
                  onClick={() => handleToggleEssential(expense)}
                  title="Toggle essential/optional"
                >
                  {isEssential ? 'Essential' : 'Optional'}
                </button>
                <button
                  style={{
                    ...S.deleteBtn,
                    opacity: isHovered ? 1 : 0,
                    pointerEvents: isHovered ? 'auto' : 'none',
                  }}
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  title="Remove"
                >
                  {deletingId === expense.id
                    ? <span style={S.deletingSpinner} />
                    : <TrashIcon />
                  }
                </button>
              </div>
            </div>
          )
        })}

        {adding && (
          <div style={S.addRow}>
            <input
              ref={nameRef}
              type="text"
              style={S.addInput}
              placeholder="Expense name (e.g. Rent)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={40}
            />
            <div style={S.addAmountWrap}>
              <span style={S.addCur}>R</span>
              <input
                type="text"
                inputMode="decimal"
                style={{ ...S.addInput, ...S.addAmountInput }}
                placeholder="0.00"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div style={S.addActions}>
              <button
                style={{ ...S.saveBtn, opacity: (saving || !newName.trim() || !newAmount) ? 0.5 : 1 }}
                onClick={handleSave}
                disabled={saving || !newName.trim() || !newAmount}
              >
                {saving ? <span style={S.savingSpinner} /> : 'Save'}
              </button>
              <button style={S.cancelBtn} onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {expenses.length > 0 && (
        <div style={S.footer}>
          <div style={S.footerSplit}>
            <span style={S.footerSplitItem}>
              <span style={{ color: 'var(--success)' }}>●</span>
              {' '}Essential{' '}
              <span style={S.footerSplitAmt}>R {essentialTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </span>
            {optionalTotal > 0 && (
              <span style={S.footerSplitItem}>
                <span style={{ color: 'var(--muted)' }}>●</span>
                {' '}Optional{' '}
                <span style={S.footerSplitAmt}>R {optionalTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </span>
            )}
          </div>
          <div style={S.footerTotal}>
            <span style={S.footerLabel}>Subtotal (excl. fuel)</span>
            <span style={S.footerAmount}>
              R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  )
}

const S = {
  root: { display: 'flex', flexDirection: 'column', height: '100%' },
  listHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  listTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text)' },
  listSub: { fontSize: 11, color: 'var(--text-soft)', marginTop: 2 },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 'var(--radius-sm)',
    background: 'rgba(240,192,64,0.12)', border: '1px solid rgba(240,192,64,0.25)',
    color: 'var(--amber)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
    cursor: 'pointer', transition: 'all 0.2s ease',
  },
  addIcon: { fontSize: 16, lineHeight: 1 },
  list: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 10, padding: '48px 24px', color: 'var(--text-soft)',
  },
  emptyText: { fontSize: 14, color: 'var(--text-soft)' },
  emptyHint: { fontSize: 12, color: 'var(--muted)', textAlign: 'center' },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 24px', transition: 'background 0.15s ease', borderRadius: 0,
  },
  rowLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  rowDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transition: 'background 0.2s ease' },
  rowName: { fontSize: 14, color: 'var(--text)' },
  rowRight: { display: 'flex', alignItems: 'center', gap: 10 },
  rowAmount: { fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-soft)' },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.2)',
    color: 'var(--danger)', cursor: 'pointer', transition: 'opacity 0.15s ease',
    flexShrink: 0,
  },
  deletingSpinner: {
    width: 12, height: 12, border: '1.5px solid rgba(224,85,85,0.3)',
    borderTopColor: 'var(--danger)', borderRadius: '50%',
    display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },
  addRow: {
    display: 'flex', flexDirection: 'column', gap: 8,
    padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  addInput: {
    width: '100%', padding: '9px 12px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 14,
    fontFamily: 'var(--font-ui)',
  },
  addAmountWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  addCur: {
    position: 'absolute', left: 12, color: 'var(--text-soft)',
    fontSize: 13, fontFamily: 'var(--font-mono)', pointerEvents: 'none',
  },
  addAmountInput: { paddingLeft: 26 },
  addActions: { display: 'flex', gap: 8 },
  saveBtn: {
    padding: '8px 20px', borderRadius: 'var(--radius-sm)',
    background: 'var(--amber)', color: '#07070d',
    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-ui)', cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
  savingSpinner: {
    width: 12, height: 12, border: '1.5px solid rgba(0,0,0,0.2)',
    borderTopColor: '#07070d', borderRadius: '50%',
    display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },
  cancelBtn: {
    padding: '8px 16px', borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-soft)', fontSize: 13, fontFamily: 'var(--font-ui)', cursor: 'pointer',
  },
  footer: {
    padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  footerSplit: {
    display: 'flex', gap: 16, flexWrap: 'wrap',
  },
  footerSplitItem: {
    fontSize: 11, color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 4,
  },
  footerSplitAmt: {
    fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: 11,
  },
  footerTotal: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  footerLabel: { fontSize: 12, color: 'var(--text-soft)' },
  footerAmount: {
    fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--amber)', fontWeight: 600,
  },
}
