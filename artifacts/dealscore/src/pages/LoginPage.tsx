import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Tab = 'login' | 'signup' | 'reset'

const NAVY = '#1B3A6B'
const NAVY_DARK = '#142d54'

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  marginBottom: '12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '15px',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
}

const btnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '11px',
  backgroundColor: NAVY,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginTop: '4px',
}

const errorStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '13px',
  marginBottom: '10px',
}

const successStyle: React.CSSProperties = {
  color: '#16a34a',
  fontSize: '13px',
  marginBottom: '10px',
  padding: '10px 12px',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '6px',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
  }

  function switchTab(t: Tab) {
    setTab(t)
    resetForm()
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (error) { setError(error.message); return }
    navigate('/dashboard', { replace: true })
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setSuccess('Check your email to confirm your account.')
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setSubmitting(false)
    if (error) { setError(error.message); return }
    setSuccess('Password reset email sent.')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'login', label: 'Log in' },
    { key: 'signup', label: 'Sign up' },
    { key: 'reset', label: 'Reset password' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: '400px',
        padding: '36px 32px 32px',
      }}>
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: NAVY,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>D</span>
            </div>
            <span style={{ color: NAVY, fontWeight: 700, fontSize: '20px', letterSpacing: '-0.3px' }}>
              DealScore
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '24px',
          gap: '0',
        }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              style={{
                flex: t.key === 'reset' ? '0 0 auto' : 1,
                padding: '8px 10px',
                fontSize: '13px',
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? NAVY : '#6b7280',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: tab === t.key ? `2px solid ${NAVY}` : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                marginBottom: '-1px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Success banner */}
        {success && <div style={successStyle}>{success}</div>}

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@example.com"
            />
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
            {error && <div style={errorStyle}>{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = NAVY_DARK }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = NAVY }}
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        )}

        {/* Signup form */}
        {tab === 'signup' && !success && (
          <form onSubmit={handleSignup}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@example.com"
            />
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Confirm password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
            />
            {error && <div style={errorStyle}>{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = NAVY_DARK }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = NAVY }}
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        {/* Reset password form */}
        {tab === 'reset' && !success && (
          <form onSubmit={handleReset}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', display: 'block', marginBottom: '4px' }}>
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@example.com"
            />
            {error && <div style={errorStyle}>{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              style={{ ...btnStyle, opacity: submitting ? 0.7 : 1 }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = NAVY_DARK }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = NAVY }}
            >
              {submitting ? 'Sending…' : 'Send reset email'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
