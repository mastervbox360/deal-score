import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { startCheckout } from '../lib/checkoutService'
import { UserTier } from '../lib/database.types'
import AppHeader from '../components/AppHeader'

const NAVY = '#1B3A6B'

const TIER_LABELS: Record<UserTier, string> = {
  free: 'Free',
  pro: 'Pro',
  pro_plus: 'Pro Plus',
}

const TIER_COLOURS: Record<UserTier, { bg: string; text: string }> = {
  free:     { bg: '#f3f4f6', text: '#374151' },
  pro:      { bg: '#dbeafe', text: '#1e40af' },
  pro_plus: { bg: '#fef3c7', text: '#92400e' },
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#fff',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
}

export default function ProfilePage() {
  const { user, profile } = useAuth()

  const [fullName, setFullName]       = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<'pro' | 'pro_plus' | null>(null)
  const [checkoutError, setCheckoutError]     = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setCompanyName(profile.company_name ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:    fullName    || null,
        company_name: companyName || null,
        phone:        phone       || null,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleUpgrade(tier: 'pro' | 'pro_plus') {
    if (!user) return
    setCheckoutLoading(tier)
    setCheckoutError(null)
    try {
      await startCheckout(tier, user.id, user.email ?? '')
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed')
      setCheckoutLoading(null)
    }
  }

  const tier       = profile?.tier ?? 'free'
  const tierStyle  = TIER_COLOURS[tier]
  const trialDays  = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()
    ? daysUntil(profile.trial_ends_at)
    : null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <AppHeader />

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '28px' }}>My Profile</h1>

        {/* Account details */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '20px' }}>Account details</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <div style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#6b7280' }}>{user?.email ?? '—'}</div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Full name</label>
            <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Company name</label>
            <input style={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your company (optional)" />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 000000" />
          </div>

          {saveError && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
              {saveError}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saved ? '#059669' : saving ? '#9ca3af' : NAVY,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 24px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>

        {/* Subscription */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: 0 }}>Subscription</h2>
            <span style={{
              backgroundColor: tierStyle.bg,
              color: tierStyle.text,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '13px',
              fontWeight: 700,
            }}>
              {TIER_LABELS[tier]}
            </span>
          </div>

          {trialDays !== null && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#166534', marginBottom: '16px' }}>
              Pro trial — <strong>{trialDays} day{trialDays !== 1 ? 's' : ''} remaining</strong>
            </div>
          )}

          {checkoutError && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
              {checkoutError}
            </div>
          )}

          {tier === 'free' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px' }}>
                Unlock unlimited deals, investor packs, and more.
              </p>
              <button
                onClick={() => handleUpgrade('pro')}
                disabled={checkoutLoading !== null}
                style={{
                  backgroundColor: NAVY,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '11px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  opacity: checkoutLoading === 'pro_plus' ? 0.55 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {checkoutLoading === 'pro' ? 'Redirecting…' : 'Upgrade to Pro — £19/mo'}
              </button>
              <button
                onClick={() => handleUpgrade('pro_plus')}
                disabled={checkoutLoading !== null}
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '11px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                  opacity: checkoutLoading === 'pro' ? 0.55 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {checkoutLoading === 'pro_plus' ? 'Redirecting…' : 'Upgrade to Pro Plus — £49/mo'}
              </button>
            </div>
          )}

          {tier === 'pro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => window.open('https://billing.stripe.com/p/login', '_blank')}
                style={{
                  backgroundColor: '#fff',
                  color: NAVY,
                  border: `1px solid ${NAVY}`,
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Manage billing
              </button>
              <button
                onClick={() => handleUpgrade('pro_plus')}
                disabled={checkoutLoading !== null}
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {checkoutLoading === 'pro_plus' ? 'Redirecting…' : 'Upgrade to Pro Plus — £49/mo'}
              </button>
            </div>
          )}

          {tier === 'pro_plus' && (
            <button
              onClick={() => window.open('https://billing.stripe.com/p/login', '_blank')}
              style={{
                backgroundColor: '#fff',
                color: NAVY,
                border: `1px solid ${NAVY}`,
                borderRadius: '6px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Manage billing
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
