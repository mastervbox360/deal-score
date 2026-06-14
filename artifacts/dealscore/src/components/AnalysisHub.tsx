import { useMemo, useState, useEffect, useRef, createContext, useContext } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  calculateBTL, calculateHMO, calculateFlip, calculateSA,
  calculateBRRR, calculateR2R, calculateSocialHousing,
  calculatePropertyTax, calculateDealScore,
  TAX_LABEL, COUNTRY_LABEL,
  type Country, type BuyerType, type DealType, type DealScoreResult,
} from '@/lib/calculations'
import { type SerializedInputs } from '@/lib/inputsSerializer'
import { type Deal } from '@/lib/database.types'
import { updateDealInputs } from '@/lib/dealService'

// ── Design tokens ────────────────────────────────────────────────────────────
const NAVY       = 'var(--navy)'
const NAVY_DARK  = 'var(--navy-dark)'
const NAVY_LIGHT = 'var(--navy-light)'
const TEAL       = 'var(--teal)'
const TEAL_LIGHT = '#d1fae5'
const AMBER      = '#D97706'
const DS_BORDER  = 'var(--ds-border)'
const BG_SEC     = 'var(--bg-sec)'
const TEXT_1     = 'var(--text-1)'
const TEXT_2     = 'var(--text-2)'

// ── Formatters ────────────────────────────────────────────────────────────────
function fc(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—'
  return '£' + Math.round(Math.abs(v)).toLocaleString('en-GB')
}

function fp(v: number | null | undefined, dp = 1): string {
  if (v == null || !isFinite(v)) return '—'
  return v.toFixed(dp) + '%'
}

function signedFc(v: number): string {
  const abs = '£' + Math.abs(Math.round(v)).toLocaleString('en-GB')
  return v >= 0 ? `+${abs}` : `−${abs}`
}

// ── Input parsing ─────────────────────────────────────────────────────────────
function n(v: unknown, fallback = 0): number { return Number(v ?? fallback) || fallback }
function s(v: unknown, fallback = ''): string { return String(v ?? fallback) }

interface ParsedInputs {
  strategy: DealType
  address: string
  marketValue: number
  taxCountry: Country
  buyerType: BuyerType
  taxOverrideActive: boolean
  manualTaxValue: number
  // shared
  purchasePrice: number
  refurbCost: number
  otherCosts: number
  depositPercent: number
  mortgageRate: number
  mortgageTerm: number
  mortgageType: 'IO' | 'REPAYMENT'
  // costs
  managementFeePercent: number
  voidAllowancePercent: number
  maintenanceReserve: number
  buildingsInsurance: number
  serviceCharge: number
  groundRentAnnual: number
  // property info
  propertyType: string
  bedrooms: string
  bathrooms: string
  tenure: string
  // BTL
  btlMonthlyRent: number
  btlPurchaseFinancingMethod: string
  // HMO
  hmoRooms: number
  hmoRentPerRoom: number
  hmoOccupancyRate: number
  hmoLicenceCost: number
  hmoPurchaseFinancingMethod: string
  hmoBillsUtilities: number
  // SA
  saNightlyRate: number
  saOccupancyPercent: number
  saPlatformFeesPercent: number
  saCleaningCostPerStay: number
  saBillsUtilities: number
  saPurchaseFinancingMethod: string
  // FLIP
  flipHoldingCostsPerMonth: number
  flipProjectLengthMonths: number
  flipExpectedSalePrice: number
  flipSellingCostsPercent: number
  flipContingencyPercent: number
  // BRRR
  brrrPostRefurbValue: number
  brrrRefinancePercent: number
  brrrNewMortgageRate: number
  brrrMonthlyRent: number
  brrrPurchaseFinancingMethod: string
  // R2R
  r2rMonthlyRentPaid: number
  r2rRooms: number
  r2rRentPerRoom: number
  r2rOccupancyRate: number
  r2rManagementFeesPercent: number
  r2rMonthlyRunningCosts: number
  r2rSetupCosts: number
  r2rLandlordDepositMonths: number
  // SOCIAL
  socialLeaseIncomePerMonth: number
  socialLeaseLengthYears: number
  socialPurchaseFinancingMethod: string
}

function parseInputs(deal: Deal): ParsedInputs {
  const inp = ((deal.inputs ?? {}) as SerializedInputs)
  const shared = (inp.sharedInputs as Record<string, unknown> | undefined) ?? {}
  const btl    = (inp.btlInputs    as Record<string, unknown> | undefined) ?? {}
  const hmo    = (inp.hmoInputs    as Record<string, unknown> | undefined) ?? {}
  const sa     = (inp.saInputs     as Record<string, unknown> | undefined) ?? {}
  const flip   = (inp.flipInputs   as Record<string, unknown> | undefined) ?? {}
  const brrr   = (inp.brrrInputs   as Record<string, unknown> | undefined) ?? {}
  const r2r    = (inp.r2rInputs    as Record<string, unknown> | undefined) ?? {}
  const social = (inp.socialInputs as Record<string, unknown> | undefined) ?? {}

  return {
    strategy: (deal.strategy ?? inp.strategy ?? 'BTL') as DealType,
    address: s(inp.address) || deal.address || '',
    marketValue: n(inp.marketValue || deal.market_value),
    taxCountry: (s(inp.taxRegion, 'ENGLAND') as Country) || 'ENGLAND',
    buyerType: (s(inp.buyerType, 'ADDITIONAL') as BuyerType) || 'ADDITIONAL',
    taxOverrideActive: !!inp.taxOverrideActive,
    manualTaxValue: n(inp.manualTaxValue),
    // shared
    purchasePrice: n(shared.purchasePrice ?? inp.purchasePrice ?? deal.purchase_price),
    refurbCost:    n(shared.refurbCost),
    otherCosts:    n(shared.otherCosts),
    depositPercent: n(shared.depositPercent, 25),
    mortgageRate:  n(shared.mortgageRate),
    mortgageTerm:  n(shared.mortgageTerm, 25),
    mortgageType:  (s(shared.mortgageType, 'IO') as 'IO' | 'REPAYMENT') || 'IO',
    // costs
    managementFeePercent: n(inp.managementFeePercent, 10),
    voidAllowancePercent: n(inp.voidAllowancePercent, 5),
    maintenanceReserve:   n(inp.maintenanceReserve, 75),
    buildingsInsurance:   n(inp.buildingsInsurance, 30),
    serviceCharge:        n(inp.serviceCharge),
    groundRentAnnual:     n(inp.groundRentAnnual),
    // property info
    propertyType: s(inp.propertyType, 'Terraced'),
    bedrooms:     s(inp.bedrooms),
    bathrooms:    s(inp.bathrooms),
    tenure:       s(inp.tenure, 'Freehold'),
    // BTL
    btlMonthlyRent: n(btl.monthlyRent),
    btlPurchaseFinancingMethod: s(inp.btlPurchaseFinancingMethod, 'mortgage'),
    // HMO
    hmoRooms: n(hmo.rooms),
    hmoRentPerRoom: n(hmo.rentPerRoom),
    hmoOccupancyRate: n(hmo.occupancyRate, 90),
    hmoLicenceCost: n(hmo.licenceCost),
    hmoPurchaseFinancingMethod: s(inp.hmoPurchaseFinancingMethod, 'mortgage'),
    hmoBillsUtilities: n(hmo.billsUtilities),
    // SA
    saNightlyRate: n(sa.nightlyRate),
    saOccupancyPercent: n(sa.occupancyPercent, 75),
    saPlatformFeesPercent: n(sa.platformFeesPercent),
    saCleaningCostPerStay: n(sa.cleaningCostPerStay),
    saBillsUtilities: n(sa.billsUtilities),
    saPurchaseFinancingMethod: s(inp.saPurchaseFinancingMethod, 'mortgage'),
    // FLIP
    flipHoldingCostsPerMonth: n(flip.holdingCostsPerMonth),
    flipProjectLengthMonths:  n(flip.projectLengthMonths),
    flipExpectedSalePrice:    n(flip.expectedSalePrice),
    flipSellingCostsPercent:  n(flip.sellingCostsPercent, 2),
    flipContingencyPercent:   n(flip.contingencyPercent, 10),
    // BRRR
    brrrPostRefurbValue:  n(brrr.postRefurbValue),
    brrrRefinancePercent: n(brrr.refinancePercent, 75),
    brrrNewMortgageRate:  n(brrr.newMortgageRate),
    brrrMonthlyRent:      n(brrr.monthlyRent),
    brrrPurchaseFinancingMethod: s(inp.brrrPurchaseFinancingMethod, 'bridging'),
    // R2R
    r2rMonthlyRentPaid:       n(r2r.monthlyRentPaid),
    r2rRooms:                 n(r2r.rooms),
    r2rRentPerRoom:           n(r2r.rentPerRoom),
    r2rOccupancyRate:         n(r2r.occupancyRate, 90),
    r2rManagementFeesPercent: n(r2r.managementFeesPercent),
    r2rMonthlyRunningCosts:   n(r2r.monthlyRunningCosts),
    r2rSetupCosts:            n(r2r.setupCosts),
    r2rLandlordDepositMonths: n(inp.r2rLandlordDepositMonths),
    // SOCIAL
    socialLeaseIncomePerMonth: n(social.leaseIncomePerMonth),
    socialLeaseLengthYears:    n(social.leaseLengthYears, 5),
    socialPurchaseFinancingMethod: s(inp.socialPurchaseFinancingMethod, 'mortgage'),
  }
}

// ── Calc wrapper ──────────────────────────────────────────────────────────────
interface CalcResult {
  monthlyCashFlow: number
  annualCashFlow: number
  cashOnCashROI: number
  grossYield: number
  netYield: number
  totalCashInvested: number
  breakEvenRent: number
  score: 'Strong' | 'Average' | 'Weak' | 'Incomplete'
  // strategy-specific extras
  mortgageAmount?: number
  monthlyMortgagePayment?: number
  effectiveRent?: number
  managementFeeAmount?: number
  totalOperatingCosts?: number
  netOperatingIncome?: number
  voidAllowanceAmount?: number
  // FLIP extras
  netProfit?: number
  totalCost?: number
  roi?: number
  annualisedROI?: number
  sellingCosts?: number
  // BRRR extras
  refinanceLoan?: number
  cashLeftInDeal?: number
  equityCreated?: number
  moneyOut?: boolean
  // R2R extras
  monthlyProfit?: number
  spreadPerRoom?: number
  occupancyBreakEven?: number
}

function runCalc(p: ParsedInputs, overrides?: Partial<ParsedInputs>): CalcResult {
  const pp = overrides ? { ...p, ...overrides } : p
  const tax = pp.taxOverrideActive
    ? pp.manualTaxValue
    : calculatePropertyTax(pp.purchasePrice, pp.taxCountry, pp.buyerType)
  const costInputs = {
    managementFeePercent: pp.managementFeePercent,
    voidAllowancePercent: pp.voidAllowancePercent,
    maintenanceReserve:   pp.maintenanceReserve,
    buildingsInsurance:   pp.buildingsInsurance,
    serviceCharge:        pp.serviceCharge,
    groundRentAnnual:     pp.groundRentAnnual,
  }
  const baseShared = {
    purchasePrice: pp.purchasePrice,
    refurbCost:    pp.refurbCost,
    otherCosts:    pp.otherCosts,
    stampDuty:     tax,
  }

  if (pp.strategy === 'BTL') {
    const r = calculateBTL({
      ...baseShared,
      depositPercent: pp.btlPurchaseFinancingMethod === 'cash' ? 100 : pp.depositPercent,
      mortgageRate:   pp.btlPurchaseFinancingMethod === 'cash' ? 0   : pp.mortgageRate,
      mortgageTerm:   pp.mortgageTerm,
      mortgageType:   pp.mortgageType,
      monthlyRent:    pp.btlMonthlyRent,
      ...costInputs,
    })
    return { ...r, monthlyMortgagePayment: r.monthlyMortgageInterest }
  }

  if (pp.strategy === 'HMO') {
    const r = calculateHMO({
      ...baseShared,
      otherCosts:     baseShared.otherCosts + pp.hmoLicenceCost,
      depositPercent: pp.hmoPurchaseFinancingMethod === 'cash' ? 100 : pp.depositPercent,
      mortgageRate:   pp.hmoPurchaseFinancingMethod === 'cash' ? 0   : pp.mortgageRate,
      mortgageTerm:   pp.mortgageTerm,
      mortgageType:   pp.mortgageType,
      rooms:          pp.hmoRooms,
      rentPerRoom:    pp.hmoRentPerRoom,
      occupancyRate:  pp.hmoOccupancyRate,
      ...costInputs,
    })
    return { ...r, monthlyMortgagePayment: r.monthlyMortgageInterest }
  }

  if (pp.strategy === 'SA') {
    const r = calculateSA({
      ...baseShared,
      depositPercent:      pp.saPurchaseFinancingMethod === 'cash' ? 100 : pp.depositPercent,
      mortgageRate:        pp.saPurchaseFinancingMethod === 'cash' ? 0   : pp.mortgageRate,
      mortgageTerm:        pp.mortgageTerm,
      mortgageType:        pp.mortgageType,
      nightlyRate:         pp.saNightlyRate,
      occupancyPercent:    pp.saOccupancyPercent,
      platformFeesPercent: pp.saPlatformFeesPercent,
      ...costInputs,
    })
    return { ...r, monthlyMortgagePayment: (r as { monthlyMortgage?: number }).monthlyMortgage }
  }

  if (pp.strategy === 'FLIP') {
    const refurbAdj = pp.refurbCost * (1 + pp.flipContingencyPercent / 100)
    const r = calculateFlip({
      purchasePrice:       pp.purchasePrice,
      refurbCost:          refurbAdj,
      otherCosts:          pp.otherCosts,
      stampDuty:           tax,
      holdingCostsPerMonth: pp.flipHoldingCostsPerMonth,
      projectLengthMonths:  pp.flipProjectLengthMonths,
      expectedSalePrice:    pp.flipExpectedSalePrice,
      sellingCostsPercent:  pp.flipSellingCostsPercent,
    })
    const monthlyCashFlow = pp.flipProjectLengthMonths > 0 ? r.netProfit / pp.flipProjectLengthMonths : 0
    return {
      monthlyCashFlow,
      annualCashFlow: monthlyCashFlow * 12,
      cashOnCashROI:  r.roi,
      grossYield:     0,
      netYield:       0,
      totalCashInvested: r.totalCost,
      breakEvenRent:  0,
      score:          r.score,
      netProfit:      r.netProfit,
      totalCost:      r.totalCost,
      roi:            r.roi,
      annualisedROI:  r.annualisedROI,
      sellingCosts:   r.sellingCosts,
    }
  }

  if (pp.strategy === 'BRRR') {
    const r = calculateBRRR({
      purchasePrice:    pp.purchasePrice,
      refurbCost:       pp.refurbCost,
      otherCosts:       pp.otherCosts,
      stampDuty:        tax,
      postRefurbValue:  pp.brrrPostRefurbValue,
      refinancePercent: pp.brrrRefinancePercent,
      newMortgageRate:  pp.brrrNewMortgageRate,
      monthlyRent:      pp.brrrMonthlyRent,
      ...costInputs,
    })
    return {
      monthlyCashFlow: r.monthlyCashFlow,
      annualCashFlow:  r.annualCashFlow,
      cashOnCashROI:   r.cashOnCashROI,
      grossYield:      r.grossYield,
      netYield:        r.netYield,
      totalCashInvested: r.cashLeftInDeal > 0 ? r.cashLeftInDeal : 0,
      breakEvenRent:   r.breakEvenRent,
      score:           r.score,
      monthlyMortgagePayment: r.monthlyMortgage,
      effectiveRent:   r.effectiveRent,
      managementFeeAmount: r.managementFeeAmount,
      totalOperatingCosts: r.totalOperatingCosts,
      netOperatingIncome:  r.netOperatingIncome,
      voidAllowanceAmount: r.voidAllowanceAmount,
      refinanceLoan:   r.refinanceLoan,
      cashLeftInDeal:  r.cashLeftInDeal,
      equityCreated:   r.equityCreated,
      moneyOut:        r.moneyOut,
    }
  }

  if (pp.strategy === 'R2R') {
    const setupTotal = pp.r2rSetupCosts + pp.r2rMonthlyRentPaid * pp.r2rLandlordDepositMonths
    const r = calculateR2R({
      monthlyRentPaid:       pp.r2rMonthlyRentPaid,
      rooms:                 pp.r2rRooms,
      rentPerRoom:           pp.r2rRentPerRoom,
      occupancyRate:         pp.r2rOccupancyRate,
      managementFeesPercent: pp.r2rManagementFeesPercent,
      monthlyRunningCosts:   pp.r2rMonthlyRunningCosts,
      setupCosts:            setupTotal,
    })
    return {
      monthlyCashFlow: r.monthlyProfit,
      annualCashFlow:  r.monthlyProfit * 12,
      cashOnCashROI:   r.roi,
      grossYield:      r.roi,
      netYield:        r.roi,
      totalCashInvested: setupTotal,
      breakEvenRent:   0,
      score:           r.score,
      monthlyProfit:   r.monthlyProfit,
      spreadPerRoom:   r.spreadPerRoom,
      occupancyBreakEven: r.occupancyBreakEven,
    }
  }

  // SOCIAL
  const r = calculateSocialHousing({
    ...baseShared,
    depositPercent: pp.socialPurchaseFinancingMethod === 'cash' ? 100 : pp.depositPercent,
    mortgageRate:   pp.socialPurchaseFinancingMethod === 'cash' ? 0   : pp.mortgageRate,
    mortgageTerm:   pp.mortgageTerm,
    mortgageType:   pp.mortgageType,
    leaseIncomePerMonth: pp.socialLeaseIncomePerMonth,
    leaseLengthYears:    pp.socialLeaseLengthYears,
    ...costInputs,
  })
  return { ...r, monthlyMortgagePayment: r.monthlyMortgage }
}

function getCompositeScore(p: ParsedInputs, base: CalcResult): DealScoreResult | null {
  if (base.score === 'Incomplete') return null
  if (p.strategy === 'BTL') return calculateDealScore({ strategy: 'BTL', cashOnCashROI: base.cashOnCashROI, monthlyCashFlow: base.monthlyCashFlow, grossYield: base.grossYield })
  if (p.strategy === 'HMO') return calculateDealScore({ strategy: 'HMO', cashOnCashROI: base.cashOnCashROI, monthlyCashFlow: base.monthlyCashFlow, grossYield: base.grossYield, cashFlowPerRoom: p.hmoRooms > 0 ? base.monthlyCashFlow / p.hmoRooms : 0 })
  if (p.strategy === 'SA') return calculateDealScore({ strategy: 'SA', cashOnCashROI: base.cashOnCashROI, monthlyCashFlow: base.monthlyCashFlow, netYield: base.netYield, breakEvenOccupancy: (base as { breakEvenOccupancy?: number }).breakEvenOccupancy ?? 0 })
  if (p.strategy === 'FLIP') return calculateDealScore({ strategy: 'FLIP', roi: base.roi ?? 0, netProfit: base.netProfit ?? 0, annualisedROI: base.annualisedROI ?? 0 })
  if (p.strategy === 'BRRR') return calculateDealScore({ strategy: 'BRRR', cashLeftInDeal: base.cashLeftInDeal ?? 0, moneyOut: base.moneyOut ?? false, monthlyCashFlow: base.monthlyCashFlow, cashOnCashROI: base.cashOnCashROI, equityUpliftPct: base.equityCreated && p.purchasePrice > 0 ? (base.equityCreated / (p.purchasePrice + p.refurbCost)) * 100 : 0 })
  if (p.strategy === 'R2R') return calculateDealScore({ strategy: 'R2R', monthlyProfit: base.monthlyProfit ?? 0, roi: base.cashOnCashROI, spreadPerRoom: base.spreadPerRoom ?? 0, occupancyBreakEven: base.occupancyBreakEven ?? 0 })
  return calculateDealScore({ strategy: 'SOCIAL', cashOnCashROI: base.cashOnCashROI, monthlyCashFlow: base.monthlyCashFlow, grossYield: base.grossYield, leaseLengthYears: p.socialLeaseLengthYears })
}

// ── Verdict pill ──────────────────────────────────────────────────────────────
function VerdictPill({ v, size = 'sm' }: { v: 'RECOMMENDED' | 'REVIEW' | 'AVOID' | null; size?: 'sm' | 'md' }) {
  if (!v) return null
  const colors: Record<string, [string, string]> = {
    RECOMMENDED: [TEAL_LIGHT, '#065f46'],
    REVIEW:      ['#fef3c7', '#92400e'],
    AVOID:       ['#fee2e2', '#b91c1c'],
  }
  const [bg, color] = colors[v] ?? [BG_SEC, TEXT_2]
  const fs = size === 'md' ? '12px' : '9px'
  const pad = size === 'md' ? '5px 14px' : '2px 8px'
  return (
    <span style={{ fontSize: fs, fontWeight: 700, padding: pad, borderRadius: '20px', background: bg, color, display: 'inline-block' }}>
      {v}
    </span>
  )
}

// ── Card / section primitives ─────────────────────────────────────────────────
function Sec({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: '10px' }}>
      <div style={{ padding: '12px 16px', borderBottom: `.5px solid ${DS_BORDER}`, display: 'flex', alignItems: 'center', gap: '8px', background: BG_SEC }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, flex: 1 }}>{title}</span>
        {badge && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', background: NAVY_LIGHT, color: NAVY }}>{badge}</span>}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

// ── Metric tile ───────────────────────────────────────────────────────────────
function Met({ label, value, highlighted, green }: { label: string; value: string; highlighted?: boolean; green?: boolean }) {
  return (
    <div style={{ background: highlighted ? NAVY_LIGHT : BG_SEC, border: `.5px solid ${highlighted ? 'rgba(27,58,107,.18)' : DS_BORDER}`, borderRadius: '8px', padding: '10px 12px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: green ? '#065f46' : TEXT_1 }}>{value}</div>
    </div>
  )
}

// ── Input field ───────────────────────────────────────────────────────────────
const InputsCtx = createContext({ isEditing: false, isNewDeal: false })

function IField({ label, value, onChange, required }: { label: string; value: string; onChange?: (v: string) => void; required?: boolean }) {
  const { isEditing, isNewDeal } = useContext(InputsCtx)
  const displayValue = isNewDeal ? '' : (value === '—' ? '' : value)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5a6270' }}>
        {label}{required && <span style={{ color: AMBER }}> *</span>}
      </label>
      <input
        readOnly={!isEditing || !onChange}
        value={displayValue}
        onChange={isEditing && onChange ? (e) => onChange(e.target.value) : undefined}
        style={{ border: `.5px solid #c8cbd2`, borderRadius: '8px', padding: '7px 10px', fontSize: '12px', color: TEXT_2, background: isEditing ? '#fff' : BG_SEC, minHeight: '33px', cursor: isEditing ? 'text' : 'default', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
    </div>
  )
}

function IGrid({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', ...style }}>{children}</div>
}

function MgLabel({ label }: { label: string }) {
  return <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#bbb', margin: '13px 0 8px' }}>{label}</div>
}

// ── Accordion (workings) ──────────────────────────────────────────────────────
function AccSection({ title, summary, dotColor, children }: { title: string; summary: string; dotColor?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: dotColor ?? NAVY, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>{title}</div>
            <div style={{ fontSize: '10px', color: TEXT_2, marginTop: '2px' }}>{summary}</div>
          </div>
        </div>
        <span style={{ fontSize: '13px', color: '#bbb', transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>
      {open && (
        <div style={{ borderTop: `.5px solid ${DS_BORDER}`, padding: '14px 16px' }}>{children}</div>
      )}
    </div>
  )
}

function CalcStep({ label, how, value, plus }: { label: string; how: string; value: string; plus?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', marginBottom: '6px' }}>
      <div style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, background: plus ? TEAL_LIGHT : '#fee2e2', color: plus ? '#065f46' : '#b91c1c' }}>
        {plus ? '+' : '−'}
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600, color: TEXT_1 }}>{label}</span>
        <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '1px' }}>{how}</div>
      </div>
      <span style={{ fontWeight: 700, color: plus ? '#065f46' : '#b91c1c' }}>{value}</span>
    </div>
  )
}

function CalcTotal({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: TEXT_1, borderTop: `.5px solid ${DS_BORDER}`, paddingTop: '8px', marginTop: '4px' }}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}

function Insight({ text }: { text: string }) {
  return (
    <div style={{ background: NAVY_LIGHT, borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: TEXT_2, lineHeight: 1.6, marginTop: '10px' }}>{text}</div>
  )
}

// ── Sub-nav ───────────────────────────────────────────────────────────────────
export type SubView = 'results' | 'inputs' | 'sensitivity' | 'workings'

function SubNav({ active, onChange }: { active: SubView; onChange: (v: SubView) => void }) {
  const items: { key: SubView; label: string; icon: string }[] = [
    { key: 'inputs',      label: 'Inputs',      icon: 'ti-adjustments-horizontal' },
    { key: 'results',     label: 'Results',     icon: 'ti-chart-line' },
    { key: 'sensitivity', label: 'Sensitivity', icon: 'ti-chart-bar' },
    { key: 'workings',    label: 'Workings',    icon: 'ti-list-search' },
  ]
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
      {items.map(({ key, label, icon }) => (
        <button key={key} onClick={() => onChange(key)} style={{ fontSize: '11px', fontWeight: 600, padding: '5px 14px', borderRadius: '7px', border: 'none', background: active === key ? NAVY : 'transparent', color: active === key ? '#fff' : TEXT_2, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <i className={`ti ${icon}`} style={{ fontSize: '11px' }} />{label}
        </button>
      ))}
    </div>
  )
}

// ── VIEW: Results ─────────────────────────────────────────────────────────────
function ViewResults({ p, base, composite, stressRentDown, stressRateUp, stressCombined }: {
  p: ParsedInputs
  base: CalcResult
  composite: DealScoreResult | null
  stressRentDown: CalcResult
  stressRateUp: CalcResult
  stressCombined: CalcResult
}) {
  const strategyLabel: Record<DealType, string> = {
    BTL: 'Buy to Let', HMO: 'HMO', FLIP: 'Flip / Refurb', SA: 'Serviced Accommodation',
    BRRR: 'BRRR', R2R: 'Rent to Rent', SOCIAL: 'Social Housing',
  }
  const isIncomplete = base.score === 'Incomplete'
  const verdict = composite?.verdict ?? null
  const numScore = composite?.score ?? null

  const equityDayOne = p.marketValue > 0 ? p.marketValue - p.purchasePrice : 0
  const bmvPct = p.marketValue > 0 ? (equityDayOne / p.marketValue) * 100 : 0

  const verdictTitle: Record<string, string> = {
    RECOMMENDED: `Strong ${strategyLabel[p.strategy]} opportunity`,
    REVIEW: `${strategyLabel[p.strategy]} — review carefully`,
    AVOID: `${strategyLabel[p.strategy]} — below threshold`,
  }

  const scaleColor = (v: 'RECOMMENDED' | 'REVIEW' | 'AVOID' | null) => {
    if (v === 'RECOMMENDED') return TEAL
    if (v === 'REVIEW') return AMBER
    return '#dc2626'
  }

  // Sensitivity scenarios for teaser
  const scenarios: { label: string; verdict: string; colorKey: string }[] = []
  if (!isIncomplete) {
    const mapV = (cf: CalcResult) => {
      if (cf.score === 'Incomplete') return { v: 'Incomplete', c: 'dim' }
      const coc = cf.cashOnCashROI
      if (coc >= 5 && cf.monthlyCashFlow >= 100) return { v: 'Recommended', c: 'ok' }
      if (coc >= 3 || cf.monthlyCashFlow >= 50) return { v: 'Review', c: 'warn' }
      return { v: 'Avoid', c: 'bad' }
    }
    const rd = mapV(stressRentDown)
    const ru = mapV(stressRateUp)
    const cb = mapV(stressCombined)
    scenarios.push({ label: 'Rent −10%', verdict: rd.v, colorKey: rd.c })
    scenarios.push({ label: 'Rate +1.5%', verdict: ru.v, colorKey: ru.c })
    scenarios.push({ label: 'Combined', verdict: cb.v, colorKey: cb.c })
  }

  const cColor: Record<string, string> = { ok: '#065f46', warn: '#92400e', bad: '#b91c1c', dim: 'var(--text-2)' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', alignItems: 'start' }}>
      <div>
        {isIncomplete ? (
          <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '40px 24px', textAlign: 'center', marginBottom: '10px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 14px' }}><i className="ti ti-chart-line" /></div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: TEXT_1, marginBottom: '6px' }}>No analysis yet</div>
            <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.6 }}>Add deal figures in the Inputs tab to calculate returns, yield, and cash flow.</div>
          </div>
        ) : (
          <>
            {/* Verdict card */}
            <div style={{ display: 'flex', gap: '18px', background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '18px', marginBottom: '10px' }}>
              <div style={{ flexShrink: 0, textAlign: 'center', paddingRight: '18px', borderRight: `.5px solid ${DS_BORDER}`, minWidth: '90px' }}>
                <div style={{ fontSize: '34px', fontWeight: 700, color: numScore !== null ? scaleColor(verdict) : TEXT_2, lineHeight: 1 }}>{numScore ?? '—'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', margin: '2px 0 8px' }}>/ 100</div>
                <VerdictPill v={verdict} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: TEXT_1, marginBottom: '5px' }}>{verdictTitle[verdict ?? 'AVOID'] ?? `${strategyLabel[p.strategy]} result`}</div>
                <div style={{ fontSize: '12px', color: TEXT_2, lineHeight: 1.6, marginBottom: '12px' }}>
                  {p.strategy === 'FLIP'
                    ? `Net profit of ${fc(base.netProfit)} on a ${fp(base.roi)} total ROI (${fp(base.annualisedROI)} annualised).`
                    : p.strategy === 'R2R'
                      ? `Monthly profit of ${signedFc(base.monthlyProfit ?? 0)} with ${fp(base.cashOnCashROI)} ROI on setup costs.`
                      : `Cash flow ${signedFc(base.monthlyCashFlow)}/mo · ${fp(base.cashOnCashROI)} CoC ROI · ${fp(base.grossYield)} gross yield.`
                  }
                  {p.marketValue > 0 && p.purchasePrice > 0 && p.strategy !== 'FLIP' && p.strategy !== 'R2R' && equityDayOne > 0 && ` ${fp(bmvPct, 0)} below market value adds ${fc(equityDayOne)} day-one equity.`}
                </div>
                {composite && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 18px' }}>
                    {composite.dimensions.map(d => (
                      <div key={d.label}>
                        <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '2px' }}>{d.label}</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>
                          {p.strategy === 'BTL' || p.strategy === 'HMO' || p.strategy === 'SA' || p.strategy === 'BRRR' || p.strategy === 'SOCIAL'
                            ? d.label.includes('Cash Flow') || d.label.includes('Profit') || d.label.includes('Cash Left')
                              ? fc(d.value)
                              : fp(d.value)
                            : d.label.includes('Profit')
                              ? fc(d.value)
                              : fp(d.value)
                          }{' '}
                          <span style={{ fontSize: '9px', color: 'var(--text-2)', fontWeight: 400 }}>{d.points} / {d.maxPoints} pts</span>
                        </div>
                        <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: TEAL, borderRadius: '3px', width: `${(d.points / d.maxPoints) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Key metrics */}
            <Sec title="Key metrics" badge="Monthly view">
              {p.strategy === 'FLIP' ? (
                <>
                  <MgLabel label="Returns" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '10px' }}>
                    <Met label="Total ROI" value={fp(base.roi)} highlighted />
                    <Met label="Annualised ROI" value={fp(base.annualisedROI)} />
                    <Met label="Net profit" value={fc(base.netProfit)} green />
                  </div>
                  <MgLabel label="Project" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                    <Met label="Total cost in" value={fc(base.totalCost)} />
                    <Met label="Expected sale" value={fc(p.flipExpectedSalePrice)} />
                    <Met label="Selling costs" value={fc(base.sellingCosts)} />
                  </div>
                </>
              ) : p.strategy === 'R2R' ? (
                <>
                  <MgLabel label="Returns" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '10px' }}>
                    <Met label="Monthly profit" value={signedFc(base.monthlyProfit ?? 0)} highlighted green={(base.monthlyProfit ?? 0) > 0} />
                    <Met label="ROI on setup" value={fp(base.cashOnCashROI)} />
                    <Met label="Spread/room" value={fc(base.spreadPerRoom)} />
                  </div>
                  <MgLabel label="Setup" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                    <Met label="Setup costs" value={fc(p.r2rSetupCosts)} />
                    <Met label="Rent paid/mo" value={fc(p.r2rMonthlyRentPaid)} />
                    <Met label="Occ. break-even" value={fp(base.occupancyBreakEven)} />
                  </div>
                </>
              ) : p.strategy === 'BRRR' ? (
                <>
                  <MgLabel label="BRRR cycle" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '10px' }}>
                    <Met label="Refinance loan" value={fc(base.refinanceLoan)} highlighted />
                    <Met label="Cash left in deal" value={base.moneyOut ? 'Money out!' : fc(base.cashLeftInDeal)} green={base.moneyOut} />
                    <Met label="Equity created" value={fc(base.equityCreated)} green />
                  </div>
                  <MgLabel label="Post-refinance returns" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                    <Met label="Monthly CF" value={signedFc(base.monthlyCashFlow)} green={base.monthlyCashFlow > 0} />
                    <Met label="CoC ROI" value={fp(isFinite(base.cashOnCashROI) ? base.cashOnCashROI : 0)} />
                    <Met label="Break-even rent" value={fc(base.breakEvenRent)} />
                  </div>
                </>
              ) : (
                <>
                  <MgLabel label="Returns" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '10px' }}>
                    <Met label="CoC ROI" value={fp(base.cashOnCashROI)} highlighted />
                    <Met label="Gross yield" value={fp(base.grossYield)} />
                    <Met label="Net yield" value={fp(base.netYield)} />
                  </div>
                  <MgLabel label="Capital" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '10px' }}>
                    <Met label="Cash invested" value={fc(base.totalCashInvested)} />
                    <Met label="Day-one equity" value={p.marketValue > 0 ? fc(equityDayOne) : '—'} green={equityDayOne > 0} />
                    <Met label="Below market" value={p.marketValue > 0 ? fp(bmvPct, 0) : '—'} />
                  </div>
                  <MgLabel label="Income & costs" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                    <Met label={p.strategy === 'SA' ? 'Nightly rate' : 'Monthly rent'} value={p.strategy === 'SA' ? fc(p.saNightlyRate) : p.strategy === 'SOCIAL' ? fc(p.socialLeaseIncomePerMonth) : p.strategy === 'HMO' ? `${p.hmoRooms} × ${fc(p.hmoRentPerRoom)}` : fc(p.btlMonthlyRent)} />
                    <Met label="Monthly CF" value={signedFc(base.monthlyCashFlow)} green={base.monthlyCashFlow > 0} />
                    <Met label="Break-even rent" value={base.breakEvenRent > 0 ? fc(base.breakEvenRent) : '—'} />
                  </div>
                </>
              )}
            </Sec>

            {/* Sensitivity teaser */}
            {scenarios.length > 0 && (p.strategy === 'BTL' || p.strategy === 'HMO' || p.strategy === 'SA' || p.strategy === 'SOCIAL' || p.strategy === 'BRRR') && (
              <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ padding: '12px 16px', background: BG_SEC, borderBottom: `.5px solid ${DS_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>How this deal holds up under stress</span>
                </div>
                <div style={{ display: 'flex' }}>
                  {scenarios.map(sc => (
                    <div key={sc.label} style={{ flex: 1, padding: '12px 16px', textAlign: 'center', borderRight: `.5px solid ${DS_BORDER}` }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '4px' }}>{sc.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: cColor[sc.colorKey] }}>{sc.verdict}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar */}
      <div style={{ position: 'sticky', top: `${56 + 48 + 44 + 42 + 20}px` }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: NAVY, flexShrink: 0 }}><i className="ti ti-robot" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>DealScore Assistant</div>
              <div style={{ fontSize: '10px', color: TEXT_2 }}>
                {isIncomplete ? 'Awaiting inputs' : composite ? 'Analysis complete' : 'No data yet'}
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isIncomplete ? (
              <div style={{ fontSize: '11px', color: TEXT_2, lineHeight: 1.6 }}>Complete your deal inputs to generate a full analysis and score.</div>
            ) : composite ? (
              <>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, marginBottom: '2px' }}>Score breakdown</div>
                  <div style={{ fontSize: '10px', color: TEXT_2, lineHeight: 1.5 }}>
                    {composite.dimensions.map(d => `${d.label}: ${d.points}/${d.maxPoints} pts`).join(' · ')}
                  </div>
                </div>
                <div style={{ borderTop: `.5px solid #f3f4f6`, paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, marginBottom: '2px' }}>Improve your score</div>
                  <div style={{ fontSize: '10px', color: TEXT_2, lineHeight: 1.5 }}>
                    {composite.dimensions.filter(d => d.points < d.maxPoints * 0.6).slice(0, 2).map(d => `${d.label} — target ${d.strongThreshold}`).join('. ') || 'All dimensions are strong — great deal!'}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '11px', color: TEXT_2 }}>No analysis data available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── SellerCard ────────────────────────────────────────────────────────────────
const MOTIVATION_OPTS = [
  { key: 'hot'   as const, label: 'Motivated', color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  { key: 'warm'  as const, label: 'Flexible',  color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'cool'  as const, label: 'Firm',      color: '#1e3a5f', bg: '#dbeafe', border: '#93c5fd' },
  { key: 'other' as const, label: 'Other',     color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
] as const

type MotivationKey = typeof MOTIVATION_OPTS[number]['key']

function SellerCard({ form, setField, isEditing, isR2R }: {
  form: Record<string, unknown>
  setField: (path: string, v: unknown) => void
  isEditing: boolean
  isR2R: boolean
}) {
  const label = isR2R ? 'Landlord' : 'Seller'
  const sellerMotivation = form.sellerMotivation as MotivationKey | undefined
  const hasData = !!(form.sellerName || form.sellerPhone)

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '.5px solid var(--ds-border)', boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '18px 20px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'var(--bg-sec)', border: '.5px solid var(--ds-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: 'var(--navy)' }}>
          <i className="ti ti-user-circle" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{label}</div>
          <div className="pii" style={{ fontSize: '11px', color: 'var(--text-2)' }}>
            {hasData
              ? `${String(form.sellerName ?? '')}${form.sellerPhone ? ` · ${String(form.sellerPhone)}` : ''}`
              : `Add ${label.toLowerCase()} contact details`}
          </div>
        </div>
        <span style={{ fontSize: '10px', color: '#bbb', background: 'var(--bg-sec)', border: '.5px solid var(--ds-border)', padding: '2px 8px', borderRadius: '20px' }}>Optional</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb' }}>Full name</label>
          <input
            readOnly={!isEditing}
            value={String(form.sellerName ?? '')}
            onChange={isEditing ? e => { setField('sellerName', e.target.value); setField('sellerId', null) } : undefined}
            placeholder={`${label} full name`}
            className="pii"
            style={{ padding: '7px 10px', borderRadius: '7px', border: '.5px solid var(--ds-border)', fontSize: '12px', background: isEditing ? '#fff' : 'var(--bg-sec)', color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb' }}>Phone</label>
          <input
            readOnly={!isEditing}
            value={String(form.sellerPhone ?? '')}
            onChange={isEditing ? e => setField('sellerPhone', e.target.value) : undefined}
            placeholder="e.g. 07700 900 123"
            className="pii"
            style={{ padding: '7px 10px', borderRadius: '7px', border: '.5px solid var(--ds-border)', fontSize: '12px', background: isEditing ? '#fff' : 'var(--bg-sec)', color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb', marginBottom: '6px' }}>Motivation</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {MOTIVATION_OPTS.map(opt => {
            const active = sellerMotivation === opt.key
            return (
              <button key={opt.key} onClick={() => isEditing && setField('sellerMotivation', opt.key)}
                style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, border: `1.5px solid ${active ? opt.border : 'var(--ds-border)'}`, background: active ? opt.bg : '#fff', color: active ? opt.color : 'var(--text-2)', cursor: isEditing ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all .15s' }}>
                {opt.label}
              </button>
            )
          })}
        </div>
        {sellerMotivation === 'other' && (
          <input readOnly={!isEditing} value={String(form.sellerMotivationOther ?? '')}
            onChange={isEditing ? e => setField('sellerMotivationOther', e.target.value) : undefined}
            placeholder="Describe the situation…"
            style={{ marginTop: '8px', padding: '7px 10px', borderRadius: '7px', border: '.5px solid var(--ds-border)', fontSize: '12px', width: '100%', background: isEditing ? '#fff' : 'var(--bg-sec)', color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb' }}>Situation notes</label>
        <textarea readOnly={!isEditing} value={String(form.sellerNotes ?? '')}
          onChange={isEditing ? e => setField('sellerNotes', e.target.value) : undefined}
          placeholder="e.g. relocating to Scotland, needs to complete before end of month. Open to negotiation."
          style={{ padding: '8px 10px', borderRadius: '7px', border: '.5px solid var(--ds-border)', fontSize: '12px', background: isEditing ? '#fff' : 'var(--bg-sec)', color: 'var(--text-1)', outline: 'none', width: '100%', fontFamily: 'inherit', resize: 'none', height: '60px', lineHeight: 1.5, boxSizing: 'border-box' }} />
      </div>
    </div>
  )
}

// ── Step1ModePicker ───────────────────────────────────────────────────────────
function Step1ModePicker({ mode, onSelect }: { mode: string; onSelect: (m: 'buy' | 'rent' | 'specialist') => void }) {
  const cards = [
    { key: 'buy' as const, icon: 'ti-home', title: 'Buy', desc: 'Purchase and hold, flip, or refinance.', examples: 'BTL · HMO · SA · BRRR · FLIP · Social' },
    { key: 'rent' as const, icon: 'ti-key', title: 'Rent', desc: 'Rent from landlord and sublet — no purchase.', examples: 'R2R' },
    { key: 'specialist' as const, icon: 'ti-arrows-exchange', title: 'Specialist / Other', desc: 'Control without purchase, or fee-based structures.', examples: 'Lease Option · Assisted Sale' },
  ]
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '.5px solid var(--ds-border)', boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '18px 20px', marginBottom: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: '#aaa', marginBottom: '3px' }}>Step 1 of 2</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '12px' }}>How are you planning to control this property?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {cards.map(c => (
          <div key={c.key} onClick={() => onSelect(c.key)}
            style={{ border: `${mode === c.key ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`, borderRadius: '12px', padding: '14px', cursor: 'pointer', background: mode === c.key ? 'var(--navy-light)' : '#fff', transition: 'all .18s' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '7px', background: mode === c.key ? 'var(--navy)' : 'var(--bg-sec)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', color: mode === c.key ? '#fff' : 'var(--text-2)', marginBottom: '9px', border: mode === c.key ? 'none' : '.5px solid var(--ds-border)' }}>
              <i className={`ti ${c.icon}`} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px' }}>{c.title}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.45, marginBottom: '5px' }}>{c.desc}</div>
            <div style={{ fontSize: '10px', color: '#aaa' }}>{c.examples}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Step2StrategyPicker ───────────────────────────────────────────────────────
const BUY_TILES = [
  { key: 'btl', name: 'BTL', full: 'Buy to Let — single household', live: true },
  { key: 'hmo', name: 'HMO', full: 'House in Multiple Occupation', live: true },
  { key: 'sa',  name: 'SA',  full: 'Serviced Accommodation — short-let', live: true },
  { key: 'social', name: 'Social Housing', full: 'Lease to council / housing provider', live: true },
  { key: 'brrr', name: 'BRRR', full: 'Buy, Refurb, Refinance, Rent', live: true },
  { key: 'flip', name: 'FLIP', full: 'Buy, Refurb, Sell — trade for profit', live: true },
]
const RENT_TILES = [
  { key: 'r2r', name: 'R2R', full: 'Rent to Rent — sublet rooms', live: true },
]

function Step2StrategyPicker({ mode, activeTile, onSelect, isEditing }: { mode: string; activeTile: string; onSelect: (k: string) => void; isEditing: boolean }) {
  const tiles = mode === 'rent' ? RENT_TILES : BUY_TILES
  const modeLabel = mode === 'rent' ? 'Rent strategies' : mode === 'specialist' ? 'Specialist strategies' : 'Buy strategies'
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '.5px solid var(--ds-border)', boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '18px 20px', marginBottom: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: '#aaa', marginBottom: '3px' }}>Step 2 of 2 — {modeLabel}</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '12px' }}>Select your strategy</div>
      {mode === 'specialist' ? (
        <div style={{ fontSize: '12px', color: 'var(--text-2)', padding: '16px', background: 'var(--bg-sec)', borderRadius: '8px' }}>Lease Option and Assisted Sale coming soon.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {tiles.map(t => (
            <div key={t.key} onClick={() => isEditing && t.live && onSelect(t.key)}
              style={{ border: `${activeTile === t.key ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`, borderRadius: '8px', padding: '11px', cursor: isEditing && t.live ? 'pointer' : 'default', background: activeTile === t.key ? 'var(--navy-light)' : 'var(--bg-sec)', transition: 'all .18s', opacity: t.live ? 1 : 0.55 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>{t.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-2)', lineHeight: 1.4, marginBottom: '5px' }}>{t.full}</div>
              <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', background: t.live ? 'var(--teal-light)' : '#fef3c7', color: t.live ? '#065f46' : '#92400e', display: 'inline-block' }}>
                {t.live ? '✓ Live' : 'Coming soon'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── VIEW: Inputs ──────────────────────────────────────────────────────────────
function ViewInputs({ p, isNewDeal, dealId, onSave }: {
  p: ParsedInputs
  isNewDeal: boolean
  dealId: string
  onSave?: (updated: Deal) => void
}) {
  const [searchParams] = useSearchParams()
  const isEditing = searchParams.get('editing') === 'true'
  const taxLabel = TAX_LABEL[p.taxCountry] ?? 'Tax'
  const taxValue = p.taxOverrideActive
    ? p.manualTaxValue
    : calculatePropertyTax(p.purchasePrice, p.taxCountry, p.buyerType)

  const strategyLabel: Record<DealType, string> = {
    BTL: 'Buy to Let', HMO: 'HMO', FLIP: 'Flip / Refurb', SA: 'Serviced Accommodation',
    BRRR: 'BRRR', R2R: 'Rent to Rent', SOCIAL: 'Social Housing',
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<Record<string, unknown>>(() => ({
    address: p.address,
    marketValue: p.marketValue,
    taxRegion: p.taxCountry,
    buyerType: p.buyerType,
    propertyType: p.propertyType,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    tenure: p.tenure,
    managementFeePercent: p.managementFeePercent,
    voidAllowancePercent: p.voidAllowancePercent,
    maintenanceReserve: p.maintenanceReserve,
    buildingsInsurance: p.buildingsInsurance,
    serviceCharge: p.serviceCharge,
    groundRentAnnual: p.groundRentAnnual,
    btlPurchaseFinancingMethod: p.btlPurchaseFinancingMethod,
    hmoPurchaseFinancingMethod: p.hmoPurchaseFinancingMethod,
    saPurchaseFinancingMethod: p.saPurchaseFinancingMethod,
    brrrPurchaseFinancingMethod: p.brrrPurchaseFinancingMethod,
    socialPurchaseFinancingMethod: p.socialPurchaseFinancingMethod,
    r2rLandlordDepositMonths: p.r2rLandlordDepositMonths,
    sharedInputs: {
      purchasePrice: p.purchasePrice,
      refurbCost: p.refurbCost,
      otherCosts: p.otherCosts,
      depositPercent: p.depositPercent,
      mortgageRate: p.mortgageRate,
      mortgageTerm: p.mortgageTerm,
      mortgageType: p.mortgageType,
    },
    btlInputs:    { monthlyRent: p.btlMonthlyRent },
    hmoInputs:    { rooms: p.hmoRooms, rentPerRoom: p.hmoRentPerRoom, occupancyRate: p.hmoOccupancyRate, licenceCost: p.hmoLicenceCost, billsUtilities: p.hmoBillsUtilities },
    saInputs:     { nightlyRate: p.saNightlyRate, occupancyPercent: p.saOccupancyPercent, platformFeesPercent: p.saPlatformFeesPercent, cleaningCostPerStay: p.saCleaningCostPerStay, billsUtilities: p.saBillsUtilities },
    flipInputs:   { holdingCostsPerMonth: p.flipHoldingCostsPerMonth, projectLengthMonths: p.flipProjectLengthMonths, expectedSalePrice: p.flipExpectedSalePrice, sellingCostsPercent: p.flipSellingCostsPercent, contingencyPercent: p.flipContingencyPercent },
    brrrInputs:   { postRefurbValue: p.brrrPostRefurbValue, refinancePercent: p.brrrRefinancePercent, newMortgageRate: p.brrrNewMortgageRate, monthlyRent: p.brrrMonthlyRent },
    r2rInputs:    { monthlyRentPaid: p.r2rMonthlyRentPaid, rooms: p.r2rRooms, rentPerRoom: p.r2rRentPerRoom, occupancyRate: p.r2rOccupancyRate, managementFeesPercent: p.r2rManagementFeesPercent, monthlyRunningCosts: p.r2rMonthlyRunningCosts, setupCosts: p.r2rSetupCosts },
    socialInputs: { leaseIncomePerMonth: p.socialLeaseIncomePerMonth, leaseLengthYears: p.socialLeaseLengthYears },
  }))

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const initialMode: 'buy' | 'rent' | 'specialist' = p.strategy === 'R2R' ? 'rent' : 'buy'
  const [mode, setMode] = useState<'buy' | 'rent' | 'specialist'>(initialMode)
  const [activeTile, setActiveTile] = useState<string>(p.strategy.toLowerCase())

  async function selectStrategy(stratKey: string) {
    setActiveTile(stratKey)
    const stratMap: Record<string, string> = {
      btl: 'BTL', hmo: 'HMO', sa: 'SA', brrr: 'BRRR', flip: 'FLIP', r2r: 'R2R', social: 'SOCIAL',
    }
    const supaStrategy = stratMap[stratKey]
    if (supaStrategy) {
      const updated = await updateDealInputs(dealId, { ...form, strategy: supaStrategy }, {
        strategy: supaStrategy,
        address: String(form.address ?? ''),
        purchase_price: Number((form.sharedInputs as Record<string, unknown>)?.purchasePrice) || null,
        market_value: Number(form.marketValue) || null,
      })
      if (updated) { setSaveStatus('saved'); onSave?.(updated) }
    }
  }

  function scheduleAutosave(nextForm: Record<string, unknown>) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      const shared = (nextForm.sharedInputs as Record<string, unknown> | undefined) ?? {}
      const updated = await updateDealInputs(dealId, nextForm, {
        address: String(nextForm.address ?? ''),
        purchase_price: Number(shared.purchasePrice) || null,
        market_value: Number(nextForm.marketValue) || null,
      })
      if (updated) { setSaveStatus('saved'); onSave?.(updated) }
      else { setSaveStatus('error') }
    }, 800)
  }

  function setField(path: string, value: unknown) {
    setForm(prev => {
      const next = { ...prev }
      const parts = path.split('.')
      if (parts.length === 1) {
        next[path] = value
      } else {
        next[parts[0]] = { ...(prev[parts[0]] as Record<string, unknown>), [parts[1]]: value }
      }
      scheduleAutosave(next)
      return next
    })
  }

  const sh     = (form.sharedInputs as Record<string, unknown>) ?? {}
  const btl    = (form.btlInputs    as Record<string, unknown>) ?? {}
  const hmo    = (form.hmoInputs    as Record<string, unknown>) ?? {}
  const sa     = (form.saInputs     as Record<string, unknown>) ?? {}
  const flip   = (form.flipInputs   as Record<string, unknown>) ?? {}
  const brrr   = (form.brrrInputs   as Record<string, unknown>) ?? {}
  const r2r    = (form.r2rInputs    as Record<string, unknown>) ?? {}
  const social = (form.socialInputs as Record<string, unknown>) ?? {}

  return (
    <InputsCtx.Provider value={{ isEditing: isEditing, isNewDeal }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', alignItems: 'start' }}>
      <div>

        {/* 1. LOCKED BANNER */}
        {!isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <i className="ti ti-lock" style={{ fontSize: '16px', color: TEXT_2, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '12px', color: TEXT_2 }}>Viewing deal — all inputs are read-only. Click Edit to make changes.</div>
            <button onClick={() => navigate('?tab=analysis&view=inputs&editing=true')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: NAVY, color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              <i className="ti ti-pencil" style={{ fontSize: '11px' }} /> Edit
            </button>
          </div>
        )}

        {/* 2. PROPERTY INFORMATION */}
        <Sec title="Property information">
          <IGrid>
            {/* Row 1 */}
            <IField label="Address" value={String(form.address ?? '')} onChange={v => setField('address', v)} required />
            <IField label="Property type" value={String(form.propertyType ?? '')} onChange={v => setField('propertyType', v)} />
            <IField label="Bedrooms" value={String(form.bedrooms ?? '')} onChange={v => setField('bedrooms', v)} />
            {/* Row 2 */}
            <IField label="Bathrooms" value={String(form.bathrooms ?? '')} onChange={v => setField('bathrooms', v)} />
            <IField label="Floor area (sqm)" value={String(form.floorAreaSqm ?? '')} onChange={v => setField('floorAreaSqm', parseFloat(v) || 0)} />
            <IField label="Year built" value={String(form.yearBuilt ?? '')} onChange={v => setField('yearBuilt', parseInt(v) || 0)} />
            {/* Row 3 */}
            <IField label="Tenure" value={String(form.tenure ?? 'Freehold')} onChange={v => setField('tenure', v)} />
            <IField label="EPC rating" value={String(form.epcRating ?? '')} onChange={v => setField('epcRating', v)} />
            <div>
              <IField label="Construction type" value={String(form.constructionType ?? 'Standard (brick/block)')} onChange={v => setField('constructionType', v)} />
              {!String(form.constructionType ?? 'Standard (brick/block)').toLowerCase().includes('standard') && (
                <div style={{ fontSize: '10px', color: '#92400e', marginTop: '4px', lineHeight: 1.4 }}>
                  ⚠️ Non-standard construction — some lenders will not lend on this property type. Confirm mortgage eligibility early.
                </div>
              )}
            </div>
            {/* Row 4 */}
            <IField label="Asking price (£)" value={Number(form.askingPrice) > 0 ? fc(Number(form.askingPrice)) : ''} onChange={v => setField('askingPrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Buyer type" value={String(form.buyerType ?? 'Standard')} onChange={v => setField('buyerType', v)} />
            <IField label="Source of deal" value={String(form.sourceOfDeal ?? '')} onChange={v => setField('sourceOfDeal', v)} />
            {/* Row 5 */}
            <IField label="Flood risk" value={String(form.floodRisk ?? 'Low')} onChange={v => setField('floodRisk', v)} />
            <IField label="Gas supply" value={String(form.hasGasSupply ?? 'Yes')} onChange={v => setField('hasGasSupply', v)} />
            <IField label="Council tax band" value={String(form.councilTaxBand ?? '')} onChange={v => setField('councilTaxBand', v)} />
            {/* Row 6 */}
            <IField label="Currently tenanted?" value={String(form.isCurrentlyTenanted ?? 'No')} onChange={v => setField('isCurrentlyTenanted', v)} />
            <IField label="Uninhabitable?" value={String(form.isUninhabitable ?? 'No')} onChange={v => setField('isUninhabitable', v)} />
            <IField label="Listed building" value={String(form.listedStatus ?? 'None')} onChange={v => setField('listedStatus', v)} />
            {/* Row 7 */}
            <IField label="Conservation area?" value={String(form.isConservationArea ?? 'No')} onChange={v => setField('isConservationArea', v)} />
            <IField label="PD rights available?" value={String(form.pdRightsAvailable ?? 'Unknown')} onChange={v => setField('pdRightsAvailable', v)} />
            <IField label="Cash buyer?" value={String(form.isCashBuyer ?? 'No')} onChange={v => setField('isCashBuyer', v)} />
          </IGrid>
        </Sec>

        {/* MEES warning — shown when EPC is D or below */}
        {['D','E','F','G'].includes(String(form.epcRating ?? '').toUpperCase()) && (
          <div style={{
            background: '#fef3c7', border: '.5px solid #fcd34d', borderRadius: '10px',
            padding: '12px 16px', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '16px', color: '#92400e', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>
                EPC {String(form.epcRating).toUpperCase()} — MEES compliance required
              </div>
              <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.5, marginBottom: '10px' }}>
                From 2025, new tenancies in England require a minimum EPC C rating. This property may need improvement works before it can be legally let.
              </div>
              <IField
                label="Estimated EPC improvement cost (£)"
                value={Number(form.epcImprovementCost) > 0 ? fc(Number(form.epcImprovementCost)) : ''}
                onChange={v => setField('epcImprovementCost', parseFloat(v.replace(/[£,]/g, '')) || 0)}
              />
            </div>
          </div>
        )}

        {/* Auction purchase — conditional */}
        <div style={{
          background: '#fff', borderRadius: '12px', border: '.5px solid var(--ds-border)',
          boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '14px 18px', marginBottom: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="ti ti-gavel" style={{ fontSize: '16px', color: 'var(--text-2)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>Auction purchase?</span>
            <button
              onClick={() => isEditing && setField('isAuctionPurchase', !(!!form.isAuctionPurchase))}
              style={{
                padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default',
                background: !!form.isAuctionPurchase ? 'var(--navy)' : 'var(--bg-sec)',
                color: !!form.isAuctionPurchase ? '#fff' : 'var(--text-2)',
              }}
            >{!!form.isAuctionPurchase ? 'Yes' : 'No'}</button>
          </div>
          {!!form.isAuctionPurchase && (
            <IGrid style={{ marginTop: '12px' }}>
              <IField label="Buyer's premium (%)" value={fp(Number(form.auctionBuyersPremiumPercent ?? 0))} onChange={v => setField('auctionBuyersPremiumPercent', parseFloat(v) || 0)} />
              <IField label="Reservation fee (£)" value={Number(form.auctionReservationFee) > 0 ? fc(Number(form.auctionReservationFee)) : ''} onChange={v => setField('auctionReservationFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
          )}
        </div>

        {/* Leasehold details — shown only when Tenure = Leasehold */}
        {String(form.tenure ?? '').toLowerCase() === 'leasehold' && (
          <Sec title="Leasehold details">
            <IGrid>
              <IField label="Remaining lease (years)" value={String(form.remainingLeaseYears ?? '')} onChange={v => setField('remainingLeaseYears', parseInt(v) || 0)} required />
              <IField label="Lease extension cost (£)" value={Number(form.leaseExtensionCost) > 0 ? fc(Number(form.leaseExtensionCost)) : ''} onChange={v => setField('leaseExtensionCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Service charge (£/mo)" value={Number(form.serviceChargeMonthly) > 0 ? fc(Number(form.serviceChargeMonthly)) : ''} onChange={v => setField('serviceChargeMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Ground rent (£/yr)" value={Number(form.groundRentAnnual) > 0 ? fc(Number(form.groundRentAnnual)) : ''} onChange={v => setField('groundRentAnnual', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Ground rent review" value={String(form.groundRentReviewClause ?? 'None')} onChange={v => setField('groundRentReviewClause', v)} />
              <IField label="Share of freehold?" value={String(form.shareOfFreehold ?? 'No')} onChange={v => setField('shareOfFreehold', v)} />
              <IField label="Sinking fund balance (£)" value={Number(form.sinkingFundBalance) > 0 ? fc(Number(form.sinkingFundBalance)) : ''} onChange={v => setField('sinkingFundBalance', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
            {String(form.groundRentReviewClause ?? '').toLowerCase().includes('doubl') && (
              <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fef2f2', border: '.5px solid #fca5a5', borderRadius: '8px', fontSize: '11px', color: '#991b1b' }}>
                ⚠️ <strong>Doubling ground rent</strong> — this lease structure may make the property unmortgageable. Confirm with solicitor before proceeding.
              </div>
            )}
          </Sec>
        )}

        {/* 3. SELLER / LANDLORD */}
        <SellerCard form={form} setField={setField} isEditing={isEditing} isR2R={activeTile === 'r2r'} />

        {/* 4. STEP 1 — Buy / Rent / Specialist */}
        <Step1ModePicker mode={mode} onSelect={setMode} />

        {/* 5. STEP 2 — Strategy tiles */}
        <Step2StrategyPicker mode={mode} activeTile={activeTile} onSelect={selectStrategy} isEditing={isEditing} />

        {/* 6. STRATEGY-SPECIFIC INPUT SECTIONS */}

        {/* Property & purchase — Buy strategies */}
        {mode === 'buy' && (
          <Sec title="Property &amp; purchase">
            <IGrid>
              <IField label="Purchase price" value={Number((form.sharedInputs as Record<string,unknown>)?.purchasePrice) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).purchasePrice)) : ''} onChange={v => setField('sharedInputs.purchasePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Market value / GDV" value={Number(form.marketValue) > 0 ? fc(Number(form.marketValue)) : ''} onChange={v => setField('marketValue', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Country" value={COUNTRY_LABEL[p.taxCountry] ?? p.taxCountry} />
              <IField label={`${taxLabel} (auto-calculated)`} value={taxValue > 0 ? fc(taxValue) : '—'} />
              <IField label="Refurb cost" value={Number((form.sharedInputs as Record<string,unknown>)?.refurbCost) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).refurbCost)) : ''} onChange={v => setField('sharedInputs.refurbCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Other costs (legal, broker)" value={Number((form.sharedInputs as Record<string,unknown>)?.otherCosts) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).otherCosts)) : ''} onChange={v => setField('sharedInputs.otherCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
          </Sec>
        )}

        {/* Purchase financing — Buy only, not FLIP */}
        {mode === 'buy' && activeTile !== 'flip' && (
          <Sec title="Purchase financing">
            <IGrid>
              <IField label="Deposit %" value={fp(Number((form.sharedInputs as Record<string,unknown>)?.depositPercent ?? 25))} onChange={v => setField('sharedInputs.depositPercent', parseFloat(v) || 25)} />
              <IField label="Mortgage rate" value={Number((form.sharedInputs as Record<string,unknown>)?.mortgageRate) > 0 ? fp(Number((form.sharedInputs as Record<string,unknown>).mortgageRate)) : ''} onChange={v => setField('sharedInputs.mortgageRate', parseFloat(v) || 0)} />
              <IField label="Term (years)" value={String((form.sharedInputs as Record<string,unknown>)?.mortgageTerm ?? 25)} onChange={v => setField('sharedInputs.mortgageTerm', parseInt(v) || 25)} />
              <IField label="Type" value={String((form.sharedInputs as Record<string,unknown>)?.mortgageType ?? 'IO') === 'IO' ? 'Interest only' : 'Repayment'} />
            </IGrid>
          </Sec>
        )}

        {/* Monthly costs — Buy only, not FLIP */}
        {mode === 'buy' && activeTile !== 'flip' && (
          <Sec title="Monthly costs">
            <IGrid>
              <IField label="Management fee %" value={fp(Number(form.managementFeePercent ?? 10))} onChange={v => setField('managementFeePercent', parseFloat(v) || 10)} />
              <IField label="Buildings insurance / mo" value={fc(Number(form.buildingsInsurance ?? 30))} onChange={v => setField('buildingsInsurance', parseFloat(v.replace(/[£,]/g, '')) || 30)} />
              <IField label="Maintenance reserve / mo" value={fc(Number(form.maintenanceReserve ?? 75))} onChange={v => setField('maintenanceReserve', parseFloat(v.replace(/[£,]/g, '')) || 75)} />
              <IField label="Void allowance %" value={fp(Number(form.voidAllowancePercent ?? 5))} onChange={v => setField('voidAllowancePercent', parseFloat(v) || 5)} />
            </IGrid>
          </Sec>
        )}

        {/* BTL */}
        {activeTile === 'btl' && (
          <Sec title="BTL — income">
            <IGrid>
              <IField label="Monthly rent" value={Number((form.btlInputs as Record<string,unknown>)?.monthlyRent) > 0 ? fc(Number((form.btlInputs as Record<string,unknown>).monthlyRent)) : ''} onChange={v => setField('btlInputs.monthlyRent', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            </IGrid>
          </Sec>
        )}

        {/* HMO */}
        {activeTile === 'hmo' && (
          <Sec title="HMO — room breakdown">
            <IGrid>
              <IField label="Rooms" value={String((form.hmoInputs as Record<string,unknown>)?.rooms || '')} onChange={v => setField('hmoInputs.rooms', parseInt(v) || 0)} required />
              <IField label="Rent per room / mo" value={Number((form.hmoInputs as Record<string,unknown>)?.rentPerRoom) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).rentPerRoom)) : ''} onChange={v => setField('hmoInputs.rentPerRoom', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Occupancy rate" value={fp(Number((form.hmoInputs as Record<string,unknown>)?.occupancyRate ?? 90))} onChange={v => setField('hmoInputs.occupancyRate', parseFloat(v) || 90)} />
              <IField label="HMO licence cost" value={Number((form.hmoInputs as Record<string,unknown>)?.licenceCost) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).licenceCost)) : ''} onChange={v => setField('hmoInputs.licenceCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Bills &amp; utilities / mo" value={Number((form.hmoInputs as Record<string,unknown>)?.billsUtilities) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).billsUtilities)) : ''} onChange={v => setField('hmoInputs.billsUtilities', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
          </Sec>
        )}

        {/* SA */}
        {activeTile === 'sa' && (
          <Sec title="SA — nightly rate &amp; occupancy">
            <IGrid>
              <IField label="Avg nightly rate" value={Number((form.saInputs as Record<string,unknown>)?.nightlyRate) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).nightlyRate)) : ''} onChange={v => setField('saInputs.nightlyRate', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Target occupancy" value={fp(Number((form.saInputs as Record<string,unknown>)?.occupancyPercent ?? 75))} onChange={v => setField('saInputs.occupancyPercent', parseFloat(v) || 75)} required />
              <IField label="Platform fee %" value={fp(Number((form.saInputs as Record<string,unknown>)?.platformFeesPercent ?? 0))} onChange={v => setField('saInputs.platformFeesPercent', parseFloat(v) || 0)} />
              <IField label="Cleaning cost / stay" value={Number((form.saInputs as Record<string,unknown>)?.cleaningCostPerStay) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).cleaningCostPerStay)) : ''} onChange={v => setField('saInputs.cleaningCostPerStay', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Bills &amp; utilities / mo" value={Number((form.saInputs as Record<string,unknown>)?.billsUtilities) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).billsUtilities)) : ''} onChange={v => setField('saInputs.billsUtilities', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
          </Sec>
        )}

        {/* FLIP */}
        {activeTile === 'flip' && (
          <Sec title="FLIP — project details">
            <IGrid>
              <IField label="Purchase price" value={Number((form.sharedInputs as Record<string,unknown>)?.purchasePrice) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).purchasePrice)) : ''} onChange={v => setField('sharedInputs.purchasePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Expected sale price" value={Number((form.flipInputs as Record<string,unknown>)?.expectedSalePrice) > 0 ? fc(Number((form.flipInputs as Record<string,unknown>).expectedSalePrice)) : ''} onChange={v => setField('flipInputs.expectedSalePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Refurb cost" value={Number((form.sharedInputs as Record<string,unknown>)?.refurbCost) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).refurbCost)) : ''} onChange={v => setField('sharedInputs.refurbCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Contingency %" value={fp(Number((form.flipInputs as Record<string,unknown>)?.contingencyPercent ?? 10))} onChange={v => setField('flipInputs.contingencyPercent', parseFloat(v) || 10)} />
              <IField label="Project length (months)" value={String((form.flipInputs as Record<string,unknown>)?.projectLengthMonths || '')} onChange={v => setField('flipInputs.projectLengthMonths', parseInt(v) || 0)} required />
              <IField label="Holding costs / mo" value={Number((form.flipInputs as Record<string,unknown>)?.holdingCostsPerMonth) > 0 ? fc(Number((form.flipInputs as Record<string,unknown>).holdingCostsPerMonth)) : ''} onChange={v => setField('flipInputs.holdingCostsPerMonth', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Selling costs %" value={fp(Number((form.flipInputs as Record<string,unknown>)?.sellingCostsPercent ?? 2))} onChange={v => setField('flipInputs.sellingCostsPercent', parseFloat(v) || 2)} />
            </IGrid>
          </Sec>
        )}

        {/* BRRR */}
        {activeTile === 'brrr' && (
          <Sec title="BRRR — refurb &amp; refinance">
            <IGrid>
              <IField label="Post-refurb value (GDV)" value={Number((form.brrrInputs as Record<string,unknown>)?.postRefurbValue) > 0 ? fc(Number((form.brrrInputs as Record<string,unknown>).postRefurbValue)) : ''} onChange={v => setField('brrrInputs.postRefurbValue', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Target refinance LTV" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.refinancePercent ?? 75))} onChange={v => setField('brrrInputs.refinancePercent', parseFloat(v) || 75)} />
              <IField label="Refinance rate" value={Number((form.brrrInputs as Record<string,unknown>)?.newMortgageRate) > 0 ? fp(Number((form.brrrInputs as Record<string,unknown>).newMortgageRate)) : ''} onChange={v => setField('brrrInputs.newMortgageRate', parseFloat(v) || 0)} />
              <IField label="Rent post-refurb" value={Number((form.brrrInputs as Record<string,unknown>)?.monthlyRent) > 0 ? fc(Number((form.brrrInputs as Record<string,unknown>).monthlyRent)) : ''} onChange={v => setField('brrrInputs.monthlyRent', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            </IGrid>
          </Sec>
        )}

        {/* R2R */}
        {activeTile === 'r2r' && (
          <Sec title="R2R — lease details">
            <IGrid>
              <IField label="Monthly rent paid to landlord" value={Number((form.r2rInputs as Record<string,unknown>)?.monthlyRentPaid) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).monthlyRentPaid)) : ''} onChange={v => setField('r2rInputs.monthlyRentPaid', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Rooms" value={String((form.r2rInputs as Record<string,unknown>)?.rooms || '')} onChange={v => setField('r2rInputs.rooms', parseInt(v) || 0)} required />
              <IField label="Rent per room / mo" value={Number((form.r2rInputs as Record<string,unknown>)?.rentPerRoom) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).rentPerRoom)) : ''} onChange={v => setField('r2rInputs.rentPerRoom', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Occupancy rate" value={fp(Number((form.r2rInputs as Record<string,unknown>)?.occupancyRate ?? 90))} onChange={v => setField('r2rInputs.occupancyRate', parseFloat(v) || 90)} />
              <IField label="Management fee %" value={fp(Number((form.r2rInputs as Record<string,unknown>)?.managementFeesPercent ?? 0))} onChange={v => setField('r2rInputs.managementFeesPercent', parseFloat(v) || 0)} />
              <IField label="Monthly running costs" value={Number((form.r2rInputs as Record<string,unknown>)?.monthlyRunningCosts) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).monthlyRunningCosts)) : ''} onChange={v => setField('r2rInputs.monthlyRunningCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Setup costs" value={Number((form.r2rInputs as Record<string,unknown>)?.setupCosts) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).setupCosts)) : ''} onChange={v => setField('r2rInputs.setupCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Landlord deposit (months)" value={String(form.r2rLandlordDepositMonths ?? '0')} onChange={v => setField('r2rLandlordDepositMonths', parseInt(v) || 0)} />
            </IGrid>
          </Sec>
        )}

        {/* SOCIAL */}
        {activeTile === 'social' && (
          <Sec title="Social Housing — guaranteed lease">
            <IGrid>
              <IField label="Monthly lease income" value={Number((form.socialInputs as Record<string,unknown>)?.leaseIncomePerMonth) > 0 ? fc(Number((form.socialInputs as Record<string,unknown>).leaseIncomePerMonth)) : ''} onChange={v => setField('socialInputs.leaseIncomePerMonth', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Lease term (years)" value={String((form.socialInputs as Record<string,unknown>)?.leaseLengthYears || 5)} onChange={v => setField('socialInputs.leaseLengthYears', parseInt(v) || 5)} />
            </IGrid>
          </Sec>
        )}

      </div>

      {/* Sidebar */}
      <div style={{ position: 'sticky', top: `${56 + 48 + 44 + 42 + 20}px` }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>Quick summary</div>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: TEXT_2 }}>
            <div><strong style={{ color: TEXT_1 }}>Strategy:</strong> {strategyLabel[p.strategy]}</div>
            {p.purchasePrice > 0 && <div><strong style={{ color: TEXT_1 }}>Purchase price:</strong> {fc(p.purchasePrice)}</div>}
            {p.marketValue > 0 && <div><strong style={{ color: TEXT_1 }}>Market value:</strong> {fc(p.marketValue)}</div>}
            {p.mortgageRate > 0 && <div><strong style={{ color: TEXT_1 }}>Mortgage rate:</strong> {fp(p.mortgageRate)}</div>}
            <div><strong style={{ color: TEXT_1 }}>Tax region:</strong> {COUNTRY_LABEL[p.taxCountry]}</div>
            {isEditing && (
              <div style={{ paddingTop: '8px', borderTop: `.5px solid #f3f4f6`, marginTop: '4px', fontSize: '10px', color: saveStatus === 'saved' ? '#065f46' : saveStatus === 'error' ? '#b91c1c' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className={`ti ${saveStatus === 'saved' ? 'ti-check' : saveStatus === 'saving' ? 'ti-loader' : saveStatus === 'error' ? 'ti-alert-circle' : 'ti-cloud'}`} style={{ fontSize: '10px' }} />
                {saveStatus === 'saved' ? 'Autosaved' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Ready'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </InputsCtx.Provider>
  )
}

// ── VIEW: Sensitivity ─────────────────────────────────────────────────────────
function ViewSensitivity({ p, base, stressRentDown, stressRateUp, stressCombined, stressCostsUp }: {
  p: ParsedInputs
  base: CalcResult
  stressRentDown: CalcResult
  stressRateUp: CalcResult
  stressCombined: CalcResult
  stressCostsUp: CalcResult
}) {
  const supportsStress = p.strategy === 'BTL' || p.strategy === 'HMO' || p.strategy === 'SA' || p.strategy === 'BRRR' || p.strategy === 'SOCIAL'
  const isIncomplete = base.score === 'Incomplete'

  if (!supportsStress || isIncomplete) {
    return (
      <div style={{ background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '40px 24px', textAlign: 'center' }}>
        <i className="ti ti-adjustments-horizontal" style={{ fontSize: '28px', color: DS_BORDER, display: 'block', marginBottom: '10px' }} />
        <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1, marginBottom: '4px' }}>No sensitivity data yet</div>
        <div style={{ fontSize: '11px', color: TEXT_2 }}>Add deal figures in the Inputs tab to run sensitivity analysis.</div>
      </div>
    )
  }

  const scenarios = [
    { label: 'Base case', sub: 'Your numbers as entered', result: base, isBase: true },
    { label: 'Rent −10%', sub: 'Income falls 10% — voids, market drop', result: stressRentDown, isBase: false },
    { label: 'Rate +1.5%', sub: 'Mortgage rate increases by 1.5 pts', result: stressRateUp, isBase: false },
    { label: 'Costs +50% / +15%', sub: 'Maintenance ×1.5, insurance ×1.15', result: stressCostsUp, isBase: false },
    { label: 'Combined stress', sub: 'All pressures at once', result: stressCombined, isBase: false },
  ]

  function getVerdict(r: CalcResult): { label: string; color: string } {
    if (r.monthlyCashFlow > 100 && r.cashOnCashROI >= 5) return { label: 'Recommended', color: '#065f46' }
    if (r.monthlyCashFlow >= 0 && r.cashOnCashROI >= 2) return { label: 'Review', color: '#92400e' }
    return { label: 'Avoid', color: '#b91c1c' }
  }

  // Current delta strip
  const rentDown = stressRentDown.monthlyCashFlow - base.monthlyCashFlow
  const rateUp   = stressRateUp.monthlyCashFlow  - base.monthlyCashFlow
  const combined = stressCombined.monthlyCashFlow - base.monthlyCashFlow

  function delta(v: number) {
    const col = v >= 0 ? '#065f46' : '#b91c1c'
    return <span style={{ color: col, fontWeight: 700 }}>{signedFc(v)}</span>
  }

  return (
    <div>
      {/* Delta strip */}
      <div style={{ display: 'flex', background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ flex: 1, padding: '14px 16px', borderRight: `.5px solid ${DS_BORDER}` }}>
          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '4px' }}>Base monthly CF</div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: TEXT_1 }}>{signedFc(base.monthlyCashFlow)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '2px' }}>{fp(base.cashOnCashROI)} CoC ROI</div>
        </div>
        <div style={{ flex: 1, padding: '14px 16px', borderRight: `.5px solid ${DS_BORDER}` }}>
          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '4px' }}>If rent falls 10%</div>
          <div style={{ fontSize: '17px', fontWeight: 700 }}>{delta(rentDown)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '2px' }}>change vs base</div>
        </div>
        <div style={{ flex: 1, padding: '14px 16px', borderRight: `.5px solid ${DS_BORDER}` }}>
          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '4px' }}>If rate rises 1.5%</div>
          <div style={{ fontSize: '17px', fontWeight: 700 }}>{delta(rateUp)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '2px' }}>change vs base</div>
        </div>
        <div style={{ flex: 1, padding: '14px 16px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginBottom: '4px' }}>Combined stress</div>
          <div style={{ fontSize: '17px', fontWeight: 700 }}>{delta(combined)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '2px' }}>all pressures</div>
        </div>
      </div>

      {/* Scenario table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, overflow: 'hidden', marginBottom: '10px' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', background: BG_SEC, borderBottom: `.5px solid ${DS_BORDER}` }}>
          {['Scenario', 'Monthly CF', 'CoC ROI', 'Gross yield', 'Verdict'].map(h => (
            <div key={h} style={{ padding: '9px 12px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-2)' }}>{h}</div>
          ))}
        </div>
        {scenarios.map((sc) => {
          const v = getVerdict(sc.result)
          const cfDelta = sc.isBase ? 0 : sc.result.monthlyCashFlow - base.monthlyCashFlow
          return (
            <div key={sc.label} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', borderBottom: `.5px solid #f3f4f6`, background: sc.isBase ? NAVY_LIGHT : '#fff' }}>
              <div style={{ padding: '11px 12px', fontSize: '11px' }}>
                <div style={{ fontWeight: 600, color: TEXT_1 }}>{sc.label}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-2)' }}>{sc.sub}</div>
              </div>
              <div style={{ padding: '11px 12px', fontSize: '11px', fontWeight: 600, color: sc.result.monthlyCashFlow >= 0 ? '#065f46' : '#b91c1c' }}>
                {signedFc(sc.result.monthlyCashFlow)}
                {!sc.isBase && <div style={{ fontSize: '9px', color: cfDelta >= 0 ? 'var(--text-2)' : '#b91c1c', fontWeight: 400 }}>{cfDelta >= 0 ? '+' : ''}{signedFc(cfDelta)}</div>}
              </div>
              <div style={{ padding: '11px 12px', fontSize: '11px', color: TEXT_1 }}>{fp(isFinite(sc.result.cashOnCashROI) ? sc.result.cashOnCashROI : 0)}</div>
              <div style={{ padding: '11px 12px', fontSize: '11px', color: TEXT_1 }}>{fp(sc.result.grossYield)}</div>
              <div style={{ padding: '11px 12px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', display: 'inline-block', background: v.label === 'Recommended' ? TEAL_LIGHT : v.label === 'Review' ? '#fef3c7' : '#fee2e2', color: v.color }}>
                  {v.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ background: NAVY_LIGHT, border: `.5px solid rgba(27,58,107,.15)`, borderRadius: '12px', padding: '14px 16px', fontSize: '11px', color: TEXT_2, lineHeight: 1.6 }}>
        <strong style={{ color: TEXT_1 }}>How to read this:</strong> Each row shows the deal under a different stress scenario. If the verdict stays Recommended or Review, the deal has a meaningful buffer. If it tips to Avoid under mild stress, that's a risk to flag.
      </div>
    </div>
  )
}

// ── VIEW: Workings ────────────────────────────────────────────────────────────
function ViewWorkings({ p, base, composite }: { p: ParsedInputs; base: CalcResult; composite: DealScoreResult | null }) {
  const tax = p.taxOverrideActive
    ? p.manualTaxValue
    : calculatePropertyTax(p.purchasePrice, p.taxCountry, p.buyerType)
  const taxLabel = TAX_LABEL[p.taxCountry] ?? 'Tax'
  const isFlip = p.strategy === 'FLIP'
  const isR2R  = p.strategy === 'R2R'
  const isBRRR = p.strategy === 'BRRR'

  const deposit = p.purchasePrice * (p.depositPercent / 100)
  const loanAmount = p.purchasePrice - deposit
  const monthlyMortgage = base.monthlyMortgagePayment ?? 0

  const refurbAdj = isFlip ? p.refurbCost * (1 + p.flipContingencyPercent / 100) : p.refurbCost

  // Context strip values
  const ctxItems = [
    { label: 'Strategy', value: p.strategy },
    { label: 'Purchase price', value: p.purchasePrice > 0 ? fc(p.purchasePrice) : '—' },
    { label: 'Monthly CF', value: signedFc(base.monthlyCashFlow) },
    ...(base.grossYield > 0 ? [{ label: 'Gross yield', value: fp(base.grossYield) }] : []),
    { label: 'Deal score', value: composite ? `${composite.score}/100` : '—' },
  ]

  return (
    <div>
      {/* Context strip */}
      <div style={{ display: 'flex', background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflowX: 'auto', marginBottom: '10px' }}>
        {ctxItems.map((item, i) => (
          <div key={item.label} style={{ flex: 1, padding: '12px 16px', borderRight: i < ctxItems.length - 1 ? `.5px solid ${DS_BORDER}` : 'none', minWidth: '90px' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-2)', marginBottom: '3px' }}>{item.label}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: TEXT_1 }}>{item.value}</div>
          </div>
        ))}
        {composite && (
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <VerdictPill v={composite.verdict} />
          </div>
        )}
      </div>

      {/* Accordions */}
      {!isR2R && !isFlip && (
        <AccSection
          title="1. Purchase costs"
          summary={`Total cash to complete: ${fc(p.purchasePrice > 0 ? p.purchasePrice * (p.depositPercent / 100) + tax + refurbAdj + p.otherCosts : 0)}`}
          dotColor={NAVY}
        >
          <CalcStep label="Deposit" how={`${fp(p.depositPercent)} × ${fc(p.purchasePrice)}`} value={fc(deposit)} plus />
          <CalcStep label={taxLabel} how={`Auto-calculated · ${COUNTRY_LABEL[p.taxCountry]}`} value={fc(tax)} plus={false} />
          <CalcStep label="Refurb cost" how="Works / renovation budget" value={fc(p.refurbCost)} plus />
          <CalcStep label="Other costs" how="Legal, survey, broker fees" value={fc(p.otherCosts)} plus />
          {p.strategy === 'HMO' && p.hmoLicenceCost > 0 && <CalcStep label="HMO licence" how="Mandatory for 5+ occupants" value={fc(p.hmoLicenceCost)} plus />}
          <CalcTotal label="= Total cash invested" value={fc(base.totalCashInvested)} />
          <Insight text={`You need ${fc(base.totalCashInvested)} to get to completion. The ${taxLabel} alone is ${fc(tax)} — a significant upfront cost to factor in early.`} />
        </AccSection>
      )}

      {!isR2R && !isFlip && !isBRRR && p.mortgageRate > 0 && (
        <AccSection
          title="2. Mortgage financing"
          summary={`${fc(monthlyMortgage)}/mo · ${p.mortgageType === 'IO' ? 'interest only' : 'repayment'}`}
          dotColor={TEAL}
        >
          <CalcStep label="Purchase price" how="Starting point" value={fc(p.purchasePrice)} plus />
          <CalcStep label="Deposit" how={`${fp(p.depositPercent)} of purchase price`} value={fc(deposit)} plus={false} />
          <CalcTotal label="= Mortgage amount" value={fc(loanAmount)} />
          <div style={{ marginTop: '12px' }} />
          <CalcStep label="Monthly interest" how={`${fp(p.mortgageRate)} ÷ 12 × ${fc(loanAmount)} (${p.mortgageType === 'IO' ? 'interest only' : 'repayment'})`} value={fc(monthlyMortgage)} plus={false} />
          <Insight text={`At ${fp(p.mortgageRate)}, your monthly mortgage payment is ${fc(monthlyMortgage)}. This is your biggest recurring cost.`} />
        </AccSection>
      )}

      {isBRRR && (
        <AccSection
          title="2. BRRR cycle — refinance"
          summary={`Refinance loan: ${fc(base.refinanceLoan)} · Cash left: ${base.moneyOut ? 'Money out!' : fc(base.cashLeftInDeal)}`}
          dotColor={TEAL}
        >
          <CalcStep label="Purchase price" how="Acquisition cost" value={fc(p.purchasePrice)} plus />
          <CalcStep label={taxLabel} how="Stamp duty / land tax" value={fc(tax)} plus />
          <CalcStep label="Refurb cost" how="Renovation budget" value={fc(p.refurbCost)} plus />
          <CalcStep label="Other costs" how="Legal, broker" value={fc(p.otherCosts)} plus />
          <CalcTotal label="= Total cost in" value={fc(p.purchasePrice + tax + p.refurbCost + p.otherCosts)} />
          <div style={{ marginTop: '12px' }} />
          <CalcStep label="Post-refurb value" how="Surveyed value after works" value={fc(p.brrrPostRefurbValue)} plus />
          <CalcStep label="Refinance at" how={`${fp(p.brrrRefinancePercent)} LTV × ${fc(p.brrrPostRefurbValue)}`} value={fc(base.refinanceLoan)} plus />
          <CalcTotal label="= Cash left in deal" value={base.moneyOut ? 'Money out! 🎉' : fc(base.cashLeftInDeal)} />
          {base.equityCreated !== undefined && (
            <Insight text={`You have created ${fc(base.equityCreated)} of equity through the BRRR cycle. ${base.moneyOut ? 'You recycled all your capital — infinite ROI on paper.' : 'You have ' + fc(base.cashLeftInDeal) + ' still locked in the deal.'}`} />
          )}
        </AccSection>
      )}

      {isFlip && (
        <AccSection
          title="1. Flip — total cost calculation"
          summary={`Net profit: ${fc(base.netProfit)} · ROI: ${fp(base.roi)}`}
          dotColor={NAVY}
        >
          <CalcStep label="Purchase price" how="Acquisition cost" value={fc(p.purchasePrice)} plus />
          <CalcStep label={taxLabel} how="Stamp duty / land tax" value={fc(tax)} plus />
          <CalcStep label="Refurb + contingency" how={`${fc(p.refurbCost)} + ${fp(p.flipContingencyPercent)} contingency`} value={fc(refurbAdj)} plus />
          <CalcStep label="Other costs" how="Legal, survey, broker" value={fc(p.otherCosts)} plus />
          <CalcStep label="Holding costs" how={`${fc(p.flipHoldingCostsPerMonth)}/mo × ${p.flipProjectLengthMonths} months`} value={fc(p.flipHoldingCostsPerMonth * p.flipProjectLengthMonths)} plus />
          <CalcTotal label="= Total cost in" value={fc(base.totalCost)} />
          <div style={{ marginTop: '12px' }} />
          <CalcStep label="Expected sale price" how="GDV post-refurb" value={fc(p.flipExpectedSalePrice)} plus />
          <CalcStep label="Selling costs" how={`${fp(p.flipSellingCostsPercent)} of sale price`} value={fc(base.sellingCosts)} plus={false} />
          <CalcStep label="Total cost in" how="All costs to deliver the project" value={fc(base.totalCost)} plus={false} />
          <CalcTotal label="= Net profit" value={fc(base.netProfit)} />
          <Insight text={`Your ${fp(base.roi)} total ROI annualises to ${fp(base.annualisedROI)} over ${p.flipProjectLengthMonths} months.`} />
        </AccSection>
      )}

      {isR2R && (
        <AccSection
          title="1. R2R — income & costs"
          summary={`Monthly profit: ${signedFc(base.monthlyProfit ?? 0)}`}
          dotColor={NAVY}
        >
          <CalcStep label="Gross rental income" how={`${p.r2rRooms} rooms × ${fc(p.r2rRentPerRoom)} × ${fp(p.r2rOccupancyRate)} occupancy`} value={fc(p.r2rRooms * p.r2rRentPerRoom * (p.r2rOccupancyRate / 100))} plus />
          <CalcStep label="Rent paid to landlord" how="Your monthly outgoing" value={fc(p.r2rMonthlyRentPaid)} plus={false} />
          <CalcStep label="Running costs" how="Bills, maintenance, management" value={fc(p.r2rMonthlyRunningCosts)} plus={false} />
          <CalcTotal label="= Monthly profit" value={signedFc(base.monthlyProfit ?? 0)} />
          <Insight text={`Setup costs of ${fc(p.r2rSetupCosts + p.r2rMonthlyRentPaid * p.r2rLandlordDepositMonths)} give you ${fp(base.cashOnCashROI)} ROI. Break-even occupancy is ${fp(base.occupancyBreakEven)}.`} />
        </AccSection>
      )}

      {!isR2R && !isFlip && (
        <AccSection
          title={`${isFlip ? '2' : '3'}. Monthly income`}
          summary={`Effective income: ${fc(base.effectiveRent)}/mo after void`}
          dotColor={TEAL}
        >
          {p.strategy === 'BTL' && (
            <>
              <CalcStep label="Gross monthly rent" how="Agreed/estimated rent" value={fc(p.btlMonthlyRent)} plus />
              <CalcStep label="Void allowance" how={`${fp(p.voidAllowancePercent)} of gross rent`} value={fc((p.btlMonthlyRent * p.voidAllowancePercent) / 100)} plus={false} />
              <CalcTotal label="= Effective monthly rent" value={fc(base.effectiveRent)} />
            </>
          )}
          {p.strategy === 'HMO' && (
            <>
              <CalcStep label="Gross room income" how={`${p.hmoRooms} rooms × ${fc(p.hmoRentPerRoom)} × ${fp(p.hmoOccupancyRate)}`} value={fc(p.hmoRooms * p.hmoRentPerRoom * (p.hmoOccupancyRate / 100))} plus />
              <CalcStep label="Void allowance" how={`${fp(p.voidAllowancePercent)} of gross rent`} value={fc(p.hmoRooms * p.hmoRentPerRoom * (p.hmoOccupancyRate / 100) * p.voidAllowancePercent / 100)} plus={false} />
              <CalcTotal label="= Effective monthly rent" value={fc(base.effectiveRent)} />
            </>
          )}
          {p.strategy === 'SA' && (
            <>
              <CalcStep label="Gross nightly revenue" how={`${fc(p.saNightlyRate)} × ${fp(p.saOccupancyPercent)} × 30.4 nights`} value={fc(p.saNightlyRate * (p.saOccupancyPercent / 100) * (365 / 12))} plus />
              <CalcStep label="Platform fees" how={`${fp(p.saPlatformFeesPercent)} of gross revenue`} value={fc(p.saNightlyRate * (p.saOccupancyPercent / 100) * (365 / 12) * p.saPlatformFeesPercent / 100)} plus={false} />
              <CalcTotal label="= Net monthly revenue" value={fc(base.effectiveRent)} />
            </>
          )}
          {(p.strategy === 'SOCIAL' || p.strategy === 'BRRR') && (
            <>
              <CalcStep label="Gross monthly rent" how="Lease / rental income" value={fc(p.strategy === 'SOCIAL' ? p.socialLeaseIncomePerMonth : p.brrrMonthlyRent)} plus />
              <CalcStep label="Void allowance" how={`${fp(p.voidAllowancePercent)} of gross rent`} value={fc((p.strategy === 'SOCIAL' ? p.socialLeaseIncomePerMonth : p.brrrMonthlyRent) * p.voidAllowancePercent / 100)} plus={false} />
              <CalcTotal label="= Effective income" value={fc(base.effectiveRent)} />
            </>
          )}
        </AccSection>
      )}

      {!isR2R && !isFlip && (
        <AccSection
          title="4. Monthly operating costs"
          summary={`Total: ${fc(base.totalOperatingCosts)}/mo · Mortgage: ${fc(monthlyMortgage)}/mo`}
          dotColor={AMBER}
        >
          {monthlyMortgage > 0 && <CalcStep label="Mortgage payment" how={`${p.mortgageType === 'IO' ? 'Interest only' : 'Repayment'} · ${fp(isBRRR ? p.brrrNewMortgageRate : p.mortgageRate)}`} value={fc(monthlyMortgage)} plus={false} />}
          {(base.managementFeeAmount ?? 0) > 0 && <CalcStep label="Management fee" how={`${fp(p.managementFeePercent)} of effective rent`} value={fc(base.managementFeeAmount)} plus={false} />}
          <CalcStep label="Maintenance reserve" how="Monthly set-aside" value={fc(p.maintenanceReserve)} plus={false} />
          <CalcStep label="Buildings insurance" how="Monthly premium" value={fc(p.buildingsInsurance)} plus={false} />
          {p.serviceCharge > 0 && <CalcStep label="Service charge" how="Leasehold charge" value={fc(p.serviceCharge)} plus={false} />}
          {p.groundRentAnnual > 0 && <CalcStep label="Ground rent" how={`${fc(p.groundRentAnnual)}/yr ÷ 12`} value={fc(p.groundRentAnnual / 12)} plus={false} />}
          <CalcTotal label="= Total monthly outgoings (incl. mortgage)" value={fc((base.totalOperatingCosts ?? 0) + monthlyMortgage)} />
        </AccSection>
      )}

      {!isR2R && !isFlip && (
        <AccSection
          title="5. Monthly cash flow"
          summary={`${signedFc(base.monthlyCashFlow)}/mo · ${fp(base.cashOnCashROI)} CoC ROI`}
          dotColor={base.monthlyCashFlow >= 0 ? TEAL : '#dc2626'}
        >
          <CalcStep label="Effective income" how="Rent minus void allowance" value={fc(base.effectiveRent)} plus />
          <CalcStep label="Total operating costs" how="Management, maintenance, insurance" value={fc(base.totalOperatingCosts)} plus={false} />
          <CalcStep label="Net operating income" how="Income after operating costs" value={fc(base.netOperatingIncome)} plus={base.netOperatingIncome !== undefined && base.netOperatingIncome >= 0} />
          {monthlyMortgage > 0 && <CalcStep label="Mortgage payment" how="Monthly debt service" value={fc(monthlyMortgage)} plus={false} />}
          <CalcTotal label="= Monthly cash flow" value={signedFc(base.monthlyCashFlow)} />
          <Insight text={`Annualised, that's ${signedFc(base.monthlyCashFlow * 12)}/yr. On ${fc(base.totalCashInvested)} invested, that's ${fp(base.cashOnCashROI)} cash-on-cash ROI.`} />
        </AccSection>
      )}

      {composite && (
        <AccSection
          title="6. Deal score calculation"
          summary={`${composite.score}/100 · ${composite.verdict}`}
          dotColor={composite.verdict === 'RECOMMENDED' ? TEAL : composite.verdict === 'REVIEW' ? AMBER : '#dc2626'}
        >
          {composite.dimensions.map(d => (
            <div key={d.label} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, color: TEXT_1 }}>{d.label}</span>
                <span style={{ color: TEXT_2 }}>{d.points} / {d.maxPoints} pts</span>
              </div>
              <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden', marginBottom: '2px' }}>
                <div style={{ height: '100%', background: TEAL, borderRadius: '3px', width: `${(d.points / d.maxPoints) * 100}%` }} />
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-2)' }}>
                Strong: {d.strongThreshold} · Average: {d.averageThreshold}
              </div>
            </div>
          ))}
          <CalcTotal label="= Total score" value={`${composite.score} / 100 → ${composite.verdict}`} />
          <Insight text={`Scores ≥ 65 = RECOMMENDED · 40–64 = REVIEW · < 40 = AVOID. Your score of ${composite.score} puts this deal in the ${composite.verdict} zone.`} />
        </AccSection>
      )}
    </div>
  )
}

// ── Main AnalysisHub component ────────────────────────────────────────────────
export default function AnalysisHub({
  deal,
  activeView: externalView,
  onViewChange,
  onSave,
}: {
  deal: Deal
  activeView?: SubView
  onViewChange?: (v: SubView) => void
  onSave?: (updated: Deal) => void
}) {
  const [searchParams] = useSearchParams()
  const viewParam = searchParams.get('view')
  const [localView, setLocalView] = useState<SubView>(
    (viewParam === 'inputs' || viewParam === 'results' || viewParam === 'sensitivity' || viewParam === 'workings')
      ? viewParam
      : 'results'
  )
  const activeView: SubView = externalView ?? localView
  const [isEditingInputs, setIsEditingInputs] = useState(false)
  const [isNewDeal, setIsNewDeal] = useState(false)
  const isNewParam = new URLSearchParams(window.location.search).get('new') === '1'

  const p = useMemo(() => parseInputs(deal), [deal])

  const base = useMemo(() => runCalc(p), [p])

  const composite = useMemo(() => getCompositeScore(p, base), [p, base])

  // Sensitivity stress scenarios
  const getIncomeKey = (): Partial<ParsedInputs> => {
    if (p.strategy === 'BTL')    return { btlMonthlyRent:   p.btlMonthlyRent    * 0.9 }
    if (p.strategy === 'HMO')    return { hmoRentPerRoom:   p.hmoRentPerRoom    * 0.9 }
    if (p.strategy === 'SA')     return { saNightlyRate:    p.saNightlyRate     * 0.9 }
    if (p.strategy === 'BRRR')   return { brrrMonthlyRent:  p.brrrMonthlyRent   * 0.9 }
    if (p.strategy === 'SOCIAL') return { socialLeaseIncomePerMonth: p.socialLeaseIncomePerMonth * 0.9 }
    return {}
  }
  const getRateKey = (): Partial<ParsedInputs> => {
    if (p.strategy === 'BRRR') return { brrrNewMortgageRate: p.brrrNewMortgageRate + 1.5 }
    return { mortgageRate: p.mortgageRate + 1.5 }
  }
  const getCostsKey = (): Partial<ParsedInputs> => ({
    maintenanceReserve: p.maintenanceReserve * 1.5,
    buildingsInsurance: p.buildingsInsurance * 1.15,
  })

  const stressRentDown  = useMemo(() => runCalc(p, getIncomeKey()), [p])
  const stressRateUp    = useMemo(() => runCalc(p, getRateKey()), [p])
  const stressCostsUp   = useMemo(() => runCalc(p, getCostsKey()), [p])
  const stressCombined  = useMemo(() => runCalc(p, { ...getIncomeKey(), ...getRateKey(), ...getCostsKey() }), [p])

  useEffect(() => {
    if (viewParam === 'inputs' || viewParam === 'results' || viewParam === 'sensitivity' || viewParam === 'workings') {
      setLocalView(viewParam)
    }
  }, [viewParam])

  useEffect(() => {
    if (isNewParam && activeView === 'inputs') {
      setIsEditingInputs(true)
      setIsNewDeal(true)
    }
  }, [activeView])

  return (
    <div className="ds-content">

      {/* ── Explainer card ─────────────────────────────────────────────────── */}
      <div className="exp-card">
        <button
          className="exp-dismiss"
          title="Dismiss guide"
          onClick={e => {
            const wrap = e.currentTarget.closest<HTMLElement>('.ds-content')
            if (!wrap) return
            const card = wrap.querySelector<HTMLElement>('.exp-card')
            const restore = wrap.querySelector<HTMLElement>('.exp-restore')
            if (card) card.style.display = 'none'
            if (restore) restore.classList.add('show')
          }}
        >×</button>
        <div className="exp-icon"><i className="ti ti-chart-line"></i></div>
        <div>
          <div className="exp-title">Four lenses on the same numbers — switch without losing your place</div>
          <div className="exp-text">
            Tweak an input, check the result, stress-test it, then check the workings if something looks off —
            all on one screen, with the same chrome and sidebar throughout.{' '}
            <strong>Results</strong> opens by default since that's usually what you came here to see; flip to{' '}
            <strong>Inputs</strong> to adjust the deal, <strong>Sensitivity</strong> to stress-test it, or{' '}
            <strong>Workings</strong> to see exactly how every number was calculated.
          </div>
        </div>
      </div>

      <button
        className="exp-restore"
        onClick={e => {
          const wrap = e.currentTarget.closest<HTMLElement>('.ds-content')
          if (!wrap) return
          const card = wrap.querySelector<HTMLElement>('.exp-card')
          const btn = e.currentTarget
          if (card) card.style.display = ''
          btn.classList.remove('show')
        }}
      >
        <i className="ti ti-book-2" style={{ fontSize: '11px' }}></i> Page guide
      </button>

      {/* ── Sub-nav ────────────────────────────────────────────────────────── */}
      <SubNav active={activeView} onChange={(v) => { setLocalView(v); onViewChange?.(v) }} />

      {/* ── Views ─────────────────────────────────────────────────────────── */}
      {activeView === 'results' && (
        <ViewResults
          p={p}
          base={base}
          composite={composite}
          stressRentDown={stressRentDown}
          stressRateUp={stressRateUp}
          stressCombined={stressCombined}
        />
      )}

      {activeView === 'inputs' && (
        <ViewInputs p={p} isNewDeal={isNewDeal} dealId={deal.id} onSave={onSave} />
      )}

      {activeView === 'sensitivity' && (
        <ViewSensitivity
          p={p}
          base={base}
          stressRentDown={stressRentDown}
          stressRateUp={stressRateUp}
          stressCombined={stressCombined}
          stressCostsUp={stressCostsUp}
        />
      )}

      {activeView === 'workings' && (
        <ViewWorkings p={p} base={base} composite={composite} />
      )}

    </div>
  )
}
