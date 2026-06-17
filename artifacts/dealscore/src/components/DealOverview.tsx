import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Deal, DealStatus } from '../lib/database.types'
import type { TabKey } from './DealChrome'

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY      = 'var(--navy)'
const NAVY_DARK = 'var(--navy-dark)'
const TEAL      = 'var(--teal)'
const DS_BORDER = 'var(--ds-border)'
const BG_SEC    = 'var(--bg-sec)'
const AMBER     = '#D97706'

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

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// ─── Score ring config ────────────────────────────────────────────────────────
type VerdictKey = 'RECOMMENDED' | 'REVIEW' | 'AVOID'

const VERDICT_CFG: Record<VerdictKey, { color: string; bg: string; label: string; pct: number }> = {
  RECOMMENDED: { color: TEAL,    bg: '#d1fae5', label: 'REC',   pct: 0.85 },
  REVIEW:      { color: AMBER,   bg: '#fef3c7', label: 'REV',   pct: 0.52 },
  AVOID:       { color: '#dc2626', bg: '#fee2e2', label: 'AVOID', pct: 0.20 },
}

// ─── Flow rail ────────────────────────────────────────────────────────────────
type FlowStage = { label: string; icon: string }

const FLOW_STAGES: FlowStage[] = [
  { label: 'Sourcing',  icon: '📍' },
  { label: 'Analysis',  icon: '📊' },
  { label: 'Pack sent', icon: '📦' },
  { label: 'Shared',    icon: '📤' },
  { label: 'Reserved',  icon: '🔒' },
  { label: 'Complete',  icon: '✅' },
]

const STATUS_STAGE_IDX: Record<DealStatus, number> = {
  analysing:  0,
  reviewing:  1,
  presenting: 3,
  closed:     5,
  dead:       -1,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ verdict }: { verdict: 'RECOMMENDED' | 'REVIEW' | 'AVOID' | null }) {
  const cfg = verdict ? VERDICT_CFG[verdict] : null
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = circ
  const offset = cfg ? circ * (1 - cfg.pct) : circ

  return (
    <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
      <svg width="70" height="70" viewBox="0 0 70 70" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
        <circle
          cx="35" cy="35" r={r} fill="none"
          stroke={cfg ? cfg.color : 'rgba(255,255,255,.25)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash}`}
          strokeDashoffset={`${offset}`}
          style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: verdict === 'AVOID' ? '8px' : '10px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {cfg ? cfg.label : '—'}
        </div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,.5)', marginTop: '1px' }}>Score</div>
      </div>
    </div>
  )
}

interface SidebarCardProps {
  children: React.ReactNode
  style?: CSSProperties
}
function SidebarCard({ children, style }: SidebarCardProps) {
  return (
    <div style={{
      background: '#fff', border: `.5px solid ${DS_BORDER}`,
      borderRadius: '12px', overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

function SbarHdr({ icon, title, subtitle, badge, badgeColor }: {
  icon: string; title: string; subtitle?: string;
  badge?: string; badgeColor?: 'green' | 'amber' | 'teal' | 'navy'
}) {
  const badgeBg: Record<string, string> = {
    green: '#d1fae5', amber: '#fef3c7', teal: '#ccfbf1', navy: 'rgba(27,58,107,.1)',
  }
  const badgeTxt: Record<string, string> = {
    green: '#065f46', amber: '#92400e', teal: '#0f766e', navy: NAVY,
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '12px 14px', borderBottom: `.5px solid ${DS_BORDER}`,
    }}>
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
        background: 'rgba(27,58,107,.08)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '14px',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a2332' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '1px' }}>{subtitle}</div>}
      </div>
      {badge && badgeColor && (
        <span style={{
          fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
          background: badgeBg[badgeColor], color: badgeTxt[badgeColor],
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function SbarCta({ children, variant = 'default', onClick }: {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'teal'
  onClick?: () => void
}) {
  const styles: Record<string, CSSProperties> = {
    default: { background: NAVY, color: '#fff', border: 'none' },
    outline: { background: 'transparent', color: NAVY, border: `.5px solid ${DS_BORDER}` },
    teal:    { background: TEAL, color: '#fff', border: 'none' },
  }
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
        justifyContent: 'center', fontSize: '11px', fontWeight: 600,
        padding: '9px 14px', borderRadius: '8px', cursor: 'pointer',
        fontFamily: 'inherit', transition: 'opacity .12s',
        ...styles[variant],
      }}
    >
      {children}
    </button>
  )
}

// ─── Close Deal Modal ─────────────────────────────────────────────────────────
type CloseOutcome = 'sold' | 'exchanged' | 'fell-through' | 'withdrawn'

interface CloseDealModalProps {
  onClose: () => void
  onConfirm: (outcome: CloseOutcome) => void
}

function CloseDealModal({ onClose, onConfirm }: CloseDealModalProps) {
  const [outcome, setOutcome] = useState<CloseOutcome>('sold')
  const [completionDate, setCompletionDate] = useState(() => new Date().toISOString().split('T')[0])
  const [salePrice, setSalePrice] = useState('')
  const [feeReceived, setFeeReceived] = useState('')
  const [investor, setInvestor] = useState('')
  const [closingNotes, setClosingNotes] = useState('')

  const showFields = outcome === 'sold' || outcome === 'exchanged'
  const isDanger   = outcome === 'fell-through' || outcome === 'withdrawn'

  const OUTCOMES: { key: CloseOutcome; emoji: string; label: string; desc: string; danger?: boolean }[] = [
    { key: 'sold',         emoji: '🎉', label: 'Sold',       desc: 'Deal completed — fee received' },
    { key: 'exchanged',    emoji: '🔑', label: 'Exchanged',  desc: 'Contracts exchanged, awaiting completion' },
    { key: 'fell-through', emoji: '❌', label: 'Fell through', desc: 'Deal collapsed after reservation', danger: true },
    { key: 'withdrawn',    emoji: '🚫', label: 'Withdrawn',  desc: 'Deal removed before reservation', danger: true },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(10,20,40,.6)',
          zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: '16px', width: '520px', maxWidth: 'calc(100vw - 32px)',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,.22)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '22px 24px 16px', borderBottom: `.5px solid ${DS_BORDER}` }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2332', marginBottom: '4px' }}>
              Close this deal
            </div>
            <div style={{ fontSize: '12px', color: '#5a6270', lineHeight: 1.5 }}>
              Record the outcome — completed deals move to Complete; deals that fell through are marked Withdrawn.
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>

            {/* Outcome grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {OUTCOMES.map(o => (
                <button
                  key={o.key}
                  onClick={() => setOutcome(o.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '16px 12px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'center', transition: 'all .12s',
                    border: outcome === o.key
                      ? `1.5px solid ${o.danger ? '#dc2626' : NAVY}`
                      : `.5px solid ${DS_BORDER}`,
                    background: outcome === o.key
                      ? (o.danger ? '#fee2e2' : 'rgba(27,58,107,.06)')
                      : '#fff',
                  }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{o.emoji}</div>
                  <div style={{
                    fontSize: '13px', fontWeight: 700,
                    color: outcome === o.key && o.danger ? '#dc2626' : '#1a2332',
                    marginBottom: '4px',
                  }}>{o.label}</div>
                  <div style={{ fontSize: '10px', color: '#5a6270', lineHeight: 1.4 }}>{o.desc}</div>
                </button>
              ))}
            </div>

            {/* Fields */}
            {showFields && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Completion date
                    </label>
                    <input
                      type="date" value={completionDate}
                      onChange={e => setCompletionDate(e.target.value)}
                      style={{
                        width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: '8px',
                        padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit',
                        color: '#1a2332', boxSizing: 'border-box', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Actual sale price
                    </label>
                    <input
                      type="text" value={salePrice} placeholder="e.g. £175,000"
                      onChange={e => setSalePrice(e.target.value)}
                      style={{
                        width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: '8px',
                        padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit',
                        color: '#1a2332', boxSizing: 'border-box', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Sourcing fee received
                    </label>
                    <input
                      type="text" value={feeReceived} placeholder="e.g. £2,500"
                      onChange={e => setFeeReceived(e.target.value)}
                      style={{
                        width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: '8px',
                        padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit',
                        color: '#1a2332', boxSizing: 'border-box', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Investor
                    </label>
                    <input
                      type="text" value={investor} placeholder="e.g. James Brown"
                      onChange={e => setInvestor(e.target.value)}
                      style={{
                        width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: '8px',
                        padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit',
                        color: '#1a2332', boxSizing: 'border-box', outline: 'none',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '5px' }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={closingNotes} placeholder="Any notes about the outcome…"
                    onChange={e => setClosingNotes(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: '8px',
                      padding: '8px 10px', fontSize: '12px', fontFamily: 'inherit',
                      color: '#1a2332', boxSizing: 'border-box', outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px',
            padding: '16px 24px', borderTop: `.5px solid ${DS_BORDER}`,
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 18px', borderRadius: '8px',
                border: `.5px solid ${DS_BORDER}`, background: '#fff',
                fontSize: '12px', fontWeight: 600, color: '#374151',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(outcome)}
              style={{
                padding: '9px 18px', borderRadius: '8px', border: 'none',
                background: isDanger ? '#dc2626' : NAVY,
                color: '#fff', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .12s',
              }}
            >
              {isDanger ? 'Mark as withdrawn' : 'Complete deal'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  deal: Deal
  onTabChange: (tab: TabKey) => void
  initialView?: 'overview' | 'status'
}

export default function DealOverview({ deal, onTabChange, initialView }: Props) {
  const navigate = useNavigate()
  const [overviewView, setOverviewView] = useState<'overview' | 'status'>(
    initialView === 'status' ? 'status' : 'overview'
  )
  useEffect(() => { setOverviewView(initialView ?? 'overview') }, [initialView])
  const [closeDealOpen, setCloseDealOpen]     = useState(false)
  const [closedOutcome, setClosedOutcome]     = useState<string | null>(null)
  const [archivedBanner, setArchivedBanner]   = useState(false)
  const [archivedMsg, setArchivedMsg]         = useState('')
  const [archivedSuccess, setArchivedSuccess] = useState(false)
  const [expDismissed, setExpDismissed] = useState(false)
  const [dealStatusEducatorDismissed, setDealStatusEducatorDismissed] = useState(false)

  const stageIdx = STATUS_STAGE_IDX[deal.status]
  const daysSince = daysAgo(deal.created_at)

  const verdictCfg = deal.deal_score ? VERDICT_CFG[deal.deal_score] : null

  const STRATEGY_LABELS: Record<string, string> = {
    BTL: 'Buy to Let', HMO: 'HMO', FLIP: 'Flip',
    SA: 'Serviced Accommodation', BRRR: 'BRRR',
    R2R: 'Rent to Rent', SOCIAL: 'Social Housing',
  }
  const stratLabel = STRATEGY_LABELS[deal.strategy] ?? deal.strategy

  const STATUS_LABELS: Record<DealStatus, string> = {
    analysing:  'Sourcing',
    reviewing:  'Reviewing',
    presenting: 'Pack sent',
    closed:     'Complete',
    dead:       'Withdrawn',
  }

  function handleConfirmClose(outcome: CloseOutcome) {
    setCloseDealOpen(false)
    const labels: Record<CloseOutcome, string> = {
      'sold':         'Sold — deal complete',
      'exchanged':    'Exchanged — awaiting completion',
      'fell-through': 'Fell through — marked withdrawn',
      'withdrawn':    'Withdrawn — deal removed',
    }
    const isSuccess = outcome === 'sold' || outcome === 'exchanged'
    setArchivedMsg(labels[outcome])
    setArchivedSuccess(isSuccess)
    setArchivedBanner(true)
    setClosedOutcome(outcome)
  }

  // ── Activity items (derived from deal state) ────────────────────────────────
  const activityItems: { dot: string; text: string; time: string }[] = [
    { dot: TEAL,      text: `Deal created · ${stratLabel}`,                                  time: `${daysSince} day${daysSince === 1 ? '' : 's'} ago` },
    { dot: NAVY,      text: 'Analysis run · score calculated',                              time: deal.deal_score ? `${Math.max(0, daysSince - 1)} day${daysSince - 1 === 1 ? '' : 's'} ago` : '—' },
    { dot: '#8b5cf6', text: `Status set to ${STATUS_LABELS[deal.status]}`,                  time: fDate(deal.updated_at) },
    { dot: 'var(--text-2)', text: `Last updated · ${stratLabel} inputs`,                          time: fDate(deal.updated_at) },
  ].filter(a => a.time !== '—')

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="ds-content">

      {/* Overview / Deal Status switcher — sticky band (always shown) */}
      <div style={{ position: 'sticky', top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))', zIndex: 100, background: '#fff', paddingBottom: 10 }}>
        <div style={{ background: '#fff', borderRadius: 10 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '8px 0', display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', padding: '4px', width: 'fit-content' }}>
              {(['overview', 'status'] as const).map(v => (
                <button key={v} onClick={() => setOverviewView(v)} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: overviewView === v ? 'var(--navy)' : 'transparent', color: overviewView === v ? '#fff' : 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all .15s' }}>
                  {v === 'overview' ? <><i className="ti ti-layout-dashboard" style={{ fontSize: '11px' }} /> Overview</> : <><i className="ti ti-chart-gantt" style={{ fontSize: '11px' }} /> Deal Status</>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {overviewView === 'overview' && <>

      {!expDismissed ? (
        <div style={{position:'relative',display:'flex',gap:14,alignItems:'flex-start',background:'#fff',borderRadius:12,border:'.5px solid var(--ds-border)',boxShadow:'0 1px 3px rgba(0,0,0,.06)',padding:'16px 18px',marginBottom:12}}>
          <button onClick={()=>setExpDismissed(true)} style={{position:'absolute',top:10,right:12,background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16,lineHeight:1,padding:4}}>×</button>
          <div style={{width:36,height:36,borderRadius:8,background:'var(--navy-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'var(--navy)',flexShrink:0}}><i className="ti ti-home-check" /></div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text-1)',marginBottom:4}}>Your deal command centre</div>
            <div style={{fontSize:12,color:'var(--text-2)',lineHeight:1.7}}>Summary shows next actions, tab progress, and recent activity. <strong style={{color:'var(--text-1)'}}>Deal Status</strong> tracks reservation countdown, key dates, and fees. Use <strong style={{color:'var(--text-1)'}}>Close deal</strong> when the deal completes or falls through.</div>
          </div>
        </div>
      ) : (
        <button onClick={()=>setExpDismissed(false)} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text-2)',background:'var(--bg-sec)',border:'.5px solid var(--ds-border)',borderRadius:20,padding:'4px 12px',cursor:'pointer',marginBottom:12,width:'fit-content'}}>
          <i className="ti ti-book-2" style={{fontSize:11}} /> Page guide
        </button>
      )}

      {/* ─── Archived banner ──────────────────────────────────────────────── */}
      <div className={`archived-banner${archivedBanner ? (archivedSuccess ? ' show complete' : ' show') : ''}`}>
        <span style={{ fontSize: '16px' }}>{archivedSuccess ? '✅' : '📁'}</span>
        <span className="archived-banner-msg">{archivedMsg}</span>
        <button className="archived-banner-undo" onClick={() => setArchivedBanner(false)}>Undo</button>
      </div>

      {/* ─── Deal Hero ────────────────────────────────────────────────────── */}
      <div className="deal-hero" style={{ marginTop: 16 }}>
        <div className="hero-score-ring">
          {deal.deal_score === 'RECOMMENDED' ? (
            <>
              <div className="hero-score-num" style={{ fontSize: '18px' }}>✓</div>
              <div className="hero-score-lbl">Score</div>
            </>
          ) : deal.deal_score === 'REVIEW' ? (
            <>
              <div className="hero-score-num" style={{ fontSize: '18px', color: '#FCD34D' }}>⚠</div>
              <div className="hero-score-lbl">Review</div>
            </>
          ) : deal.deal_score ? (
            <>
              <div className="hero-score-num" style={{ fontSize: '18px', color: '#f87171' }}>✗</div>
              <div className="hero-score-lbl">Score</div>
            </>
          ) : (
            <>
              <div className="hero-score-num" style={{ fontSize: '14px', color: 'rgba(52,211,153,.4)' }}>?</div>
              <div className="hero-score-lbl">No score</div>
            </>
          )}
        </div>

        <div className="hero-info">
          <div className="hero-title pii">{deal.address ?? 'No address set'}</div>
          <div className="hero-sub">
            <span>🏠 {stratLabel}</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>📅 Created {daysSince} day{daysSince === 1 ? '' : 's'} ago</span>
            {deal.purchase_price && (
              <>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>{fCurrency(deal.purchase_price)}</span>
              </>
            )}
          </div>
          <div className="hero-pills">
            {deal.deal_score && verdictCfg ? (
              <span className={`hero-pill ${deal.deal_score === 'RECOMMENDED' ? 'teal' : deal.deal_score === 'REVIEW' ? 'amber' : 'grey'}`}>
                {deal.deal_score === 'RECOMMENDED' ? '✓ Recommended' : deal.deal_score === 'REVIEW' ? '⚠ Review deal' : '✗ Not recommended'}
              </span>
            ) : (
              <span className="hero-pill white">No score yet</span>
            )}
            <span className="hero-pill white">{stratLabel}</span>
            {deal.status === 'analysing' && (
              <span className="hero-pill amber">⚠ Run analysis to score</span>
            )}
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-status-lbl">Current status</div>
          <div className="hero-status-val">{STATUS_LABELS[deal.status]}</div>
          <div className="hero-days">Day {daysSince} of deal</div>
          <button
            className="action-btn"
            style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }}
            onClick={() => setCloseDealOpen(true)}
          >
            ✓ Close deal
          </button>
        </div>
      </div>

      {/* ─── Deal Flow Rail ───────────────────────────────────────────────── */}
      <div className="flow-rail">
        {FLOW_STAGES.flatMap((stage, i) => {
          const isDone   = stageIdx >= 0 && i < stageIdx
          const isActive = i === stageIdx
          const isWarn   = isActive && deal.status === 'analysing'
          const items = [
            <div key={`step-${i}`} className="flow-step">
              <div className={`flow-node ${isDone ? 'done' : isActive ? (isWarn ? 'warn' : 'active') : 'future'}`}>
                {isDone ? '✓' : stage.icon}
              </div>
              <div className={`flow-lbl${isDone ? ' done' : isActive ? (isWarn ? ' warn' : ' active') : ''}`}>
                {stage.label}
              </div>
            </div>,
          ]
          if (i < FLOW_STAGES.length - 1) {
            items.push(
              <div key={`conn-${i}`} className={`flow-connector${isDone ? ' done' : isActive ? ' active' : ''}`} />
            )
          }
          return items
        })}
      </div>

      {/* ─── Split: left + right sidebar ─────────────────────────────────── */}
      <div className="split">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div>

          {/* Next actions */}
          <div className="sec">
            <div className="sec-hdr">
              <i className="ti ti-bolt" style={{ fontSize: '14px', color: 'var(--amber)' }} />
              <div className="sec-title">Next actions</div>
              <span className="sec-badge amber">
                {deal.status === 'analysing' ? '1 item' : '2 items'}
              </span>
            </div>
            <div style={{ padding: '0 16px' }}>

              {deal.status === 'analysing' && (
                <div className="action-item">
                  <div className="action-dot warn" />
                  <div className="action-body">
                    <div className="action-title">Run analysis to score this deal</div>
                    <div className="action-sub">No analysis has been run yet. Add your financial inputs and run the deal score to see returns.</div>
                    <div className="action-btns">
                      <button className="action-btn primary" onClick={() => onTabChange('analysis')}>
                        → Go to Analysis
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(deal.status === 'reviewing' || deal.status === 'presenting' || deal.status === 'closed') && (
                <div className="action-item">
                  <div className="action-dot info" />
                  <div className="action-body">
                    <div className="action-title">Review analysis results</div>
                    <div className="action-sub">
                      {deal.deal_score
                        ? `Deal scored as ${deal.deal_score.charAt(0) + deal.deal_score.slice(1).toLowerCase()}. Review the full breakdown before sharing.`
                        : 'Analysis run. Verify the results before sharing with investors.'}
                    </div>
                    <div className="action-btns">
                      <button className="action-btn primary" onClick={() => onTabChange('analysis')}>
                        📊 View Results
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {deal.packs_generated === 0 && deal.status !== 'analysing' && (
                <div className="action-item">
                  <div className="action-dot warn" />
                  <div className="action-body">
                    <div className="action-title">Deal pack not yet created</div>
                    <div className="action-sub">No investor pack has been generated for this deal. Create a pack before sharing with investors.</div>
                    <div className="action-btns">
                      <button className="action-btn primary" onClick={() => onTabChange('content')}>
                        📦 Create pack
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {deal.packs_generated > 0 && (
                <div className="action-item">
                  <div className="action-dot" style={{ background: 'var(--teal)' }} />
                  <div className="action-body">
                    <div className="action-title">{deal.packs_generated} pack{deal.packs_generated > 1 ? 's' : ''} ready — share with investors</div>
                    <div className="action-sub">Your investor pack is ready. Share it with potential investors from the Investors tab.</div>
                    <div className="action-btns">
                      <button className="action-btn teal" onClick={() => onTabChange('investors')}>
                        📤 Go to Investors
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {deal.status === 'presenting' && (
                <div className="action-item">
                  <div className="action-dot" style={{ background: '#8b5cf6' }} />
                  <div className="action-body">
                    <div className="action-title">Deal is live — log investor responses</div>
                    <div className="action-sub">Your deal pack has been sent. Keep investor interest up to date in the Investors tab.</div>
                    <div className="action-btns">
                      <button className="action-btn" style={{ background: '#5b21b6', color: '#fff', border: 'none' }} onClick={() => onTabChange('investors')}>
                        👥 Manage investors
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Tab status checklist */}
          <div className="sec">
            <div className="sec-hdr">
              <i className="ti ti-layout-list" style={{ fontSize: '14px', color: 'var(--navy)' }} />
              <div className="sec-title">Tab status</div>
            </div>
            <div>
              <div className="tab-row" onClick={() => onTabChange('analysis')}>
                <div className={`tab-icon ${deal.deal_score ? 'done' : 'warn'}`}>
                  {deal.deal_score ? <i className="ti ti-check" /> : <i className="ti ti-alert-triangle" />}
                </div>
                <div className="tab-row-body">
                  <div className="tab-row-name">Analysis</div>
                  <div className={`tab-row-sub ${deal.deal_score ? 'good' : 'warn'}`}>
                    {deal.deal_score
                      ? `Scored · ${deal.deal_score.charAt(0) + deal.deal_score.slice(1).toLowerCase()}`
                      : 'No score yet — run analysis'}
                  </div>
                </div>
                <span className={`tab-row-badge ${deal.deal_score ? 'green' : 'amber'}`}>
                  {deal.deal_score ? 'Scored' : 'Pending'}
                </span>
                <span className="tab-row-arrow">›</span>
              </div>

              <div className="tab-row" onClick={() => onTabChange('content')}>
                <div className={`tab-icon ${deal.packs_generated > 0 ? 'done' : 'warn'}`}>
                  {deal.packs_generated > 0 ? <i className="ti ti-check" /> : <i className="ti ti-alert-triangle" />}
                </div>
                <div className="tab-row-body">
                  <div className="tab-row-name">Content</div>
                  <div className={`tab-row-sub ${deal.packs_generated > 0 ? 'good' : 'warn'}`}>
                    {deal.packs_generated > 0
                      ? `${deal.packs_generated} pack${deal.packs_generated > 1 ? 's' : ''} generated`
                      : 'No pack created yet'}
                  </div>
                </div>
                <span className={`tab-row-badge ${deal.packs_generated > 0 ? 'green' : 'amber'}`}>
                  {deal.packs_generated > 0 ? 'Ready' : 'Draft'}
                </span>
                <span className="tab-row-arrow">›</span>
              </div>

              <div className="tab-row" onClick={() => onTabChange('seller')}>
                <div className="tab-icon info"><i className="ti ti-user" /></div>
                <div className="tab-row-body">
                  <div className="tab-row-name">Seller</div>
                  <div className="tab-row-sub">View seller details</div>
                </div>
                <span className="tab-row-badge navy">Review</span>
                <span className="tab-row-arrow">›</span>
              </div>

              <div className="tab-row" onClick={() => onTabChange('investors')}>
                <div className={`tab-icon ${deal.status === 'closed' ? 'done' : deal.status === 'presenting' ? 'teal' : 'info'}`}>
                  <i className="ti ti-users" />
                </div>
                <div className="tab-row-body">
                  <div className="tab-row-name">Investors</div>
                  <div className={`tab-row-sub ${deal.status === 'presenting' ? 'good' : ''}`}>
                    {deal.status === 'closed' ? 'Deal closed'
                      : deal.status === 'presenting' ? 'Pack sent to investors'
                      : 'No investors yet'}
                  </div>
                </div>
                <span className={`tab-row-badge ${deal.status === 'closed' ? 'green' : deal.status === 'presenting' ? 'teal' : 'navy'}`}>
                  {deal.status === 'closed' ? 'Closed' : deal.status === 'presenting' ? 'Active' : 'Waiting'}
                </span>
                <span className="tab-row-arrow">›</span>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="sec">
            <div className="sec-hdr">
              <i className="ti ti-activity" style={{ fontSize: '14px', color: 'var(--navy)' }} />
              <div className="sec-title">Recent activity</div>
            </div>
            <div style={{ padding: '4px 16px' }}>
              {activityItems.map((item, i) => (
                <div key={i} className="act-item">
                  <div className="act-line">
                    <div className={`act-dot ${
                      item.dot === TEAL  ? 'teal'
                      : item.dot === NAVY  ? 'navy'
                      : item.dot === AMBER ? 'amber'
                      : item.dot === '#8b5cf6' ? 'purple'
                      : 'grey'
                    }`} />
                    {i < activityItems.length - 1 && <div className="act-line-trail" />}
                  </div>
                  <div className="act-body">
                    <div className="act-text">{item.text}</div>
                    <div className="act-time">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>{/* /left */}

        {/* ── RIGHT SIDEBAR ───────────────────────────────────────────────── */}
        <div className="right-sticky">

          {/* Cooling-off countdown */}
          {(() => {
            const coolingTotal = 14
            const daysIn = Math.min(daysSince, coolingTotal)
            const coolingRemaining = Math.max(0, coolingTotal - daysSince)
            const circumference = 175.9
            const strokeOffset = circumference * (1 - daysIn / coolingTotal)
            return (
              <div className="sbar-card">
                <div className="sbar-hdr">
                  <div className="sbar-icon" style={{ background: '#fef3c7' }}>
                    <i className="ti ti-hourglass" style={{ color: '#92400e' }} />
                  </div>
                  <div className="sbar-hdr-text">
                    <div className="sbar-title">Cooling-off countdown</div>
                    <div className="sbar-subtitle">
                      {coolingRemaining > 0
                        ? `${coolingRemaining} day${coolingRemaining === 1 ? '' : 's'} remaining`
                        : 'Period ended'}
                    </div>
                  </div>
                  <span className={`sbar-badge ${coolingRemaining > 3 ? 'navy' : 'amber'}`}>
                    Day {daysIn}/{coolingTotal}
                  </span>
                </div>
                <div className="sbar-body">
                  <div className="countdown-wrap">
                    <div className="countdown-ring">
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                        <circle cx="32" cy="32" r="28" fill="none" stroke="var(--navy)" strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeOffset}
                          style={{ transform: 'rotate(-90deg)', transformOrigin: '32px 32px' }}
                        />
                      </svg>
                      <div className="countdown-ring-num">{coolingRemaining}</div>
                    </div>
                    <div className="countdown-text">
                      <div className="countdown-text-main">
                        {coolingRemaining > 0 ? `${coolingRemaining} days remaining` : 'Period ended'}
                      </div>
                      <div className="countdown-text-sub">
                        {coolingRemaining > 0
                          ? `Pack release due day ${coolingTotal + 1}.`
                          : 'Cooling-off period has passed.'}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 14px 12px' }}>
                  <button className="sbar-cta" onClick={() => navigate(`/deal/${deal.id}?tab=overview&view=status`)}>
                    → View deal status
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Key metrics */}
          <div className="sbar-card">
            <div className="sbar-hdr">
              <div className="sbar-icon"><i className="ti ti-calculator" /></div>
              <div className="sbar-hdr-text">
                <div className="sbar-title">Key metrics</div>
                <div className="sbar-subtitle">From Results · read-only</div>
              </div>
              <span className={`sbar-badge ${deal.deal_score === 'RECOMMENDED' ? 'green' : deal.deal_score === 'REVIEW' ? 'amber' : 'navy'}`}>
                {deal.deal_score ? deal.deal_score.charAt(0) + deal.deal_score.slice(1).toLowerCase() : 'No score'}
              </span>
            </div>
            <div className="sbar-body">
              <div className="sbar-metric">
                <span className="sbar-metric-lbl">Purchase price</span>
                <span className="sbar-metric-val navy">{fCurrency(deal.purchase_price)}</span>
              </div>
              <div className="sbar-metric">
                <span className="sbar-metric-lbl">Monthly cash flow</span>
                <span className="sbar-metric-val teal">
                  {deal.cash_flow !== null
                    ? (deal.cash_flow >= 0 ? '+' : '') + fCurrency(deal.cash_flow) + '/mo'
                    : '—'}
                </span>
              </div>
              <div className="sbar-metric">
                <span className="sbar-metric-lbl">Gross yield</span>
                <span className="sbar-metric-val">{fPct(deal.gross_yield)}</span>
              </div>
              <div className="sbar-metric">
                <span className="sbar-metric-lbl">CoC ROI</span>
                <span className="sbar-metric-val">{fPct(deal.coc_roi)}</span>
              </div>
              {deal.market_value && (
                <div className="sbar-metric">
                  <span className="sbar-metric-lbl">Market value</span>
                  <span className="sbar-metric-val">{fCurrency(deal.market_value)}</span>
                </div>
              )}
              {deal.purchase_price && deal.market_value && deal.market_value > deal.purchase_price && (
                <div className="sbar-metric">
                  <span className="sbar-metric-lbl">Discount</span>
                  <span className="sbar-metric-val teal">
                    {fPct(((deal.market_value - deal.purchase_price) / deal.market_value) * 100)}
                  </span>
                </div>
              )}
              <div className="sbar-metric">
                <span className="sbar-metric-lbl">Packs generated</span>
                <span className="sbar-metric-val">
                  {deal.packs_generated > 0
                    ? `${deal.packs_generated} pack${deal.packs_generated > 1 ? 's' : ''}`
                    : 'None'}
                </span>
              </div>
            </div>
            <div style={{ padding: '0 14px 12px' }}>
              <button className="sbar-cta outline" onClick={() => onTabChange('analysis')}>
                → Full Results
              </button>
            </div>
          </div>

          {/* Investor snapshot */}
          <div className="sbar-card">
            <div className="sbar-hdr">
              <div className="sbar-icon"><i className="ti ti-users" /></div>
              <div className="sbar-hdr-text">
                <div className="sbar-title">Investors</div>
                <div className="sbar-subtitle">Investor engagement snapshot</div>
              </div>
              <span className={`sbar-badge ${deal.status === 'presenting' ? 'green' : 'navy'}`}>
                {deal.status === 'presenting' ? 'Active' : 'Pending'}
              </span>
            </div>
            <div className="sbar-body" style={{ fontSize: '12px', color: '#5a6270', lineHeight: 1.5 }}>
              {deal.packs_generated === 0
                ? 'No pack created yet. Create a pack and share it to track investor engagement.'
                : deal.status === 'presenting'
                  ? 'Pack sent. Monitor investor responses from the Investors tab.'
                  : 'Investor management available once the deal pack is ready and shared.'}
            </div>
            <div style={{ padding: '0 14px 12px' }}>
              <button className="sbar-cta outline" onClick={() => onTabChange('investors')}>
                👥 Manage investors →
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="sbar-card">
            <div className="sbar-hdr">
              <div className="sbar-icon"><i className="ti ti-bolt" /></div>
              <div className="sbar-hdr-text">
                <div className="sbar-title">Quick actions</div>
              </div>
            </div>
            <div className="sbar-body" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button className="sbar-cta teal" onClick={() => onTabChange('analysis')}>
                📊 View analysis
              </button>
              {deal.packs_generated > 0
                ? <button className="sbar-cta" onClick={() => onTabChange('investors')}>📤 Share with investor</button>
                : <button className="sbar-cta" onClick={() => onTabChange('content')}>📦 Create deal pack</button>
              }
              <button className="sbar-cta outline" onClick={() => setCloseDealOpen(true)}>
                ✓ Close deal
              </button>
              <div className="sbar-note">
                <span>ℹ️</span>
                <span>Strategy: {stratLabel}{deal.purchase_price ? ` · ${fCurrency(deal.purchase_price)}` : ''}</span>
              </div>
            </div>
          </div>

        </div>{/* /sidebar */}

      </div>{/* /split */}

      {/* ─── Close Deal Modal ─────────────────────────────────────────────── */}
      {closeDealOpen && (
        <CloseDealModal
          onClose={() => setCloseDealOpen(false)}
          onConfirm={handleConfirmClose}
        />
      )}

      </>}

      {overviewView === 'status' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, alignItems: 'start' }}>

          {/* ── Deal Status educator banner ─────────── */}
          {!dealStatusEducatorDismissed && (
            <div style={{ gridColumn: '1 / -1', background: '#fff', border: '.5px solid var(--ds-border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--navy-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--navy)', flexShrink: 0 }}>
                <i className="ti ti-clipboard-list" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>Track your deal's progress</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>Deal Status tracks reservation countdown, key dates, and fees. Use <strong style={{ color: 'var(--text-1)' }}>Close deal</strong> when the deal completes or falls through.</div>
              </div>
              <button onClick={() => setDealStatusEducatorDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, lineHeight: 1, padding: 4 }} aria-label="Dismiss">×</button>
            </div>
          )}

          {/* ── Left column ─────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* 1. Key dates */}
            <div className="sec">
              <div className="sec-hdr">
                <i className="ti ti-calendar" style={{ color: '#92400e' }} />
                <div className="sec-hdr-text"><div className="sec-title">Key dates</div></div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(217,119,6,.1)', color: '#92400e' }}>Cooling-off · Day 8/14</span>
              </div>
              <div className="key-dates-row" style={{ padding: '14px 16px' }}>
                {[
                  { lbl: 'Reserved on',      val: '14 Jun 2025', sub: 'Day 1' },
                  { lbl: 'Cooling-off ends', val: '27 Jun 2025', sub: '13 days remaining' },
                  { lbl: 'Pack release due', val: '28 Jun 2025', sub: 'Day 15' },
                ].map(({ lbl, val, sub }) => (
                  <div key={lbl} className="kd-cell">
                    <div className="kd-lbl">{lbl}</div>
                    <div className="kd-val">{val}</div>
                    <div className="kd-sub">{sub}</div>
                  </div>
                ))}
              </div>
              <div className="milestone-card" style={{ margin: '0 16px 14px' }}>
                <div className="milestone-icon"><i className="ti ti-flag" /></div>
                <div>
                  <div className="milestone-title">Day 15 — time to release the investor pack</div>
                  <div className="milestone-body">The cooling-off period ends tomorrow. Release the pack to <strong>move the deal forward</strong> and keep your buyer engaged.</div>
                  <button className="cbtn cbtn-primary" style={{ fontSize: 11 }} onClick={() => onTabChange('content')}>
                    Go to investor pack <i className="ti ti-arrow-right" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Reservation & fees */}
            <div className="sec">
              <div className="sec-hdr">
                <i className="ti ti-receipt" />
                <div className="sec-hdr-text"><div className="sec-title">Reservation &amp; fees</div></div>
                <button className="log-btn" style={{ borderRadius: 7 }}><i className="ti ti-edit" style={{ fontSize: 11 }} /> Edit</button>
              </div>
              <div style={{ padding: '4px 16px 12px' }}>
                <div className="resv-row"><i className="ti ti-user" /><span className="resv-lbl">Reserved by</span><span className="resv-val">Mr James Thornton</span></div>
                <div className="resv-row"><i className="ti ti-coin" /><span className="resv-lbl">Reservation fee</span><span className="resv-val">£2,500</span></div>
                <div className="resv-row"><i className="ti ti-report-money" /><span className="resv-lbl">Sourcing fee</span><span className="resv-val">£5,000 (inc. VAT)</span></div>
                <div className="resv-row"><i className="ti ti-file-check" /><span className="resv-lbl">Agreement status</span><span className="resv-val"><span className="resv-tag signed">✓ Signed</span></span></div>
              </div>
            </div>

            {/* 3. Deal stage */}
            <div className="sec">
              <div className="sec-hdr">
                <i className="ti ti-route" />
                <div className="sec-hdr-text"><div className="sec-title">Deal stage</div></div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(217,119,6,.1)', color: '#92400e' }}>Step 4 of 7</span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                {[
                  { label: 'Sourced & analysed',    sub: 'Deal identified, numbers checked',            state: 'done'    },
                  { label: 'Pack prepared',          sub: 'Investor pack built and reviewed',            state: 'done'    },
                  { label: 'Shared with investors',  sub: 'Pack sent to buyer list',                     state: 'done'    },
                  { label: 'Reserved',               sub: 'Buyer paid reservation, cooling-off active',  state: 'active'  },
                  { label: 'Cooling-off complete',   sub: 'Cooling-off period passed',                   state: 'pending' },
                  { label: 'Legal completion',       sub: 'Contracts exchanged',                         state: 'pending' },
                  { label: 'Deal closed',            sub: 'Sourcing fee received',                       state: 'pending' },
                ].map(({ label, sub, state }, idx, arr) => (
                  <div key={label} className="stage-row">
                    <div className="stage-col">
                      <div className={`stage-dot ${state}`} />
                      {idx < arr.length - 1 && <div className={`stage-line ${state === 'done' ? 'done' : state === 'active' ? 'partial' : ''}`} />}
                    </div>
                    <div className="stage-body">
                      <div className={`stage-title ${state}`}>
                        {label} <span className={`stage-pill ${state}`}>{state === 'done' ? 'Done' : state === 'active' ? 'Active' : 'Pending'}</span>
                      </div>
                      <div className="stage-sub">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Next actions */}
            <div className="sec">
              <div className="sec-hdr">
                <i className="ti ti-bolt" />
                <div className="sec-hdr-text"><div className="sec-title">Next actions</div></div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(29,158,117,.1)', color: 'var(--teal)' }}>3 actions</span>
              </div>
              <div style={{ padding: '4px 16px 12px' }}>
                {[
                  { dot: 'urgent', title: 'Release investor pack tomorrow', sub: 'Cooling-off ends 27 Jun — pack due on day 15',    btns: ['Release pack'] },
                  { dot: 'warn',   title: 'Confirm solicitor details',      sub: 'Legal completion needs solicitor contact on file', btns: ['Add details'] },
                  { dot: 'info',   title: 'Request proof of funds',         sub: 'Buyer has not submitted proof of funds document',  btns: ['Send reminder'] },
                ].map(({ dot, title, sub, btns }) => (
                  <div key={title} className="action-item">
                    <div className={`action-dot ${dot}`} />
                    <div style={{ flex: 1 }}>
                      <div className="action-title">{title}</div>
                      <div className="action-sub">{sub}</div>
                    </div>
                    <div className="action-btns">
                      {btns.map(b => <button key={b} className="log-btn" style={{ borderRadius: 7, fontSize: 10 }}>{b}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Activity */}
            <div className="sec">
              <div className="sec-hdr">
                <i className="ti ti-activity" />
                <div className="sec-hdr-text"><div className="sec-title">Activity</div></div>
              </div>
              <div style={{ padding: '4px 16px 14px' }}>
                {[
                  { dot: '#10b981',     text: 'Reservation received from Mr James Thornton', time: '14 Jun 2025, 11:42' },
                  { dot: 'var(--navy)', text: 'Deal marked as Reserved',                     time: '14 Jun 2025, 11:40' },
                  { dot: 'var(--navy)', text: 'Investor pack shared with 6 buyers',          time: '10 Jun 2025, 09:15' },
                  { dot: '#9ca3af',     text: 'Deal pack created',                           time: '7 Jun 2025, 14:22'  },
                  { dot: '#9ca3af',     text: 'Analysis completed — score: Recommended',     time: '3 Jun 2025, 16:05'  },
                ].map(({ dot, text, time }, i) => (
                  <div key={i} className="act-item">
                    <div className="act-dot" style={{ background: dot }} />
                    <div style={{ flex: 1 }}>
                      <div className="act-text">{text}</div>
                      <div className="act-time">{time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Right column (sticky sidebar) ────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 0 }}>

            {/* Cooling-off countdown */}
            <div className="sbar-card">
              <div className="sbar-hdr">
                <div className="sbar-icon"><i className="ti ti-clock" /></div>
                <div className="sbar-hdr-text">
                  <div className="sbar-title">Cooling-off</div>
                  <div className="sbar-subtitle">14-day buyer protection</div>
                </div>
                <span className="sbar-badge" style={{ background: 'rgba(217,119,6,.1)', color: '#92400e' }}>Day 8/14</span>
              </div>
              <div className="sbar-countdown">
                <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #D97706', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <div className="countdown-num">6</div>
                  <div className="countdown-lbl">days left</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>Ends 27 Jun 2025</div>
                  <div style={{ fontSize: 10, color: '#92400e', background: 'rgba(217,119,6,.08)', border: '.5px solid rgba(217,119,6,.25)', borderRadius: 6, padding: '4px 8px', lineHeight: 1.4 }}>Release pack on day 15 to keep deal moving</div>
                </div>
              </div>
            </div>

            {/* Investors snapshot */}
            <div className="sbar-card">
              <div className="sbar-hdr">
                <div className="sbar-icon"><i className="ti ti-users" /></div>
                <div className="sbar-hdr-text">
                  <div className="sbar-title">Investors</div>
                  <div className="sbar-subtitle">Buyer engagement</div>
                </div>
              </div>
              <div className="sbar-body">
                {[
                  { lbl: 'Interested',  val: '4' },
                  { lbl: 'Pack shared', val: '6' },
                  { lbl: 'Pledged',     val: '1' },
                ].map(({ lbl, val }) => (
                  <div key={lbl} className="sbar-metric">
                    <span className="sbar-metric-lbl">{lbl}</span>
                    <span className="sbar-metric-val navy">{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 14px 12px' }}>
                <button className="sbar-cta" onClick={() => onTabChange('investors')}>View investors →</button>
              </div>
            </div>

            {/* Quick links */}
            <div className="sbar-card">
              <div className="sbar-hdr">
                <div className="sbar-icon"><i className="ti ti-link" /></div>
                <div className="sbar-hdr-text"><div className="sbar-title">Quick links</div></div>
              </div>
              <div style={{ padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="sbar-cta outline" onClick={() => onTabChange('analysis')}>→ Analysis tab</button>
                <button className="sbar-cta outline" onClick={() => onTabChange('content')}>→ Content tab</button>
                <button className="sbar-cta outline" onClick={() => onTabChange('fees')}>→ Fees tab</button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: color ?? '#1a2332', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
}

function ActionItem({ dot, title, sub, buttons }: {
  dot: string; title: string; sub: string
  buttons: { label: string; color: string; onClick: () => void }[]
}) {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '12px 16px', borderBottom: `.5px solid ${DS_BORDER}` }}>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: dot, flexShrink: 0, marginTop: '5px',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a2332', marginBottom: '4px', lineHeight: 1.4 }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#5a6270', lineHeight: 1.5, marginBottom: '10px' }}>{sub}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '6px 12px', borderRadius: '7px',
                background: btn.color, color: '#fff', border: 'none',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'opacity .12s',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChecklistRow({ icon, iconBg, name, sub, badge, badgeColor, onClick }: {
  icon: string; iconBg: string; name: string; sub: string
  badge: string; badgeColor: 'green' | 'amber' | 'teal' | 'navy'
  onClick: () => void
}) {
  const badgeBg: Record<string, string> = {
    green: '#d1fae5', amber: '#fef3c7', teal: '#ccfbf1', navy: 'rgba(27,58,107,.1)',
  }
  const badgeTxt: Record<string, string> = {
    green: '#065f46', amber: '#92400e', teal: '#0f766e', navy: NAVY,
  }
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: '12px',
        padding: '11px 16px', background: 'none', border: 'none', borderBottom: `.5px solid ${DS_BORDER}`,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        transition: 'background .1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = BG_SEC)}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <div style={{
        width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
        background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', color: '#fff',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a2332' }}>{name}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      <span style={{
        fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
        background: badgeBg[badgeColor], color: badgeTxt[badgeColor],
      }}>
        {badge}
      </span>
      <span style={{ fontSize: '10px', color: 'var(--text-2)', flexShrink: 0 }}>›</span>
    </button>
  )
}
