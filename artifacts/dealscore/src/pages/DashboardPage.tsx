import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useAuth } from '../lib/AuthContext'
import { listDeals, deleteDeal } from '../lib/dealService'
import { Deal, DealStatus } from '../lib/database.types'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'grid3' | 'grid4' | 'list' | 'board'
type SortKey  = 'updated' | 'created' | 'price' | 'score'
type DealFilter = 'active' | 'presenting' | 'closed' | null

type StatusConfig = { label: string; bg: string; color: string }

// For stats bar cells — discriminated union makes the active/click logic type-safe
type StatCell =
  | { kind: 'all';    label: string; val: number }
  | { kind: 'filter'; label: string; val: number; key: Exclude<DealFilter, null> }
  | { kind: 'info';   label: string; val: number | string }

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY       = '#1B3A6B'
const NAVY_DARK  = '#152d55'
const TEAL       = '#1D9E75'
const AMBER      = '#F59E0B'
const BG_SEC     = '#f5f6f8'
const DS_BORDER  = '#e3e5e9'

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
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const p = name.trim().split(/\s+/)
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase()
  }
  return email ? email.slice(0, 2).toUpperCase() : '??'
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
      <button onClick={() => navigate(`/app?deal=${dealId}`)} style={BTN_OUTLINE} disabled={disabled}>Edit</button>
      <button onClick={() => navigate(`/app?deal=${dealId}`)} style={BTN_PRIMARY_SM} disabled={disabled}>Open →</button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile, tier, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Data
  const [deals, setDeals]     = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [movingId, setMovingId] = useState<string | null>(null)

  // UI
  const [viewMode, setViewMode]         = useState<ViewMode>('grid3')
  const [search, setSearch]             = useState('')
  const [sortBy, setSortBy]             = useState<SortKey>('updated')
  const [dealFilter, setDealFilter]     = useState<DealFilter>(null)
  const [todayDismissed, setTodayDismissed] = useState(false)
  const [privacyMode, setPrivacyMode]   = useState(false)
  const [avatarOpen, setAvatarOpen]     = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

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

  // ── Derived counts ──
  const now = new Date()
  const activeDeals = deals.filter(d => d.status === 'analysing' || d.status === 'reviewing')
  const packSent    = deals.filter(d => d.status === 'presenting')
  const complete    = deals.filter(d => d.status === 'closed')
  const withdrawn   = deals.filter(d => d.status === 'dead')
  const thisMonth   = deals.filter(d => {
    const dt = new Date(d.created_at)
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth()
  })

  // Stats bar cells (discriminated union)
  const statCells: StatCell[] = [
    { kind: 'all',    label: 'All deals',    val: deals.length },
    { kind: 'filter', label: 'Active',        val: activeDeals.length, key: 'active' },
    { kind: 'filter', label: 'Pack sent',     val: packSent.length,    key: 'presenting' },
    { kind: 'filter', label: 'Complete',      val: complete.length,    key: 'closed' },
    { kind: 'info',   label: 'Fee pipeline',  val: '£0' },
    { kind: 'info',   label: 'Avg days',      val: '—' },
    { kind: 'info',   label: 'This month',    val: thisMonth.length },
  ]

  // Visible deals for grid (excludes withdrawn; applies filter + search + sort)
  const visibleDeals = deals
    .filter(d => d.status !== 'dead')
    .filter(d => {
      if (!dealFilter) return true
      if (dealFilter === 'active') return d.status === 'analysing' || d.status === 'reviewing'
      return d.status === dealFilter
    })
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

  // Stub today strip chips
  const todayChips = [
    { ref: 'DS-2024-1234', action: 'Viewing booked',      color: '#3b82f6' },
    { ref: 'DS-2024-1235', action: 'Chase investor',       color: AMBER },
    { ref: 'DS-2024-1236', action: 'Day 15 – cooling off', color: '#7c3aed' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={tier === 'pro_plus' ? 'tier-proplus' : ''} style={{ minHeight: '100vh', backgroundColor: BG_SEC, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ══ HEADER ══ */}
      <header style={{
        height: 'var(--hdr-h)', backgroundColor: NAVY_DARK,
        display: 'flex', alignItems: 'center', padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 200, flexShrink: 0, boxSizing: 'border-box',
      }}>
        {/* Wordmark */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, fontSize: '18px', color: '#fff', letterSpacing: '-0.3px', flexShrink: 0, fontFamily: 'inherit' }}
        >
          Deal<span style={{ color: TEAL }}>Score</span>
        </button>

        {/* Centre nav */}
        <nav style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '2px' }}>
          {([
            { label: 'Dashboard', active: true,  fn: () => navigate('/dashboard') },
            { label: 'Investors', active: false, fn: () => stub('Investors coming soon') },
            { label: 'Sellers',   active: false, fn: () => stub('Sellers coming soon') },
          ] as const).map(n => (
            <button
              key={n.label}
              onClick={n.fn}
              style={{
                background: 'none', border: 'none',
                borderBottom: n.active ? `2px solid ${TEAL}` : '2px solid transparent',
                cursor: 'pointer', padding: '8px 14px', fontSize: '13px',
                fontWeight: n.active ? 700 : 500,
                color: n.active ? '#fff' : 'rgba(255,255,255,.55)',
                fontFamily: 'inherit', transition: 'color .15s',
              }}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Privacy toggle */}
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

          {/* Create advert */}
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

          {/* New deal */}
          <button
            onClick={() => navigate('/app')}
            style={{
              backgroundColor: TEAL, border: 'none', borderRadius: '7px',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              padding: '7px 16px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}
          >
            + New deal
          </button>

          {/* Avatar + dropdown */}
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
          {/* Search */}
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

          {/* View switcher */}
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

          <button onClick={() => stub('Compare view coming soon')} style={{ ...BTN_GHOST, flexShrink: 0 }}>Compare</button>

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

        {/* EMPTY STATE */}
        {!loading && deals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: '#fff', borderRadius: '12px', border: `1px solid ${DS_BORDER}` }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>📋</div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1a2332', margin: '0 0 8px' }}>No deals yet</h2>
            <p style={{ fontSize: '14px', color: '#5a6270', marginBottom: '24px' }}>
              Save a deal from the analyser to see it here
            </p>
            <button
              onClick={() => navigate('/app')}
              style={{ backgroundColor: NAVY, color: '#fff', border: 'none', borderRadius: '7px', padding: '10px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Analyse a deal
            </button>
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
                    border: `1px solid ${DS_BORDER}`,
                    borderTop: `3px solid ${topBorderColor(deal)}`,
                    borderRadius: '10px', display: 'flex', flexDirection: 'column',
                    opacity: isDel ? 0.5 : 1, transition: 'opacity .2s', overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '14px 14px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <DsTag deal={deal} />
                    <StatusPill status={deal.status} />
                  </div>

                  <div style={{ padding: '0 14px 10px' }}>
                    <div className="pii" style={{ fontSize: '13px', fontWeight: 600, color: '#1a2332', lineHeight: 1.35 }}>
                      {deal.address || 'No address'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{deal.reference}</div>
                  </div>

                  {/* cinfo-zone */}
                  <div style={{ height: '72px', overflow: 'hidden', flexShrink: 0, padding: '4px 14px 0', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <Metric label="Monthly CF" value={fCurrency(deal.cash_flow)} />
                    <Metric label="Yield"       value={fPct(deal.gross_yield)} />
                    <Metric label="CoC ROI"     value={fPct(deal.coc_roi)} />
                  </div>

                  <div style={{ padding: '10px 14px 14px', marginTop: 'auto' }}>
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
                    border: `1px solid ${DS_BORDER}`,
                    borderTop: `3px solid ${topBorderColor(deal)}`,
                    borderRadius: '8px', padding: '12px',
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    opacity: isDel ? 0.5 : 1, transition: 'opacity .2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <DsTag deal={deal} />
                    <StatusPill status={deal.status} />
                  </div>

                  <div className="pii" style={{ fontSize: '12px', fontWeight: 600, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {deal.address || 'No address'}
                  </div>

                  {/* cinfo-zone */}
                  <div style={{ height: '72px', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
                    <Metric label="CF"    value={fCurrency(deal.cash_flow)} />
                    <Metric label="Yield" value={fPct(deal.gross_yield)} />
                  </div>

                  <button
                    onClick={() => navigate(`/app?deal=${deal.id}`)}
                    disabled={isDel}
                    style={{ ...BTN_PRIMARY_SM, width: '100%', textAlign: 'center', marginTop: 'auto' }}
                  >
                    Open →
                  </button>
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
                    <button onClick={() => navigate(`/app?deal=${deal.id}`)} style={BTN_OUTLINE} disabled={isDel}>Edit</button>
                    <button onClick={() => navigate(`/app?deal=${deal.id}`)} style={BTN_PRIMARY_SM} disabled={isDel}>Open →</button>
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

                        {/* Stage dropdown */}
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
                          onClick={() => navigate(`/app?deal=${deal.id}`)}
                          style={{ ...BTN_PRIMARY_SM, width: '100%', textAlign: 'center' }}
                        >
                          Open →
                        </button>
                      </div>
                    ))}

                    {/* Add deal CTA */}
                    {col.status && (
                      <button
                        onClick={() => navigate('/app')}
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
                    <button onClick={() => navigate(`/app?deal=${deal.id}`)} style={BTN_OUTLINE}>Reopen</button>
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

              {/* Deal intelligence card */}
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
    </div>
  )
}
