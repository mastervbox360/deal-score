import { useState, useCallback, useEffect, useRef } from 'react'
import { Deal } from '../lib/database.types'

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

type InvStatus  = 'sent' | 'opened' | 'interested' | 'passed' | 'reserved' | 'revoked'
type InvType    = 'committed' | 'openmkt'
type FilterMode = 'all' | 'committed' | 'openmkt'
type Tier       = 'pro' | 'proplus'
type TlColor    = 'teal' | 'navy' | 'amber' | 'red'
type RespOutcome = 'interested' | 'viewing' | 'offer' | 'called' | 'emailed' | 'passed'

interface TlEntry    { label: string; note: string; time: string; color: TlColor }
interface NoteEntry  { id: string; author: string; text: string; time: string }
interface InvData {
  id: string; name: string; email: string; type: InvType; status: InvStatus
  trust: 'full' | 'protected'
  meta: { text: string; warn?: boolean }[]
  matchLine?: { strength: 'strong' | 'medium'; text: string }
  note?: { text: string; variant: 'responded' | 'passed' }
  timeline: TlEntry[]
}
interface CrmInv   { name: string; type: InvType; criteria: string; contact: string }
interface NotifData { id: string; unread: boolean; type: 'amber' | 'navy' | 'teal' | 'red'; msg: string; deal: string; time: string }

function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase()
}
function avColor(name: string) {
  const palette = [NAVY, '#4A6FA5', '#B45309', '#9ca3af']
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return palette[Math.abs(h) % palette.length]
}

const SEED_INVESTORS: InvData[] = [
  {
    id: 'james-brown', name: 'James Brown', email: 'james.brown@prospectinvest.co.uk',
    type: 'committed', status: 'interested', trust: 'full',
    meta: [
      { text: '🕐 Responded 2h ago' },
      { text: '👁 Opened 3×' },
      { text: '🔓 Full access', },
    ],
    matchLine: { strength: 'strong', text: 'Prefers BTL · Budget £150–200k · Cardiff ✓ · Target yield 7%+ ✓ · Cash buyer ✓' },
    note: { text: "This looks exactly what I'm after — can we schedule a viewing?", variant: 'responded' },
    timeline: [
      { label: 'Expressed interest', note: "This looks exactly what I'm after — can we schedule a viewing?", time: '2h ago', color: 'teal' },
      { label: 'Pack opened', note: 'Full investor pack · 3 views', time: 'Yesterday', color: 'navy' },
    ],
  },
  {
    id: 'sarah-patel', name: 'Sarah Patel', email: 'sarah@propinvestors.com',
    type: 'committed', status: 'opened', trust: 'full',
    meta: [
      { text: '🕐 Last active 4h ago' },
      { text: '👁 Opened 1×' },
      { text: '🔓 Full access' },
    ],
    matchLine: { strength: 'medium', text: 'Prefers HMO but holds BTL · Budget £200k ✓ · Cardiff ✓ · Target yield 8%+ — this deal at 7.4%' },
    timeline: [
      { label: 'Pack opened', note: 'Full investor pack · 1 view', time: '4h ago', color: 'navy' },
    ],
  },
  {
    id: 'marcus-king', name: 'Marcus King', email: 'm.king@kingsinvestco.com',
    type: 'openmkt', status: 'passed', trust: 'protected',
    meta: [
      { text: '🕐 Responded yesterday' },
      { text: '👁 Opened 2×' },
      { text: '🚫 Address protected' },
    ],
    note: { text: "Yield a bit low for my target this month — keep me in mind for future deals.", variant: 'passed' },
    timeline: [
      { label: 'Passed', note: "Yield a bit low for my target this month.", time: 'Yesterday', color: 'red' },
      { label: 'Pack opened', note: 'Protected pack · 2 views', time: '2 days ago', color: 'navy' },
    ],
  },
  {
    id: 'laura-thompson', name: 'Laura Thompson', email: 'laura.t@investproperty.co.uk',
    type: 'openmkt', status: 'sent', trust: 'protected',
    meta: [
      { text: '⚠️ Sent 3 days ago · not opened', warn: true },
      { text: '🚫 Address protected' },
    ],
    timeline: [],
  },
]

const CRM_POOL: CrmInv[] = [
  { name: 'Helen Marsh',  type: 'openmkt',   criteria: 'Studio/1-bed, university towns, sub-£120k',           contact: 'Not provided' },
  { name: 'David Okafor', type: 'committed', criteria: 'New-build flats, South-East, £220–280k',               contact: '07700 907777 · d.okafor@icloud.com' },
  { name: 'Lucy Fenwick', type: 'openmkt',   criteria: 'Terraces, North-East, sub-£100k, cash only',           contact: '07700 908888 · lucy.fenwick@hotmail.co.uk' },
  { name: 'Marcus Webb',  type: 'committed', criteria: 'Mixed-use, anywhere, £400k+, value-add angle',         contact: '07700 909999 · marcus@webbproperty.io' },
  { name: 'Priya Sharma', type: 'openmkt',   criteria: '2-bed apartments, London zones 3–5, £300–400k',        contact: '07700 904444 · priya.sharma@proton.me' },
  { name: 'Tom Bradley',  type: 'committed', criteria: 'Portfolio buyer — 3+ units, anywhere, cash purchase',  contact: '07700 905555 · tom.bradley@bradleyholdings.co.uk' },
]

const SEED_NOTIFS: NotifData[] = [
  { id: 'n1', unread: true,  type: 'amber', deal: '14 Roath Court Rd', msg: 'Cooling-off period ends in 2 days — confirm investor is proceeding', time: 'Today' },
  { id: 'n2', unread: true,  type: 'navy',  deal: '14 Roath Court Rd', msg: 'Pack release scheduled for 15 Jun — ensure content is finalised', time: 'Today' },
  { id: 'n3', unread: true,  type: 'teal',  deal: '14 Roath Court Rd', msg: 'James Thornton expressed interest — log a response in Investors', time: 'Yesterday' },
  { id: 'n4', unread: false, type: 'navy',  deal: '14 Roath Court Rd', msg: 'Seller details not yet completed — add vendor motivation before sharing packs', time: '7 Jun' },
  { id: 'n5', unread: false, type: 'red',   deal: '52 Crwys Rd',       msg: 'Deal has been in Negotiation for 18 days with no update', time: '7 Jun' },
]

const RESP_OUTCOMES: { val: RespOutcome; label: string; icon: string; colorClass: 'teal' | 'amber' | 'red' | '' }[] = [
  { val: 'interested', label: 'Interested',     icon: '⭐', colorClass: 'teal' },
  { val: 'viewing',    label: 'Viewing booked', icon: '🏠', colorClass: '' },
  { val: 'offer',      label: 'Offer made',     icon: '💰', colorClass: 'amber' },
  { val: 'called',     label: 'Called',         icon: '📞', colorClass: '' },
  { val: 'emailed',    label: 'Emailed',        icon: '✉️',  colorClass: '' },
  { val: 'passed',     label: 'Passed',         icon: '✕',  colorClass: 'red' },
]

const STATUS_CFG: Record<InvStatus, { label: string; style: React.CSSProperties }> = {
  sent: {
    label: 'Sent',
    style: { background: BG_SEC, borderLeft: `3px solid #9ca3af`, paddingLeft: '7px', color: TEXT_1 },
  },
  opened: {
    label: 'Opened',
    style: { background: '#eff6ff', border: '.5px solid #bfdbfe', color: '#1e40af' },
  },
  interested: {
    label: 'Interested',
    style: { background: TEAL_LIGHT, border: '.5px solid rgba(29,158,117,.3)', color: '#065f46' },
  },
  passed: {
    label: 'Passed',
    style: { background: '#fef2f2', border: '.5px solid #fecaca', color: '#991b1b' },
  },
  reserved: {
    label: 'Reserved',
    style: { background: '#fffbeb', border: '.5px solid #fde68a', color: '#92400e' },
  },
  revoked: {
    label: 'Revoked',
    style: { background: BG_SEC, borderLeft: `3px solid #ef4444`, paddingLeft: '7px', color: '#9ca3af' },
  },
}

const NOTIF_CLR: Record<NotifData['type'], { bg: string; color: string }> = {
  amber: { bg: '#fef3c7', color: '#d97706' },
  navy:  { bg: NAVY_LIGHT, color: NAVY },
  teal:  { bg: TEAL_LIGHT, color: '#059669' },
  red:   { bg: '#fee2e2', color: '#dc2626' },
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

function StatusPill({ status }: { status: InvStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 500,
      padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0,
      ...cfg.style,
    }}>
      {cfg.label}
    </span>
  )
}

function InvAct({ label, icon, onClick, primary, danger }: {
  label: string; icon: string; onClick: () => void; primary?: boolean; danger?: boolean;
}) {
  const [hov, setHov] = useState(false)
  let bg = '#fff', color = TEXT_2, border = `.5px solid ${DS_BORDER}`
  if (primary)      { bg = NAVY;     color = '#fff'; border = `none` }
  else if (danger)  { bg = hov ? '#fef2f2' : '#fff'; color = hov ? '#991b1b' : '#9ca3af'; border = hov ? '.5px solid #fca5a5' : `.5px solid #f3f4f6` }
  else if (hov)     { bg = NAVY_LIGHT; color = NAVY; border = `.5px solid ${NAVY}` }
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontSize: '11px', fontWeight: 500, padding: '4px 11px', borderRadius: '6px',
        border, background: bg, color, cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
        transition: 'all .12s',
      }}>
      <span style={{ fontSize: '10px' }}>{icon}</span> {label}
    </button>
  )
}

function SfIn({ label, value, onChange, type, placeholder, optional }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; optional?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb', display: 'block', marginBottom: '3px' }}>
        {label} {optional && <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '9px', color: '#ccc' }}>(optional)</span>}
      </label>
      <input
        type={type ?? 'text'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '7px 10px', fontSize: '12px', color: TEXT_1, background: '#fff', fontFamily: 'inherit', width: '100%', outline: 'none', boxSizing: 'border-box' as const }}
        onFocus={e => (e.target.style.borderColor = NAVY)}
        onBlur={e => (e.target.style.borderColor = DS_BORDER)}
      />
    </div>
  )
}

function SbarCta({ onClick, children, outline, teal }: {
  onClick: () => void; children: React.ReactNode; outline?: boolean; teal?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '10px', background: teal ? TEAL : outline ? '#fff' : NAVY,
      color: outline ? TEXT_2 : '#fff', border: outline ? `.5px solid ${DS_BORDER}` : 'none',
      borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '5px', marginBottom: '6px',
    }}>
      {children}
    </button>
  )
}

function TypeBtn({ label, sub, active, onClick }: {
  label: string; sub: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '8px 10px', border: `.5px solid ${active ? NAVY : DS_BORDER}`,
      borderRadius: R_MD, background: active ? NAVY_LIGHT : '#fff',
      fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      transition: 'all .15s',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: active ? NAVY : TEXT_1, marginBottom: '1px' }}>{label}</div>
      <div style={{ fontSize: '9px', color: TEXT_2, lineHeight: 1.4 }}>{sub}</div>
    </button>
  )
}

interface InvRowProps {
  inv: InvData
  onLogResp: (id: string, name: string) => void
  onNotes:   (id: string, name: string) => void
  onToast:   (msg: string) => void
  onUpdateStatus: (id: string, status: InvStatus) => void
  expandedTl: Set<string>
  onToggleTl: (id: string) => void
}

function InvRow({ inv, onLogResp, onNotes, onToast, onUpdateStatus, expandedTl, onToggleTl }: InvRowProps) {
  const tlOpen = expandedTl.has(inv.id)
  const avBg   = avColor(inv.name)
  const inits  = initials(inv.name)

  const actions = buildActions(inv, onLogResp, onNotes, onToast, onUpdateStatus)

  return (
    <div style={{
      background: '#fff', borderRadius: R_MD, border: `.5px solid ${DS_BORDER}`,
      padding: '14px 14px 12px', marginBottom: '6px',
      transition: 'box-shadow .12s, border-color .12s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%', background: avBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {inits}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1 }}>{inv.name}</span>
            <StatusPill status={inv.status} />
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '5px' }}>{inv.email}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
            {inv.meta.map((m, i) => (
              <span key={i} style={{ fontSize: '10px', color: m.warn ? AMBER : '#9ca3af', display: 'flex', alignItems: 'center', gap: '3px' }}>
                {m.text}
              </span>
            ))}
          </div>
          {inv.matchLine && (
            <div style={{ marginTop: '7px', fontSize: '11px', color: TEXT_2, display: 'flex', alignItems: 'flex-start', gap: '5px', lineHeight: 1.5 }}>
              <span style={{ flexShrink: 0, marginTop: '1px', fontSize: '11px', color: TEAL }}>✦</span>
              <span>
                <span style={{ color: inv.matchLine.strength === 'strong' ? TEAL : AMBER, fontWeight: 600 }}>
                  {inv.matchLine.strength === 'strong' ? 'Strong match' : 'Medium match'}
                </span>
                {' · '}
                {inv.matchLine.text}
              </span>
            </div>
          )}
          {inv.note && (
            <div style={{
              marginTop: '8px', padding: '7px 10px', background: '#f9fafb',
              borderLeft: `2px solid ${inv.note.variant === 'responded' ? TEAL : '#fca5a5'}`,
              borderRadius: '0 4px 4px 0', fontSize: '11px', color: TEXT_2,
              fontStyle: 'italic', lineHeight: 1.5,
            }}>
              &ldquo;{inv.note.text}&rdquo;
            </div>
          )}
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {actions.map((a, i) => (
              <InvAct key={i} label={a.label} icon={a.icon} onClick={a.onClick} primary={a.primary} danger={a.danger} />
            ))}
          </div>
          {inv.timeline.length > 0 && (
            <div>
              <button
                onClick={() => onToggleTl(inv.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '10px', color: NAVY, cursor: 'pointer', border: 'none',
                  background: 'none', fontFamily: 'inherit', fontWeight: 600, padding: '0', marginTop: '6px',
                }}
              >
                🕐
                <span style={{ transition: 'transform .15s', display: 'inline-block', transform: tlOpen ? 'rotate(180deg)' : '' }}>▾</span>
                {inv.timeline.length} response{inv.timeline.length !== 1 ? 's' : ''} logged
              </button>
              {tlOpen && (
                <div style={{ marginTop: '6px', paddingBottom: '2px' }}>
                  {inv.timeline.map((entry, i) => {
                    const dotColor: Record<TlColor, string> = { teal: TEAL, navy: NAVY, amber: AMBER, red: '#dc2626' }
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '5px 0',
                        borderLeft: '1.5px solid #e5e7eb', marginLeft: '7px', paddingLeft: '12px',
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute', left: '-4px', top: '8px',
                          width: '7px', height: '7px', borderRadius: '50%',
                          background: dotColor[entry.color],
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', fontWeight: 600, color: TEXT_1 }}>{entry.label}</div>
                          {entry.note && <div style={{ fontSize: '9px', color: TEXT_2, marginTop: '1px', fontStyle: 'italic' }}>&#8220;{entry.note}&#8221;</div>}
                        </div>
                        <div style={{ fontSize: '9px', color: TEXT_2, flexShrink: 0, marginTop: '1px' }}>{entry.time}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function buildActions(
  inv: InvData,
  onLogResp: (id: string, name: string) => void,
  onNotes: (id: string, name: string) => void,
  onToast: (msg: string) => void,
  onUpdateStatus: (id: string, status: InvStatus) => void,
): { icon: string; label: string; onClick: () => void; primary?: boolean; danger?: boolean }[] {
  const notes   = { icon: '📝', label: 'Notes',        onClick: () => onNotes(inv.id, inv.name) }
  const logResp = { icon: '💬', label: 'Log response', onClick: () => onLogResp(inv.id, inv.name) }
  const revoke  = { icon: '🚫', label: 'Revoke',       onClick: () => { onToast('Access revoked'); onUpdateStatus(inv.id, 'revoked') }, danger: true as const }

  if (inv.status === 'interested') {
    return [
      { icon: '📞', label: 'Schedule call',      onClick: () => onToast('Scheduling call…'), primary: true as const },
      { icon: '🔒', label: 'Reserve for investor', onClick: () => { onToast('Reserved for investor'); onUpdateStatus(inv.id, 'reserved') } },
      logResp, notes, revoke,
    ]
  }
  if (inv.status === 'opened') {
    return [
      { icon: '🔔', label: 'Re-notify', onClick: () => onToast('Re-notification sent') },
      notes, logResp, revoke,
    ]
  }
  if (inv.status === 'sent' && inv.type === 'openmkt') {
    return [
      { icon: '🔔', label: 'Chase',              onClick: () => onToast('Chase email sent') },
      { icon: '📋', label: 'Send questionnaire', onClick: () => onToast('Questionnaire sent') },
      revoke,
    ]
  }
  if (inv.status === 'sent' && inv.type === 'committed') {
    return [
      { icon: '🔔', label: 'Chase', onClick: () => onToast('Chase email sent') },
      notes, logResp, revoke,
    ]
  }
  if (inv.status === 'passed') {
    return [
      { icon: '📖', label: 'Save to CRM', onClick: () => onToast('Saved to CRM') },
      notes,
    ]
  }
  if (inv.status === 'reserved') {
    return [
      { icon: '📄', label: 'Send fee agreement', onClick: () => onToast('Fee agreement sent') },
      logResp, notes, revoke,
    ]
  }
  return [notes, logResp, revoke]
}

export interface InvestorsTabProps { deal: Deal }

export default function InvestorsTab({ deal }: InvestorsTabProps) {
  const [investors,    setInvestors]    = useState<InvData[]>(SEED_INVESTORS)
  const [filter,       setFilter]       = useState<FilterMode>('all')
  const [tier,         setTier]         = useState<Tier>('pro')
  const [expDismissed, setExpDismissed] = useState(false)
  const [expandedTl,   setExpandedTl]   = useState<Set<string>>(new Set())

  const [toast,     setToast]     = useState('')
  const [toastShow, setToastShow] = useState(false)

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs,    setNotifs]    = useState<NotifData[]>(SEED_NOTIFS)
  const notifRef = useRef<HTMLDivElement>(null)

  const [pickerOpen,  setPickerOpen]  = useState(false)
  const [pickerMode,  setPickerMode]  = useState<'search' | 'new'>('search')
  const [pickerQ,     setPickerQ]     = useState('')
  const [pickerName,  setPickerName]  = useState('')
  const [pickerType,  setPickerType]  = useState<InvType>('committed')
  const [pickerPhone, setPickerPhone] = useState('')
  const [pickerEmail, setPickerEmail] = useState('')

  const [notesOpen,  setNotesOpen]  = useState(false)
  const [notesInvId, setNotesInvId] = useState<string | null>(null)
  const [notesInvName, setNotesInvName] = useState('')
  const [notesMap,   setNotesMap]   = useState<Record<string, NoteEntry[]>>({})
  const [noteInput,  setNoteInput]  = useState('')

  const [respOpen,    setRespOpen]    = useState(false)
  const [respInvId,   setRespInvId]   = useState<string | null>(null)
  const [respInvName, setRespInvName] = useState('')
  const [respChip,    setRespChip]    = useState<RespOutcome>('interested')
  const [respNote,    setRespNote]    = useState('')

  const [shareType,  setShareType]  = useState<InvType>('committed')
  const [shareName,  setShareName]  = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [shareNote,  setShareNote]  = useState('')

  const showToast = useCallback((msg: string) => {
    setToast(msg); setToastShow(true)
    setTimeout(() => setToastShow(false), 2200)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setPickerOpen(false); setNotesOpen(false); setRespOpen(false) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function toggleTl(id: string) {
    setExpandedTl(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })
  }

  function updateStatus(id: string, status: InvStatus) {
    setInvestors(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv))
  }

  function openRespLog(id: string, name: string) {
    setRespInvId(id); setRespInvName(name); setRespChip('interested'); setRespNote('')
    setRespOpen(true)
  }

  function saveRespLog() {
    if (!respInvId) return
    const outcome = RESP_OUTCOMES.find(o => o.val === respChip)!
    const tlColor: TlColor = respChip === 'interested' ? 'teal' : respChip === 'offer' ? 'amber' : respChip === 'passed' ? 'red' : 'navy'
    const newStatus: InvStatus =
      respChip === 'interested' ? 'interested' :
      respChip === 'passed'     ? 'passed'     : investors.find(i => i.id === respInvId)?.status ?? 'sent'
    setInvestors(prev => prev.map(inv => {
      if (inv.id !== respInvId) return inv
      const newEntry: TlEntry = { label: outcome.label, note: respNote, time: 'Just now', color: tlColor }
      return {
        ...inv,
        status: newStatus,
        note: respNote ? { text: respNote, variant: respChip === 'passed' ? 'passed' : 'responded' } : inv.note,
        timeline: [newEntry, ...inv.timeline],
      }
    }))
    setExpandedTl(prev => { const next = new Set(prev); next.add(respInvId!); return next })
    setRespOpen(false)
    showToast(`Response logged for ${respInvName}`)
  }

  function openNotes(id: string, name: string) {
    setNotesInvId(id); setNotesInvName(name); setNoteInput(''); setNotesOpen(true)
  }

  function addNote() {
    const txt = noteInput.trim(); if (!txt || !notesInvId) return
    const entry: NoteEntry = { id: Date.now().toString(), author: 'You', text: txt, time: 'Just now' }
    setNotesMap(prev => ({ ...prev, [notesInvId]: [entry, ...(prev[notesInvId] ?? [])] }))
    setNoteInput(''); showToast('Note added')
  }

  function deleteNote(invId: string, noteId: string) {
    setNotesMap(prev => ({ ...prev, [invId]: (prev[invId] ?? []).filter(n => n.id !== noteId) }))
    showToast('Note deleted')
  }

  function readNotif(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n))
  }

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })))
  }

  function openPickerReset() {
    setPickerMode('search'); setPickerQ(''); setPickerName(''); setPickerPhone('')
    setPickerEmail(''); setPickerType('committed'); setPickerOpen(true)
  }

  function addFromCrm(crm: CrmInv) {
    const newInv: InvData = {
      id: crm.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: crm.name, email: crm.contact.split(' · ')[1] ?? '',
      type: crm.type, status: 'sent', trust: crm.type === 'committed' ? 'full' : 'protected',
      meta: [
        { text: '🕐 Added just now' },
        { text: crm.type === 'committed' ? '🔓 Full access' : '🚫 Address protected' },
      ],
      timeline: [],
    }
    setInvestors(prev => [newInv, ...prev])
    setPickerOpen(false)
    showToast(`${crm.name} added to this deal · saved to Investors CRM`)
  }

  function createNew() {
    if (!pickerName.trim()) return
    const newInv: InvData = {
      id: pickerName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: pickerName, email: pickerEmail,
      type: pickerType, status: 'sent', trust: pickerType === 'committed' ? 'full' : 'protected',
      meta: [
        { text: '🕐 Added just now' },
        { text: pickerType === 'committed' ? '🔓 Full access' : '🚫 Address protected' },
      ],
      timeline: [],
    }
    setInvestors(prev => [newInv, ...prev])
    setPickerOpen(false)
    showToast(`${pickerName} created and added to deal · saved to Investors CRM`)
  }

  function sendShareLink() {
    if (!shareName.trim() || !shareEmail.trim()) { showToast('Please enter investor name and email'); return }
    const newInv: InvData = {
      id: shareName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: shareName, email: shareEmail,
      type: shareType, status: 'sent', trust: shareType === 'committed' ? 'full' : 'protected',
      meta: [
        { text: '🕐 Added just now' },
        { text: shareType === 'committed' ? '🔓 Full access' : '🚫 Address protected' },
      ],
      timeline: [],
    }
    setInvestors(prev => [newInv, ...prev])
    setShareName(''); setShareEmail(''); setShareNote('')
    showToast('Deal link sent — investor notified')
  }

  const committed = investors.filter(i => i.type === 'committed')
  const openmkt   = investors.filter(i => i.type === 'openmkt')
  const interested = investors.filter(i => i.status === 'interested').length
  const opened     = investors.filter(i => i.status === 'opened' || i.status === 'interested').length
  const passed     = investors.filter(i => i.status === 'passed').length
  const noResp     = investors.filter(i => i.status === 'sent').length
  const unreadCount = notifs.filter(n => n.unread).length

  const crmFiltered = CRM_POOL.filter(c =>
    !pickerQ.trim() ||
    c.name.toLowerCase().includes(pickerQ.toLowerCase()) ||
    c.criteria.toLowerCase().includes(pickerQ.toLowerCase()) ||
    (c.type === 'committed' ? 'committed' : 'open market').includes(pickerQ.toLowerCase())
  )

  const currentNotes = notesInvId ? (notesMap[notesInvId] ?? []) : []

  const anyPanelOpen = pickerOpen || notesOpen

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 24px 32px', position: 'relative' }}>
      <Toast msg={toast} show={toastShow} />

      {!expDismissed && (
        <div style={{
          background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`,
          boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '14px 18px',
          marginBottom: '12px', display: 'flex', gap: '14px', alignItems: 'flex-start',
          position: 'relative',
        }}>
          <button onClick={() => setExpDismissed(true)} style={{
            position: 'absolute', top: '10px', right: '12px', background: 'none',
            border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '16px', padding: '4px',
          }}>×</button>
          <div style={{
            width: '34px', height: '34px', borderRadius: R_MD, background: NAVY_LIGHT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0,
          }}>👥</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '3px' }}>Investors for this deal</div>
            <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.65 }}>
              <strong style={{ color: TEXT_1 }}>Committed investors</strong> have paid a deposit and you're sourcing their specific deal. <strong style={{ color: TEXT_1 }}>Open market</strong> investors are shoppers across your deals. Log responses — calls, viewings, offers — and track each investor's activity timeline.
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`,
        padding: '12px 18px', marginBottom: '12px',
        display: 'flex', alignItems: 'center', gap: '0',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}>
        {[
          { num: investors.length, label: 'shared with', numClr: NAVY },
          { num: opened,    label: `opened · ${investors.length > 0 ? Math.round(opened / investors.length * 100) : 0}%`, numClr: NAVY },
          { num: interested, label: 'interested', numClr: TEAL },
          { num: passed,    label: 'passed', numClr: '#9ca3af' },
          { num: noResp,    label: 'no response', numClr: '#9ca3af' },
        ].map((s, i, arr) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '5px', padding: '0 18px', borderRight: i < arr.length - 1 ? `.5px solid ${DS_BORDER}` : 'none', flex: 1, ...(i === 0 ? { paddingLeft: 0 } : {}) }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: s.numClr }}>{s.num}</span>
            <span style={{ fontSize: '11px', color: TEXT_2 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ paddingLeft: '18px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => showToast('Live tracking — upgrade to Pro+')} style={{
            fontSize: '10px', fontWeight: 600, color: NAVY,
            border: `.5px solid rgba(27,58,107,.25)`, borderRadius: '20px',
            padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', background: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            ⚡ Live tracking — upgrade
          </button>
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(prev => !prev)}
              style={{
                width: '30px', height: '30px', borderRadius: '8px',
                border: `.5px solid ${DS_BORDER}`, background: notifOpen ? BG_SEC : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '14px', position: 'relative',
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px', width: '7px', height: '7px',
                  borderRadius: '50%', background: AMBER, border: '1.5px solid #fff',
                }} />
              )}
            </button>
            {notifOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff',
                border: `.5px solid ${DS_BORDER}`, borderRadius: R_LG,
                boxShadow: '0 8px 32px rgba(0,0,0,.14)', width: '320px', zIndex: 400, overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: TEXT_1 }}>Notifications</span>
                  <button onClick={markAllRead} style={{ fontSize: '10px', color: NAVY, cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit', fontWeight: 600 }}>Mark all read</button>
                </div>
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {notifs.map(n => (
                    <div key={n.id} onClick={() => readNotif(n.id)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 14px',
                      borderBottom: `.5px solid ${DS_BORDER}`, cursor: 'pointer',
                      background: n.unread ? '#fefce8' : '#fff', position: 'relative',
                    }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
                        background: NOTIF_CLR[n.type].bg, color: NOTIF_CLR[n.type].color, fontSize: '13px',
                      }}>
                        {n.type === 'amber' ? '⚠️' : n.type === 'teal' ? '👤' : n.type === 'red' ? '⏰' : '📄'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '9px', fontWeight: 600, color: TEXT_2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '2px' }}>{n.deal}</div>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: TEXT_1, lineHeight: 1.4 }}>{n.msg}</div>
                        <div style={{ fontSize: '9px', color: TEXT_2, marginTop: '3px' }}>{n.time}</div>
                      </div>
                      {n.unread && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: AMBER, flexShrink: 0, marginTop: '5px' }} />}
                    </div>
                  ))}
                </div>
                <div style={{ padding: '9px 14px', borderTop: `.5px solid ${DS_BORDER}`, textAlign: 'center' }}>
                  <button onClick={markAllRead} style={{ fontSize: '11px', color: NAVY, cursor: 'pointer', border: 'none', background: 'none', fontFamily: 'inherit', fontWeight: 600 }}>Clear all notifications</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: BG_SEC, borderRadius: '20px', padding: '3px 4px', border: `.5px solid ${DS_BORDER}` }}>
            {(['pro', 'proplus'] as Tier[]).map(t => (
              <button key={t} onClick={() => { setTier(t); showToast(t === 'proplus' ? 'Pro+ active — live tracking & Smart Match unlocked' : 'Pro tier active') }} style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 9px', borderRadius: '20px',
                border: 'none', background: tier === t ? NAVY : 'transparent',
                color: tier === t ? '#fff' : TEXT_2,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {t === 'proplus' ? 'Pro+' : 'Pro'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '14px' }}>
        {(['all', 'committed', 'openmkt'] as FilterMode[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: '11px', fontWeight: filter === f ? 600 : 500,
            padding: '5px 13px', borderRadius: '16px',
            border: `.5px solid ${filter === f ? NAVY : DS_BORDER}`,
            background: filter === f ? NAVY : 'none',
            color: filter === f ? '#fff' : TEXT_2,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
          }}>
            {f === 'all' ? 'All' : f === 'committed' ? 'Committed' : 'Open market'}
          </button>
        ))}
        <button onClick={openPickerReset} style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '11px', fontWeight: 600, padding: '5px 13px', borderRadius: '7px',
          border: `.5px solid ${DS_BORDER}`, background: '#fff', color: TEXT_2,
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
        }}>
          👤+ Add investor
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', alignItems: 'start' }}>

        <div>
          {(filter === 'all' || filter === 'committed') && (
            <div style={{
              background: BG_SEC, borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`,
              boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: '10px',
            }}>
              <div style={{ padding: '11px 16px', borderBottom: `.5px solid ${DS_BORDER}`, background: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Committed investors</div>
                <span style={{ fontSize: '11px', color: TEXT_2 }}>Deposit paid · matched from Results</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: TEXT_2 }}>{committed.length} investor{committed.length !== 1 ? 's' : ''}</span>
                <button onClick={() => showToast('Smart Match — upgrade to Pro+')} style={{
                  marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: NAVY,
                  background: NAVY_LIGHT, border: `.5px solid #c8d6f0`, borderRadius: '20px',
                  padding: '2px 9px', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0,
                }}>
                  ✦ Smart Match · Pro+
                </button>
              </div>
              <div style={{ padding: '8px' }}>
                {committed.length === 0 ? (
                  <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: R_LG, marginBottom: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '14px' }}>👥</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: TEXT_1, marginBottom: '5px' }}>No committed investors yet</div>
                      <div style={{ fontSize: '12px', color: TEXT_2, maxWidth: '280px', lineHeight: 1.6, marginBottom: '18px' }}>Add investors from your CRM or create a new one directly.</div>
                      <button onClick={openPickerReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, padding: '9px 20px', borderRadius: '8px', border: 'none', background: NAVY, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                        👤+ Add investor
                      </button>
                    </div>
                  </div>
                ) : (
                  committed.map(inv => (
                    <InvRow key={inv.id} inv={inv} onLogResp={openRespLog} onNotes={openNotes}
                      onToast={showToast} onUpdateStatus={updateStatus} expandedTl={expandedTl} onToggleTl={toggleTl} />
                  ))
                )}
              </div>
            </div>
          )}

          {(filter === 'all' || filter === 'openmkt') && (
            <div style={{
              background: BG_SEC, borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`,
              boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: '10px',
            }}>
              <div style={{ padding: '11px 16px', borderBottom: `.5px solid ${DS_BORDER}`, background: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>Open market investors</div>
                <span style={{ fontSize: '11px', color: TEXT_2 }}>Finders fee · advertised deal</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: TEXT_2 }}>{openmkt.length} investor{openmkt.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ padding: '8px' }}>
                {openmkt.map(inv => (
                  <InvRow key={inv.id} inv={inv} onLogResp={openRespLog} onNotes={openNotes}
                    onToast={showToast} onUpdateStatus={updateStatus} expandedTl={expandedTl} onToggleTl={toggleTl} />
                ))}
              </div>
            </div>
          )}

          {tier === 'pro' && (
            <div style={{ position: 'relative', borderRadius: R_LG, marginBottom: '10px', overflow: 'hidden' }}>
              <div style={{ background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`, padding: '28px', textAlign: 'center', filter: 'blur(2px)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, marginBottom: '8px' }}>Engagement Analytics</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', maxWidth: '400px', margin: '0 auto' }}>
                  {['James Brown', 'Sarah Patel', 'Marcus King'].map(n => (
                    <div key={n} style={{ background: BG_SEC, borderRadius: R_MD, padding: '10px', fontSize: '11px', color: TEXT_2 }}>
                      <div style={{ fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>{initials(n)}</div>
                      <div>4 opens · 12 min</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(238,240,244,.9)', backdropFilter: 'blur(3px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '8px', borderRadius: R_LG,
              }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fff', border: `.5px solid ${DS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: NAVY }}>📊</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>Engagement Analytics</div>
                <div style={{ fontSize: '11px', color: TEXT_2 }}>Time spent per section, open count, per investor</div>
                <button onClick={() => showToast('Upgrade to Pro+ to unlock engagement analytics')} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 16px', borderRadius: '20px', background: NAVY, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Unlock with Pro+
                </button>
              </div>
            </div>
          )}

          {tier === 'proplus' && (
            <div style={{ background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`, padding: '14px 16px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: TEXT_1, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px' }}>📊</span> Engagement Analytics <span style={{ fontSize: '10px', background: TEAL_LIGHT, color: '#065f46', padding: '1px 8px', borderRadius: '20px', fontWeight: 600 }}>Pro+</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px' }}>
                {[
                  { name: 'James Brown', opens: 3, time: '8 min', section: 'Financials' },
                  { name: 'Sarah Patel', opens: 1, time: '3 min', section: 'Overview' },
                  { name: 'Marcus King', opens: 2, time: '5 min', section: 'Strategy' },
                  { name: 'Laura Thompson', opens: 0, time: '—', section: '—' },
                ].map(e => (
                  <div key={e.name} style={{ background: BG_SEC, borderRadius: R_MD, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1 }}>{e.name}</div>
                      <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '2px' }}>Last section: {e.section}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: NAVY }}>{e.opens}×</div>
                      <div style={{ fontSize: '10px', color: TEXT_2 }}>{e.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: `${STICKY_TOP}px` }}>

          <div style={{ background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>📤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>Share with investor</div>
                <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>Send deal link to an existing contact</div>
              </div>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb', display: 'block', marginBottom: '3px' }}>Investor type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <TypeBtn label="Committed" sub="Deposit paid · you find their deal" active={shareType === 'committed'} onClick={() => setShareType('committed')} />
                  <TypeBtn label="Open market" sub="Finders fee · advertised deal" active={shareType === 'openmkt'} onClick={() => setShareType('openmkt')} />
                </div>
              </div>
              <SfIn label="Name" value={shareName} onChange={setShareName} placeholder="Investor full name" />
              <SfIn label="Email" value={shareEmail} onChange={setShareEmail} type="email" placeholder="investor@email.com" />
              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb', display: 'block', marginBottom: '3px' }}>Note <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '9px', color: '#ccc' }}>(optional)</span></label>
                <textarea
                  value={shareNote} onChange={e => setShareNote(e.target.value)}
                  placeholder="Hi James, thought this one suits your brief..."
                  style={{ border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '7px 10px', fontSize: '12px', color: TEXT_1, background: '#fff', fontFamily: 'inherit', width: '100%', height: '52px', resize: 'none', outline: 'none', boxSizing: 'border-box' as const, lineHeight: 1.5 }}
                />
              </div>
              <div style={{ fontSize: '10px', color: TEXT_2, padding: '7px 10px', background: BG_SEC, borderRadius: '6px', lineHeight: 1.5 }}>
                {shareType === 'committed' ? '🔒 Committed investor — full access including address.' : '🔕 Open market — address hidden until trust is established.'}
              </div>
              <SbarCta teal onClick={sendShareLink}>📤 Send deal link</SbarCta>
              <SbarCta outline onClick={() => showToast('Questionnaire link sent')}>📋 Send questionnaire</SbarCta>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>🔗</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>Deal share link</div>
                <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>DealScore hosted · Pro branded</div>
              </div>
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '10px 12px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: TEXT_2, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>dealscore.io/d/{deal.reference ?? 'DS-004'}/j8kx2</span>
                  <button onClick={() => showToast('Link copied')} style={{ fontSize: '10px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', border: `.5px solid ${DS_BORDER}`, background: '#fff', color: NAVY, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Copy</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '7px', paddingTop: '7px', borderTop: `.5px solid ${DS_BORDER}`, fontSize: '9px', color: TEXT_2 }}>
                  🔕 Address protected
                </div>
              </div>
              <div style={{ background: '#f0fdf4', border: '.5px solid #6ee7b7', borderRadius: R_MD, padding: '9px 12px', fontSize: '11px', color: '#065f46', display: 'flex', gap: '7px', alignItems: 'flex-start', lineHeight: 1.6, marginBottom: '8px' }}>
                <span style={{ flexShrink: 0 }}>🛡</span>
                Committed investors receive a separate full-access link with address shown.
              </div>
              <SbarCta outline onClick={() => showToast('Opening investor share page preview…')}>👁 View as investor →</SbarCta>
            </div>
          </div>

          {tier === 'pro' && (
            <div style={{ background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>⚙️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>Link controls</div>
                  <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>Standard · 14-day expiry</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[{ l: 'Link expiry', v: '14 days' }, { l: 'Branding', v: 'DealScore' }].map(r => (
                    <div key={r.l} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '6px 0', borderBottom: `.5px solid #f3f4f6`, fontSize: '11px' }}>
                      <span style={{ color: TEXT_2 }}>{r.l}</span><span style={{ fontWeight: 600, color: TEXT_1 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'flex-start', gap: '5px', paddingTop: '10px', borderTop: `.5px solid ${DS_BORDER}`, marginTop: '8px', lineHeight: 1.5 }}>
                  🔒 Upgrade to Pro+ for custom expiry, bulk share, and your own branded share page.
                </div>
                <button onClick={() => showToast('Upgrade to Pro+ for link controls')} style={{ marginTop: '8px', width: '100%', padding: '9px', borderRadius: '8px', border: `.5px solid ${DS_BORDER}`, background: '#fff', color: TEXT_2, fontFamily: 'inherit', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Upgrade for custom controls
                </button>
              </div>
            </div>
          )}

          {tier === 'proplus' && (
            <div style={{ background: '#fff', borderRadius: R_LG, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>⚙️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>Link controls</div>
                  <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>Pro+ · Custom settings active</div>
                </div>
              </div>
              <div style={{ padding: '12px 14px' }}>
                {[
                  { l: 'Link expiry', action: <button onClick={() => showToast('Adjust link expiry in deal settings')} style={{ fontSize: '10px', fontWeight: 600, color: NAVY, background: NAVY_LIGHT, border: `.5px solid #c8d6f0`, borderRadius: '5px', padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>14 days ↗</button> },
                  { l: 'Bulk share', action: <button onClick={() => showToast('Select investors to bulk share')} style={{ fontSize: '10px', fontWeight: 600, color: TEAL, background: 'rgba(29,158,117,.08)', border: `.5px solid rgba(29,158,117,.25)`, borderRadius: '5px', padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Select</button> },
                  { l: 'Branded page', action: <span style={{ fontSize: '10px', fontWeight: 600, color: TEAL }}>✓ Active</span> },
                ].map((r, i, arr) => (
                  <div key={r.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '7px 0', borderBottom: i < arr.length - 1 ? `.5px solid #f3f4f6` : 'none' }}>
                    <span style={{ color: TEXT_2 }}>{r.l}</span>
                    {r.action}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'linear-gradient(135deg,rgba(27,58,107,.06) 0%,rgba(29,158,117,.05) 100%)', border: '.5px dashed rgba(27,58,107,.18)', borderRadius: R_MD, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', color: NAVY, opacity: .6 }}>✦</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: NAVY, letterSpacing: '.02em' }}>Investor portal</span>
              <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', background: 'rgba(27,58,107,.1)', color: NAVY, padding: '1px 6px', borderRadius: '20px', marginLeft: 'auto' }}>Coming soon</span>
            </div>
            <p style={{ fontSize: '9.5px', color: TEXT_2, lineHeight: 1.55, margin: 0 }}>Investors will log in to browse deals, mark interest, and set preferences so the right deals reach the right buyers automatically.</p>
          </div>

        </div>
      </div>

      {(anyPanelOpen || respOpen) && (
        <div
          onClick={() => { setPickerOpen(false); setNotesOpen(false); setRespOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,40,.55)', zIndex: 300 }}
        />
      )}

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#fff',
        zIndex: 301, transform: pickerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.32,.72,0,1)', display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,.16)',
      }}>
        <div style={{ background: NAVY, padding: '18px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>👤+ Add investor to deal</div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,.6)', marginTop: '3px' }}>{deal.address ?? '—'} · {deal.reference ?? 'DS-004'}</div>
          </div>
          <button onClick={() => setPickerOpen(false)} style={{ background: 'rgba(255,255,255,.1)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: R_MD, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <div style={{ display: 'flex', gap: '6px', background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: R_LG, padding: '4px', marginBottom: '18px' }}>
            {(['search', 'new'] as const).map(m => (
              <button key={m} onClick={() => setPickerMode(m)} style={{
                flex: 1, border: 'none', borderRadius: R_MD, fontFamily: 'inherit',
                fontSize: '12px', fontWeight: 600, padding: '8px 10px', cursor: 'pointer',
                background: pickerMode === m ? '#fff' : 'none',
                color: pickerMode === m ? NAVY : TEXT_2,
                boxShadow: pickerMode === m ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
                {m === 'search' ? '🔍 Search CRM' : '➕ New investor'}
              </button>
            ))}
          </div>

          {pickerMode === 'search' && (
            <div>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: TEXT_2 }}>🔍</span>
                <input
                  value={pickerQ} onChange={e => setPickerQ(e.target.value)}
                  placeholder="Search by name, type or criteria…"
                  style={{ width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '10px 12px 10px 36px', fontSize: '13px', fontFamily: 'inherit', color: TEXT_1, background: '#fff', boxSizing: 'border-box' as const, outline: 'none' }}
                />
              </div>
              <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: '#aaa', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                From your Investor CRM
                <span style={{ flex: 1, height: '.5px', background: DS_BORDER }} />
              </div>
              {crmFiltered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '34px 20px', color: TEXT_2, fontSize: '13px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px', color: DS_BORDER }}>🔍</div>
                  No matches — try a different search or switch to <strong>New investor</strong>.
                </div>
              ) : crmFiltered.map((crm, i) => (
                <div key={i} style={{ border: `.5px solid ${DS_BORDER}`, borderRadius: R_LG, padding: '12px 14px', marginBottom: '9px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {crm.name}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, padding: '2px 8px 2px 7px', background: BG_SEC, borderRadius: '4px', borderLeft: `3px solid ${crm.type === 'committed' ? '#10b981' : '#8b5cf6'}`, color: TEXT_1 }}>
                        {crm.type === 'committed' ? '🔒 Committed' : '🌐 Open market'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: TEXT_2, lineHeight: 1.5 }}>{crm.criteria}<br />{crm.contact}</div>
                  </div>
                  <button onClick={() => addFromCrm(crm)} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: R_MD, padding: '7px 13px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    ➕ Add to deal
                  </button>
                </div>
              ))}
            </div>
          )}

          {pickerMode === 'new' && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, marginBottom: '6px', display: 'block' }}>Full name</label>
              <input value={pickerName} onChange={e => setPickerName(e.target.value)} placeholder="e.g. Sarah Michaels"
                style={{ width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '9px 12px', fontSize: '13px', fontFamily: 'inherit', color: TEXT_1, background: '#fff', boxSizing: 'border-box' as const, marginBottom: '14px', outline: 'none' }} />

              <label style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, marginBottom: '6px', display: 'block' }}>Investor type</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {([['committed', '🔒 Committed', 'Pays a deposit upfront · full address access'], ['openmkt', '🌐 Open market', "Pays a finder's fee · address hidden until reservation"]] as [InvType, string, string][]).map(([val, lbl, desc]) => (
                  <button key={val} onClick={() => setPickerType(val)} type="button" style={{
                    flex: 1, border: `.5px solid ${pickerType === val ? NAVY : DS_BORDER}`,
                    borderRadius: R_MD, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    background: pickerType === val ? 'rgba(27,58,107,.05)' : '#fff', fontFamily: 'inherit',
                    boxShadow: pickerType === val ? `0 0 0 1px ${NAVY}` : 'none',
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, marginBottom: '2px' }}>{lbl}</div>
                    <div style={{ fontSize: '10px', color: TEXT_2, lineHeight: 1.4 }}>{desc}</div>
                  </button>
                ))}
              </div>

              <label style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, marginBottom: '6px', display: 'block' }}>Phone</label>
              <input value={pickerPhone} onChange={e => setPickerPhone(e.target.value)} type="tel" placeholder="07700 900000"
                style={{ width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '9px 12px', fontSize: '13px', fontFamily: 'inherit', color: TEXT_1, background: '#fff', boxSizing: 'border-box' as const, marginBottom: '14px', outline: 'none' }} />

              <label style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, marginBottom: '6px', display: 'block' }}>Email</label>
              <input value={pickerEmail} onChange={e => setPickerEmail(e.target.value)} type="email" placeholder="investor@email.com"
                style={{ width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '9px 12px', fontSize: '13px', fontFamily: 'inherit', color: TEXT_1, background: '#fff', boxSizing: 'border-box' as const, marginBottom: '14px', outline: 'none' }} />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '10px 12px', fontSize: '11px', color: TEXT_2, lineHeight: 1.55, marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: TEXT_2, flexShrink: 0 }}>ℹ️</span>
                Trust level will be set to <strong>{pickerType === 'committed' ? 'Full trust' : 'Protected'}</strong> automatically.
                {pickerType === 'committed' ? ' Committed investors get full address access by default.' : ' Address withheld until reservation.'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={createNew} disabled={!pickerName.trim()} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: R_MD, padding: '10px 18px', fontSize: '12px', fontWeight: 600, cursor: pickerName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: pickerName.trim() ? 1 : .4 }}>
                  👤+ Create &amp; add to deal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#fff',
        zIndex: 301, transform: notesOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .28s cubic-bezier(.32,.72,0,1)', display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,.16)',
      }}>
        <div style={{ background: NAVY, padding: '18px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>📝 Notes</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginTop: '3px' }}>{currentNotes.length} note{currentNotes.length !== 1 ? 's' : ''} · {notesInvName}</div>
          </div>
          <button onClick={() => setNotesOpen(false)} style={{ background: 'rgba(255,255,255,.1)', border: '.5px solid rgba(255,255,255,.2)', borderRadius: R_MD, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>✕ Close</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <div style={{ background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: R_LG, padding: '14px', marginBottom: '20px' }}>
            <textarea
              value={noteInput} onChange={e => setNoteInput(e.target.value)}
              placeholder="Add a note about this investor..."
              style={{ width: '100%', border: `.5px solid ${DS_BORDER}`, borderRadius: R_MD, padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', color: TEXT_1, resize: 'vertical', minHeight: '64px', background: '#fff', boxSizing: 'border-box' as const, outline: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addNote() }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button onClick={addNote} disabled={!noteInput.trim()} style={{ background: NAVY, color: '#fff', border: 'none', borderRadius: R_MD, padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: noteInput.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: noteInput.trim() ? 1 : .4 }}>
                ➕ Add note
              </button>
            </div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: '#aaa', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Activity <span style={{ flex: 1, height: '.5px', background: DS_BORDER }} />
          </div>
          {currentNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: TEXT_2, fontSize: '13px' }}>
              <div style={{ fontSize: '28px', color: DS_BORDER, marginBottom: '10px' }}>📝</div>
              No notes yet — add the first one above.
            </div>
          ) : currentNotes.map(n => (
            <div key={n.id} style={{ border: `.5px solid ${DS_BORDER}`, borderRadius: R_LG, padding: '14px 16px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>👤 {n.author}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: TEXT_2 }}>{n.time}</span>
                  <button onClick={() => notesInvId && deleteNote(notesInvId, n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_2, padding: '3px', borderRadius: '6px', display: 'flex', alignItems: 'center', fontSize: '13px' }}>🗑</button>
                </div>
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.55, color: TEXT_1, whiteSpace: 'pre-wrap' }}>{n.text}</div>
            </div>
          ))}
        </div>
      </div>

      {respOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setRespOpen(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: R_LG, width: '400px', maxWidth: 'calc(100vw - 32px)', boxShadow: '0 20px 60px rgba(0,0,0,.18)', overflow: 'hidden' }}>
            <div style={{ padding: '15px 18px 11px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: TEXT_1 }}>{respInvName}</div>
              <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '1px' }}>Log a response or interaction</div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {RESP_OUTCOMES.map(o => {
                  const active = respChip === o.val
                  const activeBg = o.colorClass === 'teal' ? TEAL : o.colorClass === 'amber' ? '#d97706' : o.colorClass === 'red' ? '#dc2626' : NAVY
                  return (
                    <button key={o.val} onClick={() => setRespChip(o.val)} style={{
                      fontSize: '11px', fontWeight: 500, padding: '5px 12px', borderRadius: '20px',
                      border: `.5px solid ${active ? activeBg : DS_BORDER}`,
                      background: active ? activeBg : '#fff',
                      color: active ? '#fff' : TEXT_2,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                      <span style={{ fontSize: '11px' }}>{o.icon}</span> {o.label}
                    </button>
                  )
                })}
              </div>
              <textarea
                value={respNote} onChange={e => setRespNote(e.target.value)}
                placeholder="Add a note (optional) — e.g. what they said, next step..."
                style={{ width: '100%', fontSize: '11px', padding: '8px 10px', border: `.5px solid ${DS_BORDER}`, borderRadius: '6px', fontFamily: 'inherit', color: TEXT_1, resize: 'vertical', minHeight: '52px', boxSizing: 'border-box' as const, marginBottom: '12px', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setRespOpen(false)} style={{ flex: 1, padding: '8px', border: `.5px solid ${DS_BORDER}`, borderRadius: '6px', background: '#fff', fontSize: '11px', fontWeight: 600, color: TEXT_2, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={saveRespLog} style={{ flex: 2, padding: '8px', border: 'none', borderRadius: '6px', background: NAVY, fontSize: '11px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Save response</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
