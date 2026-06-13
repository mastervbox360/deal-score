import { useState, useEffect, useRef, useId } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Deal, DealStatus } from '../lib/database.types'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
export type TabKey = 'overview' | 'analysis' | 'content' | 'seller' | 'investors' | 'fees'

interface Note {
  id: string
  text: string
  author: string
  ts: Date
}

interface LbItem {
  label: string
  value: string
  highlight?: boolean
}

export interface DealChromeProps {
  deal: Deal
  children: React.ReactNode
  analysisView?: string
  contentType?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const HDR_H     = 56
const ISTRIP_H  = 48
const LIVEBAR_H = 44

const TAB_LABELS: Record<TabKey, string> = {
  overview:  'Overview',
  analysis:  'Analysis',
  content:   'Content',
  seller:    'Seller',
  investors: 'Investors',
  fees:      'Fees & invoice',
}

const STATUS_LABELS: Record<DealStatus, string> = {
  analysing:  'Sourcing',
  reviewing:  'Ready',
  presenting: 'Pack sent',
  closed:     'Complete',
  dead:       'Withdrawn',
}

const STATUS_CSS: Record<DealStatus, string> = {
  analysing:  'sourcing',
  reviewing:  'ready',
  presenting: 'pack-sent',
  closed:     'complete',
  dead:       'withdrawn',
}

const VALID_TABS: TabKey[] = ['overview', 'analysis', 'content', 'seller', 'investors', 'fees']

const STRATEGY_LABELS: Record<string, string> = {
  BTL:      'Buy to Let',
  HMO:      'House in Multiple Occupation',
  FLIP:     'Flip',
  SA:       'Serviced Accommodation',
  BRRR:     'BRRR',
  R2R:      'Rent to Rent',
  R2HMO:   'Rent to HMO',
  R2SA:    'Rent to SA',
  SOCIAL:   'Social Housing',
  BRRHMO:  'BRR to HMO',
  BRRSA:   'BRR to SA',
  LEASE:    'Lease Option',
  ASSISTED: 'Assisted Sale',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fCurrency(v: number | null): string {
  if (v === null) return '—'
  return '£' + Math.round(v).toLocaleString('en-GB')
}

function fPct(v: number | null): string {
  if (v === null) return '—'
  return v.toFixed(1) + '%'
}

function fDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function relTime(d: Date): string {
  const diff = Date.now() - d.getTime()
  if (diff < 60_000)    return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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

function parseTab(raw: string | null): TabKey {
  if (raw && (VALID_TABS as string[]).includes(raw)) return raw as TabKey
  return 'overview'
}

function getLbItems(deal: Deal, tab: TabKey, contentType: string): LbItem[] {
  switch (tab) {
    case 'overview':
      return [
        { label: 'Stage',       value: STATUS_LABELS[deal.status] },
        { label: 'Deal score',  value: deal.deal_score ?? 'No score', highlight: !!deal.deal_score },
        { label: 'Monthly CF',  value: fCurrency(deal.cash_flow), highlight: true },
        { label: 'Gross yield', value: fPct(deal.gross_yield) },
        { label: 'CoC ROI',     value: fPct(deal.coc_roi) },
      ]
    case 'analysis':
      return [
        { label: 'Purchase price', value: fCurrency(deal.purchase_price) },
        { label: 'Monthly CF',     value: fCurrency(deal.cash_flow), highlight: true },
        { label: 'CoC ROI',        value: fPct(deal.coc_roi) },
        { label: 'Gross yield',    value: fPct(deal.gross_yield), highlight: true },
        { label: 'Deal score',     value: deal.deal_score ?? 'No score' },
      ]
    case 'content': {
      const totalAssets = 9
      const readyCount = [
        deal.address, deal.purchase_price, deal.market_value,
        deal.cash_flow, deal.gross_yield, deal.coc_roi,
        deal.deal_score, deal.packs_generated > 0 || null,
        deal.strategy,
      ].filter(Boolean).length
      const missing: string[] = []
      if (!deal.purchase_price) missing.push('purchase price')
      if (!deal.cash_flow)      missing.push('cash flow')
      if (!deal.deal_score)     missing.push('deal score')
      return [
        { label: 'Pack readiness', value: `${readyCount}/${totalAssets} assets ready`, highlight: readyCount >= 7 },
        { label: 'Creating',       value: ({
          advert:    'Advert / listing copy',
          onepager:  'One-pager',
          privacy:   'Investor pack · privacy mode',
          full:      'Investor pack · full view',
        } as Record<string, string>)[contentType ?? ''] ?? (contentType ?? '—') },
        { label: 'Last export',    value: deal.packs_generated > 0 ? fDate(deal.updated_at) : 'Not exported' },
        { label: 'Still missing',  value: missing.length ? missing.join(', ') : 'Nothing' },
        { label: 'Shared with',    value: deal.packs_generated > 0 ? `${deal.packs_generated} pack${deal.packs_generated !== 1 ? 's' : ''} sent` : '—' },
      ]
    }
    case 'seller':
      return [
        { label: 'Asking price',  value: fCurrency(deal.purchase_price) },
        { label: 'Current offer', value: '—', highlight: true },
        { label: 'Status',        value: STATUS_LABELS[deal.status] },
        { label: 'Waiting on',    value: '—' },
        { label: 'Next step',     value: '—' },
      ]
    case 'investors':
      return [
        { label: 'Funding target', value: '—' },
        { label: 'Pledged',        value: '—', highlight: true },
        { label: 'Investors',      value: '—' },
        { label: 'Sourcing fee',   value: '—' },
        { label: 'Days to close',  value: '—', highlight: true },
      ]
    case 'fees':
      return [
        { label: 'Agreed fee',        value: '—', highlight: true },
        { label: 'Payment status',    value: 'Outstanding' },
        { label: 'Due',               value: 'On completion' },
        { label: 'Investor',          value: '—' },
        { label: 'Days to completion', value: '—', highlight: true },
      ]
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DealChrome({ deal, children, analysisView = 'results', contentType = 'advert' }: DealChromeProps) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const noteInputId = useId()

  const activeTab = parseTab(searchParams.get('tab'))

  function handleTabChange(tab: TabKey) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    }, { replace: true })
  }

  // seller name derived from inputs JSON
  const sellerName = (deal.inputs?.sellerName ?? deal.inputs?.vendorName ?? deal.inputs?.vendor_name ?? null) as string | null

  // investor count
  const [investorCount, setInvestorCount] = useState(0)
  useEffect(() => {
    if (!deal.id) return
    supabase
      .from('deal_investors')
      .select('id', { count: 'exact', head: true })
      .eq('deal_id', deal.id)
      .then(({ count }) => setInvestorCount(count ?? 0))
  }, [deal.id])

  // chrome state
  const [livebarVisible, setLivebarVisible] = useState(true)
  const [privacyMode, setPrivacyMode]       = useState(false)
  const [avatarOpen, setAvatarOpen]         = useState(false)
  const [notesOpen, setNotesOpen]           = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  // notes local state
  const [notes, setNotes]         = useState<Note[]>([])
  const [noteInput, setNoteInput] = useState('')

  // computed tabwrap sticky top (CSS var can't react to livebar toggle)
  const lbH     = livebarVisible ? LIVEBAR_H : 0
  const tabsTop = HDR_H + ISTRIP_H + lbH

  // privacy mode → body class
  useEffect(() => {
    document.body.classList.toggle('privacy', privacyMode)
    return () => { document.body.classList.remove('privacy') }
  }, [privacyMode])

  // body scroll lock when notes open
  useEffect(() => {
    document.body.style.overflow = notesOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [notesOpen])

  // avatar outside-click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    if (avatarOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [avatarOpen])

  // escape to close notes
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && notesOpen) setNotesOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [notesOpen])

  function addNote() {
    const text = noteInput.trim()
    if (!text) return
    setNotes(prev => [{
      id: crypto.randomUUID(),
      text,
      author: profile?.full_name ?? user?.email ?? 'You',
      ts: new Date(),
    }, ...prev])
    setNoteInput('')
  }

  function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const lbItems = getLbItems(deal, activeTab, contentType)

  return (
    <div>

      {/* ═══════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════ */}
      <div className="hdr">
        <div className="hdr-left">
          <div
            className="logo"
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
            title="Back to dashboard"
          >
            Deal<span>Score</span>
          </div>
          <div className="logo-sep"></div>
          <nav className="hdr-nav">
            <button className="hn on" onClick={() => navigate('/dashboard')}>Deals</button>
            <div className="hn-sep"></div>
            <button className="hn">Pipeline</button>
            <div className="hn-sep"></div>
            <button className="hn">Compare</button>
          </nav>
        </div>

        <div className="hdr-centre">
          <div className="search-bar">
            <i className="ti ti-search"></i>
            <input type="text" placeholder="Search deals, sellers, addresses…" readOnly />
            <span className="search-kbd">⌘K</span>
          </div>
        </div>

        <div className="hdr-right">
          <nav className="hdr-right-nav">
            <button className="hn">Sellers</button>
            <div className="hn-sep"></div>
            <button className="hn">Investors</button>
          </nav>
          <div className="logo-sep"></div>
          <button className="btn-new" onClick={() => navigate('/dashboard')}>
            <i className="ti ti-plus"></i> New deal
          </button>
          <div className="logo-sep"></div>
          <div ref={avatarRef} className="avt-wrap">
            <div className="avt-wrap-inner" onClick={() => setAvatarOpen(p => !p)}>
              <div className="avt">
                {getInitials(profile?.full_name, user?.email)}
              </div>
              <i className="ti ti-chevron-down avt-chevron"></i>
            </div>

            {avatarOpen && (
              <div className="avt-drop show">
                <div className="avt-drop-head">
                  <div className="avt-drop-name">{profile?.full_name ?? user?.email}</div>
                  {profile?.full_name && (
                    <div className="avt-drop-email">{user?.email}</div>
                  )}
                </div>
                <div style={{ padding: '4px 0' }}>
                  <button
                    className="avt-drop-item"
                    onClick={() => { setAvatarOpen(false); navigate('/profile') }}
                  >
                    <i className="ti ti-user"></i> Profile
                  </button>
                  <button
                    className="avt-drop-item"
                    onClick={() => { setAvatarOpen(false); navigate('/profile') }}
                  >
                    <i className="ti ti-settings"></i> Settings
                  </button>
                  <button
                    className="avt-drop-item"
                    onClick={() => { setAvatarOpen(false); navigate('/dashboard') }}
                  >
                    <i className="ti ti-layout-dashboard"></i> Dashboard
                  </button>
                </div>
                <div className="avt-drop-divider"></div>
                <div className="avt-drop-toggle" onClick={() => setPrivacyMode(p => !p)}>
                  <div className="avt-drop-toggle-left">
                    <i className="ti ti-eye-off"></i> Privacy mode
                  </div>
                  <label className="mini-toggle" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={privacyMode}
                      onChange={() => setPrivacyMode(p => !p)}
                    />
                    <span className="mini-track"></span>
                    <span className="mini-thumb"></span>
                  </label>
                </div>
                <div className="avt-drop-divider"></div>
                <button
                  className="avt-drop-item danger"
                  onClick={async () => {
                    setAvatarOpen(false)
                    await signOut()
                    navigate('/login')
                  }}
                >
                  <i className="ti ti-logout"></i> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          PRIVACY BANNER
          ═══════════════════════════════════════════════ */}
      <div className={`privacy-banner${privacyMode ? ' show' : ''}`}>
        <i className="ti ti-eye-off" style={{ fontSize: '13px' }}></i>
        <span>Privacy mode is on — personal data hidden on screen</span>
        <button
          onClick={() => setPrivacyMode(false)}
          style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: '#fef3c7', background: 'none', border: '.5px solid rgba(254,243,199,.4)', borderRadius: '20px', padding: '2px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Turn off
        </button>
      </div>

      {/* ═══════════════════════════════════════════════
          INFO STRIP  48px sticky below header
          ═══════════════════════════════════════════════ */}
      <div className="istrip">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#bbb' }}>{deal.reference}</span>
          <span style={{ color: '#ddd', fontSize: '12px' }}>·</span>
          <span className={`ds-status ${STATUS_CSS[deal.status]}`}>{STATUS_LABELS[deal.status]}</span>
          <span style={{ color: '#ddd', fontSize: '12px' }}>·</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-map-pin" style={{ fontSize: '11px', opacity: 0.4 }}></i>
            <span className="pii">{deal.address ?? 'No address'}</span>
          </span>
          <span style={{ color: '#ddd', fontSize: '12px' }}>·</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{STRATEGY_LABELS[deal.strategy] ?? deal.strategy}</span>
          {sellerName && (
            <>
              <span style={{ color: '#ddd', fontSize: '12px' }}>·</span>
              <span className="pii" style={{ fontSize: '13px', color: 'var(--text-1)' }}>{sellerName}</span>
            </>
          )}
          {investorCount > 0 && (
            <>
              <span style={{ color: '#ddd', fontSize: '12px' }}>·</span>
              <span style={{ fontSize: '12px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="ti ti-users" style={{ fontSize: 11, opacity: .5 }} />
                {investorCount} investor{investorCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
        <div style={{ marginLeft: 'auto', paddingRight: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-clock" style={{ fontSize: '11px' }}></i> {fDate(deal.updated_at)}
          </span>
          <button
            className="lb-hide-toggle"
            style={{ background: 'rgba(27,58,107,.75)' }}
            onClick={() => setLivebarVisible(v => !v)}
            title={livebarVisible ? 'Hide page info bar' : 'Show page info bar'}
          >
            <i className={`ti ${livebarVisible ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '11px' }}></i>
            <span>{livebarVisible ? 'Hide page info' : 'Show page info'}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          LIVE BAR  44px → 0px sticky
          ═══════════════════════════════════════════════ */}
      <div className={`livebar${livebarVisible ? '' : ' hidden'}`}>
        <div className="lb-set on">
          {lbItems.map((item, idx) => (
            <div key={idx} className="lb-item">
              <div className="lb-lbl">{item.label}</div>
              <div className={`lb-val${item.highlight ? ' hl' : ''}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          TAB NAV  42px sticky (top adjusts with livebar)
          ═══════════════════════════════════════════════ */}
      <div className="tabwrap" style={{ top: `${tabsTop}px` }}>
        <div className="tabrow">
          {(Object.entries(TAB_LABELS) as [TabKey, string][]).map(([key, label], idx, arr) => (
            <div key={key} style={{ display: 'contents' }}>
              <button
                className={`vt${activeTab === key ? ' on' : ''}`}
                onClick={() => handleTabChange(key)}
              >
                {label}
              </button>
              {idx < arr.length - 1 && <div className="tdiv"></div>}
            </div>
          ))}
          <div className="tab-action">
            {activeTab === 'overview' ? (
              <>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid rgba(217,119,6,.35)',
                  background: 'rgba(217,119,6,.08)', color: '#92400e',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '11px' }}></i> 2 inputs to confirm
                </button>
                <button className="log-btn" style={{ borderRadius: '7px' }} onClick={() => navigate(`/deal/${deal.id}?tab=content&view=progress`)}>
                  <i className="ti ti-file-description" style={{ fontSize: '11px' }}></i> Deal Status
                </button>
                <button
                  className="log-btn"
                  style={{ borderRadius: '7px' }}
                  onClick={() => setNotesOpen(true)}
                >
                  <i className="ti ti-notes" style={{ fontSize: '11px' }}></i> Notes
                </button>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid var(--navy)',
                  background: 'var(--navy)', color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }} onClick={() => handleTabChange('investors')}>
                  <i className="ti ti-send" style={{ fontSize: '11px' }}></i> Send invoice
                </button>
              </>
            ) : activeTab === 'analysis' ? (
              <>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid rgba(217,119,6,.35)',
                  background: 'rgba(217,119,6,.08)', color: '#92400e',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '11px' }}></i> 2 inputs to confirm
                </button>
                {(analysisView === 'inputs' || analysisView === 'results') && (
                  <button style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                    borderRadius: '7px', border: '.5px solid rgba(27,58,107,.25)',
                    background: 'var(--navy-light)', color: 'var(--navy)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <i className="ti ti-bolt" style={{ fontSize: '11px' }}></i> Optimise
                  </button>
                )}
                <button
                  className="log-btn"
                  style={{ borderRadius: '7px' }}
                  onClick={() => setNotesOpen(true)}
                >
                  <i className="ti ti-notes" style={{ fontSize: '11px' }}></i> Notes
                </button>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid var(--navy)',
                  background: 'var(--navy)', color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {analysisView === 'inputs' && <><i className="ti ti-checks" style={{ fontSize: '11px' }}></i> Confirm inputs</>}
                  {analysisView === 'results' && <><i className="ti ti-download" style={{ fontSize: '11px' }}></i> Export results</>}
                  {analysisView === 'sensitivity' && <><i className="ti ti-download" style={{ fontSize: '11px' }}></i> Export</>}
                  {analysisView === 'workings' && <><i className="ti ti-download" style={{ fontSize: '11px' }}></i> Export workings</>}
                </button>
              </>
            ) : activeTab === 'content' ? (
              <>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid rgba(217,119,6,.35)',
                  background: 'rgba(217,119,6,.08)', color: '#92400e',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '11px' }}></i> 2 inputs to confirm
                </button>
                <button
                  className="log-btn"
                  style={{ borderRadius: '7px' }}
                >
                  <i className="ti ti-eye" style={{ fontSize: 11 }}></i> Preview
                </button>
                <button
                  className="log-btn"
                  style={{ borderRadius: '7px' }}
                  onClick={() => setNotesOpen(true)}
                >
                  <i className="ti ti-notes" style={{ fontSize: '11px' }}></i> Notes
                </button>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid var(--navy)',
                  background: 'var(--navy)', color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-download" style={{ fontSize: '11px' }}></i> Download pack
                </button>
              </>
            ) : activeTab === 'seller' ? (
              <>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid rgba(217,119,6,.35)',
                  background: 'rgba(217,119,6,.08)', color: '#92400e',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '11px' }}></i> 2 inputs to confirm
                </button>
                <button className="log-btn" style={{ borderRadius: '7px' }}>
                  <i className="ti ti-user-plus" style={{ fontSize: '11px' }}></i> Link seller
                </button>
                <button
                  className="log-btn"
                  style={{ borderRadius: '7px' }}
                  onClick={() => setNotesOpen(true)}
                >
                  <i className="ti ti-notes" style={{ fontSize: '11px' }}></i> Notes
                </button>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid var(--navy)',
                  background: 'var(--navy)', color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-pencil" style={{ fontSize: '11px' }}></i> Log activity
                </button>
              </>
            ) : activeTab === 'investors' ? (
              <>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid rgba(217,119,6,.35)',
                  background: 'rgba(217,119,6,.08)', color: '#92400e',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '11px' }}></i> 2 inputs to confirm
                </button>
                <button className="log-btn" style={{ borderRadius: '7px' }}>
                  <i className="ti ti-user-plus" style={{ fontSize: '11px' }}></i> Add investor
                </button>
                <button
                  className="log-btn"
                  style={{ borderRadius: '7px' }}
                  onClick={() => setNotesOpen(true)}
                >
                  <i className="ti ti-notes" style={{ fontSize: '11px' }}></i> Notes
                </button>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid var(--navy)',
                  background: 'var(--navy)', color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-send" style={{ fontSize: '11px' }}></i> Share deal
                </button>
              </>
            ) : activeTab === 'fees' ? (
              <>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid rgba(217,119,6,.35)',
                  background: 'rgba(217,119,6,.08)', color: '#92400e',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '11px' }}></i> 2 inputs to confirm
                </button>
                <button className="log-btn" style={{ borderRadius: '7px' }}>
                  <i className="ti ti-file-invoice" style={{ fontSize: '11px' }}></i> View invoice
                </button>
                <button
                  className="log-btn"
                  style={{ borderRadius: '7px' }}
                  onClick={() => setNotesOpen(true)}
                >
                  <i className="ti ti-notes" style={{ fontSize: '11px' }}></i> Notes
                </button>
                <button style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                  borderRadius: '7px', border: '.5px solid var(--navy)',
                  background: 'var(--navy)', color: '#fff',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-send" style={{ fontSize: '11px' }}></i> Send invoice
                </button>
              </>
            ) : (
              <>
                <button
                  className="log-btn"
                  onClick={() => setNotesOpen(true)}
                >
                  <i className="ti ti-notes" style={{ fontSize: '11px' }}></i> Notes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          CONTENT
          ═══════════════════════════════════════════════ */}
      <div>{children}</div>

      {/* ═══════════════════════════════════════════════
          NOTES DRAWER
          ═══════════════════════════════════════════════ */}

      {/* Backdrop */}
      {notesOpen && (
        <div
          onClick={() => setNotesOpen(false)}
          className="notes-overlay show"
        />
      )}

      {/* Panel */}
      <div className={`notes-panel${notesOpen ? ' show' : ''}`}>
        <div className="notes-hdr">
          <div>
            <div className="notes-title">
              <i className="ti ti-notes"></i> Notes
            </div>
            <div className="notes-count">
              {notes.length === 0 ? 'No notes yet' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button className="notes-close" onClick={() => setNotesOpen(false)}>
            <i className="ti ti-x"></i> Close
          </button>
        </div>

        <div className="notes-body">
          <div className="notes-composer">
            <textarea
              id={noteInputId}
              className="notes-input"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
              placeholder="Add a note about this deal…"
            />
            <div className="notes-add-row">
              <button
                className="notes-add-btn"
                disabled={!noteInput.trim()}
                onClick={addNote}
              >
                <i className="ti ti-plus" style={{ fontSize: '13px' }}></i> Add note
              </button>
            </div>
          </div>

          {notes.length > 0 && (
            <div className="notes-section-lbl">Activity</div>
          )}

          <div id="notesList">
            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-2)', fontSize: '13px' }}>
                <div style={{ fontSize: '28px', color: 'var(--ds-border)', marginBottom: '10px' }}>📋</div>
                No notes yet — add the first one above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notes.map(note => (
                  <div
                    key={note.id}
                    style={{ border: '.5px solid var(--ds-border)', borderRadius: '12px', padding: '14px 16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: 'rgba(27,58,107,.12)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 700, color: 'var(--navy)',
                        }}>
                          {note.author.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a2332' }}>
                          {note.author}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{relTime(note.ts)}</span>
                        <button
                          onClick={() => deleteNote(note.id)}
                          title="Delete note"
                          style={{
                            background: 'none', border: 'none', color: 'var(--text-2)',
                            cursor: 'pointer', padding: '3px', borderRadius: '6px',
                            display: 'flex', alignItems: 'center', fontSize: '13px',
                            fontFamily: 'inherit', transition: 'all .12s',
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.55, color: '#1a2332', whiteSpace: 'pre-wrap' }}>
                      {note.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
