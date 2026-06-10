import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { startCheckout } from '../lib/checkoutService'

const NAVY = '#1B3A6B'
const NAVY_LIGHT = '#eef3fb'
const TEAL = '#1D9E75'
const BORDER = '#e3e5e9'
const TEXT1 = '#1a1a2e'
const TEXT2 = '#6c757d'
const BG_SEC = '#f5f6f8'
const AMBER = '#D97706'
const PURPLE = '#7C3AED'

export type UpgradeModalState = 'A1' | 'A2' | 'A3' | 'B' | 'C'

interface UpgradeModalProps {
  state: UpgradeModalState
  onClose: () => void
  contextFeature?: string
  contextIcon?: string
  contextTitle?: string
  contextSub?: string
}

function Feat({ check, dim, children }: { check?: string; dim?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '2px 0' }}>
      <span style={{ color: dim ? '#9ca3af' : TEAL, fontSize: 10, marginTop: 1, flexShrink: 0 }}>{check ?? (dim ? '+' : '✓')}</span>
      <span style={{ fontSize: 11, color: TEXT2 }}>{children}</span>
    </div>
  )
}

export default function UpgradeModal({ state, onClose, contextFeature, contextIcon, contextTitle, contextSub }: UpgradeModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState<'pro' | 'pro_plus' | null>(null)
  const [agencyEmail, setAgencyEmail] = useState(user?.email ?? '')
  const [agencySubmitted, setAgencySubmitted] = useState(false)

  async function handleCheckout(tier: 'pro' | 'pro_plus') {
    if (!user) return
    setLoading(tier)
    try {
      await startCheckout(tier, user.id, user.email ?? '')
    } catch {
      setLoading(null)
    }
  }

  let content: React.ReactNode = null

  if (state === 'A1' || state === 'A2') {
    const icon = state === 'A2' ? (contextIcon ?? '📄') : '🔒'
    const title = state === 'A2' ? (contextTitle ?? 'Unlock This Feature') : 'Unlock DealScore Pro'
    const sub = state === 'A2'
      ? (contextSub ?? 'Upgrade to Pro to access this feature and unlock your full sourcing toolkit.')
      : 'Save deals, generate investor packs, and manage your pipeline professionally.'

    const proFeats = state === 'A2'
      ? ['Up to 10 active deals', 'Investor pack PDF — portrait, DealScore branded', 'Investors + Sellers CRM', 'AI pack generation', 'Sensitivity analysis']
      : ['Up to 10 active deals', 'Single-strategy analysis — all 7 strategies', 'Investor pack PDF — portrait, DealScore branded', 'Investors + Sellers CRM', 'AI pack generation']

    content = (
      <>
        {state === 'A2' && contextFeature && (
          <div style={{ background: 'rgba(27,58,107,.06)', border: '.5px solid rgba(27,58,107,.15)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: NAVY, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-lock" style={{ fontSize: 12 }} /> {contextFeature}
          </div>
        )}
        <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>{icon}</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT1, marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: 12, color: TEXT2, lineHeight: 1.6, marginBottom: 14 }}>{sub}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {/* Pro */}
          <div style={{ background: NAVY_LIGHT, border: `.5px solid ${NAVY}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3, color: NAVY }}>Pro</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: NAVY, marginBottom: 1 }}>£29</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 10 }}>/month after trial</div>
            <div style={{ marginBottom: 10 }}>
              {proFeats.map(f => <Feat key={f}>{f}</Feat>)}
            </div>
            <button onClick={() => handleCheckout('pro')} disabled={loading !== null} style={{ width: '100%', padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', background: NAVY, color: '#fff', fontFamily: 'inherit', opacity: loading === 'pro_plus' ? .55 : 1 }}>
              {loading === 'pro' ? 'Redirecting…' : 'Start free trial'}
            </button>
          </div>

          {/* Pro Plus */}
          <div style={{ background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3, color: TEXT2 }}>Pro Plus</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: TEXT1, marginBottom: 1 }}>£59</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 10 }}>/month</div>
            <div style={{ marginBottom: 10 }}>
              <Feat dim>Everything in Pro</Feat>
              <Feat dim>Smart Capture — one form, all 7 strategies</Feat>
              <Feat dim>Unlimited active deals</Feat>
              <Feat dim>White-label branding</Feat>
              <Feat dim>Deal Optimiser + Compare</Feat>
            </div>
            <button onClick={() => handleCheckout('pro_plus')} disabled={loading !== null} style={{ width: '100%', padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', background: '#fff', border: `.5px solid ${BORDER}`, color: TEXT2, fontFamily: 'inherit', opacity: loading === 'pro' ? .55 : 1 }}>
              {loading === 'pro_plus' ? 'Redirecting…' : 'Upgrade to Pro Plus'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>7-day free trial on Pro · No card required · Cancel any time</div>
        <button onClick={onClose} style={{ display: 'block', width: '100%', fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', fontFamily: 'inherit' }}>Maybe later</button>
      </>
    )
  }

  if (state === 'A3') {
    content = (
      <>
        <div style={{ background: 'rgba(27,58,107,.06)', border: '.5px solid rgba(27,58,107,.15)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: NAVY, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-lock" style={{ fontSize: 12 }} /> Smart Capture — Pro Plus feature
        </div>
        <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>⚡</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT1, marginBottom: 5 }}>Unlock Smart Capture</div>
        <div style={{ fontSize: 12, color: TEXT2, lineHeight: 1.6, marginBottom: 14 }}>Fill in one consolidated form and DealScore analyses all 7 strategies in a single pass — no re-entering data per strategy.</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {/* Pro (current) */}
          <div style={{ background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3, color: TEXT2 }}>Pro</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: TEXT1, marginBottom: 1 }}>£29</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 10 }}>/month — your current plan</div>
            <div style={{ marginBottom: 10 }}>
              <Feat>Single-strategy analysis</Feat>
              <Feat>All 7 strategies available</Feat>
              <div style={{ display: 'flex', gap: 5, padding: '2px 0', opacity: .45 }}>
                <span style={{ color: '#9ca3af', fontSize: 10, marginTop: 1, flexShrink: 0 }}>✗</span>
                <span style={{ fontSize: 11, color: TEXT2 }}>Smart Capture form</span>
              </div>
              <div style={{ display: 'flex', gap: 5, padding: '2px 0', opacity: .45 }}>
                <span style={{ color: '#9ca3af', fontSize: 10, marginTop: 1, flexShrink: 0 }}>✗</span>
                <span style={{ fontSize: 11, color: TEXT2 }}>Per-field guidance sidebar</span>
              </div>
            </div>
          </div>

          {/* Pro Plus */}
          <div style={{ background: NAVY_LIGHT, border: `.5px solid ${NAVY}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3, color: NAVY }}>Pro Plus</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: NAVY, marginBottom: 1 }}>£59</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 10 }}>/month</div>
            <div style={{ marginBottom: 10 }}>
              <Feat dim>Smart Capture — one form, all 7 strategies</Feat>
              <Feat dim>Per-field guidance sidebar</Feat>
              <Feat dim>Unlimited active deals</Feat>
              <Feat dim>White-label branding</Feat>
              <Feat dim>Deal Optimiser + Compare</Feat>
            </div>
            <button onClick={() => handleCheckout('pro_plus')} disabled={loading !== null} style={{ width: '100%', padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', background: AMBER, color: '#fff', fontFamily: 'inherit' }}>
              {loading === 'pro_plus' ? 'Redirecting…' : 'Upgrade to Pro Plus — £59/mo'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>First Pro Plus month at £29 — offer for trial users</div>
        <button onClick={onClose} style={{ display: 'block', width: '100%', fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', fontFamily: 'inherit' }}>Stay on Pro</button>
      </>
    )
  }

  if (state === 'B') {
    content = (
      <>
        <span style={{ fontSize: 26, display: 'block', marginBottom: 10 }}>⚡</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT1, marginBottom: 5 }}>Upgrade to Pro Plus</div>
        <div style={{ fontSize: 12, color: TEXT2, lineHeight: 1.6, marginBottom: 14 }}>You're on Pro. Pro Plus unlocks Smart Capture, unlimited deals, white-label branding, Deal Optimiser, and Compare view.</div>

        <div style={{ background: BG_SEC, border: `.5px solid ${AMBER}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#854F0B', marginBottom: 4 }}>Pro Plus</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#854F0B' }}>£59 <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>/month</span></div>
          <div style={{ marginTop: 10, marginBottom: 12 }}>
            {[
              'Everything in your current Pro plan',
              'Smart Capture — one consolidated form, all 7 strategies in one pass',
              'Per-field guidance sidebar — where to source every data point',
              'Unlimited active deals (Pro capped at 10)',
              'White-label branding — your logo and colours on every pack',
              'Landscape PDF (10-page institutional format)',
              'Deal Optimiser — max purchase price calculator',
              'Compare view + Radar chart',
            ].map(f => (
              <div key={f} style={{ display: 'flex', gap: 5, padding: '2px 0' }}>
                <span style={{ color: AMBER, fontSize: 10, marginTop: 1, flexShrink: 0 }}>+</span>
                <span style={{ fontSize: 11, color: TEXT2 }}>{f}</span>
              </div>
            ))}
          </div>
          <button onClick={() => handleCheckout('pro_plus')} disabled={loading !== null} style={{ width: '100%', padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', border: 'none', background: AMBER, color: '#fff', fontFamily: 'inherit' }}>
            {loading === 'pro_plus' ? 'Redirecting…' : 'Upgrade to Pro Plus — £59/mo'}
          </button>
        </div>

        <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>First Pro Plus month at £29 — offer for existing Pro subscribers</div>
        <button onClick={onClose} style={{ display: 'block', width: '100%', fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', fontFamily: 'inherit' }}>Stay on Pro</button>
      </>
    )
  }

  if (state === 'C') {
    content = (
      <>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(124,58,237,.08)', border: '.5px solid rgba(124,58,237,.2)', color: PURPLE, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, marginBottom: 12, letterSpacing: '.06em' }}>
          ✦ You're on the highest available tier
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT1, marginBottom: 5 }}>Agency is coming</div>
        <div style={{ fontSize: 12, color: TEXT2, lineHeight: 1.6, marginBottom: 14 }}>Pro Plus is currently the top tier. Agency — with full app white-labelling, team seats, and custom domain — is on its way.</div>

        <div style={{ marginBottom: 12 }}>
          {[
            { title: 'Full app white-label', desc: '— your brand replaces DealScore everywhere. Your investors see your product, not ours.' },
            { title: 'Team seats + deal assignment', desc: '— manage sourcers and VAs under one Agency account.' },
            { title: 'Custom domain', desc: '— your deals at deals.yourbrand.co.uk' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 0', borderBottom: `.5px solid #f3f4f6` }}>
              <div style={{ width: 5, height: 5, background: PURPLE, borderRadius: '50%', marginTop: 5, flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: TEXT2, lineHeight: 1.5 }}>
                <strong style={{ color: TEXT1, fontWeight: 500 }}>{item.title}</strong>{item.desc}
              </div>
            </div>
          ))}
        </div>

        {agencySubmitted ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <i className="ti ti-circle-check" style={{ fontSize: 24, color: TEAL, display: 'block', marginBottom: 6 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT1 }}>You're on the list</div>
            <div style={{ fontSize: 11, color: TEXT2, marginTop: 3 }}>We'll email you before Agency launches publicly.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <input value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)} placeholder="your@email.com" style={{ flex: '1 1 160px', minWidth: 0, border: `.5px solid ${BORDER}`, borderRadius: 6, padding: '8px 10px', fontSize: 12, color: TEXT1, fontFamily: 'inherit', outline: 'none' }} />
            <button onClick={() => { if (agencyEmail.includes('@')) setAgencySubmitted(true) }} style={{ flex: '1 1 200px', background: PURPLE, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', textAlign: 'center' }}>
              Notify me when Agency launches
            </button>
          </div>
        )}

        <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>No commitment. We'll reach out when Agency is ready for early access.</div>
        <button onClick={onClose} style={{ display: 'block', width: '100%', fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', fontFamily: 'inherit' }}>Close</button>
      </>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', border: `.5px solid ${BORDER}`, boxShadow: '0 8px 32px rgba(0,0,0,.16)', borderRadius: 12, padding: 22, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        {content}
      </div>
    </div>
  )
}
