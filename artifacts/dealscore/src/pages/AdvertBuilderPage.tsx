import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../lib/AuthContext'

const NAVY      = '#1B3A6B'
const NAVY_DARK = '#152d55'
const TEAL_MID  = '#00C896'
const BG_BODY   = '#eef0f4'
const BG_SEC    = '#f5f6f8'
const DS_BORDER = '#e3e5e9'
const TEXT2     = '#5a6270'

type AdFormat  = 'portrait' | 'landscape' | 'story'
type AdvertMode = 'single' | 'multi'

interface MetricDef { key: string; label: string; val: string }

const ALL_METRICS: MetricDef[] = [
  { key: 'cf',    label: 'Monthly CF',     val: '+£482' },
  { key: 'coc',   label: 'CoC ROI',        val: '6.4%'  },
  { key: 'yield', label: 'Gross yield',    val: '6.4%'  },
  { key: 'price', label: 'Purchase price', val: '£207k' },
  { key: 'cash',  label: 'Cash invested',  val: '£63,420' },
  { key: 'net',   label: 'Net yield',      val: '5.1%'  },
  { key: 'bev',   label: 'Break-even rent',val: '£1,019' },
  { key: 'equity',label: 'Equity day one', val: '£12,000'},
]

const DEALS = [
  { strat: 'BTL', addr: '65a Horwood Close, Leeds LS7', score: 'RECOMMENDED', area: 'Leeds, LS7' },
  { strat: 'HMO', addr: '12 Victoria Street, Manchester M1', score: 'REVIEW', area: 'Manchester, M1' },
  { strat: 'SA',  addr: '3 Marina View, Brighton BN1', score: 'RECOMMENDED', area: 'Brighton, BN1' },
]

const PRESETS = [
  { label: 'DealScore default', bg: NAVY, acc: TEAL_MID, ctaTxt: NAVY },
  { label: 'Dark gold', bg: '#111827', acc: '#F59E0B', ctaTxt: '#111827' },
  { label: 'Forest green', bg: '#1a472a', acc: '#86efac', ctaTxt: '#1a472a' },
  { label: 'Deep purple', bg: '#4c1d95', acc: '#c4b5fd', ctaTxt: '#4c1d95' },
]

function darken(hex: string, amount: number): string {
  const r = Math.max(0, Math.floor(parseInt(hex.slice(1,3),16)*(1-amount)))
  const g = Math.max(0, Math.floor(parseInt(hex.slice(3,5),16)*(1-amount)))
  const b = Math.max(0, Math.floor(parseInt(hex.slice(5,7),16)*(1-amount)))
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('')
}

export default function AdvertBuilderPage() {
  const navigate = useNavigate()
  const { tier } = useAuth()

  const [mode, setMode]         = useState<AdvertMode>('single')
  const [dealIdx, setDealIdx]   = useState(0)
  const [area, setArea]         = useState('Leeds, LS7')
  const [finderFee, setFinderFee] = useState('£3,000')
  const [cta, setCta]           = useState('Text me to reserve this deal')
  const [contact, setContact]   = useState('07911 123 456')
  const [format, setFormat]     = useState<AdFormat>('portrait')
  const [showBadge, setShowBadge] = useState(true)
  const [showBranding, setShowBranding] = useState(true)
  const [overrideOn, setOverrideOn] = useState(false)
  const [cardBg, setCardBg]     = useState(NAVY)
  const [accColor, setAccColor] = useState(TEAL_MID)
  const [ctaTxtColor, setCtaTxtColor] = useState(NAVY)
  const [metricOn, setMetricOn] = useState<Record<string, boolean>>({
    cf: true, coc: true, yield: true, price: true,
    cash: false, net: false, bev: false, equity: false,
  })
  const [locChips, setLocChips] = useState(['12 min walk to train station', 'Ofsted Good primary nearby', 'Park & green space close by'])
  const [locInput, setLocInput] = useState('')
  const [locShow, setLocShow]   = useState(true)
  const [toastMsg, setToastMsg] = useState('')
  const [toastVis, setToastVis] = useState(false)

  function toast(msg: string) {
    setToastMsg(msg); setToastVis(true)
    setTimeout(() => setToastVis(false), 2200)
  }

  const maxMetrics = 4
  const enabledCount = Object.values(metricOn).filter(Boolean).length

  function toggleMetric(key: string) {
    setMetricOn(prev => {
      const on = !prev[key]
      if (on && enabledCount >= maxMetrics) return prev
      return { ...prev, [key]: on }
    })
  }

  function addChip() {
    const v = locInput.trim()
    if (!v) return
    setLocChips(prev => [...prev, v])
    setLocInput('')
    toast('Location tag added')
  }

  const bgColor   = overrideOn ? cardBg : NAVY
  const accent    = overrideOn ? accColor : TEAL_MID
  const ctaText   = overrideOn ? ctaTxtColor : NAVY
  const photoBg   = darken(bgColor, 0.15)

  const deal = DEALS[dealIdx]
  const enabledMetrics = ALL_METRICS.filter(m => metricOn[m.key])

  function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
      <div onClick={onToggle} style={{ width: '36px', height: '20px', background: on ? NAVY : DS_BORDER, borderRadius: '20px', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .2s' }}>
        <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: on ? '18px' : '2px', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.15)' }} />
      </div>
    )
  }

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', margin: '18px 0 8px', display: 'flex', alignItems: 'center', gap: '7px' }}>
        {children}
        <div style={{ flex: 1, height: '0.5px', background: DS_BORDER }} />
      </div>
    )
  }

  const formatMeta: Record<AdFormat, { w: number; h: number; label: string }> = {
    portrait:  { w: 40, h: 55, label: 'Portrait · 1080 × 1350px' },
    landscape: { w: 68, h: 46, label: 'Landscape · 1200 × 628px' },
    story:     { w: 34, h: 60, label: 'Story / Reel · 1080 × 1920px' },
  }

  const isBrandingLocked = tier === 'free' && !showBranding

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: BG_BODY, minHeight: '100vh', fontSize: '13px', color: '#1a1a2e' }}>
      <AppHeader />

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: NAVY_DARK, color: '#fff', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, zIndex: 9999, opacity: toastVis ? 1 : 0, transition: 'opacity .25s', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {toastMsg}
      </div>

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: `0.5px solid ${DS_BORDER}`, padding: '0 24px', height: '36px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '12px', fontFamily: 'inherit', padding: 0 }}>Dashboard</button>
        <span style={{ color: '#ccc', fontSize: '11px' }}>›</span>
        <span style={{ color: NAVY, fontWeight: 500 }}>Create deal advert</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', minHeight: 'calc(100vh - 92px)' }}>

        {/* LEFT: Controls */}
        <div style={{ padding: '24px', overflowY: 'auto', background: BG_BODY }}>

          <SectionLabel>Select deal</SectionLabel>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {(['single', 'multi'] as AdvertMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex: 1, padding: '9px', borderRadius: '8px', border: mode === m ? `1.5px solid ${NAVY}` : `0.5px solid ${DS_BORDER}`, background: mode === m ? 'rgba(27,58,107,.04)' : BG_SEC, cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', color: mode === m ? NAVY : '#888', fontWeight: mode === m ? 500 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all .15s' }}>
                {m === 'single' ? '🖼️ Single deal' : '📚 Multiple deals (portfolio)'}
              </button>
            ))}
          </div>
          {mode === 'multi' && <p style={{ fontSize: '11px', color: '#aaa', marginBottom: '10px', lineHeight: 1.5 }}>Select up to four deals to feature together — handy for a portfolio round-up post, an investor newsletter, or showcasing your pipeline at once.</p>}

          {DEALS.map((d, i) => (
            <div key={i} onClick={() => { setDealIdx(i); setArea(d.area) }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: '#fff', borderRadius: '10px', border: dealIdx === i ? `1.5px solid ${NAVY}` : `0.5px solid ${DS_BORDER}`, marginBottom: '7px', cursor: 'pointer', transition: 'all .15s' }}>
              <span style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', background: BG_SEC, color: '#888', padding: '2px 7px', borderRadius: '20px', flexShrink: 0 }}>{d.strat}</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: NAVY, flex: 1 }}>{d.addr}</span>
              <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: d.score === 'RECOMMENDED' ? '#ECFDF5' : '#FFFBEB', color: d.score === 'RECOMMENDED' ? '#065F46' : '#92400E', border: `0.5px solid ${d.score === 'RECOMMENDED' ? '#A7F3D0' : '#FDE68A'}` }}>{d.score}</span>
              {dealIdx === i && <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: '#fff', fontSize: '10px' }}>✓</span></div>}
            </div>
          ))}

          <SectionLabel>Area display</SectionLabel>
          <div style={{ background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: '9px', padding: '10px 13px', fontSize: '12px', color: '#92400E', display: 'flex', gap: '7px', lineHeight: 1.5, marginBottom: '10px' }}>
            🔒 Always use a local area or postcode district — <strong>never the full address</strong>. This protects vendor privacy and your sourcing fee.
          </div>
          <FieldLabel label="Area shown on advert">
            <input value={area} onChange={e => setArea(e.target.value)} style={inputStyle} />
          </FieldLabel>

          <SectionLabel>Background photo</SectionLabel>
          <div style={{ border: '1.5px dashed #d1d5db', borderRadius: '10px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', marginBottom: '10px' }}>
            <div style={{ fontSize: '22px', color: '#ccc', marginBottom: '5px' }}>📷</div>
            <div style={{ fontSize: '13px', color: '#888' }}>Click to upload a local area or lifestyle photo</div>
            <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>Not a photo of the actual property · JPG or PNG</div>
          </div>

          <SectionLabel>Nearby locations &amp; amenities</SectionLabel>
          <div style={{ background: '#fff', borderRadius: '10px', border: `0.5px solid ${DS_BORDER}`, padding: '13px 15px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '11px', lineHeight: 1.5 }}>Highlight what's nearby — without giving away the exact address. Up to three of these show as tags on the advert.</div>
            <div style={{ marginBottom: '8px' }}>
              {locChips.map((chip, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: BG_SEC, border: `0.5px solid ${DS_BORDER}`, borderRadius: '20px', padding: '6px 12px', fontSize: '11px', color: '#555', margin: '0 6px 6px 0' }}>
                  📍 {chip}
                  <button onClick={() => setLocChips(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '13px', lineHeight: 1, padding: 0, fontFamily: 'inherit' }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '7px', marginTop: '6px' }}>
              <input value={locInput} onChange={e => setLocInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChip()} placeholder="e.g. 5 min to motorway access" style={{ ...inputStyle, flex: 1, height: '36px' }} />
              <button onClick={addChip} style={{ padding: '0 16px', borderRadius: '7px', border: 'none', background: NAVY, color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#555' }}>Show on advert</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>Displays your top 3 tags beneath the area name</div>
              </div>
              <Toggle on={locShow} onToggle={() => setLocShow(p => !p)} />
            </div>
          </div>

          <SectionLabel>Advert colour theme</SectionLabel>
          <div style={{ background: '#fff', borderRadius: '10px', border: `0.5px solid ${DS_BORDER}`, padding: '14px 16px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: BG_SEC, border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '5px', background: NAVY, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: NAVY }}>Using your profile colours</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>Brand: #1B3A6B · Accent: #00C896</div>
              </div>
              <button onClick={() => navigate('/profile')} style={{ fontSize: '11px', color: NAVY, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', padding: 0 }}>Edit in profile →</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: overrideOn ? '10px' : 0 }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: NAVY, display: 'flex', alignItems: 'center', gap: '5px' }}>🎨 Override for this advert {overrideOn && <span style={{ fontSize: '10px', fontWeight: 500, background: '#FFFBEB', color: '#92400E', border: '0.5px solid #FDE68A', borderRadius: '20px', padding: '2px 8px' }}>One-off override</span>}</div>
                <div style={{ fontSize: '11px', color: '#aaa', fontWeight: 400, marginTop: '2px' }}>Resets to profile defaults after you close this screen</div>
              </div>
              <Toggle on={overrideOn} onToggle={() => setOverrideOn(p => !p)} />
            </div>
            {overrideOn && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px', marginTop: '10px' }}>
                  {[
                    { label: 'Card background', val: cardBg, set: setCardBg },
                    { label: 'Accent / CTA button', val: accColor, set: setAccColor },
                  ].map(cp => (
                    <div key={cp.label} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#bbb' }}>{cp.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="color" value={cp.val} onChange={e => cp.set(e.target.value)} style={{ width: '32px', height: '32px', borderRadius: '7px', border: `0.5px solid ${DS_BORDER}`, cursor: 'pointer', padding: '2px', flexShrink: 0 }} />
                        <input value={cp.val} onChange={e => cp.set(e.target.value)} style={{ flex: 1, padding: '7px 9px', borderRadius: '7px', border: `0.5px solid ${DS_BORDER}`, fontSize: '12px', fontFamily: 'monospace', background: '#fff', outline: 'none', height: '34px' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#aaa', marginBottom: '8px' }}>Quick presets</div>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                    {PRESETS.map(p => (
                      <button key={p.label} onClick={() => { setCardBg(p.bg); setAccColor(p.acc); setCtaTxtColor(p.ctaTxt) }}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '7px', border: `0.5px solid ${DS_BORDER}`, background: BG_SEC, cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', color: '#555' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: p.bg, flexShrink: 0 }} /> {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setCardBg(NAVY); setAccColor(TEAL_MID); setCtaTxtColor(NAVY) }}
                  style={{ fontSize: '11px', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '8px' }}>
                  🔄 Reset to profile defaults
                </button>
              </div>
            )}
          </div>

          <SectionLabel>Metrics to show</SectionLabel>
          <div style={{ background: '#fff', borderRadius: '10px', border: `0.5px solid ${DS_BORDER}`, padding: '11px 14px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '9px' }}>Choose up to {maxMetrics} metrics — auto-populated from your deal inputs.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
              {ALL_METRICS.map(m => {
                const on = metricOn[m.key]
                const canToggle = on || enabledCount < maxMetrics
                return (
                  <div key={m.key} onClick={() => canToggle && toggleMetric(m.key)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: '8px', border: `0.5px solid ${on ? '#BFDBFE' : DS_BORDER}`, background: on ? '#EFF6FF' : BG_SEC, cursor: canToggle ? 'pointer' : 'not-allowed', opacity: !on && !canToggle ? 0.4 : 1, transition: 'all .15s' }}>
                    <span style={{ fontSize: '12px', color: on ? '#1E40AF' : '#555' }}>{m.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: NAVY }}>{m.val}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <SectionLabel>Finder fee &amp; call to action</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px', marginBottom: '10px' }}>
            <FieldLabel label="Finder fee"><input value={finderFee} onChange={e => setFinderFee(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} /></FieldLabel>
            <FieldLabel label="Call to action text"><input value={cta} onChange={e => setCta(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} /></FieldLabel>
          </div>
          <FieldLabel label="Your contact"><input value={contact} onChange={e => setContact(e.target.value)} style={inputStyle} /></FieldLabel>

          <SectionLabel>Options</SectionLabel>
          <div style={{ background: '#fff', borderRadius: '10px', border: `0.5px solid ${DS_BORDER}`, padding: '0 14px', marginBottom: '10px' }}>
            {[
              { label: 'Show score badge', sub: 'Displays RECOMMENDED on the card', val: showBadge, set: () => setShowBadge(p => !p) },
              { label: 'Show DealScore branding', sub: '"Powered by DealScore" footer', val: showBranding, set: () => { if (tier !== 'free') setShowBranding(p => !p); else toast('Branding removal is a Pro feature') } },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `0.5px solid ${DS_BORDER}`, cursor: 'pointer' }} onClick={row.set}>
                <div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{row.label}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{row.sub}</div>
                </div>
                <Toggle on={row.val} onToggle={row.set} />
              </div>
            ))}
          </div>

          <SectionLabel>Format</SectionLabel>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['portrait', 'landscape', 'story'] as AdFormat[]).map(f => {
              const meta = formatMeta[f]
              return (
                <button key={f} onClick={() => setFormat(f)}
                  style={{ flex: 1, padding: '10px', borderRadius: '9px', border: format === f ? `1.5px solid ${NAVY}` : `0.5px solid ${DS_BORDER}`, background: format === f ? 'rgba(27,58,107,.02)' : BG_SEC, cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s' }}>
                  <div style={{ width: meta.w, height: meta.h, background: bgColor, margin: '0 auto 7px', borderRadius: '4px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 500, color: NAVY }}>{f.charAt(0).toUpperCase() + f.slice(1)}</div>
                  {f === 'landscape' && <div style={{ fontSize: '10px', color: '#7C3AED', fontWeight: 600, marginTop: '1px' }}>1200 × 628</div>}
                  {f !== 'landscape' && <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{f === 'portrait' ? '1080 × 1350' : '1080 × 1920'}</div>}
                </button>
              )
            })}
          </div>

          <button onClick={() => toast('Preparing PNG download…')} style={{ width: '100%', padding: '10px', background: NAVY, color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit', marginTop: '6px' }}>
            ⬇ Download advert as PNG
          </button>
          <button onClick={() => { navigator.clipboard?.writeText(`https://app.dealscore.co/share/${deal.strat.toLowerCase()}-${dealIdx}`); toast('Share link copied!') }}
            style={{ width: '100%', padding: '10px', background: BG_SEC, color: NAVY, border: `0.5px solid rgba(27,58,107,.18)`, borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit', marginTop: '6px' }}>
            📋 Copy share link
          </button>
        </div>

        {/* RIGHT: Live preview */}
        <div style={{ background: '#fff', borderLeft: `0.5px solid ${DS_BORDER}`, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            Live preview
            <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Updates as you type</span>
          </div>

          {/* Ad card */}
          <div style={{ width: '270px', borderRadius: '16px', overflow: 'hidden', color: '#fff', background: bgColor, boxShadow: '0 8px 24px rgba(0,0,0,.18)' }}>
            <div style={{ height: '134px', background: `linear-gradient(135deg, ${photoBg} 0%, ${bgColor} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>📷 Add photo above</div>
              {showBadge && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', fontWeight: 500, borderRadius: '20px', padding: '3px 9px', background: TEAL_MID, color: NAVY }}>RECOMMENDED</div>
              )}
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,.5)', marginBottom: '3px' }}>
                {deal.strat} · {area.split(',')[1]?.trim() ?? area}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: locShow && locChips.length > 0 ? '6px' : '11px', lineHeight: 1.2 }}>{area}</div>
              {locShow && locChips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '11px' }}>
                  {locChips.slice(0,3).map((chip, i) => (
                    <span key={i} style={{ background: 'rgba(255,255,255,.12)', borderRadius: '20px', padding: '4px 10px', fontSize: '9px', color: 'rgba(255,255,255,.8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📍 {chip}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '11px' }}>
                {enabledMetrics.slice(0, maxMetrics).map(m => (
                  <div key={m.key} style={{ background: 'rgba(255,255,255,.1)', borderRadius: '7px', padding: '7px 9px' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,.5)', marginBottom: '2px' }}>{m.label}</div>
                    <div style={{ fontSize: '12px', fontWeight: 500 }}>{m.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,.1)', margin: '0 0 11px' }} />
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)', marginBottom: '2px' }}>Finder fee</div>
              <div style={{ fontSize: '20px', fontWeight: 500, marginBottom: '11px' }}>{finderFee}</div>
              <div style={{ borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontWeight: 500, textAlign: 'center', background: accent, color: ctaText }}>{cta}</div>
              {showBranding && <div style={{ fontSize: '8px', color: 'rgba(255,255,255,.25)', textAlign: 'center', marginTop: '9px' }}>Powered by DealScore</div>}
            </div>
          </div>

          <div style={{ marginTop: '13px', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>{formatMeta[format].label}</div>

          {overrideOn && (
            <div style={{ marginTop: '10px', background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: '#92400E', width: '100%', textAlign: 'center' }}>
              🎨 One-off colour override active — resets when you leave this screen
            </div>
          )}

          <div style={{ marginTop: '20px', width: '100%', borderTop: `0.5px solid ${DS_BORDER}`, paddingTop: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#aaa', marginBottom: '8px' }}>What you get</div>
            {[
              'High-res PNG ready to post or share',
              'Area only — full address never shown',
              'Metrics auto-populated from your deal',
              'Works on WhatsApp, Facebook, Instagram',
            ].map(item => (
              <div key={item} style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <span style={{ color: '#10B981', fontSize: '13px' }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', borderRadius: '7px', border: `0.5px solid ${DS_BORDER}`,
  fontSize: '13px', background: '#fff', color: '#222', outline: 'none', width: '100%',
  fontFamily: 'inherit', height: '36px', boxSizing: 'border-box', marginBottom: '10px',
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
      <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#bbb', height: '24px', display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>{label}</div>
      {children}
    </div>
  )
}
