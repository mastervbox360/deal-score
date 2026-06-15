import { useMemo, useState, useEffect, useRef, createContext, useContext } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  calculateBTL, calculateHMO, calculateFlip, calculateSA,
  calculateBRRR, calculateR2R, calculateSocialHousing,
  calculatePropertyTax, calculateDealScore,
  TAX_LABEL, COUNTRY_LABEL,
  type Country, type BuyerType, type DealType, type DealScoreResult, type MortgageType,
} from '@/lib/calculations'
import { type SerializedInputs } from '@/lib/inputsSerializer'
import { type Deal } from '@/lib/database.types'
import { updateDealInputs } from '@/lib/dealService'
import { supabase } from '../lib/supabase'

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
  // Purchase finance (Prompt 7+)
  purchaseFinanceMethod: string
  isCashBuyer: boolean
  bridgingRateMonthly: number
  bridgingTermMonths: number
  bridgingLTV: number
  bridgingArrangementFeePercent: number
  bridgingExitFeePercent: number
  // A1: Purchase cost breakdown
  solicitorFee: number
  surveyCost: number
  brokerFee: number
  sourcingFeePaid: number
  mortgageArrangementFee: number
  // Auction
  isAuctionPurchase: boolean
  auctionBuyersPremiumPercent: number
  auctionReservationFee: number
  // Leasehold extras
  leaseExtensionCost: number
  epcImprovementCost: number
  // A8: New shared monthly costs
  landlordInsuranceMonthly: number
  rentGuaranteeInsurance: number
  legalExpensesInsurance: number
  annualComplianceCosts: number
  councilTaxVoids: number
  // FLIP (A6)
  flipPlanningCost: number
  flipPurchaseFinanceMethod: string
  flipBridgingRate: number
  flipBridgingTermMonths: number
  flipBridgingLTV: number
  flipBridgingArrangementFee: number
  flipBridgingExitFee: number
  // BRRR (A3)
  brrrPurchaseBridgingRate: number
  brrrPurchaseBridgingTermMonths: number
  brrrPurchaseBridgingLTV: number
  brrrPurchaseBridgingArrangementFee: number
  brrrPurchaseBridgingExitFee: number
  brrrRefinanceMortgageType: string
  brrrRefinanceMortgageTerm: number
  brrrRefinanceArrangementFeePercent: number
  // SA (A4/A5)
  saAvgStayLengthNights: number
  saLinenCostPerStay: number
  saConsumablesMonthly: number
  saCouncilTaxMonthly: number
  saChannelManagerMonthly: number
  saFurnishingSetupCost: number
  // HMO extras
  hmoCouncilTaxMonthly: number
  hmoFireComplianceCost: number
  // BTL (A10)
  btlInitialVoidWeeks: number
  // R2R (A9)
  r2rLeaseLengthMonths: number
  r2rRightToSubletConfirmed: boolean
  r2rLandlordMortgageConsentObtained: boolean
  // Ownership/tax (B2/B3)
  ownershipStructure: string
  incomeTaxBand: string
  askingPrice: number
  // Risk flag inputs (C)
  epcRating: string
  constructionType: string
  floodRisk: string
  listedStatus: string
  groundRentReviewClause: string
  hmoArticle4Area: boolean
  saLicenceRequired: boolean
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
    serviceCharge:        n(inp.serviceChargeMonthly ?? inp.serviceCharge),
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
    // Purchase finance
    purchaseFinanceMethod: s(inp.purchaseFinanceMethod, 'Mortgage'),
    isCashBuyer: String(inp.isCashBuyer) === 'Yes',
    bridgingRateMonthly: n(inp.bridgingRateMonthly ?? inp.bridgingRate),
    bridgingTermMonths: n(inp.bridgingTermMonths),
    bridgingLTV: n(inp.bridgingLTV, 70),
    bridgingArrangementFeePercent: n(inp.bridgingArrangementFeePercent, 2),
    bridgingExitFeePercent: n(inp.bridgingExitFeePercent),
    // A1: Purchase cost breakdown
    solicitorFee: n(inp.solicitorFee),
    surveyCost: n(inp.surveyCost),
    brokerFee: n(inp.brokerFee),
    sourcingFeePaid: n(inp.sourcingFeePaid),
    mortgageArrangementFee: n(inp.mortgageArrangementFee),
    // Auction
    isAuctionPurchase: !!inp.isAuctionPurchase,
    auctionBuyersPremiumPercent: n(inp.auctionBuyersPremiumPercent),
    auctionReservationFee: n(inp.auctionReservationFee),
    // Leasehold extras
    leaseExtensionCost: n(inp.leaseExtensionCost),
    epcImprovementCost: n(inp.epcImprovementCost),
    // A8: New shared monthly costs
    landlordInsuranceMonthly: n(inp.landlordInsuranceMonthly),
    rentGuaranteeInsurance: n(inp.rentGuaranteeInsurance),
    legalExpensesInsurance: n(inp.legalExpensesInsurance),
    annualComplianceCosts: n(inp.annualComplianceCosts),
    councilTaxVoids: n(inp.councilTaxVoids),
    // FLIP (A6)
    flipPlanningCost: n(flip.planningCost),
    flipPurchaseFinanceMethod: s(inp.flipPurchaseFinanceMethod, 'Cash'),
    flipBridgingRate: n(flip.bridgingRate),
    flipBridgingTermMonths: n(flip.bridgingTermMonths),
    flipBridgingLTV: n(flip.bridgingLTV, 70),
    flipBridgingArrangementFee: n(flip.bridgingArrangementFee, 2),
    flipBridgingExitFee: n(flip.bridgingExitFee),
    // BRRR (A3)
    brrrPurchaseBridgingRate: n(brrr.purchaseBridgingRate),
    brrrPurchaseBridgingTermMonths: n(brrr.purchaseBridgingTermMonths),
    brrrPurchaseBridgingLTV: n(brrr.purchaseBridgingLTV, 70),
    brrrPurchaseBridgingArrangementFee: n(brrr.purchaseBridgingArrangementFee, 2),
    brrrPurchaseBridgingExitFee: n(brrr.purchaseBridgingExitFee),
    brrrRefinanceMortgageType: s(brrr.refinanceMortgageType, 'IO'),
    brrrRefinanceMortgageTerm: n(brrr.refinanceMortgageTerm, 25),
    brrrRefinanceArrangementFeePercent: n(brrr.refinanceArrangementFeePercent, 1),
    // SA (A4/A5)
    saAvgStayLengthNights: n(sa.avgStayLengthNights, 3),
    saLinenCostPerStay: n(sa.linenCostPerStay),
    saConsumablesMonthly: n(sa.consumablesMonthly),
    saCouncilTaxMonthly: n(sa.councilTaxMonthly),
    saChannelManagerMonthly: n(sa.channelManagerMonthly),
    saFurnishingSetupCost: n(sa.furnishingSetupCost),
    // HMO extras
    hmoCouncilTaxMonthly: n(hmo.councilTaxMonthly),
    hmoFireComplianceCost: n(hmo.fireComplianceCost),
    // BTL (A10)
    btlInitialVoidWeeks: n(btl.initialVoidWeeks, 4),
    // R2R (A9)
    r2rLeaseLengthMonths: n(r2r.leaseLengthMonths),
    r2rRightToSubletConfirmed: !!r2r.rightToSubletConfirmed,
    r2rLandlordMortgageConsentObtained: !!r2r.landlordMortgageConsentObtained,
    // Ownership/tax (B2/B3)
    ownershipStructure: s(inp.ownershipStructure, 'Personal name'),
    incomeTaxBand: s(inp.incomeTaxBand, '40%'),
    askingPrice: n(inp.askingPrice),
    // Risk flag inputs (C)
    epcRating: s(inp.epcRating),
    constructionType: s(inp.constructionType),
    floodRisk: s(inp.floodRisk),
    listedStatus: s(inp.listedStatus, 'None'),
    groundRentReviewClause: s(inp.groundRentReviewClause),
    hmoArticle4Area: !!hmo.article4Area,
    saLicenceRequired: !!sa.licenceRequired,
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
  // Analysis extras (Prompt 9)
  bmvPercent?: number
  icrMultiplier?: number
  icrRequirement?: number
  passesICR?: boolean
  netProfitAfterTax?: number
  effectiveTaxRate?: number
  riskFlags?: Record<string, boolean>
  totalBridgingCost?: number
  extraUpfrontCosts?: number
}

function computeBridgingCost(
  purchasePrice: number,
  rateMonthly: number,
  termMonths: number,
  ltv: number,
  arrangementFeePercent: number,
  exitFeePercent: number,
): number {
  if (rateMonthly <= 0 || termMonths <= 0 || ltv <= 0) return 0
  const loanAmount = purchasePrice * (ltv / 100)
  const interestCost = loanAmount * (rateMonthly / 100) * termMonths
  const arrangementCost = loanAmount * (arrangementFeePercent / 100)
  const exitCost = loanAmount * (exitFeePercent / 100)
  return interestCost + arrangementCost + exitCost
}

function runCalc(p: ParsedInputs, overrides?: Partial<ParsedInputs>): CalcResult {
  const pp = overrides ? { ...p, ...overrides } : p
  const tax = pp.taxOverrideActive
    ? pp.manualTaxValue
    : calculatePropertyTax(pp.purchasePrice, pp.taxCountry, pp.buyerType)

  // A1: Extra upfront one-off costs
  const auctionCosts = pp.isAuctionPurchase
    ? pp.purchasePrice * (pp.auctionBuyersPremiumPercent / 100) + pp.auctionReservationFee
    : 0
  const leaseholdExtCost = pp.tenure === 'Leasehold' ? pp.leaseExtensionCost : 0
  const extraUpfrontCosts =
    pp.solicitorFee + pp.surveyCost + pp.brokerFee + pp.sourcingFeePaid +
    pp.mortgageArrangementFee + auctionCosts + leaseholdExtCost + pp.epcImprovementCost

  // A8: Additional monthly costs shared across buy strategies
  const additionalMonthlyCosts =
    pp.landlordInsuranceMonthly + pp.rentGuaranteeInsurance +
    pp.legalExpensesInsurance / 12 + pp.annualComplianceCosts / 12 + pp.councilTaxVoids

  const costInputs = {
    managementFeePercent: pp.managementFeePercent,
    voidAllowancePercent: pp.voidAllowancePercent,
    maintenanceReserve:   pp.maintenanceReserve,
    buildingsInsurance:   pp.buildingsInsurance,
    serviceCharge:        pp.serviceCharge,
    groundRentAnnual:     pp.groundRentAnnual,
    additionalMonthlyCosts,
  }
  const baseShared = {
    purchasePrice: pp.purchasePrice,
    refurbCost:    pp.refurbCost,
    otherCosts:    pp.otherCosts,
    stampDuty:     tax,
  }

  // A2: Purchase bridging cost (BTL/HMO/SA/SOCIAL when purchaseFinanceMethod = 'Bridging')
  const purchaseBridgingCost = pp.purchaseFinanceMethod === 'Bridging'
    ? computeBridgingCost(pp.purchasePrice, pp.bridgingRateMonthly, pp.bridgingTermMonths, pp.bridgingLTV, pp.bridgingArrangementFeePercent, pp.bridgingExitFeePercent)
    : 0

  // B1: BMV%
  const bmvPercent = pp.askingPrice > 0 && pp.purchasePrice > 0
    ? ((pp.askingPrice - pp.purchasePrice) / pp.askingPrice) * 100
    : 0

  // C: Base risk flags (strategy-specific overrides applied per block below)
  const baseRiskFlags: Record<string, boolean> = {
    doubling_ground_rent:        pp.groundRentReviewClause === 'Doubling',
    non_standard_construction:   !!(pp.constructionType) && pp.constructionType !== 'Standard (brick/block)',
    epc_below_c:                 ['D', 'E', 'F', 'G'].includes((pp.epcRating ?? '').toUpperCase()),
    article_4_area:              pp.hmoArticle4Area,
    flood_risk_high:             pp.floodRisk === 'High',
    listed_building:             !!(pp.listedStatus) && pp.listedStatus !== 'None',
    r2r_no_sublet_right:         false,
    r2r_no_mortgage_consent:     false,
    sa_licence_required:         pp.saLicenceRequired,
    fails_icr:                   false,
  }

  if (pp.strategy === 'BTL') {
    const isCash = pp.purchaseFinanceMethod === 'Cash' || pp.btlPurchaseFinancingMethod === 'cash' || pp.isCashBuyer
    const r = calculateBTL({
      ...baseShared,
      depositPercent: isCash ? 100 : pp.depositPercent,
      mortgageRate:   isCash ? 0   : pp.mortgageRate,
      mortgageTerm:   pp.mortgageTerm,
      mortgageType:   pp.mortgageType,
      monthlyRent:    pp.btlMonthlyRent,
      ...costInputs,
    })
    // A10: Initial void cost — mortgage interest during vacant setup period
    const initialVoidCost = isCash ? 0 : (pp.btlInitialVoidWeeks / 4) * r.monthlyMortgageInterest
    const totalCashInvested = r.totalCashInvested + extraUpfrontCosts + purchaseBridgingCost + initialVoidCost

    // B2: ICR stress test
    const depositPct = isCash ? 100 : pp.depositPercent
    const mortgageLoan = pp.purchasePrice * (1 - depositPct / 100)
    const monthlyStress = mortgageLoan * (0.055 / 12)
    const icrMultiplier = monthlyStress > 0 ? pp.btlMonthlyRent / monthlyStress : 0
    const icrRequirement = pp.ownershipStructure === 'Ltd company' ? 1.25 : 1.45
    const passesICR = isCash || icrMultiplier >= icrRequirement

    // B3: Section 24 net profit after tax (personal ownership, mortgaged)
    let netProfitAfterTax: number | undefined
    let effectiveTaxRate: number | undefined
    if (pp.ownershipStructure === 'Personal name' && !isCash && pp.mortgageRate > 0) {
      const annualMortgageInterest = mortgageLoan * (pp.mortgageRate / 100)
      const section24TaxCredit = annualMortgageInterest * 0.20
      const annualRentalIncome = pp.btlMonthlyRent * 12
      const annualOpCosts = r.totalOperatingCosts * 12
      const annualMortgageCost = r.monthlyMortgageInterest * 12
      const taxableProfit = annualRentalIncome - annualOpCosts
      const incomeTaxRate = pp.incomeTaxBand === '45%' ? 0.45 : pp.incomeTaxBand === '40%' ? 0.40 : 0.20
      const taxLiability = Math.max(0, taxableProfit * incomeTaxRate - section24TaxCredit)
      netProfitAfterTax = annualRentalIncome - annualOpCosts - annualMortgageCost - taxLiability
      effectiveTaxRate = annualRentalIncome > 0 ? (taxLiability / annualRentalIncome) * 100 : 0
    }

    return {
      ...r,
      totalCashInvested,
      monthlyMortgagePayment: r.monthlyMortgageInterest,
      bmvPercent,
      icrMultiplier,
      icrRequirement,
      passesICR,
      netProfitAfterTax,
      effectiveTaxRate,
      riskFlags: { ...baseRiskFlags, fails_icr: !passesICR },
      totalBridgingCost: purchaseBridgingCost,
      extraUpfrontCosts,
    }
  }

  if (pp.strategy === 'HMO') {
    const isCash = pp.purchaseFinanceMethod === 'Cash' || pp.hmoPurchaseFinancingMethod === 'cash' || pp.isCashBuyer
    const r = calculateHMO({
      ...baseShared,
      otherCosts:        baseShared.otherCosts + pp.hmoLicenceCost + pp.hmoFireComplianceCost,
      depositPercent:    isCash ? 100 : pp.depositPercent,
      mortgageRate:      isCash ? 0   : pp.mortgageRate,
      mortgageTerm:      pp.mortgageTerm,
      mortgageType:      pp.mortgageType,
      rooms:             pp.hmoRooms,
      rentPerRoom:       pp.hmoRentPerRoom,
      occupancyRate:     pp.hmoOccupancyRate,
      billsUtilities:    pp.hmoBillsUtilities,
      councilTaxMonthly: pp.hmoCouncilTaxMonthly,
      ...costInputs,
    })
    const totalCashInvested = r.totalCashInvested + extraUpfrontCosts + purchaseBridgingCost

    // B2: ICR
    const depositPct = isCash ? 100 : pp.depositPercent
    const mortgageLoan = pp.purchasePrice * (1 - depositPct / 100)
    const monthlyStress = mortgageLoan * (0.055 / 12)
    const grossMonthlyRent = pp.hmoRooms * pp.hmoRentPerRoom
    const icrMultiplier = monthlyStress > 0 ? grossMonthlyRent / monthlyStress : 0
    const icrRequirement = pp.ownershipStructure === 'Ltd company' ? 1.25 : 1.45
    const passesICR = isCash || icrMultiplier >= icrRequirement

    return {
      ...r,
      totalCashInvested,
      monthlyMortgagePayment: r.monthlyMortgageInterest,
      bmvPercent,
      icrMultiplier,
      icrRequirement,
      passesICR,
      riskFlags: { ...baseRiskFlags, article_4_area: pp.hmoArticle4Area, fails_icr: !passesICR },
      totalBridgingCost: purchaseBridgingCost,
      extraUpfrontCosts,
    }
  }

  if (pp.strategy === 'SA') {
    const isCash = pp.purchaseFinanceMethod === 'Cash' || pp.saPurchaseFinancingMethod === 'cash' || pp.isCashBuyer
    const r = calculateSA({
      ...baseShared,
      depositPercent:        isCash ? 100 : pp.depositPercent,
      mortgageRate:          isCash ? 0   : pp.mortgageRate,
      mortgageTerm:          pp.mortgageTerm,
      mortgageType:          pp.mortgageType,
      nightlyRate:           pp.saNightlyRate,
      occupancyPercent:      pp.saOccupancyPercent,
      platformFeesPercent:   pp.saPlatformFeesPercent,
      cleaningCostPerStay:   pp.saCleaningCostPerStay,
      billsUtilities:        pp.saBillsUtilities,
      avgStayLengthNights:   pp.saAvgStayLengthNights,
      linenCostPerStay:      pp.saLinenCostPerStay,
      consumablesMonthly:    pp.saConsumablesMonthly,
      councilTaxMonthly:     pp.saCouncilTaxMonthly,
      channelManagerMonthly: pp.saChannelManagerMonthly,
      furnishingSetupCost:   pp.saFurnishingSetupCost,
      ...costInputs,
    })
    // furnishingSetupCost is already inside r.totalCashInvested (from calculateSA)
    const totalCashInvested = r.totalCashInvested + extraUpfrontCosts + purchaseBridgingCost

    return {
      ...r,
      totalCashInvested,
      monthlyMortgagePayment: (r as { monthlyMortgage?: number }).monthlyMortgage,
      bmvPercent,
      riskFlags: { ...baseRiskFlags, sa_licence_required: pp.saLicenceRequired },
      totalBridgingCost: purchaseBridgingCost,
      extraUpfrontCosts,
    }
  }

  if (pp.strategy === 'FLIP') {
    // A6: FLIP planning cost + optional bridging cost folded into project costs
    const flipBridgingCost = pp.flipPurchaseFinanceMethod === 'Bridging'
      ? computeBridgingCost(pp.purchasePrice, pp.flipBridgingRate, pp.flipBridgingTermMonths, pp.flipBridgingLTV, pp.flipBridgingArrangementFee, pp.flipBridgingExitFee)
      : 0
    const refurbAdj = pp.refurbCost * (1 + pp.flipContingencyPercent / 100)
    const r = calculateFlip({
      purchasePrice:        pp.purchasePrice,
      refurbCost:           refurbAdj,
      otherCosts:           pp.otherCosts + pp.flipPlanningCost + extraUpfrontCosts + flipBridgingCost,
      stampDuty:            tax,
      holdingCostsPerMonth: pp.flipHoldingCostsPerMonth,
      projectLengthMonths:  pp.flipProjectLengthMonths,
      expectedSalePrice:    pp.flipExpectedSalePrice,
      sellingCostsPercent:  pp.flipSellingCostsPercent,
    })
    const monthlyCashFlow = pp.flipProjectLengthMonths > 0 ? r.netProfit / pp.flipProjectLengthMonths : 0
    return {
      monthlyCashFlow,
      annualCashFlow:    monthlyCashFlow * 12,
      cashOnCashROI:     r.roi,
      grossYield:        0,
      netYield:          0,
      totalCashInvested: r.totalCost,
      breakEvenRent:     0,
      score:             r.score,
      netProfit:         r.netProfit,
      totalCost:         r.totalCost,
      roi:               r.roi,
      annualisedROI:     r.annualisedROI,
      sellingCosts:      r.sellingCosts,
      bmvPercent,
      riskFlags:         baseRiskFlags,
      totalBridgingCost: flipBridgingCost,
      extraUpfrontCosts,
    }
  }

  if (pp.strategy === 'BRRR') {
    // A3: BRRR purchase bridging cost
    const brrrBridgingCost = pp.brrrPurchaseBridgingRate > 0
      ? computeBridgingCost(pp.purchasePrice, pp.brrrPurchaseBridgingRate, pp.brrrPurchaseBridgingTermMonths, pp.brrrPurchaseBridgingLTV, pp.brrrPurchaseBridgingArrangementFee, pp.brrrPurchaseBridgingExitFee)
      : 0
    const r = calculateBRRR({
      purchasePrice:                  pp.purchasePrice,
      refurbCost:                     pp.refurbCost,
      otherCosts:                     pp.otherCosts + extraUpfrontCosts + brrrBridgingCost,
      stampDuty:                      tax,
      postRefurbValue:                pp.brrrPostRefurbValue,
      refinancePercent:               pp.brrrRefinancePercent,
      newMortgageRate:                pp.brrrNewMortgageRate,
      refinanceMortgageType:          pp.brrrRefinanceMortgageType as MortgageType,
      refinanceMortgageTerm:          pp.brrrRefinanceMortgageTerm,
      refinanceArrangementFeePercent: pp.brrrRefinanceArrangementFeePercent,
      monthlyRent:                    pp.brrrMonthlyRent,
      ...costInputs,
    })
    return {
      monthlyCashFlow:     r.monthlyCashFlow,
      annualCashFlow:      r.annualCashFlow,
      cashOnCashROI:       r.cashOnCashROI,
      grossYield:          r.grossYield,
      netYield:            r.netYield,
      totalCashInvested:   r.cashLeftInDeal > 0 ? r.cashLeftInDeal : 0,
      breakEvenRent:       r.breakEvenRent,
      score:               r.score,
      monthlyMortgagePayment: r.monthlyMortgage,
      effectiveRent:       r.effectiveRent,
      managementFeeAmount: r.managementFeeAmount,
      totalOperatingCosts: r.totalOperatingCosts,
      netOperatingIncome:  r.netOperatingIncome,
      voidAllowanceAmount: r.voidAllowanceAmount,
      refinanceLoan:       r.refinanceLoan,
      cashLeftInDeal:      r.cashLeftInDeal,
      equityCreated:       r.equityCreated,
      moneyOut:            r.moneyOut,
      bmvPercent,
      riskFlags:           baseRiskFlags,
      totalBridgingCost:   brrrBridgingCost,
      extraUpfrontCosts,
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
      leaseLengthMonths:     pp.r2rLeaseLengthMonths,
    })
    return {
      monthlyCashFlow:   r.monthlyProfit,
      annualCashFlow:    r.monthlyProfit * 12,
      cashOnCashROI:     r.roi,
      grossYield:        r.roi,
      netYield:          r.roi,
      totalCashInvested: setupTotal,
      breakEvenRent:     0,
      score:             r.score,
      monthlyProfit:     r.monthlyProfit,
      spreadPerRoom:     r.spreadPerRoom,
      occupancyBreakEven: r.occupancyBreakEven,
      bmvPercent,
      riskFlags: {
        ...baseRiskFlags,
        r2r_no_sublet_right:     !pp.r2rRightToSubletConfirmed,
        r2r_no_mortgage_consent: !pp.r2rLandlordMortgageConsentObtained,
      },
    }
  }

  // SOCIAL
  const isSocialCash = pp.purchaseFinanceMethod === 'Cash' || pp.socialPurchaseFinancingMethod === 'cash' || pp.isCashBuyer
  const r = calculateSocialHousing({
    ...baseShared,
    depositPercent:      isSocialCash ? 100 : pp.depositPercent,
    mortgageRate:        isSocialCash ? 0   : pp.mortgageRate,
    mortgageTerm:        pp.mortgageTerm,
    mortgageType:        pp.mortgageType,
    leaseIncomePerMonth: pp.socialLeaseIncomePerMonth,
    leaseLengthYears:    pp.socialLeaseLengthYears,
    ...costInputs,
  })
  return {
    ...r,
    totalCashInvested: r.totalCashInvested + extraUpfrontCosts + purchaseBridgingCost,
    monthlyMortgagePayment: (r as { monthlyMortgage?: number }).monthlyMortgage,
    bmvPercent,
    riskFlags:         baseRiskFlags,
    totalBridgingCost: purchaseBridgingCost,
    extraUpfrontCosts,
  }
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

// ── ISelect ─────────────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 28px 7px 10px',
  fontSize: '12px',
  fontFamily: 'inherit',
  color: 'var(--text-1)',
  background: 'var(--bg-input, #fff)',
  border: '.5px solid var(--ds-border)',
  borderRadius: '7px',
  outline: 'none',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 9px center',
  backgroundSize: '11px',
  cursor: 'pointer',
  transition: 'border-color .15s',
  minHeight: '32px',
}

function ISelect({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  disabled?: boolean
  hint?: string
}) {
  const { isEditing } = useContext(InputsCtx)
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: 'var(--teal)', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={!isEditing || disabled}
          style={{
            ...selectStyle,
            opacity: (!isEditing || disabled) ? 0.6 : 1,
            cursor: (!isEditing || disabled) ? 'default' : 'pointer',
          }}
        >
          {!options.find(o => o.value === '') && <option value="">— select —</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {hint && <span style={{ fontSize: '10px', color: 'var(--text-3, #aaa)', marginTop: '2px' }}>{hint}</span>}
    </div>
  )
}

// ── ISelectOther ─────────────────────────────────────────────────────────────
function ISelectOther({
  label,
  value,
  onChange,
  options,
  required,
  otherPlaceholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  otherPlaceholder?: string
}) {
  const knownValues = options.map(o => o.value)
  const isOther = value !== '' && !knownValues.includes(value)
  const [selectVal, setSelectVal] = useState(isOther ? '__other__' : value)
  const [otherVal, setOtherVal] = useState(isOther ? value : '')
  const { isEditing } = useContext(InputsCtx)

  useEffect(() => {
    const isExtOther = value !== '' && !knownValues.includes(value)
    if (isExtOther) { setSelectVal('__other__'); setOtherVal(value) }
    else { setSelectVal(value); setOtherVal('') }
  }, [value])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: 'var(--teal)', marginLeft: '2px' }}>*</span>}
      </label>
      <select
        value={selectVal}
        onChange={e => {
          setSelectVal(e.target.value)
          if (e.target.value !== '__other__') { setOtherVal(''); onChange(e.target.value) }
        }}
        disabled={!isEditing}
        style={{ ...selectStyle, opacity: !isEditing ? 0.6 : 1, cursor: !isEditing ? 'default' : 'pointer' }}
      >
        {<option value="">— select —</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value="__other__">Other (enter manually)</option>
      </select>
      {selectVal === '__other__' && (
        <input
          type="text"
          value={otherVal}
          onChange={e => { setOtherVal(e.target.value); onChange(e.target.value) }}
          placeholder={otherPlaceholder ?? 'Enter value...'}
          disabled={!isEditing}
          style={{
            padding: '7px 10px', fontSize: '12px', fontFamily: 'inherit',
            border: '.5px solid var(--teal)', borderRadius: '7px', outline: 'none',
            color: 'var(--text-1)', background: '#fff', marginTop: '4px',
          }}
        />
      )}
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
const RISK_FLAG_META: Record<string, { label: string; severity: 'red' | 'amber' }> = {
  doubling_ground_rent:      { label: 'Doubling ground rent clause',         severity: 'red'   },
  flood_risk_high:           { label: 'Flood risk zone 2 or 3',              severity: 'red'   },
  r2r_no_sublet_right:       { label: 'R2R — no confirmed right to sublet',  severity: 'red'   },
  r2r_no_mortgage_consent:   { label: 'R2R — no mortgage consent confirmed', severity: 'red'   },
  fails_icr:                 { label: 'ICR stress test fail',                severity: 'red'   },
  non_standard_construction: { label: 'Non-standard construction',           severity: 'amber' },
  epc_below_c:               { label: 'EPC below C — MEES risk',             severity: 'amber' },
  article_4_area:            { label: 'Article 4 direction applies',         severity: 'amber' },
  listed_building:           { label: 'Listed building',                     severity: 'amber' },
  sa_licence_required:       { label: 'SA licence may be required',          severity: 'amber' },
}

interface CompsRow { address: string; date: string; price: number; type: string; tenure: string; kept: boolean }

const STRATEGY_ORDER: DealType[] = ['BTL', 'HMO', 'BRRR', 'SA', 'FLIP', 'R2R', 'SOCIAL']

function ViewResults({ p, base, composite, stressRentDown, stressRateUp, stressCombined, deal, onSave }: {
  p: ParsedInputs
  base: CalcResult
  composite: DealScoreResult | null
  stressRentDown: CalcResult
  stressRateUp: CalcResult
  stressCombined: CalcResult
  deal: Deal
  onSave?: (updated: Deal) => void
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

  // ── New state ────────────────────────────────────────────────────────────────
  const [metricsView, setMetricsView] = useState<'monthly' | 'annual'>('monthly')
  const [optimiserTarget, setOptimiserTarget] = useState<'coc' | 'cf' | 'yield' | 'netyield' | 'cashmax'>('coc')
  const [previewStrategy, setPreviewStrategy] = useState<DealType>(p.strategy)
  const [localComps, setLocalComps] = useState<CompsRow[]>(() => {
    try { return JSON.parse(((deal as unknown as Record<string, unknown>).comps as string) ?? '[]') as CompsRow[] }
    catch { return [] }
  })
  const [compsLoading, setCompsLoading] = useState(false)
  const [localCompsError, setLocalCompsError] = useState<string | null>(null)

  // ── Derived ──────────────────────────────────────────────────────────────────
  const monthlyRent =
    p.strategy === 'HMO'    ? p.hmoRooms * p.hmoRentPerRoom :
    p.strategy === 'SA'     ? p.saNightlyRate * (p.saOccupancyPercent / 100) * 30.4 :
    p.strategy === 'BRRR'   ? p.brrrMonthlyRent :
    p.strategy === 'SOCIAL' ? p.socialLeaseIncomePerMonth :
    p.strategy === 'R2R'    ? p.r2rRooms * p.r2rRentPerRoom * (p.r2rOccupancyRate / 100) :
    p.btlMonthlyRent

  const monthlyMortgage = base.monthlyMortgagePayment ?? 0
  const isCash = p.isCashBuyer || p.purchaseFinanceMethod === 'Cash'

  const activeFlags = Object.entries(base.riskFlags ?? {})
    .filter(([, v]) => v)
    .map(([k]) => RISK_FLAG_META[k])
    .filter((x): x is { label: string; severity: 'red' | 'amber' } => !!x)

  const strategyNeedsInput: Partial<Record<DealType, string>> = {
    SA:     p.saNightlyRate <= 0           ? 'Needs nightly rate'     : undefined,
    FLIP:   p.flipExpectedSalePrice <= 0   ? 'Needs GDV'             : undefined,
    BRRR:   p.brrrPostRefurbValue <= 0     ? 'Needs post-refurb val' : undefined,
    HMO:    p.hmoRooms <= 0               ? 'Needs room count'       : undefined,
    R2R:    p.r2rMonthlyRentPaid <= 0      ? 'Needs rent paid'        : undefined,
    SOCIAL: p.socialLeaseIncomePerMonth<=0 ? 'Needs lease income'     : undefined,
    BTL:    p.btlMonthlyRent <= 0          ? 'Needs monthly rent'     : undefined,
  }

  // Section 4 derived
  const rentBuffer   = monthlyRent > 0 ? monthlyRent - base.breakEvenRent : 0
  const voidWeeks    = monthlyRent > 0 ? Math.round((base.monthlyCashFlow / monthlyRent) * 52) : 0
  const paybackYears = base.totalCashInvested > 0 && base.monthlyCashFlow > 0
    ? base.totalCashInvested / (base.monthlyCashFlow * 12) : null
  const yr5Return    = base.monthlyCashFlow * 60 + Math.max(0, p.marketValue > 0 ? p.marketValue - p.purchasePrice : 0)

  // Section 7 financing
  const depositAmt      = p.purchasePrice * (p.depositPercent / 100)
  const loanAmt         = p.purchasePrice - depositAmt
  const hasBridging     = (base.totalBridgingCost ?? 0) > 0
  const bridgingLoanAmt = p.purchasePrice * (p.bridgingLTV / 100)
  const bridgingMonthlyInt = bridgingLoanAmt * (p.bridgingRateMonthly / 100)

  // Section 8 optimiser
  const targetCoCRatio  = 0.08
  const cashInvested    = base.totalCashInvested
  const maxPrice        = cashInvested > 0
    ? p.purchasePrice + (base.monthlyCashFlow * 12 / targetCoCRatio - cashInvested) * (p.depositPercent / 100)
    : p.purchasePrice
  const priceHeadroom   = maxPrice - p.purchasePrice
  const minRent         = base.breakEvenRent + (cashInvested > 0 ? cashInvested * targetCoCRatio / 12 : 0)
  const targetMet       = base.cashOnCashROI >= 8

  // ── Helpers ──────────────────────────────────────────────────────────────────
  async function doRefreshComps() {
    const pc = (deal.postcode ?? '').trim()
    if (!pc) return
    setCompsLoading(true)
    setLocalCompsError(null)
    try {
      const { data, error } = await supabase.functions.invoke('land-registry-comps', { body: { postcode: pc } })
      if (error || !data?.success) {
        setLocalCompsError(data?.error ?? 'Could not load comparables.')
      } else {
        const fetched: CompsRow[] = ((data.comps ?? []) as Array<{ date: string; price: number; address: string; type: string; tenure: string }>).map(c => ({
          ...c,
          kept: localComps.find(lc => lc.address === c.address && lc.date === c.date)?.kept ?? false,
        }))
        updateLocalComps(fetched)
      }
    } catch { setLocalCompsError('Failed to load comparables.') }
    finally   { setCompsLoading(false) }
  }

  function updateLocalComps(updated: CompsRow[]) {
    setLocalComps(updated)
    onSave?.({ ...deal, comps: JSON.stringify(updated) } as unknown as Deal)
  }

  // ── Shared style shortcuts ────────────────────────────────────────────────────
  const secLabel: React.CSSProperties = { fontSize: 11, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-2)', margin: 0 }
  const tileS: React.CSSProperties    = { background: 'var(--bg-sec)', borderRadius: 8, padding: '10px 12px' }
  const tilePrim: React.CSSProperties = { background: '#eef3fb', border: '.5px solid #b8cde8', borderRadius: 8, padding: '10px 12px' }

  function GrpHead({ label }: { label: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
        <span style={{ fontSize: 11, color: TEXT_2, fontWeight: 500 }}>{label}</span>
        <div style={{ flex: 1, height: .5, background: DS_BORDER }} />
      </div>
    )
  }

  const mul     = metricsView === 'annual' ? 12 : 1
  const cfLabel = metricsView === 'annual' ? 'Annual cash flow' : 'Monthly cash flow'
  const cfValue = metricsView === 'annual' ? fc(base.monthlyCashFlow * 12) : signedFc(base.monthlyCashFlow)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', alignItems: 'start' }}>
      <div>

        {/* ── S1: Strategy ranking ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 7, marginBottom: 6 }}>
            {STRATEGY_ORDER.map(st => {
              const isActive  = st === p.strategy
              const missing   = strategyNeedsInput[st]
              const stScore   = isActive ? numScore : null
              const stVerdict = isActive ? verdict  : null
              return (
                <div key={st} onClick={() => setPreviewStrategy(st)} style={{
                  background:  isActive ? '#eef3fb' : BG_SEC,
                  border:      isActive ? '1.5px solid var(--navy)' : previewStrategy === st ? '.5px solid var(--navy)' : `.5px solid ${DS_BORDER}`,
                  borderTop:   isActive ? '2.5px solid var(--navy)' : undefined,
                  borderRadius: 8, padding: '8px 6px', textAlign: 'center',
                  cursor: 'pointer', opacity: !isActive && !!missing ? 0.5 : 1, transition: 'all .15s',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TEXT_1, marginBottom: 2 }}>{st}</div>
                  {isActive && stScore !== null ? (
                    <>
                      <div style={{ fontSize: 16, fontWeight: 700, color: scaleColor(stVerdict), lineHeight: 1.1, marginBottom: 2 }}>{stScore}</div>
                      <VerdictPill v={stVerdict} />
                    </>
                  ) : !!missing ? (
                    <div style={{ fontSize: 9, color: TEXT_2, fontStyle: 'italic', marginTop: 2 }}>{missing}</div>
                  ) : (
                    <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_2 }}>—</div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 11, fontStyle: 'italic', color: TEXT_2 }}>
            Viewing {strategyLabel[p.strategy]} results — click any card to preview that strategy
          </div>
        </div>

        {isIncomplete ? (
          <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', marginBottom: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 14px' }}><i className="ti ti-chart-line" /></div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1, marginBottom: 6 }}>No analysis yet</div>
            <div style={{ fontSize: 12, color: TEXT_2, lineHeight: 1.6 }}>Add deal figures in the Inputs tab to calculate returns, yield, and cash flow.</div>
          </div>
        ) : (
          <>
            {/* ── S2: Verdict card ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 18, background: '#fff', borderRadius: 12, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: 18, marginBottom: 10 }}>
              <div style={{ flexShrink: 0, textAlign: 'center', paddingRight: 18, borderRight: `.5px solid ${DS_BORDER}`, minWidth: 72 }}>
                <div style={{ fontSize: 44, fontWeight: 700, color: numScore !== null ? scaleColor(verdict) : TEXT_2, lineHeight: 1 }}>{numScore ?? '—'}</div>
                <div style={{ fontSize: 11, color: TEXT_2, margin: '2px 0 8px' }}>/100</div>
                <VerdictPill v={verdict} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: verdict === 'RECOMMENDED' ? '#065f46' : TEXT_1, marginBottom: 5 }}>
                  {verdictTitle[verdict ?? 'AVOID'] ?? `${strategyLabel[p.strategy]} result`}
                </div>
                <div style={{ fontSize: 12, color: TEXT_2, lineHeight: 1.6, marginBottom: 10 }}>
                  {p.strategy === 'FLIP'
                    ? `Net profit of ${fc(base.netProfit)} on a ${fp(base.roi)} total ROI (${fp(base.annualisedROI)} annualised).`
                    : p.strategy === 'R2R'
                      ? `Monthly profit of ${signedFc(base.monthlyProfit ?? 0)} with ${fp(base.cashOnCashROI)} ROI on setup costs.`
                      : `Cash flow ${signedFc(base.monthlyCashFlow)}/mo · ${fp(base.cashOnCashROI)} CoC ROI · ${fp(base.grossYield)} gross yield.`}
                  {p.marketValue > 0 && equityDayOne > 0 && p.strategy !== 'FLIP' && p.strategy !== 'R2R' && ` ${fp(bmvPct, 0)} below MV — ${fc(equityDayOne)} day-one equity.`}
                </div>
                {composite && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px 18px' }}>
                    {composite.dimensions.map(d => (
                      <div key={d.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TEXT_2, marginBottom: 2 }}>
                          <span>{d.label}</span><span>{d.points} / {d.maxPoints} pts</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_1, marginBottom: 3 }}>
                          {d.label.toLowerCase().includes('cash flow') || d.label.toLowerCase().includes('profit') || d.label.toLowerCase().includes('cash left')
                            ? fc(d.value) : fp(d.value)}
                        </div>
                        <div style={{ height: 3, background: '#f5f6f8', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: NAVY, borderRadius: 2, width: `${Math.min(100, d.maxPoints > 0 ? (d.points / d.maxPoints) * 100 : 0)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── S3: Key metrics with toggle ──────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ padding: '10px 16px', borderBottom: `.5px solid ${DS_BORDER}`, display: 'flex', alignItems: 'center', background: BG_SEC }}>
                <span style={{ ...secLabel, flex: 1 }}>KEY METRICS</span>
                <div style={{ display: 'flex', border: `.5px solid ${DS_BORDER}`, borderRadius: 20, overflow: 'hidden' }}>
                  {(['monthly', 'annual'] as const).map(v => (
                    <button key={v} onClick={() => setMetricsView(v)} style={{ padding: '3px 10px', background: metricsView === v ? NAVY : 'transparent', color: metricsView === v ? '#fff' : TEXT_2, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 10, textTransform: 'capitalize' }}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '14px 16px' }}>
                {p.strategy === 'FLIP' ? (
                  <>
                    <GrpHead label="Returns" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      <div style={tilePrim}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Total ROI</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fp(base.roi)}</div></div>
                      <div style={tilePrim}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Annualised ROI</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fp(base.annualisedROI)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Net profit</div><div style={{ fontSize: 15, fontWeight: 700, color: '#065f46' }}>{fc(base.netProfit)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Total cost in</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fc(base.totalCost)}</div></div>
                    </div>
                  </>
                ) : p.strategy === 'R2R' ? (
                  <>
                    <GrpHead label="Returns" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      <div style={tilePrim}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Monthly profit</div><div style={{ fontSize: 15, fontWeight: 700, color: (base.monthlyProfit ?? 0) > 0 ? '#065f46' : '#dc2626' }}>{signedFc(base.monthlyProfit ?? 0)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>ROI on setup</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fp(base.cashOnCashROI)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Spread / room</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fc(base.spreadPerRoom)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Occ. break-even</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fp(base.occupancyBreakEven)}</div></div>
                    </div>
                  </>
                ) : p.strategy === 'BRRR' ? (
                  <>
                    <GrpHead label="BRRR cycle" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      <div style={tilePrim}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Refinance loan</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fc(base.refinanceLoan)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Cash left in deal</div><div style={{ fontSize: 15, fontWeight: 700, color: base.moneyOut ? '#065f46' : TEXT_1 }}>{base.moneyOut ? 'Money out!' : fc(base.cashLeftInDeal)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Equity created</div><div style={{ fontSize: 15, fontWeight: 700, color: '#065f46' }}>{fc(base.equityCreated)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>{cfLabel}</div><div style={{ fontSize: 15, fontWeight: 700, color: base.monthlyCashFlow > 0 ? '#065f46' : '#dc2626' }}>{cfValue}</div></div>
                    </div>
                  </>
                ) : (
                  <>
                    <GrpHead label="Returns" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                      <div style={tilePrim}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Cash-on-cash ROI</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fp(base.cashOnCashROI)}</div></div>
                      <div style={tilePrim}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>{cfLabel}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: base.monthlyCashFlow > 0 ? '#065f46' : '#dc2626' }}>
                          {cfValue}{metricsView === 'annual' && <span style={{ fontSize: 10, fontWeight: 400, color: TEXT_2 }}> ({signedFc(base.monthlyCashFlow)}/mo)</span>}
                        </div>
                      </div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Gross yield</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fp(base.grossYield)}</div></div>
                      <div style={tileS}><div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Net yield</div><div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fp(base.netYield)}</div></div>
                    </div>
                    <GrpHead label="Capital" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
                      <div style={tileS}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Cash invested</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fc(base.totalCashInvested)}</div>
                        <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>Deposit + costs</div>
                      </div>
                      <div style={tileS}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Purchase price</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fc(p.purchasePrice)}</div>
                        {p.marketValue > 0 && <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>{fc(p.marketValue)} market value</div>}
                      </div>
                      <div style={tileS}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>BMV discount</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: (base.bmvPercent ?? 0) > 0 ? '#065f46' : TEXT_1 }}>
                          {(base.bmvPercent ?? 0) > 0 ? fp(base.bmvPercent ?? 0, 0) : '—'}
                        </div>
                        {(base.bmvPercent ?? 0) > 0 && p.marketValue > 0 && <div style={{ fontSize: 9, color: '#065f46', marginTop: 2 }}>{fc(p.marketValue - p.purchasePrice)} below MV</div>}
                      </div>
                      <div style={tileS}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Refurb cost</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{p.refurbCost > 0 ? fc(p.refurbCost) : '—'}</div>
                        {p.refurbCost > 0 && <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>Inc. {fp(p.flipContingencyPercent, 0)} contingency</div>}
                      </div>
                    </div>
                    <GrpHead label="Income & costs" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                      <div style={tileS}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Monthly rent</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fc(monthlyRent * mul)}</div>
                        <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>{metricsView === 'monthly' ? fc(monthlyRent * 12) + ' / year' : fc(monthlyRent) + ' / month'}</div>
                      </div>
                      <div style={tileS}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Mortgage payment</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{isCash ? '—' : fc(monthlyMortgage * mul)}</div>
                        {!isCash && <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>{metricsView === 'monthly' ? fc(monthlyMortgage * 12) + ' / year' : fc(monthlyMortgage) + ' / month'}</div>}
                      </div>
                      <div style={tileS}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Operating costs</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fc((base.totalOperatingCosts ?? 0) * mul)}</div>
                        <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>{metricsView === 'monthly' ? fc((base.totalOperatingCosts ?? 0) * 12) + ' / year' : fc(base.totalOperatingCosts ?? 0) + ' / month'}</div>
                      </div>
                      <div style={tileS}>
                        <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Net {metricsView === 'annual' ? 'annual' : 'monthly'} income</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: base.monthlyCashFlow > 0 ? '#065f46' : '#dc2626' }}>{fc(base.monthlyCashFlow * mul)}</div>
                        <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>{metricsView === 'monthly' ? fc(base.monthlyCashFlow * 12) + ' / year' : fc(base.monthlyCashFlow) + ' / month'}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── S4: Break-even, payback & resilience ─────────────────────── */}
            {p.strategy !== 'FLIP' && p.strategy !== 'R2R' && (
              <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ padding: '10px 16px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
                  <span style={secLabel}>BREAK-EVEN, PAYBACK & RESILIENCE</span>
                </div>
                <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  <div style={tileS}>
                    <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Break-even rent</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{fc(base.breakEvenRent)}<span style={{ fontSize: 10, fontWeight: 400 }}>/mo</span></div>
                    <div style={{ fontSize: 9, color: rentBuffer >= 0 ? '#059669' : '#dc2626', marginTop: 2 }}>Buffer {rentBuffer >= 0 ? '+' : ''}{fc(rentBuffer)}/mo</div>
                  </div>
                  <div style={tileS}>
                    <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Void resilience</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{voidWeeks > 0 ? `${voidWeeks} weeks` : '—'}</div>
                    {voidWeeks > 0 && <div style={{ fontSize: 9, color: voidWeeks >= 13 ? '#059669' : AMBER, marginTop: 2 }}>{voidWeeks >= 13 ? '✓ Above' : '⚠ Below'} 13-wk benchmark</div>}
                  </div>
                  <div style={tileS}>
                    <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Cash payback</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT_1 }}>{paybackYears !== null ? `${paybackYears.toFixed(1)} yrs` : '—'}</div>
                    {paybackYears !== null && <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>Based on {signedFc(base.monthlyCashFlow)}/mo</div>}
                  </div>
                  <div style={tileS}>
                    <div style={{ fontSize: 10, color: TEXT_2, marginBottom: 3 }}>Total return yr 5</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#065f46' }}>{yr5Return > 0 ? fc(yr5Return) : '—'}</div>
                    {yr5Return > 0 && p.purchasePrice > 0 && <div style={{ fontSize: 9, color: TEXT_2, marginTop: 2 }}>CF + {fc(Math.max(0, p.marketValue - p.purchasePrice))} equity</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ── S5: ICR stress test + Section 24 ─────────────────────────── */}
            {(p.strategy === 'BTL' || p.strategy === 'HMO' || p.strategy === 'SA' || p.strategy === 'SOCIAL') && base.icrMultiplier != null && (
              <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ padding: '10px 16px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
                  <span style={secLabel}>ICR STRESS TEST & SECTION 24</span>
                </div>
                <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: base.passesICR ? '#f0fdf4' : '#fff1f2', border: `.5px solid ${base.passesICR ? '#6ee7b7' : '#fca5a5'}`, borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_1, marginBottom: 2 }}>ICR Stress Test</div>
                    <div style={{ fontSize: 11, color: TEXT_2, marginBottom: 10 }}>At 5.5% stressed rate</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEXT_2 }}>Multiplier</span><span style={{ fontWeight: 600 }}>{base.icrMultiplier.toFixed(2)}×</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEXT_2 }}>Required</span><span style={{ fontWeight: 600 }}>{(base.icrRequirement ?? 1.45).toFixed(2)}× ({p.ownershipStructure === 'Ltd company' ? 'Ltd co' : 'personal'})</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEXT_2 }}>Result</span><span style={{ fontWeight: 700, color: base.passesICR ? '#059669' : '#dc2626' }}>{base.passesICR ? '✅ PASS' : '❌ FAIL'}</span></div>
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_2, marginTop: 10, lineHeight: 1.5 }}>Lenders stress-test at 5.5% to check rent covers mortgage</div>
                  </div>
                  {p.ownershipStructure === 'Ltd company' ? (
                    <div style={{ background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_1, marginBottom: 2 }}>Ltd Company — Corporation Tax</div>
                      <div style={{ fontSize: 11, color: TEXT_2, marginBottom: 10 }}>25% CT on rental profit</div>
                      <div style={{ fontSize: 11, color: TEXT_2, lineHeight: 1.6 }}>
                        Est. after-CT profit: <strong style={{ color: TEXT_1 }}>{fc(base.netProfitAfterTax ?? 0)}/mo</strong> (25% CT applied).<br />Mortgage interest remains fully deductible for Ltd companies.
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fffbeb', border: '.5px solid #fcd34d', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: TEXT_1, marginBottom: 2 }}>Section 24 — After Tax</div>
                      <div style={{ fontSize: 11, color: TEXT_2, marginBottom: 10 }}>Personal name only</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEXT_2 }}>Pre-tax CF</span><span style={{ fontWeight: 600 }}>{signedFc(base.monthlyCashFlow)}/mo</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEXT_2 }}>Tax rate</span><span style={{ fontWeight: 600 }}>{(base.effectiveTaxRate ?? 0).toFixed(0)}%</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEXT_2 }}>Est. after-tax</span><span style={{ fontWeight: 700, color: (base.netProfitAfterTax ?? 0) > 0 ? '#059669' : '#dc2626' }}>{fc(base.netProfitAfterTax ?? base.monthlyCashFlow)}/mo</span></div>
                        {p.purchasePrice > 0 && base.netProfitAfterTax != null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEXT_2 }}>Net yield post-tax</span><span style={{ fontWeight: 600 }}>{fp((base.netProfitAfterTax * 12 / p.purchasePrice) * 100)}</span></div>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: '#92400e', marginTop: 10, lineHeight: 1.5 }}>Mortgage interest not deductible for personal-name landlords since April 2020</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── S6: Risk flags ────────────────────────────────────────────── */}
            {activeFlags.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ padding: '10px 16px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
                  <span style={secLabel}>RISK FLAGS ({activeFlags.length})</span>
                </div>
                <div style={{ padding: '4px 14px' }}>
                  {activeFlags.map((flag, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < activeFlags.length - 1 ? `.5px solid ${DS_BORDER}` : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: flag.severity === 'red' ? '#dc2626' : '#d97706', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: TEXT_1, flex: 1 }}>{flag.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: flag.severity === 'red' ? '#fee2e2' : '#fef3c7', color: flag.severity === 'red' ? '#7f1d1d' : '#92400e' }}>
                        {flag.severity === 'red' ? 'HIGH RISK' : 'REVIEW'}
                      </span>
                    </div>
                  ))}
                </div>
                {activeFlags.some(f => f.label === 'ICR stress test fail') && (
                  <div style={{ margin: '0 14px 12px', padding: '8px 12px', background: '#fffbeb', border: '.5px solid #fcd34d', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                    ICR failure means this deal may not pass lender stress tests at standard BTL rates.
                  </div>
                )}
              </div>
            )}

            {/* ── S7: Financing breakdown ───────────────────────────────────── */}
            {p.purchasePrice > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ padding: '10px 16px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC }}>
                  <span style={secLabel}>FINANCING BREAKDOWN</span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ border: `.5px solid ${DS_BORDER}`, borderRadius: 8, marginBottom: hasBridging ? 10 : 0, overflow: 'hidden' }}>
                    <div style={{ background: BG_SEC, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `.5px solid ${DS_BORDER}` }}>
                      <i className="ti ti-building-bank" style={{ color: NAVY }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_1, flex: 1 }}>
                        {isCash ? 'Cash purchase' : `Purchase — ${p.mortgageType === 'IO' ? 'Interest only' : 'Repayment'} mortgage · ${(100 - p.depositPercent).toFixed(0)}% LTV`}
                      </span>
                      {!isCash && <span style={{ fontSize: 11, color: TEXT_2 }}>{fc(loanAmt)} borrowed</span>}
                    </div>
                    <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px 14px' }}>
                      {isCash ? (
                        <>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Purchase price</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(p.purchasePrice)}</div></div>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Extra upfront costs</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(base.extraUpfrontCosts)}</div></div>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Total cash in</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(base.totalCashInvested)}</div></div>
                        </>
                      ) : (
                        <>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Deposit ({fp(p.depositPercent, 0)})</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(depositAmt)}</div></div>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Loan amount</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(loanAmt)}</div></div>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Monthly payment</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(monthlyMortgage)}</div></div>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Interest rate</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fp(p.mortgageRate)}</div></div>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Mortgage term</div><div style={{ fontSize: 13, fontWeight: 500 }}>{p.mortgageTerm} yrs</div></div>
                          <div><div style={{ fontSize: 10, color: TEXT_2 }}>Arrangement fee</div><div style={{ fontSize: 13, fontWeight: 500 }}>{p.mortgageArrangementFee > 0 ? fc(p.mortgageArrangementFee) : '—'}</div></div>
                        </>
                      )}
                    </div>
                  </div>
                  {hasBridging && (
                    <div style={{ border: `.5px solid ${DS_BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: BG_SEC, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `.5px solid ${DS_BORDER}` }}>
                        <i className="ti ti-building-bank" style={{ color: NAVY }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_1, flex: 1 }}>Refurb — bridging loan</span>
                        <span style={{ fontSize: 11, color: TEXT_2 }}>{fc(bridgingLoanAmt)} facility</span>
                      </div>
                      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px 14px' }}>
                        <div><div style={{ fontSize: 10, color: TEXT_2 }}>Facility amount</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(bridgingLoanAmt)}</div></div>
                        <div><div style={{ fontSize: 10, color: TEXT_2 }}>Monthly interest</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(bridgingMonthlyInt)}/mo at {fp(p.bridgingRateMonthly)}</div></div>
                        <div><div style={{ fontSize: 10, color: TEXT_2 }}>Term</div><div style={{ fontSize: 13, fontWeight: 500 }}>{p.bridgingTermMonths} months</div></div>
                        <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: TEXT_2 }}>Total bridging cost (interest + fees)</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fc(base.totalBridgingCost)}</div></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── S8: Deal Optimiser ────────────────────────────────────────── */}
            {p.purchasePrice > 0 && (
              <div style={{ background: '#152d55', borderRadius: 8, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#93c5fd', marginRight: 4 }}>DEAL OPTIMISER</span>
                  <span style={{ fontSize: 10, color: '#93c5fd', opacity: .7, marginRight: 4 }}>Target:</span>
                  {(['coc', 'cf', 'yield', 'netyield', 'cashmax'] as const).map(t => (
                    <button key={t} onClick={() => setOptimiserTarget(t)}
                      style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 20, background: optimiserTarget === t ? '#1B3A6B' : 'transparent', color: optimiserTarget === t ? '#e0eaff' : '#93c5fd', border: `.5px solid ${optimiserTarget === t ? '#93c5fd' : 'rgba(147,197,253,.35)'}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {t === 'coc' ? 'CoC ROI' : t === 'cf' ? 'Cash flow' : t === 'yield' ? 'Gross yield' : t === 'netyield' ? 'Net yield' : 'Max cash in'}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Current CoC ROI',    value: fp(base.cashOnCashROI),                                           good: base.cashOnCashROI >= 8 },
                    { label: 'Max purchase price',  value: isFinite(maxPrice) && maxPrice > 0 ? fc(maxPrice) : '—',          good: maxPrice >= p.purchasePrice },
                    { label: 'Price headroom',      value: isFinite(priceHeadroom) ? (priceHeadroom >= 0 ? `+${fc(priceHeadroom)}` : `−${fc(-priceHeadroom)}`) : '—', good: priceHeadroom >= 0 },
                    { label: 'Min rent needed',     value: fc(minRent) + '/mo',                                              good: monthlyRent >= minRent },
                    { label: 'Rent buffer',         value: signedFc(monthlyRent - minRent) + '/mo',                          good: monthlyRent >= minRent },
                    { label: 'Verdict',             value: targetMet ? '✓ Target met' : '✗ Not met',                        good: targetMet },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(255,255,255,.07)', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#93c5fd', opacity: .75, marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: item.good ? '#6ee7b7' : '#fca5a5' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#93c5fd', opacity: .8, fontWeight: 500, marginBottom: 6 }}>If purchase price changes</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                      {[-10000, 0, 10000].map(delta => {
                        const adjPrice = p.purchasePrice + delta
                        const adjCash  = cashInvested + delta * (p.depositPercent / 100)
                        const adjCF    = base.monthlyCashFlow - (delta * (1 - p.depositPercent / 100) * (p.mortgageRate / 100) / 12)
                        const adjCoC   = adjCash > 0 ? (adjCF * 12 / adjCash) * 100 : 0
                        const isCur    = delta === 0
                        return (
                          <div key={delta} style={{ background: isCur ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)', border: `.5px solid ${isCur ? 'rgba(147,197,253,.4)' : 'transparent'}`, borderRadius: 5, padding: '6px 7px', textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: '#93c5fd', opacity: .7 }}>{fc(adjPrice)}</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: adjCoC >= 8 ? '#6ee7b7' : adjCoC >= 5 ? '#e0eaff' : '#fca5a5' }}>{fp(adjCoC)}</div>
                            {!isCur && <div style={{ fontSize: 9, color: '#93c5fd', opacity: .5 }}>CoC</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#93c5fd', opacity: .8, fontWeight: 500, marginBottom: 6 }}>If rent changes</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                      {[0.9, 1.0, 1.1].map(mult => {
                        const adjRent = monthlyRent * mult
                        const adjCF   = base.monthlyCashFlow + (adjRent - monthlyRent) * (1 - (p.managementFeePercent) / 100)
                        const isCur   = mult === 1.0
                        return (
                          <div key={mult} style={{ background: isCur ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)', border: `.5px solid ${isCur ? 'rgba(147,197,253,.4)' : 'transparent'}`, borderRadius: 5, padding: '6px 7px', textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: '#93c5fd', opacity: .7 }}>{fc(adjRent)}/mo</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: adjCF > 200 ? '#6ee7b7' : adjCF > 0 ? '#e0eaff' : '#fca5a5' }}>{signedFc(adjCF)}</div>
                            {!isCur && <div style={{ fontSize: 9, color: '#93c5fd', opacity: .5 }}>CF</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginTop: 10, paddingTop: 8, borderTop: '.5px solid rgba(147,197,253,.2)' }}>
                  <span style={{ fontSize: 12, color: '#93c5fd', cursor: 'pointer' }}>Open full optimiser with negotiation tips →</span>
                </div>
              </div>
            )}

            {/* ── S9: Sold price comparables ────────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: 12, border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ padding: '10px 16px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center' }}>
                <span style={{ ...secLabel, flex: 1 }}>SOLD PRICE COMPARABLES</span>
                <button onClick={() => { void doRefreshComps() }} disabled={compsLoading}
                  style={{ fontSize: 11, padding: '3px 10px', border: `.5px solid ${DS_BORDER}`, borderRadius: 20, background: '#fff', color: TEXT_2, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className={`ti ${compsLoading ? 'ti-loader-2' : 'ti-refresh'}`} style={{ fontSize: 11 }} />{compsLoading ? 'Loading…' : '↺ Refresh'}
                </button>
              </div>
              <div style={{ padding: '14px 16px' }}>
                {localCompsError && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{localCompsError}</div>}
                {localComps.length === 0 ? (
                  <div style={{ fontSize: 12, color: TEXT_2, padding: '16px', background: BG_SEC, borderRadius: 8, textAlign: 'center' }}>
                    No sold price data yet. Open Show Workings to fetch comparables for this postcode.
                  </div>
                ) : (
                  <>
                    {localComps.filter(c => c.kept).length === 0 && (
                      <div style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', border: '.5px solid #fcd34d', borderRadius: 6, padding: '8px 12px', marginBottom: 8 }}>
                        No comparables marked for pack — click Keep on the rows you want to include.
                      </div>
                    )}
                    <div style={{ border: `.5px solid ${DS_BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 110px 100px 120px', background: BG_SEC, borderBottom: `.5px solid ${DS_BORDER}` }}>
                        {['Address', 'Sold', 'Price', 'Type', 'Tenure', ''].map(h => (
                          <div key={h} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 500, color: TEXT_2 }}>{h}</div>
                        ))}
                      </div>
                      {localComps.map((comp, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 110px 100px 120px', borderBottom: i < localComps.length - 1 ? `.5px solid ${DS_BORDER}` : 'none', fontSize: 12 }}>
                          <div style={{ padding: '9px 12px', color: TEXT_1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.address}</div>
                          <div style={{ padding: '9px 12px', color: TEXT_2 }}>{comp.date ? new Date(comp.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}</div>
                          <div style={{ padding: '9px 12px', fontWeight: 500, color: NAVY }}>£{comp.price?.toLocaleString('en-GB') ?? '—'}</div>
                          <div style={{ padding: '9px 12px', color: TEXT_2 }}>{comp.type || '—'}</div>
                          <div style={{ padding: '9px 12px', color: TEXT_2 }}>{comp.tenure || '—'}</div>
                          <div style={{ padding: '6px 10px', display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'flex-end' }}>
                            <button onClick={() => { const u = localComps.map((c, j) => j === i ? { ...c, kept: !c.kept } : c); updateLocalComps(u) }}
                              style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: `.5px solid ${comp.kept ? '#1D9E75' : DS_BORDER}`, background: comp.kept ? '#e6f7f1' : BG_SEC, color: comp.kept ? '#1D9E75' : TEXT_2, cursor: 'pointer', fontFamily: 'inherit' }}>
                              {comp.kept ? '✓ Keep' : 'Keep'}
                            </button>
                            <button onClick={() => { const u = localComps.filter((_, j) => j !== i); updateLocalComps(u) }}
                              style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `.5px solid ${DS_BORDER}`, background: 'none', color: TEXT_2, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
                              −
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const kc = localComps.filter(c => c.kept)
                      if (kc.length === 0) return null
                      const avg = kc.reduce((s, c) => s + c.price, 0) / kc.length
                      return <div style={{ fontSize: 12, color: TEXT_2, marginTop: 8 }}>{kc.length} comparable(s) selected for investor pack · Avg price: {fc(avg)}</div>
                    })()}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: `${56 + 48 + 44 + 42 + 20}px` }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: `.5px solid ${DS_BORDER}`, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', borderBottom: `.5px solid ${DS_BORDER}`, background: BG_SEC, display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: NAVY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: NAVY, flexShrink: 0 }}><i className="ti ti-robot" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: TEXT_1 }}>DealScore Assistant</div>
              <div style={{ fontSize: '10px', color: TEXT_2 }}>{isIncomplete ? 'Awaiting inputs' : composite ? 'Analysis complete' : 'No data yet'}</div>
            </div>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isIncomplete ? (
              <div style={{ fontSize: '11px', color: TEXT_2, lineHeight: 1.6 }}>Complete your deal inputs to generate a full analysis and score.</div>
            ) : composite ? (
              <>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: TEXT_1, marginBottom: '2px' }}>Score breakdown</div>
                  <div style={{ fontSize: '10px', color: TEXT_2, lineHeight: 1.5 }}>{composite.dimensions.map(d => `${d.label}: ${d.points}/${d.maxPoints} pts`).join(' · ')}</div>
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
        {scenarios.length > 0 && (p.strategy === 'BTL' || p.strategy === 'HMO' || p.strategy === 'SA' || p.strategy === 'SOCIAL' || p.strategy === 'BRRR') && (
          <div style={{ background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: 10, overflow: 'hidden', marginTop: 10 }}>
            <div style={{ padding: '9px 14px', background: BG_SEC, borderBottom: `.5px solid ${DS_BORDER}` }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_1 }}>Stress test snapshot</span>
            </div>
            {scenarios.map(sc => (
              <div key={sc.label} style={{ padding: '8px 14px', borderBottom: `.5px solid ${DS_BORDER}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: TEXT_2 }}>{sc.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: cColor[sc.colorKey] }}>{sc.verdict}</span>
              </div>
            ))}
          </div>
        )}
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
            <ISelectOther
              label="Property type"
              value={String(form.propertyType ?? '')}
              onChange={v => setField('propertyType', v)}
              options={[
                { value: 'Terraced house', label: 'Terraced house' },
                { value: 'End-of-terrace house', label: 'End-of-terrace house' },
                { value: 'Semi-detached house', label: 'Semi-detached house' },
                { value: 'Detached house', label: 'Detached house' },
                { value: 'Flat / Apartment', label: 'Flat / Apartment' },
                { value: 'Studio flat', label: 'Studio flat' },
                { value: 'Maisonette', label: 'Maisonette' },
                { value: 'Bungalow (detached)', label: 'Bungalow (detached)' },
                { value: 'Bungalow (semi-detached)', label: 'Bungalow (semi-detached)' },
                { value: 'Converted flat', label: 'Converted flat' },
                { value: 'Purpose-built flat', label: 'Purpose-built flat' },
                { value: 'HMO', label: 'HMO' },
                { value: 'Block of flats', label: 'Block of flats' },
                { value: 'Commercial / mixed use', label: 'Commercial / mixed use' },
                { value: 'Land', label: 'Land' },
              ]}
              otherPlaceholder="Describe property type..."
            />
            <ISelect
              label="Bedrooms"
              value={String(form.bedrooms ?? '')}
              onChange={v => setField('bedrooms', parseInt(v) || v)}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5' },
                { value: '6', label: '6' },
                { value: '7', label: '7' },
                { value: '8', label: '8' },
                { value: '9', label: '9' },
                { value: '10', label: '10+' },
              ]}
            />
            {/* Row 2 */}
            <ISelect
              label="Bathrooms"
              value={String(form.bathrooms ?? '')}
              onChange={v => setField('bathrooms', parseInt(v) || v)}
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5' },
                { value: '6', label: '6+' },
              ]}
            />
            <IField label="Floor area (sqm)" value={String(form.floorAreaSqm ?? '')} onChange={v => setField('floorAreaSqm', parseFloat(v) || 0)} />
            <IField label="Year built" value={String(form.yearBuilt ?? '')} onChange={v => setField('yearBuilt', parseInt(v) || 0)} />
            {/* Row 3 */}
            <ISelect
              label="Tenure"
              value={String(form.tenure ?? 'Freehold')}
              onChange={v => setField('tenure', v)}
              options={[
                { value: 'Freehold', label: 'Freehold' },
                { value: 'Leasehold', label: 'Leasehold' },
                { value: 'Share of freehold', label: 'Share of freehold' },
                { value: 'Commonhold', label: 'Commonhold' },
              ]}
            />
            <ISelect
              label="EPC rating"
              value={String(form.epcRating ?? '')}
              onChange={v => setField('epcRating', v)}
              options={[
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
                { value: 'E', label: 'E' },
                { value: 'F', label: 'F' },
                { value: 'G', label: 'G' },
                { value: 'Unknown', label: 'Unknown' },
              ]}
            />
            <div>
              <ISelectOther
                label="Construction type"
                value={String(form.constructionType ?? 'Standard (brick/block)')}
                onChange={v => setField('constructionType', v)}
                options={[
                  { value: 'Standard (brick/block)', label: 'Standard (brick/block)' },
                  { value: 'Steel frame', label: 'Steel frame' },
                  { value: 'Timber frame', label: 'Timber frame' },
                  { value: 'Concrete (prefab/BISF)', label: 'Concrete (prefab/BISF)' },
                  { value: 'Stone', label: 'Stone' },
                  { value: 'Wimpey no-fines', label: 'Wimpey no-fines' },
                  { value: 'Airey / PRC', label: 'Airey / PRC' },
                ]}
                otherPlaceholder="Describe construction type..."
              />
              {!String(form.constructionType ?? 'Standard (brick/block)').toLowerCase().includes('standard') && (
                <div style={{ fontSize: '10px', color: '#92400e', marginTop: '4px', lineHeight: 1.4 }}>
                  ⚠️ Non-standard construction — some lenders will not lend on this property type. Confirm mortgage eligibility early.
                </div>
              )}
            </div>
            {/* Row 4 */}
            <IField label="Asking price (£)" value={Number(form.askingPrice) > 0 ? fc(Number(form.askingPrice)) : ''} onChange={v => setField('askingPrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <ISelect
              label="Buyer type"
              value={String(form.buyerType ?? 'Standard')}
              onChange={v => setField('buyerType', v)}
              options={[
                { value: 'Standard', label: 'Standard' },
                { value: 'First-time buyer', label: 'First-time buyer' },
                { value: 'Ltd company', label: 'Ltd company' },
                { value: 'Non-UK resident', label: 'Non-UK resident' },
              ]}
            />
            <IField label="Source of deal" value={String(form.sourceOfDeal ?? '')} onChange={v => setField('sourceOfDeal', v)} />
            {/* Row 5 */}
            <ISelect
              label="Flood risk"
              value={String(form.floodRisk ?? 'Low')}
              onChange={v => setField('floodRisk', v)}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Very high', label: 'Very high' },
                { value: 'Unknown', label: 'Unknown' },
              ]}
            />
            <ISelect
              label="Gas supply"
              value={String(form.hasGasSupply ?? 'Yes')}
              onChange={v => setField('hasGasSupply', v)}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No — electric only' },
                { value: 'Unknown', label: 'Unknown' },
              ]}
            />
            <ISelect
              label="Council tax band"
              value={String(form.councilTaxBand ?? '')}
              onChange={v => setField('councilTaxBand', v)}
              options={[
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'C', label: 'C' },
                { value: 'D', label: 'D' },
                { value: 'E', label: 'E' },
                { value: 'F', label: 'F' },
                { value: 'G', label: 'G' },
                { value: 'H', label: 'H' },
                { value: 'Unknown', label: 'Unknown' },
              ]}
            />
            {/* Row 6 */}
            <ISelect
              label="Currently tenanted?"
              value={String(form.isCurrentlyTenanted ?? 'No')}
              onChange={v => setField('isCurrentlyTenanted', v)}
              options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
            />
            <ISelect
              label="Uninhabitable?"
              value={String(form.isUninhabitable ?? 'No')}
              onChange={v => setField('isUninhabitable', v)}
              options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
            />
            <ISelect
              label="Listed building"
              value={String(form.listedStatus ?? 'None')}
              onChange={v => setField('listedStatus', v)}
              options={[
                { value: 'None', label: 'None' },
                { value: 'Grade II', label: 'Grade II' },
                { value: 'Grade II*', label: 'Grade II*' },
                { value: 'Grade I', label: 'Grade I' },
                { value: 'Grade A (Scotland)', label: 'Grade A (Scotland)' },
                { value: 'Grade B (Scotland)', label: 'Grade B (Scotland)' },
                { value: 'Grade C (Scotland)', label: 'Grade C (Scotland)' },
              ]}
            />
            {/* Row 7 */}
            <ISelect
              label="Conservation area?"
              value={String(form.isConservationArea ?? 'No')}
              onChange={v => setField('isConservationArea', v)}
              options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }, { value: 'Unknown', label: 'Unknown' }]}
            />
            <ISelect
              label="PD rights available?"
              value={String(form.pdRightsAvailable ?? 'Unknown')}
              onChange={v => setField('pdRightsAvailable', v)}
              options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No — Article 4 or restricted' },
                { value: 'Unknown', label: 'Unknown' },
              ]}
            />
            <ISelect
              label="Cash buyer?"
              value={String(form.isCashBuyer ?? 'No')}
              onChange={v => setField('isCashBuyer', v)}
              options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
            />
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
              <ISelect
                label="Ground rent review"
                value={String(form.groundRentReviewClause ?? 'None')}
                onChange={v => setField('groundRentReviewClause', v)}
                options={[
                  { value: 'None', label: 'None / fixed' },
                  { value: 'RPI', label: 'RPI linked' },
                  { value: 'CPI', label: 'CPI linked' },
                  { value: 'Doubling', label: 'Doubling (⚠️ unmortgageable risk)' },
                  { value: 'Fixed amount', label: 'Fixed amount increase' },
                  { value: 'Unknown', label: 'Unknown' },
                ]}
              />
              <ISelect
                label="Share of freehold?"
                value={String(form.shareOfFreehold ?? 'No')}
                onChange={v => setField('shareOfFreehold', v)}
                options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
              />
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

        {/* 3b. OWNERSHIP & TAX */}
        <Sec title="Ownership &amp; tax">
          <IGrid>
            <ISelect
              label="Ownership structure"
              value={String(form.ownershipStructure ?? 'Personal name')}
              onChange={v => setField('ownershipStructure', v)}
              options={[
                { value: 'Personal name', label: 'Personal name' },
                { value: 'Ltd company', label: 'Ltd company (SPV)' },
                { value: 'LLP', label: 'LLP' },
                { value: 'Trust', label: 'Trust' },
              ]}
            />
            <ISelect
              label="Income tax band"
              value={String(form.incomeTaxBand ?? '20%')}
              onChange={v => setField('incomeTaxBand', v)}
              options={[
                { value: '20%', label: '20% (Basic rate)' },
                { value: '40%', label: '40% (Higher rate)' },
                { value: '45%', label: '45% (Additional rate)' },
              ]}
            />
            <ISelect
              label="Joint ownership?"
              value={String(form.isJointOwnership ?? 'No')}
              onChange={v => setField('isJointOwnership', v)}
              options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
            />
          </IGrid>

          {/* Joint ownership split */}
          {String(form.isJointOwnership ?? 'No') === 'Yes' && (
            <IGrid style={{ marginTop: '10px' }}>
              <IField label="Your ownership (%)" value={fp(Number(form.ownershipSplitPercent ?? 50))} onChange={v => setField('ownershipSplitPercent', parseFloat(v) || 50)} />
              <ISelect
                label="Partner's tax band"
                value={String(form.partnerTaxBand ?? '20%')}
                onChange={v => setField('partnerTaxBand', v)}
                options={[
                  { value: '20%', label: '20% (Basic rate)' },
                  { value: '40%', label: '40% (Higher rate)' },
                  { value: '45%', label: '45% (Additional rate)' },
                ]}
              />
            </IGrid>
          )}

          {/* JV investor split */}
          {String(form.ownershipStructure ?? '').toLowerCase().includes('jv') && (
            <IGrid style={{ marginTop: '10px' }}>
              <IField label="JV investor split (%)" value={fp(Number(form.jvInvestorSplitPercent ?? 50))} onChange={v => setField('jvInvestorSplitPercent', parseFloat(v) || 50)} />
            </IGrid>
          )}

          {/* Section 24 notice */}
          {(String(form.ownershipStructure ?? 'Personal name') === 'Personal name' || !form.ownershipStructure) &&
           String(form.isCashBuyer ?? 'No') !== 'Yes' &&
           form.purchaseFinanceMethod !== 'Cash' && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#eff6ff', border: '.5px solid #bfdbfe', borderRadius: '8px', fontSize: '11px', color: '#1e3a5f', lineHeight: 1.6 }}>
              <i className="ti ti-info-circle" style={{ marginRight: '6px' }} />
              <strong>Section 24:</strong> Personal name landlords cannot deduct mortgage interest from rental profit — only a 20% basic rate tax credit applies. Higher-rate taxpayers may pay tax on profit they haven't made. Consider Ltd company structure.
            </div>
          )}
        </Sec>

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
              <IField label="Refurb / works cost (£)" value={Number((form.sharedInputs as Record<string,unknown>)?.refurbCost) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).refurbCost)) : ''} onChange={v => setField('sharedInputs.refurbCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>

            {/* MDR toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0 4px', padding: '10px 12px', background: 'var(--bg-sec)', borderRadius: '8px', border: '.5px solid var(--ds-border)' }}>
              <i className="ti ti-receipt-tax" style={{ fontSize: '15px', color: 'var(--text-2)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1 }}>Multiple Dwellings Relief (MDR) applies?</span>
              <span style={{ fontSize: '11px', color: 'var(--text-2)', marginRight: '8px' }}>Buying 2+ units in one transaction can reduce stamp duty significantly</span>
              <button onClick={() => isEditing && setField('mdrApplies', !form.mdrApplies)} style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default', background: form.mdrApplies ? 'var(--navy)' : 'var(--bg-sec)', color: form.mdrApplies ? '#fff' : 'var(--text-2)' }}>
                {form.mdrApplies ? 'Yes' : 'No'}
              </button>
            </div>

            {/* Purchase costs breakdown */}
            <div style={{ marginTop: '12px', marginBottom: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#aaa' }}>Purchase costs breakdown</div>
            <IGrid>
              <IField label="Solicitor / conveyancing (£)" value={Number(form.solicitorFee) > 0 ? fc(Number(form.solicitorFee)) : ''} onChange={v => setField('solicitorFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Survey cost (£)" value={Number(form.surveyCost) > 0 ? fc(Number(form.surveyCost)) : ''} onChange={v => setField('surveyCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Broker fee (£)" value={Number(form.brokerFee) > 0 ? fc(Number(form.brokerFee)) : ''} onChange={v => setField('brokerFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Sourcing fee paid (£)" value={Number(form.sourcingFeePaid) > 0 ? fc(Number(form.sourcingFeePaid)) : ''} onChange={v => setField('sourcingFeePaid', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Mortgage arrangement fee (£)" value={Number(form.mortgageArrangementFee) > 0 ? fc(Number(form.mortgageArrangementFee)) : ''} onChange={v => setField('mortgageArrangementFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Other costs (£)" value={Number((form.sharedInputs as Record<string,unknown>)?.otherCosts) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).otherCosts)) : ''} onChange={v => setField('sharedInputs.otherCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
          </Sec>
        )}

        {/* Purchase financing — Buy only, not FLIP */}
        {mode === 'buy' && activeTile !== 'flip' && (
          <Sec title="Purchase financing">
            {/* Method selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {(['Cash', 'Mortgage', 'Bridging'] as const).map(method => (
                <button key={method}
                  onClick={() => isEditing && setField('purchaseFinanceMethod', method)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    border: `${form.purchaseFinanceMethod === method ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`,
                    background: form.purchaseFinanceMethod === method ? 'var(--navy-light)' : 'var(--bg-sec)',
                    color: form.purchaseFinanceMethod === method ? 'var(--navy)' : 'var(--text-2)',
                    cursor: isEditing ? 'pointer' : 'default', fontFamily: 'inherit',
                  }}
                >{method}</button>
              ))}
            </div>

            {/* Mortgage fields */}
            {(form.purchaseFinanceMethod === 'Mortgage' || !form.purchaseFinanceMethod) && String(form.isCashBuyer ?? 'No') !== 'Yes' && (
              <IGrid>
                <IField label="Deposit %" value={fp(Number((form.sharedInputs as Record<string,unknown>)?.depositPercent ?? 25))} onChange={v => setField('sharedInputs.depositPercent', parseFloat(v) || 25)} />
                <IField label="Mortgage rate (%)" value={Number((form.sharedInputs as Record<string,unknown>)?.mortgageRate) > 0 ? fp(Number((form.sharedInputs as Record<string,unknown>).mortgageRate)) : ''} onChange={v => setField('sharedInputs.mortgageRate', parseFloat(v) || 0)} />
                <IField label="Term (years)" value={String((form.sharedInputs as Record<string,unknown>)?.mortgageTerm ?? 25)} onChange={v => setField('sharedInputs.mortgageTerm', parseInt(v) || 25)} />
                <ISelect
                  label="Mortgage type"
                  value={String((form.sharedInputs as Record<string,unknown>)?.mortgageType ?? 'IO') === 'IO' ? 'Interest only' : 'Repayment'}
                  onChange={v => setField('sharedInputs.mortgageType', v === 'Interest only' ? 'IO' : 'Repayment')}
                  options={[
                    { value: 'Interest only', label: 'Interest only' },
                    { value: 'Repayment', label: 'Repayment' },
                  ]}
                />
                <IField label="Fixed rate ends" value={String(form.fixedRateEndDate ?? '')} onChange={v => setField('fixedRateEndDate', v)} />
                <IField label="Reversion / SVR rate (%)" value={Number(form.reversionRate) > 0 ? fp(Number(form.reversionRate)) : ''} onChange={v => setField('reversionRate', parseFloat(v) || 0)} />
              </IGrid>
            )}

            {/* Bridging fields */}
            {form.purchaseFinanceMethod === 'Bridging' && (
              <IGrid>
                <IField label="Bridging rate (% pm)" value={Number(form.bridgingRateMonthly) > 0 ? fp(Number(form.bridgingRateMonthly)) : ''} onChange={v => setField('bridgingRateMonthly', parseFloat(v) || 0)} />
                <IField label="Bridging term (months)" value={String(form.bridgingTermMonths ?? '')} onChange={v => setField('bridgingTermMonths', parseInt(v) || 0)} />
                <IField label="Bridging LTV (%)" value={fp(Number(form.bridgingLTV ?? 70))} onChange={v => setField('bridgingLTV', parseFloat(v) || 70)} />
                <IField label="Arrangement fee (%)" value={fp(Number(form.bridgingArrangementFeePercent ?? 2))} onChange={v => setField('bridgingArrangementFeePercent', parseFloat(v) || 2)} />
                <IField label="Exit fee (%)" value={fp(Number(form.bridgingExitFeePercent ?? 0))} onChange={v => setField('bridgingExitFeePercent', parseFloat(v) || 0)} />
              </IGrid>
            )}

            {/* Cash buyer message */}
            {String(form.isCashBuyer ?? 'No') === 'Yes' && (
              <div style={{ padding: '12px', background: 'var(--bg-sec)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-2)' }}>
                <i className="ti ti-check" style={{ color: 'var(--teal)', marginRight: '6px' }} />Cash purchase — no mortgage or bridging costs.
              </div>
            )}
          </Sec>
        )}

        {/* Refurb financing — Buy strategies where refurb cost > 0 */}
        {mode === 'buy' && Number((form.sharedInputs as Record<string,unknown>)?.refurbCost) > 0 && (
          <Sec title="Refurb financing">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {(['Cash', 'Bridging'] as const).map(method => (
                <button key={method}
                  onClick={() => isEditing && setField('refurbFinanceMethod', method)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    border: `${form.refurbFinanceMethod === method ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`,
                    background: form.refurbFinanceMethod === method ? 'var(--navy-light)' : 'var(--bg-sec)',
                    color: form.refurbFinanceMethod === method ? 'var(--navy)' : 'var(--text-2)',
                    cursor: isEditing ? 'pointer' : 'default', fontFamily: 'inherit',
                  }}
                >{method}</button>
              ))}
            </div>
            {form.refurbFinanceMethod === 'Bridging' && (
              <IGrid>
                <IField label="Bridging rate (% pm)" value={Number(form.refurbBridgingRate) > 0 ? fp(Number(form.refurbBridgingRate)) : ''} onChange={v => setField('refurbBridgingRate', parseFloat(v) || 0)} />
                <IField label="Bridging term (months)" value={String(form.refurbBridgingTermMonths ?? '')} onChange={v => setField('refurbBridgingTermMonths', parseInt(v) || 0)} />
                <IField label="LTV (%)" value={fp(Number(form.refurbBridgingLTV ?? 70))} onChange={v => setField('refurbBridgingLTV', parseFloat(v) || 70)} />
                <IField label="Arrangement fee (%)" value={fp(Number(form.refurbBridgingArrangementFee ?? 2))} onChange={v => setField('refurbBridgingArrangementFee', parseFloat(v) || 2)} />
              </IGrid>
            )}
          </Sec>
        )}

        {/* Monthly costs — Buy only, not FLIP */}
        {mode === 'buy' && activeTile !== 'flip' && (
          <Sec title="Monthly costs">
            <IGrid>
              <IField label="Management fee (%)" value={fp(Number(form.managementFeePercent ?? 10))} onChange={v => setField('managementFeePercent', parseFloat(v) || 10)} />
              <IField label="Void allowance (%)" value={fp(Number(form.voidAllowancePercent ?? 5))} onChange={v => setField('voidAllowancePercent', parseFloat(v) || 5)} />
              <IField label="Buildings insurance (£/mo)" value={fc(Number(form.buildingsInsurance ?? 30))} onChange={v => setField('buildingsInsurance', parseFloat(v.replace(/[£,]/g, '')) || 30)} />
              <IField label="Maintenance reserve (£/mo)" value={fc(Number(form.maintenanceReserve ?? 75))} onChange={v => setField('maintenanceReserve', parseFloat(v.replace(/[£,]/g, '')) || 75)} />
              <IField label="Landlord insurance (£/mo)" value={Number(form.landlordInsuranceMonthly) > 0 ? fc(Number(form.landlordInsuranceMonthly)) : ''} onChange={v => setField('landlordInsuranceMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Letting agent re-let fee (£)" value={Number(form.reletFee) > 0 ? fc(Number(form.reletFee)) : ''} onChange={v => setField('reletFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Annual compliance costs (£/yr)" value={Number(form.annualComplianceCosts) > 0 ? fc(Number(form.annualComplianceCosts)) : ''} onChange={v => setField('annualComplianceCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Rent guarantee insurance (£/mo)" value={Number(form.rentGuaranteeInsurance) > 0 ? fc(Number(form.rentGuaranteeInsurance)) : ''} onChange={v => setField('rentGuaranteeInsurance', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Legal expenses insurance (£/yr)" value={Number(form.legalExpensesInsurance) > 0 ? fc(Number(form.legalExpensesInsurance)) : ''} onChange={v => setField('legalExpensesInsurance', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Council tax during voids (£/mo)" value={Number(form.councilTaxVoids) > 0 ? fc(Number(form.councilTaxVoids)) : ''} onChange={v => setField('councilTaxVoids', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              {String(form.tenure ?? '').toLowerCase() === 'leasehold' && (
                <>
                  <IField label="Service charge (£/mo)" value={Number(form.serviceChargeMonthly) > 0 ? fc(Number(form.serviceChargeMonthly)) : ''} onChange={v => setField('serviceChargeMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
                  <IField label="Ground rent (£/yr)" value={Number(form.groundRentAnnual) > 0 ? fc(Number(form.groundRentAnnual)) : ''} onChange={v => setField('groundRentAnnual', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
                </>
              )}
            </IGrid>
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-2)', padding: '6px 10px', background: 'var(--bg-sec)', borderRadius: '6px' }}>
              Annual compliance costs — gas safety cert (~£80/yr), EICR (~£150 every 5yr), EPC renewal (~£60 every 10yr)
            </div>
          </Sec>
        )}

        {/* BTL */}
        {activeTile === 'btl' && (
          <Sec title="BTL — income &amp; setup">
            <IGrid>
              <IField label="Monthly rent (£)" value={Number((form.btlInputs as Record<string,unknown>)?.monthlyRent) > 0 ? fc(Number((form.btlInputs as Record<string,unknown>).monthlyRent)) : ''} onChange={v => setField('btlInputs.monthlyRent', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Initial void period (weeks)" value={String((form.btlInputs as Record<string,unknown>)?.initialVoidWeeks ?? 4)} onChange={v => setField('btlInputs.initialVoidWeeks', parseInt(v) || 0)} />
              <IField label="Tenant find / inventory fee (£)" value={Number((form.btlInputs as Record<string,unknown>)?.tenantFindFee) > 0 ? fc(Number((form.btlInputs as Record<string,unknown>).tenantFindFee)) : ''} onChange={v => setField('btlInputs.tenantFindFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <ISelect
                label="Furnished?"
                value={String((form.btlInputs as Record<string,unknown>)?.furnished ?? 'Unfurnished')}
                onChange={v => setField('btlInputs.furnished', v)}
                options={[
                  { value: 'Unfurnished', label: 'Unfurnished' },
                  { value: 'Part-furnished', label: 'Part-furnished' },
                  { value: 'Fully furnished', label: 'Fully furnished' },
                ]}
              />
            </IGrid>
          </Sec>
        )}

        {/* HMO */}
        {activeTile === 'hmo' && (
          <Sec title="HMO — room breakdown &amp; compliance">
            <IGrid>
              <IField label="Rooms" value={String((form.hmoInputs as Record<string,unknown>)?.rooms || '')} onChange={v => setField('hmoInputs.rooms', parseInt(v) || 0)} required />
              <IField label="Rent per room / mo" value={Number((form.hmoInputs as Record<string,unknown>)?.rentPerRoom) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).rentPerRoom)) : ''} onChange={v => setField('hmoInputs.rentPerRoom', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Occupancy rate" value={fp(Number((form.hmoInputs as Record<string,unknown>)?.occupancyRate ?? 90))} onChange={v => setField('hmoInputs.occupancyRate', parseFloat(v) || 90)} />
              <IField label="HMO licence cost (£)" value={Number((form.hmoInputs as Record<string,unknown>)?.licenceCost) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).licenceCost)) : ''} onChange={v => setField('hmoInputs.licenceCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Bills &amp; utilities / mo (£)" value={Number((form.hmoInputs as Record<string,unknown>)?.billsUtilities) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).billsUtilities)) : ''} onChange={v => setField('hmoInputs.billsUtilities', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <ISelect
                label="HMO licence type"
                value={String((form.hmoInputs as Record<string,unknown>)?.licenceType ?? '')}
                onChange={v => setField('hmoInputs.licenceType', v)}
                options={[
                  { value: 'Mandatory', label: 'Mandatory (5+ people, 3+ storeys)' },
                  { value: 'Additional', label: 'Additional (local authority scheme)' },
                  { value: 'Selective', label: 'Selective (single tenancy)' },
                  { value: 'None', label: 'No licence required' },
                  { value: 'Unknown', label: 'Unknown — check with council' },
                ]}
              />
              <ISelect
                label="Rooms ensuite?"
                value={String((form.hmoInputs as Record<string,unknown>)?.roomsEnsuite ?? 'No')}
                onChange={v => setField('hmoInputs.roomsEnsuite', v)}
                options={[
                  { value: 'No', label: 'No — shared bathrooms' },
                  { value: 'Some', label: 'Some rooms ensuite' },
                  { value: 'All', label: 'All rooms ensuite' },
                ]}
              />
              <IField label="Council tax / mo (£)" value={Number((form.hmoInputs as Record<string,unknown>)?.councilTaxMonthly) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).councilTaxMonthly)) : ''} onChange={v => setField('hmoInputs.councilTaxMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Fire compliance one-off (£)" value={Number((form.hmoInputs as Record<string,unknown>)?.fireComplianceCost) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).fireComplianceCost)) : ''} onChange={v => setField('hmoInputs.fireComplianceCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Room re-let fee (£/room)" value={Number((form.hmoInputs as Record<string,unknown>)?.roomReletFee) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).roomReletFee)) : ''} onChange={v => setField('hmoInputs.roomReletFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-sec)', borderRadius: '8px', border: '.5px solid var(--ds-border)' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: 'var(--text-2)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1 }}>Article 4 direction area?</span>
              <button
                onClick={() => isEditing && setField('hmoInputs.article4Area', !(form.hmoInputs as Record<string,unknown>)?.article4Area)}
                style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default', background: (form.hmoInputs as Record<string,unknown>)?.article4Area ? '#fee2e2' : 'var(--bg-sec)', color: (form.hmoInputs as Record<string,unknown>)?.article4Area ? '#991b1b' : 'var(--text-2)' }}
              >
                {(form.hmoInputs as Record<string,unknown>)?.article4Area ? '⚠️ Yes — planning required' : 'No'}
              </button>
            </div>
          </Sec>
        )}

        {/* SA */}
        {activeTile === 'sa' && (
          <Sec title="SA — nightly rate, occupancy &amp; costs">
            <IGrid>
              <IField label="Avg nightly rate (£)" value={Number((form.saInputs as Record<string,unknown>)?.nightlyRate) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).nightlyRate)) : ''} onChange={v => setField('saInputs.nightlyRate', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Target occupancy (%)" value={fp(Number((form.saInputs as Record<string,unknown>)?.occupancyPercent ?? 75))} onChange={v => setField('saInputs.occupancyPercent', parseFloat(v) || 75)} required />
              <IField label="Platform fee (%)" value={fp(Number((form.saInputs as Record<string,unknown>)?.platformFeesPercent ?? 0))} onChange={v => setField('saInputs.platformFeesPercent', parseFloat(v) || 0)} />
              <IField label="Cleaning cost / stay (£)" value={Number((form.saInputs as Record<string,unknown>)?.cleaningCostPerStay) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).cleaningCostPerStay)) : ''} onChange={v => setField('saInputs.cleaningCostPerStay', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Bills &amp; utilities / mo (£)" value={Number((form.saInputs as Record<string,unknown>)?.billsUtilities) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).billsUtilities)) : ''} onChange={v => setField('saInputs.billsUtilities', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Avg stay length (nights)" value={String((form.saInputs as Record<string,unknown>)?.avgStayLengthNights ?? 3)} onChange={v => setField('saInputs.avgStayLengthNights', parseInt(v) || 3)} />
              <IField label="Linen / laundry / stay (£)" value={Number((form.saInputs as Record<string,unknown>)?.linenCostPerStay) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).linenCostPerStay)) : ''} onChange={v => setField('saInputs.linenCostPerStay', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Welcome pack / consumables (£/mo)" value={Number((form.saInputs as Record<string,unknown>)?.consumablesMonthly) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).consumablesMonthly)) : ''} onChange={v => setField('saInputs.consumablesMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Council tax (£/mo)" value={Number((form.saInputs as Record<string,unknown>)?.councilTaxMonthly) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).councilTaxMonthly)) : ''} onChange={v => setField('saInputs.councilTaxMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Channel manager (£/mo)" value={Number((form.saInputs as Record<string,unknown>)?.channelManagerMonthly) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).channelManagerMonthly)) : ''} onChange={v => setField('saInputs.channelManagerMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="SA furnishing / setup (£ one-off)" value={Number((form.saInputs as Record<string,unknown>)?.furnishingSetupCost) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).furnishingSetupCost)) : ''} onChange={v => setField('saInputs.furnishingSetupCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-sec)', borderRadius: '8px', border: '.5px solid var(--ds-border)' }}>
              <i className="ti ti-license" style={{ fontSize: '15px', color: 'var(--text-2)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1 }}>Short-term let licence required by council?</span>
              <button
                onClick={() => isEditing && setField('saInputs.licenceRequired', !(form.saInputs as Record<string,unknown>)?.licenceRequired)}
                style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default', background: (form.saInputs as Record<string,unknown>)?.licenceRequired ? '#fef3c7' : 'var(--bg-sec)', color: (form.saInputs as Record<string,unknown>)?.licenceRequired ? '#92400e' : 'var(--text-2)' }}
              >
                {(form.saInputs as Record<string,unknown>)?.licenceRequired ? '⚠️ Yes — check local rules' : 'No / Unknown'}
              </button>
            </div>
          </Sec>
        )}

        {/* FLIP */}
        {activeTile === 'flip' && (
          <>
            <Sec title="FLIP — project details">
              <IGrid>
                <IField label="Expected sale price" value={Number((form.flipInputs as Record<string,unknown>)?.expectedSalePrice) > 0 ? fc(Number((form.flipInputs as Record<string,unknown>).expectedSalePrice)) : ''} onChange={v => setField('flipInputs.expectedSalePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
                <IField label="Contingency %" value={fp(Number((form.flipInputs as Record<string,unknown>)?.contingencyPercent ?? 10))} onChange={v => setField('flipInputs.contingencyPercent', parseFloat(v) || 10)} />
                <IField label="Project length (months)" value={String((form.flipInputs as Record<string,unknown>)?.projectLengthMonths || '')} onChange={v => setField('flipInputs.projectLengthMonths', parseInt(v) || 0)} required />
                <IField label="Holding costs / mo" value={Number((form.flipInputs as Record<string,unknown>)?.holdingCostsPerMonth) > 0 ? fc(Number((form.flipInputs as Record<string,unknown>).holdingCostsPerMonth)) : ''} onChange={v => setField('flipInputs.holdingCostsPerMonth', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
                <IField label="Selling costs %" value={fp(Number((form.flipInputs as Record<string,unknown>)?.sellingCostsPercent ?? 2))} onChange={v => setField('flipInputs.sellingCostsPercent', parseFloat(v) || 2)} />
                <IField label="Planning permission?" value={String(form.flipPlanningRequired ?? 'No')} onChange={v => setField('flipPlanningRequired', v)} />
              </IGrid>
              {String(form.flipPlanningRequired ?? 'No') === 'Yes' && (
                <IGrid style={{ marginTop: '10px' }}>
                  <IField label="Planning / architect cost (£)" value={Number(form.flipPlanningCost) > 0 ? fc(Number(form.flipPlanningCost)) : ''} onChange={v => setField('flipPlanningCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
                </IGrid>
              )}
            </Sec>

            {/* FLIP purchase financing */}
            <Sec title="FLIP — purchase financing">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {(['Cash', 'Mortgage', 'Bridging'] as const).map(method => (
                  <button key={method}
                    onClick={() => isEditing && setField('flipPurchaseFinanceMethod', method)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                      border: `${form.flipPurchaseFinanceMethod === method ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`,
                      background: form.flipPurchaseFinanceMethod === method ? 'var(--navy-light)' : 'var(--bg-sec)',
                      color: form.flipPurchaseFinanceMethod === method ? 'var(--navy)' : 'var(--text-2)',
                      cursor: isEditing ? 'pointer' : 'default', fontFamily: 'inherit',
                    }}
                  >{method}</button>
                ))}
              </div>
              {form.flipPurchaseFinanceMethod === 'Bridging' && (
                <IGrid>
                  <IField label="Bridging rate (% pm)" value={Number(form.flipBridgingRate) > 0 ? fp(Number(form.flipBridgingRate)) : ''} onChange={v => setField('flipBridgingRate', parseFloat(v) || 0)} />
                  <IField label="Bridging term (months)" value={String(form.flipBridgingTermMonths ?? '')} onChange={v => setField('flipBridgingTermMonths', parseInt(v) || 0)} />
                  <IField label="Bridging LTV (%)" value={fp(Number(form.flipBridgingLTV ?? 70))} onChange={v => setField('flipBridgingLTV', parseFloat(v) || 70)} />
                  <IField label="Arrangement fee (%)" value={fp(Number(form.flipBridgingArrangementFee ?? 2))} onChange={v => setField('flipBridgingArrangementFee', parseFloat(v) || 2)} />
                  <IField label="Exit fee (%)" value={fp(Number(form.flipBridgingExitFee ?? 0))} onChange={v => setField('flipBridgingExitFee', parseFloat(v) || 0)} />
                </IGrid>
              )}
            </Sec>
          </>
        )}

        {/* BRRR */}
        {activeTile === 'brrr' && (
          <>
            <Sec title="BRRR — purchase &amp; refurb financing">
              <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '10px' }}>BRRR purchases are typically bridged. Enter the bridging details for the purchase below.</div>
              <IGrid>
                <IField label="Bridging rate (% pm)" value={Number((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingRate) > 0 ? fp(Number((form.brrrInputs as Record<string,unknown>).purchaseBridgingRate)) : ''} onChange={v => setField('brrrInputs.purchaseBridgingRate', parseFloat(v) || 0)} />
                <IField label="Bridging term (months)" value={String((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingTermMonths ?? '')} onChange={v => setField('brrrInputs.purchaseBridgingTermMonths', parseInt(v) || 0)} />
                <IField label="Bridging LTV (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingLTV ?? 70))} onChange={v => setField('brrrInputs.purchaseBridgingLTV', parseFloat(v) || 70)} />
                <IField label="Arrangement fee (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingArrangementFee ?? 2))} onChange={v => setField('brrrInputs.purchaseBridgingArrangementFee', parseFloat(v) || 2)} />
                <IField label="Exit fee (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingExitFee ?? 0))} onChange={v => setField('brrrInputs.purchaseBridgingExitFee', parseFloat(v) || 0)} />
              </IGrid>
            </Sec>

            <Sec title="BRRR — refinance">
              <IGrid>
                <IField label="Post-refurb value (GDV)" value={Number((form.brrrInputs as Record<string,unknown>)?.postRefurbValue) > 0 ? fc(Number((form.brrrInputs as Record<string,unknown>).postRefurbValue)) : ''} onChange={v => setField('brrrInputs.postRefurbValue', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
                <IField label="Target refinance LTV (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.refinancePercent ?? 75))} onChange={v => setField('brrrInputs.refinancePercent', parseFloat(v) || 75)} />
                <IField label="Refinance rate (%)" value={Number((form.brrrInputs as Record<string,unknown>)?.newMortgageRate) > 0 ? fp(Number((form.brrrInputs as Record<string,unknown>).newMortgageRate)) : ''} onChange={v => setField('brrrInputs.newMortgageRate', parseFloat(v) || 0)} />
                <ISelect
                  label="Refinance type"
                  value={String((form.brrrInputs as Record<string,unknown>)?.refinanceMortgageType ?? 'Interest only')}
                  onChange={v => setField('brrrInputs.refinanceMortgageType', v)}
                  options={[
                    { value: 'Interest only', label: 'Interest only' },
                    { value: 'Repayment', label: 'Repayment' },
                  ]}
                />
                <IField label="Refinance term (years)" value={String((form.brrrInputs as Record<string,unknown>)?.refinanceMortgageTerm ?? 25)} onChange={v => setField('brrrInputs.refinanceMortgageTerm', parseInt(v) || 25)} />
                <IField label="Refinance arrangement fee (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.refinanceArrangementFeePercent ?? 1))} onChange={v => setField('brrrInputs.refinanceArrangementFeePercent', parseFloat(v) || 1)} />
              </IGrid>
            </Sec>

            <Sec title="BRRR — post-refurb income (hold phase)">
              <IGrid>
                <IField label="Monthly rent post-refurb (£)" value={Number((form.brrrInputs as Record<string,unknown>)?.monthlyRent) > 0 ? fc(Number((form.brrrInputs as Record<string,unknown>).monthlyRent)) : ''} onChange={v => setField('brrrInputs.monthlyRent', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              </IGrid>
            </Sec>
          </>
        )}

        {/* R2R */}
        {activeTile === 'r2r' && (
          <Sec title="R2R — lease &amp; sublet details">
            <IGrid>
              <IField label="Monthly rent paid to landlord" value={Number((form.r2rInputs as Record<string,unknown>)?.monthlyRentPaid) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).monthlyRentPaid)) : ''} onChange={v => setField('r2rInputs.monthlyRentPaid', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Rooms" value={String((form.r2rInputs as Record<string,unknown>)?.rooms || '')} onChange={v => setField('r2rInputs.rooms', parseInt(v) || 0)} required />
              <IField label="Rent per room / mo" value={Number((form.r2rInputs as Record<string,unknown>)?.rentPerRoom) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).rentPerRoom)) : ''} onChange={v => setField('r2rInputs.rentPerRoom', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Occupancy rate" value={fp(Number((form.r2rInputs as Record<string,unknown>)?.occupancyRate ?? 90))} onChange={v => setField('r2rInputs.occupancyRate', parseFloat(v) || 90)} />
              <IField label="Management fee %" value={fp(Number((form.r2rInputs as Record<string,unknown>)?.managementFeesPercent ?? 0))} onChange={v => setField('r2rInputs.managementFeesPercent', parseFloat(v) || 0)} />
              <IField label="Monthly running costs" value={Number((form.r2rInputs as Record<string,unknown>)?.monthlyRunningCosts) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).monthlyRunningCosts)) : ''} onChange={v => setField('r2rInputs.monthlyRunningCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Setup costs" value={Number((form.r2rInputs as Record<string,unknown>)?.setupCosts) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).setupCosts)) : ''} onChange={v => setField('r2rInputs.setupCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
              <IField label="Landlord deposit (months)" value={String(form.r2rLandlordDepositMonths ?? '0')} onChange={v => setField('r2rLandlordDepositMonths', parseInt(v) || 0)} />
              <IField label="Lease length (months)" value={String((form.r2rInputs as Record<string,unknown>)?.leaseLengthMonths ?? '')} onChange={v => setField('r2rInputs.leaseLengthMonths', parseInt(v) || 0)} required />
              <ISelect
                label="Sublet type"
                value={String((form.r2rInputs as Record<string,unknown>)?.subletType ?? '')}
                onChange={v => setField('r2rInputs.subletType', v)}
                options={[
                  { value: 'AST', label: 'AST (single tenancy)' },
                  { value: 'HMO', label: 'HMO (multi-tenant)' },
                  { value: 'SA', label: 'Short-term / serviced accommodation' },
                  { value: 'Mixed', label: 'Mixed' },
                ]}
              />
              <IField label="Break clause notice (months)" value={String((form.r2rInputs as Record<string,unknown>)?.breakClauseMonths ?? '')} onChange={v => setField('r2rInputs.breakClauseMonths', parseInt(v) || 0)} />
              <IField label="Annual rent increase in lease (%)" value={Number((form.r2rInputs as Record<string,unknown>)?.annualRentIncrease) >= 0 ? fp(Number((form.r2rInputs as Record<string,unknown>).annualRentIncrease)) : ''} onChange={v => setField('r2rInputs.annualRentIncrease', parseFloat(v) || 0)} />
            </IGrid>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                { key: 'rightToSubletConfirmed', label: 'Right to sublet confirmed in lease?' },
                { key: 'landlordMortgageConsentObtained', label: 'Landlord mortgage consent obtained?' },
              ] as { key: string; label: string }[]).map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'var(--bg-sec)', borderRadius: '8px', border: '.5px solid var(--ds-border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1 }}>{label}</span>
                  <button
                    onClick={() => isEditing && setField(`r2rInputs.${key}`, !(form.r2rInputs as Record<string,unknown>)?.[key])}
                    style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default', background: (form.r2rInputs as Record<string,unknown>)?.[key] ? '#d1fae5' : '#fef2f2', color: (form.r2rInputs as Record<string,unknown>)?.[key] ? '#065f46' : '#991b1b' }}
                  >
                    {(form.r2rInputs as Record<string,unknown>)?.[key] ? '✓ Yes' : '✗ Not yet'}
                  </button>
                </div>
              ))}
            </div>
          </Sec>
        )}

        {/* SOCIAL */}
        {activeTile === 'social' && (
          <Sec title="Social Housing — guaranteed lease">
            <IGrid>
              <IField label="Monthly lease income (£)" value={Number((form.socialInputs as Record<string,unknown>)?.leaseIncomePerMonth) > 0 ? fc(Number((form.socialInputs as Record<string,unknown>).leaseIncomePerMonth)) : ''} onChange={v => setField('socialInputs.leaseIncomePerMonth', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
              <IField label="Lease term (years)" value={String((form.socialInputs as Record<string,unknown>)?.leaseLengthYears || 5)} onChange={v => setField('socialInputs.leaseLengthYears', parseInt(v) || 5)} />
              <IField label="Provider / council name" value={String((form.socialInputs as Record<string,unknown>)?.providerName ?? '')} onChange={v => setField('socialInputs.providerName', v)} />
              <ISelect
                label="Contract type"
                value={String((form.socialInputs as Record<string,unknown>)?.contractType ?? '')}
                onChange={v => setField('socialInputs.contractType', v)}
                options={[
                  { value: 'Guaranteed rent', label: 'Guaranteed rent' },
                  { value: 'Management agreement', label: 'Management agreement' },
                  { value: 'Nomination agreement', label: 'Nomination agreement' },
                  { value: 'Lease agreement', label: 'Lease agreement' },
                ]}
              />
              <ISelect
                label="Rent review mechanism"
                value={String((form.socialInputs as Record<string,unknown>)?.rentReviewMechanism ?? 'Fixed')}
                onChange={v => setField('socialInputs.rentReviewMechanism', v)}
                options={[
                  { value: 'Fixed', label: 'Fixed (no review)' },
                  { value: 'RPI', label: 'RPI linked' },
                  { value: 'CPI', label: 'CPI linked' },
                  { value: 'Annual % increase', label: 'Annual % increase' },
                  { value: 'Market rate review', label: 'Market rate review' },
                ]}
              />
              <IField label="End-of-lease refurb obligation (£)" value={Number((form.socialInputs as Record<string,unknown>)?.endOfLeaseRefurbCost) > 0 ? fc(Number((form.socialInputs as Record<string,unknown>).endOfLeaseRefurbCost)) : ''} onChange={v => setField('socialInputs.endOfLeaseRefurbCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            </IGrid>
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-2)', padding: '6px 10px', background: 'var(--bg-sec)', borderRadius: '6px' }}>
              Social / guaranteed leases typically have 0% void risk and 0% management fee — adjust the Monthly costs section accordingly.
            </div>
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
function ViewWorkings({ p, base, composite, postcode }: { p: ParsedInputs; base: CalcResult; composite: DealScoreResult | null; postcode?: string | null }) {
  // ── Comparables state ──────────────────────────────────────────────────────
  const [compsPostcode, setCompsPostcode] = useState('')
  const [compsLoading, setCompsLoading]   = useState(false)
  const [compsData, setCompsData]         = useState<Array<{
    date: string; price: number; address: string; type: string; tenure: string
  }> | null>(null)
  const [compsError, setCompsError] = useState<string | null>(null)

  useEffect(() => {
    if (postcode) {
      setCompsPostcode(postcode)
      void fetchComps(postcode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postcode])

  async function fetchComps(postcodeOverride?: string) {
    const pc = (postcodeOverride ?? compsPostcode).trim()
    if (!pc) return
    setCompsLoading(true)
    setCompsData(null)
    setCompsError(null)
    try {
      const { data, error } = await supabase.functions.invoke('land-registry-comps', {
        body: { postcode: pc },
      })
      if (error || !data?.success) {
        setCompsError(data?.error || 'Could not load comparables. Check the postcode and try again.')
      } else {
        setCompsData(data.comps || [])
      }
    } catch (_err) {
      setCompsError('Failed to load comparables.')
    } finally {
      setCompsLoading(false)
    }
  }

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

      {/* ── Sold prices nearby (Land Registry) ── */}
      <div style={{
        background: '#fff',
        border: '.5px solid #e3e5e9',
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 16,
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '.5px solid #e3e5e9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2332' }}>
              <i className="ti ti-building-estate" style={{ marginRight: 5, fontSize: 12, color: '#1D9E75' }} />
              Sold prices nearby
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
              Land Registry Price Paid Data · updated monthly
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={compsPostcode}
              onChange={e => setCompsPostcode(e.target.value.toUpperCase())}
              placeholder="e.g. CF24 3BJ"
              style={{
                fontSize: 11,
                padding: '5px 9px',
                border: '.5px solid #e3e5e9',
                borderRadius: 6,
                fontFamily: 'inherit',
                width: 110,
                color: '#1a2332',
                outline: 'none',
              }}
              onKeyDown={e => { if (e.key === 'Enter') void fetchComps() }}
            />
            <button
              onClick={() => void fetchComps()}
              disabled={!compsPostcode.trim() || compsLoading}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '5px 11px',
                borderRadius: 6,
                border: 'none',
                background: compsLoading ? '#9ca3af' : '#1B3A6B',
                color: '#fff',
                cursor: compsLoading ? 'default' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {compsLoading
                ? <><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 11 }} /> Loading</>
                : <><i className="ti ti-search" style={{ fontSize: 11 }} /> Search</>
              }
            </button>
          </div>
        </div>

        {/* Body */}
        {!compsData && !compsError && !compsLoading && (
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
            Enter a postcode above to load recent sold prices from Land Registry
          </div>
        )}

        {compsError && (
          <div style={{ padding: '14px 16px', fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />
            {compsError}
          </div>
        )}

        {compsData && compsData.length === 0 && (
          <div style={{ padding: '14px 16px', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
            No sold prices found for {compsPostcode} — try a nearby postcode
          </div>
        )}

        {compsData && compsData.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            {/* Summary row */}
            <div style={{
              padding: '8px 16px',
              background: '#f5f6f8',
              borderBottom: '.5px solid #e3e5e9',
              display: 'flex',
              gap: 20,
              fontSize: 11,
              color: '#5a6270',
            }}>
              <span><strong style={{ color: '#1a2332' }}>{compsData.length}</strong> sales found</span>
              <span>Avg: <strong style={{ color: '#1B3A6B' }}>
                £{Math.round(compsData.reduce((s, c) => s + c.price, 0) / compsData.length).toLocaleString('en-GB')}
              </strong></span>
              <span>Range: <strong style={{ color: '#1B3A6B' }}>
                £{Math.min(...compsData.map(c => c.price)).toLocaleString('en-GB')} – £{Math.max(...compsData.map(c => c.price)).toLocaleString('en-GB')}
              </strong></span>
              <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 10 }}>
                Data © HM Land Registry
              </span>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f5f6f8' }}>
                  {['Date', 'Price', 'Address', 'Type', 'Tenure'].map(h => (
                    <th key={h} style={{
                      padding: '7px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#5a6270',
                      fontSize: 10,
                      borderBottom: '.5px solid #e3e5e9',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compsData.slice(0, 20).map((comp, i) => (
                  <tr key={i} style={{ borderBottom: '.5px solid #f0f1f3' }}>
                    <td style={{ padding: '7px 12px', color: '#5a6270', whiteSpace: 'nowrap' }}>
                      {comp.date ? new Date(comp.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '7px 12px', fontWeight: 600, color: '#1B3A6B', whiteSpace: 'nowrap' }}>
                      £{comp.price?.toLocaleString('en-GB') ?? '—'}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#1a2332', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {comp.address}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#5a6270', whiteSpace: 'nowrap' }}>{comp.type || '—'}</td>
                    <td style={{ padding: '7px 12px', color: '#5a6270', whiteSpace: 'nowrap' }}>{comp.tenure || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {compsData.length > 20 && (
              <div style={{ padding: '8px 16px', fontSize: 10, color: '#9ca3af', borderTop: '.5px solid #f0f1f3', textAlign: 'center' }}>
                Showing 20 of {compsData.length} results — refine your postcode to narrow results
              </div>
            )}
          </div>
        )}
      </div>
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
          deal={deal}
          onSave={onSave}
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
        <ViewWorkings p={p} base={base} composite={composite} postcode={deal.postcode} />
      )}

    </div>
  )
}
