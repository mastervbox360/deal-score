import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const NAVY = '#1B3A6B'
const TEAL = '#10B981'
const TEAL2 = '#1D9E75'

const INSIGHTS = [
  "The sourcing fee isn't for finding the deal. It's for knowing <which ones not to find>.",
  "Off-market doesn't mean hidden. It means the <seller chose you>. Don't waste that.",
  "Speed of response is the cheapest competitive advantage you have. <Most people waste it>.",
  "£5,000 a deal sounds modest. <Ten deals a year> doesn't. Protect the pipeline.",
  "Investors remember the sourcers who <saved them time>, not the ones who sent beautiful PDFs.",
  "The deal in due diligence is just a deal you <haven't closed yet>. Keep pushing.",
  "One investor who trusts you completely <beats ten> who are mildly interested.",
  "The best deal you'll ever do is the one you <nearly passed on>.",
  "Your pipeline value is your business valuation. <Treat it like one>.",
  "Due diligence isn't pessimism. It's how <you sleep at night> and your investor recommends you.",
  "Most sourcers lose deals to faster sourcers, <not better ones>.",
  "A motivated seller is worth more than a perfect property. <Both together> is a great month.",
  "Yield is interesting. Cash flow is real. <Fees are immediate>. Know which game you're playing.",
  "The best time to follow up on a pack was <yesterday>. The second best time is now.",
  "Systems beat hustle at scale. <Build both> before you decide which one you need.",
  "Track everything. The numbers you ignore <are the ones that cost you>.",
  "A good relationship with one solicitor is worth <more than three on speed dial>.",
  "Every deal you walk away from clean <builds the reputation> that brings the next one in.",
  "Investors don't invest in properties. <They invest in you>. The property is just the paperwork.",
  "The gap between a £3k fee and a £6k fee is usually just <how well you packaged it>.",
  "Most deals don't fall through. <Most sourcers give up> on them too early.",
  "Property is patient. <Sourcers can't afford to be>.",
  "The deal that feels too hard is usually the one worth doing. <Everyone else already quit>.",
  "Referrals don't happen because you're good. They happen because <you made someone else look good>.",
  "You don't build a sourcing business by finding deals. <You build it by being unforgettable> to the right twelve people.",
]

interface Targets { deals: number; fees: number; packs: number; viewings: number }
const DEFAULTS: Targets = { deals: 5, fees: 20000, packs: 4, viewings: 4 }

function loadTargets(): Targets {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('ds-hq-targets') ?? '{}') } }
  catch { return { ...DEFAULTS } }
}
function saveTargets(t: Targets) { localStorage.setItem('ds-hq-targets', JSON.stringify(t)) }
function loadTheme(): 'light' | 'dark' {
  const v = localStorage.getItem('ds-hq-theme')
  return v === 'dark' ? 'dark' : 'light'
}

function fmtFee(v: number) { return v >= 1000 ? `£${(v / 1000).toFixed(1).replace('.0', '')}k` : `£${v}` }

export default function HQPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  const [isDark, setIsDark] = useState(() => loadTheme() === 'dark')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [targets, setTargets] = useState<Targets>(loadTargets)
  const [draftTargets, setDraftTargets] = useState<Targets>(loadTargets)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem('ds-hq-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      setSettingsOpen(false)
    }
  }, [])

  useEffect(() => {
    if (settingsOpen) document.addEventListener('mousedown', handleClickOutside)
    else document.removeEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [settingsOpen, handleClickOutside])

  const T = isDark ? DARK_THEME : LIGHT_THEME

  const h = now.getHours()
  const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const m = now.getMinutes()
  const hh = h % 12 || 12
  const ampm = h >= 12 ? 'pm' : 'am'
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} · ${hh}:${m < 10 ? '0' + m : m}${ampm}`
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - now.getDate()

  // Daily insight
  const doy = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const insightRaw = INSIGHTS[doy % INSIGHTS.length]
  const insightHtml = insightRaw.replace(/<([^>]+)>/g, '<em>$1</em>')

  // KPI data (static demo values — real data would come from deals)
  const KPI_DATA = [
    { id: 'deals', label: 'Deals sourced', current: 3, prefix: '', suffix: '' },
    { id: 'fees', label: 'Fees earned', current: 14500, prefix: '£', suffix: '' },
    { id: 'packs', label: 'Packs sent', current: 2, prefix: '', suffix: '' },
    { id: 'viewings', label: 'Viewings', current: 2, prefix: '', suffix: '' },
  ]

  function fmtKpi(prefix: string, v: number) {
    if (prefix === '£') return fmtFee(v)
    return `${v}`
  }

  const kpiTargetMap: Record<string, number> = { deals: targets.deals, fees: targets.fees, packs: targets.packs, viewings: targets.viewings }
  const dDone = now.getDate() - 1

  return (
    <div style={{ minHeight: '100vh', background: T.bg, backgroundAttachment: 'fixed', color: T.text1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', transition: 'background .22s, color .22s' }}>
      <div style={{ width: 'min(960px, 100%)', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, position: 'relative' }}>
          <div onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', transition: 'opacity .2s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '.7')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.02em', color: T.text1 }}>
              Deal<span style={{ color: TEAL }}>Score</span>
            </span>
            <div style={{ width: '.5px', height: 11, background: T.rule }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: T.wm }}>HQ</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setIsDark(d => !d)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.togBg, border: `1.5px solid ${T.btnRing}`, borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: T.togIcon, fontFamily: 'inherit', transition: 'all .22s' }}
            >
              <i className={`ti ${isDark ? 'ti-moon' : 'ti-sun'}`} style={{ fontSize: 13 }} />
              {isDark ? 'Dark' : 'Light'}
            </button>

            <div ref={panelRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setDraftTargets({ ...targets }); setSettingsOpen(o => !o) }}
                style={{ width: 34, height: 34, borderRadius: 8, background: settingsOpen ? 'rgba(16,185,129,.12)' : T.btnBg, border: `1.5px solid ${settingsOpen ? TEAL : T.btnRing}`, color: settingsOpen ? TEAL : T.btnFg, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .22s' }}
              >
                <i className="ti ti-target" />
              </button>

              {settingsOpen && (
                <div style={{ position: 'absolute', top: 46, right: 0, zIndex: 200, background: T.panelBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, boxShadow: T.panelShadow, width: 300, padding: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>Monthly KPI Targets</div>
                  {[
                    { id: 'deals', label: 'Deals sourced', prefix: '' },
                    { id: 'fees', label: 'Fees earned', prefix: '£' },
                    { id: 'packs', label: 'Packs sent', prefix: '' },
                    { id: 'viewings', label: 'Viewings', prefix: '' },
                  ].map(row => (
                    <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: T.text2, flex: 1 }}>{row.label}</span>
                      {row.prefix && <span style={{ fontSize: 12, color: T.text3 }}>{row.prefix}</span>}
                      <input
                        type="number"
                        value={draftTargets[row.id as keyof Targets]}
                        onChange={e => setDraftTargets(prev => ({ ...prev, [row.id]: Number(e.target.value) || DEFAULTS[row.id as keyof Targets] }))}
                        style={{ width: 80, background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 7, padding: '5px 9px', fontSize: 12, fontWeight: 600, color: T.inputText, textAlign: 'right', fontFamily: 'inherit', outline: 'none' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => { saveTargets(draftTargets); setTargets(draftTargets); setSettingsOpen(false) }} style={{ flex: 1, background: TEAL, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, padding: 8, borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                    <button onClick={() => setSettingsOpen(false)} style={{ background: 'none', border: `1px solid ${T.btnRing}`, color: T.btnFg, fontSize: 12, padding: '8px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  </div>
                  <div style={{ fontSize: 10, color: T.text3, textAlign: 'center', marginTop: 10 }}>Resets automatically on 1st of month</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>

          {/* LEFT */}
          <div>
            <div style={{ fontSize: 26, fontWeight: 300, color: T.text1, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 3 }}>
              Good {tod}, <strong style={{ fontWeight: 700 }}>{firstName}.</strong>
            </div>
            <div style={{ fontSize: 11, color: T.text2, marginBottom: 18 }}>{dateStr}</div>

            <div style={{ height: '.5px', background: T.rule, marginBottom: 18 }} />

            {/* Earnings hero */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: TEAL, marginBottom: 6, opacity: .8 }}>Fees pending collection</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 5 }}>
                <div style={{ fontSize: 38, fontWeight: 800, color: T.text1, letterSpacing: '-.03em', lineHeight: 1 }}>
                  <span style={{ color: TEAL }}>£</span>14,500
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {[['3', 'deals closed'], ['£4,833', 'avg fee'], ['£58k', 'projected yr']].map(([val, lbl], i, arr) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: T.text1, fontWeight: 600 }}>{val}</span>
                    <span style={{ fontSize: 11, color: T.text2 }}>{lbl}</span>
                    {i < arr.length - 1 && <div style={{ width: '.5px', height: 9, background: T.rule, marginLeft: 4 }} />}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: '.5px', background: T.rule, marginBottom: 18 }} />

            {/* KPI bars */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: T.text3 }}>Monthly targets</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, background: T.card, border: `.5px solid ${T.cardBorder}`, borderRadius: 20, padding: '2px 9px' }}>{months[now.getMonth()]}</div>
            </div>

            {KPI_DATA.map(kpi => {
              const target = kpiTargetMap[kpi.id] || 1
              const pct = Math.min(100, Math.round((kpi.current / target) * 100))
              const done = pct >= 100
              const expected = target * (dDone / daysInMonth)
              const onTrack = kpi.current >= expected || done
              const statusColor = done ? TEAL : onTrack ? TEAL : '#D97706'
              const fillClass = done || onTrack ? 'ok' : 'behind'
              const fillBg = done ? `linear-gradient(90deg, ${TEAL2}, #34d399)` : onTrack ? `linear-gradient(90deg, ${TEAL2}, ${TEAL})` : 'linear-gradient(90deg, #d97706, #F59E0B)'
              return (
                <div key={kpi.id} style={{ marginBottom: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: T.text2 }}>{kpi.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.text1 }}>
                      {fmtKpi(kpi.prefix, kpi.current)}
                      <span style={{ fontWeight: 400, color: T.text3 }}> / {fmtKpi(kpi.prefix, target)}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: statusColor, marginLeft: 5 }}> {pct}%</span>
                    </span>
                  </div>
                  <div style={{ height: 3, background: T.track, borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: fillBg, borderRadius: 20, transition: 'width .7s cubic-bezier(.4,0,.2,1)' }} className={fillClass} />
                  </div>
                </div>
              )
            })}

            {/* Projection callout */}
            {(() => {
              const feesKpi = KPI_DATA.find(k => k.id === 'fees')!
              const target = targets.fees
              const done = feesKpi.current >= target
              const pace = dDone > 0 ? feesKpi.current / dDone : 0
              const proj = Math.round(pace * daysInMonth)
              const onTrack = feesKpi.current >= target * (dDone / daysInMonth) || done
              if (done) {
                return (
                  <div style={{ background: T.card, border: `.5px solid ${T.cardBorder}`, borderRadius: 8, padding: '9px 12px', marginTop: 12, fontSize: 11, color: T.text2, lineHeight: 1.55 }}>
                    <i className="ti ti-circle-check" style={{ fontSize: 11, marginRight: 5, color: TEAL }} />
                    All targets hit. <span style={{ color: TEAL, fontWeight: 600 }}>Strong month.</span>
                  </div>
                )
              }
              return (
                <div style={{ background: T.card, border: `.5px solid ${T.cardBorder}`, borderRadius: 8, padding: '9px 12px', marginTop: 12, fontSize: 11, color: T.text2, lineHeight: 1.55 }}>
                  <i className="ti ti-trending-up" style={{ fontSize: 11, marginRight: 5, color: onTrack ? TEAL : '#D97706' }} />
                  {onTrack
                    ? <>Fees on pace for <span style={{ color: TEAL, fontWeight: 600 }}>{fmtFee(proj)}</span> this month</>
                    : <>Fees projected at <span style={{ color: '#D97706', fontWeight: 600 }}>{fmtFee(proj)}</span> — <span style={{ color: '#D97706', fontWeight: 600 }}>{fmtFee(target - feesKpi.current)} short</span></>
                  }
                </div>
              )
            })()}
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: `.5px solid ${T.cardBorder}`, borderRadius: 10, overflow: 'hidden', background: T.card }}>
              {METRICS.map((m, i) => (
                <div key={i} style={{
                  padding: '12px 13px',
                  borderRight: (i % 3 !== 2) ? `.5px solid ${T.cardBorder}` : 'none',
                  borderTop: i >= 3 ? `.5px solid ${T.cardBorder}` : 'none',
                }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: m.color === 'teal' ? TEAL : m.color === 'amber' ? '#D97706' : T.text1, letterSpacing: '-.02em', marginBottom: 2 }}>{m.val}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{m.lbl}</div>
                </div>
              ))}
            </div>

            {/* Daily insight */}
            <div style={{ background: T.card, border: `.5px solid ${T.cardBorder}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: TEAL, marginBottom: 8, opacity: .8 }}>Today's insight</div>
              <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.65, fontStyle: 'italic' }} dangerouslySetInnerHTML={{ __html: insightHtml.replace(/<em>/g, `<em style="color:${T.text1};font-style:normal;font-weight:500;">`).replace(/<\/em>/g, '</em>') }} />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
          <div style={{ fontSize: 11, color: T.text3 }}>{daysLeft} days left in the month</div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: TEAL, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, padding: '9px 20px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7, transition: 'opacity .22s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '.87')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <i className="ti ti-layout-dashboard" style={{ fontSize: 13 }} /> Go to deals
          </button>
        </div>

      </div>
    </div>
  )
}

const METRICS = [
  { val: '8', lbl: 'Total deals', color: '' },
  { val: '1', lbl: 'Live', color: 'teal' },
  { val: '2', lbl: 'Reserved', color: 'teal' },
  { val: '2', lbl: 'Packs out', color: 'amber' },
  { val: '7.4%', lbl: 'Avg yield', color: '' },
  { val: '12', lbl: 'Investors', color: '' },
  { val: '4', lbl: 'Sellers', color: '' },
  { val: '2', lbl: 'Viewings', color: 'teal' },
  { val: '+£612', lbl: 'Avg CF/mo', color: '' },
]

const LIGHT_THEME = {
  bg: 'linear-gradient(145deg,#bfdbfe 0%,#dbeafe 25%,#eff6ff 60%,#ffffff 100%)',
  text1: '#0d1f3c', text2: '#456', text3: '#8aa', rule: 'rgba(15,45,100,.08)',
  card: 'rgba(255,255,255,.72)', cardBorder: 'rgba(15,45,100,.1)',
  inputBg: '#fff', inputBorder: 'rgba(15,45,100,.18)', inputText: '#0d1f3c',
  panelBg: '#fff', panelShadow: '0 20px 60px rgba(15,45,100,.14)',
  track: 'rgba(15,45,100,.1)', btnRing: 'rgba(15,45,100,.18)',
  btnFg: '#1e3a5f', btnBg: 'rgba(255,255,255,.8)',
  wm: '#5470a0', amber: '#D97706', red: '#dc2626',
  togBg: '#e0eaff', togIcon: '#3b6fd4',
}

const DARK_THEME = {
  bg: 'linear-gradient(145deg,#071829 0%,#0d2645 40%,#112d52 70%,#0a1e38 100%)',
  text1: '#fff', text2: 'rgba(255,255,255,.6)', text3: 'rgba(255,255,255,.3)',
  rule: 'rgba(255,255,255,.08)', card: 'rgba(255,255,255,.05)', cardBorder: 'rgba(255,255,255,.1)',
  inputBg: 'rgba(255,255,255,.07)', inputBorder: 'rgba(255,255,255,.15)', inputText: '#fff',
  panelBg: '#0f2845', panelShadow: '0 20px 60px rgba(0,0,0,.55)',
  track: 'rgba(255,255,255,.1)', btnRing: 'rgba(255,255,255,.22)',
  btnFg: 'rgba(255,255,255,.75)', btnBg: 'rgba(255,255,255,.07)',
  wm: 'rgba(255,255,255,.3)', amber: '#F59E0B', red: '#f87171',
  togBg: 'rgba(255,255,255,.1)', togIcon: 'rgba(255,255,255,.8)',
}
