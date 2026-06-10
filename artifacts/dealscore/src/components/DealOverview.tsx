import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Deal, DealStatus } from '../lib/database.types'
import type { TabKey } from './DealChrome'

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY      = '#1B3A6B'
const NAVY_DARK = '#152d55'
const TEAL      = '#1D9E75'
const DS_BORDER = '#e3e5e9'
const BG_SEC    = '#f5f6f8'
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
        {subtitle && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>{subtitle}</div>}
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
}

export default function DealOverview({ deal, onTabChange }: Props) {
  const [closeDealOpen, setCloseDealOpen]     = useState(false)
  const [closedOutcome, setClosedOutcome]     = useState<string | null>(null)
  const [archivedBanner, setArchivedBanner]   = useState(false)
  const [archivedMsg, setArchivedMsg]         = useState('')
  const [archivedSuccess, setArchivedSuccess] = useState(false)

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
    { dot: '#9ca3af', text: `Last updated · ${stratLabel} inputs`,                          time: fDate(deal.updated_at) },
  ].filter(a => a.time !== '—')

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px 60px', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ─── Archived banner ──────────────────────────────────────────────── */}
      {archivedBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: archivedSuccess ? '#d1fae5' : '#fee2e2',
          border: `.5px solid ${archivedSuccess ? '#6ee7b7' : '#fca5a5'}`,
          borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
          fontSize: '12px', fontWeight: 500,
          color: archivedSuccess ? '#065f46' : '#991b1b',
        }}>
          <span style={{ fontSize: '16px' }}>{archivedSuccess ? '✅' : '📁'}</span>
          <span style={{ flex: 1 }}>{archivedMsg}</span>
          <button
            onClick={() => setArchivedBanner(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '11px', fontWeight: 600,
              color: archivedSuccess ? '#065f46' : '#991b1b',
              fontFamily: 'inherit', padding: '2px 8px',
              borderRadius: '6px', flexShrink: 0,
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* ─── Deal Hero ────────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY_DARK} 0%, ${NAVY} 100%)`,
        borderRadius: '14px', padding: '22px 24px', marginBottom: '16px',
        display: 'flex', alignItems: 'flex-start', gap: '20px',
      }}>
        {/* Score ring */}
        <ScoreRing verdict={deal.deal_score} />

        {/* Hero info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pii" style={{
            fontSize: '17px', fontWeight: 700, color: '#fff',
            marginBottom: '6px', lineHeight: 1.3,
          }}>
            {deal.address ?? 'No address set'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🏠 {stratLabel}
            </span>
            <span style={{ color: 'rgba(255,255,255,.25)', fontSize: '11px' }}>·</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📅 Created {daysSince} day{daysSince === 1 ? '' : 's'} ago
            </span>
            {deal.purchase_price && (
              <>
                <span style={{ color: 'rgba(255,255,255,.25)', fontSize: '11px' }}>·</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)' }}>
                  {fCurrency(deal.purchase_price)}
                </span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {deal.deal_score && verdictCfg && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: 700, padding: '3px 10px',
                background: verdictCfg.bg, color: deal.deal_score === 'RECOMMENDED' ? '#065f46' : deal.deal_score === 'REVIEW' ? '#92400e' : '#991b1b',
                borderRadius: '20px',
              }}>
                {deal.deal_score === 'RECOMMENDED' ? '✓' : deal.deal_score === 'REVIEW' ? '⚠' : '✗'} {deal.deal_score.charAt(0) + deal.deal_score.slice(1).toLowerCase()} deal
              </span>
            )}
            {!deal.deal_score && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: 700, padding: '3px 10px',
                background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)',
                borderRadius: '20px',
              }}>
                No score yet
              </span>
            )}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '10px', fontWeight: 600, padding: '3px 10px',
              background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)',
              borderRadius: '20px',
            }}>
              {stratLabel}
            </span>
            {deal.status === 'analysing' && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: 700, padding: '3px 10px',
                background: 'rgba(251,191,36,.2)', color: '#FCD34D',
                borderRadius: '20px',
              }}>
                ⚠ Run analysis to score this deal
              </span>
            )}
          </div>
        </div>

        {/* Hero right: status + close deal */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '4px' }}>
            Current status
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
            {STATUS_LABELS[deal.status]}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)', marginBottom: '14px' }}>
            Day {daysSince} of deal
          </div>
          <button
            onClick={() => setCloseDealOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              border: '.5px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.1)',
              color: '#fff', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
              whiteSpace: 'nowrap',
            }}
          >
            ✓ Close deal
          </button>
        </div>
      </div>

      {/* ─── Deal Flow Rail ───────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px',
        padding: '14px 20px', marginBottom: '20px',
        display: 'flex', alignItems: 'center',
      }}>
        {FLOW_STAGES.map((stage, i) => {
          const isDone   = stageIdx >= 0 && i < stageIdx
          const isActive = i === stageIdx
          const isFuture = stageIdx < 0 || i > stageIdx
          return (
            <div key={stage.label} style={{ display: 'flex', alignItems: 'center', flex: i < FLOW_STAGES.length - 1 ? '1 1 auto' : '0 0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, flexShrink: 0, transition: 'all .2s',
                  background: isDone ? TEAL : isActive ? NAVY : BG_SEC,
                  border: isDone ? `2px solid ${TEAL}` : isActive ? `2px solid ${NAVY}` : `.5px solid ${DS_BORDER}`,
                  color: (isDone || isActive) ? '#fff' : '#9ca3af',
                }}>
                  {isDone ? '✓' : stage.icon}
                </div>
                <div style={{
                  fontSize: '9px', fontWeight: 600, whiteSpace: 'nowrap',
                  color: isDone ? TEAL : isActive ? NAVY : '#9ca3af',
                  textTransform: 'uppercase', letterSpacing: '.04em',
                }}>
                  {stage.label}
                </div>
              </div>
              {i < FLOW_STAGES.length - 1 && (
                <div style={{
                  flex: 1, height: '2px', margin: '0 4px', marginBottom: '20px',
                  background: isDone ? TEAL : DS_BORDER,
                  borderRadius: '2px', transition: 'background .2s',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ─── Split: left + right sidebar ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Next actions */}
          <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 16px', borderBottom: `.5px solid ${DS_BORDER}`,
            }}>
              <span style={{ fontSize: '14px' }}>⚡</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2332' }}>Next actions</div>
              <span style={{
                fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                background: '#fef3c7', color: '#92400e', marginLeft: '4px',
              }}>
                {deal.status === 'analysing' ? '1 item' : deal.status === 'reviewing' ? '2 items' : '2 items'}
              </span>
            </div>

            <div style={{ padding: '4px 0 8px' }}>
              {/* Action 1: run/review analysis */}
              {deal.status === 'analysing' && (
                <ActionItem
                  dot={AMBER}
                  title="Run analysis to score this deal"
                  sub="No analysis has been run yet. Add your financial inputs and run the deal score to see returns."
                  buttons={[
                    { label: '→ Go to Analysis', color: NAVY, onClick: () => onTabChange('analysis') },
                  ]}
                />
              )}

              {(deal.status === 'reviewing' || deal.status === 'presenting' || deal.status === 'closed') && (
                <ActionItem
                  dot={TEAL}
                  title="Review analysis results"
                  sub={deal.deal_score
                    ? `Deal scored as ${deal.deal_score.charAt(0) + deal.deal_score.slice(1).toLowerCase()}. Review the full breakdown before sharing.`
                    : 'Analysis run. Verify the results before sharing with investors.'}
                  buttons={[
                    { label: '📊 View Results', color: NAVY, onClick: () => onTabChange('analysis') },
                  ]}
                />
              )}

              {/* Action 2: content / pack */}
              {deal.packs_generated === 0 && deal.status !== 'analysing' && (
                <ActionItem
                  dot={AMBER}
                  title="Deal pack not yet created"
                  sub="No investor pack has been generated for this deal. Create a pack before sharing with investors."
                  buttons={[
                    { label: '📦 Create pack', color: NAVY, onClick: () => onTabChange('content') },
                  ]}
                />
              )}

              {deal.packs_generated > 0 && (
                <ActionItem
                  dot={TEAL}
                  title={`${deal.packs_generated} pack${deal.packs_generated > 1 ? 's' : ''} ready — share with investors`}
                  sub="Your investor pack is ready. Share it with potential investors from the Investors tab."
                  buttons={[
                    { label: '📤 Go to Investors', color: TEAL, onClick: () => onTabChange('investors') },
                  ]}
                />
              )}

              {/* Action 3: close deal prompt for active deals */}
              {deal.status === 'presenting' && (
                <ActionItem
                  dot="#8b5cf6"
                  title="Deal is live — log investor responses"
                  sub="Your deal pack has been sent. Keep investor interest up to date in the Investors tab."
                  buttons={[
                    { label: '👥 Manage investors', color: '#5b21b6', onClick: () => onTabChange('investors') },
                  ]}
                />
              )}
            </div>
          </div>

          {/* Tab status checklist */}
          <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 16px', borderBottom: `.5px solid ${DS_BORDER}`,
            }}>
              <span style={{ fontSize: '14px' }}>📋</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2332' }}>Tab status</div>
            </div>

            <div>
              <ChecklistRow
                icon={deal.deal_score ? '✓' : '⚠'}
                iconBg={deal.deal_score ? TEAL : AMBER}
                name="Analysis"
                sub={deal.deal_score ? `Scored · ${deal.deal_score.charAt(0) + deal.deal_score.slice(1).toLowerCase()}` : 'No score yet — run analysis'}
                badge={deal.deal_score ? 'Scored' : 'Pending'}
                badgeColor={deal.deal_score ? 'green' : 'amber'}
                onClick={() => onTabChange('analysis')}
              />
              <ChecklistRow
                icon={deal.packs_generated > 0 ? '✓' : '⚠'}
                iconBg={deal.packs_generated > 0 ? TEAL : AMBER}
                name="Content"
                sub={deal.packs_generated > 0 ? `${deal.packs_generated} pack${deal.packs_generated > 1 ? 's' : ''} generated` : 'No pack created yet'}
                badge={deal.packs_generated > 0 ? 'Ready' : 'Draft'}
                badgeColor={deal.packs_generated > 0 ? 'green' : 'amber'}
                onClick={() => onTabChange('content')}
              />
              <ChecklistRow
                icon="👤"
                iconBg={NAVY}
                name="Seller"
                sub="View seller details"
                badge="Review"
                badgeColor="navy"
                onClick={() => onTabChange('seller')}
              />
              <ChecklistRow
                icon="👥"
                iconBg={deal.status === 'closed' ? TEAL : NAVY}
                name="Investors"
                sub={deal.status === 'closed' ? 'Deal closed' : deal.status === 'presenting' ? 'Pack sent to investors' : 'No investors yet'}
                badge={deal.status === 'closed' ? 'Closed' : deal.status === 'presenting' ? 'Active' : 'Waiting'}
                badgeColor={deal.status === 'closed' ? 'green' : deal.status === 'presenting' ? 'teal' : 'navy'}
                onClick={() => onTabChange('investors')}
              />
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 16px', borderBottom: `.5px solid ${DS_BORDER}`,
            }}>
              <span style={{ fontSize: '14px' }}>📈</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a2332' }}>Recent activity</div>
            </div>

            <div style={{ padding: '8px 16px 12px' }}>
              {activityItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: i < activityItems.length - 1 ? '10px' : 0 }}>
                  {/* Timeline dot + trail */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.dot, flexShrink: 0, marginTop: '4px' }} />
                    {i < activityItems.length - 1 && (
                      <div style={{ width: '1px', flex: 1, background: DS_BORDER, marginTop: '4px' }} />
                    )}
                  </div>
                  {/* Body */}
                  <div style={{ paddingBottom: i < activityItems.length - 1 ? '10px' : 0 }}>
                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.45 }}>{item.text}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>{/* /left */}

        {/* ── RIGHT SIDEBAR 280px ─────────────────────────────────────────── */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Key metrics */}
          <SidebarCard>
            <SbarHdr
              icon="🧮"
              title="Key metrics"
              subtitle="From Results · read-only"
              badge={deal.deal_score ? deal.deal_score.charAt(0) + deal.deal_score.slice(1).toLowerCase() : 'No score'}
              badgeColor={deal.deal_score === 'RECOMMENDED' ? 'green' : deal.deal_score === 'REVIEW' ? 'amber' : 'navy'}
            />
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <MetricRow label="Purchase price" value={fCurrency(deal.purchase_price)} color={NAVY} />
              <MetricRow label="Monthly cash flow" value={deal.cash_flow !== null ? (deal.cash_flow >= 0 ? '+' : '') + fCurrency(deal.cash_flow) + '/mo' : '—'} color={TEAL} />
              <MetricRow label="Gross yield" value={fPct(deal.gross_yield)} />
              <MetricRow label="CoC ROI" value={fPct(deal.coc_roi)} />
              {deal.market_value && (
                <MetricRow label="Market value" value={fCurrency(deal.market_value)} />
              )}
              {deal.purchase_price && deal.market_value && deal.market_value > deal.purchase_price && (
                <MetricRow
                  label="Discount"
                  value={fPct(((deal.market_value - deal.purchase_price) / deal.market_value) * 100)}
                  color={TEAL}
                />
              )}
              <MetricRow label="Packs generated" value={deal.packs_generated > 0 ? `${deal.packs_generated} pack${deal.packs_generated > 1 ? 's' : ''}` : 'None'} />
            </div>
            <div style={{ padding: '0 14px 12px' }}>
              <SbarCta variant="outline" onClick={() => onTabChange('analysis')}>
                → Full Results
              </SbarCta>
            </div>
          </SidebarCard>

          {/* Investor snapshot */}
          <SidebarCard>
            <SbarHdr
              icon="👥"
              title="Investors"
              subtitle="Investor engagement snapshot"
              badge={deal.status === 'presenting' ? 'Active' : 'Pending'}
              badgeColor={deal.status === 'presenting' ? 'teal' : 'navy'}
            />
            <div style={{ padding: '12px 14px', fontSize: '12px', color: '#5a6270', lineHeight: 1.5 }}>
              {deal.packs_generated === 0
                ? 'No pack created yet. Create a pack and share it to track investor engagement.'
                : deal.status === 'presenting'
                  ? 'Pack sent. Monitor investor responses from the Investors tab.'
                  : 'Investor management available once the deal pack is ready and shared.'
              }
            </div>
            <div style={{ padding: '0 14px 12px' }}>
              <SbarCta variant="outline" onClick={() => onTabChange('investors')}>
                👥 Manage investors →
              </SbarCta>
            </div>
          </SidebarCard>

          {/* Quick actions */}
          <SidebarCard>
            <SbarHdr icon="⚡" title="Quick actions" />
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SbarCta variant="teal" onClick={() => onTabChange('analysis')}>
                📊 View analysis
              </SbarCta>
              {deal.packs_generated > 0
                ? <SbarCta onClick={() => onTabChange('investors')}>📤 Share with investor</SbarCta>
                : <SbarCta onClick={() => onTabChange('content')}>📦 Create deal pack</SbarCta>
              }
              <SbarCta variant="outline" onClick={() => setCloseDealOpen(true)}>
                ✓ Close deal
              </SbarCta>
              <div style={{
                fontSize: '10px', color: '#9ca3af', lineHeight: 1.45,
                display: 'flex', alignItems: 'flex-start', gap: '5px',
                background: BG_SEC, borderRadius: '8px', padding: '8px 10px',
              }}>
                <span>ℹ️</span>
                <span>Strategy: {stratLabel}{deal.purchase_price ? ` · ${fCurrency(deal.purchase_price)}` : ''}</span>
              </div>
            </div>
          </SidebarCard>

        </div>{/* /sidebar */}

      </div>{/* /split */}

      {/* ─── Close Deal Modal ─────────────────────────────────────────────── */}
      {closeDealOpen && (
        <CloseDealModal
          onClose={() => setCloseDealOpen(false)}
          onConfirm={handleConfirmClose}
        />
      )}

    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ fontSize: '11px', color: '#6b7280' }}>{label}</span>
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
        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
      </div>
      <span style={{
        fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
        background: badgeBg[badgeColor], color: badgeTxt[badgeColor],
      }}>
        {badge}
      </span>
      <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>›</span>
    </button>
  )
}
