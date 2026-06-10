import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY      = '#1B3A6B'
const NAVY_DARK = '#152d55'
const TEAL      = '#1D9E75'
const DS_BORDER = '#e3e5e9'
const BG_SEC    = '#f5f6f8'
const BG_BODY   = '#eef0f4'
const TEXT_1    = '#1a1a2e'
const TEXT_2    = '#6c757d'
const HDR_H     = 56

// ─── Types ────────────────────────────────────────────────────────────────────
type Motivation = 'hot' | 'warm' | 'cool'
type SellerStatus = 'negot' | 'active' | 'agreed' | 'lost'
type ChainStatus = 'none' | 'short' | 'in'

interface Seller {
  id: string
  name: string
  phone: string
  email: string | null
  motivation: Motivation
  askingPrice: number | null
  currentOffer: number | null
  chainStatus: ChainStatus
  agentName: string
  agentAgency: string
  status: SellerStatus
  dealRef: string | null
  dealAddress: string | null
  lastContact: string
  notes: string
  chaseDate: string | null
}

// ─── Sample data (matches mockup) ─────────────────────────────────────────────
const INITIAL_SELLERS: Seller[] = [
  {
    id: 's1', name: 'John Smith', phone: '07700 900111', email: 'j.smith@email.com',
    motivation: 'hot', askingPrice: 215000, currentOffer: 200000,
    chainStatus: 'none', agentName: 'Sarah Michaels', agentAgency: 'Linley & Simpson',
    status: 'negot', dealRef: 'DS-001', dealAddress: '65a Horwood Close',
    lastContact: 'Yesterday', notes: 'Divorce situation. Wants quick sale. Very open to negotiation below asking.',
    chaseDate: 'Chase today',
  },
  {
    id: 's2', name: 'Patricia Williams', phone: '07700 900222', email: 'pwilliams@gmail.com',
    motivation: 'hot', askingPrice: 318000, currentOffer: null,
    chainStatus: 'short', agentName: 'David Jones', agentAgency: 'Knight Frank',
    status: 'active', dealRef: 'DS-002', dealAddress: '12 Victoria Street',
    lastContact: '3 days ago', notes: 'Downsizing. Time pressure. Viewing Thu 5 Jun.',
    chaseDate: 'Chase Thu',
  },
  {
    id: 's3', name: 'Derek Hassan', phone: '07700 900333', email: 'd.hassan@hotmail.com',
    motivation: 'warm', askingPrice: 192000, currentOffer: 185000,
    chainStatus: 'none', agentName: 'Mark Thornton', agentAgency: 'Purplebricks',
    status: 'active', dealRef: 'DS-003', dealAddress: '8 Park Lane',
    lastContact: '1 week ago', notes: 'Moving abroad. Flexible on timeline but wants market value.',
    chaseDate: null,
  },
  {
    id: 's4', name: 'Sandra Okafor', phone: '07700 900444', email: null,
    motivation: 'cool', askingPrice: 148000, currentOffer: null,
    chainStatus: 'in', agentName: 'Kim Lee', agentAgency: 'Martin & Co',
    status: 'lost', dealRef: 'DS-004', dealAddress: '22 Oak Road',
    lastContact: '2 weeks ago', notes: 'Would not negotiate. Went with another buyer.',
    chaseDate: null,
  },
  {
    id: 's5', name: 'Michael Reeves', phone: '07700 900555', email: 'm.reeves@gmail.com',
    motivation: 'hot', askingPrice: 302000, currentOffer: 290000,
    chainStatus: 'none', agentName: 'Emma Clarke', agentAgency: 'Savills',
    status: 'agreed', dealRef: 'DS-005', dealAddress: '3 Marina View',
    lastContact: 'Today', notes: 'Retirement move. Deal verbally agreed at £290k. Solicitors instructed.',
    chaseDate: null,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fCurrency(v: number | null): string {
  if (v === null) return '—'
  return '£' + Math.round(v).toLocaleString('en-GB')
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email.slice(0, 2).toUpperCase() : '??'
}

const MOT_LABEL: Record<Motivation, string> = { hot: 'Motivated', warm: 'Flexible', cool: 'Firm' }
const MOT_DOT:   Record<Motivation, string> = { hot: '#ef4444', warm: '#f59e0b', cool: '#9ca3af' }
const STATUS_LABEL: Record<SellerStatus, string> = {
  negot: 'Negotiating', active: 'Viewing booked', agreed: 'Deal agreed', lost: 'Lost',
}
const STATUS_DOT: Record<SellerStatus, string> = {
  negot: '#f59e0b', active: '#3b82f6', agreed: '#10b981', lost: '#9ca3af',
}
const CHAIN_LABEL: Record<ChainStatus, string> = { none: 'No chain', short: 'Short chain', in: 'In chain' }
const CHAIN_DOT: Record<ChainStatus, string>   = { none: '#10b981', short: '#f59e0b', in: '#9ca3af' }

// ─── Sub-components ───────────────────────────────────────────────────────────
function DotPill({ dot, label }: { dot: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: TEXT_1, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function ChaseFlag({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
      background: '#fef9ee', color: '#92400e', border: '.5px solid #fde68a',
      marginTop: '4px', whiteSpace: 'nowrap',
    }}>
      🔔 {label}
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SellersCrmPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [sellers] = useState<Seller[]>(INITIAL_SELLERS)
  const [filterMot, setFilterMot]       = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDeal, setFilterDeal]     = useState<string>('all')
  const [search, setSearch]             = useState('')
  const [sortCol, setSortCol]           = useState<number>(-1)
  const [sortDir, setSortDir]           = useState<1 | -1>(1)
  const [expDismissed, setExpDismissed] = useState(false)
  const [toast, setToast]               = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [avatarOpen, setAvatarOpen]     = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

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
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }

  function exportCsv() {
    const headers = ['Name', 'Phone', 'Email', 'Motivation', 'Asking Price', 'Current Offer', 'Chain Status', 'Agent', 'Agency', 'Status', 'Deal Ref', 'Last Contact', 'Notes']
    const rows = [headers, ...filtered.map(s => [
      s.name, s.phone, s.email ?? '', MOT_LABEL[s.motivation],
      s.askingPrice ? `£${s.askingPrice}` : '',
      s.currentOffer ? `£${s.currentOffer}` : '',
      CHAIN_LABEL[s.chainStatus], s.agentName, s.agentAgency,
      STATUS_LABEL[s.status], s.dealRef ?? '', s.lastContact, s.notes,
    ])]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'sellers_crm.csv'
    a.click()
    showToast(`Exported ${filtered.length} sellers as CSV`)
  }

  const filtered = useMemo(() => {
    let list = sellers
    if (filterMot !== 'all')    list = list.filter(s => s.motivation === filterMot)
    if (filterStatus !== 'all') list = list.filter(s => s.status === filterStatus)
    if (filterDeal !== 'all')   list = list.filter(s => s.dealRef === filterDeal)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.dealAddress ?? '').toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q)
      )
    }
    return list
  }, [sellers, filterMot, filterStatus, filterDeal, search])

  const sorted = useMemo(() => {
    if (sortCol < 0) return filtered
    return [...filtered].sort((a, b) => {
      const vals = (s: Seller): string[] => [
        s.name, s.phone, MOT_LABEL[s.motivation], fCurrency(s.askingPrice),
        fCurrency(s.currentOffer), CHAIN_LABEL[s.chainStatus],
        s.agentName, STATUS_LABEL[s.status], s.dealRef ?? '',
        s.lastContact, s.notes,
      ]
      const av = vals(a)[sortCol] ?? ''
      const bv = vals(b)[sortCol] ?? ''
      return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' }) * sortDir
    })
  }, [filtered, sortCol, sortDir])

  const filtersActive = filterMot !== 'all' || filterStatus !== 'all' || filterDeal !== 'all' || search !== ''

  function onSortCol(col: number) {
    if (sortCol === col) { setSortDir(d => d === 1 ? -1 : 1) }
    else { setSortCol(col); setSortDir(1) }
  }

  // ─── Shared style presets ──────────────────────────────────────────────────
  const thBase: React.CSSProperties = {
    background: BG_SEC, padding: '9px 13px', fontSize: '10px', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '.06em', color: '#aaa',
    borderBottom: `.5px solid ${DS_BORDER}`, borderRight: `.5px solid ${DS_BORDER}`,
    textAlign: 'left', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
  }
  const tdBase: React.CSSProperties = {
    padding: '11px 13px', fontSize: '12px',
    borderBottom: `.5px solid ${DS_BORDER}`, borderRight: `.5px solid ${DS_BORDER}`,
    verticalAlign: 'middle', background: '#fff',
  }
  const selStyle: React.CSSProperties = {
    padding: '5px 8px', border: `.5px solid ${DS_BORDER}`, borderRadius: '7px',
    fontSize: '11px', background: '#fff', color: '#666', outline: 'none', fontFamily: 'inherit',
  }
  const hnBase: React.CSSProperties = {
    fontSize: '12px', fontWeight: 500, padding: '5px 13px', borderRadius: '7px',
    background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all .12s',
  }
  const hnOn: React.CSSProperties = { ...hnBase, background: 'rgba(255,255,255,.14)', color: '#fff' }

  function ThSort({ col, label, style }: { col: number; label: string; style?: React.CSSProperties }) {
    const isActive = sortCol === col
    return (
      <th onClick={() => onSortCol(col)} style={{ ...thBase, ...style }}>
        {label}{isActive ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_BODY, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", fontSize: '13px', color: TEXT_1 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        height: `${HDR_H}px`, backgroundColor: NAVY_DARK,
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 220, boxSizing: 'border-box',
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-.01em', fontFamily: 'inherit', padding: 0 }}>
            Deal<span style={{ color: TEAL }}>Score</span>
          </button>
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', margin: '0 6px', flexShrink: 0 }} />
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[
              { label: 'Deals',    path: '/dashboard' },
              { label: 'Pipeline', path: '/dashboard' },
              { label: 'Compare',  path: '/dashboard' },
            ].map((item, i, arr) => (
              <span key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
                <button onClick={() => navigate(item.path)} style={hnBase}>{item.label}</button>
                {i < arr.length - 1 && <div style={{ width: '.5px', height: '14px', background: 'rgba(255,255,255,.12)', margin: '0 4px', flexShrink: 0 }} />}
              </span>
            ))}
          </nav>
        </div>

        {/* Centre: search */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.12)',
            borderRadius: '7px', padding: '0 10px', height: '28px',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.35)' }}>🔍</span>
            <input
              placeholder="Search deals, sellers, addresses…"
              style={{ background: 'none', border: 'none', outline: 'none', fontSize: '11px', color: '#fff', fontFamily: 'inherit', width: '150px' }}
            />
            <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,.25)', background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.12)', borderRadius: '4px', padding: '1px 5px' }}>⌘K</span>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Seller / Investors toggle */}
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button style={hnOn}>Seller</button>
            <div style={{ width: '.5px', height: '14px', background: 'rgba(255,255,255,.12)', margin: '0 4px', flexShrink: 0 }} />
            <button onClick={() => navigate('/investors-crm')} style={hnBase}>Investors</button>
          </nav>
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />

          {/* New deal */}
          <button
            onClick={() => navigate('/deal/new')}
            style={{ background: TEAL, border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
          >
            + New deal
          </button>
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />

          {/* Avatar */}
          <div ref={avatarRef} style={{ position: 'relative' }}>
            <button onClick={() => setAvatarOpen(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,.16)', border: '.5px solid rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#fff', flexShrink: 0 }}>
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
                  {[
                    { label: 'Profile',   fn: () => { setAvatarOpen(false); navigate('/profile') } },
                    { label: 'Dashboard', fn: () => { setAvatarOpen(false); navigate('/dashboard') } },
                  ].map(item => (
                    <button key={item.label} onClick={item.fn} style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', fontSize: '12px', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: `.5px solid ${DS_BORDER}` }}>
                  <button onClick={async () => { setAvatarOpen(false); await signOut(); navigate('/login') }} style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', fontSize: '12px', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 24px 14px', background: '#fff', borderBottom: `.5px solid ${DS_BORDER}` }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 500, color: NAVY, marginBottom: '3px' }}>Seller CRM</div>
          <div style={{ fontSize: '13px', color: '#aaa' }}>{sellers.length} sellers · {sellers.filter(s => s.motivation === 'hot').length} motivated · {sellers.filter(s => s.chaseDate).length} flagged to chase</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportCsv} style={{ background: BG_SEC, color: NAVY, border: `.5px solid ${DS_BORDER}`, padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ↓ Export
          </button>
          <button onClick={() => showToast('Import — opens a CSV/contact-list mapper')} style={{ background: BG_SEC, color: NAVY, border: `.5px solid ${DS_BORDER}`, padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ↑ Import
          </button>
          <button onClick={() => showToast('Add seller — opens the new-seller form')} style={{ background: NAVY, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
            + Add seller
          </button>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', padding: '9px 24px', background: '#fff', borderBottom: `.5px solid ${DS_BORDER}`, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterMot} onChange={e => setFilterMot(e.target.value)} style={selStyle}>
          <option value="all">All motivation</option>
          <option value="hot">Motivated</option>
          <option value="warm">Flexible</option>
          <option value="cool">Firm</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="all">All statuses</option>
          <option value="negot">Negotiating</option>
          <option value="active">Viewing booked</option>
          <option value="agreed">Deal agreed</option>
          <option value="lost">Lost</option>
        </select>
        <select value={filterDeal} onChange={e => setFilterDeal(e.target.value)} style={selStyle}>
          <option value="all">All deals</option>
          <option value="DS-001">DS-001 · Horwood Close</option>
          <option value="DS-002">DS-002 · Victoria Street</option>
          <option value="DS-003">DS-003 · Park Lane</option>
          <option value="DS-004">DS-004 · Oak Road</option>
          <option value="DS-005">DS-005 · Marina View</option>
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sellers, addresses..."
          style={{ padding: '5px 10px', border: `.5px solid ${DS_BORDER}`, borderRadius: '7px', fontSize: '11px', background: '#fff', outline: 'none', width: '180px', fontFamily: 'inherit' }}
        />
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 0 40px' }}>

        {/* Explainer card */}
        {!expDismissed && (
          <div style={{ padding: '14px 24px 0' }}>
            <div style={{ position: 'relative', background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '16px 18px', marginBottom: '0', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <button onClick={() => setExpDismissed(true)} style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '4px' }}>×</button>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eef3fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📋</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>Sellers sync automatically from your deals</div>
                <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.7 }}>
                  Sellers are auto-linked from the <strong style={{ color: TEXT_1 }}>Seller tab</strong> on each deal — adding or editing seller details there automatically updates or creates their record here.{' '}
                  <strong style={{ color: TEXT_1 }}>Motivation level</strong>, asking price, and chain status feed into the{' '}
                  <strong style={{ color: TEXT_1 }}>Deal Optimiser</strong> when seller data is active.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 0', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: TEXT_2 }}>
            {filtersActive ? `${sorted.length} of ${sellers.length} sellers` : `${sellers.length} sellers`}
          </span>
          {filtersActive && (
            <button
              onClick={() => { setFilterMot('all'); setFilterStatus('all'); setFilterDeal('all'); setSearch('') }}
              style={{ fontSize: '11px', color: NAVY, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '12px', margin: '12px 24px 0', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1100px' }}>
              <thead>
                <tr>
                  <ThSort col={0} label="Seller"        style={{ ...thBase, width: '160px' }} />
                  <th style={{ ...thBase, width: '180px', cursor: 'default' }}>Contact</th>
                  <ThSort col={2} label="Motivation"    style={{ ...thBase, width: '120px' }} />
                  <ThSort col={3} label="Asking price"  style={{ ...thBase, width: '110px' }} />
                  <ThSort col={4} label="Current offer" style={{ ...thBase, width: '110px' }} />
                  <ThSort col={5} label="Chain status"  style={{ ...thBase, width: '130px' }} />
                  <ThSort col={6} label="Agent"         style={{ ...thBase, width: '130px' }} />
                  <ThSort col={7} label="Status"        style={{ ...thBase, width: '110px' }} />
                  <ThSort col={8} label="Linked deal"   style={{ ...thBase, width: '130px' }} />
                  <ThSort col={9} label="Last contact"  style={{ ...thBase, width: '100px' }} />
                  <th style={{ ...thBase, cursor: 'default' }}>Notes</th>
                  <th style={{ ...thBase, width: '80px', cursor: 'default', borderRight: 'none' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ ...tdBase, textAlign: 'center', padding: '32px', color: TEXT_2, borderRight: 'none', borderBottom: 'none' }}>
                      No sellers match the current filters
                    </td>
                  </tr>
                ) : sorted.map((s, idx) => {
                  const isChase = !!s.chaseDate
                  const isLast  = idx === sorted.length - 1
                  const rowBg   = isChase ? 'rgba(245,158,11,.03)' : '#fff'
                  const tdStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
                    ...tdBase,
                    background: rowBg,
                    borderBottom: isLast ? 'none' : `.5px solid ${DS_BORDER}`,
                    ...extra,
                  })
                  return (
                    <tr
                      key={s.id}
                      style={{ cursor: 'default' }}
                      onMouseEnter={e => { const tds = (e.currentTarget as HTMLTableRowElement).querySelectorAll('td'); tds.forEach((td: Element) => ((td as HTMLElement).style.background = isChase ? 'rgba(245,158,11,.07)' : '#f9fafb')) }}
                      onMouseLeave={e => { const tds = (e.currentTarget as HTMLTableRowElement).querySelectorAll('td'); tds.forEach((td: Element) => ((td as HTMLElement).style.background = rowBg)) }}
                    >
                      {/* Seller name + chase flag */}
                      <td style={tdStyle()}>
                        <div style={{ fontWeight: 500, color: NAVY, marginBottom: isChase ? '4px' : 0 }}>{s.name}</div>
                        {isChase && <ChaseFlag label={s.chaseDate!} />}
                      </td>
                      {/* Contact */}
                      <td style={tdStyle({ color: '#888' })}>
                        {s.phone}
                        {s.email ? (
                          <><br /><span style={{ color: NAVY }}>{s.email}</span></>
                        ) : (
                          <><br /><span style={{ color: '#aaa', fontStyle: 'italic' }}>Not provided</span></>
                        )}
                      </td>
                      {/* Motivation */}
                      <td style={tdStyle()}>
                        <DotPill dot={MOT_DOT[s.motivation]} label={MOT_LABEL[s.motivation]} />
                      </td>
                      {/* Asking price */}
                      <td style={tdStyle({ fontWeight: 500, color: NAVY })}>
                        {fCurrency(s.askingPrice)}
                      </td>
                      {/* Current offer */}
                      <td style={tdStyle()}>
                        {s.currentOffer
                          ? <span style={{ color: '#10B981', fontWeight: 500 }}>{fCurrency(s.currentOffer)}</span>
                          : <span style={{ color: '#aaa', fontSize: '11px' }}>No offer yet</span>
                        }
                      </td>
                      {/* Chain status */}
                      <td style={tdStyle()}>
                        <DotPill dot={CHAIN_DOT[s.chainStatus]} label={CHAIN_LABEL[s.chainStatus]} />
                      </td>
                      {/* Agent */}
                      <td style={tdStyle({ fontSize: '11px', color: '#555' })}>
                        {s.agentName}<br />
                        <span style={{ color: '#888' }}>{s.agentAgency}</span>
                      </td>
                      {/* Status */}
                      <td style={tdStyle()}>
                        <DotPill dot={STATUS_DOT[s.status]} label={STATUS_LABEL[s.status]} />
                      </td>
                      {/* Linked deal */}
                      <td style={tdStyle()}>
                        {s.dealRef ? (
                          <>
                            <a
                              onClick={e => { e.preventDefault(); showToast(`Opening deal ${s.dealRef}`) }}
                              href="#"
                              style={{ fontSize: '12px', color: NAVY, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              🏢 {s.dealRef}
                            </a>
                            {s.dealAddress && <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>{s.dealAddress}</div>}
                          </>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#aaa' }}>— unlinked —</span>
                        )}
                      </td>
                      {/* Last contact */}
                      <td style={tdStyle({ fontSize: '11px', color: '#888' })}>{s.lastContact}</td>
                      {/* Notes */}
                      <td style={tdStyle({ fontSize: '11px', color: '#555', maxWidth: '160px' })}>{s.notes}</td>
                      {/* Actions */}
                      <td style={tdStyle({ borderRight: 'none' })}>
                        <button
                          onClick={() => showToast(`Edit ${s.name} — opens the seller record`)}
                          style={{ fontSize: '11px', fontWeight: 500, padding: '4px 9px', borderRadius: '7px', cursor: 'pointer', border: `.5px solid ${DS_BORDER}`, fontFamily: 'inherit', background: BG_SEC, color: '#555' }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = NAVY; (e.target as HTMLElement).style.color = NAVY }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = DS_BORDER; (e.target as HTMLElement).style.color = '#555' }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        background: NAVY, color: '#fff', fontSize: '12px', fontWeight: 500,
        padding: '10px 18px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.18)',
        opacity: toast ? 1 : 0, pointerEvents: 'none', transition: 'opacity .25s', zIndex: 500,
        whiteSpace: 'nowrap',
      }}>
        {toast}
      </div>
    </div>
  )
}
