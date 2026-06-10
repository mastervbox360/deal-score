import { useState } from 'react'
import { useParams } from 'react-router-dom'

const NAVY      = '#1B3A6B'
const NAVY_DARK = '#152d55'
const TEAL      = '#1D9E75'
const TEAL_MID  = '#10B981'
const BG_SEC    = '#f5f6f8'
const DS_BORDER = '#e3e5e9'
const TEXT2     = '#6c757d'

type TrustLevel = 'committed' | 'open'
type Response   = 'none' | 'interested' | 'passed'

function Toast({ msg, visible }: { msg: string; visible: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: '90px', left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '10px'})`,
      background: '#1a1a2e', color: '#fff', padding: '8px 18px',
      borderRadius: '20px', fontSize: '12px', fontWeight: 500,
      opacity: visible ? 1 : 0, transition: 'all .25s',
      pointerEvents: 'none', zIndex: 300, whiteSpace: 'nowrap',
    }}>{msg}</div>
  )
}

export default function InvestorSharePage() {
  const { token } = useParams<{ token: string }>()

  const [trust, setTrust]       = useState<TrustLevel>('committed')
  const [response, setResponse] = useState<Response>('none')
  const [showInterested, setShowInterested] = useState(false)
  const [showPass, setShowPass]             = useState(false)
  const [intNote, setIntNote]   = useState('')
  const [passNote, setPassNote] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [toastVis, setToastVis] = useState(false)

  const isProtected = trust === 'open'

  function toast(msg: string) {
    setToastMsg(msg)
    setToastVis(true)
    setTimeout(() => setToastVis(false), 2800)
  }

  function submitResponse(type: 'interested' | 'passed') {
    setShowInterested(false)
    setShowPass(false)
    setResponse(type)
    toast(type === 'interested'
      ? 'Response sent — sourcer notified ✓'
      : 'Response sent — sourcer notified')
  }

  const accentColor = TEAL_MID

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#eef0f4', minHeight: '100vh', fontSize: '13px', color: '#1a1a2e' }}>
      <Toast msg={toastMsg} visible={toastVis} />

      {showInterested && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', maxWidth: '400px', width: 'calc(100% - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#d1fae5', color: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>👍</div>
            <div style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center', marginBottom: '6px' }}>I'm interested</div>
            <div style={{ fontSize: '12px', color: TEXT2, textAlign: 'center', lineHeight: 1.6, marginBottom: '18px' }}>Leave a note for the deal sourcer — any questions, conditions, or thoughts on the deal. Completely optional.</div>
            <textarea
              value={intNote} onChange={e => setIntNote(e.target.value)}
              placeholder="e.g. This looks great — can we discuss timeline? I'm a cash buyer and can move quickly."
              style={{ border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '10px 12px', fontSize: '12px', width: '100%', height: '80px', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: '12px', fontFamily: 'inherit' }}
            />
            <button onClick={() => submitResponse('interested')} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: accentColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px', fontFamily: 'inherit' }}>
              ✓ Confirm interest
            </button>
            <button onClick={() => setShowInterested(false)} style={{ width: '100%', padding: '9px', border: `0.5px solid ${DS_BORDER}`, borderRadius: '10px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: '#fff', color: TEXT2, fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showPass && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', maxWidth: '400px', width: 'calc(100% - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>👎</div>
            <div style={{ fontSize: '16px', fontWeight: 700, textAlign: 'center', marginBottom: '6px' }}>Not for me</div>
            <div style={{ fontSize: '12px', color: TEXT2, textAlign: 'center', lineHeight: 1.6, marginBottom: '18px' }}>Let the sourcer know why — it helps them find better matched deals for you in future. Optional.</div>
            <textarea
              value={passNote} onChange={e => setPassNote(e.target.value)}
              placeholder="e.g. Yield a bit low for my current target. Keep me in mind for HMO deals in the same area."
              style={{ border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '10px 12px', fontSize: '12px', width: '100%', height: '80px', resize: 'none', outline: 'none', lineHeight: 1.5, marginBottom: '12px', fontFamily: 'inherit' }}
            />
            <button onClick={() => submitResponse('passed')} style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px', fontFamily: 'inherit' }}>
              ✕ Confirm — not for me
            </button>
            <button onClick={() => setShowPass(false)} style={{ width: '100%', padding: '9px', border: `0.5px solid ${DS_BORDER}`, borderRadius: '10px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', background: '#fff', color: TEXT2, fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: NAVY, padding: '0 24px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
          Deal<span style={{ color: TEAL_MID }}>Score</span>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.45)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>Investment opportunity</span>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', border: '0.5px solid rgba(255,255,255,.15)' }}>Shared privately</span>
        </div>
      </div>

      {/* Trust banner */}
      <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', background: BG_SEC, borderLeft: `3px solid ${isProtected ? '#f59e0b' : '#9ca3af'}`, color: '#1a1a2e' }}>
        <span style={{ fontSize: '13px', flexShrink: 0 }}>{isProtected ? '🔒' : '🛡️'}</span>
        {isProtected
          ? <span><strong>Protected view:</strong> Address and precise location are hidden until you register interest. Respond below to reveal full details.</span>
          : <span><strong>Full access:</strong> You're viewing this deal with full property details including address and photos. This deal has been shared with you by your deal sourcer.</span>
        }
      </div>

      {/* Trust toggle (mockup helper) */}
      <div style={{ background: '#fff', borderBottom: `0.5px solid ${DS_BORDER}`, padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#bbb' }}>View as:</span>
        {(['committed', 'open'] as TrustLevel[]).map(t => (
          <button key={t} onClick={() => setTrust(t)}
            style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px', border: `0.5px solid ${DS_BORDER}`, background: trust === t ? NAVY : '#fff', color: trust === t ? '#fff' : TEXT2, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
            {t === 'committed' ? 'Committed (full access)' : 'Open market (protected)'}
          </button>
        ))}
        {token && <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#bbb' }}>Token: {token}</span>}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '28px 24px 120px' }}>

        {/* Deal hero */}
        <div style={{ background: '#fff', borderRadius: '12px', border: `0.5px solid ${DS_BORDER}`, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ height: '180px', background: `linear-gradient(135deg, ${NAVY_DARK} 0%, ${NAVY} 100%)`, display: 'flex', alignItems: 'flex-end', padding: '16px 20px', position: 'relative' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 1 }}>
              📷 Property photos shared by sourcer
            </div>
            {isProtected && (
              <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 2, background: 'rgba(217,119,6,.9)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                👁️ Address protected
              </div>
            )}
          </div>
          <div style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#bbb', marginBottom: '6px' }}>DS-004 · Buy to Let</div>
            <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', lineHeight: 1.25, filter: isProtected ? 'blur(5px)' : 'none', userSelect: isProtected ? 'none' : undefined, transition: 'filter .3s' }}>
              14 Roath Court Road, Cardiff CF24 3PE
            </div>
            <div style={{ fontSize: '12px', color: TEXT2, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              📍 Roath, Cardiff · 2-bed terrace · 750 sq ft
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'Buy to Let', color: NAVY },
                { label: 'Freehold', color: '#9ca3af' },
                { label: '✦ DealScore: Recommended', color: TEAL_MID },
              ].map(tag => (
                <span key={tag.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, padding: '2px 8px 2px 7px', background: BG_SEC, borderRadius: '4px', borderLeft: `3px solid ${tag.color}`, whiteSpace: 'nowrap', color: '#1a1a2e' }}>
                  {tag.label}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: `0.5px solid ${DS_BORDER}` }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>VM</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>Videet Mardania</div>
                <div style={{ fontSize: '10px', color: TEXT2 }}>Property Sourcing Co. · FCA regulated</div>
              </div>
              <span style={{ fontSize: '9px', color: TEXT2, background: BG_SEC, border: `0.5px solid ${DS_BORDER}`, padding: '2px 8px', borderRadius: '20px' }}>🛡️ FCA 789012</span>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Purchase price', val: '£175,000', sub: 'Below market value', col: NAVY },
            { label: 'Monthly cash flow', val: '+£312/mo', sub: 'After all costs', col: TEAL },
            { label: 'Gross yield', val: '7.4%', sub: 'Above local average', col: '#166534' },
            { label: 'CoC ROI', val: '8.2%', sub: 'Year 1', col: '#1a1a2e' },
            { label: 'Total cash needed', val: '£57,850', sub: 'Deposit + costs + refurb', col: '#1a1a2e' },
            { label: 'Sourcing fee', val: '£6,500', sub: 'Payable on completion', col: NAVY },
          ].map(m => (
            <div key={m.label} style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#bbb', marginBottom: '5px' }}>{m.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: m.col, lineHeight: 1 }}>{m.val}</div>
              <div style={{ fontSize: '10px', color: TEXT2, marginTop: '3px' }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Financial breakdown */}
        <Section icon="🧮" title="Financial breakdown">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#bbb', marginBottom: '8px' }}>Acquisition costs</div>
              {[
                ['Purchase price', '£175,000'],
                ['Stamp duty (LTT)', '£9,425'],
                ['Legal fees', '£1,800'],
                ['Survey', '£450'],
                ['Refurb estimate', '£6,200'],
                ['Sourcing fee', '£6,500'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '7px 0', borderBottom: `0.5px solid #f3f4f6`, fontSize: '12px' }}>
                  <span style={{ color: TEXT2 }}>{l}</span>
                  <span style={{ fontWeight: 600, color: l === 'Sourcing fee' ? NAVY : '#1a1a2e' }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#bbb', marginBottom: '8px' }}>Monthly income & costs</div>
              {[
                ['Rental income', '£1,150/mo', TEAL],
                ['Mortgage (BTL 75%)', '-£543/mo', null],
                ['Management (10%)', '-£115/mo', null],
                ['Insurance', '-£58/mo', null],
                ['Maintenance (5%)', '-£58/mo', null],
                ['Void allowance (5%)', '-£64/mo', null],
              ].map(([l, v, col]) => (
                <div key={l as string} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '7px 0', borderBottom: `0.5px solid #f3f4f6`, fontSize: '12px' }}>
                  <span style={{ color: TEXT2 }}>{l as string}</span>
                  <span style={{ fontWeight: 600, color: (col as string | null) ?? '#1a1a2e' }}>{v as string}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#eef3fb', borderRadius: '8px', padding: '10px 12px', marginTop: '8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: NAVY }}>Net monthly cash flow</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: NAVY }}>+£312/mo</span>
          </div>
        </Section>

        {/* Why this deal */}
        <Section icon="✦" title="Why this deal works">
          {[
            { icon: '📈', title: 'Below market value purchase', body: 'Agreed at £175,000 against a market value of £192,000 — representing an immediate 9% BMV. Vendor is motivated for a quick sale due to relocation.' },
            { icon: '🏠', title: 'Strong rental demand in Roath', body: 'Roath is one of Cardiff\'s highest-demand rental areas, driven by proximity to Cardiff University and the hospital district. Void periods typically under 2 weeks.' },
            { icon: '🛡️', title: 'Light refurb, move-in ready', body: 'The property requires cosmetic work only — new kitchen, bathroom refresh, and redecoration. Estimated 4–6 weeks at £6,200. No structural work needed.' },
            { icon: '💰', title: 'Positive cash flow from month one', body: 'After mortgage, management, insurance, maintenance, and void allowances, this deal returns +£312/month net. Break-even rent is £838/month against an expected £1,150.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: `0.5px solid #f3f4f6` }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>{item.title}</div>
                <div style={{ fontSize: '11px', color: TEXT2, lineHeight: 1.5 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </Section>

        {/* Property details */}
        <Section icon="🏢" title="Property details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              ['Property type', '2-bed mid-terrace'],
              ['Tenure', 'Freehold'],
              ['Floor area', '~750 sq ft'],
              ['EPC rating', 'D (68) — C achievable'],
              ['Construction', '1930s brick'],
              ['Parking', 'On-street'],
              ['Council tax band', 'Band C — £1,748/yr'],
              ['Council', 'Cardiff City Council'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#bbb' }}>{l}</div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Location */}
        <Section icon="📍" title="Location">
          <div style={{ height: '140px', background: 'linear-gradient(135deg,#f0f4f8,#e8edf2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '6px', border: `0.5px solid ${DS_BORDER}` }}>
            <span style={{ fontSize: '24px', color: '#bbb' }}>🗺️</span>
            <span style={{ fontSize: '11px', color: '#bbb' }}>{isProtected ? 'Cardiff CF24 area · approx. location only' : 'Cardiff CF24 area · Roath district'}</span>
          </div>
          {isProtected && (
            <div style={{ fontSize: '10px', color: '#92400e', background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '20px', padding: '2px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
              👁️ Exact address revealed on deal agreement
            </div>
          )}
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['0.3mi Cardiff University', '0.5mi UHW Hospital', '0.8mi Roath Park Lake', '1.2mi Cardiff city centre'].map(tag => (
              <span key={tag} style={{ fontSize: '11px', color: TEXT2, background: BG_SEC, border: `0.5px solid ${DS_BORDER}`, padding: '3px 10px', borderRadius: '20px' }}>{tag}</span>
            ))}
          </div>
        </Section>

        {/* Disclaimer */}
        <div style={{ background: BG_SEC, border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '10px 14px', fontSize: '10px', color: '#9ca3af', lineHeight: 1.6, marginBottom: '16px' }}>
          <strong style={{ color: TEXT2 }}>Important:</strong> This deal summary has been prepared by the deal sourcer and is shared for information purposes only. Financial projections are estimates based on current market conditions and are not guaranteed. DealScore does not provide financial advice. Always seek independent financial and legal advice before making any investment decision. This deal summary is confidential and intended only for the named recipient.
        </div>
      </div>

      {/* Sticky response bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#fff', borderTop: `0.5px solid ${DS_BORDER}`, boxShadow: '0 -4px 20px rgba(0,0,0,.1)', padding: '0 24px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>
            {isProtected ? 'DS-004 · Cardiff CF24' : 'DS-004 · 14 Roath Court Rd, Cardiff CF24'}
          </div>
          <div style={{ fontSize: '10px', color: TEXT2 }}>Let the sourcer know your decision — takes 10 seconds</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {response === 'none' ? (
            <>
              <button onClick={() => setShowPass(true)} style={{ fontSize: '12px', fontWeight: 600, padding: '10px 18px', borderRadius: '10px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', color: TEXT2, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                👎 Not for me
              </button>
              <button onClick={() => setShowInterested(true)} style={{ fontSize: '13px', fontWeight: 700, padding: '10px 24px', borderRadius: '10px', background: accentColor, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' }}>
                👍 I'm interested
              </button>
            </>
          ) : (
            <div style={{ fontSize: '12px', fontWeight: 600, color: response === 'interested' ? TEAL : '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {response === 'interested'
                ? '✓ Response sent — the sourcer has been notified of your interest'
                : '✕ Marked as not for you — sourcer will keep you in mind for future deals'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: `0.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: '12px' }}>
      <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px' }}>{icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  )
}
