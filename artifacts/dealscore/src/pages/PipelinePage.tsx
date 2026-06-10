import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY      = '#1B3A6B'
const NAVY_DARK = '#152d55'
const NAVY_DEEP = '#0f2040'
const TEAL      = '#1D9E75'
const TEAL_MID  = '#10B981'
const DS_BORDER = '#e3e5e9'
const BG_SEC    = '#f5f6f8'
const BG_BODY   = '#eef0f4'
const TEXT_1    = '#1a1a2e'
const TEXT_2    = '#6c757d'
const AMBER     = '#D97706'
const HDR_H     = 56
const BBAR_H    = 54

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewTab = 'funnel' | 'stalled' | 'targets'

interface FunnelRow {
  stage: string
  n: number
  pctOfPrev: number | null
}
interface StalledDeal {
  id: string
  addr: string
  strat: string
  stage: string
  days: number
  severity: 'high' | 'med' | 'low'
  meta: string
  suggest: string
}

// ─── Static data ──────────────────────────────────────────────────────────────
const FUNNEL: FunnelRow[] = [
  { stage: 'Sourced',  n: 23, pctOfPrev: null },
  { stage: 'Ready',    n: 14, pctOfPrev: 61 },
  { stage: 'Live',     n: 9,  pctOfPrev: 64 },
  { stage: 'Reserved', n: 6,  pctOfPrev: 67 },
  { stage: 'Complete', n: 4,  pctOfPrev: 67 },
]
const LIVE_NOW = [5, 4, 3, 4, 0]
const FUNNEL_COLORS = ['#1B3A6B', '#1e4a88', '#1761a8', '#0e7490', '#1D9E75']

const STALLED: StalledDeal[] = [
  { id: 'DS-004', addr: '22 Oak Road, Sheffield S1', strat: 'FLIP', stage: 'Sourcing', days: 26, severity: 'high',
    meta: 'Margin came back thin at asking price', suggest: 'Renegotiate the offer, or let this one go and free up your time' },
  { id: 'DS-002', addr: '12 Victoria Street, Manchester M1', strat: 'HMO', stage: 'Pack sent', days: 12, severity: 'med',
    meta: 'Pack sent to 3 investors — no replies yet', suggest: 'A quick follow-up message often restarts a stalled pack' },
  { id: 'DS-003', addr: '8 Park Lane, Birmingham B15', strat: 'BRRR', stage: 'Live', days: 9, severity: 'low',
    meta: 'Refurb running, no viewing booked this week', suggest: 'Worth booking a check-in to keep momentum visible' },
]

const TODAY_CHIPS = [
  { type: 'viewing', typeLabel: 'Viewing tomorrow', addr: '65a Horwood Close, Leeds LS7', detail: '10:30am · Sarah Michaels', action: '📅 View deal →' },
  { type: 'chase',   typeLabel: 'Chase due today',  addr: '14 Roath Court Rd, Cardiff CF24', detail: 'Reserved · Day 8 · Derek Hassan', action: '📞 Open Seller tab →' },
  { type: 'day15',   typeLabel: 'Day 15 in 7 days', addr: '65a Horwood Close, Leeds LS7', detail: 'Cooling off ends — release pack or renegotiate', action: '📤 Release pack →' },
  { type: 'viewing', typeLabel: 'Viewing Thu 5 Jun', addr: '12 Victoria Street, Manchester M1', detail: '2:00pm · David Jones', action: '📅 View deal →' },
  { type: 'sens',    typeLabel: 'Sensitivity reminder', addr: '3 Marina View, Brighton BN1', detail: 'Rate change flagged — check Sensitivity tab', action: '⚙️ View Sensitivity →' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email.slice(0, 2).toUpperCase() : '??'
}

function convClass(pct: number | null): string {
  if (pct === null) return ''
  if (pct >= 70) return 'healthy'
  if (pct >= 55) return 'watch'
  return 'weak'
}

const CONV_COLOR: Record<string, string> = { healthy: TEAL_MID, watch: AMBER, weak: '#DC2626', '': TEXT_2 }

// ─── Today chip colours ───────────────────────────────────────────────────────
const CHIP_STYLES: Record<string, React.CSSProperties> = {
  viewing: { background: '#eff6ff', borderColor: '#bfdbfe' },
  chase:   { background: '#fef3c7', borderColor: '#fde68a' },
  day15:   { background: 'rgba(124,58,237,.06)', borderColor: 'rgba(124,58,237,.2)' },
  sens:    { background: BG_SEC, borderColor: DS_BORDER },
}
const CHIP_TYPE_COLOR: Record<string, string> = {
  viewing: '#1e40af', chase: '#92400e', day15: '#5B21B6', sens: TEXT_2,
}
const CHIP_ACTION_BORDER: Record<string, string> = {
  viewing: '#bfdbfe', chase: '#fde68a', day15: 'rgba(124,58,237,.3)', sens: DS_BORDER,
}
const CHIP_ACTION_COLOR: Record<string, string> = {
  viewing: '#1e40af', chase: '#92400e', day15: '#5B21B6', sens: NAVY,
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]       = useState<ViewTab>('funnel')
  const [todayCollapsed, setTodayCollapsed] = useState(false)
  const [expDismissed, setExpDismissed] = useState(false)
  const [avatarOpen, setAvatarOpen]     = useState(false)
  const [toast, setToast]               = useState('')
  const avatarRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    if (avatarOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarOpen])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  const hnBase: React.CSSProperties = {
    fontSize: '12px', fontWeight: 500, padding: '5px 13px', borderRadius: '7px',
    background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  }
  const hnOn: React.CSSProperties = { ...hnBase, background: 'rgba(255,255,255,.14)', color: '#fff' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_BODY, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: '13px', color: TEXT_1, paddingBottom: `${BBAR_H + 16}px` }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ height: `${HDR_H}px`, backgroundColor: NAVY_DARK, display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px', position: 'sticky', top: 0, zIndex: 220, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-.01em', fontFamily: 'inherit', padding: 0 }}>
            Deal<span style={{ color: TEAL_MID }}>Score</span>
          </button>
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', margin: '0 6px', flexShrink: 0 }} />
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[{ label: 'Deals', path: '/dashboard' }, { label: 'Pipeline', path: '/pipeline' }, { label: 'Compare', path: '/compare' }].map((item, i, arr) => (
              <span key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
                <button onClick={() => navigate(item.path)} style={item.path === '/pipeline' ? hnOn : hnBase}>{item.label}</button>
                {i < arr.length - 1 && <div style={{ width: '.5px', height: '14px', background: 'rgba(255,255,255,.12)', margin: '0 4px', flexShrink: 0 }} />}
              </span>
            ))}
          </nav>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.12)', borderRadius: '7px', padding: '0 10px', height: '28px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>🔍</span>
            <input placeholder="Search deals, sellers, addresses…" style={{ background: 'none', border: 'none', outline: 'none', fontSize: '11px', color: '#fff', fontFamily: 'inherit', width: '150px' }} />
            <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,.25)', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.12)', borderRadius: '4px', padding: '1px 5px' }}>⌘K</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button onClick={() => navigate('/sellers-crm')} style={hnBase}>Seller</button>
            <div style={{ width: '.5px', height: '14px', background: 'rgba(255,255,255,.12)', margin: '0 4px', flexShrink: 0 }} />
            <button onClick={() => navigate('/investors-crm')} style={hnBase}>Investors</button>
          </nav>
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />
          <button onClick={() => navigate('/deal/new')} style={{ background: TEAL, border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>+ New deal</button>
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />
          <div ref={avatarRef} style={{ position: 'relative' }}>
            <button onClick={() => setAvatarOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,.16)', border: '.5px solid rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#fff' }}>
                {getInitials(profile?.full_name, user?.email)}
              </div>
              <span style={{ color: 'rgba(255,255,255,.35)', fontSize: '10px' }}>▾</span>
            </button>
            {avatarOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,.12)', minWidth: '200px', overflow: 'hidden', zIndex: 300 }}>
                <div style={{ padding: '12px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: TEXT_1 }}>{profile?.full_name ?? user?.email}</div>
                  {profile?.full_name && <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>{user?.email}</div>}
                </div>
                <div style={{ padding: '4px 0' }}>
                  {[{ label: 'Profile', fn: () => navigate('/profile') }, { label: 'Dashboard', fn: () => navigate('/dashboard') }].map(item => (
                    <button key={item.label} onClick={() => { setAvatarOpen(false); item.fn() }} style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', fontSize: '12px', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>{item.label}</button>
                  ))}
                </div>
                <div style={{ borderTop: `.5px solid ${DS_BORDER}` }}>
                  <button onClick={async () => { setAvatarOpen(false); await signOut(); navigate('/login') }} style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', fontSize: '12px', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}>Sign out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Today strip ────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: `.5px solid ${DS_BORDER}`, padding: todayCollapsed ? '8px 24px' : '10px 24px' }}>
        <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#bbb', marginBottom: todayCollapsed ? 0 : '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          📅 Today &amp; coming up
          <button onClick={() => setTodayCollapsed(c => !c)} style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', border: `.5px solid ${DS_BORDER}`, background: '#fff', color: TEXT_2, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '.03em' }}>
            {todayCollapsed ? 'Show' : 'Hide'}
          </button>
        </div>
        {!todayCollapsed && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px' }}>
            {TODAY_CHIPS.map((chip, i) => (
              <div key={i} style={{ ...CHIP_STYLES[chip.type], borderRadius: '8px', padding: '8px 12px', minWidth: '190px', border: `.5px solid ${CHIP_STYLES[chip.type].borderColor}`, display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '2px', color: CHIP_TYPE_COLOR[chip.type] }}>{chip.typeLabel}</div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: TEXT_1, marginBottom: '1px' }}>{chip.addr}</div>
                <div style={{ fontSize: '11px', color: TEXT_2, marginBottom: '6px' }}>{chip.detail}</div>
                <button onClick={() => showToast('Opening deal…')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', border: `.5px solid ${CHIP_ACTION_BORDER[chip.type]}`, cursor: 'pointer', fontFamily: 'inherit', background: '#fff', color: CHIP_ACTION_COLOR[chip.type], alignSelf: 'flex-start' }}>
                  {chip.action}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Explainer ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 24px 0' }}>
        {!expDismissed && (
          <div style={{ position: 'relative', background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '0' }}>
            <button onClick={() => setExpDismissed(true)} style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', padding: '4px' }}>×</button>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eef3fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📊</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>Your sourcing business at a glance</div>
              <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.7 }}>
                <strong style={{ color: TEXT_1 }}>Funnel</strong> shows how deals flow from Sourcing to Complete and where you're losing them.{' '}
                <strong style={{ color: TEXT_1 }}>Needs attention</strong> flags stalled deals that need a next step.{' '}
                <strong style={{ color: TEXT_1 }}>Targets</strong> tracks monthly sourcing fee, completions, and pipeline pace.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── View tabs toolbar ──────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: `.5px solid ${DS_BORDER}`, display: 'flex', alignItems: 'center', padding: '8px 24px', position: 'sticky', top: `${HDR_H}px`, zIndex: 210 }}>
        <div style={{ display: 'flex', gap: '2px', background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: '9px', padding: '2px' }}>
          {([
            { key: 'funnel',  label: '▼ Funnel',          badge: null },
            { key: 'stalled', label: '⚠ Needs attention', badge: STALLED.length },
            { key: 'targets', label: '◎ Targets',         badge: null },
          ] as { key: ViewTab; label: string; badge: number | null }[]).map(tab => {
            const isOn = activeTab === tab.key
            const hasAlert = tab.key === 'stalled' && (tab.badge ?? 0) > 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  fontSize: '12px', padding: '7px 14px', borderRadius: '7px', border: 'none',
                  background: isOn ? '#fff' : 'none',
                  color: isOn ? NAVY : '#666',
                  fontWeight: isOn ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: isOn ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
                {tab.badge !== null && (
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: hasAlert && isOn ? '#eef3fb' : hasAlert ? '#fef3c7' : BG_SEC, color: hasAlert && isOn ? NAVY : hasAlert ? '#92400e' : '#999' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ FUNNEL PANEL ══ */}
      {activeTab === 'funnel' && (
        <div style={{ margin: '16px 24px 20px' }}>
          {/* Header + top stats */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: TEXT_1, marginBottom: '3px' }}>Deal flow — this quarter</div>
              <div style={{ fontSize: '12px', color: TEXT_2 }}>1 Apr – 8 Jun 2026 · 23 deals entered, 4 completed</div>
            </div>
            <div style={{ display: 'flex', background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
              {[
                { val: '17%', label: 'Overall conversion', color: NAVY },
                { val: '39%', label: 'Biggest leak', color: '#DC2626' },
                { val: '67%', label: 'Closing rate', color: TEAL },
              ].map((stat, i, arr) => (
                <div key={i} style={{ padding: '10px 18px', borderRight: i < arr.length - 1 ? `.5px solid ${DS_BORDER}` : 'none', textAlign: 'right' }}>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: stat.color, display: 'block', lineHeight: 1.1 }}>{stat.val}</span>
                  <span style={{ fontSize: '9px', color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Funnel chart */}
          <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '20px 22px' }}>
            {FUNNEL.map((row, i) => {
              const widthPct = Math.round((row.n / FUNNEL[0].n) * 100)
              const cls = convClass(row.pctOfPrev)
              return (
                <div key={row.stage} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '5px 0' }}>
                  <div style={{ width: '90px', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>{row.stage}</div>
                    <span style={{ fontSize: '10px', fontWeight: 400, color: TEXT_2 }}>stage {i + 1} of {FUNNEL.length}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <div style={{ height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 14px', width: `${widthPct}%`, minWidth: '60px', background: FUNNEL_COLORS[i], margin: '0 auto', boxSizing: 'border-box' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{row.n}</span>
                      <span style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,.65)', marginLeft: '6px' }}>deals</span>
                    </div>
                  </div>
                  <div style={{ width: '130px', flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: '10px' }}>
                    {row.pctOfPrev !== null && (
                      <>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: CONV_COLOR[cls] }}>{row.pctOfPrev}%</span>
                        <span style={{ fontSize: '10px', color: TEXT_2, marginLeft: '4px' }}>made it through</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Live now strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', padding: '12px 14px', background: BG_SEC, borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#999', width: '90px', flexShrink: 0 }}>Live now</div>
              <div style={{ flex: 1, display: 'flex', gap: 0 }}>
                {FUNNEL.map((row, i) => {
                  const n = LIVE_NOW[i]
                  return (
                    <div key={row.stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '36px', height: '28px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: n > 0 ? NAVY : '#fff', border: n > 0 ? 'none' : `.5px solid ${DS_BORDER}`, color: n > 0 ? '#fff' : '#ccc' }}>
                        {n}
                      </div>
                      <div style={{ fontSize: '9px', fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>{row.stage}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: '10px', color: TEXT_2, flexShrink: 0, whiteSpace: 'nowrap' }}>deals active right now</div>
            </div>
          </div>

          {/* Insight cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
            {[
              { icon: '⚠️', iconBg: '#fee2e2', iconColor: '#dc2626', title: 'Biggest bottleneck',
                body: <><strong style={{ color: TEXT_1 }}>39% of sourced deals don't reach Ready.</strong> This is your pipeline's main leak. Qualifying faster — running the numbers in the first 48hrs — typically closes this gap significantly.</> },
              { icon: '📈', iconBg: '#d1fae5', iconColor: TEAL, title: 'Strong closing rate',
                body: <><strong style={{ color: TEXT_1 }}>67% of Live deals reach Reserved</strong> and convert through to completion. Your pack quality and investor relationships are working — this stage is your strongest.</> },
              { icon: '£', iconBg: '#eef3fb', iconColor: NAVY, title: 'Revenue in the pipeline',
                body: <><strong style={{ color: TEXT_1 }}>6 deals sitting at Reserved right now.</strong> At your 67% closing rate that's ~4 more completions — potentially <strong style={{ color: TEXT_1 }}>£12,000+</strong> in sourcing fees still to land this quarter.</> },
            ].map((card, i) => (
              <div key={i} style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, color: card.iconColor }}>{card.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: TEXT_1 }}>{card.title}</div>
                </div>
                <div style={{ fontSize: '11px', color: TEXT_2, lineHeight: 1.6 }}>{card.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ STALLED PANEL ══ */}
      {activeTab === 'stalled' && (
        <div>
          <div style={{ margin: '16px 24px 4px', fontSize: '12px', color: TEXT_2, maxWidth: '620px', lineHeight: 1.5 }}>
            Deals that have sat in their current stage longer than usual, with nothing scheduled to move them forward. Sorted by how long they've been stuck — these are the ones most likely to quietly fall through.
          </div>
          {STALLED.length === 0 ? (
            <div style={{ margin: '30px 24px', textAlign: 'center', padding: '40px 20px', color: TEXT_2 }}>
              <div style={{ fontSize: '30px', color: TEAL, marginBottom: '10px' }}>✓</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: TEXT_1, marginBottom: '3px' }}>Nothing stuck right now</div>
              <div>Every deal in your pipeline is moving or has a next step scheduled. Nice work.</div>
            </div>
          ) : (
            <div style={{ margin: '12px 24px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STALLED.map(d => {
                const borderColor = d.severity === 'high' ? '#DC2626' : d.severity === 'med' ? AMBER : DS_BORDER
                const numColor = d.severity === 'high' ? '#DC2626' : d.severity === 'med' ? AMBER : TEXT_2
                return (
                  <div key={d.id} onClick={() => navigate('/deal/' + d.id.replace('DS-', 'd'))} style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderLeft: `3px solid ${borderColor}`, borderRadius: '8px', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all .12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,.06)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1 }}>{d.addr}</div>
                      <div style={{ fontSize: '11px', color: TEXT_2, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: '#eef3fb', color: NAVY }}>{d.strat}</span>
                        <span>{d.id} · stuck in <strong style={{ color: TEXT_1 }}>{d.stage}</strong></span>
                        <span style={{ color: '#ccc' }}>·</span>
                        <span>{d.meta}</span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'center', padding: '0 14px', borderLeft: `.5px solid ${DS_BORDER}`, borderRight: `.5px solid ${DS_BORDER}` }}>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: numColor }}>{d.days}</div>
                      <div style={{ fontSize: '9px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>days stuck</div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <div style={{ fontSize: '11px', color: TEXT_2, textAlign: 'right', maxWidth: '190px', lineHeight: 1.4 }}>{d.suggest}</div>
                      <button onClick={e => { e.stopPropagation(); showToast(`Opening ${d.id}…`) }} style={{ fontSize: '11px', fontWeight: 600, padding: '6px 13px', borderRadius: '7px', border: 'none', background: NAVY, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                        Open deal →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ TARGETS PANEL ══ */}
      {activeTab === 'targets' && (
        <div style={{ margin: '16px 24px 24px' }}>
          {/* 3-stage flow */}
          <div style={{ display: 'flex', alignItems: 'stretch', background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
            {[
              {
                step: 'Stage 1 · Input', label: 'New deals sourced', period: 'June 2026',
                val: '4', of: 'of 8 target', pct: 50, amber: false,
                note: <>Halfway with 3 weeks left — comfortably on track. Each sourced deal feeds the conversion pipeline below.</>
              },
              {
                step: 'Stage 2 · Conversion', label: 'Deals completed', period: 'June 2026',
                val: '1', of: 'of 3 target', pct: 33, amber: false,
                note: <>On pace. <strong style={{ color: TEXT_1 }}>2 deals</strong> currently Reserved / Pack-sent — if those complete this month you hit target exactly.</>
              },
              {
                step: 'Stage 3 · Revenue', label: 'Sourcing fees earned', period: 'June 2026',
                val: '£3,500', of: 'of £15,000', pct: 23, amber: true,
                note: <>23% of target on day 8. Completing the 2 Reserved deals would add ~£7,000 — bringing total to 70%+.</>
              },
            ].map((stage, i, arr) => (
              <>
                <div key={stage.step} style={{ flex: 1, padding: '18px 20px', borderRight: i < arr.length - 1 ? `.5px solid ${DS_BORDER}` : 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#bbb', marginBottom: '8px' }}>{stage.step}</div>
                  <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#999', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {stage.label} <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>{stage.period}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '26px', fontWeight: 700, color: NAVY }}>{stage.val}</span>
                    <span style={{ fontSize: '13px', color: TEXT_2 }}>{stage.of}</span>
                  </div>
                  <div style={{ height: '6px', background: BG_SEC, borderRadius: '20px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', borderRadius: '20px', background: stage.amber ? AMBER : TEAL, width: `${stage.pct}%`, transition: 'width .4s ease' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: TEXT_2, lineHeight: 1.55, marginTop: 'auto' }}>{stage.note}</div>
                </div>
                {i < arr.length - 1 && (
                  <div key={`arrow-${i}`} style={{ display: 'flex', alignItems: 'center', padding: '0 2px', background: '#fff', color: DS_BORDER, fontSize: '18px', flexShrink: 0 }}>→</div>
                )}
              </>
            ))}
          </div>

          {/* Velocity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '14px 20px', marginTop: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: BG_SEC, border: `.5px solid ${DS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEAL, fontSize: '14px', flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#999', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Pipeline velocity <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>last 90 days</span>
              </div>
              <div style={{ fontSize: '13px', color: TEXT_1, fontWeight: 600, display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                26 <span style={{ fontSize: '12px', fontWeight: 400, color: TEXT_2 }}>avg days sourcing → reserved</span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: TEAL, background: '#d1fae5', borderRadius: '20px', padding: '2px 8px', whiteSpace: 'nowrap' }}>↓ 16% faster than last quarter (was 31 days)</span>
              </div>
            </div>
            <div style={{ flexShrink: 0, width: '200px', height: '6px', background: BG_SEC, borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '20px', background: TEAL, width: '78%' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky business bar ─────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: `${BBAR_H}px`, background: NAVY_DEEP, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 0, zIndex: 230, boxShadow: '0 -4px 20px rgba(0,0,0,.18)', overflowX: 'auto' }}>
        {[
          { label: 'Pipeline value',        val: '£1.14m', sub: 'across 5 active deals', color: '#fff', track: false },
          { label: 'Fees pending',           val: '£18,200', sub: 'expected on completion', color: TEAL_MID, track: false },
          { label: 'Avg. days in pipeline',  val: '16', sub: 'days, all active deals', color: '#fff', track: false },
          { label: 'Deals needing attention', val: String(STALLED.length), sub: 'stalled — see tab', color: '#FBBF24', track: false },
          { label: 'Monthly fee target',     val: '23%', sub: '£3,500 of £15,000', color: '#fff', track: true },
        ].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: i === 0 ? '0 22px 0 0' : '0 22px', borderRight: i < arr.length - 1 ? '.5px solid rgba(255,255,255,.08)' : 'none', height: '100%', flexShrink: 0, minWidth: '130px' }}>
            <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(255,255,255,.4)', marginBottom: '2px' }}>{item.label}</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: item.color, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              {item.val} <span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,.45)' }}>{item.sub}</span>
            </div>
            {item.track && <div style={{ width: '64px', height: '5px', background: 'rgba(255,255,255,.12)', borderRadius: '20px', overflow: 'hidden', marginTop: '5px' }}><div style={{ height: '100%', background: TEAL_MID, borderRadius: '20px', width: '23%' }} /></div>}
          </div>
        ))}
      </div>

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: `${BBAR_H + 18}px`, left: '50%', transform: 'translateX(-50%)', background: NAVY_DARK, color: '#fff', padding: '9px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, zIndex: 9999, opacity: toast ? 1 : 0, transition: 'opacity .25s', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {toast}
      </div>
    </div>
  )
}
