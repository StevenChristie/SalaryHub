import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import Dashboard from './Dashboard_1'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        const snap = await getDoc(doc(db, 'users', u.uid))
        if (snap.exists()) {
          setProfile(snap.data())
        } else {
          const base = { salary: 0 }
          await setDoc(doc(db, 'users', u.uid), base)
          setProfile(base)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
      <div style={{ width: 36, height: 36, border: '2px solid rgba(240,192,64,0.15)', borderTopColor: 'var(--amber)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!user) return <Login />

  return <Dashboard user={user} profile={profile} onProfileUpdate={setProfile} />
}

function Login() {
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState(null)

  const handleSignIn = async () => {
    setSigning(true)
    setError(null)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (e) {
      setError('Sign-in failed. Please try again.')
      setSigning(false)
    }
  }

  return (
    <div className="login-root">
      <div className="login-card glass">
        <div className="login-logo">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="25" stroke="var(--amber)" strokeWidth="1.5" opacity="0.4" />
            <circle cx="26" cy="26" r="14" stroke="var(--amber)" strokeWidth="1" opacity="0.2" />
            <circle cx="26" cy="26" r="5" fill="var(--amber)" />
          </svg>
          <span className="login-wordmark">Salary<em>Hub</em></span>
        </div>

        <p className="login-sub">
          Your personal finance command centre.<br />Sign in to access your dashboard.
        </p>

        <button className="login-google-btn" onClick={handleSignIn} disabled={signing}>
          <GoogleIcon />
          {signing ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
