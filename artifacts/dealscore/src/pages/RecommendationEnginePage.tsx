import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../lib/AuthContext'

const NAVY       = '#1B3A6B'
const NAVY_DARK  = '#152d55'
const NAVY_DEEP  = '#0f2040'
const NAVY_LIGHT = '#eef3fb'
const TEAL       = '#1D9E75'
const TEAL_MID   = '#10B981'
const TEAL_LIGHT = '#d1fae5'
const BG_SEC     = '#f5f6f8'
const DS_BORDER  = '#e3e5e9'
const TEXT2      = '#6c757d'
const PP_COLOR   = '#5B21B6'
const PP_LIGHT   = 'rgba(91,33,182,.08)'

interface MatchInvestor {
  name: string
  sub: string
  score: number
  verdict: string
  vClass: 'v-strong' | 'v-good' | 'v-partial'
  crit: [string, boolean][]
  trust: string
}

interface DealOption {
  addr: string
  strat: string
  score: 'RECOMMENDED' | 'REVIEW'
  capital: string
  region: string
  risk: string
}

const DEALS: DealOption[] = [
  { addr: '65a Horwood Close, Leeds LS7', strat: 'Buy-to-Let', score: 'RECOMMENDED', capital: '£51,750', region: 'Yorkshire & Humber', risk: 'Low–medium' },
  { addr: '12 Victoria Street, Manchester M1', strat: 'HMO · 6-bed', score: 'REVIEW', capital: '£73,800', region: 'North West', risk: 'Medium' },
  { addr: '8 Park Lane, Birmingham B15', strat: 'BRRR · refurb', score: 'RECOMMENDED', capital: '£46,250', region: 'West Midlands', risk: 'Medium–high' },
]

const MATCH_SETS: MatchInvestor[][] = [
  [
    { name: 'James Whitfield', sub: 'Committed · 4 deals funded', score: 94, verdict: 'Strong match', vClass: 'v-strong', crit: [['Strategy — BTL', true], ['Region — Yorkshire', true], ['Capital — up to £60k', true], ['Risk — low/medium', true]], trust: 'Full trust · address visible' },
    { name: 'Priya Anand', sub: 'Committed · 2 deals funded', score: 81, verdict: 'Good match', vClass: 'v-good', crit: [['Strategy — BTL', true], ['Region — Yorkshire/NW', true], ['Capital — up to £45k', false], ['Risk — low', true]], trust: 'Full trust · address visible' },
    { name: 'Connor Hughes', sub: 'Committed · 1 deal funded', score: 68, verdict: 'Good match', vClass: 'v-good', crit: [['Strategy — BTL/HMO', true], ['Region — any UK', true], ['Capital — up to £80k', true], ['Risk — medium', false]], trust: 'Full trust · address visible' },
    { name: 'Sarah Bell', sub: 'Committed · new investor', score: 47, verdict: 'Partial match', vClass: 'v-partial', crit: [['Strategy — SA preferred', false], ['Region — South East only', false], ['Capital — up to £55k', true], ['Risk — low', true]], trust: 'Full trust · address visible' },
  ],
  [
    { name: 'Connor Hughes', sub: 'Committed · 1 deal funded', score: 90, verdict: 'Strong match', vClass: 'v-strong', crit: [['Strategy — HMO', true], ['Region — North West', true], ['Capital — up to £80k', true], ['Risk — medium', true]], trust: 'Full trust · address visible' },
    { name: 'Priya Anand', sub: 'Committed · 2 deals funded', score: 74, verdict: 'Good match', vClass: 'v-good', crit: [['Strategy — BTL/HMO', true], ['Region — North West', true], ['Capital — up to £45k', false], ['Risk — low', false]], trust: 'Full trust · address visible' },
    { name: 'James Whitfield', sub: 'Committed · 4 deals funded', score: 59, verdict: 'Partial match', vClass: 'v-partial', crit: [['Strategy — BTL preferred', false], ['Region — Yorkshire only', false], ['Capital — up to £60k', true], ['Risk — medium', true]], trust: 'Full trust · address visible' },
  ],
  [
    { name: 'Sarah Bell', sub: 'Committed · new investor', score: 88, verdict: 'Strong match', vClass: 'v-strong', crit: [['Strategy — BRRR', true], ['Region — West Midlands', true], ['Capital — up to £55k', true], ['Risk — medium/high', true]], trust: 'Full trust · address visible' },
    { name: 'James Whitfield', sub: 'Committed · 4 deals funded', score: 72, verdict: 'Good match', vClass: 'v-good', crit: [['Strategy — BTL/BRRR', true], ['Region — any UK', true], ['Capital — up to £60k', true], ['Risk — low/medium', false]], trust: 'Full trust · address visible' },
    { name: 'Connor Hughes', sub: 'Committed · 1 deal funded', score: 65, verdict: 'Good match', vClass: 'v-good', crit: [['Strategy — BRRR/HMO', true], ['Region — any UK', true], ['Capital — up to £80k', true], ['Risk — medium', false]], trust: 'Full trust · address visible' },
  ],
]

const STEP_LABELS = ['Choose deal', 'Match criteria', 'Ranked matches', 'Review & send']

const CRIT_INFO: Record<string, { label: string; icon: string; note: string }> = {
  strategy: { label: 'Strategy', icon: '🗺️', note: "Matched against each investor's preferred property strategies" },
  capital:  { label: 'Capital required', icon: '🪙', note: "Compared with the maximum each investor said they can deploy" },
  region:   { label: 'Region', icon: '📍', note: "Cross-checked against investors' preferred locations" },
  risk:     { label: 'Risk profile', icon: '⚡', note: "Weighed against each investor's stated risk appetite" },
}

const VERDICT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  'v-strong':  { bg: '#ECFDF5', color: '#065F46', border: '0.5px solid #A7F3D0' },
  'v-good':    { bg: '#EFF6FF', color: '#1E40AF', border: '0.5px solid #BFDBFE' },
  'v-partial': { bg: '#FFFBEB', color: '#92400E', border: '0.5px solid #FDE68A' },
}

export default function RecommendationEnginePage() {
  const { tier } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]         = useState(1)
  const [dealIdx, setDealIdx]   = useState(0)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [sendNote, setSendNote] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [toastVis, setToastVis] = useState(false)

  const isLocked = tier !== 'pro_plus'
  const deal     = DEALS[dealIdx]
  const matches  = MATCH_SETS[dealIdx]
  const chosen   = matches.filter(r => !!selected[r.name])

  function toast(msg: string) {
    setToastMsg(msg); setToastVis(true)
    setTimeout(() => setToastVis(false), 2200)
  }

  function chooseDeal(i: number) {
    setDealIdx(i)
    setSelected({})
  }

  function toggleSelect(name: string) {
    setSelected(prev => ({ ...prev, [name]: !prev[name] }))
  }

  function next() {
    if (step < 4) {
      setStep(s => s + 1)
    } else {
      if (chosen.length === 0) { toast('Select at least one investor before sending'); return }
      toast(`Deal link sent to ${chosen.length} investor${chosen.length > 1 ? 's' : ''} — they'll be notified now`)
      setTimeout(() => { setStep(1); setSelected({}); setSendNote('') }, 1400)
    }
  }

  function back() {
    if (step > 1) setStep(s => s - 1)
  }

  function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#eef0f4', minHeight: '100vh', fontSize: '13px', color: '#1a1a2e' }}>
      <AppHeader />

      <div style={{ position: 'fixed', bottom: '26px', left: '50%', transform: 'translateX(-50%)', background: NAVY_DEEP, color: '#fff', fontSize: '12px', fontWeight: 500, padding: '11px 22px', borderRadius: '30px', opacity: toastVis ? 1 : 0, transition: 'opacity .25s', pointerEvents: 'none', zIndex: 500, boxShadow: '0 8px 28px rgba(0,0,0,.22)', whiteSpace: 'nowrap' }}>
        {toastMsg}
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: '14px 24px 0', fontSize: '12px', color: TEXT2, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/dashboard')} style={{ color: NAVY, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', padding: 0 }}>Dashboard</button>
        <span style={{ fontSize: '11px', color: '#ccc' }}>›</span>
        <button onClick={() => navigate('/investors-crm')} style={{ color: NAVY, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', padding: 0 }}>Investors</button>
        <span style={{ fontSize: '11px', color: '#ccc' }}>›</span>
        <span>Recommendation engine</span>
      </div>

      {/* Page head */}
      <div style={{ padding: '10px 24px 4px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: NAVY, display: 'flex', alignItems: 'center', gap: '9px' }}>✦ Recommendation engine</div>
          <div style={{ fontSize: '12px', color: TEXT2, marginTop: '4px', maxWidth: '660px', lineHeight: 1.5 }}>Match a deal against your committed investors' preference questionnaires in four steps — review the criteria, see a ranked comparison of who fits, then send straight from here.</div>
        </div>
        <span style={{ fontSize: '9px', fontWeight: 700, background: PP_LIGHT, color: PP_COLOR, border: '0.5px solid rgba(91,33,182,.22)', padding: '3px 9px', borderRadius: '20px', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginTop: '2px' }}>
          ✦ Pro Plus feature
        </span>
      </div>

      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '6px 24px 60px' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '16px 22px', marginBottom: '18px' }}>
          {STEP_LABELS.map((label, i) => {
            const num  = i + 1
            const done = num < step
            const active = num === step
            return (
              <div key={num} style={{ display: 'flex', alignItems: 'center', flex: num < 4 ? 1 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? TEAL : active ? NAVY : BG_SEC, border: `0.5px solid ${done ? TEAL : active ? NAVY : DS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: (done || active) ? '#fff' : TEXT2, flexShrink: 0, boxShadow: active ? `0 0 0 4px ${NAVY_LIGHT}` : 'none', transition: 'all .15s' }}>
                    {done ? '✓' : num}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: (done || active) ? '#1a1a2e' : TEXT2, whiteSpace: 'nowrap' }}>{label}</span>
                </div>
                {num < 4 && <div style={{ height: '1px', background: done ? TEAL : DS_BORDER, flex: 1, margin: '0 10px', transition: 'background .3s' }} />}
              </div>
            )
          })}
        </div>

        {/* Locked overlay wrapper */}
        <div style={{ position: 'relative' }}>
          {/* Wizard body — blurred when locked */}
          <div style={{ filter: isLocked ? 'blur(4px)' : 'none', opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? 'none' : 'auto', userSelect: isLocked ? 'none' : 'auto', transition: 'filter .2s' }}>

            {/* Step 1: Deal picker */}
            {step === 1 && (
              <div style={panelStyle}>
                <div style={stepLblStyle}>Step 1 of 4</div>
                <div style={panelTitleStyle}>Choose the deal to match</div>
                <div style={panelSubStyle}>Pick the deal you want to find committed investors for. The engine compares this deal's strategy, location, capital required and risk profile against each investor's questionnaire answers.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {DEALS.map((d, i) => (
                    <div key={i} onClick={() => chooseDeal(i)}
                      style={{ display: 'flex', alignItems: 'center', gap: '13px', border: dealIdx === i ? `1.5px solid ${NAVY}` : `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '12px 14px', cursor: 'pointer', transition: 'all .15s', background: dealIdx === i ? NAVY_LIGHT : '#fff', boxShadow: dealIdx === i ? '0 0 0 2px rgba(27,58,107,.1)' : 'none' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: dealIdx === i ? NAVY : NAVY_LIGHT, color: dealIdx === i ? '#fff' : NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🏡</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{d.addr}</div>
                        <div style={{ fontSize: '10.5px', color: TEXT2, marginTop: '1px' }}>{d.strat} · {d.capital} capital required · {d.region}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', whiteSpace: 'nowrap', background: d.score === 'RECOMMENDED' ? '#ECFDF5' : '#FFFBEB', color: d.score === 'RECOMMENDED' ? '#065F46' : '#92400E', border: `0.5px solid ${d.score === 'RECOMMENDED' ? '#A7F3D0' : '#FDE68A'}` }}>
                        {d.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Criteria */}
            {step === 2 && (
              <div style={panelStyle}>
                <div style={stepLblStyle}>Step 2 of 4</div>
                <div style={panelTitleStyle}>Review the match criteria</div>
                <div style={panelSubStyle}>These are the attributes pulled from the deal's analysis. The engine weighs each one against what your committed investors said they're looking for.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
                  {Object.entries(CRIT_INFO).map(([key, info]) => {
                    const val = key === 'strategy' ? deal.strat : key === 'capital' ? deal.capital : key === 'region' ? deal.region : deal.risk
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '12px 13px', background: BG_SEC }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#fff', border: `0.5px solid ${DS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{info.icon}</div>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#999' }}>{info.label}</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '2px' }}>{val}</div>
                          <div style={{ fontSize: '10px', color: TEXT2, marginTop: '2px', lineHeight: 1.4 }}>{info.note}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: NAVY_LIGHT, border: '0.5px solid rgba(27,58,107,.12)', borderRadius: '8px', padding: '12px 14px', marginTop: '16px', fontSize: '11.5px', color: NAVY }}>
                  👥 Matching <strong style={{ marginLeft: '4px' }}>{deal.addr}</strong> against <strong style={{ marginLeft: '4px' }}>{matches.length} committed investors</strong> who have completed their preference questionnaire.
                </div>
              </div>
            )}

            {/* Step 3: Ranked matches */}
            {step === 3 && (
              <div style={panelStyle}>
                <div style={stepLblStyle}>Step 3 of 4</div>
                <div style={panelTitleStyle}>Ranked matches</div>
                <div style={panelSubStyle}>Investors are ranked by how closely their stated preferences fit this deal. Tick the ones you'd like to share with — you can select more than one.</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        {['', 'Investor', 'Match score', 'Why they match', 'Trust level'].map(h => (
                          <th key={h} style={{ textAlign: 'left', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#999', padding: '0 10px 9px', borderBottom: `0.5px solid ${DS_BORDER}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(r => {
                        const on = !!selected[r.name]
                        const barColor = r.score >= 80 ? TEAL : r.score >= 60 ? '#3B82F6' : '#F59E0B'
                        const vStyle = VERDICT_STYLES[r.vClass]
                        return (
                          <tr key={r.name} style={{ borderBottom: `0.5px solid ${BG_SEC}` }}>
                            <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                              <div onClick={() => toggleSelect(r.name)}
                                style={{ width: '16px', height: '16px', borderRadius: '4px', border: `1.5px solid ${on ? NAVY : DS_BORDER}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', transition: 'all .12s', background: on ? NAVY : '#fff' }}>
                                {on ? '✓' : ''}
                              </div>
                            </td>
                            <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 600 }}>{r.name}</div>
                              <div style={{ fontSize: '10px', color: TEXT2, marginTop: '1px' }}>{r.sub}</div>
                            </td>
                            <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>{r.score}%</div>
                              <div style={{ width: '64px', height: '5px', borderRadius: '3px', background: BG_SEC, marginTop: '5px', overflow: 'hidden' }}>
                                <div style={{ width: `${r.score}%`, height: '100%', borderRadius: '3px', background: barColor }} />
                              </div>
                              <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', letterSpacing: '0.03em', whiteSpace: 'nowrap', display: 'inline-block', marginTop: '6px', ...vStyle }}>{r.verdict}</span>
                            </td>
                            <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {r.crit.map(([label, match]) => (
                                  <span key={label} style={{ fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: match ? TEAL_LIGHT : '#fdecec', color: match ? '#065F46' : '#9a3030' }}>
                                    {match ? '✓' : '✕'} {label}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                              <span style={{ fontSize: '9.5px', fontWeight: 600, color: TEXT2, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: TEAL_MID, fontSize: '11px' }}>🛡️</span> {r.trust}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 4: Review & send */}
            {step === 4 && (
              <div style={panelStyle}>
                <div style={stepLblStyle}>Step 4 of 4</div>
                <div style={panelTitleStyle}>Review &amp; send</div>
                <div style={panelSubStyle}>Confirm who you're sending to and add an optional note — it'll appear alongside the deal link when each investor opens it.</div>
                {chosen.length === 0 ? (
                  <div style={{ fontSize: '11.5px', color: TEXT2, background: BG_SEC, border: `0.5px dashed ${DS_BORDER}`, borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                    ℹ️ No investors selected yet — go back to step 3 and tick at least one match to send to.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', marginBottom: '12px' }}>Sending to ({chosen.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                      {chosen.map(r => (
                        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '11px', border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '10px 13px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: NAVY_LIGHT, color: NAVY, fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {getInitials(r.name)}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>{r.name}</div>
                            <div style={{ fontSize: '10px', color: TEXT2, marginTop: '1px' }}>{r.sub} · {r.score}% match · {r.verdict}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', marginBottom: '8px' }}>
                  Note <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#bbb' }}>(optional — sent alongside the deal link)</span>
                </div>
                <textarea
                  value={sendNote} onChange={e => setSendNote(e.target.value)}
                  placeholder="Hi — thought this one matches what you're looking for. Take a look and let me know..."
                  style={{ width: '100%', border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '11px 13px', fontFamily: 'inherit', fontSize: '12px', resize: 'vertical', minHeight: '78px', color: '#1a1a2e', outline: 'none', lineHeight: 1.5 }}
                />
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
              <button onClick={back} disabled={step === 1}
                style={{ fontSize: '12.5px', fontWeight: 600, padding: '9px 18px', borderRadius: '8px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', color: step === 1 ? '#bbb' : '#1a1a2e', cursor: step === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: step === 1 ? 0.4 : 1 }}>
                ← Back
              </button>
              <button onClick={next}
                style={{ fontSize: '12.5px', fontWeight: 600, padding: '9px 18px', borderRadius: '8px', border: 'none', background: step === 4 ? TEAL : NAVY, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all .12s' }}>
                {step === 4 ? '✉ Send to selected investors' : 'Continue →'}
              </button>
            </div>
          </div>

          {/* Locked overlay */}
          {isLocked && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <div style={{ background: '#fff', border: '0.5px solid rgba(91,33,182,.25)', borderRadius: '12px', boxShadow: '0 14px 44px rgba(15,32,64,.16)', padding: '28px 30px', maxWidth: '380px', textAlign: 'center' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: PP_LIGHT, color: PP_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '21px', margin: '0 auto 13px' }}>🔒</div>
                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Recommendation engine is a Pro Plus feature</div>
                <div style={{ fontSize: '11.5px', color: TEXT2, lineHeight: 1.6, marginBottom: '16px' }}>Auto-match every new deal to your committed investors' questionnaire answers, see a ranked comparison of who fits best, and send straight from the results — no more guessing who to call first.</div>
                <button onClick={() => navigate('/profile')}
                  style={{ background: PP_COLOR, border: 'none', color: '#fff', fontSize: '12.5px', fontWeight: 600, padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  ✦ Upgrade to Pro Plus
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '22px 24px',
}
const stepLblStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', marginBottom: '12px',
}
const panelTitleStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 600, color: NAVY, marginBottom: '5px',
}
const panelSubStyle: React.CSSProperties = {
  fontSize: '11px', color: TEXT2, lineHeight: 1.6, marginBottom: '18px', maxWidth: '620px',
}
