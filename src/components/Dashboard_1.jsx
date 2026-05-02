import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { collection, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import BurnRing from './BurnRing'
import DailyAllowance from './DailyAllowance_1'
import ExpenseList from './ExpenseList_1'
import FuelWidget from './FuelWidget_1'
import DailyPulse from './DailyPulse'
import Portfolio from './Portfolio'

export default function Dashboard({ user, profile, onProfileUpdate }) {
  const [expenses, setExpenses] = useState([])
  const [petrolCost, setPetrolCost] = useState(0)
  const [portfolioValue, setPortfolioValue] = useState(0)
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [editingSalary, setEditingSalary] = useState(false)
  const [newSalary, setNewSalary] = useState('')
  const [salaryError, setSalaryError] = useState(null)
  const [tab, setTab] = useState('budget')

  const salary = profile?.salary || 0
  const firstName = user.displayName?.split(' ')[0] || 'there'
  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const ref = query(collection(db, 'users', user.uid, 'expenses'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(ref, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoadingExpenses(false)
    })
    return unsub
  }, [user.uid])

  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalExpenses = expenseTotal + petrolCost
  const salaryBalance = Math.max(salary - totalExpenses, 0)
  const netWorth = salaryBalance + portfolioValue

  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const daysLeft = lastDay.getDate() - today.getDate() + 1
  const dailyAllowance = daysLeft > 0 ? salaryBalance / daysLeft : 0

  const handleSignOut = () => signOut(auth)

  const handleSalaryUpdate = async () => {
    const num = parseFloat(newSalary.replace(/,/g, ''))
    if (!num || num <= 0) { setSalaryError('Enter a valid amount'); return }
    try {
      const updated = { ...profile, salary: num }
      await setDoc(doc(db, 'users', user.uid), updated)
      onProfileUpdate(updated)
      setEditingSalary(false)
      setNewSalary('')
      setSalaryError(null)
    } catch {
      setSalaryError('Failed to save')
    }
  }

  const burnPct = salary > 0 ? Math.min(totalExpenses / salary, 1) : 0

  return (
    <div style={S.root}>
      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="glass" style={S.nav}>
        <div style={S.navBrand}>
          <svg width="28" height="28" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="25" stroke="var(--amber)" strokeWidth="1.5" opacity="0.4" />
            <circle cx="26" cy="26" r="14" stroke="var(--amber)" strokeWidth="1" opacity="0.15" />
            <circle cx="26" cy="26" r="5" fill="var(--amber)" />
          </svg>
          <span style={S.navWordmark}>Salary<em style={{ fontStyle: 'normal', color: 'var(--amber)' }}>Hub</em></span>
        </div>

        <div style={S.navRight}>
          {user.photoURL && (
            <img src={user.photoURL} alt={user.displayName} style={S.avatar} referrerPolicy="no-referrer" />
          )}
          <div style={S.userInfo}>
            <span style={S.userName}>{user.displayName}</span>
            <span style={S.userEmail}>{user.email}</span>
          </div>
          <button style={S.signOutBtn} onClick={handleSignOut} title="Sign out">
            <SignOutIcon />
          </button>
        </div>
      </nav>

      {/* ── Net Worth Bar ──────────────────────────────────── */}
      {portfolioValue > 0 && (
        <div style={S.netWorthBar}>
          <div style={S.netWorthInner}>
            <NetWorthItem label="Salary Balance" value={salaryBalance} color="var(--amber)" />
            <span style={S.netWorthPlus}>+</span>
            <NetWorthItem label="Portfolio" value={portfolioValue} color="var(--success)" />
            <span style={S.netWorthEq}>=</span>
            <NetWorthItem label="Net Worth" value={netWorth} color="var(--text)" bold />
          </div>
        </div>
      )}

      {/* ── Main Grid ──────────────────────────────────────── */}
      <main style={S.main}>

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside style={S.sidebar}>

          {/* Combined Salary + Burn Ring card */}
          <div className="glass" style={S.salaryCard}>
            <div style={S.salaryTop}>
              {/* Left: salary info + summary */}
              <div style={S.salaryInfo}>
                <p style={S.salaryLabel}>Monthly Salary</p>
                {editingSalary ? (
                  <div style={S.salaryEdit}>
                    <div style={S.salaryEditInput}>
                      <span style={S.salaryCurEdit}>R</span>
                      <input
                        type="text" inputMode="decimal" autoFocus
                        value={newSalary}
                        onChange={e => setNewSalary(e.target.value.replace(/[^0-9.,]/g, ''))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSalaryUpdate()
                          if (e.key === 'Escape') { setEditingSalary(false); setSalaryError(null) }
                        }}
                        placeholder={salary.toLocaleString('en-ZA')}
                        style={S.salaryInput}
                      />
                    </div>
                    {salaryError && <p style={S.salaryError}>{salaryError}</p>}
                    <div style={S.salaryEditBtns}>
                      <button style={S.salaryConfirm} onClick={handleSalaryUpdate}>Update</button>
                      <button style={S.salaryCancel} onClick={() => { setEditingSalary(false); setSalaryError(null) }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={S.salaryValueRow}>
                    <p style={S.salaryValue}>
                      R {salary.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <button style={S.editBtn} onClick={() => setEditingSalary(true)} title="Edit salary">
                      <EditIcon />
                    </button>
                  </div>
                )}

                <div style={S.salarySummary}>
                  <SummaryRow label="Expenses" value={expenseTotal} />
                  <SummaryRow label="Fuel" value={petrolCost} />
                  <SummaryRow
                    label="Balance"
                    value={salary - totalExpenses}
                    color={(salary - totalExpenses) < 0 ? 'var(--danger)' : 'var(--success)'}
                    bold
                  />
                </div>
              </div>

              {/* Right: burn ring */}
              <div style={S.ringWrap}>
                <BurnRing salary={salary} totalExpenses={totalExpenses} size={130} />
              </div>
            </div>
          </div>

          {/* Fuel Widget */}
          <FuelWidget onPetrolCost={setPetrolCost} />

        </aside>

        {/* ── Centre Column ────────────────────────────────── */}
        <section style={S.centre}>

          {/* Greeting */}
          <div style={S.heroRow}>
            <div style={S.greetBlock}>
              <p style={S.greet}>{greeting},</p>
              <h1 style={S.greetName}>{firstName}.</h1>
            </div>
            <div style={S.dailyAllowanceWrap}>
              <DailyAllowance salary={salary} totalExpenses={totalExpenses} />
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={S.tabArea}>
            <nav className="tab-nav">
              <button className={`tab-btn${tab === 'budget' ? ' active' : ''}`} onClick={() => setTab('budget')}>Budget</button>
              <button className={`tab-btn${tab === 'daily' ? ' active' : ''}`} onClick={() => setTab('daily')}>Daily</button>
              <button className={`tab-btn${tab === 'portfolio' ? ' active' : ''}`} onClick={() => setTab('portfolio')}>Portfolio</button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="glass" style={S.tabPanel}>
            {tab === 'budget' && (
              loadingExpenses ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 48, color: 'var(--text-soft)' }}>
                  <div style={{ width: 28, height: 28, border: '2px solid rgba(240,192,64,0.15)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 13 }}>Loading your expenses…</span>
                </div>
              ) : (
                <ExpenseList userId={user.uid} expenses={expenses} onExpensesChange={setExpenses} />
              )
            )}

            {tab === 'daily' && (
              <div style={{ padding: '20px 4px 8px' }}>
                <DailyPulse userId={user.uid} dailyAllowance={dailyAllowance} />
              </div>
            )}

            {tab === 'portfolio' && (
              <div style={{ padding: '20px 4px 8px' }}>
                <Portfolio userId={user.uid} onValueChange={setPortfolioValue} />
              </div>
            )}
          </div>

        </section>
      </main>
    </div>
  )
}

function NetWorthItem({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color, fontWeight: bold ? 700 : 500 }}>
        R {Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  )
}

function SummaryRow({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: color || 'var(--text-soft)', fontWeight: bold ? 600 : 400 }}>
        R {Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  )
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

const S = {
  root: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    position: 'relative', zIndex: 1,
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 28px', height: 60, position: 'sticky', top: 0, zIndex: 100,
    borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none',
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 10 },
  navWordmark: {
    fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(240,192,64,0.3)' },
  userInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  userName: { fontSize: 12, fontWeight: 600, color: 'var(--text)' },
  userEmail: { fontSize: 10, color: 'var(--text-soft)' },
  signOutBtn: {
    width: 32, height: 32, borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--muted-strong)', cursor: 'pointer', transition: 'all 0.2s ease',
  },
  netWorthBar: {
    background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)',
    padding: '8px 28px',
  },
  netWorthInner: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 20, maxWidth: 500, margin: '0 auto',
  },
  netWorthPlus: { fontSize: 16, color: 'var(--muted)', lineHeight: 1 },
  netWorthEq: { fontSize: 16, color: 'var(--muted)', lineHeight: 1 },
  main: {
    flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr',
    gap: 20, padding: '20px 24px 32px', maxWidth: 1400, margin: '0 auto', width: '100%',
  },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 14 },
  salaryCard: { borderRadius: 'var(--radius-lg)', padding: '20px 22px' },
  salaryTop: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  salaryInfo: { flex: 1, minWidth: 0 },
  salaryLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-soft)', marginBottom: 4 },
  salaryValueRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  salaryValue: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)', letterSpacing: '-0.01em' },
  editBtn: {
    width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--muted-strong)', cursor: 'pointer', flexShrink: 0,
  },
  salaryEdit: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 },
  salaryEditInput: { display: 'flex', alignItems: 'center', gap: 4 },
  salaryCurEdit: { fontSize: 14, color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', flexShrink: 0 },
  salaryInput: {
    flex: 1, padding: '6px 10px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,220,100,0.25)',
    borderRadius: 'var(--radius-sm)', color: 'var(--amber)', fontSize: 16,
    fontFamily: 'var(--font-mono)', fontWeight: 700,
  },
  salaryError: { fontSize: 11, color: 'var(--danger)' },
  salaryEditBtns: { display: 'flex', gap: 6 },
  salaryConfirm: {
    padding: '5px 14px', borderRadius: 6, background: 'var(--amber)', color: '#07070d',
    fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)', cursor: 'pointer',
  },
  salaryCancel: {
    padding: '5px 10px', borderRadius: 6,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-soft)', fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer',
  },
  salarySummary: { display: 'flex', flexDirection: 'column', gap: 0, marginTop: 4 },
  ringWrap: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  centre: { display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 },
  heroRow: { display: 'flex', gap: 16, alignItems: 'stretch' },
  greetBlock: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 4, flexShrink: 0 },
  greet: { fontSize: 13, color: 'var(--text-soft)', letterSpacing: '0.02em' },
  greetName: {
    fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 600,
    color: 'var(--text)', lineHeight: 1.05, letterSpacing: '-0.01em',
  },
  dailyAllowanceWrap: { flex: 1, minWidth: 0 },
  tabArea: { display: 'flex', alignItems: 'center' },
  tabPanel: {
    flex: 1, borderRadius: 'var(--radius-lg)', minHeight: 400, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
}
