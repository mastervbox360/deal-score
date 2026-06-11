import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useAuth } from '../lib/AuthContext'
import { listDeals, deleteDeal, createDeal } from '../lib/dealService'
import { Deal, DealStatus } from '../lib/database.types'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'grid3' | 'grid4' | 'list' | 'board'
type SortKey  = 'updated' | 'created' | 'price' | 'score'
type DealFilter = 'active' | 'presenting' | 'closed' | null

type StatusConfig = { label: string; bg: string; color: string }

type StatCell =
  | { kind: 'all';    label: string; val: number }
  | { kind: 'filter'; label: string; val: number; key: Exclude<DealFilter, null> }
  | { kind: 'info';   label: string; val: number | string }

type NdStrat = Deal['strategy'] | 'SMART_CAPTURE' | ''

type NdData = {
  strat: NdStrat
  address: string
  price: string
  country: string
  proptype: string
  beds: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY       = '#1B3A6B'
const NAVY_DARK  = '#152d55'
const TEAL       = '#1D9E75'
const AMBER      = '#F59E0B'
const BG_SEC     = '#f5f6f8'
const DS_BORDER  = '#e3e5e9'

const STRATEGIES: { code: Deal['strategy']; name: string }[] = [
  { code: 'BTL',    name: 'Buy to Let' },
  { code: 'HMO',    name: 'House of Multiple Occupation' },
  { code: 'FLIP',   name: 'Buy, Refurb & Sell' },
  { code: 'SA',     name: 'Serviced Accommodation' },
  { code: 'BRRR',   name: 'Buy, Refurb, Refinance, Rent' },
  { code: 'R2R',    name: 'Rent to Rent' },
  { code: 'SOCIAL', name: 'Social / Supported Living' },
]

const STEP_LABELS = ['', 'Strategy', 'Deal basics', 'Source & vendor']
const STEP_SUBS   = ['', 'Step 1 of 3 — Choose strategy', 'Step 2 of 3 — Deal basics', 'Step 3 of 3 — Source & vendor']

const SOURCE_OPTIONS = [
  'Rightmove / Zoopla', 'On market — agent', 'Off market — direct mail',
  'Off market — door knock', 'Off market — social media', 'Auction',
  'Referral — investor', 'Referral — agent', 'Referral — other',
  'Own portfolio', 'Other',
]
const VENDOR_SITUATIONS = [
  'Divorce / separation', 'Probate', 'Relocation', 'Financial pressure',
  'Chain break', 'Tired landlord', 'Time pressure', 'No urgency',
]

const STATUS_CFG: Record<DealStatus, StatusConfig> = {
  analysing:  { label: 'Sourcing',  bg: '#f3f4f6', color: '#374151' },
  reviewing:  { label: 'Ready',     bg: '#fef3c7', color: '#92400e' },
  presenting: { label: 'Pack sent', bg: '#ede9fe', color: '#5b21b6' },
  closed:     { label: 'Complete',  bg: '#d1fae5', color: '#065f46' },
  dead:       { label: 'Withdrawn', bg: '#fee2e2', color: '#991b1b' },
}

const BOARD_COLS: { label: string; status: DealStatus | null }[] = [
  { label: 'Sourcing',  status: 'analysing' },
  { label: 'Ready',     status: 'reviewing' },
  { label: 'Live',      status: null },
  { label: 'Reserved',  status: null },
  { label: 'Pack sent', status: 'presenting' },
  { label: 'Complete',  status: 'closed' },
  { label: 'Withdrawn', status: 'dead' },
]

// ─── Button style presets ─────────────────────────────────────────────────────
const BTN_GHOST: CSSProperties = {
  background: 'none', border: `1px solid ${DS_BORDER}`, borderRadius: '5px',
  padding: '5px 10px', fontSize: '11px', fontWeight: 600, color: '#5a6270',
  cursor: 'pointer', fontFamily: 'inherit',
}
const BTN_OUTLINE: CSSProperties = {
  background: 'none', border: `1px solid ${NAVY}`, borderRadius: '5px',
  padding: '5px 10px', fontSize: '11px', fontWeight: 600, color: NAVY,
  cursor: 'pointer', fontFamily: 'inherit',
}
const BTN_PRIMARY_SM: CSSProperties = {
  backgroundColor: NAVY, border: 'none', borderRadius: '5px',
  padding: '5px 10px', fontSize: '11px', fontWeight: 700, color: '#fff',
  cursor: 'pointer', fontFamily: 'inherit',
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function fCurrency(v: number | null): string {
  if (v === null) return '—'
  return '£' + Math.round(v).toLocaleString('en-GB')
}
function fPct(v: number | null): string {
  if (v === null) return '—'
  return v.toFixed(1) + '%'
}
function fDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function scoreOrder(s: Deal['deal_score']): number {
  if (s === 'RECOMMENDED') return 0
  if (s === 'REVIEW') return 1
  if (s === 'AVOID') return 2
  return 3
}
function topBorderColor(deal: Deal): string {
  if (deal.deal_score === 'RECOMMENDED') return TEAL
  if (deal.deal_score === 'REVIEW') return AMBER
  if (deal.deal_score === 'AVOID') return '#dc2626'
  return DS_BORDER
}
function statusBorderColor(status: DealStatus): string {
  switch (status) {
    case 'analysing':  return '#9ca3af'
    case 'reviewing':  return '#10b981'
    case 'presenting': return '#8b5cf6'
    case 'closed':     return '#059669'
    case 'dead':       return '#f87171'
    default:           return '#e5e7eb'
  }
}
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const p = name.trim().split(/\s+/)
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase()
  }
  return email ? email.slice(0, 2).toUpperCase() : '??'
}
function parsePrice(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? null : n
}

// ─── Small UI components ──────────────────────────────────────────────────────
function DsTag({ deal }: { deal: Deal }) {
  const cls = !deal.deal_score ? 'inc'
    : deal.deal_score === 'RECOMMENDED' ? 'rec'
    : deal.deal_score === 'REVIEW' ? 'rev'
    : 'avo'
  return (
    <div className="ds-tag">
      <span className="dst-strat">{deal.strategy}</span>
      <span className={`dst-score ${cls}`}>{deal.deal_score ?? 'No score'}</span>
    </div>
  )
}

function StatusPill({ status }: { status: DealStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span style={{
      display: 'inline-block', fontSize: '11px', fontWeight: 700,
      padding: '3px 9px', borderRadius: '20px',
      backgroundColor: cfg.bg, color: cfg.color,
      letterSpacing: '.02em', whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function DsStatusBar({ status }: { status: DealStatus }) {
  const cfg = STATUS_CFG[status]
  const bColor = statusBorderColor(status)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '11px', fontWeight: 500, padding: '2px 8px 2px 7px',
      background: BG_SEC, borderRadius: '4px', borderLeft: `3px solid ${bColor}`,
      whiteSpace: 'nowrap', color: '#1a1a2e',
    }}>
      {cfg.label}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div className="pii" style={{ fontSize: '13px', fontWeight: 600, color: NAVY, lineHeight: 1.2 }}>{value}</div>
    </div>
  )
}

interface CardActionsProps {
  dealId: string
  navigate: (to: string) => void
  onStub: () => void
  disabled: boolean
}
function CardActions({ dealId, navigate, onStub, disabled }: CardActionsProps) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <button onClick={onStub} style={BTN_GHOST}>Advert</button>
      <button onClick={() => navigate(`/deal/${dealId}`)} style={BTN_OUTLINE} disabled={disabled}>Edit</button>
      <button onClick={() => navigate(`/deal/${dealId}`)} style={BTN_PRIMARY_SM} disabled={disabled}>Open →</button>
    </div>
  )
}

// ─── Step rail ────────────────────────────────────────────────────────────────
function NdStepRail({ step }: { step: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: '#101f3a', padding: '10px 20px', flexShrink: 0,
    }}>
      {[1, 2, 3].map((n, idx) => {
        const isDone   = n < step
        const isActive = n === step
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 3 ? 1 : '0 0 auto' }}>
            {/* dot */}
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700,
              border: isDone ? '1.5px solid rgba(29,158,117,.45)' : isActive ? `1.5px solid ${TEAL}` : '1.5px solid rgba(255,255,255,.15)',
              background: isDone ? 'rgba(29,158,117,.18)' : isActive ? TEAL : 'rgba(255,255,255,.07)',
              color: isDone ? TEAL : isActive ? '#fff' : 'rgba(255,255,255,.35)',
              boxShadow: isActive ? `0 0 0 3px rgba(29,158,117,.25)` : 'none',
              transition: 'all .18s',
            }}>
              {isDone ? '✓' : n}
            </div>
            {/* label */}
            <span style={{
              fontSize: '10px', fontWeight: 600, marginLeft: '8px',
              color: isDone ? 'rgba(29,158,117,.8)' : isActive ? '#fff' : 'rgba(255,255,255,.3)',
              letterSpacing: '.02em', whiteSpace: 'nowrap', transition: 'color .18s',
            }}>
              {STEP_LABELS[n]}
            </span>
            {/* connector line (after steps 1 and 2) */}
            {idx < 2 && (
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.1)', margin: '0 8px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(29,158,117,.5)',
                  transform: n < step ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'left', transition: 'transform .3s ease',
                }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile, tier, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Data
  const [deals, setDeals]       = useState<Deal[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [movingId, setMovingId] = useState<string | null>(null)

  // UI
  const [viewMode, setViewMode]             = useState<ViewMode>('grid3')
  const [search, setSearch]                 = useState('')
  const [sortBy, setSortBy]                 = useState<SortKey>('updated')
  const [dealFilter, setDealFilter]         = useState<DealFilter>(null)
  const [todayDismissed, setTodayDismissed] = useState(false)
  const [privacyMode, setPrivacyMode]       = useState(false)
  const [avatarOpen, setAvatarOpen]         = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const [filterStrategy, setFilterStrategy] = useState<string>('')
  const [filterScore, setFilterScore]       = useState<string>('')
  const [filterStatus, setFilterStatus]     = useState<string>('')

  // Welcome rail
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => sessionStorage.getItem('ds_welcome_dismissed') === '1'
  )

  // ── New Deal slide-over state ──────────────────────────────────────────────
  const [newDealOpen, setNewDealOpen]   = useState(false)
  const [newDealStep, setNewDealStep]   = useState<1 | 2 | 3>(1)
  const [ndData, setNdData]             = useState<NdData>({ strat: '', address: '', price: '', country: 'England', proptype: '', beds: '' })
  const [ndStratErr, setNdStratErr]     = useState(false)
  const [ndCreating, setNdCreating]     = useState(false)
  const [ndSuccess, setNdSuccess]       = useState(false)
  const [ndSuccessRef, setNdSuccessRef] = useState('')
  const [ndSrcOpen, setNdSrcOpen]       = useState(false)
  const [ndVendorOpen, setNdVendorOpen] = useState(false)
  const [ndSource, setNdSource]         = useState('')
  const [ndVendorName, setNdVendorName] = useState('')
  const [ndVendorTel, setNdVendorTel]   = useState('')
  const [ndMotiv, setNdMotiv]           = useState<'motivated' | 'flexible' | 'firm' | ''>('')
  const [ndSituations, setNdSituations] = useState<Set<string>>(new Set())

  // Escape key closes slide-over
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && newDealOpen) closeNd()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [newDealOpen])

  // Apply/remove body.privacy class
  useEffect(() => {
    document.body.classList.toggle('privacy', privacyMode)
    return () => { document.body.classList.remove('privacy') }
  }, [privacyMode])

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    if (avatarOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarOpen])

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const data = await listDeals(user.id)
    setDeals(data)
    setLoading(false)
  }, [user])
  useEffect(() => { fetchDeals() }, [fetchDeals, location])

  // Delete
  async function handleDelete(id: string) {
    setDeleting(prev => { const s = new Set(prev); s.add(id); return s })
    const ok = await deleteDeal(id)
    if (ok) setDeals(prev => prev.filter(d => d.id !== id))
    setDeleting(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  // Board stage move
  async function handleBoardMove(dealId: string, newStatus: DealStatus) {
    setMovingId(dealId)
    const { error } = await supabase
      .from('deals')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', dealId)
    if (!error) setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: newStatus } : d))
    setMovingId(null)
  }

  const stub = (msg = 'Coming soon!') => alert(msg)

  // ── New Deal helpers ────────────────────────────────────────────────────────
  function openNd() {
    setNewDealOpen(true)
    setNewDealStep(1)
    setNdData({ strat: '', address: '', price: '', country: 'England', proptype: '', beds: '' })
    setNdStratErr(false)
    setNdCreating(false)
    setNdSuccess(false)
    setNdSuccessRef('')
    setNdSrcOpen(false)
    setNdVendorOpen(false)
    setNdSource('')
    setNdVendorName('')
    setNdVendorTel('')
    setNdMotiv('')
    setNdSituations(new Set())
    document.body.style.overflow = 'hidden'
  }

  function closeNd() {
    if (ndCreating) return
    setNewDealOpen(false)
    document.body.style.overflow = ''
  }

  function ndGoTo(step: 1 | 2 | 3) {
    setNewDealStep(step)
    setNdStratErr(false)
  }

  function handleNdNext() {
    if (newDealStep === 1) {
      if (!ndData.strat) { setNdStratErr(true); return }
      ndGoTo(2)
    } else if (newDealStep === 2) {
      ndGoTo(3)
    } else if (newDealStep === 3) {
      void handleNdCreate()
    }
  }

  function handleNdBack() {
    if (newDealStep > 1) ndGoTo((newDealStep - 1) as 1 | 2)
  }

  async function handleNdCreate() {
    if (!user) return
    if (ndData.strat === 'SMART_CAPTURE') { stub('Smart Capture — coming soon for Pro Plus users'); return }
    const strategy = ndData.strat as Deal['strategy']
    const price = ndData.price ? parsePrice(ndData.price) : null
    setNdCreating(true)
    const deal = await createDeal(
      user.id, strategy,
      ndData.address.trim() || null, null,
      price, null,
      {}, null, null, null, null
    )
    setNdCreating(false)
    if (!deal) { alert('Failed to create deal — please try again'); return }
    setNdSuccessRef(deal.reference)
    setNdSuccess(true)
    setTimeout(() => {
      closeNd()
      void fetchDeals()
      navigate(`/deal/${deal.id}`)
    }, 1900)
  }

  function ndSetStrat(code: NdStrat) {
    setNdData(d => ({ ...d, strat: code }))
    setNdStratErr(false)
  }

  function ndFooterHint(): string {
    if (newDealStep === 1) {
      if (!ndData.strat) return 'Select Smart Capture or a strategy to continue'
      return ndData.strat === 'SMART_CAPTURE' ? 'Smart Capture selected — all 7 strategies' : `${ndData.strat} selected`
    }
    if (newDealStep === 2) return 'Fill in what you know — everything else can be added later'
    return 'Review and create deal'
  }

  function ndNextLabel(): string {
    if (newDealStep === 3) return ndCreating ? 'Creating…' : '+ Create deal'
    return 'Next →'
  }

  function ndNextDisabled(): boolean {
    if (newDealStep === 1) return !ndData.strat
    if (newDealStep === 3) return ndCreating
    return false
  }

  // ── Dismiss welcome rail ────────────────────────────────────────────────────
  function dismissWelcome() {
    sessionStorage.setItem('ds_welcome_dismissed', '1')
    setWelcomeDismissed(true)
  }

  // ── Derived counts ────────────────────────────────────────────────────────
  const now = new Date()
  const activeDeals = deals.filter(d => d.status === 'analysing' || d.status === 'reviewing')
  const packSent    = deals.filter(d => d.status === 'presenting')
  const complete    = deals.filter(d => d.status === 'closed')
  const withdrawn   = deals.filter(d => d.status === 'dead')
  const thisMonth   = deals.filter(d => {
    const dt = new Date(d.created_at)
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth()
  })

  const statCells: StatCell[] = [
    { kind: 'all',    label: 'All deals',   val: deals.length },
    { kind: 'filter', label: 'Active',       val: activeDeals.length, key: 'active' },
    { kind: 'filter', label: 'Pack sent',    val: packSent.length,    key: 'presenting' },
    { kind: 'filter', label: 'Complete',     val: complete.length,    key: 'closed' },
    { kind: 'info',   label: 'Fee pipeline', val: '£0' },
    { kind: 'info',   label: 'Avg days',     val: '—' },
    { kind: 'info',   label: 'This month',   val: thisMonth.length },
  ]

  const visibleDeals = deals
    .filter(d => d.status !== 'dead')
    .filter(d => {
      if (!dealFilter) return true
      if (dealFilter === 'active') return d.status === 'analysing' || d.status === 'reviewing'
      return d.status === dealFilter
    })
    .filter(d => !filterStrategy || d.strategy === filterStrategy)
    .filter(d => {
      if (!filterScore) return true
      if (filterScore === 'none') return !d.deal_score
      return d.deal_score === filterScore
    })
    .filter(d => !filterStatus || d.status === filterStatus)
    .filter(d => {
      if (!search) return true
      const q = search.toLowerCase()
      return (d.address ?? '').toLowerCase().includes(q)
        || d.reference.toLowerCase().includes(q)
        || d.strategy.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortBy === 'price')   return (b.purchase_price ?? 0) - (a.purchase_price ?? 0)
      if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'score')   return scoreOrder(a.deal_score) - scoreOrder(b.deal_score)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

  const todayChips = [
    { ref: 'DS-2024-1234', action: 'Viewing booked',      color: '#3b82f6' },
    { ref: 'DS-2024-1235', action: 'Chase investor',       color: AMBER },
    { ref: 'DS-2024-1236', action: 'Day 15 – cooling off', color: '#7c3aed' },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={tier === 'pro_plus' ? 'tier-proplus' : ''} style={{ minHeight: '100vh', backgroundColor: BG_SEC, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══ HEADER ══ */}
      <header style={{
        height: 'var(--hdr-h)', backgroundColor: NAVY_DARK,
        display: 'flex', alignItems: 'center', padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 200, flexShrink: 0, boxSizing: 'border-box',
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, fontSize: '18px', color: '#fff', letterSpacing: '-0.3px', flexShrink: 0, fontFamily: 'inherit' }}
        >
          Deal<span style={{ color: TEAL }}>Score</span>
        </button>

        <nav style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px' }}>
          {([
            { label: 'Deals',    fn: () => navigate('/dashboard') },
            { label: 'Pipeline', fn: () => stub('Pipeline view coming soon') },
            { label: 'Compare',  fn: () => stub('Compare view coming soon') },
          ] as const).map((n, i) => (
            <button
              key={n.label}
              onClick={n.fn}
              style={{
                background: i === 0 ? 'rgba(255,255,255,.14)' : 'none',
                border: 'none', borderRadius: '7px',
                cursor: 'pointer', padding: '5px 13px', fontSize: '12px',
                fontWeight: 500,
                color: i === 0 ? '#fff' : 'rgba(255,255,255,.5)',
                fontFamily: 'inherit', transition: 'color .12s, background .12s',
              }}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Sellers + Investors right-nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={() => navigate('/sellers-crm')}
              style={{ background: 'none', border: 'none', borderRadius: '7px', cursor: 'pointer', padding: '5px 13px', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,.5)', fontFamily: 'inherit' }}
            >Seller</button>
            <div style={{ width: '0.5px', height: '14px', background: 'rgba(255,255,255,.12)', margin: '0 4px' }} />
            <button
              onClick={() => navigate('/investors-crm')}
              style={{ background: 'none', border: 'none', borderRadius: '7px', cursor: 'pointer', padding: '5px 13px', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,.5)', fontFamily: 'inherit' }}
            >Investors</button>
          </nav>
          <div style={{ width: '0.5px', height: '18px', background: 'rgba(255,255,255,.12)' }} />

          <button
            onClick={() => setPrivacyMode(p => !p)}
            title={privacyMode ? 'Privacy on — click to show data' : 'Click to hide sensitive data'}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: privacyMode ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.3)', borderRadius: '20px',
              padding: '4px 10px', cursor: 'pointer', color: '#fff',
              fontSize: '11px', fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            {privacyMode ? '🔒' : '👁'} Privacy
          </button>

          <button
            onClick={() => stub('Deal advert feature coming soon')}
            style={{
              background: 'none', border: '1.5px solid rgba(255,255,255,.4)',
              borderRadius: '7px', color: '#fff', fontSize: '13px', fontWeight: 600,
              padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}
          >
            Create advert
          </button>

          <button
            onClick={openNd}
            style={{
              backgroundColor: TEAL, border: 'none', borderRadius: '7px',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              padding: '7px 16px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}
          >
            + New deal
          </button>

          <div ref={avatarRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setAvatarOpen(p => !p)}
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                backgroundColor: '#3b5fa0', border: '2px solid rgba(255,255,255,.3)',
                color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontFamily: 'inherit',
              }}
            >
              {getInitials(profile?.full_name, user?.email)}
            </button>

            {avatarOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                backgroundColor: '#fff', border: `1px solid ${DS_BORDER}`,
                borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,.13)',
                minWidth: '200px', zIndex: 300, overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${DS_BORDER}` }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2332' }}>
                    {profile?.full_name || user?.email}
                  </div>
                  {profile?.full_name && (
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{user?.email}</div>
                  )}
                </div>
                {[
                  { label: 'Profile',  action: () => { setAvatarOpen(false); navigate('/profile') } },
                  { label: 'Settings', action: () => { setAvatarOpen(false); navigate('/profile') } },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 14px', background: 'none', border: 'none',
                      fontSize: '13px', fontWeight: 500, color: '#374151',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <div style={{ borderTop: `1px solid ${DS_BORDER}` }}>
                  <button
                    onClick={async () => { setAvatarOpen(false); await signOut(); navigate('/login') }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 14px', background: 'none', border: 'none',
                      fontSize: '13px', fontWeight: 500, color: '#dc2626',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══ STATS BAR ══ */}
      <div style={{
        backgroundColor: '#fff', borderBottom: `1px solid ${DS_BORDER}`,
        display: 'flex', height: 'var(--strip-h)',
        position: 'sticky', top: 'var(--hdr-h)', zIndex: 100,
      }}>
        {statCells.map((cell, i) => {
          const isActive =
            cell.kind === 'all'    ? dealFilter === null :
            cell.kind === 'filter' ? dealFilter === cell.key :
            false
          const isClickable = cell.kind !== 'info'

          function handleStatClick() {
            if (cell.kind === 'all')    { setDealFilter(null); return }
            if (cell.kind === 'filter') { setDealFilter(f => f === cell.key ? null : cell.key) }
          }

          return (
            <button
              key={`${cell.label}-${i}`}
              onClick={handleStatClick}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                border: 'none',
                borderRight: i < statCells.length - 1 ? `1px solid ${DS_BORDER}` : 'none',
                borderBottom: isActive ? `2px solid ${NAVY}` : '2px solid transparent',
                background: isActive ? 'rgba(27,58,107,.04)' : 'none',
                cursor: isClickable ? 'pointer' : 'default',
                padding: '0 6px', gap: '1px',
                transition: 'border-color .15s, background .15s',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 700, color: isActive ? NAVY : '#1a2332', lineHeight: 1 }}>
                {cell.val}
              </span>
              <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                {cell.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ══ BODY ══ */}
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '0 24px 60px' }}>

        {/* TODAY STRIP */}
        {!todayDismissed && (
          <div style={{
            backgroundColor: '#fff', border: `1px solid ${DS_BORDER}`,
            borderRadius: 'var(--r-md)', marginTop: '16px',
            padding: '10px 14px', display: 'flex', alignItems: 'center',
            gap: '10px', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>Today</span>

            {todayChips.map((chip, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: BG_SEC, border: `1px solid ${DS_BORDER}`,
                  borderRadius: '6px', padding: '5px 10px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>{chip.ref}</span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>·</span>
                <span style={{ fontSize: '11px', color: '#5a6270' }}>{chip.action}</span>
                <button
                  onClick={() => stub('Action routing coming soon')}
                  style={{ backgroundColor: chip.color, border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: '#fff', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                >
                  Go
                </button>
              </div>
            ))}

            <button
              onClick={() => setTodayDismissed(true)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1, flexShrink: 0, padding: '0 4px', fontFamily: 'inherit' }}
              title="Dismiss"
            >×</button>
          </div>
        )}

        {/* TOOLBAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px', maxWidth: '340px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '13px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Search address, ref or strategy…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', height: '34px',
                paddingLeft: '30px', paddingRight: '10px',
                border: `1px solid ${DS_BORDER}`, borderRadius: 'var(--r-md)',
                backgroundColor: '#fff', fontSize: '13px', color: '#1a2332',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#fff', border: `1px solid ${DS_BORDER}`, borderRadius: 'var(--r-md)', padding: '3px', flexShrink: 0 }}>
            {([
              { key: 'grid3' as ViewMode, label: '⊞ 3col',  title: 'Grid 3-column' },
              { key: 'grid4' as ViewMode, label: '⊞⊞ 4col', title: 'Grid 4-column compact' },
              { key: 'list'  as ViewMode, label: '☰ List',  title: 'List view' },
              { key: 'board' as ViewMode, label: '⌸ Board', title: 'Kanban board' },
            ]).map(v => (
              <button
                key={v.key}
                title={v.title}
                onClick={() => setViewMode(v.key)}
                style={{
                  padding: '4px 10px', border: 'none', borderRadius: '5px',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: viewMode === v.key ? NAVY : 'transparent',
                  color: viewMode === v.key ? '#fff' : '#5a6270',
                  transition: 'background .15s, color .15s', fontFamily: 'inherit',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Strategy filter */}
          <select
            value={filterStrategy}
            onChange={e => setFilterStrategy(e.target.value)}
            style={{ padding: '5px 8px', border: `0.5px solid ${DS_BORDER}`, borderRadius: '7px', fontSize: '11px', background: '#fff', color: '#555', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">All strategies</option>
            <option value="BTL">BTL</option>
            <option value="HMO">HMO</option>
            <option value="FLIP">Flip</option>
            <option value="SA">SA</option>
            <option value="BRRR">BRRR</option>
            <option value="R2R">R2R</option>
            <option value="SOCIAL">Social</option>
          </select>

          {/* Score filter */}
          <select
            value={filterScore}
            onChange={e => setFilterScore(e.target.value)}
            style={{ padding: '5px 8px', border: `0.5px solid ${DS_BORDER}`, borderRadius: '7px', fontSize: '11px', background: '#fff', color: '#555', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">All scores</option>
            <option value="RECOMMENDED">Recommended</option>
            <option value="REVIEW">Review</option>
            <option value="AVOID">Avoid</option>
            <option value="none">No score</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '5px 8px', border: `0.5px solid ${DS_BORDER}`, borderRadius: '7px', fontSize: '11px', background: '#fff', color: '#555', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0 }}
          >
            <option value="">All statuses</option>
            <option value="analysing">Sourcing</option>
            <option value="reviewing">Ready</option>
            <option value="presenting">Pack sent</option>
            <option value="closed">Complete</option>
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            style={{
              height: '34px', border: `1px solid ${DS_BORDER}`, borderRadius: 'var(--r-md)',
              backgroundColor: '#fff', fontSize: '12px', color: '#374151',
              padding: '0 10px', outline: 'none', cursor: 'pointer',
              flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            <option value="updated">Most recent</option>
            <option value="created">Newest</option>
            <option value="price">Price ↓</option>
            <option value="score">Score</option>
          </select>
        </div>

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: '14px' }}>
            Loading your deals…
          </div>
        )}

        {/* ══ EMPTY STATE ══ */}
        {!loading && deals.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '70px 24px 90px', minHeight: '50vh',
            backgroundColor: '#fff', borderRadius: '12px', border: `1px solid ${DS_BORDER}`,
          }}>
            {/* Logomark */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              backgroundColor: NAVY_DARK, display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '20px',
              boxShadow: '0 4px 16px rgba(21,45,85,.25)',
            }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', fontFamily: 'inherit' }}>
                DS
              </span>
            </div>

            <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#1a2332', margin: '0 0 10px', textAlign: 'center' }}>
              Add your first deal to get started
            </h2>
            <p style={{ fontSize: '14px', color: '#5a6270', margin: '0 0 28px', textAlign: 'center', maxWidth: '440px', lineHeight: 1.6 }}>
              Score any UK property investment — BTL, HMO, BRRR and more — and get an instant DealScore with full analysis and investor-ready pack.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={openNd}
                style={{
                  backgroundColor: TEAL, border: 'none', borderRadius: '8px',
                  color: '#fff', padding: '10px 22px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                + Add your first deal
              </button>
              <button
                onClick={() => stub('Demo video — coming soon!')}
                style={{
                  backgroundColor: '#fff', border: `1.5px solid ${DS_BORDER}`, borderRadius: '8px',
                  color: '#374151', padding: '10px 22px', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                ▶ Watch demo
              </button>
            </div>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🕐</span> Takes around 3 minutes per deal
            </div>
          </div>
        )}

        {/* ══ WELCOME RAIL ══ */}
        {!loading && deals.length > 0 && !welcomeDismissed && (
          <div style={{
            backgroundColor: '#fff', border: `1px solid ${DS_BORDER}`,
            borderRadius: 'var(--r-md)', marginBottom: '16px',
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: NAVY, letterSpacing: '.04em' }}>
                Get started with DealScore
              </span>
              <button
                onClick={dismissWelcome}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '16px', lineHeight: 1, padding: '0 2px', fontFamily: 'inherit' }}
                title="Dismiss"
              >×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {/* Tile 1 — Add a deal (teal accent) */}
              <button
                onClick={openNd}
                style={{
                  border: `1.5px solid ${TEAL}`, borderRadius: '10px',
                  padding: '14px 12px', background: 'rgba(29,158,117,.04)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  transition: 'background .12s',
                }}
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'rgba(29,158,117,.12)', color: TEAL,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', marginBottom: '6px',
                }}>+</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a2332' }}>Add a deal</div>
                <div style={{ fontSize: '11px', color: '#5a6270', lineHeight: 1.4 }}>Score any UK property across all 7 strategies instantly.</div>
              </button>

              {/* Tile 2 — Watch demo */}
              <button
                onClick={() => stub('Demo video — coming soon!')}
                style={{
                  border: `1.5px solid ${DS_BORDER}`, borderRadius: '10px',
                  padding: '14px 12px', background: '#fff',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  transition: 'background .12s, border-color .12s',
                }}
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'rgba(27,58,107,.07)', color: NAVY,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', marginBottom: '6px',
                }}>▶</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a2332' }}>Watch 2-min demo</div>
                <div style={{ fontSize: '11px', color: '#5a6270', lineHeight: 1.4 }}>See how DealScore works from sourcing to investor pack.</div>
              </button>

              {/* Tile 3 — Import deals (coming soon) */}
              <div style={{
                border: `1.5px solid ${DS_BORDER}`, borderRadius: '10px',
                padding: '14px 12px', background: '#fff', opacity: 0.6,
                display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative',
              }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: 'rgba(27,58,107,.07)', color: NAVY,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', marginBottom: '6px',
                }}>↧</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a2332', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Import deals
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: BG_SEC, color: '#9ca3af', border: `1px solid ${DS_BORDER}` }}>Soon</span>
                </div>
                <div style={{ fontSize: '11px', color: '#5a6270', lineHeight: 1.4 }}>Bring in existing deals from Excel or CSV.</div>
              </div>
            </div>
          </div>
        )}

        {/* ── GRID 3-COL ── */}
        {!loading && viewMode === 'grid3' && visibleDeals.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {visibleDeals.map(deal => {
              const isDel = deleting.has(deal.id)
              return (
                <div
                  key={deal.id}
                  style={{
                    backgroundColor: '#fff',
                    border: `0.5px solid ${DS_BORDER}`,
                    borderTop: `2.5px solid ${topBorderColor(deal)}`,
                    borderRadius: '10px', display: 'flex', flexDirection: 'column',
                    opacity: isDel ? 0.5 : 1, transition: 'opacity .2s', overflow: 'hidden',
                  }}
                >
                  {/* Card top: strategy tag + reference */}
                  <div style={{ padding: '11px 13px 5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <DsTag deal={deal} />
                    <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '.03em' }}>{deal.reference}</span>
                  </div>

                  {/* Purchase price — headline */}
                  <div style={{ padding: '0 13px 2px' }}>
                    <div className="pii" style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e', lineHeight: 1.15, letterSpacing: '-0.3px' }}>
                      {deal.purchase_price ? fCurrency(deal.purchase_price) : '—'}
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{ padding: '0 13px 7px' }}>
                    <div
                      className="pii"
                      style={{ fontSize: '13px', fontWeight: 600, color: deal.address ? '#1a2332' : '#ccc', fontStyle: deal.address ? 'normal' : 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {deal.address || 'No address'}
                    </div>
                  </div>

                  {/* Metrics 2×2 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px 13px 10px', flex: 1 }}>
                    {[
                      { label: 'Monthly CF', value: fCurrency(deal.cash_flow) },
                      { label: 'Yield',       value: fPct(deal.gross_yield) },
                      { label: 'CoC ROI',     value: fPct(deal.coc_roi) },
                      { label: 'Price',       value: fCurrency(deal.purchase_price) },
                    ].map(m => (
                      <div key={m.label} style={{ background: BG_SEC, borderRadius: '6px', padding: '7px 9px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#bbb', marginBottom: '2px' }}>{m.label}</div>
                        <div className="pii" style={{ fontSize: '13px', fontWeight: 500, color: NAVY }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer: status bar + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 13px', borderTop: `0.5px solid ${DS_BORDER}` }}>
                    <DsStatusBar status={deal.status} />
                    <CardActions dealId={deal.id} navigate={navigate} onStub={() => stub('Deal advert coming soon')} disabled={isDel} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── GRID 4-COL COMPACT ── */}
        {!loading && viewMode === 'grid4' && visibleDeals.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {visibleDeals.map(deal => {
              const isDel = deleting.has(deal.id)
              return (
                <div
                  key={deal.id}
                  style={{
                    backgroundColor: '#fff',
                    border: `0.5px solid ${DS_BORDER}`,
                    borderTop: `2.5px solid ${topBorderColor(deal)}`,
                    borderRadius: '8px', display: 'flex', flexDirection: 'column',
                    opacity: isDel ? 0.5 : 1, transition: 'opacity .2s', overflow: 'hidden',
                  }}
                >
                  {/* Compact header: dark navy band */}
                  <div style={{ background: NAVY_DARK, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.07em', color: 'rgba(255,255,255,.65)' }}>{deal.strategy}</span>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                      color: deal.deal_score === 'RECOMMENDED' ? '#34D399' : deal.deal_score === 'REVIEW' ? '#FCD34D' : deal.deal_score === 'AVOID' ? '#f87171' : 'rgba(255,255,255,.3)',
                    }}>
                      {deal.deal_score ?? 'No score'}
                    </span>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '9px 10px 8px', flex: 1 }}>
                    {/* Purchase price — headline */}
                    <div className="pii" style={{ fontSize: '19px', fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {deal.purchase_price ? fCurrency(deal.purchase_price) : '—'}
                    </div>
                    {/* Address */}
                    <div
                      className="pii"
                      style={{ fontSize: '11px', fontWeight: 600, color: deal.address ? '#1a2332' : '#ccc', fontStyle: deal.address ? 'normal' : 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }}
                    >
                      {deal.address || 'No address'}
                    </div>
                    {/* Hero metric */}
                    <div style={{ fontSize: '9px', color: '#6c757d', fontWeight: 500, marginBottom: '2px' }}>Monthly CF</div>
                    <div className="pii" style={{ fontSize: '19px', fontWeight: 800, color: deal.cash_flow && deal.cash_flow > 0 ? TEAL : deal.cash_flow && deal.cash_flow < 0 ? '#DC2626' : '#d1d5db', lineHeight: 1.1 }}>
                      {fCurrency(deal.cash_flow)}
                    </div>
                  </div>

                  {/* Footer: status bar + open button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px 8px', borderTop: `0.5px solid ${DS_BORDER}` }}>
                    <DsStatusBar status={deal.status} />
                    <button
                      onClick={() => navigate(`/deal/${deal.id}`)}
                      disabled={isDel}
                      style={{ fontSize: '10px', fontWeight: 600, color: NAVY, background: '#eef3fb', border: '0.5px solid rgba(27,58,107,.15)', borderRadius: '4px', padding: '3px 7px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      Open →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {!loading && viewMode === 'list' && visibleDeals.length > 0 && (
          <div style={{ backgroundColor: '#fff', border: `1px solid ${DS_BORDER}`, borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {visibleDeals.map((deal, idx) => {
              const isDel = deleting.has(deal.id)
              return (
                <div
                  key={deal.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px',
                    borderBottom: idx < visibleDeals.length - 1 ? `1px solid ${DS_BORDER}` : 'none',
                    opacity: isDel ? 0.5 : 1,
                  }}
                >
                  <div style={{ width: '72px', flexShrink: 0 }}><DsTag deal={deal} /></div>
                  <div className="pii" style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {deal.address || 'No address'}
                  </div>
                  <div style={{ width: '90px', flexShrink: 0 }}><StatusPill status={deal.status} /></div>
                  <div className="pii" style={{ width: '82px', flexShrink: 0, fontSize: '12px', color: '#5a6270', textAlign: 'right' }}>
                    {fCurrency(deal.cash_flow)}
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>CF/mo</div>
                  </div>
                  <div style={{ width: '58px', flexShrink: 0, fontSize: '12px', color: '#5a6270', textAlign: 'right' }}>
                    {fPct(deal.gross_yield)}
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>Yield</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => navigate(`/deal/${deal.id}`)} style={BTN_OUTLINE} disabled={isDel}>Edit</button>
                    <button onClick={() => navigate(`/deal/${deal.id}`)} style={BTN_PRIMARY_SM} disabled={isDel}>Open →</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── BOARD VIEW ── */}
        {!loading && viewMode === 'board' && (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '16px', alignItems: 'flex-start' }}>
            {BOARD_COLS.map(col => {
              const colDeals = col.status
                ? deals
                    .filter(d => d.status === col.status)
                    .filter(d => !search
                      || (d.address ?? '').toLowerCase().includes(search.toLowerCase())
                      || d.reference.toLowerCase().includes(search.toLowerCase()))
                : []
              return (
                <div key={col.label} style={{ minWidth: '200px', width: '200px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{col.label}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af', backgroundColor: BG_SEC, border: `1px solid ${DS_BORDER}`, borderRadius: '10px', padding: '1px 7px' }}>
                      {colDeals.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '60px' }}>
                    {colDeals.map(deal => (
                      <div
                        key={deal.id}
                        style={{
                          backgroundColor: '#fff',
                          border: `1px solid ${DS_BORDER}`,
                          borderTop: `2px solid ${topBorderColor(deal)}`,
                          borderRadius: '8px', padding: '10px',
                          opacity: movingId === deal.id ? 0.6 : 1, transition: 'opacity .2s',
                        }}
                      >
                        <div style={{ marginBottom: '6px' }}><DsTag deal={deal} /></div>
                        <div className="pii" style={{ fontSize: '11px', fontWeight: 600, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                          {deal.address || 'No address'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '8px' }}>{deal.reference}</div>

                        <select
                          value={deal.status}
                          disabled={movingId === deal.id}
                          onChange={e => handleBoardMove(deal.id, e.target.value as DealStatus)}
                          style={{ width: '100%', fontSize: '11px', border: `1px solid ${DS_BORDER}`, borderRadius: '5px', padding: '3px 5px', color: '#374151', backgroundColor: '#fff', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '6px' }}
                        >
                          {(Object.entries(STATUS_CFG) as [DealStatus, StatusConfig][]).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => navigate(`/deal/${deal.id}`)}
                          style={{ ...BTN_PRIMARY_SM, width: '100%', textAlign: 'center' }}
                        >
                          Open →
                        </button>
                      </div>
                    ))}

                    {col.status && (
                      <button
                        onClick={openNd}
                        style={{ border: `1.5px dashed ${DS_BORDER}`, borderRadius: '8px', padding: '8px', fontSize: '11px', color: '#9ca3af', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'center', fontFamily: 'inherit' }}
                      >
                        + Add deal
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── ARCHIVED / WITHDRAWN SECTION ── */}
        {!loading && withdrawn.length > 0 && viewMode !== 'board' && (
          <div style={{ marginTop: '48px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>
              Withdrawn &amp; removed
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {withdrawn.map(deal => (
                <div
                  key={deal.id}
                  style={{
                    backgroundColor: '#fff',
                    border: `1px solid ${DS_BORDER}`,
                    borderTop: '3px solid #dc2626',
                    borderRadius: '10px', padding: '14px',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    opacity: deleting.has(deal.id) ? 0.5 : 0.85,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <DsTag deal={deal} />
                    <StatusPill status={deal.status} />
                  </div>
                  <div className="pii" style={{ fontSize: '13px', fontWeight: 600, color: '#1a2332' }}>
                    {deal.address || 'No address'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {deal.reference} · {fDate(deal.updated_at)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button onClick={() => navigate(`/deal/${deal.id}`)} style={BTN_OUTLINE}>Reopen</button>
                    <button
                      onClick={() => handleDelete(deal.id)}
                      disabled={deleting.has(deal.id)}
                      style={{ ...BTN_GHOST, color: '#dc2626', border: '1px solid #fca5a5' }}
                    >
                      {deleting.has(deal.id) ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}

              {withdrawn.length >= 2 && (
                <div style={{ backgroundColor: '#fff', border: `1px solid ${DS_BORDER}`, borderTop: `3px solid ${NAVY}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Deal intelligence
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.55 }}>
                    {withdrawn.length} deals have been withdrawn. Common patterns include thin margins and high acquisition costs.
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Based on {withdrawn.length} withdrawn deal{withdrawn.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════
          NEW DEAL SLIDE-OVER
          ══════════════════════════════════════════════════════ */}

      {/* Backdrop */}
      {newDealOpen && (
        <div
          onClick={closeNd}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,32,64,.45)',
            zIndex: 400,
            animation: 'ndFadeIn .22s ease forwards',
          }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px',
        background: '#fff', zIndex: 401,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,.16)',
        transform: newDealOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .26s cubic-bezier(.22,.68,0,1.1)',
      }}>

        {/* Panel header */}
        <div style={{
          background: NAVY_DARK, padding: '0 20px', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '-.01em' }}>New deal</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginTop: '1px' }}>{STEP_SUBS[newDealStep]}</div>
          </div>
          <button
            onClick={closeNd}
            disabled={ndCreating}
            style={{
              width: '30px', height: '30px', borderRadius: '7px',
              background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.12)',
              color: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: ndCreating ? 'not-allowed' : 'pointer',
              fontSize: '16px', fontFamily: 'inherit',
            }}
          >✕</button>
        </div>

        {/* Step rail */}
        <NdStepRail step={newDealStep} />

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── STEP 1: Strategy ── */}
          {newDealStep === 1 && (
            <div>
              {/* Smart Capture card */}
              <div
                onClick={() => {
                  if (tier !== 'pro_plus') { stub('Upgrade to Pro Plus to unlock Smart Capture'); return }
                  ndSetStrat(ndData.strat === 'SMART_CAPTURE' ? '' : 'SMART_CAPTURE')
                }}
                style={{
                  border: ndData.strat === 'SMART_CAPTURE'
                    ? `1.5px solid ${TEAL}`
                    : `1px solid ${DS_BORDER}`,
                  borderRadius: '10px', padding: '13px 14px', marginBottom: '16px',
                  cursor: 'pointer', background: ndData.strat === 'SMART_CAPTURE' ? 'rgba(29,158,117,.05)' : '#fff',
                  boxShadow: ndData.strat === 'SMART_CAPTURE' ? `0 0 0 2px rgba(29,158,117,.18)` : 'none',
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                    background: ndData.strat === 'SMART_CAPTURE' ? 'rgba(29,158,117,.12)' : 'rgba(27,58,107,.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                    color: ndData.strat === 'SMART_CAPTURE' ? TEAL : NAVY,
                    transition: 'all .15s',
                  }}>✦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a2332' }}>Smart Capture</span>
                      {tier !== 'pro_plus' ? (
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(217,119,6,.12)', color: '#D97706', border: '.5px solid rgba(217,119,6,.3)' }}>Pro Plus</span>
                      ) : ndData.strat === 'SMART_CAPTURE' ? (
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(29,158,117,.12)', color: TEAL }}>Selected</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '11px', color: '#5a6270', lineHeight: 1.55 }}>
                      One consolidated form covering all 7 strategies in a single pass. No re-entering data per strategy.
                    </div>
                  </div>
                  {tier !== 'pro_plus' ? (
                    <span style={{ color: AMBER, fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>🔒</span>
                  ) : ndData.strat === 'SMART_CAPTURE' ? (
                    <span style={{ color: TEAL, fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>✓</span>
                  ) : null}
                </div>

                {/* Upgrade hint for Pro tier */}
                {tier !== 'pro_plus' && (
                  <div style={{
                    marginTop: '9px', background: 'rgba(217,119,6,.06)',
                    border: '.5px solid rgba(217,119,6,.2)', borderRadius: '7px',
                    padding: '7px 10px', fontSize: '10px', color: '#92400e',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span style={{ color: AMBER, flexShrink: 0 }}>↑</span>
                    Upgrade to Pro Plus to unlock Smart Capture and analyse all 7 strategies in one go.
                    <button
                      onClick={e => { e.stopPropagation(); stub('Upgrade modal coming soon') }}
                      style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, background: NAVY, color: '#fff', border: 'none', borderRadius: '20px', padding: '3px 10px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}
                    >Upgrade</button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#bbb', marginBottom: '10px' }}>
                Or select a single strategy
              </div>

              {/* Strategy grid — 4 + 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '7px', marginBottom: '7px' }}>
                {STRATEGIES.slice(0, 4).map(s => (
                  <button
                    key={s.code}
                    onClick={() => ndSetStrat(s.code)}
                    style={{
                      border: ndData.strat === s.code ? `1.5px solid ${TEAL}` : `1.5px solid ${DS_BORDER}`,
                      borderRadius: '8px',
                      background: ndData.strat === s.code ? 'rgba(29,158,117,.07)' : BG_SEC,
                      boxShadow: ndData.strat === s.code ? `0 0 0 2px rgba(29,158,117,.18)` : 'none',
                      padding: '11px 8px 10px', cursor: 'pointer', textAlign: 'center',
                      transition: 'all .13s', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: ndData.strat === s.code ? TEAL : NAVY, marginBottom: '3px', letterSpacing: '.01em' }}>
                      {s.code}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 500, color: ndData.strat === s.code ? '#0a6e4e' : '#5a6270', lineHeight: 1.25 }}>
                      {s.name}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '7px', marginBottom: '16px' }}>
                {STRATEGIES.slice(4).map(s => (
                  <button
                    key={s.code}
                    onClick={() => ndSetStrat(s.code)}
                    style={{
                      border: ndData.strat === s.code ? `1.5px solid ${TEAL}` : `1.5px solid ${DS_BORDER}`,
                      borderRadius: '8px',
                      background: ndData.strat === s.code ? 'rgba(29,158,117,.07)' : BG_SEC,
                      boxShadow: ndData.strat === s.code ? `0 0 0 2px rgba(29,158,117,.18)` : 'none',
                      padding: '11px 8px 10px', cursor: 'pointer', textAlign: 'center',
                      transition: 'all .13s', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: ndData.strat === s.code ? TEAL : NAVY, marginBottom: '3px', letterSpacing: '.01em' }}>
                      {s.code}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 500, color: ndData.strat === s.code ? '#0a6e4e' : '#5a6270', lineHeight: 1.25 }}>
                      {s.name}
                    </div>
                  </button>
                ))}
              </div>

              {/* Validation error */}
              {ndStratErr && (
                <div style={{ fontSize: '10px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚠</span> Please select a strategy or Smart Capture to continue
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Deal basics ── */}
          {newDealStep === 2 && (
            <div>
              {/* Address */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '5px' }}>
                  Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14 Roath Court Road, Cardiff CF24 3BJ"
                  value={ndData.address}
                  onChange={e => setNdData(d => ({ ...d, address: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '9px 11px',
                    border: `1px solid ${DS_BORDER}`, borderRadius: '7px',
                    fontSize: '13px', color: '#1a2332', background: '#fff',
                    outline: 'none', fontFamily: 'inherit', transition: 'border-color .13s',
                  }}
                />
                <div style={{ marginTop: '5px', fontSize: '10px', color: '#9ca3af' }}>
                  Leave blank to save as <em>Untitled deal</em> and add the address later.
                </div>
              </div>

              {/* Price + Country */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '5px' }}>
                    Asking price
                  </label>
                  <input
                    type="text"
                    placeholder="£185,000"
                    value={ndData.price}
                    onChange={e => setNdData(d => ({ ...d, price: e.target.value }))}
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '9px 11px',
                      border: `1px solid ${DS_BORDER}`, borderRadius: '7px',
                      fontSize: '13px', color: '#1a2332', background: '#fff',
                      outline: 'none', fontFamily: 'inherit', transition: 'border-color .13s',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '5px' }}>
                    Country / tax region
                  </label>
                  <select
                    value={ndData.country}
                    onChange={e => setNdData(d => ({ ...d, country: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 11px',
                      border: `1px solid ${DS_BORDER}`, borderRadius: '7px',
                      fontSize: '13px', color: '#1a2332', background: '#fff',
                      outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Select…</option>
                    <option value="England">England &amp; NI</option>
                    <option value="Wales">Wales</option>
                    <option value="Scotland">Scotland</option>
                  </select>
                </div>
              </div>

              {/* Property type + Bedrooms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '5px' }}>
                    Property type
                  </label>
                  <select
                    value={ndData.proptype}
                    onChange={e => setNdData(d => ({ ...d, proptype: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 11px',
                      border: `1px solid ${DS_BORDER}`, borderRadius: '7px',
                      fontSize: '13px', color: '#1a2332', background: '#fff',
                      outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Select…</option>
                    <option>Terraced</option>
                    <option>Semi-detached</option>
                    <option>Detached</option>
                    <option>Flat / apartment</option>
                    <option>Bungalow</option>
                    <option>HMO property</option>
                    <option>Commercial</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '5px' }}>
                    Bedrooms
                  </label>
                  <select
                    value={ndData.beds}
                    onChange={e => setNdData(d => ({ ...d, beds: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 11px',
                      border: `1px solid ${DS_BORDER}`, borderRadius: '7px',
                      fontSize: '13px', color: '#1a2332', background: '#fff',
                      outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Select…</option>
                    <option>Studio</option>
                    <option value="1">1 bed</option>
                    <option value="2">2 bed</option>
                    <option value="3">3 bed</option>
                    <option value="4">4 bed</option>
                    <option value="5">5 bed</option>
                    <option value="6+">6+ bed</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Source & vendor ── */}
          {newDealStep === 3 && (
            <div>
              {/* Review card */}
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#bbb', marginBottom: '10px' }}>
                Deal review
              </div>
              <div style={{ background: BG_SEC, border: `1px solid ${DS_BORDER}`, borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#bbb', marginBottom: '10px' }}>
                  Summary
                </div>
                {[
                  { label: 'Strategy', val: ndData.strat || '—', teal: true },
                  { label: 'Address',  val: ndData.address.trim() || 'Untitled deal', muted: !ndData.address.trim() },
                  { label: 'Asking price', val: ndData.price || 'Not set', muted: !ndData.price },
                  { label: 'Property',    val: [ndData.beds ? `${ndData.beds} bed` : '', ndData.proptype].filter(Boolean).join(' · ') || 'Not set', muted: !ndData.proptype && !ndData.beds },
                  { label: 'Country',     val: ndData.country || 'Not set', muted: !ndData.country },
                ].map((row, idx, arr) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      padding: '5px 0',
                      borderBottom: idx < arr.length - 1 ? `.5px solid ${DS_BORDER}` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#5a6270' }}>{row.label}</span>
                    <span style={{ fontSize: '11px', fontWeight: row.muted ? 400 : 600, color: row.teal ? TEAL : row.muted ? '#bbb' : '#1a2332' }}>
                      {row.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Source of deal — collapsible */}
              <div>
                <button
                  onClick={() => setNdSrcOpen(p => !p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '9px 12px', background: BG_SEC, borderRadius: '8px',
                    border: `1px solid ${DS_BORDER}`, cursor: 'pointer', marginBottom: '10px',
                    transition: 'background .12s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#5a6270' }}>📍</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#1a2332', flex: 1, textAlign: 'left' }}>Source of deal</span>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>Optional</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af', transform: ndSrcOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>▾</span>
                </button>
                {ndSrcOpen && (
                  <div style={{ paddingBottom: '4px', marginBottom: '6px' }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '5px' }}>
                      How did you find this deal?
                    </label>
                    <select
                      value={ndSource}
                      onChange={e => setNdSource(e.target.value)}
                      style={{
                        width: '100%', padding: '9px 11px',
                        border: `1px solid ${DS_BORDER}`, borderRadius: '7px',
                        fontSize: '13px', color: '#1a2332', background: '#fff',
                        outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <option value="">Select…</option>
                      {SOURCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Vendor details — collapsible */}
              <div>
                <button
                  onClick={() => setNdVendorOpen(p => !p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '9px 12px', background: BG_SEC, borderRadius: '8px',
                    border: `1px solid ${DS_BORDER}`, cursor: 'pointer', marginBottom: '10px',
                    transition: 'background .12s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#5a6270' }}>👤</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#1a2332', flex: 1, textAlign: 'left' }}>Vendor details</span>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>Optional — flows to Seller tab</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af', transform: ndVendorOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>▾</span>
                </button>
                {ndVendorOpen && (
                  <div style={{ paddingBottom: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '5px' }}>
                          Vendor first name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Sarah"
                          value={ndVendorName}
                          onChange={e => setNdVendorName(e.target.value)}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '9px 11px',
                            border: `1px solid ${DS_BORDER}`, borderRadius: '7px',
                            fontSize: '13px', color: '#1a2332', background: '#fff',
                            outline: 'none', fontFamily: 'inherit',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '5px' }}>
                          Contact number
                        </label>
                        <input
                          type="text"
                          placeholder="07…"
                          value={ndVendorTel}
                          onChange={e => setNdVendorTel(e.target.value)}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '9px 11px',
                            border: `1px solid ${DS_BORDER}`, borderRadius: '7px',
                            fontSize: '13px', color: '#1a2332', background: '#fff',
                            outline: 'none', fontFamily: 'inherit',
                          }}
                        />
                      </div>
                    </div>

                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '8px' }}>
                      Vendor motivation
                    </label>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {(['motivated', 'flexible', 'firm'] as const).map(m => {
                        const colors: Record<string, { sel: string; bg: string; border: string }> = {
                          motivated: { sel: '#991b1b', bg: 'rgba(220,38,38,.08)', border: '#fca5a5' },
                          flexible:  { sel: '#92400e', bg: 'rgba(217,119,6,.08)',  border: '#fde68a' },
                          firm:      { sel: NAVY,      bg: 'rgba(27,58,107,.07)', border: 'rgba(27,58,107,.3)' },
                        }
                        const c = colors[m]
                        const selected = ndMotiv === m
                        return (
                          <button
                            key={m}
                            onClick={() => setNdMotiv(selected ? '' : m)}
                            style={{
                              padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit',
                              border: selected ? `1.5px solid ${c.border}` : `1.5px solid ${DS_BORDER}`,
                              background: selected ? c.bg : BG_SEC,
                              color: selected ? c.sel : '#5a6270',
                              transition: 'all .12s',
                            }}
                          >
                            {m === 'motivated' ? '🔴' : m === 'flexible' ? '🟡' : '🔵'} {m.charAt(0).toUpperCase() + m.slice(1)}
                          </button>
                        )
                      })}
                    </div>

                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: '#9ca3af', marginBottom: '8px' }}>
                      Vendor situation <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10px', color: '#bbb' }}>— select all that apply</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {VENDOR_SITUATIONS.map(sit => {
                        const sel = ndSituations.has(sit)
                        return (
                          <button
                            key={sit}
                            onClick={() => setNdSituations(prev => {
                              const s = new Set(prev)
                              sel ? s.delete(sit) : s.add(sit)
                              return s
                            })}
                            style={{
                              padding: '5px 11px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit',
                              border: sel ? `1.5px solid #fde68a` : `1.5px solid ${DS_BORDER}`,
                              background: sel ? 'rgba(217,119,6,.08)' : BG_SEC,
                              color: sel ? '#92400e' : '#5a6270',
                              transition: 'all .12s',
                            }}
                          >
                            {sit}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Skip nudge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', background: BG_SEC,
                border: `1px solid ${DS_BORDER}`, borderRadius: '8px', marginTop: '14px',
              }}>
                <span style={{ fontSize: '14px', color: '#5a6270', flexShrink: 0 }}>ℹ</span>
                <span style={{ fontSize: '11px', color: '#5a6270' }}>
                  Don't have seller details yet? Skip this step — you can add them from the <strong>Seller tab</strong> once the deal is created.
                </span>
              </div>
            </div>
          )}

        </div>
        {/* end .nd-body */}

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${DS_BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', flexShrink: 0,
        }}>
          <span style={{ fontSize: '11px', color: '#5a6270' }}>{ndFooterHint()}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {newDealStep > 1 && (
              <button
                onClick={handleNdBack}
                disabled={ndCreating}
                style={{
                  padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                  fontFamily: 'inherit', cursor: 'pointer',
                  border: `1px solid ${DS_BORDER}`, background: '#fff', color: '#374151',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNdNext}
              disabled={ndNextDisabled()}
              style={{
                padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                fontFamily: 'inherit', cursor: ndNextDisabled() ? 'not-allowed' : 'pointer',
                border: `1px solid ${TEAL}`, background: TEAL, color: '#fff',
                opacity: ndNextDisabled() ? 0.4 : 1,
                display: 'flex', alignItems: 'center', gap: '5px',
                transition: 'opacity .12s',
              }}
            >
              {ndNextLabel()}
            </button>
          </div>
        </div>

        {/* Success overlay */}
        <div style={{
          position: 'absolute', inset: 0, background: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px',
          opacity: ndSuccess ? 1 : 0,
          pointerEvents: ndSuccess ? 'all' : 'none',
          transition: 'opacity .22s', zIndex: 5,
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'rgba(29,158,117,.1)', border: `2px solid ${TEAL}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', color: TEAL,
          }}>
            ✓
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a2332' }}>Deal created</div>
          <span style={{
            fontSize: '11px', fontWeight: 700, color: NAVY,
            background: 'rgba(27,58,107,.07)', border: '.5px solid rgba(27,58,107,.15)',
            borderRadius: '20px', padding: '4px 14px', letterSpacing: '.04em',
          }}>
            {ndSuccessRef}
          </span>
          <div style={{ fontSize: '12px', color: '#5a6270', textAlign: 'center', maxWidth: '280px', lineHeight: 1.5 }}>
            Opening the Inputs tab — add your numbers to get a score.
          </div>
        </div>

      </div>
      {/* end nd-panel */}

    </div>
  )
}
