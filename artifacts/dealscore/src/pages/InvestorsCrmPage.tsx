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
type InvType   = 'committed' | 'openmkt'
type TrustLevel = 'full' | 'protected'
type InvStatus = 'sourcing' | 'searching' | 'found' | 'shared' | 'reserved' | 'complete' | 'ready' | 'live' | 'packsent'

interface Investor {
  id: string
  name: string
  phone: string
  email: string | null
  type: InvType
  trust: TrustLevel
  trustOverridden: boolean
  criteria: string
  status: InvStatus
  dealRef: string | null
  dealAddress: string | null
  mixedWarn: boolean
  lastContact: string
  notes: string
  chaseDate: string | null
}

// ─── Sample data (matches mockup) ─────────────────────────────────────────────
const INITIAL_INVESTORS: Investor[] = [
  {
    id: 'i1', name: 'Robert Chen', phone: '07700 901111', email: 'r.chen@brightfield-cap.com',
    type: 'committed', trust: 'full', trustOverridden: false,
    criteria: '2-bed flats, North-West, £150–220k, BMV 15%+',
    status: 'searching', dealRef: 'DS-001', dealAddress: '65a Horwood Close',
    mixedWarn: false, lastContact: 'Yesterday',
    notes: 'Deposit received. Wants weekly update calls — very engaged, fast decision-maker.',
    chaseDate: 'Chase today',
  },
  {
    id: 'i2', name: 'Amara Okonkwo', phone: '07700 902222', email: 'amara.o@outlook.com',
    type: 'committed', trust: 'full', trustOverridden: false,
    criteria: '3-bed semis, Midlands, £180–260k, HMO potential',
    status: 'found', dealRef: 'DS-002', dealAddress: '12 Victoria Street',
    mixedWarn: false, lastContact: '3 days ago',
    notes: 'Match shortlisted — pending her sign-off before pack is shared.',
    chaseDate: null,
  },
  {
    id: 'i3', name: 'James Whitfield', phone: '07700 903333', email: 'j.whitfield@gmail.com',
    type: 'openmkt', trust: 'protected', trustOverridden: false,
    criteria: 'Any BTL, Yorkshire, up to £200k, 7%+ yield',
    status: 'live', dealRef: 'DS-003', dealAddress: null,
    mixedWarn: false, lastContact: '1 week ago',
    notes: 'First-time investor via the open-market listing. Address withheld until reservation.',
    chaseDate: null,
  },
  {
    id: 'i4', name: 'Priya Sharma', phone: '07700 904444', email: 'priya.sharma@proton.me',
    type: 'openmkt', trust: 'full', trustOverridden: true,
    criteria: '2-bed apartments, London zones 3–5, £300–400k',
    status: 'packsent', dealRef: 'DS-004', dealAddress: '22 Oak Road',
    mixedWarn: false, lastContact: '2 weeks ago',
    notes: 'Repeat investor — sourcer manually upgraded trust to full after two completed deals.',
    chaseDate: 'Chase Thu',
  },
  {
    id: 'i5', name: 'Tom Bradley', phone: '07700 905555', email: 'tom.bradley@bradleyholdings.co.uk',
    type: 'committed', trust: 'full', trustOverridden: false,
    criteria: 'Portfolio buyer — 3+ units, anywhere, cash purchase',
    status: 'reserved', dealRef: 'DS-005', dealAddress: '3 Marina View',
    mixedWarn: false, lastContact: 'Today',
    notes: 'Reservation agreement signed — Day 6 of cooling-off. Solicitors instructed both sides.',
    chaseDate: null,
  },
  {
    id: 'i6', name: 'Helen Marsh', phone: '07700 906666', email: null,
    type: 'openmkt', trust: 'protected', trustOverridden: false,
    criteria: 'Studio/1-bed, university towns, sub-£120k',
    status: 'ready', dealRef: null, dealAddress: null,
    mixedWarn: false, lastContact: '3 weeks ago',
    notes: 'Onboarded via referral. Criteria confirmed — awaiting first match.',
    chaseDate: null,
  },
  {
    id: 'i7', name: 'David Okafor', phone: '07700 907777', email: 'd.okafor@icloud.com',
    type: 'committed', trust: 'full', trustOverridden: false,
    criteria: 'New-build flats, South-East, £220–280k',
    status: 'sourcing', dealRef: null, dealAddress: null,
    mixedWarn: false, lastContact: '1 month ago',
    notes: 'Just signed up. Deposit confirmed — added to the matching queue.',
    chaseDate: null,
  },
  {
    id: 'i8', name: 'Lucy Fenwick', phone: '07700 908888', email: 'lucy.fenwick@hotmail.co.uk',
    type: 'openmkt', trust: 'protected', trustOverridden: false,
    criteria: 'Terraces, North-East, sub-£100k, cash only',
    status: 'complete', dealRef: 'DS-006', dealAddress: '41 Brook Terrace',
    mixedWarn: false, lastContact: '2 months ago',
    notes: 'Completed in April. Asked to be notified of similar stock — good repeat candidate.',
    chaseDate: null,
  },
  {
    id: 'i9', name: 'Marcus Webb', phone: '07700 909999', email: 'marcus@webbproperty.io',
    type: 'committed', trust: 'full', trustOverridden: false,
    criteria: 'Mixed-use, anywhere, £400k+, value-add angle',
    status: 'shared', dealRef: 'DS-001', dealAddress: '65a Horwood Close',
    mixedWarn: true, lastContact: '5 days ago',
    notes: 'Shared alongside Robert Chen on the same deal — flagged so the sourcer manages both journeys carefully.',
    chaseDate: null,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email ? email.slice(0, 2).toUpperCase() : '??'
}

const TYPE_LABEL: Record<InvType, string>     = { committed: 'Committed', openmkt: 'Open market' }
const TYPE_DOT:   Record<InvType, string>     = { committed: NAVY, openmkt: '#8b5cf6' }
const TRUST_LABEL: Record<TrustLevel, string> = { full: 'Full trust', protected: 'Protected' }
const TRUST_DOT:   Record<TrustLevel, string> = { full: '#9ca3af', protected: '#f59e0b' }
const STATUS_LABEL: Record<InvStatus, string> = {
  sourcing: 'Sourcing', searching: 'Searching', found: 'Deal found', shared: 'Shared',
  reserved: 'Reserved', complete: 'Complete', ready: 'Ready', live: 'Live', packsent: 'Pack sent',
}
const STATUS_DOT: Record<InvStatus, string> = {
  sourcing: '#9ca3af', searching: '#3b82f6', found: '#f59e0b', shared: '#3b82f6',
  reserved: '#f59e0b', complete: '#10b981', ready: '#10b981', live: NAVY, packsent: '#8b5cf6',
}

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
export default function InvestorsCrmPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [investors] = useState<Investor[]>(INITIAL_INVESTORS)
  const [filterType, setFilterType]     = useState<string>('all')
  const [filterTrust, setFilterTrust]   = useState<string>('all')
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
    const headers = ['Name', 'Phone', 'Email', 'Type', 'Trust', 'Trust Overridden', 'Criteria', 'Status', 'Deal Ref', 'Last Contact', 'Notes']
    const rows = [headers, ...filtered.map(inv => [
      inv.name, inv.phone, inv.email ?? '', TYPE_LABEL[inv.type],
      TRUST_LABEL[inv.trust], inv.trustOverridden ? 'Yes' : 'No',
      inv.criteria, STATUS_LABEL[inv.status],
      inv.dealRef ?? '', inv.lastContact, inv.notes,
    ])]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'investors_crm.csv'
    a.click()
    showToast(`Exported ${filtered.length} investors as CSV`)
  }

  const filtered = useMemo(() => {
    let list = investors
    if (filterType   !== 'all') list = list.filter(inv => inv.type === filterType)
    if (filterTrust  !== 'all') list = list.filter(inv => inv.trust === filterTrust)
    if (filterStatus !== 'all') list = list.filter(inv => inv.status === filterStatus)
    if (filterDeal   !== 'all') list = list.filter(inv => inv.dealRef === filterDeal)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(inv =>
        inv.name.toLowerCase().includes(q) ||
        (inv.email ?? '').toLowerCase().includes(q) ||
        inv.phone.includes(q) ||
        inv.criteria.toLowerCase().includes(q) ||
        inv.notes.toLowerCase().includes(q)
      )
    }
    return list
  }, [investors, filterType, filterTrust, filterStatus, filterDeal, search])

  const sorted = useMemo(() => {
    if (sortCol < 0) return filtered
    return [...filtered].sort((a, b) => {
      const vals = (inv: Investor): string[] => [
        inv.name, inv.phone, TYPE_LABEL[inv.type], TRUST_LABEL[inv.trust],
        inv.criteria, STATUS_LABEL[inv.status], inv.dealRef ?? '',
        inv.lastContact, inv.notes,
      ]
      const av = vals(a)[sortCol] ?? ''
      const bv = vals(b)[sortCol] ?? ''
      return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' }) * sortDir
    })
  }, [filtered, sortCol, sortDir])

  const filtersActive = filterType !== 'all' || filterTrust !== 'all' || filterStatus !== 'all' || filterDeal !== 'all' || search !== ''

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

  const committedCount = investors.filter(i => i.type === 'committed').length
  const openmktCount   = investors.filter(i => i.type === 'openmkt').length

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
              placeholder="Search deals, investors, addresses…"
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
            <button onClick={() => navigate('/sellers-crm')} style={hnBase}>Seller</button>
            <div style={{ width: '.5px', height: '14px', background: 'rgba(255,255,255,.12)', margin: '0 4px', flexShrink: 0 }} />
            <button style={hnOn}>Investors</button>
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
          <div style={{ fontSize: '18px', fontWeight: 500, color: NAVY, marginBottom: '3px' }}>Investor CRM</div>
          <div style={{ fontSize: '13px', color: '#aaa' }}>{investors.length} investors · {committedCount} committed · {openmktCount} open market</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportCsv} style={{ background: BG_SEC, color: NAVY, border: `.5px solid ${DS_BORDER}`, padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ↓ Export
          </button>
          <button onClick={() => showToast('Import — opens a CSV/contact-list mapper')} style={{ background: BG_SEC, color: NAVY, border: `.5px solid ${DS_BORDER}`, padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ↑ Import
          </button>
          <button onClick={() => showToast('Add investor — opens the new-investor form')} style={{ background: NAVY, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
            + Add investor
          </button>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', padding: '9px 24px', background: '#fff', borderBottom: `.5px solid ${DS_BORDER}`, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle}>
          <option value="all">All types</option>
          <option value="committed">Committed</option>
          <option value="openmkt">Open market</option>
        </select>
        <select value={filterTrust} onChange={e => setFilterTrust(e.target.value)} style={selStyle}>
          <option value="all">All trust levels</option>
          <option value="full">Full trust</option>
          <option value="protected">Protected</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="all">All statuses</option>
          <option value="sourcing">Sourcing</option>
          <option value="searching">Searching</option>
          <option value="ready">Ready</option>
          <option value="found">Deal found</option>
          <option value="live">Live</option>
          <option value="packsent">Pack sent</option>
          <option value="shared">Shared</option>
          <option value="reserved">Reserved</option>
          <option value="complete">Complete</option>
        </select>
        <select value={filterDeal} onChange={e => setFilterDeal(e.target.value)} style={selStyle}>
          <option value="all">All deals</option>
          <option value="DS-001">DS-001 · Horwood Close</option>
          <option value="DS-002">DS-002 · Victoria Street</option>
          <option value="DS-003">DS-003 · Park Lane</option>
          <option value="DS-004">DS-004 · Oak Road</option>
          <option value="DS-005">DS-005 · Marina View</option>
          <option value="DS-006">DS-006 · Brook Terrace</option>
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search investors, criteria..."
          style={{ padding: '5px 10px', border: `.5px solid ${DS_BORDER}`, borderRadius: '7px', fontSize: '11px', background: '#fff', outline: 'none', width: '180px', fontFamily: 'inherit' }}
        />
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 0 40px' }}>

        {/* Explainer card */}
        {!expDismissed && (
          <div style={{ padding: '14px 24px 0' }}>
            <div style={{ position: 'relative', background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <button onClick={() => setExpDismissed(true)} style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '4px' }}>×</button>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eef3fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👥</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>Investors sync automatically from your deals</div>
                <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.7 }}>
                  Investors are auto-linked from the <strong style={{ color: TEXT_1 }}>Investors tab</strong> on each deal.{' '}
                  <strong style={{ color: TEXT_1 }}>Committed</strong> investors get full address access via the Recommendation Engine;{' '}
                  <strong style={{ color: TEXT_1 }}>Open market</strong> investors see a protected share link with the address withheld until reservation.
                  Trust level is set automatically but can be overridden per investor.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 0', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: TEXT_2 }}>
            {filtersActive ? `${sorted.length} of ${investors.length} investors` : `${investors.length} investors`}
          </span>
          {filtersActive && (
            <button
              onClick={() => { setFilterType('all'); setFilterTrust('all'); setFilterStatus('all'); setFilterDeal('all'); setSearch('') }}
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
                  <ThSort col={0} label="Investor"            style={{ ...thBase, width: '160px' }} />
                  <th style={{ ...thBase, width: '170px', cursor: 'default' }}>Contact</th>
                  <ThSort col={2} label="Type"                style={{ ...thBase, width: '120px' }} />
                  <ThSort col={3} label="Trust level"         style={{ ...thBase, width: '120px' }} />
                  <th style={{ ...thBase, width: '150px', cursor: 'default' }}>Investment criteria</th>
                  <ThSort col={5} label="Status"              style={{ ...thBase, width: '130px' }} />
                  <ThSort col={6} label="Linked deal"         style={{ ...thBase, width: '140px' }} />
                  <ThSort col={7} label="Last contact"        style={{ ...thBase, width: '100px' }} />
                  <th style={{ ...thBase, cursor: 'default' }}>Notes</th>
                  <th style={{ ...thBase, width: '80px', cursor: 'default', borderRight: 'none' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ ...tdBase, textAlign: 'center', padding: '32px', color: TEXT_2, borderRight: 'none', borderBottom: 'none' }}>
                      No investors match the current filters
                    </td>
                  </tr>
                ) : sorted.map((inv, idx) => {
                  const isChase = !!inv.chaseDate
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
                      key={inv.id}
                      onMouseEnter={e => { const tds = (e.currentTarget as HTMLTableRowElement).querySelectorAll('td'); tds.forEach((td: Element) => ((td as HTMLElement).style.background = isChase ? 'rgba(245,158,11,.07)' : '#f9fafb')) }}
                      onMouseLeave={e => { const tds = (e.currentTarget as HTMLTableRowElement).querySelectorAll('td'); tds.forEach((td: Element) => ((td as HTMLElement).style.background = rowBg)) }}
                    >
                      {/* Investor name + chase */}
                      <td style={tdStyle()}>
                        <div style={{ fontWeight: 500, color: NAVY, marginBottom: isChase ? '4px' : 0 }}>{inv.name}</div>
                        {isChase && <ChaseFlag label={inv.chaseDate!} />}
                      </td>
                      {/* Contact */}
                      <td style={tdStyle({ color: '#888' })}>
                        {inv.phone}
                        {inv.email ? (
                          <><br /><span style={{ color: NAVY }}>{inv.email}</span></>
                        ) : (
                          <><br /><span style={{ color: '#aaa', fontStyle: 'italic' }}>Not provided</span></>
                        )}
                      </td>
                      {/* Type */}
                      <td style={tdStyle()}>
                        <DotPill dot={TYPE_DOT[inv.type]} label={TYPE_LABEL[inv.type]} />
                      </td>
                      {/* Trust level */}
                      <td style={tdStyle()}>
                        <DotPill dot={TRUST_DOT[inv.trust]} label={TRUST_LABEL[inv.trust]} />
                        {inv.trustOverridden && (
                          <div style={{ fontSize: '9px', color: '#bbb', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            ✏️ Manually overridden
                          </div>
                        )}
                      </td>
                      {/* Investment criteria */}
                      <td style={tdStyle({ fontSize: '11px', color: '#555' })}>{inv.criteria}</td>
                      {/* Status */}
                      <td style={tdStyle()}>
                        <DotPill dot={STATUS_DOT[inv.status]} label={STATUS_LABEL[inv.status]} />
                      </td>
                      {/* Linked deal */}
                      <td style={tdStyle()}>
                        {inv.dealRef ? (
                          <>
                            <a
                              onClick={e => { e.preventDefault(); showToast(`Opening deal ${inv.dealRef}`) }}
                              href="#"
                              style={{ fontSize: '12px', color: NAVY, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              🏢 {inv.dealRef}
                            </a>
                            {inv.dealAddress ? (
                              <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>{inv.dealAddress}</div>
                            ) : inv.trust === 'protected' ? (
                              <div style={{ fontSize: '10px', marginTop: '2px' }}>
                                <span style={{ color: '#aaa' }}>(</span>
                                <span style={{ color: '#D97706' }}>address hidden</span>
                                <span style={{ color: '#aaa' }}>)</span>
                              </div>
                            ) : null}
                            {inv.mixedWarn && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, color: '#92400e', background: '#fef9ee', border: '.5px solid #fde68a', borderRadius: '20px', padding: '2px 8px', marginTop: '4px' }}>
                                ⚠️ Mixed types on deal
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#aaa' }}>— unmatched —</span>
                        )}
                      </td>
                      {/* Last contact */}
                      <td style={tdStyle({ fontSize: '11px', color: '#888' })}>{inv.lastContact}</td>
                      {/* Notes */}
                      <td style={tdStyle({ fontSize: '11px', color: '#555', maxWidth: '160px' })}>{inv.notes}</td>
                      {/* Actions */}
                      <td style={tdStyle({ borderRight: 'none' })}>
                        <button
                          onClick={() => showToast(`Edit ${inv.name} — opens the investor record`)}
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
