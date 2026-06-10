import { useState, useEffect, useRef, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { Deal, DealStatus } from '../lib/database.types'
import { useAuth } from '../lib/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────
export type TabKey = 'overview' | 'analysis' | 'content' | 'seller' | 'investors'

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
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  children: React.ReactNode
}

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY        = '#1B3A6B'
const NAVY_DARK   = '#152d55'
const NAVY_DEEP   = '#0f2040'
const TEAL        = '#1D9E75'
const DS_BORDER   = '#e3e5e9'
const BG_SEC      = '#f5f6f8'
const AMBER       = '#D97706'

const HDR_H     = 56
const ISTRIP_H  = 48
const LIVEBAR_H = 44
const TABS_H    = 42

const TAB_LABELS: Record<TabKey, string> = {
  overview:  'Overview',
  analysis:  'Analysis',
  content:   'Content',
  seller:    'Seller',
  investors: 'Investors',
}

const STATUS_LABELS: Record<DealStatus, string> = {
  analysing:  'Sourcing',
  reviewing:  'Ready',
  presenting: 'Pack sent',
  closed:     'Complete',
  dead:       'Withdrawn',
}

const STATUS_BORDER: Record<DealStatus, string> = {
  analysing:  '#9ca3af',
  reviewing:  '#10b981',
  presenting: '#8b5cf6',
  closed:     '#10b981',
  dead:       '#9ca3af',
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
  if (diff < 60_000)   return 'just now'
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

function getLbItems(deal: Deal, tab: TabKey): LbItem[] {
  switch (tab) {
    case 'overview':
      return [
        { label: 'Stage',      value: STATUS_LABELS[deal.status] },
        { label: 'Deal score', value: deal.deal_score ?? 'No score', highlight: !!deal.deal_score },
        { label: 'Monthly CF', value: fCurrency(deal.cash_flow), highlight: true },
        { label: 'Gross yield', value: fPct(deal.gross_yield) },
        { label: 'CoC ROI',    value: fPct(deal.coc_roi) },
      ]
    case 'analysis':
      return [
        { label: 'Purchase price', value: fCurrency(deal.purchase_price) },
        { label: 'Monthly CF',     value: fCurrency(deal.cash_flow), highlight: true },
        { label: 'CoC ROI',        value: fPct(deal.coc_roi) },
        { label: 'Gross yield',    value: fPct(deal.gross_yield), highlight: true },
        { label: 'Deal score',     value: deal.deal_score ?? 'No score' },
      ]
    case 'content':
      return [
        { label: 'Strategy',    value: deal.strategy },
        { label: 'Packs',       value: deal.packs_generated > 0 ? `${deal.packs_generated} generated` : 'Not created' },
        { label: 'Last updated', value: fDate(deal.updated_at) },
      ]
    case 'seller':
      return [
        { label: 'Asking price',  value: fCurrency(deal.purchase_price) },
        { label: 'Market value',  value: fCurrency(deal.market_value) },
        {
          label: 'Discount',
          value: deal.purchase_price && deal.market_value
            ? fPct(((deal.market_value - deal.purchase_price) / deal.market_value) * 100)
            : '—',
          highlight: true,
        },
        { label: 'Stage', value: STATUS_LABELS[deal.status] },
      ]
    case 'investors':
      return [
        { label: 'Strategy',    value: deal.strategy },
        { label: 'Price',       value: fCurrency(deal.purchase_price) },
        { label: 'Deal score',  value: deal.deal_score ?? 'No score', highlight: !!deal.deal_score },
        { label: 'Pack status', value: deal.packs_generated > 0 ? 'Pack ready' : 'Not ready' },
      ]
  }
}

// ─── Button presets ───────────────────────────────────────────────────────────
const BTN_GHOST_SM: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  fontSize: '11px', fontWeight: 500, padding: '5px 11px',
  borderRadius: '7px', border: `.5px solid ${DS_BORDER}`,
  background: BG_SEC, color: '#5a6270',
  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
  flexShrink: 0, whiteSpace: 'nowrap',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DealChrome({ deal, activeTab, onTabChange, children }: DealChromeProps) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const noteInputId = useId()

  // chrome state
  const [livebarVisible, setLivebarVisible] = useState(true)
  const [privacyMode, setPrivacyMode]       = useState(false)
  const [avatarOpen, setAvatarOpen]         = useState(false)
  const [notesOpen, setNotesOpen]           = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  // notes local state
  const [notes, setNotes]         = useState<Note[]>([])
  const [noteInput, setNoteInput] = useState('')

  // computed sticky tops
  const lbH      = livebarVisible ? LIVEBAR_H : 0
  const istripTop = HDR_H
  const livebarTop = HDR_H + ISTRIP_H
  const tabsTop    = HDR_H + ISTRIP_H + lbH

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

  const lbItems = getLbItems(deal, activeTab)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_SEC, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══════════════════════════════════════════════
          HEADER  56px sticky top:0
          ═══════════════════════════════════════════════ */}
      <header style={{
        height: `${HDR_H}px`, backgroundColor: NAVY_DARK,
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px',
        position: 'sticky', top: 0, zIndex: 220, flexShrink: 0, boxSizing: 'border-box',
      }}>

        {/* Left: logo + sep */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-.01em', fontFamily: 'inherit', padding: 0 }}
          >
            Deal<span style={{ color: TEAL }}>Score</span>
          </button>
          <div style={{ width: '.5px', height: '18px', background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />
        </div>

        {/* Centre: reference + tab indicator */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.55)',
            background: 'rgba(255,255,255,.08)', border: '.5px solid rgba(255,255,255,.12)',
            borderRadius: '20px', padding: '3px 11px', letterSpacing: '.04em',
          }}>
            {deal.reference}
          </span>
          <span style={{ color: 'rgba(255,255,255,.2)', fontSize: '12px' }}>›</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>
            {TAB_LABELS[activeTab]}
          </span>
        </div>

        {/* Right: Notes · Privacy · Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

          {/* Notes button */}
          <button
            onClick={() => setNotesOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              height: '30px', padding: '0 11px', borderRadius: '8px',
              border: '.5px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.08)',
              color: 'rgba(255,255,255,.7)', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s', flexShrink: 0,
            }}
          >
            📝 Notes
            {notes.length > 0 && (
              <span style={{
                fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px',
                background: TEAL, color: '#fff', borderRadius: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
              }}>
                {notes.length}
              </span>
            )}
          </button>

          {/* Privacy toggle */}
          <button
            onClick={() => setPrivacyMode(p => !p)}
            title={privacyMode ? 'Privacy on — click to reveal data' : 'Hide personal data'}
            style={{
              height: '30px', padding: '0 10px', borderRadius: '8px',
              border: privacyMode ? '.5px solid rgba(217,119,6,.6)' : '.5px solid rgba(255,255,255,.18)',
              background: privacyMode ? 'rgba(217,119,6,.2)' : 'rgba(255,255,255,.08)',
              color: privacyMode ? '#FCD34D' : 'rgba(255,255,255,.55)',
              fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all .15s', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {privacyMode ? '🔒' : '👁'} Privacy
          </button>

          {/* Avatar + dropdown */}
          <div ref={avatarRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setAvatarOpen(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
              }}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'rgba(255,255,255,.16)', border: '.5px solid rgba(255,255,255,.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 600, color: '#fff', flexShrink: 0,
              }}>
                {getInitials(profile?.full_name, user?.email)}
              </div>
              <span style={{ color: 'rgba(255,255,255,.35)', fontSize: '10px' }}>▾</span>
            </button>

            {avatarOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: '#fff', border: `.5px solid ${DS_BORDER}`,
                borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,.12)',
                minWidth: '200px', overflow: 'hidden', zIndex: 300,
              }}>
                <div style={{ padding: '12px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a2332' }}>
                    {profile?.full_name ?? user?.email}
                  </div>
                  {profile?.full_name && (
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>{user?.email}</div>
                  )}
                </div>
                <div style={{ padding: '4px 0' }}>
                  {[
                    { label: 'Profile',  fn: () => { setAvatarOpen(false); navigate('/profile') } },
                    { label: 'Settings', fn: () => { setAvatarOpen(false); navigate('/profile') } },
                    { label: 'Dashboard', fn: () => { setAvatarOpen(false); navigate('/dashboard') } },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.fn}
                      style={{
                        display: 'flex', width: '100%', textAlign: 'left',
                        padding: '9px 14px', background: 'none', border: 'none',
                        fontSize: '12px', color: '#374151', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: `.5px solid ${DS_BORDER}` }}>
                  <button
                    onClick={async () => { setAvatarOpen(false); await signOut(); navigate('/login') }}
                    style={{
                      display: 'flex', width: '100%', textAlign: 'left',
                      padding: '9px 14px', background: 'none', border: 'none',
                      fontSize: '12px', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit',
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

      {/* ═══════════════════════════════════════════════
          INFO STRIP  48px sticky below header
          ═══════════════════════════════════════════════ */}
      <div style={{
        backgroundColor: '#fff', borderBottom: `.5px solid ${DS_BORDER}`,
        height: `${ISTRIP_H}px`, display: 'flex', alignItems: 'center',
        padding: '0 20px', position: 'sticky', top: `${istripTop}px`, zIndex: 219,
        boxSizing: 'border-box', gap: '8px',
      }}>

        {/* Left cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* Reference */}
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', flexShrink: 0 }}>
            {deal.reference}
          </span>
          <span style={{ color: '#ddd', flexShrink: 0 }}>·</span>

          {/* Status pill */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', fontWeight: 500, padding: '2px 8px 2px 6px',
            background: BG_SEC, borderRadius: '4px',
            borderLeft: `3px solid ${STATUS_BORDER[deal.status]}`,
            whiteSpace: 'nowrap', flexShrink: 0, color: '#374151',
          }}>
            {STATUS_LABELS[deal.status]}
          </span>
          <span style={{ color: '#ddd', flexShrink: 0 }}>·</span>

          {/* Address */}
          <span className="pii" style={{
            fontSize: '13px', fontWeight: 600, color: '#1a2332',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {deal.address ?? 'No address'}
          </span>
          <span style={{ color: '#ddd', flexShrink: 0 }}>·</span>

          {/* Strategy */}
          <span style={{
            fontSize: '12px', fontWeight: 600, color: NAVY,
            background: 'rgba(27,58,107,.07)', border: `.5px solid rgba(27,58,107,.15)`,
            borderRadius: '20px', padding: '1px 9px', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {deal.strategy}
          </span>
        </div>

        {/* Right cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            ⏱ {fDate(deal.updated_at)}
          </span>

          {/* Livebar hide/show toggle */}
          <button
            onClick={() => setLivebarVisible(v => !v)}
            title={livebarVisible ? 'Hide live bar' : 'Show live bar'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,.45)',
              background: 'rgba(27,58,107,.75)', border: '.5px solid rgba(255,255,255,.15)',
              borderRadius: '6px', padding: '3px 9px', cursor: 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '9px', transform: livebarVisible ? 'none' : 'rotate(180deg)', display: 'inline-block', transition: 'transform .18s' }}>
              ▲
            </span>
            {livebarVisible ? 'Hide page info' : 'Show page info'}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          LIVE BAR  44px → 0px sticky
          ═══════════════════════════════════════════════ */}
      <div style={{
        background: NAVY_DEEP, display: 'flex', alignItems: 'center',
        padding: '0 24px', overflow: 'hidden',
        position: 'sticky', top: `${livebarTop}px`, zIndex: 218,
        height: `${lbH}px`, opacity: livebarVisible ? 1 : 0,
        pointerEvents: livebarVisible ? 'all' : 'none',
        transition: 'height .2s ease, opacity .2s ease',
      }}>
        {lbItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
              padding: '0 16px',
              borderRight: idx < lbItems.length - 1 ? '.5px solid rgba(255,255,255,.1)' : 'none',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'rgba(255,255,255,.45)', marginBottom: '2px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: item.highlight ? '#34D399' : '#fff', whiteSpace: 'nowrap' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          TAB NAV  42px sticky (adjusts with livebar)
          ═══════════════════════════════════════════════ */}
      <div style={{
        backgroundColor: '#fff', borderBottom: `.5px solid ${DS_BORDER}`,
        position: 'sticky', top: `${tabsTop}px`, zIndex: 217,
        height: `${TABS_H}px`, boxSizing: 'border-box',
        transition: 'top .2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 20px' }}>
          {(Object.entries(TAB_LABELS) as [TabKey, string][]).map(([key, label], idx, arr) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <button
                onClick={() => onTabChange(key)}
                style={{
                  background: 'none', border: 'none', height: '100%',
                  padding: '0 14px', fontSize: '12px', cursor: 'pointer',
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                  borderBottom: activeTab === key ? `2px solid ${TEAL}` : '2px solid transparent',
                  fontWeight: activeTab === key ? 600 : 500,
                  color: activeTab === key ? NAVY : '#5a6270',
                  transition: 'color .15s, border-color .15s',
                }}
              >
                {label}
              </button>
              {idx < arr.length - 1 && (
                <div style={{ width: '.5px', height: '14px', background: DS_BORDER, flexShrink: 0 }} />
              )}
            </div>
          ))}

          {/* Tab-level actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <button
              onClick={() => setNotesOpen(true)}
              style={BTN_GHOST_SM}
            >
              📝 Notes
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ ...BTN_GHOST_SM, background: NAVY_DARK, color: '#fff', border: `none` }}
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          CONTENT
          ═══════════════════════════════════════════════ */}
      <div>
        {children}
      </div>

      {/* ═══════════════════════════════════════════════
          NOTES DRAWER
          ═══════════════════════════════════════════════ */}

      {/* Backdrop */}
      {notesOpen && (
        <div
          onClick={() => setNotesOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10,20,40,.55)',
            zIndex: 300, transition: 'opacity .25s',
          }}
        />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px',
        background: '#fff', zIndex: 301,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,.16)',
        transform: notesOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.32,.72,0,1)',
      }}>
        {/* Notes header */}
        <div style={{ background: NAVY, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>📝 Notes</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.55)', marginTop: '2px' }}>
              {notes.length === 0 ? 'No notes yet' : `${notes.length} note${notes.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={() => setNotesOpen(false)}
            style={{
              background: 'rgba(255,255,255,.1)', border: '.5px solid rgba(255,255,255,.2)',
              borderRadius: '8px', color: '#fff', padding: '6px 12px',
              cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Notes scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

          {/* Composer */}
          <div style={{
            background: BG_SEC, border: `.5px solid ${DS_BORDER}`,
            borderRadius: '12px', padding: '14px', marginBottom: '20px',
          }}>
            <textarea
              id={noteInputId}
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
              placeholder="Add a note about this deal…"
              rows={3}
              style={{
                width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: '8px',
                padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit',
                color: '#1a2332', resize: 'vertical', minHeight: '64px',
                background: '#fff', boxSizing: 'border-box', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>⌘↵ to submit</span>
              <button
                onClick={addNote}
                disabled={!noteInput.trim()}
                style={{
                  background: NAVY, color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '8px 16px',
                  fontSize: '12px', fontWeight: 600, cursor: noteInput.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', opacity: noteInput.trim() ? 1 : 0.4,
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  transition: 'opacity .12s',
                }}
              >
                + Add note
              </button>
            </div>
          </div>

          {/* Section label */}
          {notes.length > 0 && (
            <div style={{
              fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '.08em', color: '#aaa', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              Activity
              <div style={{ flex: 1, height: '.5px', background: DS_BORDER }} />
            </div>
          )}

          {/* Note list */}
          {notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '13px' }}>
              <div style={{ fontSize: '28px', color: DS_BORDER, marginBottom: '10px' }}>📋</div>
              No notes yet — add the first one above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notes.map(note => (
                <div
                  key={note.id}
                  style={{
                    border: `.5px solid ${DS_BORDER}`, borderRadius: '12px',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: 'rgba(27,58,107,.12)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 700, color: NAVY,
                      }}>
                        {note.author.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a2332' }}>
                        {note.author}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{relTime(note.ts)}</span>
                      <button
                        onClick={() => deleteNote(note.id)}
                        title="Delete note"
                        style={{
                          background: 'none', border: 'none', color: '#9ca3af',
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
  )
}
