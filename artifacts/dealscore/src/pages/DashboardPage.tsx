import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useAuth } from '../lib/AuthContext'
import { listDeals, deleteDeal, createDeal } from '../lib/dealService'
import { Deal, DealStatus } from '../lib/database.types'
import { supabase } from '../lib/supabase'
import DealsDashboard, { mapDealToProps } from '../components/DealsDashboard'

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

  // ── Scrape state ──────────────────────────────────────────────────────────
  const [scrapeUrl, setScrapeUrl]         = useState('')
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [scrapeResult, setScrapeResult]   = useState<string | null>(null)
  const [scrapeExtra, setScrapeExtra]     = useState<{
    tenure?: string
    epcRating?: string
    floorAreaSqm?: number
    images?: string[]
  }>({})

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
    setScrapeUrl('')
    setScrapeResult(null)
    setScrapeLoading(false)
    setScrapeExtra({})
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
      { ...scrapeExtra }, null, null, null, null
    )
    setNdCreating(false)
    if (!deal) { alert('Failed to create deal — please try again'); return }
    setNdSuccessRef(deal.reference)
    setNdSuccess(true)
    setTimeout(() => {
      closeNd()
      void fetchDeals()
      navigate(`/deal/${deal.id}?tab=analysis&view=inputs&editing=true`)
    }, 1900)
  }

  async function handleScrapeUrl() {
    const url = scrapeUrl.trim()
    if (!url) return
    setScrapeLoading(true)
    setScrapeResult(null)
    setScrapeExtra({})
    try {
      const { data, error } = await supabase.functions.invoke('scrape-property', {
        body: { url },
      })
      if (error || !data?.success) {
        setScrapeResult(data?.error || 'Could not read that listing — please enter details manually.')
        return
      }
      const d = data.data

      if (d.address) setNdData(nd => ({ ...nd, address: d.address }))
      if (d.price)   setNdData(nd => ({ ...nd, price: `£${d.price.toLocaleString('en-GB')}` }))
      if (d.beds)    setNdData(nd => ({ ...nd, beds: d.beds }))
      if (d.propertyType) setNdData(nd => ({ ...nd, proptype: d.propertyType }))
      if (d.postcode && !d.address) setNdData(nd => ({ ...nd, address: d.postcode }))

      if (d.postcode) {
        const pc = d.postcode.toUpperCase()
        if (pc.startsWith('BT')) {
          setNdData(nd => ({ ...nd, country: 'Northern Ireland' }))
        } else if (['AB','DD','DG','EH','FK','G','HS','IV','KA','KW','KY','ML','PA','PH','TD','ZE'].some(p => pc.startsWith(p))) {
          setNdData(nd => ({ ...nd, country: 'Scotland' }))
        } else if (['CF','CH','LD','LL','NP','SA','SY'].some(p => pc.startsWith(p))) {
          setNdData(nd => ({ ...nd, country: 'Wales' }))
        } else {
          setNdData(nd => ({ ...nd, country: 'England' }))
        }
      }

      const extra: { tenure?: string; epcRating?: string; floorAreaSqm?: number; images?: string[] } = {}
      if (d.tenure)       extra.tenure = d.tenure
      if (d.epcRating)    extra.epcRating = d.epcRating
      if (d.floorAreaSqm) extra.floorAreaSqm = d.floorAreaSqm
      if (d.images?.length) extra.images = d.images
      setScrapeExtra(extra)

      const populated = [
        d.address && 'address',
        d.price && 'price',
        d.beds && 'beds',
        d.propertyType && 'property type',
        d.tenure && 'tenure',
        d.epcRating && `EPC ${d.epcRating}`,
        d.floorAreaSqm && `${d.floorAreaSqm}m²`,
      ].filter(Boolean)
      setScrapeResult(`success:${populated.join(', ')}`)
    } catch (_err) {
      setScrapeResult('Could not read that listing — please enter details manually.')
    } finally {
      setScrapeLoading(false)
    }
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

  // ── Render helpers ───────────────────────────────────────────────────────────
  const STATUS_CSS: Record<DealStatus, string> = {
    analysing:  'sourcing',
    reviewing:  'ready',
    presenting: 'pack-sent',
    closed:     'complete',
    dead:       'withdrawn',
  }
  const scoreCls = (s: Deal['deal_score']): string =>
    s === 'RECOMMENDED' ? 'rec' : s === 'REVIEW' ? 'rev' : s === 'AVOID' ? 'av' : 'inc'
  const scoreLbl = (s: Deal['deal_score']): string =>
    s === 'RECOMMENDED' ? 'Recommended' : s === 'REVIEW' ? 'Review' : s === 'AVOID' ? 'Avoid' : 'Incomplete'
  const KB_STATUS_CSS: Record<string, string> = {
    'Sourcing': 'sourcing', 'Ready': 'ready', 'Live': 'live',
    'Reserved': 'reserved', 'Pack sent': 'pack-sent',
    'Complete': 'complete', 'Withdrawn': 'withdrawn',
  }
  const KB_META: Record<string, string> = {
    'Sourcing': 'Analysing · not yet ready',
    'Ready': 'Scored · ready to advertise',
    'Live': 'Advertised · awaiting investor',
    'Reserved': 'Cooling off · investor committed',
    'Pack sent': 'Pack released · fee due',
    'Complete': 'Fee received · deal closed',
    'Withdrawn': 'Fell through · archived',
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <DealsDashboard
        deals={deals.map(d => mapDealToProps(d, null))}
        userName={user?.email ?? ''}
        userInitials={(user?.email?.[0] ?? 'U').toUpperCase()}
        userEmail={user?.email ?? ''}
        onNewDeal={openNd}
        onOpenDeal={(id) => navigate('/deal/' + id)}
        onPipeline={() => navigate('/pipeline')}
        onCompare={() => navigate('/compare')}
        onSellers={() => navigate('/sellers-crm')}
        onInvestors={() => navigate('/investors-crm')}
        onSignOut={async () => { await supabase.auth.signOut(); navigate('/login') }}
      />

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
              {/* ── Listing URL auto-fill ── */}
              <div style={{
                background: '#f0f9f5',
                border: '1px solid #b6e8d5',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#1D9E75', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-sparkles" style={{ fontSize: 12 }} />
                  Auto-fill from listing
                </div>
                <div style={{ fontSize: 11, color: '#5a6270', marginBottom: 8 }}>
                  Paste a Rightmove, Zoopla, or OnTheMarket URL and we'll fill in the details for you.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="url"
                    value={scrapeUrl}
                    onChange={e => { setScrapeUrl(e.target.value); setScrapeResult(null) }}
                    placeholder="https://www.rightmove.co.uk/properties/..."
                    style={{
                      flex: 1,
                      fontSize: 11,
                      padding: '6px 10px',
                      border: '.5px solid #b6e8d5',
                      borderRadius: 6,
                      fontFamily: 'inherit',
                      color: '#1a2332',
                      background: '#fff',
                      outline: 'none',
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleScrapeUrl() } }}
                  />
                  <button
                    onClick={() => void handleScrapeUrl()}
                    disabled={!scrapeUrl.trim() || scrapeLoading}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: scrapeLoading ? '#9ca3af' : '#1D9E75',
                      color: '#fff',
                      cursor: scrapeLoading ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      minWidth: 80,
                      justifyContent: 'center',
                    }}
                  >
                    {scrapeLoading
                      ? <><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 12 }} /> Reading…</>
                      : <><i className="ti ti-download" style={{ fontSize: 12 }} /> Fill in</>
                    }
                  </button>
                </div>

                {scrapeResult && scrapeResult.startsWith('success:') && (
                  <div style={{ marginTop: 7, fontSize: 11, color: '#1D9E75', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="ti ti-circle-check" style={{ fontSize: 12 }} />
                    Filled in: {scrapeResult.replace('success:', '')}
                  </div>
                )}
                {scrapeResult && !scrapeResult.startsWith('success:') && (
                  <div style={{ marginTop: 7, fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />
                    {scrapeResult}
                  </div>
                )}
              </div>

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

    </>
  )
}