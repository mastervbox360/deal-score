import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY      = '#1B3A6B'
const NAVY_DARK = '#152d55'
const TEAL      = '#1D9E75'
const TEAL_MID  = '#10B981'
const DS_BORDER = '#e3e5e9'
const BG_SEC    = '#f5f6f8'
const BG_BODY   = '#eef0f4'
const TEXT_1    = '#1a1a2e'
const TEXT_2    = '#6c757d'
const AMBER     = '#D97706'
const HDR_H     = 56

// ─── Types ────────────────────────────────────────────────────────────────────
type ScoreTone = 'rec' | 'rev' | 'av'
type StatusKey = 'reserved' | 'pack-sent' | 'live' | 'sourcing' | 'ready' | 'complete'

interface DealMetric {
  label: string
  val: string
  tone: 'gr' | 're' | ''
}
interface PipelineDeal {
  id: string
  addr: string
  strat: string
  score: ScoreTone
  scoreLabel: string
  price: string
  desc: string
  metrics: DealMetric[]
  status: StatusKey
  statusLabel: string
  context: string
  next: string
}

// ─── Static data ──────────────────────────────────────────────────────────────
const PIPELINE: PipelineDeal[] = [
  { id: 'DS-001', addr: '65a Horwood Close, Leeds LS7',        strat: 'BTL',  score: 'rec', scoreLabel: 'RECOMMENDED', price: '£207,000', desc: '3 bed terraced',
    metrics: [{ label: 'Monthly cash flow', val: '+£482', tone: 'gr' }, { label: 'CoC ROI', val: '6.4%', tone: '' }, { label: 'Gross yield', val: '6.4%', tone: '' }, { label: 'Cash invested', val: '£63,420', tone: '' }],
    status: 'reserved', statusLabel: 'Reserved · Day 8 of 14', context: 'Sarah Michaels · motivated vendor', next: 'Viewing Tue 10:30am' },
  { id: 'DS-002', addr: '12 Victoria Street, Manchester M1',   strat: 'HMO',  score: 'rev', scoreLabel: 'REVIEW',       price: '£310,000', desc: '6 bed HMO',
    metrics: [{ label: 'Monthly cash flow', val: '+£1,247', tone: 'gr' }, { label: 'Gross yield', val: '8.9%', tone: '' }, { label: 'CoC ROI', val: '5.2%', tone: '' }, { label: 'Cash invested', val: '£97,150', tone: '' }],
    status: 'pack-sent', statusLabel: 'Pack sent', context: 'David Jones · flexible vendor', next: 'Viewing Thu 2:00pm' },
  { id: 'DS-003', addr: '8 Park Lane, Birmingham B15',          strat: 'BRRR', score: 'rec', scoreLabel: 'RECOMMENDED', price: '£185,000', desc: '4 bed semi-detached',
    metrics: [{ label: 'Monthly cash flow', val: '+£394', tone: 'gr' }, { label: 'Cash left in', val: '£8,200', tone: '' }, { label: 'CoC ROI', val: '5.8%', tone: '' }, { label: 'Equity created', val: '£34,000', tone: '' }],
    status: 'live', statusLabel: 'Live', context: 'Refurb in progress', next: 'Refinance due ~Day 15' },
  { id: 'DS-004', addr: '22 Oak Road, Sheffield S1',            strat: 'FLIP', score: 'av',  scoreLabel: 'AVOID',        price: '£145,000', desc: '3 bed terraced',
    metrics: [{ label: 'Net profit', val: '£4,200', tone: 're' }, { label: 'Profit on cost', val: '4.1%', tone: 're' }, { label: 'GDV', val: '£165,000', tone: '' }, { label: 'Refurb cost', val: '£22,000', tone: '' }],
    status: 'sourcing', statusLabel: 'Sourcing', context: 'Margin too thin at asking price', next: 'Awaiting renegotiation' },
  { id: 'DS-005', addr: '3 Marina View, Brighton BN1',          strat: 'SA',   score: 'rec', scoreLabel: 'RECOMMENDED', price: '£295,000', desc: '2 bed apartment',
    metrics: [{ label: 'Monthly cash flow', val: '+£1,016', tone: 'gr' }, { label: 'Net yield', val: '11.2%', tone: '' }, { label: 'CoC ROI', val: '9.1%', tone: '' }, { label: 'Cash invested', val: '£88,250', tone: '' }],
    status: 'ready', statusLabel: 'Ready', context: 'Licensing confirmed for short-let', next: 'Ready to proceed' },
  { id: 'DS-006', addr: '47 Clarence Road, Bristol BS1',        strat: 'BTL',  score: 'rec', scoreLabel: 'RECOMMENDED', price: '£230,000', desc: '2 bed flat',
    metrics: [{ label: 'Monthly cash flow', val: '+£318', tone: 'gr' }, { label: 'CoC ROI', val: '5.9%', tone: '' }, { label: 'Gross yield', val: '5.8%', tone: '' }, { label: 'Sourcing fee', val: '£3,500', tone: 'gr' }],
    status: 'complete', statusLabel: 'Complete', context: 'Sourced on behalf of investor client', next: 'Handover complete' },
]

const MAX_SEL = 4
const MIN_SEL = 2

// ─── Score badge ──────────────────────────────────────────────────────────────
const SCORE_STYLES: Record<ScoreTone, React.CSSProperties> = {
  rec: { background: '#d1fae5', color: '#065f46', border: '.5px solid #6ee7b7' },
  rev: { background: '#fef3c7', color: '#92400e', border: '.5px solid #fcd34d' },
  av:  { background: '#fee2e2', color: '#991b1b', border: '.5px solid #fca5a5' },
}

// ─── Status dot ───────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<StatusKey, string> = {
  reserved: TEAL, 'pack-sent': '#8B5CF6', live: '#0ea5e9', sourcing: '#6B7280', ready: AMBER, complete: '#059669',
}

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

function dealById(id: string): PipelineDeal | undefined {
  return PIPELINE.find(d => d.id === id)
}

function bestIndexForMetric(rowIdx: number, deals: PipelineDeal[]): number {
  const label = deals[0]?.metrics[rowIdx]?.label
  if (!label) return -1
  const sameAcross = deals.every(d => d.metrics[rowIdx]?.label === label)
  if (!sameAcross) return -1
  if (deals[0].metrics[rowIdx].tone !== 'gr') return -1
  let best = -1
  let bestVal = -Infinity
  deals.forEach((d, i) => {
    const raw = d.metrics[rowIdx].val.replace(/[^0-9.\-]/g, '')
    const val = parseFloat(raw)
    if (!isNaN(val) && val > bestVal) { bestVal = val; best = i }
  })
  return best
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [selected, setSelected]       = useState<string[]>(['DS-001', 'DS-003'])
  const [pickerQuery, setPickerQuery] = useState('')
  const [expDismissed, setExpDismissed] = useState(false)
  const [stratAlertDismissed, setStratAlertDismissed] = useState(false)
  const [todayCollapsed, setTodayCollapsed] = useState(false)
  const [avatarOpen, setAvatarOpen]   = useState(false)
  const [mfOpen, setMfOpen]           = useState(false)
  const [rowFilter, setRowFilter]     = useState({ status: true, metrics: true, context: true, next: true })
  const [toast, setToast]             = useState('')
  const avatarRef = useRef<HTMLDivElement>(null)
  const mfRef     = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
      if (mfRef.current && !mfRef.current.contains(e.target as Node)) setMfOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  const toggleDeal = useCallback((id: string) => {
    setSelected(prev => {
      const idx = prev.indexOf(id)
      if (idx > -1) return prev.filter(x => x !== id)
      if (prev.length >= MAX_SEL) { showToast(`You can compare up to ${MAX_SEL} deals at a time`); return prev }
      return [...prev, id]
    })
  }, [])

  const removeFromCompare = useCallback((id: string) => {
    setSelected(prev => prev.filter(x => x !== id))
  }, [])

  // Picker items: search filter + always show selected
  const q = pickerQuery.toLowerCase().trim()
  const matched = PIPELINE.filter(d => {
    if (!q) return true
    return (d.addr + ' ' + d.id + ' ' + d.strat + ' ' + d.scoreLabel + ' ' + d.price).toLowerCase().includes(q)
  })
  const matchedIds = matched.map(d => d.id)
  const pinned = selected.filter(id => !matchedIds.includes(id)).map(dealById).filter(Boolean) as PipelineDeal[]
  const visible = [...matched, ...pinned]

  // Mixed strategy check
  const selectedDeals = selected.map(dealById).filter(Boolean) as PipelineDeal[]
  const uniqueStrats = [...new Set(selectedDeals.map(d => d.strat))]
  const isMixed = selected.length >= 2 && uniqueStrats.length > 1

  const hnBase: React.CSSProperties = {
    fontSize: '12px', fontWeight: 500, padding: '5px 13px', borderRadius: '7px',
    background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  }
  const hnOn: React.CSSProperties = { ...hnBase, background: 'rgba(255,255,255,.14)', color: '#fff' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_BODY, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: '13px', color: TEXT_1 }}>

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
                <button onClick={() => navigate(item.path)} style={item.path === '/compare' ? hnOn : hnBase}>{item.label}</button>
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
                <button onClick={() => showToast('Opening deal…')} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', border: `.5px solid ${DS_BORDER}`, cursor: 'pointer', fontFamily: 'inherit', background: '#fff', color: NAVY, alignSelf: 'flex-start' }}>
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
          <div style={{ position: 'relative', background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <button onClick={() => setExpDismissed(true)} style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', padding: '4px' }}>×</button>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eef3fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>⇄</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>Compare deals side by side</div>
              <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.7 }}>
                Select 2–4 deals from your pipeline and compare key metrics in a single table. Best values are highlighted automatically. Use this when prioritising which deal to push — or to show investors their options.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Picker toolbar ─────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: `.5px solid ${DS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', position: 'sticky', top: `${HDR_H}px`, zIndex: 210, gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>Select deals to compare</span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: selected.length >= MAX_SEL ? '#b91c1c' : TEXT_2, background: selected.length >= MAX_SEL ? '#fee2e2' : BG_SEC, padding: '2px 8px', borderRadius: '20px' }}>
            {selected.length >= MAX_SEL
              ? `${selected.length} of ${MAX_SEL} selected — maximum reached`
              : selected.length < MIN_SEL
                ? `${selected.length} of ${MAX_SEL} selected — pick at least ${MIN_SEL}`
                : `${selected.length} of ${MAX_SEL} selected`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Metric row filter */}
          <div ref={mfRef} style={{ position: 'relative' }}>
            <button onClick={() => setMfOpen(p => !p)} style={{
              display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500,
              padding: '6px 12px', borderRadius: '8px', border: `.5px solid ${DS_BORDER}`,
              background: mfOpen ? NAVY : '#fff', color: mfOpen ? '#fff' : TEXT_2,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
            }}>
              ☰ Show rows {mfOpen ? '▲' : '▾'}
            </button>
            {mfOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '10px', boxShadow: '0 6px 24px rgba(0,0,0,.10)', minWidth: '190px', zIndex: 300, padding: '8px 0' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#bbb', padding: '4px 14px 2px' }}>Metric rows</div>
                {([
                  { key: 'status' as const, label: 'Status' },
                  { key: 'metrics' as const, label: 'Financial metrics' },
                ] as { key: keyof typeof rowFilter; label: string }[]).map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', color: TEXT_1 }}>
                    <input type="checkbox" checked={rowFilter[item.key]} onChange={e => setRowFilter(f => ({ ...f, [item.key]: e.target.checked }))} style={{ accentColor: NAVY }} />
                    {item.label}
                  </label>
                ))}
                <div style={{ height: '.5px', background: DS_BORDER, margin: '4px 0' }} />
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#bbb', padding: '4px 14px 2px' }}>Deal context</div>
                {([
                  { key: 'context' as const, label: 'Vendor & situation' },
                  { key: 'next' as const, label: "What's next" },
                ] as { key: keyof typeof rowFilter; label: string }[]).map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', color: TEXT_1 }}>
                    <input type="checkbox" checked={rowFilter[item.key]} onChange={e => setRowFilter(f => ({ ...f, [item.key]: e.target.checked }))} style={{ accentColor: NAVY }} />
                    {item.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '6px 10px', height: '32px', boxSizing: 'border-box' }}>
            <span style={{ fontSize: '12px', color: '#bbb' }}>🔍</span>
            <input
              value={pickerQuery}
              onChange={e => setPickerQuery(e.target.value)}
              placeholder="Search by address, ID or strategy…"
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: '12px', color: TEXT_1, fontFamily: 'inherit', width: '220px' }}
            />
          </div>
        </div>
      </div>

      {/* ── Picker grid ────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 24px 4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
          {visible.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: TEXT_2, fontSize: '12px' }}>
              No deals match "{pickerQuery}" — try a different address, ID, or strategy.
            </div>
          ) : visible.map(d => {
            const isSel  = selected.includes(d.id)
            const atCap  = selected.length >= MAX_SEL && !isSel
            return (
              <div
                key={d.id}
                onClick={() => !atCap && toggleDeal(d.id)}
                style={{
                  position: 'relative', background: isSel ? '#f0f5ff' : '#fff',
                  border: isSel ? `.5px solid #93c5fd` : `.5px solid ${DS_BORDER}`,
                  borderRadius: '10px', padding: '10px 12px', cursor: atCap ? 'not-allowed' : 'pointer',
                  opacity: atCap ? 0.45 : 1, transition: 'all .12s', outline: isSel ? `2px solid ${NAVY}` : 'none', outlineOffset: '-1px',
                }}
                onMouseEnter={e => !atCap && !isSel && ((e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,.07)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `.5px solid ${isSel ? NAVY : DS_BORDER}`, background: isSel ? NAVY : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', flexShrink: 0 }}>
                    {isSel ? '✓' : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', background: '#eef3fb', color: NAVY }}>{d.strat}</span>
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', ...SCORE_STYLES[d.score] }}>{d.scoreLabel}</span>
                  </div>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, lineHeight: 1.3, marginBottom: '3px' }}>{d.addr}</div>
                <div style={{ fontSize: '10px', color: TEXT_2 }}>{d.id} · {d.price}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Comparison states ──────────────────────────────────────────────── */}
      {selected.length === 0 && (
        <div style={{ margin: '30px 24px', textAlign: 'center', padding: '40px 20px', color: TEXT_2, background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}` }}>
          <div style={{ fontSize: '30px', color: '#bbb', marginBottom: '10px' }}>⇄</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>No deals selected</div>
          <div>Use the picker above to select at least 2 deals — their key metrics will appear here side by side.</div>
        </div>
      )}

      {selected.length === 1 && (() => {
        const d = dealById(selected[0])!
        return (
          <div style={{ margin: '0 24px', padding: '16px', background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}` }}>
            <div style={{ fontSize: '12px', color: TEXT_2, marginBottom: '6px' }}>One deal selected — pick at least one more to compare</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: NAVY, marginBottom: '3px' }}>{d?.addr}</div>
            {d && (
              <div style={{ fontSize: '12px', color: TEXT_2 }}>
                <strong style={{ color: TEXT_1 }}>{d.strat}</strong> · {d.price} · {d.desc}
                <br />
                <span style={{ color: TEAL, fontWeight: 600 }}>{d.metrics[0].val}</span> {d.metrics[0].label}
                {d.metrics[1] && <> &nbsp;·&nbsp; {d.metrics[1].val} {d.metrics[1].label}</>}
              </div>
            )}
          </div>
        )
      })()}

      {selected.length >= 2 && (
        <div style={{ padding: '0 24px 24px' }}>
          {/* Mixed strategy alert */}
          {isMixed && !stratAlertDismissed && (
            <div style={{ background: '#fffbeb', border: `.5px solid #fde68a`, borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, color: AMBER }}>⚠️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '3px' }}>
                  Mixed strategies selected — <span>{uniqueStrats.join(' vs ')}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.5 }}>
                  These deals use different strategies, so some metrics aren't directly comparable. For example, BRRR shows "Cash left in" where BTL shows "Cash invested" — the numbers measure different things. Use this comparison for context, not a like-for-like read.
                </div>
              </div>
              <button onClick={() => setStratAlertDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '14px', padding: '2px', flexShrink: 0, lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Comparison table */}
          <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '500px' }}>
              {/* Table head */}
              <thead>
                <tr>
                  <th style={{ width: '160px', minWidth: '160px', maxWidth: '160px', padding: '14px 16px', textAlign: 'left', verticalAlign: 'bottom', background: '#fff', position: 'sticky', left: 0, zIndex: 2, borderRight: `.5px solid ${DS_BORDER}`, borderBottom: `.5px solid ${DS_BORDER}`, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#bbb' }}>
                    Deal
                  </th>
                  {selectedDeals.map(d => (
                    <th key={d.id} style={{ padding: '12px 14px', verticalAlign: 'top', borderBottom: `.5px solid ${DS_BORDER}`, borderLeft: `.5px solid ${DS_BORDER}`, background: '#fff', minWidth: '200px', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span />
                        <button onClick={() => removeFromCompare(d.id)} title="Remove" style={{ width: '20px', height: '20px', borderRadius: '5px', border: `.5px solid ${DS_BORDER}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: TEXT_2 }}>×</button>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, marginBottom: '2px' }}>{d.addr}</div>
                      <div style={{ fontSize: '10px', color: TEXT_2, marginBottom: '7px' }}>{d.id} · {d.price} · {d.desc}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: '#eef3fb', color: NAVY }}>{d.strat}</span>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', ...SCORE_STYLES[d.score] }}>{d.scoreLabel}</span>
                      </div>
                      <button onClick={() => showToast(`Opening ${d.id}…`)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '7px', border: 'none', background: NAVY, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Open →
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Status row */}
                {rowFilter.status && (
                  <tr style={{ borderTop: `.5px solid ${DS_BORDER}` }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.07em', color: '#bbb', background: BG_SEC, position: 'sticky', left: 0, borderRight: `.5px solid ${DS_BORDER}` }}>
                      Status
                    </td>
                    {selectedDeals.map(d => (
                      <td key={d.id} style={{ padding: '10px 14px', borderLeft: `.5px solid ${DS_BORDER}`, background: '#fff' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: STATUS_COLORS[d.status] }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COLORS[d.status], flexShrink: 0 }} />
                          {d.statusLabel}
                        </span>
                      </td>
                    ))}
                  </tr>
                )}

                {/* Metric rows */}
                {rowFilter.metrics && [0, 1, 2, 3].map(r => {
                  const bestIdx = bestIndexForMetric(r, selectedDeals)
                  const firstLabel = selectedDeals[0]?.metrics[r]?.label ?? '—'
                  const sameLabel = selectedDeals.every(d => d.metrics[r]?.label === firstLabel)
                  return (
                    <tr key={r} style={{ borderTop: `.5px solid ${DS_BORDER}` }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.07em', color: '#bbb', background: BG_SEC, position: 'sticky', left: 0, borderRight: `.5px solid ${DS_BORDER}`, whiteSpace: 'nowrap' }}>
                        {firstLabel}
                        {!sameLabel && <span style={{ fontWeight: 400, textTransform: 'none', color: '#ccc', letterSpacing: 0 }}> (varies)</span>}
                      </td>
                      {selectedDeals.map((d, i) => {
                        const m = d.metrics[r]
                        const toneColor = !m ? TEXT_2 : m.tone === 'gr' ? TEAL : m.tone === 're' ? '#DC2626' : TEXT_1
                        const isBest = i === bestIdx
                        return (
                          <td key={d.id} style={{ padding: '10px 14px', borderLeft: `.5px solid ${DS_BORDER}`, background: '#fff' }}>
                            {m ? (
                              <div>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: toneColor }}>{m.val}</span>
                                {!sameLabel && m.label !== firstLabel && (
                                  <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '2px' }}>{m.label}</div>
                                )}
                                {isBest && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', background: '#d1fae5', color: '#065f46', marginLeft: '6px' }}>
                                    ★ Best here
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#ccc' }}>—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {/* Vendor & situation */}
                {rowFilter.context && (
                  <tr style={{ borderTop: `.5px solid ${DS_BORDER}` }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.07em', color: '#bbb', background: BG_SEC, position: 'sticky', left: 0, borderRight: `.5px solid ${DS_BORDER}` }}>
                      Vendor &amp; situation
                    </td>
                    {selectedDeals.map(d => (
                      <td key={d.id} style={{ padding: '10px 14px', borderLeft: `.5px solid ${DS_BORDER}`, background: '#fff' }}>
                        <span style={{ fontSize: '11px', color: TEXT_2 }}>{d.context}</span>
                      </td>
                    ))}
                  </tr>
                )}

                {/* What's next */}
                {rowFilter.next && (
                  <tr style={{ borderTop: `.5px solid ${DS_BORDER}` }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.07em', color: '#bbb', background: BG_SEC, position: 'sticky', left: 0, borderRight: `.5px solid ${DS_BORDER}` }}>
                      What's next
                    </td>
                    {selectedDeals.map(d => (
                      <td key={d.id} style={{ padding: '10px 14px', borderLeft: `.5px solid ${DS_BORDER}`, background: '#fff' }}>
                        <span style={{ fontSize: '11px', fontWeight: 500, color: TEXT_1 }}>{d.next}</span>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: NAVY_DARK, color: '#fff', padding: '9px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, zIndex: 9999, opacity: toast ? 1 : 0, transition: 'opacity .25s', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {toast}
      </div>
    </div>
  )
}
