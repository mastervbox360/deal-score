import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'

const NAVY      = '#1B3A6B'
const NAVY_DARK = '#152d55'
const NAVY_DEEP = '#0f2040'
const TEAL_MID  = '#10B981'
const ACCENT    = '#7C3AED'
const BG_SEC    = '#f5f6f8'
const DS_BORDER = '#e3e5e9'
const TEXT2     = '#6c757d'

type CoverStyle = 'classic' | 'clean' | 'bold'
type PackFormat = 'portrait' | 'landscape'

interface CoverDeal {
  addr: string
  strat: string
  score: string
  bmv: string
  fee: string
  metrics: [string, string][]
}

const COVER_DEALS: CoverDeal[] = [
  {
    addr: '65a Horwood Close, Leeds LS7',
    strat: 'Buy-to-Let',
    score: 'RECOMMENDED',
    bmv: '9% below market value',
    fee: '£3,000 sourcing fee',
    metrics: [['Monthly CF', '+£482/mo'], ['CoC ROI', '6.4%'], ['Gross yield', '6.4%'], ['Purchase price', '£207k']],
  },
  {
    addr: '12 Victoria Street, Manchester M1',
    strat: 'HMO · 6-bed',
    score: 'REVIEW',
    bmv: '4% below market value',
    fee: '£4,200 sourcing fee',
    metrics: [['Monthly CF', '+£910/mo'], ['Net yield', '9.1%'], ['Rooms let', '6 of 6'], ['Purchase price', '£295k']],
  },
  {
    addr: '8 Park Lane, Birmingham B15',
    strat: 'BRRR · refurb',
    score: 'RECOMMENDED',
    bmv: '14% below market value',
    fee: '£3,500 sourcing fee',
    metrics: [['Cash left in', '£18,400'], ['Post-refurb value', '£241k'], ['Refurb cost', '£32k'], ['Purchase price', '£185k']],
  },
]

let _refSeq = 12
function nextRef() {
  _refSeq++
  return `DS-2026-0612-${String.fromCharCode(64 + ((_refSeq - 1) % 26) + 1)}`
}

export default function CoverDesignerPage() {
  const navigate = useNavigate()

  const [pack, setPack]         = useState<PackFormat>('portrait')
  const [style, setStyle]       = useState<CoverStyle>('classic')
  const [showScore, setShowScore] = useState(true)
  const [showFee, setShowFee]   = useState(true)
  const [showBmv, setShowBmv]   = useState(true)
  const [dealIdx, setDealIdx]   = useState(0)
  const [refId, setRefId]       = useState('DS-2026-0612-M')
  const [toastMsg, setToastMsg] = useState('')
  const [toastVis, setToastVis] = useState(false)

  function toast(msg: string) {
    setToastMsg(msg); setToastVis(true)
    setTimeout(() => setToastVis(false), 2200)
  }

  function regenRef() {
    setRefId(nextRef())
    toast('New reference generated — the old one stays valid on packs already sent')
  }

  const deal = COVER_DEALS[dealIdx]

  function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
      <div onClick={onToggle} style={{ width: '36px', height: '20px', background: on ? NAVY : DS_BORDER, borderRadius: '20px', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .2s', marginTop: '1px' }}>
        <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: on ? '18px' : '2px', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }} />
      </div>
    )
  }

  function CoverPreview() {
    const bmvHtml   = showBmv   ? deal.bmv  : null
    const scoreHtml = showScore ? deal.score : null
    const feeHtml   = showFee   ? deal.fee   : null

    if (style === 'classic') {
      return (
        <div style={{ width: '100%', maxWidth: '480px', aspectRatio: '3/4', borderRadius: '10px', overflow: 'hidden', position: 'relative', boxShadow: '0 10px 36px rgba(0,0,0,.16)', background: `linear-gradient(165deg, ${NAVY} 0%, ${NAVY} 50%, ${TEAL_MID} 130%)`, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.6)' }}>Investment opportunity</span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.55)', fontVariantNumeric: 'tabular-nums' }}>{refId}</span>
          </div>
          <div>
            <div style={{ fontSize: '23px', fontWeight: 700, lineHeight: 1.25, marginBottom: '6px' }}>{deal.addr}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.7)', marginBottom: '16px' }}>{deal.strat} · Prepared for review</div>
            {bmvHtml && <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', background: 'rgba(255,255,255,.16)', border: '0.5px solid rgba(255,255,255,.25)', borderRadius: '20px', padding: '4px 11px', marginBottom: '14px' }}>{bmvHtml}</div>}
            {scoreHtml && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: TEAL_MID, color: '#052e16', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '5px 12px', marginBottom: '14px' }}>✦ {scoreHtml}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '7px' }}>
              {deal.metrics.map(m => (
                <div key={m[0]} style={{ background: 'rgba(255,255,255,.1)', borderRadius: '6px', padding: '7px 6px' }}>
                  <div style={{ fontSize: '7px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>{m[0]}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>{m[1]}</div>
                </div>
              ))}
            </div>
            {feeHtml && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.65)', marginTop: '12px' }}>{feeHtml}</div>}
          </div>
        </div>
      )
    }

    if (style === 'clean') {
      return (
        <div style={{ width: '100%', maxWidth: '480px', aspectRatio: '3/4', borderRadius: '10px', overflow: 'hidden', position: 'relative', boxShadow: '0 10px 36px rgba(0,0,0,.16)', background: '#fff', color: '#1a1a2e', display: 'flex', flexDirection: 'column', padding: '30px 28px' }}>
          <span style={{ position: 'absolute', top: '24px', right: '28px', fontSize: '9px', color: '#bbb', fontVariantNumeric: 'tabular-nums' }}>{refId}</span>
          <div style={{ width: '38px', height: '3px', background: ACCENT, borderRadius: '3px', marginBottom: '18px' }} />
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#aaa', marginBottom: '6px' }}>Investment opportunity</div>
          <div style={{ fontSize: '25px', fontWeight: 700, lineHeight: 1.28, letterSpacing: '-0.01em', marginBottom: '6px' }}>{deal.addr}</div>
          <div style={{ fontSize: '11px', color: TEXT2, marginBottom: '18px' }}>{deal.strat} · Prepared for review</div>
          {bmvHtml && <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 600, color: ACCENT, border: '0.5px solid #E9D5FF', background: '#FAF5FF', borderRadius: '20px', padding: '4px 11px', marginBottom: '12px', width: 'fit-content' }}>{bmvHtml}</div>}
          {scoreHtml && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '0.5px solid #A7F3D0', background: '#ECFDF5', color: '#065F46', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '5px 12px', marginBottom: '16px', width: 'fit-content' }}>✦ {scoreHtml}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginTop: 'auto', borderTop: `0.5px solid ${DS_BORDER}`, paddingTop: '16px' }}>
            {deal.metrics.map(m => (
              <div key={m[0]}>
                <div style={{ fontSize: '8px', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#aaa' }}>{m[0]}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px', color: '#1a1a2e' }}>{m[1]}</div>
              </div>
            ))}
          </div>
          {feeHtml && <div style={{ fontSize: '10px', color: TEXT2, marginTop: '14px' }}>{feeHtml}</div>}
        </div>
      )
    }

    // bold
    return (
      <div style={{ width: '100%', maxWidth: '480px', aspectRatio: '3/4', borderRadius: '10px', overflow: 'hidden', position: 'relative', boxShadow: '0 10px 36px rgba(0,0,0,.16)', background: NAVY_DEEP, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '28px 30px' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '46%', background: `linear-gradient(135deg, ${ACCENT} 0%, #a78bfa 100%)`, clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)', fontWeight: 700 }}>Investment opportunity</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.7)', fontVariantNumeric: 'tabular-nums' }}>{refId}</span>
        </div>
        <div style={{ position: 'relative', zIndex: 2, fontSize: '26px', fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.02em', margin: '30px 0 6px' }}>{deal.addr}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.65)', marginBottom: '14px' }}>{deal.strat} · Prepared for review</div>
        {bmvHtml && <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', background: '#fff', color: NAVY_DEEP, borderRadius: '5px', padding: '5px 11px', marginBottom: '12px', width: 'fit-content' }}>↓ {bmvHtml.toUpperCase()}</div>}
        {scoreHtml && <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: TEAL_MID, color: '#052e16', fontSize: '11px', fontWeight: 800, borderRadius: '5px', padding: '6px 13px', marginBottom: '14px', width: 'fit-content' }}>✦ {scoreHtml}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '7px' }}>
          {deal.metrics.map(m => (
            <div key={m[0]} style={{ background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.12)', borderRadius: '6px', padding: '7px 6px' }}>
              <div style={{ fontSize: '7px', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' }}>{m[0]}</div>
              <div style={{ fontSize: '11px', fontWeight: 800, marginTop: '2px' }}>{m[1]}</div>
            </div>
          ))}
        </div>
        {feeHtml && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.6)', marginTop: '12px', position: 'relative', zIndex: 2 }}>{feeHtml}</div>}
      </div>
    )
  }

  const STYLES: { key: CoverStyle; name: string; desc: string }[] = [
    { key: 'classic', name: 'Classic', desc: 'Navy-to-teal gradient, centred address, metric strip along the base. The original DealScore look.' },
    { key: 'clean', name: 'Clean', desc: 'White background, editorial type, plenty of space. Reads like a considered report rather than a sales sheet.' },
    { key: 'bold', name: 'Bold', desc: 'Dark canvas, oversized type, accent-colour block. Makes a strong first impression in a crowded inbox.' },
  ]

  const thumbStyles: Record<CoverStyle, React.CSSProperties> = {
    classic: { background: `linear-gradient(165deg, ${NAVY} 55%, ${TEAL_MID} 100%)` },
    clean: { background: '#fff', border: `0.5px solid ${DS_BORDER}`, position: 'relative', overflow: 'hidden' },
    bold: { background: NAVY_DEEP, position: 'relative', overflow: 'hidden' },
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#eef0f4', minHeight: '100vh', fontSize: '13px', color: '#1a1a2e' }}>
      <AppHeader />

      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: NAVY_DARK, color: '#fff', padding: '9px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, zIndex: 9999, opacity: toastVis ? 1 : 0, transition: 'opacity .25s', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {toastMsg}
      </div>

      <div style={{ padding: '14px 24px 0', fontSize: '12px', color: TEXT2, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ color: NAVY, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', padding: 0, textDecoration: 'none' }}>Dashboard</button>
        <span style={{ fontSize: '11px', color: '#ccc' }}>›</span>
        <span>Cover designer</span>
      </div>

      <div style={{ padding: '10px 24px 4px' }}>
        <div style={{ fontSize: '20px', fontWeight: 600, color: NAVY, display: 'flex', alignItems: 'center', gap: '9px' }}>🪪 Cover designer</div>
        <div style={{ fontSize: '12px', color: TEXT2, marginTop: '4px', maxWidth: '640px', lineHeight: 1.5 }}>Pick a cover style and what it shows — your choice applies to both the portrait pack and the landscape pack, and to every deal you export from now on.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '18px', padding: '16px 24px 40px', alignItems: 'start', maxWidth: '1320px', margin: '0 auto' }}>

        {/* LEFT */}
        <div>
          <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '18px 20px', marginBottom: '14px' }}>
            <div style={secLblStyle}>Pack format</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
              {([
                { key: 'portrait', icon: '📄', name: 'Portrait', sub: '8 pages · all tiers', pp: false },
                { key: 'landscape', icon: '📐', name: 'Landscape', sub: '10 pages', pp: true },
              ] as { key: PackFormat; icon: string; name: string; sub: string; pp: boolean }[]).map(p => (
                <div key={p.key} onClick={() => { setPack(p.key); if (p.pp) toast('Landscape pack is a Pro Plus format') }}
                  style={{ border: pack === p.key ? `1.5px solid ${NAVY}` : `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '12px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all .15s', background: pack === p.key ? '#eef3fb' : '#fff' }}>
                  <span style={{ fontSize: '18px', color: pack === p.key ? NAVY : TEXT2 }}>{p.icon}</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a2e', marginTop: '5px' }}>
                    {p.name} {p.pp && <span style={{ fontSize: '8px', fontWeight: 700, background: '#F3E8FF', color: ACCENT, border: '0.5px solid #E9D5FF', borderRadius: '20px', padding: '1px 6px', letterSpacing: '0.04em' }}>PRO+</span>}
                  </div>
                  <div style={{ fontSize: '10px', color: TEXT2, marginTop: '1px' }}>{p.sub}</div>
                </div>
              ))}
            </div>

            <div style={secLblStyle}>Cover style</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STYLES.map(s => (
                <div key={s.key} onClick={() => setStyle(s.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', border: style === s.key ? `1.5px solid ${NAVY}` : `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', transition: 'all .15s', background: style === s.key ? '#eef3fb' : '#fff' }}>
                  <div style={{ width: '38px', height: '50px', borderRadius: '5px', flexShrink: 0, ...thumbStyles[s.key] }}>
                    {s.key === 'clean' && <div style={{ position: 'absolute', left: '6px', right: '6px', top: '10px', height: '2px', background: ACCENT, borderRadius: '2px' }} />}
                    {s.key === 'bold' && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '14px', background: ACCENT }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a2e' }}>{s.name}</div>
                    <div style={{ fontSize: '10px', color: TEXT2, marginTop: '1px', lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '18px 20px' }}>
            <div style={secLblStyle}>What shows on the cover</div>
            {[
              { label: 'Deal Score', sub: 'Your headline verdict (e.g. "RECOMMENDED") shown as a badge', val: showScore, set: () => setShowScore(p => !p) },
              { label: 'Sourcing fee', sub: 'Shown discreetly near the base of the cover', val: showFee, set: () => setShowFee(p => !p) },
              { label: 'BMV strip', sub: 'Highlights how far below market value the deal sits', val: showBmv, set: () => setShowBmv(p => !p) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: `0.5px solid ${BG_SEC}`, cursor: 'pointer' }} onClick={row.set}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a2e' }}>{row.label}</div>
                  <span style={{ display: 'block', fontSize: '10px', fontWeight: 400, color: TEXT2, marginTop: '1px', lineHeight: 1.4 }}>{row.sub}</span>
                </div>
                <div onClick={e => { e.stopPropagation(); row.set() }}
                  style={{ width: '36px', height: '20px', background: row.val ? NAVY : DS_BORDER, borderRadius: '20px', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .2s', marginTop: '1px' }}>
                  <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: row.val ? '18px' : '2px', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }} />
                </div>
              </div>
            ))}

            <div style={{ ...secLblStyle, marginTop: '18px' }}>Deal reference number</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG_SEC, border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '10px 13px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: NAVY, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>{refId}</span>
              <button onClick={regenRef} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: TEXT2, lineHeight: 1 }} title="Generate a new reference">🔄</button>
            </div>
            <div style={{ fontSize: '10px', color: TEXT2, marginTop: '7px', lineHeight: 1.5 }}>Generated automatically for every pack — printed in the corner of the cover so you and your investor can refer back to the same version of a deal in conversation.</div>
          </div>
        </div>

        {/* RIGHT: Live preview */}
        <div>
          <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999' }}>
                Live preview <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>— updates as you choose</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: TEXT2 }}>
                Preview deal:
                <select value={dealIdx} onChange={e => setDealIdx(Number(e.target.value))}
                  style={{ fontFamily: 'inherit', fontSize: '11px', border: `0.5px solid ${DS_BORDER}`, borderRadius: '6px', padding: '5px 9px', color: '#1a1a2e', background: '#fff', cursor: 'pointer' }}>
                  <option value={0}>65a Horwood Close, Leeds (BTL)</option>
                  <option value={1}>12 Victoria Street, Manchester (HMO)</option>
                  <option value={2}>8 Park Lane, Birmingham (BRRR)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CoverPreview />
            </div>
            <div style={{ marginTop: '14px', padding: '11px 14px', background: '#eef3fb', borderRadius: '8px', fontSize: '11px', color: NAVY, lineHeight: 1.55, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              💡 <span><strong>Strategy-aware metric cards</strong> — the four numbers on the cover change automatically with each deal's strategy. Switch the preview deal above to see the cards adapt.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => toast('Saved as your default cover — applies to every pack you export from now on')}
                style={{ flex: 1, fontSize: '12px', fontWeight: 600, padding: '10px 14px', borderRadius: '8px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', color: '#1a1a2e', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all .12s' }}>
                💾 Save as default
              </button>
              <button onClick={() => toast('Opening full pack preview…')}
                style={{ flex: 1, fontSize: '12px', fontWeight: 600, padding: '10px 14px', borderRadius: '8px', border: 'none', background: NAVY, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all .12s' }}>
                👁 Preview full pack
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const secLblStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: '#999', marginBottom: '10px',
}
