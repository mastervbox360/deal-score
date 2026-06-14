import { useState, useCallback, useEffect } from 'react'
import { Deal } from '../lib/database.types'
import { updateDealInputs } from '../lib/dealService'

const NAVY       = '#1B3A6B'
const NAVY_LIGHT = '#eef3fb'
const TEAL       = '#1D9E75'
const TEAL_LIGHT = '#d1fae5'
const BG_SEC     = '#f5f6f8'
const DS_BORDER  = '#e3e5e9'
const TEXT_1     = '#1a1a2e'
const TEXT_2     = '#6c757d'
const AMBER      = '#D97706'
const R_MD       = '8px'
const R_LG       = '12px'

const STICKY_TOP = 56 + 48 + 44 + 42 + 20

type FeeType   = 'fixed' | 'percent'
type FeeDue    = 'completion' | 'reservation' | 'exchange'
type FeeStatus = 'outstanding' | 'received' | 'waived'

interface HistEntry { date: string; evt: string; tag: 'pending' | 'received' | 'sent' | 'agreed' }

const SEED_HISTORY: HistEntry[] = [
  { date: '8 Jun 2026', evt: 'Fee agreed verbally — £2,500 fixed. Investor confirmed via email.', tag: 'agreed' },
  { date: '8 Jun 2026', evt: 'Invoice #DS-004-SF generated and saved.', tag: 'sent' },
  { date: 'Today',      evt: 'Awaiting payment on completion. Days to close: 6.',                tag: 'pending' },
]

function nowDate() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
function nowTime() {
  const d = new Date()
  let h = d.getHours(), m = d.getMinutes()
  const ap = h >= 12 ? 'pm' : 'am'
  h = h % 12; if (h === 0) h = 12
  return h + ':' + String(m).padStart(2, '0') + ap
}

function Toast({ msg, show }: { msg: string; show: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: '28px', left: '50%',
      transform: `translateX(-50%) translateY(${show ? 0 : 12}px)`,
      background: 'rgba(20,30,50,.92)', color: '#fff', fontSize: '12px',
      fontWeight: 500, padding: '10px 18px', borderRadius: '24px',
      opacity: show ? 1 : 0, transition: 'opacity .2s, transform .2s',
      pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  )
}

function SecCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`,
      boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: '10px',
    }}>
      {children}
    </div>
  )
}

function SecHdr({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '12px 16px', borderBottom: `.5px solid ${DS_BORDER}`,
      display: 'flex', alignItems: 'center', gap: '8px', background: BG_SEC,
    }}>
      {children}
    </div>
  )
}

function SbarCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`,
      boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: '10px',
    }}>
      {children}
    </div>
  )
}

function SbarHdr({ icon, title, subtitle, badge, badgeColor }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  badge?: string; badgeColor?: 'amber' | 'green';
}) {
  const badgeBg  = badgeColor === 'amber' ? '#fef3c7' : badgeColor === 'green' ? TEAL_LIGHT : NAVY_LIGHT
  const badgeClr = badgeColor === 'amber' ? '#92400e' : badgeColor === 'green' ? '#065f46' : NAVY
  return (
    <div style={{
      padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`,
      background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '7px', background: NAVY_LIGHT,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', color: NAVY, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>{subtitle}</div>}
      </div>
      {badge && (
        <span style={{
          fontSize: '10px', fontWeight: 700, background: badgeBg,
          color: badgeClr, padding: '2px 8px', borderRadius: '20px',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function SbarMetric({ label, value, valColor }: { label: string; value: string; valColor?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '6px 0', borderBottom: `.5px solid #f3f4f6`, fontSize: '11px',
    }}>
      <span style={{ color: TEXT_2 }}>{label}</span>
      <span style={{ fontWeight: 600, color: valColor ?? TEXT_1 }}>{value}</span>
    </div>
  )
}

function SbarCta({ onClick, children, outline, teal }: {
  onClick: () => void; children: React.ReactNode; outline?: boolean; teal?: boolean;
}) {
  const bg    = teal ? TEAL : outline ? '#fff' : NAVY
  const clr   = outline ? TEXT_2 : '#fff'
  const brd   = outline ? `.5px solid ${DS_BORDER}` : 'none'
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '10px', background: bg, color: clr, border: brd,
      borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '5px', marginBottom: '6px',
    }}
      onMouseEnter={e => { if (outline) { (e.target as HTMLButtonElement).style.borderColor = NAVY; (e.target as HTMLButtonElement).style.color = NAVY } else { (e.target as HTMLButtonElement).style.opacity = '.88' } }}
      onMouseLeave={e => { if (outline) { (e.target as HTMLButtonElement).style.borderColor = DS_BORDER; (e.target as HTMLButtonElement).style.color = TEXT_2 } else { (e.target as HTMLButtonElement).style.opacity = '1' } }}
    >
      {children}
    </button>
  )
}

function FeeStatusPill({ status }: { status: FeeStatus }) {
  const cfg = {
    outstanding: { bg: '#fffbeb', color: '#92400e', border: '#fde68a', label: 'Outstanding' },
    received:    { bg: TEAL_LIGHT, color: '#065f46', border: 'rgba(29,158,117,.3)', label: 'Received' },
    waived:      { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: 'Waived' },
  }[status]
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px',
      color: cfg.color, background: cfg.bg, border: `.5px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  )
}

function HistTag({ tag }: { tag: HistEntry['tag'] }) {
  const cfg = {
    pending:  { bg: '#fef3c7', color: '#92400e', border: '#fde68a',                   label: 'Outstanding' },
    received: { bg: TEAL_LIGHT, color: '#065f46', border: 'rgba(29,158,117,.3)',       label: 'Received' },
    sent:     { bg: NAVY_LIGHT, color: NAVY,      border: 'rgba(27,58,107,.2)',        label: 'Invoice sent' },
    agreed:   { bg: NAVY_LIGHT, color: NAVY,      border: 'rgba(27,58,107,.2)',        label: 'Agreed' },
  }[tag]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px',
      fontWeight: 600, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap',
      background: cfg.bg, color: cfg.color, border: `.5px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  )
}

function LogBtn({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px',
      fontWeight: 500, padding: '5px 11px', borderRadius: '7px',
      border: `.5px solid ${primary ? NAVY : DS_BORDER}`,
      background: primary ? NAVY : BG_SEC,
      color: primary ? '#fff' : TEXT_2,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {children}
    </button>
  )
}

function FeeInp({ id, value, onChange, placeholder, type }: {
  id?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <input
      id={id} type={type ?? 'text'} value={value}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        flex: 1, fontSize: '12px', padding: '7px 10px',
        border: `.5px solid ${DS_BORDER}`, borderRadius: '6px',
        fontFamily: 'inherit', color: TEXT_1, outline: 'none',
        width: '100%', boxSizing: 'border-box' as const,
      }}
      onFocus={e => (e.target.style.borderColor = NAVY)}
      onBlur={e => (e.target.style.borderColor = DS_BORDER)}
    />
  )
}

export interface FeesTabProps {
  deal: Deal
}

export default function FeesTab({ deal }: FeesTabProps) {
  const invRef = `#${deal.reference ?? 'DS-004'}-SF`

  const [toast, setToast]       = useState('')
  const [toastShow, setToastShow] = useState(false)
  const [expDismissed, setExpDismissed] = useState(false)

  const saved = (deal.inputs as Record<string, unknown> | null)?.feeDetails as Record<string, unknown> | undefined

  const [feeAmountStr, setFeeAmountStr] = useState<string>(
    saved?.feeAmountStr != null ? String(saved.feeAmountStr) : '£2,500'
  )
  const [feeType,      setFeeType]      = useState<FeeType>(
    saved?.feeType != null ? (saved.feeType as FeeType) : 'fixed'
  )
  const [feeDue,       setFeeDue]       = useState<FeeDue>(
    saved?.feeDue != null ? (saved.feeDue as FeeDue) : 'completion'
  )
  const [feeStatus,    setFeeStatus]    = useState<FeeStatus>(
    saved?.feeStatus != null ? (saved.feeStatus as FeeStatus) : 'outstanding'
  )

  const [history,  setHistory]  = useState<HistEntry[]>(
    Array.isArray(saved?.history) ? (saved.history as HistEntry[]) : SEED_HISTORY
  )
  const [histNote, setHistNote] = useState('')

  const [sendTo,   setSendTo]   = useState('0')
  const [sendNote, setSendNote] = useState('')

  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function saveFee(overrides?: {
    feeAmountStr?: string
    feeType?: FeeType
    feeDue?: FeeDue
    feeStatus?: FeeStatus
    history?: HistEntry[]
  }) {
    setSaveStatus('saving')
    const feeDetails = {
      feeAmountStr:  overrides?.feeAmountStr  ?? feeAmountStr,
      feeType:       overrides?.feeType       ?? feeType,
      feeDue:        overrides?.feeDue        ?? feeDue,
      feeStatus:     overrides?.feeStatus     ?? feeStatus,
      history:       overrides?.history       ?? history,
    }
    const currentInputs = (deal.inputs as Record<string, unknown> | null) ?? {}
    const updated = await updateDealInputs(
      deal.id,
      { ...currentInputs, feeDetails },
      {}
    )
    setSaveStatus(updated ? 'saved' : 'error')
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg); setToastShow(true)
    setTimeout(() => setToastShow(false), 2200)
  }, [])

  async function saveFeeDetails() {
    await saveFee()
    showToast(saveStatus === 'error' ? 'Save failed' : 'Fee details saved')
  }

  function markReceived() {
    const newStatus: FeeStatus = 'received'
    const newEntry: HistEntry = { date: new Date().toLocaleDateString('en-GB'), evt: 'Payment received', tag: 'received' }
    const newHistory = [newEntry, ...history]
    setFeeStatus(newStatus)
    setHistory(newHistory)
    showToast('Fee marked as received — invoice updated')
    saveFee({ feeStatus: newStatus, history: newHistory })
  }

  function addHistNote() {
    if (!histNote.trim()) return
    setHistory(prev => [{ date: `Today · ${nowTime()}`, evt: histNote.trim(), tag: 'agreed' }, ...prev])
    setHistNote('')
    showToast('Note added to payment history')
  }

  function sendInvoice() {
    showToast('Invoice emailed to investor')
    if (feeStatus === 'outstanding') {
      setHistory(prev => [{ date: `Today · ${nowTime()}`, evt: `Invoice sent via email to investor.`, tag: 'sent' }, ...prev])
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && invoiceOpen) setInvoiceOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [invoiceOpen])

  const feeDueLabel    = feeDue === 'completion' ? 'On completion' : feeDue === 'reservation' ? 'On reservation' : 'On exchange'
  const feeTypeLabel   = feeType === 'fixed' ? 'Fixed' : '% of purchase'
  const sbarBadgeColor = feeStatus === 'received' ? 'green' : 'amber'
  const sbarBadgeLabel = feeStatus === 'received' ? 'Received' : feeStatus === 'waived' ? 'Waived' : 'Outstanding'

  const [showInvoice, setShowInvoice] = useState(false)

  function openInvoice()  { setInvoiceOpen(true);  setShowInvoice(true)  }
  function closeInvoice() { setInvoiceOpen(false); setShowInvoice(false) }

  return (
    <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '20px 24px 32px' }}>
      <Toast msg={toast} show={toastShow} />

      {/* Explainer card */}
      {!expDismissed ? (
        <div style={{
          background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`,
          boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '16px 18px',
          marginBottom: '12px', display: 'flex', gap: '14px', alignItems: 'flex-start',
          position: 'relative',
        }}>
          <button onClick={() => setExpDismissed(true)} style={{
            position: 'absolute', top: '10px', right: '12px', background: 'none',
            border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '4px',
          }}>×</button>
          <div style={{
            width: '36px', height: '36px', borderRadius: R_MD, background: NAVY_LIGHT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: NAVY, flexShrink: 0,
          }}>
            <i className="ti ti-coin" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>Sourcing fee &amp; invoice for this deal</div>
            <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.7 }}>
              Set and track your agreed sourcing fee, update the payment status, and generate a professional invoice to send or print. The fee amount updates the live bar automatically across all deal tabs.
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setExpDismissed(false)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px',
          color: TEXT_2, background: BG_SEC, border: `.5px solid ${DS_BORDER}`,
          borderRadius: '20px', padding: '4px 12px', cursor: 'pointer',
          fontFamily: 'inherit', marginBottom: '12px',
        }}>
          <i className="ti ti-book-2" style={{ fontSize: '11px' }} /> Page guide
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', alignItems: 'start' }}>

        <div>
          {/* Fee hero */}
          <div style={{
            background: NAVY_LIGHT, border: '.5px solid rgba(27,58,107,.15)',
            borderRadius: R_MD, padding: '14px 16px', marginBottom: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(27,58,107,.5)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Agreed sourcing fee</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: NAVY }}>{feeAmountStr}</div>
              <div style={{ fontSize: '11px', color: TEXT_2, marginTop: '4px' }}>{feeTypeLabel} · due {feeDueLabel.toLowerCase()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>James Brown</div>
              <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '2px' }}>j.brown@brownpropinvest.co.uk</div>
              <div style={{ marginTop: '8px' }}>
                <FeeStatusPill status={feeStatus} />
              </div>
            </div>
          </div>

          {/* Sourcing fee details */}
          <SecCard>
            <SecHdr>
              <i className="ti ti-coin" style={{ fontSize: '14px', color: TEAL }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Sourcing fee details</span>
              <button onClick={openInvoice} style={{
                fontSize: '11px', color: NAVY, background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <i className="ti ti-file-invoice" style={{ fontSize: '11px' }} /> View invoice
              </button>
            </SecHdr>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, overflow: 'hidden', marginBottom: '12px' }}>
                {[
                  { lbl: 'Agreed fee',     val: feeAmountStr,                                                                                  clr: TEAL },
                  { lbl: 'Fee type',       val: feeTypeLabel,                                                                                   clr: TEXT_1 },
                  { lbl: 'Due date',       val: feeDueLabel,                                                                                    clr: TEXT_1 },
                  { lbl: 'Payment status', val: feeStatus === 'received' ? 'Received' : feeStatus === 'waived' ? 'Waived' : 'Outstanding',      clr: feeStatus === 'received' ? TEAL : feeStatus === 'waived' ? '#6b7280' : AMBER },
                ].map((c, i) => (
                  <div key={c.lbl} style={{
                    padding: '10px 14px',
                    borderRight:  i % 2 === 0 ? `.5px solid ${DS_BORDER}` : 'none',
                    borderBottom: i < 2       ? `.5px solid ${DS_BORDER}` : 'none',
                  }}>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '3px' }}>{c.lbl}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: c.clr }}>{c.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '5px' }}>Agreed fee</div>
                  <FeeInp value={feeAmountStr} onChange={setFeeAmountStr} placeholder="e.g. £2,500" />
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '5px' }}>Fee type</div>
                  <select value={feeType} onChange={e => setFeeType(e.target.value as FeeType)}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 10px', border: `.5px solid ${DS_BORDER}`, borderRadius: '6px', fontFamily: 'inherit', color: TEXT_1, background: '#fff', boxSizing: 'border-box' as const }}>
                    <option value="fixed">Fixed</option>
                    <option value="percent">% of purchase</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '5px' }}>Due date</div>
                  <select value={feeDue} onChange={e => setFeeDue(e.target.value as FeeDue)}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 10px', border: `.5px solid ${DS_BORDER}`, borderRadius: '6px', fontFamily: 'inherit', color: TEXT_1, background: '#fff', boxSizing: 'border-box' as const }}>
                    <option value="completion">On completion</option>
                    <option value="reservation">On reservation</option>
                    <option value="exchange">On exchange</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: `.5px solid ${DS_BORDER}`, paddingTop: '12px' }}>
                <LogBtn onClick={markReceived}>
                  <i className="ti ti-circle-check" style={{ fontSize: '11px' }} /> {feeStatus === 'received' ? 'Received' : 'Mark as received'}
                </LogBtn>
                <LogBtn primary onClick={saveFeeDetails}>
                  <i className="ti ti-device-floppy" style={{ fontSize: '11px' }} /> Save
                </LogBtn>
                {saveStatus !== 'idle' && (
                  <span style={{ fontSize: '11px', color: saveStatus === 'saved' ? '#065f46' : saveStatus === 'error' ? '#b91c1c' : '#9ca3af', marginLeft: '8px' }}>
                    {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save failed'}
                  </span>
                )}
              </div>
            </div>
          </SecCard>

          {/* Payment history */}
          <SecCard>
            <SecHdr>
              <i className="ti ti-history" style={{ fontSize: '14px', color: NAVY }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Payment history</span>
            </SecHdr>
            <div style={{ padding: 0 }}>
              <div style={{ padding: '0 16px' }}>
                {history.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 0', borderBottom: i < history.length - 1 ? `.5px solid #f3f4f6` : 'none',
                    fontSize: '12px',
                  }}>
                    <div style={{ fontSize: '10px', color: '#9ca3af', minWidth: '76px' }}>{h.date}</div>
                    <div style={{ flex: 1, color: TEXT_2, lineHeight: 1.4 }}>{h.evt}</div>
                    <HistTag tag={h.tag} />
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 16px', borderTop: `.5px solid ${DS_BORDER}`, marginTop: '2px' }}>
                <LogBtn onClick={addHistNote}>
                  <i className="ti ti-plus" style={{ fontSize: '10px' }} /> Add note
                </LogBtn>
              </div>
            </div>
          </SecCard>

          {/* Additional fees */}
          <SecCard>
            <SecHdr>
              <i className="ti ti-plus-circle" style={{ fontSize: '14px', color: TEXT_2 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Additional fees</span>
              <button onClick={() => showToast('Add additional fee — coming soon')} style={{
                fontSize: '11px', color: NAVY, background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <i className="ti ti-plus" style={{ fontSize: '11px' }} /> Add fee
              </button>
            </SecHdr>
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>No additional fees</div>
              <div style={{ fontSize: '11px', color: TEXT_2, marginBottom: '14px', lineHeight: 1.6 }}>Track finder's fees, referral costs, or legal disbursements for this deal here.</div>
              <LogBtn onClick={() => showToast('Add additional fee — coming soon')}>
                <i className="ti ti-plus" style={{ fontSize: '10px' }} /> Add additional fee
              </LogBtn>
            </div>
          </SecCard>
        </div>

        {/* Right sidebar */}
        <div style={{ position: 'sticky', top: `${STICKY_TOP}px` }}>

          {/* Invoice status */}
          <SbarCard>
            <div style={{ padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                <i className="ti ti-file-invoice" style={{ color: AMBER }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>Invoice status</div>
                <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>Sourcing fee invoice</div>
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                background: sbarBadgeColor === 'green' ? TEAL_LIGHT : '#fef3c7',
                color: sbarBadgeColor === 'green' ? '#065f46' : '#92400e',
                padding: '2px 8px', borderRadius: '20px', flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {sbarBadgeLabel}
              </span>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div>
                <SbarMetric label="Invoice ref" value={invRef} />
                <SbarMetric label="Amount"      value={feeAmountStr} valColor="#065f46" />
                <SbarMetric label="Payee"       value="James Brown" />
                <SbarMetric label="Due"         value={feeDueLabel} />
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <SbarCta outline onClick={openInvoice}>
                  <i className="ti ti-file-invoice" style={{ fontSize: '11px' }} /> View &amp; print invoice
                </SbarCta>
                <SbarCta outline onClick={markReceived}>
                  <i className="ti ti-circle-check" style={{ fontSize: '11px' }} /> Mark as received
                </SbarCta>
              </div>
            </div>
          </SbarCard>

          {/* Send invoice */}
          <SbarCard>
            <SbarHdr icon={<i className="ti ti-send" />} title="Send invoice" subtitle="Email directly to investor" />
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>To</div>
                  <select value={sendTo} onChange={e => setSendTo(e.target.value)}
                    style={{ width: '100%', fontSize: '11px', padding: '7px 10px', border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, fontFamily: 'inherit', color: TEXT_1, background: '#fff' }}>
                    <option value="0">James Brown — j.brown@brownpropinvest.co.uk</option>
                    <option value="1">Sarah Patel — sarah@propinvestors.com</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>
                    Note <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '9px', color: '#ccc' }}>(optional)</span>
                  </div>
                  <textarea
                    value={sendNote} onChange={e => setSendNote(e.target.value)}
                    placeholder="Hi James, please find the sourcing fee invoice attached…"
                    rows={3}
                    style={{
                      width: '100%', fontSize: '11px', padding: '8px 10px',
                      border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD,
                      fontFamily: 'inherit', resize: 'none', outline: 'none',
                      color: TEXT_1, lineHeight: 1.5, height: '54px', boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
              </div>
              <SbarCta teal onClick={sendInvoice}>
                <i className="ti ti-send" style={{ fontSize: '11px' }} /> Send invoice
              </SbarCta>
              <SbarCta outline onClick={() => showToast('Downloading invoice as PDF…')}>
                <i className="ti ti-download" style={{ fontSize: '11px' }} /> Download PDF
              </SbarCta>
            </div>
          </SbarCard>

        </div>
      </div>

      {/* Invoice modal */}
      {(invoiceOpen || showInvoice) && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeInvoice() }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: '#fff', borderRadius: R_LG, width: '520px', maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: TEXT_1 }}>Sourcing Fee Invoice</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={closeInvoice} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 14px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', border: `.5px solid ${DS_BORDER}`, background: '#fff', color: TEXT_2 }}>Close</button>
                <button onClick={() => window.print()} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 14px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: NAVY, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <i className="ti ti-printer" style={{ fontSize: '11px' }} /> Print / Save PDF
                </button>
              </div>
            </div>
            <div style={{ padding: '28px 32px', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: NAVY }}>DealScore</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>Property Sourcing</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#6b7280' }}>
                  <strong style={{ color: TEXT_1, display: 'block', fontSize: '13px' }}>INVOICE {invRef}</strong>
                  Date: {nowDate()}<br />
                  Due: {feeDueLabel}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', padding: '14px', background: '#f9fafb', borderRadius: '8px' }}>
                {[
                  { lbl: 'From', name: 'Your Name',   detail: 'DealScore Property Sourcing\nyour@email.com' },
                  { lbl: 'To',   name: 'James Brown', detail: 'Brown Property Investments\nj.brown@brownpropinvest.co.uk' },
                ].map(p => (
                  <div key={p.lbl}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>{p.lbl}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{p.detail}</div>
                  </div>
                ))}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr>
                    {['Description', 'Deal', 'Amount'].map((h, i) => (
                      <th key={h} style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', padding: '8px 10px', borderBottom: '1px solid #e5e7eb', textAlign: i === 2 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontSize: '11px', color: '#374151', padding: '10px', borderBottom: '.5px solid #f3f4f6' }}>
                      <strong>Sourcing fee</strong><br />
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>Property sourcing and deal packaging service</span>
                    </td>
                    <td style={{ fontSize: '11px', color: '#374151', padding: '10px', borderBottom: '.5px solid #f3f4f6' }}>
                      {deal.address ?? '—'}<br />
                      <span style={{ fontSize: '10px', color: '#6b7280' }}>{deal.strategy ?? 'Buy to Let'} · {deal.purchase_price ? `£${deal.purchase_price.toLocaleString('en-GB')}` : '—'}</span>
                    </td>
                    <td style={{ fontSize: '11px', color: '#374151', padding: '10px', borderBottom: '.5px solid #f3f4f6', textAlign: 'right' }}>
                      <strong>{feeAmountStr}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <div style={{ background: NAVY, color: '#fff', padding: '12px 20px', borderRadius: '8px', minWidth: '180px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, opacity: .7, marginBottom: '3px' }}>Total due</div>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>{feeAmountStr}</div>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', paddingTop: '16px', borderTop: '.5px solid #e5e7eb' }}>
                Payment is due {feeDueLabel.toLowerCase()} of the property transaction.<br />
                Thank you for your business.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
