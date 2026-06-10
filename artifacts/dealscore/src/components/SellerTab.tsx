import { useState, useCallback, useEffect } from 'react'
import { Deal } from '../lib/database.types'

const NAVY       = '#1B3A6B'
const NAVY_DARK  = '#152d55'
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

type MotLevel = 'hot' | 'warm' | 'cool'
type ActType  = 'call' | 'email' | 'visit' | 'note'
type ChainSt  = 'No chain' | 'Chain — below' | 'Chain — above' | 'Chain — both'
type SoKind   = 'activity' | 'offer' | 'edit-vendor' | 'edit-motivation' | 'edit-chain'

interface OfferRow { date: string; amount: number; note: string; status: 'accepted' | 'declined' | 'pending' }
interface ContactEntry { type: ActType; label: string; note: string; date: string }

function fmtGBP(n: number) { return '£' + Math.round(n).toLocaleString('en-GB') }
function nowTime() {
  const d = new Date()
  let h = d.getHours(), m = d.getMinutes()
  const ap = h >= 12 ? 'pm' : 'am'
  h = h % 12; if (h === 0) h = 12
  return h + ':' + String(m).padStart(2, '0') + ap
}
function todayDateStr() {
  const d = new Date()
  return d.getDate() + ' ' + d.toLocaleString('en-GB', { month: 'short' })
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).join('').slice(0, 2)
}

const SEED_OFFERS: OfferRow[] = [
  { date: '28 May', amount: 180000, note: 'Initial offer — declined', status: 'declined' },
  { date: '5 Jun',  amount: 183000, note: 'Counter after call', status: 'declined' },
  { date: '8 Jun',  amount: 185000, note: 'Final offer — verbally accepted', status: 'accepted' },
]
const SEED_CONTACTS: ContactEntry[] = [
  { type: 'call',  label: 'Phone call · 12 min', note: 'Discussed the offer. Vendor says he\'ll speak to his wife and come back by Thursday. Seemed receptive — mentioned he wants to complete before September.', date: 'Today · 11:24am' },
  { type: 'note',  label: 'Offer accepted — verbal', note: '£185,000 verbally agreed. Instructed solicitors. Awaiting written confirmation from vendor\'s solicitor.', date: '8 Jun · 3:15pm' },
  { type: 'call',  label: 'Phone call · 8 min', note: 'Submitted £183k counter. Vendor pushed back — said lowest he\'d go is £185k. Agreed to discuss with investor and come back same day.', date: '5 Jun · 2:42pm' },
  { type: 'email', label: 'Email sent', note: 'Formal offer letter at £180,000 sent to agent (Mark Thornton, Purplebricks). Included comparables and rationale.', date: '2 Jun · 10:05am' },
  { type: 'visit', label: 'Viewing', note: 'First viewing completed. Property in good condition — cosmetic refresh needed. Vendor present, mentioned timeline pressure (moving abroad in August).', date: '28 May · 10:30am' },
]

const ACT_META: Record<ActType, { label: string; dotCls: string; iconColor: string; icon: string }> = {
  call:  { label: 'Phone call',      dotCls: 'call',  iconColor: NAVY,      icon: '📞' },
  email: { label: 'Email',           dotCls: 'email', iconColor: TEAL,      icon: '✉️' },
  visit: { label: 'Viewing / visit', dotCls: 'visit', iconColor: '#7C3AED', icon: '🏠' },
  note:  { label: 'Note',            dotCls: 'note',  iconColor: AMBER,     icon: '📝' },
}

const MOT_META: Record<MotLevel, { label: string; bg: string; border: string; color: string }> = {
  hot:  { label: 'Motivated', bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
  warm: { label: 'Flexible',  bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
  cool: { label: 'Firm',      bg: BG_SEC,    border: DS_BORDER, color: TEXT_2    },
}

const CHAIN_META: Record<ChainSt, { color: string }> = {
  'No chain':       { color: '#065f46' },
  'Chain — below':  { color: '#92400e' },
  'Chain — above':  { color: '#92400e' },
  'Chain — both':   { color: '#991b1b' },
}

const STAGE_SUGGESTIONS: Record<string, { icon: string; text: string }[]> = {
  sourcing: [
    { icon: '📞', text: 'Initial vendor call — qualify motivation and timeline' },
    { icon: '🏠', text: 'Book viewing — confirm property condition' },
    { icon: '📊', text: 'Run comparables — validate market value' },
  ],
  negotiating: [
    { icon: '💰', text: 'Submit offer at agreed price point' },
    { icon: '📞', text: 'Follow up with vendor / agent on offer status' },
    { icon: '📄', text: 'Prepare heads of terms draft' },
  ],
  agreed: [
    { icon: '📄', text: 'Send fee agreement for signature' },
    { icon: '👥', text: 'Instruct solicitors — buyer and seller' },
    { icon: '📦', text: 'Prepare investor pack for release' },
  ],
  reserved: [
    { icon: '📄', text: 'Chase fee agreement signature' },
    { icon: '📞', text: 'Follow up with vendor on exchange timeline' },
    { icon: '📅', text: 'Confirm pack release date with investor' },
    { icon: '💰', text: 'Chase sourcing fee — confirm payment method' },
  ],
  exchanged: [
    { icon: '📅', text: 'Confirm completion date with all parties' },
    { icon: '💰', text: 'Confirm fee received / invoice sent' },
    { icon: '📋', text: 'Prepare completion documents' },
  ],
  complete: [
    { icon: '⭐', text: 'Request testimonial from investor' },
    { icon: '💰', text: 'Confirm final fee reconciliation' },
    { icon: '📁', text: 'Archive deal — mark as complete' },
  ],
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

function SecCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff', borderRadius: R_LG,
      border: `.5px solid ${DS_BORDER}`,
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      overflow: 'hidden', marginBottom: '10px', ...style,
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

function SmBtn({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      fontSize: '11px', fontWeight: 500, padding: '3px 9px',
      borderRadius: '20px', border: primary ? `none` : `.5px solid ${DS_BORDER}`,
      background: primary ? NAVY : '#fff', color: primary ? '#fff' : TEXT_2,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
    }}>
      {children}
    </button>
  )
}

function OfferStatusTag({ status }: { status: OfferRow['status'] }) {
  const cfg = {
    accepted: { bg: TEAL_LIGHT, color: '#065f46', label: 'Accepted' },
    declined: { bg: '#fef2f2',  color: '#991b1b', label: 'Declined' },
    pending:  { bg: '#fef3c7',  color: '#92400e', label: 'Pending' },
  }[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 500,
      padding: '2px 8px 2px 7px', background: cfg.bg, borderRadius: '4px',
      borderLeft: `3px solid ${cfg.color}`, whiteSpace: 'nowrap', color: TEXT_1,
    }}>
      {cfg.label}
    </span>
  )
}

function ContactDot({ type }: { type: ActType }) {
  const colors: Record<ActType, string> = { call: NAVY, email: TEAL, visit: '#7C3AED', note: AMBER }
  return (
    <div style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: colors[type], flexShrink: 0, marginTop: '5px',
    }} />
  )
}

function SbarCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: R_LG,
      border: `.5px solid ${DS_BORDER}`,
      boxShadow: '0 1px 4px rgba(0,0,0,.07)',
      overflow: 'hidden', marginBottom: '10px',
    }}>
      {children}
    </div>
  )
}

function SbarHdr({ icon, title, subtitle, badge, badgeColor }: {
  icon: React.ReactNode; title: string; subtitle?: string;
  badge?: string; badgeColor?: 'amber' | 'green' | 'navy';
}) {
  const badgeBg = { amber: '#fef3c7', green: TEAL_LIGHT, navy: NAVY_LIGHT, undefined: NAVY_LIGHT }[badgeColor ?? 'navy']
  const badgeClr = { amber: '#92400e', green: '#065f46', navy: NAVY, undefined: NAVY }[badgeColor ?? 'navy']
  return (
    <div style={{
      padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`,
      background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px',
    }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '7px',
        background: NAVY_LIGHT, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '13px', color: NAVY, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>{subtitle}</div>}
      </div>
      {badge && (
        <span style={{
          fontSize: '10px', fontWeight: 700, background: badgeBg as string,
          color: badgeClr as string, padding: '2px 8px', borderRadius: '20px',
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

function FIn({ value, onChange, placeholder, type }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type ?? 'text'} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '7px 10px',
        fontSize: '12px', color: TEXT_1, background: '#fff',
        fontFamily: 'inherit', width: '100%', outline: 'none',
      }}
      onFocus={e => (e.target.style.borderColor = NAVY)}
      onBlur={e => (e.target.style.borderColor = DS_BORDER)}
    />
  )
}

function FTa({ value, onChange, placeholder, height }: {
  value: string; onChange: (v: string) => void; placeholder?: string; height?: string;
}) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={3}
      style={{
        border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '8px 10px',
        fontSize: '12px', color: TEXT_1, background: '#fff',
        fontFamily: 'inherit', width: '100%', resize: 'none',
        outline: 'none', lineHeight: 1.5, height: height ?? '80px',
      }}
      onFocus={e => (e.target.style.borderColor = NAVY)}
      onBlur={e => (e.target.style.borderColor = DS_BORDER)}
    />
  )
}

function TypeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontSize: '11px', fontWeight: 500, padding: '5px 12px', borderRadius: '6px',
      border: `.5px solid ${active ? NAVY : DS_BORDER}`,
      background: active ? NAVY : '#fff',
      color: active ? '#fff' : TEXT_2,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {label}
    </button>
  )
}

export interface SellerTabProps {
  deal: Deal
}

export default function SellerTab({ deal }: SellerTabProps) {
  const askingPrice = deal.purchase_price ?? 192000

  const [toast, setToast] = useState('')
  const [toastShow, setToastShow] = useState(false)

  const [expDismissed, setExpDismissed] = useState(false)

  const [vendorName,    setVendorName]    = useState('Derek Hassan')
  const [vendorMobile,  setVendorMobile]  = useState('07700 900333')
  const [vendorEmail,   setVendorEmail]   = useState('d.hassan@hotmail.com')
  const [vendorUpdated, setVendorUpdated] = useState('Updated today · 11:24am')

  const [motLevel,   setMotLevel]   = useState<MotLevel>('warm')
  const [motContext, setMotContext] = useState('Moving abroad. Flexible on timeline but wants to achieve close to asking price. Aware the property has been on market for 6 weeks.')

  const [offers,      setOffers]      = useState<OfferRow[]>(SEED_OFFERS)
  const [agreedPrice, setAgreedPrice] = useState(185000)

  const [contacts, setContacts] = useState<ContactEntry[]>(SEED_CONTACTS)

  const [chainStatus,     setChainStatus]     = useState<ChainSt>('No chain')
  const [chainTenure,     setChainTenure]     = useState('Freehold')
  const [chainSolicitor,  setChainSolicitor]  = useState('TBC — instructing')
  const [chainCompletion, setChainCompletion] = useState('Before Aug 2026')

  const [nextAction,   setNextAction]   = useState<string | null>(null)
  const [naStage,      setNaStage]      = useState('reserved')
  const [naInputVal,   setNaInputVal]   = useState('')

  const [reminderSet, setReminderSet] = useState(false)

  const [soOpen, setSoOpen]       = useState(false)
  const [soKind, setSoKind]       = useState<SoKind | null>(null)

  const [soActType,    setSoActType]    = useState<ActType>('call')
  const [soActNote,    setSoActNote]    = useState('')
  const [soOfferAmt,   setSoOfferAmt]   = useState('')
  const [soOfferSt,    setSoOfferSt]    = useState<OfferRow['status']>('pending')
  const [soOfferNote,  setSoOfferNote]  = useState('')
  const [soVName,      setSoVName]      = useState('')
  const [soVMobile,    setSoVMobile]    = useState('')
  const [soVEmail,     setSoVEmail]     = useState('')
  const [soMotLevel,   setSoMotLevel]   = useState<MotLevel>('warm')
  const [soMotCtx,     setSoMotCtx]     = useState('')
  const [soChainSt,    setSoChainSt]    = useState<ChainSt>('No chain')
  const [soChainTen,   setSoChainTen]   = useState('')
  const [soChainSol,   setSoChainSol]   = useState('')
  const [soChainComp,  setSoChainComp]  = useState('')

  const showToast = useCallback((msg: string) => {
    setToast(msg); setToastShow(true)
    setTimeout(() => setToastShow(false), 2200)
  }, [])

  function openSo(kind: SoKind) {
    setSoKind(kind)
    if (kind === 'edit-vendor')     { setSoVName(vendorName); setSoVMobile(vendorMobile); setSoVEmail(vendorEmail) }
    if (kind === 'edit-motivation') { setSoMotLevel(motLevel); setSoMotCtx(motContext) }
    if (kind === 'edit-chain')      { setSoChainSt(chainStatus); setSoChainTen(chainTenure); setSoChainSol(chainSolicitor); setSoChainComp(chainCompletion) }
    if (kind === 'activity')        { setSoActType('call'); setSoActNote('') }
    if (kind === 'offer')           { setSoOfferAmt(''); setSoOfferSt('pending'); setSoOfferNote('') }
    setSoOpen(true)
  }

  function closeSo() { setSoOpen(false); setSoKind(null) }

  function saveSo() {
    if (soKind === 'activity') {
      if (!soActNote.trim()) { showToast('Add a note before saving'); return }
      const meta = ACT_META[soActType]
      setContacts(prev => [{ type: soActType, label: meta.label, note: soActNote, date: `Just now · ${nowTime()}` }, ...prev])
      setVendorUpdated(`Updated today · ${nowTime()}`)
      showToast(`${meta.label} logged`)
    }
    if (soKind === 'offer') {
      const amt = parseInt(soOfferAmt.replace(/[^0-9]/g, ''), 10)
      if (!amt || amt <= 0) { showToast('Enter a valid offer amount'); return }
      setOffers(prev => [{ date: todayDateStr(), amount: amt, note: soOfferNote || 'Offer logged', status: soOfferSt }, ...prev])
      if (soOfferSt === 'accepted') {
        setAgreedPrice(amt)
        showToast(`Offer of ${fmtGBP(amt)} logged — marked as accepted, figures updated`)
      } else {
        showToast(`Offer of ${fmtGBP(amt)} logged as ${soOfferSt}`)
      }
    }
    if (soKind === 'edit-vendor') {
      if (!soVName.trim()) { showToast("Vendor name can't be empty"); return }
      setVendorName(soVName); setVendorMobile(soVMobile); setVendorEmail(soVEmail)
      setVendorUpdated(`Updated today · ${nowTime()}`)
      showToast('Vendor details saved — synced to Sellers CRM')
    }
    if (soKind === 'edit-motivation') {
      setMotLevel(soMotLevel); setMotContext(soMotCtx)
      showToast('Motivation saved — Sellers CRM updated')
    }
    if (soKind === 'edit-chain') {
      if (!soChainTen.trim()) { showToast("Tenure can't be empty"); return }
      setChainStatus(soChainSt); setChainTenure(soChainTen)
      setChainSolicitor(soChainSol); setChainCompletion(soChainComp)
      showToast('Chain & property details saved')
    }
    closeSo()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && soOpen) closeSo() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [soOpen])

  const diff = askingPrice - agreedPrice
  const pct  = diff / askingPrice * 100
  const currentOfferLabel = `${fmtGBP(agreedPrice)} · -${pct.toFixed(1)}%`

  const motMeta = MOT_META[motLevel]
  const chainMeta = CHAIN_META[chainStatus]

  const currentOffer = offers.find(o => o.status === 'accepted')
  const currentOfferAmt = currentOffer?.amount ?? agreedPrice

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px 32px' }}>
      <Toast msg={toast} show={toastShow} />

      {!expDismissed && (
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
          }}>👤</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>Vendor relationship for this deal</div>
            <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.7 }}>
              Log contact details, track motivation and chain position, and record negotiation notes. Stage-aware <strong style={{ color: TEXT_1 }}>next actions</strong> update automatically as the deal progresses. Manage sourcing fees and invoices in the <strong style={{ color: TEXT_1 }}>Fees &amp; invoice</strong> tab.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', alignItems: 'start' }}>

        <div>
          <SecCard>
            <SecHdr>
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Vendor</span>
              <span style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '3px', marginRight: 'auto', marginLeft: '10px' }}>
                🕐 <span>{vendorUpdated}</span>
              </span>
              <button onClick={() => openSo('edit-vendor')} style={{
                fontSize: '11px', color: NAVY, background: 'none',
                border: `.5px solid rgba(27,58,107,.25)`, borderRadius: '6px',
                padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}>✏️ Edit</button>
            </SecHdr>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: NAVY, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 600, flexShrink: 0,
                }}>
                  {initials(vendorName)}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: TEXT_1, marginBottom: '2px' }}>{vendorName}</div>
                  <div style={{ fontSize: '11px', color: TEXT_2 }}>Vendor · {deal.address ?? '—'}</div>
                </div>
              </div>
              {[
                { icon: '📞', label: 'Mobile', value: vendorMobile },
                { icon: '✉️', label: 'Email',  value: vendorEmail },
                { icon: '🏠', label: 'Property', value: deal.address ?? '—' },
                { icon: '👤', label: 'Agent',   value: 'Mark Thornton · Purplebricks' },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 0', borderBottom: `.5px solid #f3f4f6`,
                  fontSize: '12px', color: TEXT_1,
                }}>
                  <span style={{ fontSize: '13px', flexShrink: 0, width: '16px' }}>{row.icon}</span>
                  <span style={{ fontSize: '10px', color: '#9ca3af', minWidth: '60px' }}>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
          </SecCard>

          <SecCard>
            <SecHdr>
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Motivation &amp; context</span>
              <button onClick={() => openSo('edit-motivation')} style={{
                fontSize: '11px', color: NAVY, background: 'none',
                border: `.5px solid rgba(27,58,107,.25)`, borderRadius: '6px',
                padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}>✏️ Edit</button>
            </SecHdr>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', fontWeight: 500, padding: '4px 10px',
                  background: motMeta.bg, border: `.5px solid ${motMeta.border}`,
                  borderRadius: '4px', color: motMeta.color,
                }}>
                  {motLevel === 'hot' ? '🔥' : motLevel === 'warm' ? '—' : '🔒'} {motMeta.label}
                </span>
              </div>
              <div style={{
                fontSize: '12px', color: TEXT_2, lineHeight: 1.7,
                padding: '10px 12px', background: BG_SEC,
                borderRadius: R_MD, marginBottom: '10px',
              }}>
                {motContext || '—'}
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🔄 Syncs to your Sellers CRM automatically
              </div>
            </div>
          </SecCard>

          <SecCard>
            <SecHdr>
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Offer tracker</span>
              <button onClick={() => openSo('offer')} style={{
                fontSize: '11px', color: NAVY, background: 'none',
                border: `.5px solid rgba(27,58,107,.25)`, borderRadius: '6px',
                padding: '3px 9px', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}>+ Log offer</button>
            </SecHdr>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '14px' }}>
                {[
                  { lbl: 'Asking price', val: fmtGBP(askingPrice), clr: NAVY, delta: "Vendor's original ask" },
                  { lbl: 'Current offer', val: fmtGBP(currentOfferAmt), clr: '#065f46', delta: `−${fmtGBP(diff)} (${pct.toFixed(1)}% below ask)` },
                  { lbl: 'Status', val: 'Verbally agreed', clr: '#92400e', delta: 'Awaiting solicitors' },
                ].map(c => (
                  <div key={c.lbl} style={{ background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>{c.lbl}</div>
                    <div style={{ fontSize: '17px', fontWeight: 600, color: c.clr }}>{c.val}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{c.delta}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, overflow: 'hidden' }}>
                <div style={{ padding: '7px 12px', background: BG_SEC, borderBottom: `.5px solid ${DS_BORDER}`, fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                  Offer history
                </div>
                {offers.map((o, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: i < offers.length - 1 ? `.5px solid #f3f4f6` : 'none', fontSize: '12px' }}>
                    <span style={{ fontSize: '10px', color: '#9ca3af', minWidth: '70px' }}>{o.date}</span>
                    <span style={{ fontWeight: 600, color: NAVY, minWidth: '80px' }}>{fmtGBP(o.amount)}</span>
                    <span style={{ flex: 1, fontSize: '11px', color: TEXT_2 }}>{o.note}</span>
                    <OfferStatusTag status={o.status} />
                  </div>
                ))}
              </div>
            </div>
          </SecCard>

          <SecCard>
            <SecHdr>
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Contact log</span>
              <span style={{ fontSize: '11px', color: TEXT_2 }}>{contacts.length} touchpoints</span>
            </SecHdr>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {(['call', 'email', 'visit', 'note'] as ActType[]).map(t => (
                  <SmBtn key={t} onClick={() => { setSoActType(t); openSo('activity') }} primary={t === 'call'}>
                    {ACT_META[t].icon} {t === 'call' ? 'Log call' : t === 'email' ? 'Log email' : t === 'visit' ? 'Log visit' : 'Add note'}
                  </SmBtn>
                ))}
              </div>
              {contacts.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: i < contacts.length - 1 ? `.5px solid #f3f4f6` : 'none' }}>
                  <ContactDot type={c.type} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, marginBottom: '2px' }}>{c.label}</div>
                    <div style={{ fontSize: '11px', color: TEXT_2, lineHeight: 1.5 }}>{c.note}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{c.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </SecCard>

          <SecCard>
            <SecHdr>
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Chain &amp; property</span>
              <button onClick={() => openSo('edit-chain')} style={{
                fontSize: '11px', color: NAVY, background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              }}>Edit</button>
            </SecHdr>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { lbl: 'Chain status', val: chainStatus, color: chainMeta.color },
                  { lbl: 'Tenure',       val: chainTenure },
                  { lbl: 'Solicitor',    val: chainSolicitor },
                  { lbl: 'Target completion', val: chainCompletion },
                ].map(cell => (
                  <div key={cell.lbl} style={{ background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>{cell.lbl}</div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: cell.color ?? TEXT_1 }}>{cell.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </SecCard>

          <SecCard>
            <SecHdr>
              <span style={{ fontSize: '14px', color: TEAL }}>💰</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Sourcing fee</span>
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px',
                color: '#92400e', background: '#fffbeb', border: '.5px solid #fde68a',
              }}>Outstanding</span>
              <span style={{ fontSize: '11px', color: NAVY, fontWeight: 600, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                → Manage in Fees &amp; invoice
              </span>
            </SecHdr>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: NAVY }}>£2,500</div>
                <div style={{ fontSize: '11px', color: TEXT_2, marginTop: '2px' }}>Fixed · due on completion</div>
              </div>
              <SmBtn onClick={() => showToast('Switch to the Fees & invoice tab to manage invoices')}>
                🧾 View invoice
              </SmBtn>
            </div>
          </SecCard>
        </div>

        <div style={{ position: 'sticky', top: `${STICKY_TOP}px` }}>

          <SbarCard>
            <SbarHdr icon="🔔" title="Chase reminder" subtitle="Action needed today" badge="Today" badgeColor="amber" />
            <div style={{ padding: '12px 14px' }}>
              <div style={{
                background: '#fffbeb', border: '.5px solid #fde68a', borderRadius: R_MD,
                padding: '10px 12px', marginBottom: '10px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '3px' }}>Chase Thursday</div>
                <div style={{ fontSize: '11px', color: TEXT_2, lineHeight: 1.5 }}>Vendor said he'd speak to his wife and get back to you by Thursday. Don't let it slip.</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <SmBtn onClick={() => { setReminderSet(true); showToast('Reminder set for Thursday') }}>
                  {reminderSet ? '✅ Reminder set' : '⏰ Set reminder'}
                </SmBtn>
                <SmBtn onClick={() => showToast('Calendar integration — connect via Settings → Integrations')}>
                  📅 Schedule call
                </SmBtn>
              </div>
            </div>
          </SbarCard>

          <SbarCard>
            <SbarHdr icon="📊" title="Negotiation" subtitle={`${fmtGBP(diff)} saved · ${(diff / (deal.market_value ?? askingPrice) * 100).toFixed(1)}% BMV*`} />
            <div style={{ padding: '12px 14px' }}>
              <div>
                <SbarMetric label="Asking price"  value={fmtGBP(askingPrice)} />
                <SbarMetric label="Agreed price"  value={fmtGBP(agreedPrice)} valColor="#065f46" />
                <SbarMetric label="Saving vs ask" value={`${fmtGBP(diff)} (${pct.toFixed(1)}%)`} valColor="#065f46" />
                <SbarMetric label="BMV discount"  value={`${(diff / (deal.market_value ?? askingPrice) * 100).toFixed(1)}%`} valColor={NAVY} />
                <SbarMetric label="Touchpoints"   value={String(contacts.length)} />
                <div style={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                  padding: '6px 0', fontSize: '11px',
                }}>
                  <span style={{ color: TEXT_2 }}>Deal status</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', fontSize: '10px', fontWeight: 500,
                    padding: '2px 8px 2px 7px', background: BG_SEC, borderRadius: '4px',
                    borderLeft: '3px solid #f59e0b', color: TEXT_1,
                  }}>
                    {deal.status === 'presenting' ? 'Pack sent' : deal.status ?? 'Analysing'} · Day 8
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'flex-start', gap: '5px', paddingTop: '10px', borderTop: `.5px solid ${DS_BORDER}`, marginTop: '2px', lineHeight: 1.5 }}>
                ℹ️ *BMV discount is measured against estimated market value, not asking price
              </div>
            </div>
          </SbarCard>

          <SbarCard>
            <SbarHdr icon="→" title="Next action" subtitle="Set by you" />
            <div style={{ padding: '12px 14px' }}>
              {nextAction === null ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em' }}>Suggestions</div>
                    <select
                      value={naStage}
                      onChange={e => setNaStage(e.target.value)}
                      style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', border: `.5px solid ${DS_BORDER}`, fontFamily: 'inherit', color: TEXT_1, background: '#fff', maxWidth: '130px' }}
                    >
                      {Object.keys(STAGE_SUGGESTIONS).map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                    {(STAGE_SUGGESTIONS[naStage] ?? []).map(s => (
                      <button key={s.text} onClick={() => setNextAction(s.text)} style={{
                        display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px',
                        padding: '5px 8px', borderRadius: '20px', border: `.5px solid ${DS_BORDER}`,
                        background: '#fff', color: TEXT_2, cursor: 'pointer', fontFamily: 'inherit',
                        textAlign: 'left', width: '100%',
                      }}>
                        <span style={{ flexShrink: 0 }}>{s.icon}</span>
                        <span style={{ flex: 1 }}>{s.text}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      value={naInputVal} onChange={e => setNaInputVal(e.target.value)}
                      placeholder="Or type your own..."
                      style={{ fontSize: '11px', flex: 1, border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '7px 10px', fontFamily: 'inherit', outline: 'none', color: TEXT_1 }}
                    />
                    <SmBtn primary onClick={() => { if (naInputVal.trim()) { setNextAction(naInputVal.trim()); setNaInputVal('') } }}>Set</SmBtn>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    background: NAVY_LIGHT, border: '.5px solid #c8d6f0', borderRadius: R_MD,
                    padding: '10px 12px', marginBottom: '8px',
                  }}>
                    <span style={{ fontSize: '12px', color: NAVY, flexShrink: 0, marginTop: '1px' }}>→</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: NAVY }}>{nextAction}</div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>Set just now</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <SmBtn onClick={() => setNextAction(null)}>✏️ Edit</SmBtn>
                    <SmBtn onClick={() => { setNextAction(null); showToast('Next action cleared') }}>✕ Clear</SmBtn>
                  </div>
                </>
              )}
            </div>
          </SbarCard>

          <div style={{
            background: NAVY_LIGHT, border: '.5px solid rgba(27,58,107,.15)',
            borderRadius: R_MD, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{ flex: 1, fontSize: '11px', color: TEXT_2, lineHeight: 1.5 }}>
              <strong style={{ color: TEXT_1 }}>Sellers CRM</strong> — link this deal to a CRM contact for relationship tracking
            </div>
            <button onClick={() => showToast('CRM integration — connect via Settings → Integrations')} style={{
              fontSize: '11px', fontWeight: 600, color: NAVY, background: '#fff',
              border: '.5px solid rgba(27,58,107,.25)', borderRadius: '6px',
              padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              Link CRM
            </button>
          </div>

        </div>
      </div>

      {soOpen && (
        <>
          <div
            onClick={closeSo}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,.55)', zIndex: 300, opacity: soOpen ? 1 : 0, transition: 'opacity .25s' }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
            background: '#fff', zIndex: 301,
            transform: soOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform .28s cubic-bezier(.32,.72,0,1)',
            display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(0,0,0,.16)',
          }}>
            <div style={{ background: NAVY, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                {soKind === 'activity' ? 'Log activity' : soKind === 'offer' ? 'Log a new offer' : soKind === 'edit-vendor' ? 'Edit vendor details' : soKind === 'edit-motivation' ? 'Motivation & context' : 'Edit chain & property'}
              </div>
              <button onClick={closeSo} style={{ background: 'rgba(255,255,255,.1)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: R_MD, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>✕ Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
              {soKind === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Type</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(['call', 'email', 'visit', 'note'] as ActType[]).map(t => (
                        <TypeBtn key={t} label={ACT_META[t].label} active={soActType === t} onClick={() => setSoActType(t)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>What happened</div>
                    <FTa value={soActNote} onChange={setSoActNote} placeholder="e.g. Spoke to Derek — he'll confirm with his wife by Thursday..." height="110px" />
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>This is added to the contact log and counted as a touchpoint.</div>
                  </div>
                </div>
              )}
              {soKind === 'offer' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Offer amount</div>
                    <div style={{ display: 'flex', alignItems: 'center', background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, overflow: 'hidden' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: TEXT_2, padding: '0 8px 0 11px', whiteSpace: 'nowrap' }}>£</span>
                      <input
                        type="number" inputMode="numeric" value={soOfferAmt} onChange={e => setSoOfferAmt(e.target.value)}
                        placeholder="185000"
                        style={{ border: 'none', background: 'transparent', fontSize: '16px', fontWeight: 600, color: TEXT_1, padding: '11px 6px', width: '100%', outline: 'none', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Outcome</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['pending', 'accepted', 'declined'] as OfferRow['status'][]).map(s => (
                        <TypeBtn key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={soOfferSt === s} onClick={() => setSoOfferSt(s)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Note</div>
                    <FTa value={soOfferNote} onChange={setSoOfferNote} placeholder="e.g. Counter offer after Tuesday's call" height="70px" />
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>Marking an offer "Accepted" updates the agreed price and negotiation summary.</div>
                  </div>
                </div>
              )}
              {soKind === 'edit-vendor' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: 'Name',   value: soVName,   onChange: setSoVName },
                    { label: 'Mobile', value: soVMobile, onChange: setSoVMobile },
                    { label: 'Email',  value: soVEmail,  onChange: setSoVEmail, type: 'email' },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>{f.label}</div>
                      <FIn value={f.value} onChange={f.onChange} type={f.type} />
                    </div>
                  ))}
                  <div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: 1.5 }}>Saving here also updates the Sellers CRM record for this vendor.</div>
                </div>
              )}
              {soKind === 'edit-motivation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Motivation level</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['hot', 'warm', 'cool'] as MotLevel[]).map(l => (
                        <TypeBtn key={l} label={MOT_META[l].label} active={soMotLevel === l} onClick={() => setSoMotLevel(l)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Context &amp; notes</div>
                    <FTa value={soMotCtx} onChange={setSoMotCtx} placeholder="e.g. Moving abroad, wants to complete before September..." height="110px" />
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>This record is shared with your Sellers CRM — updating it here keeps both in sync.</div>
                  </div>
                </div>
              )}
              {soKind === 'edit-chain' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Chain status</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(['No chain', 'Chain — below', 'Chain — above', 'Chain — both'] as ChainSt[]).map(s => (
                        <TypeBtn key={s} label={s} active={soChainSt === s} onClick={() => setSoChainSt(s)} />
                      ))}
                    </div>
                  </div>
                  {[
                    { label: 'Tenure',            value: soChainTen,  onChange: setSoChainTen },
                    { label: 'Solicitor',         value: soChainSol,  onChange: setSoChainSol },
                    { label: 'Target completion', value: soChainComp, onChange: setSoChainComp },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>{f.label}</div>
                      <FIn value={f.value} onChange={f.onChange} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '16px 22px', borderTop: `.5px solid ${DS_BORDER}`, display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={closeSo} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `.5px solid ${DS_BORDER}`, background: '#fff', color: TEXT_2, fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveSo} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: NAVY, color: '#fff', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
