import React, { useState, useMemo } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import DealScorePDF from './DealScorePDF'
import type { DealScorePDFProps } from './DealScorePDF'
import {
  calculateBTL,
  calculateHMO,
  calculateFlip,
  calculateSA,
  calculateBRRR,
  calculateR2R,
  calculateSocialHousing,
  type DealType,
} from '@/lib/calculations'
import type { SerializedInputs } from '@/lib/inputsSerializer'
import type { Deal } from '@/lib/database.types'

// ─── Design tokens ────────────────────────────────────────────────────────────
const DS_NAVY   = '#1B3A6B'
const DS_TEAL   = '#1D9E75'
const DS_AMBER  = '#D97706'
const DS_BG     = '#f5f6f8'
const DS_BORDER = '#e3e5e9'
const DS_TEXT2  = '#5a6270'

// ─── Types ────────────────────────────────────────────────────────────────────
type ContentType = 'advert' | 'onepager' | 'privacy' | 'full'
type AdFormat    = 'tile' | 'listing' | 'whatsapp' | 'brochure'
type Tone        = 'professional' | 'friendly' | 'urgent'
type CoverStyle  = 'branded' | 'minimal' | 'custom'

// ─── Formatters ───────────────────────────────────────────────────────────────
const fc = (n: number | null | undefined) =>
  n != null ? '£' + Math.round(n).toLocaleString('en-GB') : '—'
const fp = (n: number | null | undefined) =>
  n != null ? n.toFixed(1) + '%' : '—'

// ─── PDF props builder ────────────────────────────────────────────────────────
// Connects the Full pack "Export & share" button to the real DealScorePDF renderer.
// All other preview modes are visual stubs updated live from component state.
function buildPdfProps(
  deal: Deal,
  execSummary: string,
  strategyNote: string,
  vendorSituation: string,
  protectAddress: boolean,
  finderFee: string,
): DealScorePDFProps {
  const inp = (deal.inputs ?? {}) as SerializedInputs
  const strategy  = (deal.strategy ?? inp.strategy ?? 'BTL') as DealType
  const pp        = Number(inp.purchasePrice  ?? deal.purchase_price  ?? 0)
  const mv        = Number(inp.marketValue    ?? deal.market_value    ?? pp)
  const refurb    = Number(inp.refurbCost     ?? 0)
  const other     = Number(inp.otherCosts     ?? 2000)
  const tax       = Number(inp.manualTaxValue ?? 0)
  const dep       = Number(inp.depositPercent ?? 25)
  const mrate     = Number(inp.mortgageRate   ?? 5.5)
  const mterm     = Number(inp.mortgageTerm   ?? 25)
  const mtype     = (inp.mortgageType === 'REPAYMENT' ? 'REPAYMENT' : 'IO') as 'IO' | 'REPAYMENT'
  const mgmt      = Number(inp.managementFeePercent  ?? 10)
  const voidPct   = Number(inp.voidAllowancePercent  ?? 5)
  const maint     = Number(inp.maintenanceReserve    ?? 50)
  const mRent     = Number(inp.monthlyRent ?? 0)

  // ── Calculation inputs ───────────────────────────────────────────────────
  const base = { purchasePrice: pp, stampDuty: tax, refurbCost: refurb, otherCosts: other }
  const mortgageBase = { depositPercent: dep, mortgageRate: mrate, mortgageTerm: mterm, mortgageType: mtype }
  const opexBase = { managementFeePercent: mgmt, voidAllowancePercent: voidPct, maintenanceReserve: maint, buildingsInsurance: 0, serviceCharge: 0, groundRentAnnual: 0 }

  const btlCalc = { ...base, ...mortgageBase, ...opexBase, monthlyRent: mRent }

  const hmoCalc = {
    ...base, ...mortgageBase, ...opexBase,
    rooms: Number(inp.rooms ?? 4),
    rentPerRoom: Number(inp.rentPerRoom ?? 500),
    occupancyRate: Number(inp.hmoOccupancyRate ?? inp.occupancyRate ?? 95),
  }

  const flipCalc = {
    ...base,
    holdingCostsPerMonth: Number(inp.holdingCostsPerMonth ?? 0),
    projectLengthMonths:  Number(inp.projectLengthMonths  ?? 6),
    expectedSalePrice:    Number(inp.expectedSalePrice    ?? mv),
    sellingCostsPercent:  Number(inp.sellingCostsPercent  ?? 2),
    contingencyPercent:   Number(inp.contingencyPercent   ?? 10),
  }

  const saCalc = {
    ...base, ...mortgageBase,
    nightlyRate:          Number(inp.nightlyRate          ?? 0),
    occupancyPercent:     Number(inp.saOccupancyPercent   ?? inp.occupancyPercent ?? 70),
    platformFeesPercent:  Number(inp.platformFeesPercent  ?? 15),
    managementFeePercent: mgmt, voidAllowancePercent: 0,
    maintenanceReserve: maint, buildingsInsurance: 0, serviceCharge: 0, groundRentAnnual: 0,
  }

  const brrrCalc = {
    ...base, ...opexBase,
    postRefurbValue:   Number(inp.postRefurbValue  ?? mv),
    refinancePercent:  Number(inp.refinancePercent ?? 75),
    newMortgageRate:   Number(inp.newMortgageRate  ?? mrate),
    monthlyRent:       mRent,
  }

  const r2rCalc = {
    monthlyRentPaid:     Number(inp.monthlyRentPaid        ?? 0),
    rooms:               Number(inp.r2rRooms               ?? inp.rooms ?? 3),
    rentPerRoom:         Number(inp.r2rRentPerRoom         ?? inp.rentPerRoom ?? 500),
    occupancyRate:       Number(inp.r2rOccupancyRate       ?? 95),
    managementFeesPercent: Number(inp.r2rManagementFeesPercent ?? 0),
    monthlyRunningCosts: Number(inp.r2rMonthlyRunningCosts ?? 0),
    setupCosts:          Number(inp.setupCosts             ?? 0),
    leaseLengthMonths:   Number(inp.leaseLengthMonths      ?? 36),
  }

  const socialCalc = {
    ...base, ...mortgageBase, ...opexBase,
    leaseIncomePerMonth:  Number(inp.leaseIncomePerMonth       ?? 0),
    leaseLengthYears:     Number(inp.socialLeaseLengthYears    ?? 5),
    managementFeePercent: Number(inp.socialManagementFeePercent ?? mgmt),
  }

  // ── Score mapping ─────────────────────────────────────────────────────────
  const scoreMap: Record<string, 'Strong' | 'Average' | 'Weak' | 'Incomplete'> = {
    RECOMMENDED: 'Strong',
    REVIEW: 'Average',
    AVOID: 'Weak',
  }
  const currentScore: 'Strong' | 'Average' | 'Weak' | 'Incomplete' =
    deal.deal_score ? (scoreMap[deal.deal_score] ?? 'Incomplete') : 'Incomplete'

  const equity = mv - pp
  const bmvPct = mv > 0 ? (equity / mv) * 100 : 0
  const feeNum = parseInt(finderFee.replace(/[^0-9]/g, ''), 10) || 3000

  return {
    dealType:       strategy,
    dateStr:        new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    propertyAddress: deal.address ?? '',
    propertyType:   String(inp.propertyType   ?? 'Terraced house'),
    tenure:         (inp.tenure === 'Leasehold' ? 'Leasehold' : 'Freehold') as 'Freehold' | 'Leasehold',
    leaseLengthYears: Number(inp.leaseLengthYears ?? 0),
    epcRating:      inp.epcRating ? String(inp.epcRating) : null,
    floodRisk:      null,
    floorArea:      null,
    constructionDate: null,
    purchasePrice:  pp,
    effectiveTax:   tax,
    taxLabel:       'SDLT',
    taxCountryLabel: 'England',
    buyerLabel:     'Additional property',
    refurbCost:     refurb,
    otherCosts:     other,
    depositPercent: dep,
    mortgageRate:   mrate,
    mortgageType:   mtype,
    mortgageTerm:   mterm,
    marketValue:    mv,
    sourcingFee:    feeNum,
    sourcingFeeDisclaimer: 'Subject to written agreement and 14-day cooling-off period.',
    equityDayOne:   equity,
    bmvAmount:      equity,
    bmvPercent:     bmvPct,
    preparedBy:     { name: '', email: '', phone: '' },
    logoBase64:     null,
    brandColour:    DS_NAVY,
    logoSize:       'M',
    coverStyle:     'classic',
    tierOverride:   'pro',
    btlInputs:  { monthlyRent: mRent, monthlyExpenses: 0 },
    hmoInputs:  { rooms: Number(inp.rooms ?? 4), rentPerRoom: Number(inp.rentPerRoom ?? 500), occupancyRate: Number(inp.hmoOccupancyRate ?? 95), monthlyExpenses: 0 },
    flipInputs: { holdingCostsPerMonth: Number(inp.holdingCostsPerMonth ?? 0), projectLengthMonths: Number(inp.projectLengthMonths ?? 6), expectedSalePrice: Number(inp.expectedSalePrice ?? mv), sellingCostsPercent: Number(inp.sellingCostsPercent ?? 2), contingencyPercent: Number(inp.contingencyPercent ?? 10) },
    saInputs:   { nightlyRate: Number(inp.nightlyRate ?? 0), occupancyPercent: Number(inp.saOccupancyPercent ?? 70), platformFeesPercent: Number(inp.platformFeesPercent ?? 15), monthlyRunningCosts: 0 },
    brrrInputs: { postRefurbValue: Number(inp.postRefurbValue ?? mv), refinancePercent: Number(inp.refinancePercent ?? 75), newMortgageRate: Number(inp.newMortgageRate ?? mrate), monthlyRent: mRent, monthlyExpenses: 0 },
    r2rInputs:  r2rCalc,
    socialInputs: { leaseIncomePerMonth: Number(inp.leaseIncomePerMonth ?? 0), leaseLengthYears: Number(inp.socialLeaseLengthYears ?? 5), managementCostsPerMonth: 0 },
    btlResults:    calculateBTL(btlCalc),
    hmoResults:    calculateHMO(hmoCalc),
    flipResults:   calculateFlip(flipCalc),
    saResults:     calculateSA(saCalc),
    brrrResults:   calculateBRRR(brrrCalc),
    r2rResults:    calculateR2R(r2rCalc),
    socialResults: calculateSocialHousing(socialCalc),
    currentScore,
    riskFlags:         [],
    accentColour:      DS_NAVY,
    companyName:       '',
    executiveSummary:  execSummary,
    strategyNotes:     strategyNote,
    propertyDescription: '',
    vendorSituation,
    comparables:  [],
    listingLinks: [],
    photoFiles:   [],
    heroPhotoIndex: 0,
    protectAddress,
    protectedAddressDescription: protectAddress ? 'Address available upon signed NDA' : undefined,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ContentHubProps {
  deal: Deal
  onTabChange?: (tab: string) => void
}

export default function ContentHub({ deal, onTabChange }: ContentHubProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [contentType, setContentType] = useState<ContentType>('advert')
  const [adFormat, setAdFormat]       = useState<AdFormat>('tile')
  const [tone, setTone]               = useState<Tone>('professional')
  const [coverStyle, setCoverStyle]   = useState<CoverStyle>('branded')
  const [currentPage, setCurrentPage] = useState(1)
  const [execSummary, setExecSummary] = useState('')
  const [strategyNote, setStrategyNote] = useState('')
  const [vendorSituation, setVendorSituation] = useState('')
  const [areaHeader, setAreaHeader]   = useState('')
  const [finderFee, setFinderFee]     = useState('£3,000')
  const [cta, setCta]                 = useState('Message me to find out more')
  const [opHeadline, setOpHeadline]   = useState('')
  const [opIntro, setOpIntro]         = useState('')
  const [protectAddress, setProtectAddress] = useState(true)
  const [typeStatuses, setTypeStatuses] = useState<Record<string, string>>({
    advert: 'Not started', onepager: 'Not started',
    privacy: 'Not started', full: 'Not started',
  })
  const [metricOn, setMetricOn] = useState<Record<string, boolean>>({
    cf: true, coc: true, yield: true, score: true, price: true, equity: true, mv: false, bmv: false,
  })

  // ── Derived values from deal ──────────────────────────────────────────────
  const strategy  = deal.strategy ?? 'BTL'
  const address   = deal.address  ?? 'Unknown address'
  const addrShort = address.split(',')[0]
  const pp        = deal.purchase_price ?? 0
  const mv        = deal.market_value   ?? pp
  const equity    = mv - pp
  const bmvPct    = mv > 0 ? ((mv - pp) / mv) * 100 : 0

  // ── Metric definitions ────────────────────────────────────────────────────
  const scoreLabel =
    deal.deal_score === 'RECOMMENDED' ? 'Recommended' :
    deal.deal_score === 'REVIEW'      ? 'Review'      :
    deal.deal_score === 'AVOID'       ? 'Avoid'       : '—'

  const metricDefs: { key: string; label: string; val: string }[] = [
    { key: 'cf',    label: 'Monthly CF',    val: fc(deal.cash_flow)  },
    { key: 'coc',   label: 'CoC return',    val: fp(deal.coc_roi)    },
    { key: 'yield', label: 'Gross yield',   val: fp(deal.gross_yield) },
    { key: 'score', label: 'Deal score',    val: scoreLabel          },
    { key: 'price', label: 'Purchase price', val: fc(pp)             },
    { key: 'equity', label: 'Day-1 equity', val: equity > 0 ? fc(equity) : '—' },
    { key: 'mv',    label: 'Market value',  val: fc(mv)              },
    { key: 'bmv',   label: '% below MV',   val: bmvPct > 0 ? fp(bmvPct) : '—' },
  ]

  const maxMetrics    = contentType === 'advert' || contentType === 'onepager' ? 6 : 8
  const enabledCount  = Object.values(metricOn).filter(Boolean).length
  const enabledMetrics = metricDefs.filter(m => metricOn[m.key])

  // ── Pack page lists ───────────────────────────────────────────────────────
  const privacyPages = ['Cover', 'Executive summary', 'Key financials', 'Photos', 'Strategy', 'Disclaimer & fee']
  const fullPages    = ['Cover', 'Executive summary', 'Key financials', 'Photos', 'Comparables', 'Vendor situation', 'Strategy', 'Disclaimer & fee']
  const pages        = contentType === 'privacy' ? privacyPages : fullPages
  const totalPageCount = pages.length

  // ── PDF props (memoised — only full pack export is real; others are stubs) ─
  const pdfProps = useMemo(
    () => buildPdfProps(deal, execSummary, strategyNote, vendorSituation, protectAddress, finderFee),
    [deal, execSummary, strategyNote, vendorSituation, protectAddress, finderFee],
  )

  // ── Helpers ───────────────────────────────────────────────────────────────
  function goPage(dir: 1 | -1) {
    setCurrentPage(p => Math.max(1, Math.min(totalPageCount, p + dir)))
  }

  function saveType(type: string, label: string) {
    setTypeStatuses(prev => ({ ...prev, [type]: label }))
  }

  function toggleMetric(key: string) {
    setMetricOn(prev => {
      const next = !prev[key]
      if (next && enabledCount >= maxMetrics) return prev
      return { ...prev, [key]: next }
    })
  }

  // ─── Small primitives ─────────────────────────────────────────────────────
  function InpGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: DS_TEXT2, marginBottom: '5px' }}>{label}</div>
        {children}
      </div>
    )
  }

  function FIn({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', fontSize: '12px', padding: '7px 10px', borderRadius: '6px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
      />
    )
  }

  function FTa({ value, onChange, rows = 4, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        style={{ width: '100%', fontSize: '12px', padding: '7px 10px', borderRadius: '6px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
      />
    )
  }

  function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        style={{ padding: '5px 9px', fontSize: '11px', fontWeight: active ? 600 : 400, borderRadius: '5px', border: 'none', cursor: 'pointer', background: active ? DS_NAVY : 'transparent', color: active ? '#fff' : DS_TEXT2, transition: 'all .15s' }}
      >{children}</button>
    )
  }

  function InputCard({ title, icon, badge, children }: { title: React.ReactNode; icon: string; badge?: React.ReactNode; children: React.ReactNode }) {
    return (
      <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: `0.5px solid ${DS_BORDER}`, background: DS_BG }}>
          <span style={{ fontSize: '13px' }}>{icon}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a2332' }}>{title}</span>
          {badge}
        </div>
        <div style={{ padding: '12px 14px' }}>{children}</div>
      </div>
    )
  }

  function AutoBadge() {
    return <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: 'rgba(27,58,107,.08)', color: DS_NAVY, marginLeft: 'auto' }}>Auto-filled</span>
  }

  function AiBadge() {
    return <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: `rgba(29,158,117,.12)`, color: DS_TEAL, marginLeft: 'auto' }}>Auto-populated</span>
  }

  // ─── Metric picker card (shared) ──────────────────────────────────────────
  const MetricPickerCard = (
    <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `0.5px solid ${DS_BORDER}`, background: DS_BG }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📊</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#1a2332' }}>Metrics to show</span>
        </div>
        <span style={{ fontSize: '10px', color: DS_TEXT2 }}>{enabledCount}/{maxMetrics} selected</span>
      </div>
      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {metricDefs.map(m => {
          const isOn     = metricOn[m.key]
          const canToggle = isOn || enabledCount < maxMetrics
          return (
            <div
              key={m.key}
              onClick={() => canToggle && toggleMetric(m.key)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', border: `0.5px solid ${isOn ? DS_NAVY : DS_BORDER}`, background: isOn ? 'rgba(27,58,107,.06)' : '#fff', cursor: canToggle ? 'pointer' : 'not-allowed', opacity: !isOn && !canToggle ? 0.4 : 1, transition: 'all .15s', gap: '8px' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1a2332', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                <div style={{ fontSize: '10px', color: DS_TEXT2 }}>{m.val}</div>
              </div>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: isOn ? DS_NAVY : DS_BG, border: `1.5px solid ${isOn ? DS_NAVY : DS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#fff', flexShrink: 0 }}>
                {isOn ? '✓' : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ─── Save/action row ──────────────────────────────────────────────────────
  function ActionRow({ type, primaryLabel, primaryIcon, onPrimary }: {
    type: string; primaryLabel: string; primaryIcon: string; onPrimary: () => void
  }) {
    return (
      <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '10px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onPrimary} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '7px', border: `none`, background: DS_NAVY, color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
            {primaryIcon} {primaryLabel}
          </button>
          <button onClick={() => saveType(type, 'Draft saved')} style={{ flex: 0, padding: '9px 14px', borderRadius: '7px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', color: '#374151', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
            💾 Save
          </button>
        </div>
      </div>
    )
  }

  // ─── Inputs panel (per content type) ─────────────────────────────────────
  function renderInputsPanel() {
    if (contentType === 'advert') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <InputCard title="Ad content" icon="✏️">
            <InpGroup label="Area header">
              <FIn value={areaHeader} onChange={setAreaHeader} placeholder={addrShort} />
            </InpGroup>
            <InpGroup label="Finder fee">
              <FIn value={finderFee} onChange={setFinderFee} />
            </InpGroup>
            <InpGroup label="Call to action">
              <FIn value={cta} onChange={setCta} />
            </InpGroup>
          </InputCard>

          <InputCard title="Format & tone" icon="🎨">
            <InpGroup label="Platform">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', background: DS_BG, borderRadius: '6px', padding: '3px', border: `0.5px solid ${DS_BORDER}` }}>
                <SegBtn active={adFormat === 'tile'}     onClick={() => setAdFormat('tile')}>📷 Social tile</SegBtn>
                <SegBtn active={adFormat === 'listing'}  onClick={() => setAdFormat('listing')}>📄 Listing</SegBtn>
                <SegBtn active={adFormat === 'whatsapp'} onClick={() => setAdFormat('whatsapp')}>💬 WhatsApp</SegBtn>
                <SegBtn active={adFormat === 'brochure'} onClick={() => setAdFormat('brochure')}>📋 Brochure</SegBtn>
              </div>
            </InpGroup>
            <InpGroup label="Tone">
              <div style={{ display: 'flex', gap: '4px', background: DS_BG, borderRadius: '6px', padding: '3px', border: `0.5px solid ${DS_BORDER}` }}>
                <SegBtn active={tone === 'professional'} onClick={() => setTone('professional')}>Professional</SegBtn>
                <SegBtn active={tone === 'friendly'}     onClick={() => setTone('friendly')}>Friendly</SegBtn>
                <SegBtn active={tone === 'urgent'}       onClick={() => setTone('urgent')}>Urgent</SegBtn>
              </div>
            </InpGroup>
          </InputCard>

          {MetricPickerCard}

          <InputCard title="Nearby locations" icon="📍" badge={<AiBadge />}>
            <div style={{ fontSize: '11px', color: DS_TEXT2, lineHeight: 1.6 }}>
              Nearby locations from deal inputs will appear here automatically.
              {onTabChange && (
                <> <button onClick={() => onTabChange('analysis')} style={{ background: 'none', border: 'none', color: DS_NAVY, cursor: 'pointer', fontSize: '11px', padding: 0, textDecoration: 'underline' }}>Edit in Inputs →</button></>
              )}
            </div>
          </InputCard>

          <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '7px', border: 'none', background: DS_NAVY, color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                ✨ Regenerate with AI
              </button>
              <button onClick={() => saveType('advert', 'Draft saved')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '7px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', color: '#374151', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                💾 Save draft
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (contentType === 'onepager') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <InputCard title="Content" icon="✏️">
            <InpGroup label="Headline">
              <FIn value={opHeadline} onChange={setOpHeadline} placeholder={`${addrShort} · ${strategy} Investment Opportunity`} />
            </InpGroup>
            <InpGroup label="Brief intro (1–2 sentences)">
              <FTa value={opIntro} onChange={setOpIntro} rows={3} placeholder="Solid cash-flow positive deal sourced off market…" />
            </InpGroup>
            <InpGroup label="Finder fee">
              <FIn value={finderFee} onChange={setFinderFee} />
            </InpGroup>
          </InputCard>

          {MetricPickerCard}
          <ActionRow type="onepager" primaryLabel="Export one-pager" primaryIcon="⬇️" onPrimary={() => {}} />
        </div>
      )
    }

    if (contentType === 'privacy') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <InputCard title="Address & photos" icon="🔒" badge={<span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: 'rgba(29,158,117,.12)', color: DS_TEAL, marginLeft: 'auto' }}>Protected</span>}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', background: 'rgba(29,158,117,.06)', border: `0.5px solid rgba(29,158,117,.2)`, marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1a2332' }}>Address withheld</div>
                <div style={{ fontSize: '10px', color: DS_TEXT2 }}>Shown as ██████ in the pack</div>
              </div>
              <div
                role="switch"
                aria-checked={protectAddress}
                onClick={() => setProtectAddress(p => !p)}
                style={{ width: '36px', height: '20px', borderRadius: '10px', background: protectAddress ? DS_TEAL : DS_BORDER, cursor: 'pointer', transition: 'background .2s', position: 'relative', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: '2px', left: protectAddress ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
              </div>
            </div>
            <div style={{ fontSize: '10px', color: DS_TEXT2, lineHeight: 1.5 }}>Photos are withheld in privacy mode. Full photos appear in the Full pack.</div>
          </InputCard>

          <InputCard title="Executive summary" icon="📝">
            <FTa value={execSummary} onChange={setExecSummary} rows={5} placeholder="Write a compelling executive summary for investors…" />
          </InputCard>

          <InputCard title="Vendor situation" icon="🏠" badge={<AutoBadge />}>
            <div style={{ fontSize: '11px', color: DS_TEXT2, lineHeight: 1.6 }}>
              {vendorSituation
                ? `"${vendorSituation.slice(0, 100)}${vendorSituation.length > 100 ? '…' : ''}"`
                : 'Complete seller details in the Seller tab to auto-populate this.'}
              {onTabChange && (
                <> <button onClick={() => onTabChange('seller')} style={{ background: 'none', border: 'none', color: DS_NAVY, cursor: 'pointer', fontSize: '11px', padding: 0, textDecoration: 'underline' }}>Go to Seller tab →</button></>
              )}
            </div>
          </InputCard>

          <InputCard title="Strategy note" icon="🎯">
            <FTa value={strategyNote} onChange={setStrategyNote} rows={4} placeholder={`Why ${strategy} is well-suited to this property…`} />
          </InputCard>

          {MetricPickerCard}
          <ActionRow type="privacy" primaryLabel="Export privacy pack" primaryIcon="⬇️" onPrimary={() => {}} />
        </div>
      )
    }

    if (contentType === 'full') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <InputCard title="Executive summary" icon="📝">
            <FTa value={execSummary} onChange={setExecSummary} rows={5} placeholder="Write a compelling executive summary for investors…" />
          </InputCard>

          <InputCard title="Vendor situation" icon="🏠" badge={<AutoBadge />}>
            <div style={{ fontSize: '11px', color: DS_TEXT2, lineHeight: 1.6 }}>
              {vendorSituation
                ? `"${vendorSituation.slice(0, 100)}${vendorSituation.length > 100 ? '…' : ''}"`
                : 'Complete seller details in the Seller tab to auto-populate this.'}
              {onTabChange && (
                <> <button onClick={() => onTabChange('seller')} style={{ background: 'none', border: 'none', color: DS_NAVY, cursor: 'pointer', fontSize: '11px', padding: 0, textDecoration: 'underline' }}>Go to Seller tab →</button></>
              )}
            </div>
          </InputCard>

          <InputCard title="Strategy note" icon="🎯">
            <FTa value={strategyNote} onChange={setStrategyNote} rows={4} placeholder={`Why ${strategy} is well-suited to this property…`} />
          </InputCard>

          <InputCard title="Cover style" icon="🎨">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {([['branded', '🏷️', 'Branded'], ['minimal', '⬜', 'Minimal'], ['custom', '🎨', 'Custom']] as const).map(([key, icon, lbl]) => (
                <div
                  key={key}
                  onClick={() => setCoverStyle(key)}
                  style={{ border: `1.5px solid ${coverStyle === key ? DS_NAVY : DS_BORDER}`, borderRadius: '8px', padding: '12px 8px', textAlign: 'center', cursor: 'pointer', background: coverStyle === key ? 'rgba(27,58,107,.05)' : '#fff', transition: 'all .15s' }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '5px' }}>{icon}</div>
                  <div style={{ fontSize: '10px', fontWeight: coverStyle === key ? 700 : 400, color: coverStyle === key ? DS_NAVY : DS_TEXT2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </InputCard>

          {MetricPickerCard}

          {/* Full pack: real PDF export via PDFDownloadLink */}
          <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <PDFDownloadLink
                document={<DealScorePDF {...pdfProps} />}
                fileName={`DealScore_${(deal.reference ?? deal.address ?? 'deal').replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.pdf`}
                style={{ flex: 1, textDecoration: 'none' }}
              >
                {({ loading: pdfLoading }: { loading: boolean }) => (
                  <button
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '7px', border: 'none', background: DS_NAVY, color: '#fff', fontSize: '11px', fontWeight: 600, cursor: pdfLoading ? 'wait' : 'pointer' }}
                  >
                    {pdfLoading ? '⏳ Preparing PDF…' : '⬇️ Export & share'}
                  </button>
                )}
              </PDFDownloadLink>
              <button onClick={() => saveType('full', 'Draft saved')} style={{ padding: '9px 14px', borderRadius: '7px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', color: '#374151', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}>
                💾 Save
              </button>
            </div>
            <div style={{ fontSize: '10px', color: DS_TEXT2, textAlign: 'center' }}>
              Exports a full investor pack PDF with all analysis data
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // ─── Preview panel ────────────────────────────────────────────────────────
  function AdvertPreview() {
    if (adFormat === 'listing') {
      return (
        <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a2332', marginBottom: '8px', lineHeight: 1.3 }}>
            🏠 {areaHeader || addrShort} — {strategy} Investment Opportunity
          </div>
          <div style={{ fontSize: '12px', color: '#374151', marginBottom: '14px', lineHeight: 1.6 }}>
            {tone === 'urgent' ? '🔥 Act fast. ' : tone === 'friendly' ? 'Hey! Excited to share this one. ' : ''}
            Solid {tone === 'professional' ? '' : 'cash-flow '}positive deal sourced off market.
            {strategy === 'BTL' ? ' Monthly rental income above market average.' : strategy === 'HMO' ? ' Multi-let strategy — strong room-by-room returns.' : ' Excellent returns for the right investor.'}
          </div>
          <div style={{ marginBottom: '14px' }}>
            {enabledMetrics.slice(0, 6).map(m => (
              <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `0.5px solid ${DS_BORDER}`, fontSize: '12px' }}>
                <span style={{ color: DS_TEXT2 }}>{m.label}</span>
                <span style={{ fontWeight: 600, color: '#1a2332' }}>{m.val}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
            📍 <strong>Location:</strong> {areaHeader || addrShort}<br />
            💰 <strong>Sourcing fee:</strong> {finderFee}<br />
            📞 {cta}
          </div>
        </div>
      )
    }

    if (adFormat === 'whatsapp') {
      return (
        <div style={{ padding: '16px', background: '#e5ddd5', minHeight: '240px', borderRadius: '8px' }}>
          <div style={{ background: '#dcf8c6', borderRadius: '8px 8px 2px 8px', padding: '12px 16px', maxWidth: '85%', marginLeft: 'auto', boxShadow: '0 1px 2px rgba(0,0,0,.15)' }}>
            <div style={{ fontSize: '12px', color: '#1a2332', lineHeight: 1.6 }}>
              Hi! {tone === 'urgent' ? '⚡ URGENT — ' : tone === 'friendly' ? '😊 ' : ''}I've got a great {strategy} deal in <strong>{areaHeader || addrShort}</strong>
              {deal.cash_flow !== null ? ` — monthly CF of ${fc(deal.cash_flow)}` : ''}{deal.gross_yield !== null ? `, gross yield ${fp(deal.gross_yield)}` : ''}.
              {' '}Sourcing fee: {finderFee}. {cta}
            </div>
            <div style={{ fontSize: '10px', color: '#8a8a8a', textAlign: 'right', marginTop: '4px' }}>✓✓</div>
          </div>
        </div>
      )
    }

    if (adFormat === 'brochure') {
      return (
        <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: DS_NAVY, padding: '20px 24px', color: '#fff' }}>
            <div style={{ fontSize: '10px', opacity: .6, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Investment Opportunity</div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{areaHeader || addrShort}</div>
            <div style={{ fontSize: '12px', opacity: .8, marginTop: '4px' }}>{strategy} · Sourcing fee: {finderFee}</div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {enabledMetrics.slice(0, 6).map(m => (
                <div key={m.key} style={{ background: DS_BG, borderRadius: '6px', padding: '10px', textAlign: 'center', border: `0.5px solid ${DS_BORDER}` }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: DS_NAVY }}>{m.val}</div>
                  <div style={{ fontSize: '9px', color: DS_TEXT2, marginTop: '2px' }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: DS_TEXT2, textAlign: 'center', paddingTop: '10px', borderTop: `0.5px solid ${DS_BORDER}` }}>{cta}</div>
          </div>
        </div>
      )
    }

    // Social tile (default)
    return (
      <div style={{ background: DS_NAVY, borderRadius: '12px', padding: '28px 24px', color: '#fff', aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', maxWidth: '340px', margin: '0 auto' }}>
        <div>
          <div style={{ fontSize: '9px', opacity: .6, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Investment Opportunity</div>
          <div style={{ fontSize: '17px', fontWeight: 700 }}>{areaHeader || addrShort}</div>
          <div style={{ fontSize: '11px', opacity: .7, marginTop: '3px' }}>{strategy} · Sourcing fee: {finderFee}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {enabledMetrics.slice(0, 6).map(m => (
            <div key={m.key} style={{ background: 'rgba(255,255,255,.12)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{m.val}</div>
              <div style={{ fontSize: '9px', opacity: .65, marginTop: '2px' }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '11px', opacity: .8, textAlign: 'center', borderTop: '0.5px solid rgba(255,255,255,.2)', paddingTop: '12px' }}>{cta}</div>
      </div>
    )
  }

  function OnepagerPreview() {
    return (
      <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ background: DS_NAVY, padding: '14px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '9px', opacity: .55, textTransform: 'uppercase', letterSpacing: '0.1em' }}>DealScore · Sourcing</div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>Investment One-Pager</div>
          </div>
          <div style={{ fontSize: '9px', opacity: .45, fontStyle: 'italic' }}>Confidential</div>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a2332', marginBottom: '8px', lineHeight: 1.3 }}>
            {opHeadline || `${addrShort} · ${strategy} Investment Opportunity`}
          </div>
          <div style={{ fontSize: '11px', color: DS_TEXT2, marginBottom: '14px', lineHeight: 1.6 }}>
            {opIntro || 'Solid cash-flow positive deal sourced off market. Motivated vendor seeking a chain-free transaction.'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px', marginBottom: '14px' }}>
            {enabledMetrics.slice(0, 6).map(m => (
              <div key={m.key} style={{ background: DS_BG, borderRadius: '6px', padding: '9px 8px', textAlign: 'center', border: `0.5px solid ${DS_BORDER}` }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: DS_NAVY }}>{m.val}</div>
                <div style={{ fontSize: '9px', color: DS_TEXT2, marginTop: '2px' }}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '10px', color: DS_TEXT2, borderTop: `0.5px solid ${DS_BORDER}`, paddingTop: '10px', lineHeight: 1.5 }}>
            Sourcing fee: <strong>{finderFee}</strong> payable on legal completion · Subject to written agreement
          </div>
        </div>
      </div>
    )
  }

  function PackPagePreview({ type, page }: { type: 'privacy' | 'full'; page: number }) {
    const pageList  = type === 'privacy' ? privacyPages : fullPages
    const label     = pageList[page - 1] ?? pageList[0]
    const totalPgs  = pageList.length
    const eyebrow   = `Page ${page} of ${totalPgs} · DealScore`

    function ContentPage({ title, children }: { title: string; children: React.ReactNode }) {
      return (
        <div style={{ background: '#fff', border: `0.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '24px', minHeight: '340px' }}>
          <div style={{ fontSize: '9px', color: DS_TEXT2, marginBottom: '12px' }}>{eyebrow}</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a2332', marginBottom: '14px' }}>{title}</div>
          {children}
        </div>
      )
    }

    // Cover page
    if (page === 1) {
      return (
        <div style={{ background: DS_NAVY, borderRadius: '8px', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '28px 24px', color: '#fff' }}>
          <div>
            <div style={{ fontSize: '10px', opacity: .55, marginBottom: '4px' }}>DealScore</div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: .4, marginBottom: '20px' }}>Investment opportunity</div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', filter: protectAddress && type === 'privacy' ? 'blur(4px)' : 'none', userSelect: protectAddress && type === 'privacy' ? 'none' : undefined }}>
              {addrShort}
            </div>
            {deal.deal_score && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,.15)', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', marginBottom: '16px' }}>
                ★ {scoreLabel}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {enabledMetrics.slice(0, 4).map(m => (
              <div key={m.key} style={{ background: 'rgba(255,255,255,.1)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{m.val}</div>
                <div style={{ fontSize: '9px', opacity: .6, marginTop: '2px' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (label === 'Executive summary') {
      return (
        <ContentPage title="Executive Summary">
          <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
            {execSummary || <em style={{ color: DS_TEXT2 }}>Add an executive summary in the inputs panel…</em>}
          </div>
        </ContentPage>
      )
    }

    if (label === 'Key financials') {
      return (
        <ContentPage title="Key Financials">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
            {enabledMetrics.map(m => (
              <div key={m.key} style={{ background: DS_BG, borderRadius: '6px', padding: '10px', border: `0.5px solid ${DS_BORDER}` }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: DS_NAVY }}>{m.val}</div>
                <div style={{ fontSize: '9px', color: DS_TEXT2, marginTop: '2px' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </ContentPage>
      )
    }

    if (label === 'Photos') {
      return (
        <ContentPage title="Property Photos">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: DS_BG, borderRadius: '6px', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `0.5px solid ${DS_BORDER}`, fontSize: '20px' }}>
                {type === 'privacy' ? '🔒' : '📷'}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '10px', color: DS_TEXT2, lineHeight: 1.5 }}>
            {type === 'privacy' ? 'Photos withheld in privacy mode — available in the Full pack.' : 'Property photos added via the Seller tab will appear here.'}
          </div>
        </ContentPage>
      )
    }

    if (label === 'Strategy') {
      return (
        <ContentPage title={`Why ${strategy}`}>
          <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
            {strategyNote || <em style={{ color: DS_TEXT2 }}>Add a strategy note in the inputs panel…</em>}
          </div>
        </ContentPage>
      )
    }

    if (label === 'Comparables') {
      return (
        <ContentPage title="Comparable Properties">
          <div style={{ fontSize: '11px', color: DS_TEXT2, fontStyle: 'italic', lineHeight: 1.6 }}>
            Comparable sales data sourced from Land Registry / Rightmove.<br />Add comparables via the Property record.
          </div>
        </ContentPage>
      )
    }

    if (label === 'Vendor situation') {
      return (
        <ContentPage title="Vendor Situation">
          <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
            {vendorSituation || <em style={{ color: DS_TEXT2 }}>Vendor situation sourced from the Seller tab…</em>}
          </div>
        </ContentPage>
      )
    }

    // Disclaimer
    return (
      <ContentPage title="Sourcing Fee & Disclaimer">
        <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.8 }}>
          <strong>Sourcing fee:</strong> {finderFee} payable on legal completion. Subject to written agreement and 14-day cooling-off period.<br /><br />
          <strong>Disclaimer:</strong> This document is for information purposes only. All figures are estimates and should be independently verified. Past performance does not guarantee future results.
        </div>
      </ContentPage>
    )
  }

  function renderPreviewPanel() {
    const isPack = contentType === 'privacy' || contentType === 'full'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Preview toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: DS_TEXT2, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Live preview</div>
          {isPack && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => goPage(-1)} disabled={currentPage <= 1} style={{ width: '26px', height: '26px', borderRadius: '6px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.4 : 1, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: '11px', color: DS_TEXT2, minWidth: '52px', textAlign: 'center' }}>{currentPage} / {totalPageCount}</span>
              <button onClick={() => goPage(1)} disabled={currentPage >= totalPageCount} style={{ width: '26px', height: '26px', borderRadius: '6px', border: `0.5px solid ${DS_BORDER}`, background: '#fff', cursor: currentPage >= totalPageCount ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPageCount ? 0.4 : 1, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
          )}
        </div>

        {/* Preview content */}
        {contentType === 'advert'   && <AdvertPreview />}
        {contentType === 'onepager' && <OnepagerPreview />}
        {contentType === 'privacy'  && <PackPagePreview type="privacy" page={currentPage} />}
        {contentType === 'full'     && <PackPagePreview type="full"    page={currentPage} />}

        {/* Page label */}
        {isPack && (
          <div style={{ fontSize: '10px', color: DS_TEXT2, textAlign: 'center' }}>
            {pages[currentPage - 1]} — Page {currentPage} of {totalPageCount}
          </div>
        )}

        <div style={{ fontSize: '10px', color: DS_TEXT2, textAlign: 'center' }}>Preview updates live as you edit</div>
      </div>
    )
  }

  // ─── Content type cards ───────────────────────────────────────────────────
  const CONTENT_TYPES = [
    { key: 'advert',    label: 'Advert',       sub: 'Social tile, listing copy, WhatsApp',  icon: '📣', disabled: false },
    { key: 'onepager',  label: 'One-pager',    sub: 'Condensed A4 teaser doc',              icon: '📄', disabled: false },
    { key: 'privacy',   label: 'Privacy pack', sub: 'Address & photos withheld',            icon: '🔒', disabled: false },
    { key: 'full',      label: 'Full pack',    sub: 'Complete pack · real PDF export',      icon: '📦', disabled: false },
    { key: 'contracts', label: 'Contracts',    sub: 'Reservation, fee agreement',           icon: '📑', disabled: true, badge: 'Coming soon' },
  ] as const

  function statusDot(s: string) {
    if (s === 'Draft saved') return DS_AMBER
    if (s === 'Published')   return DS_TEAL
    return DS_BORDER
  }

  // ─── Completeness (livebar value) ─────────────────────────────────────────
  // Exported via state — DealChrome reads deal.packs_generated for now; this
  // gives local completeness for display within the hub.
  const completeness = Math.round(
    [execSummary, strategyNote, areaHeader, opHeadline].filter(s => s.trim()).length / 4 * 100,
  )
  void completeness // used by parent chrome livebar in future

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: DS_BG, minHeight: '100%' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* ── Content type selector cards ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {CONTENT_TYPES.map(ct => {
            const isActive = !ct.disabled && contentType === ct.key
            const status   = typeStatuses[ct.key] ?? 'Not started'
            return (
              <div
                key={ct.key}
                onClick={() => {
                  if (ct.disabled) return
                  setContentType(ct.key as ContentType)
                  setCurrentPage(1)
                }}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isActive ? DS_NAVY : DS_BORDER}`,
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: ct.disabled ? 'not-allowed' : 'pointer',
                  opacity: ct.disabled ? 0.5 : 1,
                  position: 'relative',
                  transition: 'border-color .15s, box-shadow .15s',
                  boxShadow: isActive ? `0 0 0 3px rgba(27,58,107,.09)` : 'none',
                }}
              >
                {'badge' in ct && ct.badge && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: DS_BG, border: `0.5px solid ${DS_BORDER}`, borderRadius: '20px', fontSize: '8px', fontWeight: 600, color: DS_TEXT2, padding: '2px 7px' }}>
                    {ct.badge}
                  </div>
                )}
                {isActive && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: DS_NAVY }} />
                )}
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{ct.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a2332', marginBottom: '2px' }}>{ct.label}</div>
                <div style={{ fontSize: '10px', color: DS_TEXT2, lineHeight: 1.4, marginBottom: ct.disabled ? 0 : '8px' }}>{ct.sub}</div>
                {!ct.disabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusDot(status), flexShrink: 0 }} />
                    <div style={{ fontSize: '9px', color: DS_TEXT2 }}>{status}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Two-column workspace ────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left: inputs panel */}
          <div>{renderInputsPanel()}</div>

          {/* Right: sticky live preview */}
          <div style={{ position: 'sticky', top: '80px' }}>{renderPreviewPanel()}</div>
        </div>
      </div>
    </div>
  )
}
