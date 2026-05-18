import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Link } from '@react-pdf/renderer';
import { DEALSCORE_BRAND } from '@/config/brandConfig';
import {
  calculateBTL,
  calculateHMO,
  calculateFlip,
  calculateSA,
  calculateBRRR,
  calculateR2R,
  calculateSocialHousing,
  type DealType,
  type R2RInputs,
} from '@/lib/calculations';

type BTLResults = ReturnType<typeof calculateBTL>;
type HMOResults = ReturnType<typeof calculateHMO>;
type FlipResults = ReturnType<typeof calculateFlip>;
type SAResults = ReturnType<typeof calculateSA>;
type BRRRResults = ReturnType<typeof calculateBRRR>;
type R2RResults = ReturnType<typeof calculateR2R>;
type SocialResults = ReturnType<typeof calculateSocialHousing>;
type DealScore = 'Strong' | 'Average' | 'Weak' | 'Incomplete';

export interface DealScorePDFProps {
  dealType: DealType;
  dateStr: string;
  propertyAddress: string;
  propertyType: string;
  tenure: 'Freehold' | 'Leasehold';
  leaseLengthYears: number;
  epcRating: string | null;
  floodRisk: string | null;
  floorArea: number | null;
  constructionDate: string | null;
  purchasePrice: number;
  effectiveTax: number;
  taxLabel: string;
  taxCountryLabel: string;
  buyerLabel: string;
  refurbCost: number;
  otherCosts: number;
  depositPercent: number;
  mortgageRate: number;
  mortgageType: 'IO' | 'REPAYMENT';
  mortgageTerm: number;
  marketValue: number;
  sourcingFee: number;
  sourcingFeeDisclaimer: string;
  equityDayOne: number;
  bmvAmount: number;
  bmvPercent: number;
  preparedBy: { name: string; email: string; phone: string };
  logoBase64: string | null;
  brandColour: string;
  logoSize: 'S' | 'M' | 'L';
  coverStyle: 'classic' | 'clean' | 'bold';
  tierOverride: 'free' | 'pro' | 'pro_plus';
  btlInputs: { monthlyRent: number; monthlyExpenses: number };
  hmoInputs: { rooms: number; rentPerRoom: number; occupancyRate: number; monthlyExpenses: number };
  flipInputs: { holdingCostsPerMonth: number; projectLengthMonths: number; expectedSalePrice: number; sellingCostsPercent: number };
  saInputs: { nightlyRate: number; occupancyPercent: number; platformFeesPercent: number; monthlyRunningCosts: number };
  brrrInputs: { postRefurbValue: number; refinancePercent: number; newMortgageRate: number; monthlyRent: number; monthlyExpenses: number };
  r2rInputs: R2RInputs;
  socialInputs: { leaseIncomePerMonth: number; leaseLengthYears: number; managementCostsPerMonth: number };
  btlResults: BTLResults;
  hmoResults: HMOResults;
  flipResults: FlipResults;
  saResults: SAResults;
  brrrResults: BRRRResults;
  r2rResults: R2RResults;
  socialResults: SocialResults;
  currentScore: DealScore;
  riskFlags: string[];
  capitalGrowthRating?: number;
  tenantDemandRating?: number;
  accentColour: string;
  companyName: string;
  executiveSummary: string;
  strategyNotes: string;
  propertyDescription: string;
  vendorSituation: string;
  comparables: Array<{ address: string; bedsType: string; dateSold: string; price: string }>;
  listingLinks: Array<{ label: string; url: string }>;
  photoFiles: string[];
  heroPhotoIndex: number;
  stressTest?: {
    baseCashFlow: number;
    baseCoC: number;
    rentDownCashFlow: number;
    rentDownCoC: number;
    rateUpCashFlow: number;
    rateUpCoC: number;
  };
  includeWorkings?: boolean;
  managementFeePercent?: number;
  voidAllowancePercent?: number;
  maintenanceReserve?: number;
  buildingsInsurance?: number;
  serviceCharge?: number;
  groundRentAnnual?: number;
}

const fc = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const fp = (n: number) => n.toFixed(1) + '%';

const SCORE_COLOR: Record<string, string> = {
  Strong: '#16a34a',
  Average: '#d97706',
  Weak: '#dc2626',
};

const SCORE_TINT: Record<string, string> = {
  Strong: 'rgba(22, 163, 74, 0.09)',
  Average: 'rgba(217, 119, 6, 0.09)',
  Weak: 'rgba(220, 38, 38, 0.09)',
};

const VERDICT_LABELS: Record<string, string> = {
  Strong: 'Recommended',
  Average: 'Conditional',
  Weak: 'Not Recommended',
};

const DEAL_LABELS: Record<DealType, string> = {
  BTL: 'Buy-to-Let Analysis',
  HMO: 'HMO Analysis',
  FLIP: 'Flip / Refurb Analysis',
  SA: 'Serviced Accommodation Analysis',
  BRRR: 'BRRR Analysis',
  R2R: 'Rent to Rent Analysis',
  SOCIAL: 'Social Housing Analysis',
};

// ── FIX 1: Contrast-safety helpers ───────────────────────────────────────────

/** Returns relative luminance of a hex colour (0 = black, 1 = white) */
function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Returns white or dark text colour depending on background luminance */
function getContrastText(bgHex: string): string {
  return getLuminance(bgHex) > 0.35 ? '#1A1A1A' : '#FFFFFF';
}

/** Returns a readable version of the brand colour for use as TEXT on white background.
 *  If brand is too light (luminance > 0.6) it darkens by 40% blend toward black. */
function getReadableBrandColour(hex: string): string {
  if (getLuminance(hex) <= 0.6) return hex;
  const clean = hex.replace('#', '');
  const r = Math.round(parseInt(clean.substring(0, 2), 16) * 0.6);
  const g = Math.round(parseInt(clean.substring(2, 4), 16) * 0.6);
  const b = Math.round(parseInt(clean.substring(4, 6), 16) * 0.6);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Returns a muted/semi-transparent-equivalent colour for cover page text.
 *  Uses rgba so it works on the brand-coloured background. */
function coverMuted(bgHex: string, opacity: number): string {
  const isDark = getLuminance(bgHex) <= 0.35;
  return isDark
    ? `rgba(255,255,255,${opacity})`
    : `rgba(26,26,26,${opacity})`;
}

/** Darkens a hex colour by blending toward black by `amount` (0–1). */
function darkenColour(hex: string, amount: number = 0.5): string {
  const clean = hex.replace('#', '');
  const r = Math.round(parseInt(clean.substring(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(clean.substring(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(clean.substring(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ── Address abbreviation expansion ──────────────────────────────────────────

const noBreakHyphens = (str: string) => str ? str.replace(/-/g, '\u2011') : str;

function expandAddress(address: string): string {
  let s = address;
  // Cl and St only when preceded by an alphanumeric character (prevents "St Mary's" → "Street Mary's")
  s = s.replace(/([A-Za-z0-9]) Cl\b/g, '$1 Close');
  s = s.replace(/([A-Za-z0-9]) St\b/g, '$1 Street');
  const simple: Array<[RegExp, string]> = [
    [/\bRd\b/g, 'Road'],
    [/\bAve\b/g, 'Avenue'],
    [/\bDr\b/g, 'Drive'],
    [/\bLn\b/g, 'Lane'],
    [/\bCt\b/g, 'Court'],
    [/\bPl\b/g, 'Place'],
    [/\bSq\b/g, 'Square'],
    [/\bCres\b/g, 'Crescent'],
    [/\bGdns\b/g, 'Gardens'],
    [/\bGr\b/g, 'Grove'],
    [/\bPk\b/g, 'Park'],
    [/\bTer\b/g, 'Terrace'],
    [/\bVw\b/g, 'View'],
    [/\bWk\b/g, 'Walk'],
    [/\bWy\b/g, 'Way'],
    [/\bBlvd\b/g, 'Boulevard'],
  ];
  for (const [re, full] of simple) s = s.replace(re, full);
  return s;
}

function splitAddressThreeLines(address: string): [string, string, string] {
  const postcodeRegex = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/;
  const postcodeMatch = address.match(postcodeRegex);
  const postcode = postcodeMatch ? postcodeMatch[0] : '';
  const withoutPostcode = address.replace(postcode, '').replace(/,\s*$/, '').trim();
  const parts = withoutPostcode.split(',').map(s => s.trim()).filter(Boolean);

  if (parts.length === 0) return [address, '', ''];
  if (parts.length === 1) return [parts[0], '', postcode];

  const city = parts[parts.length - 1];
  const streetParts = parts.slice(0, -1);
  const street = streetParts.join(', ');

  return [street, city, postcode];
}

// ── PDF text sanitiser (strips non-WinAnsi chars such as emoji) ──────────────

function sanitizePdfText(s: string): string {
  return s.replace(/[^\u0020-\u00FF]/g, '').trim();
}

// ── Comparables formatter ────────────────────────────────────────────────────

function formatComparables(text: string): string {
  let s = text.trim();
  s = s.replace(/ - /g, ' — ');
  s = s.replace(/\b(\d+)\s*[Kk]\b/g, (_, n) => '£' + (parseInt(n, 10) * 1000).toLocaleString('en-GB'));
  s = s.replace(/\b(\d{5,6})\b/g, (_, n) => '£' + parseInt(n, 10).toLocaleString('en-GB'));
  return s;
}

type RowData = [string, string, boolean?];

// ── Page 3 helpers ───────────────────────────────────────────────────────────

interface ScoreDimension { name: string; score: number; weight: number; }

function computeDealScoreBreakdown(props: DealScorePDFProps): { dims: ScoreDimension[]; overall: number } {
  const dt = props.dealType;

  let yieldScore: number;
  if (dt === 'SA') {
    const ny = props.saResults.netYield;
    yieldScore = ny >= 15 ? 10 : ny >= 10 ? 7 : ny >= 7 ? 4 : 1;
  } else if (dt === 'FLIP' || dt === 'BRRR' || dt === 'R2R') {
    yieldScore = 7;
  } else {
    const gy = dt === 'BTL' ? props.btlResults.grossYield
             : dt === 'HMO' ? props.hmoResults.grossYield
             : props.socialResults.grossYield;
    yieldScore = gy >= 8 ? 10 : gy >= 6 ? 7 : gy >= 4 ? 4 : 1;
  }

  let cf: number;
  if (dt === 'BTL') cf = props.btlResults.monthlyCashFlow;
  else if (dt === 'HMO') cf = props.hmoResults.monthlyCashFlow;
  else if (dt === 'FLIP') cf = props.flipResults.profitPerMonth;
  else if (dt === 'SA') cf = props.saResults.monthlyCashFlow;
  else if (dt === 'BRRR') cf = props.brrrResults.monthlyCashFlow;
  else if (dt === 'R2R') cf = props.r2rResults.monthlyProfit;
  else cf = props.socialResults.monthlyCashFlow;
  const cfScore = cf >= 500 ? 10 : cf >= 200 ? 7 : cf >= 0 ? 4 : 1;

  const cgScore = Math.min(10, Math.max(1, props.capitalGrowthRating ?? 5));
  const tdScore = Math.min(10, Math.max(1, props.tenantDemandRating ?? 5));

  let dsScore: number;
  if (dt === 'BTL' || dt === 'HMO' || dt === 'SOCIAL') {
    const dep = props.depositPercent;
    dsScore = dep <= 20 ? 10 : dep <= 25 ? 7 : dep <= 30 ? 4 : 1;
  } else if (dt === 'BRRR') {
    const cli = props.brrrResults.cashLeftInDeal;
    dsScore = cli <= 5000 ? 10 : cli <= 10000 ? 7 : cli <= 25000 ? 4 : 1;
  } else if (dt === 'FLIP') {
    const roi = props.flipResults.roi;
    dsScore = roi >= 15 ? 10 : roi >= 12 ? 7 : roi >= 8 ? 4 : 1;
  } else {
    dsScore = 7;
  }

  const rpScore = props.currentScore === 'Strong' ? 10 : props.currentScore === 'Average' ? 5 : 2;

  const dims: ScoreDimension[] = [
    { name: 'Gross Yield', score: yieldScore, weight: 0.20 },
    { name: 'Net Cash Flow', score: cfScore, weight: 0.25 },
    { name: 'Capital Growth Potential', score: cgScore, weight: 0.20 },
    { name: 'Tenant Demand', score: tdScore, weight: 0.15 },
    { name: 'Deal Structure', score: dsScore, weight: 0.10 },
    { name: 'Risk Profile', score: rpScore, weight: 0.10 },
  ];
  const overall = dims.reduce((sum, d) => sum + d.score * d.weight, 0);
  return { dims, overall };
}

function generateVerdictSummary(props: DealScorePDFProps): string {
  const dt = props.dealType;
  if (props.currentScore === 'Incomplete') return '';
  const vl = VERDICT_LABELS[props.currentScore] ?? '';
  const sn = DEAL_LABELS[dt].replace(' Analysis', '');

  if (dt === 'FLIP') {
    const r = props.flipResults;
    if (props.currentScore === 'Strong')
      return `This deal scores ${vl} based on a net profit of ${fc(r.netProfit)}, ROI of ${fp(r.roi)}, and annualised ROI of ${fp(r.annualisedROI)} — all above threshold for ${sn}.`;
    if (props.currentScore === 'Average')
      return `This deal scores ${vl} — net profit of ${fc(r.netProfit)} is achievable, though ROI of ${fp(r.roi)} is below the 12% benchmark for ${sn}.`;
    return `This deal scores ${vl} — net profit of ${fc(r.netProfit)} and ROI of ${fp(r.roi)} fall below the minimum thresholds for ${sn}.`;
  }
  if (dt === 'R2R') {
    const r = props.r2rResults;
    const spread = r.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid;
    if (props.currentScore === 'Strong')
      return `This deal scores ${vl} based on monthly profit of ${fc(r.monthlyProfit)} and monthly spread of ${fc(spread)} — above threshold for ${sn}.`;
    if (props.currentScore === 'Average')
      return `This deal scores ${vl} — monthly spread of ${fc(spread)} is positive, though monthly profit of ${fc(r.monthlyProfit)} is below the benchmark for ${sn}.`;
    return `This deal scores ${vl} — monthly profit of ${fc(r.monthlyProfit)} falls below the minimum thresholds for ${sn}.`;
  }
  if (dt === 'SA') {
    const r = props.saResults;
    if (props.currentScore === 'Strong')
      return `This deal scores ${vl} based on a net yield of ${fp(r.netYield)}, strong monthly cash flow of ${fc(r.monthlyCashFlow)}, and ${props.saInputs.occupancyPercent}% occupancy — all above threshold for ${sn}.`;
    if (props.currentScore === 'Average')
      return `This deal scores ${vl} — net yield of ${fp(r.netYield)} meets threshold, though monthly cash flow of ${fc(r.monthlyCashFlow)} is below the benchmark for ${sn}.`;
    return `This deal scores ${vl} — net yield of ${fp(r.netYield)} and monthly cash flow of ${fc(r.monthlyCashFlow)} fall below the minimum thresholds for ${sn}.`;
  }
  if (dt === 'BRRR') {
    const r = props.brrrResults;
    const moneyOut = r.moneyOut && props.purchasePrice > 0;
    if (props.currentScore === 'Strong')
      return `This deal scores ${vl} — ${moneyOut ? 'money out on refinance' : `cash left in of ${fc(r.cashLeftInDeal)}`}, monthly cash flow of ${fc(r.monthlyCashFlow)}, and equity of ${fc(r.equityCreated)} created — all above threshold for ${sn}.`;
    if (props.currentScore === 'Average')
      return `This deal scores ${vl} — refinance recovers most capital, though monthly cash flow of ${fc(r.monthlyCashFlow)} is below the benchmark for ${sn}.`;
    return `This deal scores ${vl} — cash left in deal and monthly cash flow of ${fc(r.monthlyCashFlow)} fall below the minimum thresholds for ${sn}.`;
  }
  const r = dt === 'BTL' ? props.btlResults : dt === 'HMO' ? props.hmoResults : props.socialResults;
  const gy = r.grossYield; const cf2 = r.monthlyCashFlow; const roi = r.cashOnCashROI;
  if (props.currentScore === 'Strong') {
    const cfWord = cf2 >= 500 ? 'strong' : 'positive';
    return `This deal scores ${vl} based on a gross yield of ${fp(gy)}, ${cfWord} monthly cash flow of ${fc(cf2)}, and a cash-on-cash ROI of ${fp(roi)} — all above threshold for ${sn}.`;
  }
  if (props.currentScore === 'Average') {
    if (gy >= 6) return `This deal scores ${vl} — gross yield meets threshold at ${fp(gy)}, though monthly cash flow of ${fc(cf2)} is below the benchmark for ${sn}.`;
    return `This deal scores ${vl} — monthly cash flow of ${fc(cf2)} is achievable, though gross yield of ${fp(gy)} falls below the 6% benchmark for ${sn}.`;
  }
  return `This deal scores ${vl} — gross yield of ${fp(gy)} and monthly cash flow of ${fc(cf2)} fall below the minimum thresholds for ${sn}.`;
}

function computeCalloutMetrics(props: DealScorePDFProps): { label: string; value: string }[] {
  const dt = props.dealType;
  if (dt === 'BTL') return [
    { label: 'Gross Yield', value: fp(props.btlResults.grossYield) },
    { label: 'Monthly Cash Flow', value: fc(props.btlResults.monthlyCashFlow) },
    { label: 'Cash-on-Cash ROI', value: fp(props.btlResults.cashOnCashROI) },
  ];
  if (dt === 'HMO') return [
    { label: 'Gross Yield', value: fp(props.hmoResults.grossYield) },
    { label: 'Monthly Cash Flow', value: fc(props.hmoResults.monthlyCashFlow) },
    { label: 'Mortgage Amount', value: fc(props.hmoResults.mortgageAmount) },
  ];
  if (dt === 'FLIP') {
    const margin = props.flipInputs.expectedSalePrice > 0
      ? props.flipResults.netProfit / props.flipInputs.expectedSalePrice * 100 : 0;
    return [
      { label: 'Net Profit', value: fc(props.flipResults.netProfit) },
      { label: 'ROI', value: fp(props.flipResults.roi) },
      { label: 'Net Margin', value: fp(margin) },
    ];
  }
  if (dt === 'SA') return [
    { label: 'Net Yield', value: fp(props.saResults.netYield) },
    { label: 'Monthly Cash Flow', value: fc(props.saResults.monthlyCashFlow) },
    { label: 'Occupancy Rate', value: `${props.saInputs.occupancyPercent.toFixed(0)}%` },
  ];
  if (dt === 'BRRR') return [
    { label: 'Cash Left In', value: (props.brrrResults.moneyOut && props.purchasePrice > 0) ? 'Money Out' : fc(props.brrrResults.cashLeftInDeal) },
    { label: 'Monthly Cash Flow', value: fc(props.brrrResults.monthlyCashFlow) },
    { label: 'Refinance Amount', value: fc(props.brrrResults.refinanceLoan) },
  ];
  if (dt === 'R2R') {
    const spread = props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid;
    return [
      { label: 'Monthly Profit', value: fc(props.r2rResults.monthlyProfit) },
      { label: 'Monthly Spread', value: fc(spread) },
      { label: 'Setup Costs', value: fc(props.r2rInputs.setupCosts) },
    ];
  }
  return [
    { label: 'Cash-on-Cash ROI', value: fp(props.socialResults.cashOnCashROI) },
    { label: 'Monthly Cash Flow', value: fc(props.socialResults.monthlyCashFlow) },
    { label: 'Gross Yield', value: fp(props.socialResults.grossYield) },
  ];
}

function generateWhatThisMeans(props: DealScorePDFProps): string {
  const dt = props.dealType;
  if (dt === 'BTL') {
    const r = props.btlResults;
    const monthlyMortgage = Math.max(0, props.btlInputs.monthlyRent - r.monthlyCashFlow - props.btlInputs.monthlyExpenses);
    const mortgageTypeStr = props.mortgageType === 'IO' ? 'interest-only' : 'repayment';
    const yieldVs = r.grossYield >= 6 ? 'exceeds' : 'falls short of';
    return `At a ${props.depositPercent}% deposit on a ${fc(props.purchasePrice)} purchase, total cash invested is ${fc(r.totalCashInvested)}. The ${mortgageTypeStr} mortgage at ${props.mortgageRate}% produces a monthly payment of ${fc(monthlyMortgage)}, leaving ${fc(r.monthlyCashFlow)} net cash flow after expenses. Gross yield of ${fp(r.grossYield)} ${yieldVs} the 6% benchmark for this market.`;
  }
  if (dt === 'HMO') {
    const r = props.hmoResults;
    const yieldVs = r.grossYield >= 8 ? 'exceeds' : 'falls short of';
    return `At a ${props.depositPercent}% deposit on a ${fc(props.purchasePrice)} purchase, ${props.hmoInputs.rooms} rooms at ${fc(props.hmoInputs.rentPerRoom)}/mo generate gross monthly income of ${fc(r.grossMonthlyRent)} at ${props.hmoInputs.occupancyRate}% occupancy. After mortgage and expenses, net cash flow is ${fc(r.monthlyCashFlow)}. Gross yield of ${fp(r.grossYield)} ${yieldVs} the 8% benchmark typically required for HMO.`;
  }
  if (dt === 'FLIP') {
    const r = props.flipResults;
    const roiVs = r.roi >= 12 ? 'exceeds' : 'falls short of';
    return `Total project cost of ${fc(r.totalCost)} against a sale price of ${fc(props.flipInputs.expectedSalePrice)} produces a net profit of ${fc(r.netProfit)} over ${props.flipInputs.projectLengthMonths} months. ROI of ${fp(r.roi)} ${roiVs} the 12% minimum threshold. Annualised ROI of ${fp(r.annualisedROI)}.`;
  }
  if (dt === 'SA') {
    const r = props.saResults;
    const yieldVs = r.netYield >= 10 ? 'exceeds' : 'falls short of';
    return `At ${props.saInputs.occupancyPercent}% occupancy and ${fc(props.saInputs.nightlyRate)}/night, gross monthly revenue is ${fc(r.grossMonthlyRevenue)}. After platform fees and running costs, net monthly cash flow is ${fc(r.monthlyCashFlow)}. Net yield of ${fp(r.netYield)} ${yieldVs} the 10% benchmark for serviced accommodation.`;
  }
  if (dt === 'BRRR') {
    const r = props.brrrResults;
    const moneyOut = r.moneyOut && props.purchasePrice > 0;
    const cashStr = moneyOut
      ? `This deal is money out — all capital returned plus ${fc(Math.abs(r.cashLeftInDeal))} surplus.`
      : `Cash left in deal is ${fc(r.cashLeftInDeal)}.`;
    return `Total cash in is ${fc(r.totalCostIn)}, refinanced at ${props.brrrInputs.refinancePercent}% of GDV (${fc(props.brrrInputs.postRefurbValue)}), releasing ${fc(r.refinanceLoan)}. ${cashStr} Monthly cash flow after the refinance mortgage is ${fc(r.monthlyCashFlow)}.`;
  }
  if (dt === 'R2R') {
    const r = props.r2rResults;
    const spread = r.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid;
    const paybackMonths = r.monthlyProfit > 0 ? Math.ceil(props.r2rInputs.setupCosts / r.monthlyProfit) : 0;
    const paybackStr = paybackMonths > 0 ? `${paybackMonths} months` : 'not applicable at current profit';
    return `Monthly rent to landlord of ${fc(props.r2rInputs.monthlyRentPaid)}, sub-let for ${fc(r.grossMonthlyIncome)}, generating a monthly spread of ${fc(spread)}. After management fees and running costs, monthly profit is ${fc(r.monthlyProfit)}. Setup costs of ${fc(props.r2rInputs.setupCosts)} recover in ${paybackStr}.`;
  }
  const r = props.socialResults;
  const yieldVs = r.grossYield >= 6 ? 'exceeds' : 'falls short of';
  return `At a ${props.depositPercent}% deposit on a ${fc(props.purchasePrice)} purchase, total cash invested is ${fc(r.totalCashInvested)}. Guaranteed lease income of ${fc(props.socialInputs.leaseIncomePerMonth)}/mo over a ${props.socialInputs.leaseLengthYears}-year term produces monthly cash flow of ${fc(r.monthlyCashFlow)}. Gross yield of ${fp(r.grossYield)} ${yieldVs} the 6% benchmark for social housing strategy.`;
}

const base = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingTop: 40,
    paddingBottom: 65,
    paddingHorizontal: 40,
    fontSize: 10,
    color: '#333333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 6,
  },
  tableRowAlt: { backgroundColor: '#f5f7fa' },
  tableLabel: { flex: 1, fontSize: 9, color: '#555555', fontFamily: 'Helvetica' },
  tableValue: { fontSize: 9, color: '#333333', fontFamily: 'Helvetica', textAlign: 'right' },
  // FIX 2: bold result highlights use fixed navy, not brand colour
  tableValueHighlight: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1B3A6B', textAlign: 'right' },
  heroRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  heroCard: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    border: '0.5pt solid #d4dae8',
  },
  heroValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#333333', textAlign: 'center' },
  heroLabel: { fontSize: 8, color: '#666666', textAlign: 'center', marginTop: 4 },
  riskFlag: {
    backgroundColor: '#fef3c7',
    border: '0.5pt solid #fbbf24',
    borderRadius: 3,
    padding: 6,
    marginBottom: 4,
  },
  riskFlagText: { fontSize: 8.5, color: '#92400e', fontFamily: 'Helvetica', lineHeight: 1.4 },
  notePanel: { backgroundColor: '#f5f7fa', borderRadius: 3, padding: 10, marginBottom: 8 },
  notePanelLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  notePanelText: { fontSize: 9, color: '#444444', lineHeight: 1.5 },
  pageFooter: {
    position: 'absolute',
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderTop: '0.5pt solid #e2e8f0',
    paddingTop: 6,
  },
  footerLeft: { flex: 1, fontSize: 7.5, color: '#9ca3af', fontFamily: 'Helvetica' },
  footerCentre: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  footerRight: { flex: 1, fontSize: 7.5, color: '#9ca3af', fontFamily: 'Helvetica', textAlign: 'right' },
  calloutCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
  },
  calloutLabel: { fontSize: 8, color: '#6B7280', marginBottom: 4 },
  calloutValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' },
});

export default function DealScorePDF(props: DealScorePDFProps) {
  console.log('[DealScorePDF] props:', props);

  const brand = props.brandColour;
  const coverBg = darkenColour(brand, 0.4);           // darkened brand for cover backgrounds
  const readableBrand = getReadableBrandColour(brand); // brand colour safe as TEXT on white
  const coverBgText = getContrastText(coverBg);        // text colour on darkened cover bg
  const isProPlus = props.tierOverride === 'pro_plus';
  const accent = props.accentColour;

  const LOGO_H: Record<'S' | 'M' | 'L', number> = { S: 35, M: 60, L: 100 };
  const LOGO_MAX_W: Record<'S' | 'M' | 'L', number> = { S: 100, M: 170, L: 280 };
  const logoHeight = LOGO_H[props.logoSize];
  const logoMaxWidth = LOGO_MAX_W[props.logoSize];

  const addressPlain = expandAddress(props.propertyAddress || '') || props.propertyAddress || 'Property Address Not Entered';
  const address = addressPlain;
  const addressForCover = address;
  const postcodeMatch = addressForCover.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/);
  const addressLine1 = postcodeMatch
    ? addressForCover.replace(postcodeMatch[0], '').replace(/,\s*$/, '').trim()
    : addressForCover;
  const addressLine2 = postcodeMatch ? postcodeMatch[0] : '';
  const [boldLine1, boldLine2, boldLine3] = splitAddressThreeLines(addressForCover);

  // ── Sub-components ──────────────────────────────────────────────────────────

  // Section header: brand used for title text (on white) + underline rule
  const SH = ({ title }: { title: string }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: readableBrand, marginBottom: 4 }}>{title}</Text>
      <View style={{ borderBottom: `1pt solid ${isProPlus ? accent : brand}` }} />
    </View>
  );

  // FIX 2: bold rows use fixed #1B3A6B (navy) — never the dynamic brand colour
  const Table = ({ rows }: { rows: RowData[] }) => (
    <View style={{ marginBottom: 14 }}>
      {rows.map(([label, value, bold], i) => (
        <View key={i} style={[base.tableRow, i % 2 === 0 ? base.tableRowAlt : {}]}>
          <Text style={base.tableLabel}>{label}</Text>
          <Text style={bold ? base.tableValueHighlight : base.tableValue}>{value}</Text>
        </View>
      ))}
    </View>
  );

  const WPdfRow = ({ lbl, val, bold, clr }: { lbl: string; val: string; bold?: boolean; clr?: string }) => (
    <View style={bold
      ? { flexDirection: 'row', paddingVertical: 3, borderTop: '0.5pt solid #E5E7EB', marginTop: 2 }
      : { flexDirection: 'row', paddingVertical: 2 }
    }>
      <Text style={{ flex: 1.6, fontSize: 8.5, fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica', color: clr ?? (bold ? '#1B3A6B' : '#374151') }}>{lbl}</Text>
      <Text style={{ fontSize: 8.5, fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica', color: clr ?? (bold ? '#1B3A6B' : '#1E2B3C'), textAlign: 'right' }}>{val}</Text>
    </View>
  );
  const WPdfSec = ({ title }: { title: string }) => (
    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1B3A6B', marginTop: 7, marginBottom: 2 }}>{title}</Text>
  );

  // FIX 2: hero metric values use #333333, not brand colour
  const Hero = ({ metrics }: { metrics: { label: string; value: string }[] }) => (
    <View style={base.heroRow}>
      {metrics.map(({ label, value }) => (
        <View key={label} style={base.heroCard}>
          <Text style={base.heroValue}>{value}</Text>
          <Text style={base.heroLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );

  // Footer: centre text is sourcer brand for pro_plus, DealScore for pro
  const footerCentreText = isProPlus
    ? props.companyName.trim()
    : 'DealScore';

  const Footer = () => (
    <View style={base.pageFooter} fixed>
      <Text style={base.footerLeft}>{props.dateStr}</Text>
      <Text style={[base.footerCentre, { color: '#9ca3af' }]}>{footerCentreText}</Text>
      <Text
        style={base.footerRight}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );

  const tenureRows: RowData[] = [
    ['Tenure', props.tenure],
    ...(props.tenure === 'Leasehold' && props.leaseLengthYears > 0
      ? [['Remaining Lease Length', `${props.leaseLengthYears} years`] as RowData]
      : []),
  ];

  const inputRows: RowData[] = (() => {
    const rows: RowData[] = [];
    if (props.dealType === 'BTL') {
      rows.push(
        ['Purchase Price', fc(props.purchasePrice)],
        [`${props.taxLabel} (${props.taxCountryLabel}, ${props.buyerLabel})`, fc(props.effectiveTax)],
        ['Refurb Cost', fc(props.refurbCost)],
        ['Other Costs', fc(props.otherCosts)],
        ['Deposit', `${props.depositPercent}%`],
        ['Mortgage Rate', `${props.mortgageRate}%`],
        ['Mortgage Type', props.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ...(props.mortgageType === 'REPAYMENT' ? [['Mortgage Term', `${props.mortgageTerm} years`] as RowData] : []),
        ['Monthly Rent', fc(props.btlInputs.monthlyRent)],
        ['Monthly Expenses', fc(props.btlInputs.monthlyExpenses)],
        ...tenureRows,
      );
    } else if (props.dealType === 'HMO') {
      rows.push(
        ['Purchase Price', fc(props.purchasePrice)],
        [`${props.taxLabel} (${props.taxCountryLabel}, ${props.buyerLabel})`, fc(props.effectiveTax)],
        ['Refurb / Conversion Cost', fc(props.refurbCost)],
        ['Other Costs', fc(props.otherCosts)],
        ['Deposit', `${props.depositPercent}%`],
        ['Mortgage Rate', `${props.mortgageRate}%`],
        ['Mortgage Type', props.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ['Rooms', `${props.hmoInputs.rooms}`],
        ['Rent per Room (monthly)', fc(props.hmoInputs.rentPerRoom)],
        ['Occupancy Rate', `${props.hmoInputs.occupancyRate}%`],
        ['Monthly Expenses', fc(props.hmoInputs.monthlyExpenses)],
        ...tenureRows,
      );
    } else if (props.dealType === 'FLIP') {
      rows.push(
        ['Purchase Price', fc(props.purchasePrice)],
        [`${props.taxLabel} (${props.taxCountryLabel}, ${props.buyerLabel.replace(' / Buy-to-Let', '')})`, fc(props.effectiveTax)],
        ['Refurb Cost', fc(props.refurbCost)],
        ['Other Costs', fc(props.otherCosts)],
        ['Holding Costs (per month)', fc(props.flipInputs.holdingCostsPerMonth)],
        ['Project Length', `${props.flipInputs.projectLengthMonths} months`],
        ['Expected Sale Price (GDV)', fc(props.flipInputs.expectedSalePrice)],
        ['Selling Costs', `${props.flipInputs.sellingCostsPercent}%`],
        ...tenureRows,
      );
    } else if (props.dealType === 'SA') {
      rows.push(
        ['Purchase Price', fc(props.purchasePrice)],
        [`${props.taxLabel} (${props.taxCountryLabel}, ${props.buyerLabel})`, fc(props.effectiveTax)],
        ['Refurb Cost', fc(props.refurbCost)],
        ['Other Costs', fc(props.otherCosts)],
        ['Deposit', `${props.depositPercent}%`],
        ['Mortgage Rate', `${props.mortgageRate}%`],
        ['Mortgage Type', props.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ['Nightly Rate', fc(props.saInputs.nightlyRate)],
        ['Avg Occupancy', `${props.saInputs.occupancyPercent}%`],
        ['Platform Fees', `${props.saInputs.platformFeesPercent}%`],
        ['Monthly Running Costs', fc(props.saInputs.monthlyRunningCosts)],
        ...tenureRows,
      );
    } else if (props.dealType === 'BRRR') {
      rows.push(
        ['Purchase Price', fc(props.purchasePrice)],
        [`${props.taxLabel} (${props.taxCountryLabel}, ${props.buyerLabel})`, fc(props.effectiveTax)],
        ['Refurb Cost', fc(props.refurbCost)],
        ['Other Costs', fc(props.otherCosts)],
        ['Post-Refurb Value (GDV)', fc(props.brrrInputs.postRefurbValue)],
        ['Refinance %', `${props.brrrInputs.refinancePercent}%`],
        ['New Mortgage Rate', `${props.brrrInputs.newMortgageRate}%`],
        ['Monthly Rent', fc(props.brrrInputs.monthlyRent)],
        ['Monthly Expenses', fc(props.brrrInputs.monthlyExpenses)],
        ...tenureRows,
      );
    } else if (props.dealType === 'R2R') {
      rows.push(
        ['Monthly Rent to Landlord', fc(props.r2rInputs.monthlyRentPaid)],
        ['Rooms', `${props.r2rInputs.rooms}`],
        ['Rent per Room (monthly)', fc(props.r2rInputs.rentPerRoom)],
        ['Occupancy Rate', `${props.r2rInputs.occupancyRate}%`],
        ['Management / Platform Fees', `${props.r2rInputs.managementFeesPercent}%`],
        ['Monthly Running Costs', fc(props.r2rInputs.monthlyRunningCosts)],
        ['Setup Costs', fc(props.r2rInputs.setupCosts)],
        ...tenureRows,
      );
    } else {
      rows.push(
        ['Purchase Price', fc(props.purchasePrice)],
        [`${props.taxLabel} (${props.taxCountryLabel}, ${props.buyerLabel})`, fc(props.effectiveTax)],
        ['Refurb Cost', fc(props.refurbCost)],
        ['Other Costs', fc(props.otherCosts)],
        ['Deposit', `${props.depositPercent}%`],
        ['Mortgage Rate', `${props.mortgageRate}%`],
        ['Mortgage Type', props.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ['Guaranteed Lease Income / mo', fc(props.socialInputs.leaseIncomePerMonth)],
        ['Lease Length', `${props.socialInputs.leaseLengthYears} years`],
        ['Management Costs / mo', fc(props.socialInputs.managementCostsPerMonth)],
        ...tenureRows,
      );
    }
    return rows;
  })();

  const heroMetrics: { label: string; value: string }[] = (() => {
    if (props.dealType === 'BTL') return [
      { label: 'Cash Invested', value: fc(props.btlResults.totalCashInvested) },
      { label: 'Monthly Cash Flow', value: fc(props.btlResults.monthlyCashFlow) },
      { label: 'Gross Yield', value: fp(props.btlResults.grossYield) },
    ];
    if (props.dealType === 'HMO') return [
      { label: 'Cash Invested', value: fc(props.hmoResults.totalCashInvested) },
      { label: 'Monthly Cash Flow', value: fc(props.hmoResults.monthlyCashFlow) },
      { label: 'Gross Yield', value: fp(props.hmoResults.grossYield) },
    ];
    if (props.dealType === 'FLIP') return [
      { label: 'Net Profit', value: fc(props.flipResults.netProfit) },
      { label: 'Total ROI', value: fp(props.flipResults.roi) },
      { label: 'Annualised ROI', value: fp(props.flipResults.annualisedROI) },
    ];
    if (props.dealType === 'SA') return [
      { label: 'Cash Invested', value: fc(props.saResults.totalCashInvested) },
      { label: 'Monthly Cash Flow', value: fc(props.saResults.monthlyCashFlow) },
      { label: 'Net Yield', value: fp(props.saResults.netYield) },
    ];
    if (props.dealType === 'BRRR') return [
      { label: 'Cash Left In', value: (props.brrrResults.moneyOut && props.purchasePrice > 0) ? 'Money Out' : fc(props.brrrResults.cashLeftInDeal) },
      { label: 'Monthly Cash Flow', value: fc(props.brrrResults.monthlyCashFlow) },
      { label: 'Equity Created', value: fc(props.brrrResults.equityCreated) },
    ];
    if (props.dealType === 'R2R') return [
      { label: 'Monthly Profit', value: fc(props.r2rResults.monthlyProfit) },
      { label: 'Annual Profit', value: fc(props.r2rResults.annualProfit) },
      { label: 'Net Return on Setup', value: fp(props.r2rResults.roi) },
    ];
    return [
      { label: 'Cash Invested', value: fc(props.socialResults.totalCashInvested) },
      { label: 'Monthly Cash Flow', value: fc(props.socialResults.monthlyCashFlow) },
      { label: 'Gross Yield', value: fp(props.socialResults.grossYield) },
    ];
  })();

  const resultsRows: RowData[] = (() => {
    const bmvRows: RowData[] = props.marketValue > 0 ? [
      ['Market Value', fc(props.marketValue)],
      ['Equity on Day One', fc(props.equityDayOne), true],
      ['BMV', `${fc(props.bmvAmount)}  (${props.bmvPercent.toFixed(1)}%)`, true],
    ] : [];
    if (props.dealType === 'BTL') return [
      ['Cash Invested', fc(props.btlResults.totalCashInvested)],
      ['Mortgage Amount', fc(props.btlResults.mortgageAmount)],
      ['Monthly Cash Flow', fc(props.btlResults.monthlyCashFlow), true],
      ['Annual Cash Flow', fc(props.btlResults.annualCashFlow)],
      ['Gross Yield', fp(props.btlResults.grossYield)],
      ['Net Yield', fp(props.btlResults.netYield)],
      ['Cash-on-Cash ROI', fp(props.btlResults.cashOnCashROI), true],
      ...bmvRows,
    ];
    if (props.dealType === 'HMO') return [
      ['Cash Invested', fc(props.hmoResults.totalCashInvested)],
      ['Mortgage Amount', fc(props.hmoResults.mortgageAmount)],
      ['Gross Monthly Rent', fc(props.hmoResults.grossMonthlyRent)],
      ['Monthly Cash Flow', fc(props.hmoResults.monthlyCashFlow), true],
      ['Annual Cash Flow', fc(props.hmoResults.annualCashFlow)],
      ['Gross Yield', fp(props.hmoResults.grossYield)],
      ['Net Yield', fp(props.hmoResults.netYield)],
      ['Cash-on-Cash ROI', fp(props.hmoResults.cashOnCashROI), true],
      ...bmvRows,
    ];
    if (props.dealType === 'FLIP') return [
      ['Total Cost', fc(props.flipResults.totalCost)],
      ['Selling Costs', fc(props.flipResults.sellingCosts)],
      ['Net Profit', fc(props.flipResults.netProfit), true],
      ['Profit per Month', fc(props.flipResults.profitPerMonth)],
      ['Total ROI', fp(props.flipResults.roi), true],
      ['Annualised ROI', fp(props.flipResults.annualisedROI)],
      ...bmvRows,
    ];
    if (props.dealType === 'SA') return [
      ['Cash Invested', fc(props.saResults.totalCashInvested)],
      ['Mortgage Amount', fc(props.saResults.mortgageAmount)],
      ['Gross Monthly Revenue', fc(props.saResults.grossMonthlyRevenue)],
      ['Platform Fees / mo', fc(props.saResults.platformFees)],
      ['Net Monthly Revenue', fc(props.saResults.netMonthlyRevenue)],
      ['Monthly Cash Flow', fc(props.saResults.monthlyCashFlow), true],
      ['Annual Cash Flow', fc(props.saResults.annualCashFlow)],
      ['Gross Yield', fp(props.saResults.grossYield)],
      ['Net Yield', fp(props.saResults.netYield)],
      ['Cash-on-Cash ROI', fp(props.saResults.cashOnCashROI), true],
      ...bmvRows,
    ];
    if (props.dealType === 'BRRR') return [
      ['Total Cost In', fc(props.brrrResults.totalCostIn)],
      ['Refinance Loan', fc(props.brrrResults.refinanceLoan)],
      ['Monthly Mortgage', fc(props.brrrResults.monthlyMortgage)],
      ['Cash Left in Deal', (props.brrrResults.moneyOut && props.purchasePrice > 0) ? `${fc(Math.abs(props.brrrResults.cashLeftInDeal))} OUT` : fc(props.brrrResults.cashLeftInDeal)],
      ['Equity Created', fc(props.brrrResults.equityCreated)],
      ['Monthly Cash Flow', fc(props.brrrResults.monthlyCashFlow), true],
      ['Annual Cash Flow', fc(props.brrrResults.annualCashFlow)],
      ['Gross Yield (on GDV)', fp(props.brrrResults.grossYield)],
      ['Net Yield', fp(props.brrrResults.netYield)],
      ['Cash-on-Cash ROI', (props.brrrResults.moneyOut && props.purchasePrice > 0) ? '∞ (money out)' : fp(props.brrrResults.cashOnCashROI), true],
    ];
    if (props.dealType === 'R2R') return [
      ['Gross Monthly Income', fc(props.r2rResults.grossMonthlyIncome)],
      ['Management Fees / mo', fc(props.r2rResults.managementFees)],
      ['Net Monthly Income', fc(props.r2rResults.netMonthlyIncome)],
      ['Monthly Profit', fc(props.r2rResults.monthlyProfit), true],
      ['Annual Profit', fc(props.r2rResults.annualProfit)],
      ['Setup Costs', fc(props.r2rInputs.setupCosts)],
      ['Monthly Spread', fc(props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid)],
      ['Net Return on Setup Costs', fp(props.r2rResults.roi), true],
    ];
    return [
      ['Cash Invested', fc(props.socialResults.totalCashInvested)],
      ['Mortgage Amount', fc(props.socialResults.mortgageAmount)],
      ['Monthly Cash Flow', fc(props.socialResults.monthlyCashFlow), true],
      ['Annual Cash Flow', fc(props.socialResults.annualCashFlow)],
      ['Gross Yield', fp(props.socialResults.grossYield)],
      ['Net Yield', fp(props.socialResults.netYield)],
      ['Cash-on-Cash ROI', fp(props.socialResults.cashOnCashROI), true],
      ...bmvRows,
    ];
  })();

  const { dims: dealScoreDims, overall: dealScoreOverall } = computeDealScoreBreakdown(props);
  const verdictSummary = generateVerdictSummary(props);
  const calloutMetrics3 = computeCalloutMetrics(props);
  const whatThisMeans = generateWhatThisMeans(props);

  const execSummaryText = props.executiveSummary.trim();
  const strategyNotesText = props.strategyNotes.trim();
  const propertyDescText = props.propertyDescription.trim();
  const vendorSituationText = props.vendorSituation.trim();
  const hasRationale = !!(strategyNotesText || propertyDescText);
  const hasComparables = props.comparables.some(r => r.address.trim());
  const hasLinks = props.listingLinks.some(r => r.url.trim());
  const hasMarketEvidence = hasComparables || hasLinks;
  const hasLegal = !!(vendorSituationText || props.sourcingFee > 0);

  const formatCompPrice = (price: string): string => {
    const trimmed = price.trim();
    if (!trimmed) return '';
    const cleaned = trimmed.replace(/[£,\s]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return '\u00A3' + Math.round(num).toLocaleString('en-GB');
    return trimmed.startsWith('\u00A3') ? trimmed : '\u00A3' + trimmed;
  };

  const validPhotos = props.photoFiles.filter((s) => Boolean(s) && s.startsWith('data:image/'));
  const heroIdx = props.heroPhotoIndex ?? 0;
  const heroPhoto = validPhotos[heroIdx] ?? validPhotos[0] ?? null;
  const gridPhotos = validPhotos.filter((_, i) => i !== heroIdx);
  const validGridPhotos = gridPhotos.filter((s) => s.startsWith('data:image/'));
  // One page per photo: hero first, then remaining photos in upload order.
  const photoPageSrcs: string[] = [
    ...(heroPhoto ? [heroPhoto] : []),
    ...validGridPhotos,
  ].filter((src): src is string => Boolean(src) && src.startsWith('data:image/'));
  const scoreColor = SCORE_COLOR[props.currentScore] ?? '#6b7280';
  console.log('[DealScorePDF] riskFlags:', props.riskFlags);

  const preparedLine = [
    props.preparedBy.name ? `Prepared by ${props.preparedBy.name}` : '',
    props.preparedBy.email,
    props.preparedBy.phone,
  ].filter(Boolean).join(' · ');

  // ── Financial Detail page derived values ──────────────────────────────────
  const activeResults =
    props.dealType === 'BTL' ? props.btlResults :
    props.dealType === 'HMO' ? props.hmoResults :
    props.dealType === 'SA' ? props.saResults :
    props.dealType === 'BRRR' ? props.brrrResults :
    props.socialResults;

  const fdGrossRent =
    props.dealType === 'BTL' ? props.btlInputs.monthlyRent :
    props.dealType === 'HMO' ? props.hmoResults.grossMonthlyRent :
    props.dealType === 'SA' ? props.saResults.netMonthlyRevenue :
    props.dealType === 'BRRR' ? props.brrrInputs.monthlyRent :
    props.socialInputs.leaseIncomePerMonth;

  const fdMortgagePayment =
    props.dealType === 'BTL' ? props.btlResults.monthlyMortgageInterest :
    props.dealType === 'HMO' ? props.hmoResults.monthlyMortgageInterest :
    props.dealType === 'SA' ? props.saResults.monthlyMortgage :
    props.dealType === 'BRRR' ? props.brrrResults.monthlyMortgage :
    props.socialResults.monthlyMortgage;

  const fdVoidPct = props.voidAllowancePercent ?? 5;
  const fdMgmtPct = props.managementFeePercent ?? 10;
  const fdMaintenance = props.maintenanceReserve ?? 75;
  const fdInsurance = props.buildingsInsurance ?? 30;
  const fdSc = props.serviceCharge ?? 0;
  const fdGr = props.groundRentAnnual ?? 0;
  const fdGrMonthly = fdGr / 12;

  const fdRawPayback = activeResults.paybackPeriod;
  const fdPayback = fdRawPayback ?? 0;
  const fdPaybackDisplay = (!isFinite(fdPayback) || fdPayback > 25 || fdPayback <= 0)
    ? 'N/A'
    : fdPayback.toFixed(1) + ' years';

  return (
    <Document>

      {/* ── Page 1: Cover ─────────────────────────────────────────────────── */}
      {/* Single unconditional Page — React-PDF requires Page as direct Document child */}
      <Page
        size="A4"
        style={{ fontFamily: 'Helvetica', backgroundColor: props.tierOverride === 'pro' ? DEALSCORE_BRAND.primaryColour : (props.coverStyle === 'classic' ? coverBg : '#ffffff') }}
      >
        {/* Pro — DealScore branded cover */}
        {props.tierOverride === 'pro' && (
          <View style={{ flex: 1, padding: 40, flexDirection: 'column', justifyContent: 'space-between' }}>
            <View style={{ paddingTop: 60, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'center' }}>
                {DEALSCORE_BRAND.name}
              </Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 4 }}>
                {DEALSCORE_BRAND.website}
              </Text>
            </View>
            <View style={{ position: 'absolute', top: 0, left: 40, right: 40, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#CCCCCC', textAlign: 'center', marginBottom: 12 }}>
                {DEAL_LABELS[props.dealType]}
              </Text>
              <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'center', lineHeight: 1.3 }}>
                {addressLine1}
              </Text>
              {addressLine2 ? (
                <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'center', lineHeight: 1.3, marginBottom: 12 }}>
                  {addressLine2}
                </Text>
              ) : <View style={{ marginBottom: 12 }} />}
              <Text style={{ fontSize: 10, color: '#AAAAAA', textAlign: 'center' }}>
                Date Prepared: {props.dateStr}
              </Text>
            </View>
            <View style={{ paddingBottom: 16 }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: DEALSCORE_BRAND.accentColour, borderBottomStyle: 'solid', marginBottom: 20 }} />
              {preparedLine ? (
                <Text style={{ fontSize: 9, color: '#CCCCCC', textAlign: 'center', marginBottom: 10 }}>
                  {preparedLine}
                </Text>
              ) : null}
              <Text style={{ fontSize: 8, color: '#AAAAAA', textAlign: 'center' }}>
                Confidential — Prepared for investor review only
              </Text>
            </View>
          </View>
        )}

        {/* Classic */}
        {props.coverStyle === 'classic' && props.tierOverride !== 'pro' && (
          <View style={{ flex: 1, padding: 40, flexDirection: 'column', justifyContent: 'space-between' }}>
            <View style={{ minHeight: 20 }}>
              {props.logoBase64 ? (
                <Image src={props.logoBase64} style={{ maxHeight: logoHeight, maxWidth: logoMaxWidth, objectFit: 'contain', alignSelf: 'center' }} />
              ) : null}
              {isProPlus && props.companyName.trim() ? (
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', textAlign: 'center', letterSpacing: 1.8, marginTop: 8 }}>
                  {props.companyName.trim().toUpperCase()}
                </Text>
              ) : null}
            </View>
            <View style={{ position: 'absolute', top: 0, left: 40, right: 40, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#CCCCCC', textAlign: 'center', marginBottom: 12 }}>
                {DEAL_LABELS[props.dealType]}
              </Text>
              <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: coverBgText, textAlign: 'center', lineHeight: 1.3 }}>
                {addressLine1}
              </Text>
              {addressLine2 ? (
                <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: coverBgText, textAlign: 'center', lineHeight: 1.3, marginBottom: 12 }}>
                  {addressLine2}
                </Text>
              ) : <View style={{ marginBottom: 12 }} />}
              <Text style={{ fontSize: 10, color: '#AAAAAA', textAlign: 'center' }}>
                Date Prepared: {props.dateStr}
              </Text>
            </View>
            <View style={{ paddingBottom: 16 }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: isProPlus ? accent : 'rgba(255,255,255,0.2)', borderBottomStyle: 'solid', marginBottom: 20 }} />
              {preparedLine ? (
                <Text style={{ fontSize: 9, color: '#CCCCCC', textAlign: 'center', marginBottom: 10 }}>
                  {preparedLine}
                </Text>
              ) : null}
              <Text style={{ fontSize: 8, color: '#AAAAAA', textAlign: 'center' }}>
                Confidential — Prepared for investor review only
              </Text>
            </View>
          </View>
        )}

        {/* Clean */}
        {props.coverStyle === 'clean' && props.tierOverride !== 'pro' && (
          <View style={{ flex: 1, flexDirection: 'column', position: 'relative' }}>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: coverBg }} />
            <View style={{ flex: 1, paddingLeft: 44, paddingRight: 40, paddingTop: 32, paddingBottom: 40 }}>
              {props.logoBase64 ? (
                <View style={{ alignItems: 'center' }}>
                  <Image src={props.logoBase64} style={{ maxHeight: logoHeight, maxWidth: logoMaxWidth, objectFit: 'contain' }} />
                </View>
              ) : <View style={{ height: 20 }} />}
              <View style={{ position: 'absolute', top: 0, left: 40, right: 40, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: readableBrand, textAlign: 'center', marginBottom: 12 }}>
                  {DEAL_LABELS[props.dealType]}
                </Text>
                <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1A1A1A', textAlign: 'center', lineHeight: 1.3 }}>
                  {addressLine1}
                </Text>
                {addressLine2 ? (
                  <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1A1A1A', textAlign: 'center', lineHeight: 1.3, marginBottom: 12 }}>
                    {addressLine2}
                  </Text>
                ) : <View style={{ marginBottom: 12 }} />}
                <Text style={{ fontSize: 10, color: '#666666', textAlign: 'center' }}>
                  Date Prepared: {props.dateStr}
                </Text>
              </View>
              <View style={{ position: 'absolute', bottom: 28, left: 40, right: 40 }}>
                {isProPlus && props.companyName.trim() ? (
                  <Text style={{ fontSize: 8, color: '#777777', letterSpacing: 1.4, marginBottom: 8 }}>
                    {props.companyName.trim().toUpperCase()}
                  </Text>
                ) : null}
                <View style={{ borderBottom: `1pt solid ${isProPlus ? accent : brand}`, marginBottom: 12 }} />
                {props.preparedBy.name ? (
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#333333', marginBottom: 3 }}>
                    Prepared by {props.preparedBy.name}
                  </Text>
                ) : null}
                {props.preparedBy.email ? (
                  <Text style={{ fontSize: 9, color: '#555555', marginBottom: 2 }}>
                    {props.preparedBy.email}
                  </Text>
                ) : null}
                {props.preparedBy.phone ? (
                  <Text style={{ fontSize: 9, color: '#555555', marginBottom: 10 }}>
                    {props.preparedBy.phone}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 8, color: '#999999' }}>
                  Confidential — Prepared for investor review only
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Bold */}
        {props.coverStyle === 'bold' && props.tierOverride !== 'pro' && (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ width: '45%', backgroundColor: coverBg, padding: 40, justifyContent: 'space-between' }}>
              <View style={{ width: '100%', alignItems: 'center' }}>
                {props.logoBase64 ? (
                  <Image src={props.logoBase64} style={{ maxHeight: logoHeight, maxWidth: logoMaxWidth, objectFit: 'contain', alignSelf: 'center' }} />
                ) : null}
                {isProPlus && props.companyName.trim() ? (
                  <Text style={{ fontSize: 7.5, color: coverMuted(coverBg, 0.6), textAlign: 'center', letterSpacing: 1.6, marginTop: 8 }}>
                    {props.companyName.trim().toUpperCase()}
                  </Text>
                ) : null}
              </View>
              <View>
                <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: coverBgText, marginBottom: 6, lineHeight: 1.4 }}>
                  {DEAL_LABELS[props.dealType]}
                </Text>
                <Text style={{ fontSize: 9, color: coverMuted(coverBg, 0.7) }}>
                  Date Prepared: {props.dateStr}
                </Text>
                <View style={{ borderBottom: `1pt solid ${isProPlus ? accent : coverMuted(coverBg, 0.3)}`, marginTop: 20 }} />
              </View>
            </View>
            <View style={{ width: '55%', backgroundColor: '#ffffff', padding: 40, position: 'relative' }}>
              <Text style={{ fontSize: 8, color: '#999999', textAlign: 'right' }}>
                Confidential — Prepared for investor review only
              </Text>
              <View style={{ position: 'absolute', top: 260, left: 40, right: 40, alignItems: 'center' }}>
                <View style={{ width: 40, borderBottom: `2pt solid ${isProPlus ? accent : readableBrand}`, marginBottom: 16 }} />
                {boldLine1 ? (
                  <Text hyphenationCallback={(word) => [word]} style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1A1A1A', textAlign: 'center', lineHeight: 1.4 }}>
                    {boldLine1}
                  </Text>
                ) : null}
                {boldLine2 ? (
                  <Text hyphenationCallback={(word) => [word]} style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1A1A1A', textAlign: 'center', lineHeight: 1.4 }}>
                    {boldLine2}
                  </Text>
                ) : null}
                {boldLine3 ? (
                  <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1A1A1A', textAlign: 'center', lineHeight: 1.4 }}>
                    {boldLine3}
                  </Text>
                ) : null}
              </View>
              <View style={{ position: 'absolute', bottom: 40, left: 40, right: 40 }}>
                {props.preparedBy.name ? (
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#333333', marginBottom: 3 }}>
                    Prepared by {props.preparedBy.name}
                  </Text>
                ) : null}
                {props.preparedBy.email ? (
                  <Text style={{ fontSize: 9, color: '#555555', marginBottom: 2 }}>
                    {props.preparedBy.email}
                  </Text>
                ) : null}
                {props.preparedBy.phone ? (
                  <Text style={{ fontSize: 9, color: '#555555' }}>
                    {props.preparedBy.phone}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        )}
      </Page>

      {/* ── Page 2: Executive Summary + Property Overview ─────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />

        {/* Two-column row: Executive Summary (left) + Hero photo (right) */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          {/* Left: Executive Summary (60%) */}
          <View style={{ flex: 0.6 }}>
            {execSummaryText ? (
              <View style={[base.notePanel, { marginBottom: 0 }]}>
                <Text style={[base.notePanelLabel, { color: readableBrand }]}>Executive Summary</Text>
                <Text style={base.notePanelText}>{execSummaryText}</Text>
              </View>
            ) : null}
          </View>
          {/* Right: Hero photo (38%) */}
          <View style={{ flex: 0.38 }}>
            {heroPhoto ? (
              <View>
                <View style={{ width: '100%', height: 180, overflow: 'hidden', borderRadius: 4 }}>
                  <Image
                    src={heroPhoto}
                    style={{ width: '100%', height: 180, objectFit: 'cover' }}
                  />
                </View>
                <Text style={{ fontSize: 7.5, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
                  Property Preview
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <SH title="Property Details" />
        <Table rows={[
          ...(props.propertyAddress ? [['Address', addressPlain] as RowData] : []),
          ['Property Type', props.propertyType],
          ['Tenure', props.tenure],
          ...(props.tenure === 'Leasehold' && props.leaseLengthYears > 0
            ? [['Remaining Lease', `${props.leaseLengthYears} years`] as RowData] : []),
          ...(props.epcRating ? [['EPC Rating', props.epcRating] as RowData] : []),
          ...(props.floorArea ? [['Floor Area', `${props.floorArea} m\u00B2`] as RowData] : []),
          ...(props.constructionDate ? [['Construction Date', props.constructionDate] as RowData] : []),
          ...(props.floodRisk ? [['Flood Risk', props.floodRisk] as RowData] : []),
        ]} />

        <SH title="Financial Summary" />
        <Hero metrics={heroMetrics} />

        {props.bmvAmount > 0 && props.dealType !== 'R2R' && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: props.bmvAmount >= 0 ? '#f0fdf4' : '#fef2f2',
            border: `0.5pt solid ${props.bmvAmount >= 0 ? '#86efac' : '#fca5a5'}`,
            borderRadius: 4,
            padding: 8,
            marginBottom: 14,
          }}>
            <View>
              <Text style={{ fontSize: 7.5, color: '#6b7280', marginBottom: 3 }}>BELOW MARKET VALUE</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1B2B4B' }}>
                {fc(props.bmvAmount)}
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: props.bmvAmount >= 0 ? getReadableBrandColour(accent) : '#b91c1c' }}>
              {props.bmvPercent.toFixed(1)}%
            </Text>
          </View>
        )}

        <SH title="Deal Inputs" />
        <Table rows={inputRows} />
      </Page>

      {/* ── Page 3: Financial Analysis ─────────────────────────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />

        <SH title={DEAL_LABELS[props.dealType]} />

        {/* Verdict badge — unchanged */}
        {props.currentScore !== 'Incomplete' && (
          <View style={{
            marginBottom: 10,
            borderLeftWidth: 4,
            borderLeftColor: scoreColor,
            borderLeftStyle: 'solid',
            backgroundColor: SCORE_TINT[props.currentScore] ?? 'rgba(107,114,128,0.09)',
            paddingVertical: 8,
            paddingHorizontal: 14,
          }}>
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1B2B4B' }}>
              {VERDICT_LABELS[props.currentScore] ?? props.currentScore}
            </Text>
          </View>
        )}

        {/* Risk flags — unchanged */}
        {props.riskFlags.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            {props.riskFlags.map((flag, i) => (
              <View key={i} style={base.riskFlag}>
                <Text style={base.riskFlagText}>
                  {'WARNING: ' + flag.replace(/[^\u0020-\u00FF]/g, '').trim()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Deal Score Breakdown Table */}
        {props.currentScore !== 'Incomplete' && (
          <View style={{ marginBottom: 8, borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 5, paddingHorizontal: 8, borderBottom: '0.5pt solid #E5E7EB' }}>
              <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280' }}>DIMENSION</Text>
              <Text style={{ width: 50, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280', textAlign: 'center' }}>SCORE</Text>
              <Text style={{ width: 90, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280' }}></Text>
            </View>
            {/* Dimension rows */}
            {dealScoreDims.map((dim, i) => {
              const barColor = dim.score >= 7 ? '#22C55E' : dim.score >= 4 ? '#F59E0B' : '#EF4444';
              const barFill = (dim.score / 10) * 90;
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB', borderBottom: i < dealScoreDims.length - 1 ? '0.5pt solid #E5E7EB' : undefined }}>
                  <Text style={{ flex: 1, fontSize: 8.5, color: '#1E2B3C' }}>{dim.name}</Text>
                  <Text style={{ width: 50, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'center' }}>{dim.score} / 10</Text>
                  <View style={{ width: 90, height: 7, backgroundColor: '#F3F4F6', borderRadius: 2 }}>
                    <View style={{ width: barFill, height: 7, backgroundColor: barColor, borderRadius: 2 }} />
                  </View>
                </View>
              );
            })}
            {/* Overall score */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#F0F4FF', borderTop: '0.5pt solid #E5E7EB' }}>
              <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>Overall Deal Score</Text>
              <Text style={{ width: 140, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{dealScoreOverall.toFixed(1)} / 10</Text>
            </View>
          </View>
        )}

        {/* Verdict summary sentence */}
        {verdictSummary ? (
          <Text style={{ fontSize: 9.5, color: '#1E2B3C', marginBottom: 10, lineHeight: 1.45 }}>{verdictSummary}</Text>
        ) : null}

        {/* 3 Key metric callout cards */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {calloutMetrics3.map(({ label, value }) => (
            <View key={label} style={[base.calloutCard, { borderWidth: 1.5, borderStyle: 'solid', borderColor: brand }]}>
              <Text style={base.calloutLabel}>{label}</Text>
              <Text style={base.calloutValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Full results table — unchanged */}
        <Table rows={resultsRows} />

        {/* What This Means */}
        {whatThisMeans ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: readableBrand, marginBottom: 5 }}>What This Means</Text>
            <Text style={{ fontSize: 9, color: '#1E2B3C', lineHeight: 1.5 }}>{whatThisMeans}</Text>
          </View>
        ) : null}

        {/* Sensitivity Analysis — stress test */}
        {props.stressTest && (
          <View style={{ marginTop: 10 }}>
            <SH title="Sensitivity Analysis" />
            <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
              <View style={{ flexDirection: 'row', backgroundColor: brand, paddingVertical: 5, paddingHorizontal: 8 }}>
                <Text style={{ flex: 1.8, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }}>METRIC</Text>
                <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'right' }}>BASE CASE</Text>
                <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'right' }}>RENT {'\u221210%'}</Text>
                <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textAlign: 'right' }}>RATE +1.5%</Text>
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 5, paddingHorizontal: 8, borderTop: '0.5pt solid #E5E7EB' }}>
                <Text style={{ flex: 1.8, fontSize: 8.5, color: '#1E2B3C' }}>Monthly Cash Flow</Text>
                {([props.stressTest.baseCashFlow, props.stressTest.rentDownCashFlow, props.stressTest.rateUpCashFlow] as number[]).map((v, i) => (
                  <Text key={i} style={{ flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>
                    {fc(v)}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 5, paddingHorizontal: 8, borderTop: '0.5pt solid #E5E7EB' }}>
                <Text style={{ flex: 1.8, fontSize: 8.5, color: '#1E2B3C' }}>Cash-on-Cash ROI</Text>
                {([props.stressTest.baseCoC, props.stressTest.rentDownCoC, props.stressTest.rateUpCoC] as number[]).map((v, i) => (
                  <Text key={i} style={{ flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>
                    {isFinite(v) ? fp(v) : '\u221E'}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Calculation Workings */}
        {props.includeWorkings && (
          <View wrap={false} style={{ marginTop: 10 }}>
            <SH title="Calculation Workings" />
            {props.dealType === 'BTL' && (
              <>
                <WPdfSec title="A  CASH INVESTED" />
                <WPdfRow lbl={`Deposit (${props.depositPercent}% of ${fc(props.purchasePrice)})`} val={fc(props.purchasePrice * props.depositPercent / 100)} />
                <WPdfRow lbl="Stamp Duty / Tax" val={fc(props.effectiveTax)} />
                <WPdfRow lbl="Refurb Cost" val={fc(props.refurbCost)} />
                <WPdfRow lbl="Other Costs" val={fc(props.otherCosts)} />
                <WPdfRow lbl="TOTAL CASH INVESTED" val={fc(props.btlResults.totalCashInvested)} bold />
                <WPdfSec title="B  MONTHLY CASH FLOW" />
                <WPdfRow lbl="Monthly Rent" val={fc(props.btlInputs.monthlyRent)} />
                <WPdfRow lbl="Less: Mortgage" val={`(${fc(props.btlResults.monthlyMortgageInterest)})`} />
                <WPdfRow lbl="Less: Monthly Expenses" val={`(${fc(props.btlInputs.monthlyExpenses)})`} />
                <WPdfRow lbl="MONTHLY CASH FLOW" val={fc(props.btlResults.monthlyCashFlow)} bold clr={props.btlResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                <WPdfSec title="C  KEY METRICS" />
                <WPdfRow lbl={`Gross Yield  (${fc(props.btlInputs.monthlyRent)} × 12) ÷ ${fc(props.purchasePrice)} × 100`} val={fp(props.btlResults.grossYield)} />
                <WPdfRow lbl="Net Yield" val={fp(props.btlResults.netYield)} />
                <WPdfRow lbl={`CoC ROI  ${fc(props.btlResults.annualCashFlow)} ÷ ${fc(props.btlResults.totalCashInvested)} × 100`} val={fp(props.btlResults.cashOnCashROI)} bold clr={readableBrand} />
              </>
            )}
            {props.dealType === 'HMO' && (
              <>
                <WPdfSec title="A  CASH INVESTED" />
                <WPdfRow lbl={`Deposit (${props.depositPercent}% of ${fc(props.purchasePrice)})`} val={fc(props.purchasePrice * props.depositPercent / 100)} />
                <WPdfRow lbl="Stamp Duty / Tax" val={fc(props.effectiveTax)} />
                <WPdfRow lbl="Refurb Cost" val={fc(props.refurbCost)} />
                <WPdfRow lbl="Other Costs" val={fc(props.otherCosts)} />
                <WPdfRow lbl="TOTAL CASH INVESTED" val={fc(props.hmoResults.totalCashInvested)} bold />
                <WPdfSec title="B  MONTHLY CASH FLOW" />
                <WPdfRow lbl="Total Room Income" val={fc(props.hmoResults.grossMonthlyRent)} />
                <WPdfRow lbl="Less: Mortgage" val={`(${fc(props.hmoResults.monthlyMortgageInterest)})`} />
                <WPdfRow lbl="Less: Monthly Expenses" val={`(${fc(props.hmoInputs.monthlyExpenses)})`} />
                <WPdfRow lbl="MONTHLY CASH FLOW" val={fc(props.hmoResults.monthlyCashFlow)} bold clr={props.hmoResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                <WPdfSec title="C  KEY METRICS" />
                <WPdfRow lbl={`Gross Yield  (${fc(props.hmoResults.grossMonthlyRent)} × 12) ÷ ${fc(props.purchasePrice)} × 100`} val={fp(props.hmoResults.grossYield)} />
                <WPdfRow lbl="Net Yield" val={fp(props.hmoResults.netYield)} />
                <WPdfRow lbl={`CoC ROI  ${fc(props.hmoResults.annualCashFlow)} ÷ ${fc(props.hmoResults.totalCashInvested)} × 100`} val={fp(props.hmoResults.cashOnCashROI)} bold clr={readableBrand} />
              </>
            )}
            {props.dealType === 'FLIP' && (
              <>
                <WPdfSec title="A  TOTAL COSTS" />
                <WPdfRow lbl="Purchase Price" val={fc(props.purchasePrice)} />
                <WPdfRow lbl="Stamp Duty / Tax" val={fc(props.effectiveTax)} />
                <WPdfRow lbl="Refurb Cost" val={fc(props.refurbCost)} />
                <WPdfRow lbl="Other Costs" val={fc(props.otherCosts)} />
                <WPdfRow lbl={`Holding Costs (${props.flipInputs.projectLengthMonths} months × ${fc(props.flipInputs.holdingCostsPerMonth)})`} val={fc(props.flipInputs.holdingCostsPerMonth * props.flipInputs.projectLengthMonths)} />
                <WPdfRow lbl="TOTAL COST IN" val={fc(props.flipResults.totalCost)} bold />
                <WPdfSec title="B  PROFIT CALCULATION" />
                <WPdfRow lbl="Expected Sale Price (GDV)" val={fc(props.flipInputs.expectedSalePrice)} />
                <WPdfRow lbl="Less: Total Cost In" val={`(${fc(props.flipResults.totalCost)})`} />
                <WPdfRow lbl={`Less: Selling Costs (${props.flipInputs.sellingCostsPercent}%)`} val={`(${fc(props.flipResults.sellingCosts)})`} />
                <WPdfRow lbl="NET PROFIT" val={fc(props.flipResults.netProfit)} bold clr={props.flipResults.netProfit < 0 ? '#EF4444' : '#22C55E'} />
                <WPdfSec title="C  KEY METRICS" />
                <WPdfRow lbl={`Profit per Month  ${fc(props.flipResults.netProfit)} ÷ ${props.flipInputs.projectLengthMonths} months`} val={fc(props.flipResults.profitPerMonth)} />
                <WPdfRow lbl={`Total ROI  ${fc(props.flipResults.netProfit)} ÷ ${fc(props.flipResults.totalCost)} × 100`} val={fp(props.flipResults.roi)} bold />
                <WPdfRow lbl={`Annualised ROI  ${fp(props.flipResults.roi)} × 12 ÷ ${props.flipInputs.projectLengthMonths}`} val={fp(props.flipResults.annualisedROI)} bold clr={readableBrand} />
              </>
            )}
            {props.dealType === 'SA' && (
              <>
                <WPdfSec title="A  CASH INVESTED" />
                <WPdfRow lbl={`Deposit (${props.depositPercent}% of ${fc(props.purchasePrice)})`} val={fc(props.purchasePrice * props.depositPercent / 100)} />
                <WPdfRow lbl="Stamp Duty / Tax" val={fc(props.effectiveTax)} />
                <WPdfRow lbl="Refurb Cost" val={fc(props.refurbCost)} />
                <WPdfRow lbl="Other Costs" val={fc(props.otherCosts)} />
                <WPdfRow lbl="TOTAL CASH INVESTED" val={fc(props.saResults.totalCashInvested)} bold />
                <WPdfSec title="B  MONTHLY CASH FLOW" />
                <WPdfRow lbl={`Monthly Revenue  ${fc(props.saInputs.nightlyRate)} nightly × ${props.saInputs.occupancyPercent}% occupancy`} val={fc(props.saResults.grossMonthlyRevenue)} />
                <WPdfRow lbl="Less: Platform Fees" val={`(${fc(props.saResults.platformFees)})`} />
                <WPdfRow lbl="Less: Monthly Running Costs" val={`(${fc(props.saInputs.monthlyRunningCosts)})`} />
                <WPdfRow lbl="Less: Mortgage" val={`(${fc(props.saResults.monthlyMortgage)})`} />
                <WPdfRow lbl="MONTHLY CASH FLOW" val={fc(props.saResults.monthlyCashFlow)} bold clr={props.saResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                <WPdfSec title="C  KEY METRICS" />
                <WPdfRow lbl="Net Yield" val={fp(props.saResults.netYield)} />
                <WPdfRow lbl={`CoC ROI  ${fc(props.saResults.annualCashFlow)} ÷ ${fc(props.saResults.totalCashInvested)} × 100`} val={fp(props.saResults.cashOnCashROI)} bold clr={readableBrand} />
              </>
            )}
            {props.dealType === 'BRRR' && (
              <>
                <WPdfSec title="A  CASH IN" />
                <WPdfRow lbl="Purchase Price" val={fc(props.purchasePrice)} />
                <WPdfRow lbl="Stamp Duty / Tax" val={fc(props.effectiveTax)} />
                <WPdfRow lbl="Refurb Cost" val={fc(props.refurbCost)} />
                <WPdfRow lbl="Other Costs" val={fc(props.otherCosts)} />
                <WPdfRow lbl="TOTAL COST IN" val={fc(props.brrrResults.totalCostIn)} bold />
                <WPdfSec title="B  REFINANCE" />
                <WPdfRow lbl="Post-Refurb Value (GDV)" val={fc(props.brrrInputs.postRefurbValue)} />
                <WPdfRow lbl="Refinance %" val={`${props.brrrInputs.refinancePercent}%`} />
                <WPdfRow lbl="Refinance Loan" val={fc(props.brrrResults.refinanceLoan)} />
                <WPdfRow lbl={props.brrrResults.moneyOut ? 'MONEY OUT' : 'CASH LEFT IN DEAL'} val={fc(Math.abs(props.brrrResults.cashLeftInDeal))} bold clr={props.brrrResults.moneyOut ? '#22C55E' : undefined} />
                <WPdfSec title="C  KEY METRICS" />
                <WPdfRow lbl="Monthly Cash Flow" val={fc(props.brrrResults.monthlyCashFlow)} clr={props.brrrResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                <WPdfRow lbl="Gross Yield" val={fp(props.brrrResults.grossYield)} />
                <WPdfRow lbl={`CoC ROI  ${fc(props.brrrResults.annualCashFlow)} ÷ ${props.brrrResults.moneyOut ? 'Money Out' : fc(props.brrrResults.cashLeftInDeal)} × 100`} val={props.brrrResults.moneyOut ? '\u221E' : fp(props.brrrResults.cashOnCashROI)} bold clr={readableBrand} />
              </>
            )}
            {props.dealType === 'R2R' && (
              <>
                <WPdfSec title="A  SETUP COSTS" />
                <WPdfRow lbl="Setup Costs" val={fc(props.r2rInputs.setupCosts)} />
                <WPdfRow lbl="TOTAL SETUP COSTS" val={fc(props.r2rInputs.setupCosts)} bold />
                <WPdfSec title="B  MONTHLY CASH FLOW" />
                <WPdfRow lbl="Gross Monthly Income" val={fc(props.r2rResults.grossMonthlyIncome)} />
                <WPdfRow lbl="Less: Landlord Rent" val={`(${fc(props.r2rInputs.monthlyRentPaid)})`} />
                <WPdfRow lbl="Monthly Spread" val={fc(props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid)} />
                <WPdfRow lbl="Less: Management Fees" val={`(${fc(props.r2rResults.managementFees)})`} />
                <WPdfRow lbl="Less: Running Costs" val={`(${fc(props.r2rInputs.monthlyRunningCosts)})`} />
                <WPdfRow lbl="MONTHLY PROFIT" val={fc(props.r2rResults.monthlyProfit)} bold clr={props.r2rResults.monthlyProfit < 0 ? '#EF4444' : '#22C55E'} />
                <WPdfSec title="C  KEY METRICS" />
                <WPdfRow lbl={`ROI  ${fc(props.r2rResults.annualProfit)} ÷ ${fc(props.r2rInputs.setupCosts)} × 100`} val={fp(props.r2rResults.roi)} bold clr={readableBrand} />
              </>
            )}
            {props.dealType === 'SOCIAL' && (
              <>
                <WPdfSec title="A  CASH INVESTED" />
                <WPdfRow lbl={`Deposit (${props.depositPercent}% of ${fc(props.purchasePrice)})`} val={fc(props.purchasePrice * props.depositPercent / 100)} />
                <WPdfRow lbl="Stamp Duty / Tax" val={fc(props.effectiveTax)} />
                {props.refurbCost > 0 ? <WPdfRow lbl="Refurb Cost" val={fc(props.refurbCost)} /> : null}
                <WPdfRow lbl="Other Costs" val={fc(props.otherCosts)} />
                <WPdfRow lbl="TOTAL CASH INVESTED" val={fc(props.socialResults.totalCashInvested)} bold />
                <WPdfSec title="B  MONTHLY CASH FLOW" />
                <WPdfRow lbl="Monthly Lease Income" val={fc(props.socialInputs.leaseIncomePerMonth)} />
                <WPdfRow lbl="Less: Management Costs" val={`(${fc(props.socialInputs.managementCostsPerMonth)})`} />
                <WPdfRow lbl="Less: Mortgage" val={`(${fc(props.socialResults.monthlyMortgage)})`} />
                <WPdfRow lbl="MONTHLY CASH FLOW" val={fc(props.socialResults.monthlyCashFlow)} bold clr={props.socialResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                <WPdfSec title="C  KEY METRICS" />
                <WPdfRow lbl="Gross Yield" val={fp(props.socialResults.grossYield)} />
                <WPdfRow lbl={`CoC ROI  ${fc(props.socialResults.annualCashFlow)} ÷ ${fc(props.socialResults.totalCashInvested)} × 100`} val={fp(props.socialResults.cashOnCashROI)} bold clr={readableBrand} />
              </>
            )}
          </View>
        )}
      </Page>

      {/* ── Financial Detail Page ─────────────────────────────────────────── */}
      {(props.dealType === 'BTL' || props.dealType === 'HMO' ||
        props.dealType === 'SA' || props.dealType === 'BRRR' ||
        props.dealType === 'SOCIAL') && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Financial Detail" />

          {/* Column header row */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: readableBrand }}>
            <Text style={{ flex: 2, fontSize: 8, fontFamily: 'Helvetica-Bold', color: getContrastText(readableBrand) }}>ITEM</Text>
            <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: getContrastText(readableBrand), textAlign: 'right' }}>MONTHLY</Text>
            <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: getContrastText(readableBrand), textAlign: 'right' }}>ANNUAL</Text>
          </View>

          {/* Row 1: Gross Rent */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA' }}>
            <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Gross Rent</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{fc(fdGrossRent)}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{fc(fdGrossRent * 12)}</Text>
          </View>

          {/* Row 2: Void Allowance */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
            <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>{`Void Allowance (${fdVoidPct}%)`}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(activeResults.voidAllowanceAmount)})`}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(activeResults.voidAllowanceAmount * 12)})`}</Text>
          </View>

          {/* Row 3: Effective Rent — BOLD, border-top */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA', borderTop: `1pt solid ${readableBrand}` }}>
            <Text style={{ flex: 2, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>Effective Rent</Text>
            <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.effectiveRent)}</Text>
            <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.effectiveRent * 12)}</Text>
          </View>

          {/* Row 4: Management Fee */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
            <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>{`Management Fee (${fdMgmtPct}%)`}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(activeResults.managementFeeAmount)})`}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(activeResults.managementFeeAmount * 12)})`}</Text>
          </View>

          {/* Row 5: Maintenance Reserve */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA' }}>
            <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Maintenance Reserve</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdMaintenance)})`}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdMaintenance * 12)})`}</Text>
          </View>

          {/* Row 6: Buildings Insurance */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
            <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Buildings Insurance</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdInsurance)})`}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdInsurance * 12)})`}</Text>
          </View>

          {/* Row 7: Service Charge (conditional) */}
          {fdSc > 0 && (
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA' }}>
              <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Service Charge</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdSc)})`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdSc * 12)})`}</Text>
            </View>
          )}

          {/* Row 8: Ground Rent (conditional) */}
          {fdGr > 0 && (
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
              <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Ground Rent</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdGrMonthly)})`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdGr)})`}</Text>
            </View>
          )}

          {/* Row 9: Net Operating Income — BOLD, border-top */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA', borderTop: `1pt solid ${readableBrand}` }}>
            <Text style={{ flex: 2, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>Net Operating Income</Text>
            <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.netOperatingIncome)}</Text>
            <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.netOperatingIncome * 12)}</Text>
          </View>

          {/* Row 10: Mortgage Payment */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
            <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Mortgage Payment</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdMortgagePayment)})`}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdMortgagePayment * 12)})`}</Text>
          </View>

          {/* Row 11: NET CASH FLOW — BOLD, 1pt larger, border-top */}
          <View style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: '#FAFAFA', borderTop: `1pt solid ${readableBrand}` }}>
            <Text style={{ flex: 2, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>NET CASH FLOW</Text>
            <Text style={{ flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.monthlyCashFlow)}</Text>
            <Text style={{ flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.monthlyCashFlow * 12)}</Text>
          </View>

          {/* Divider */}
          <View style={{ borderBottom: '1pt solid #E2E8F0', marginVertical: 14 }} />

          {/* Key Metrics 2×2 */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#F0F4F8', border: `1pt solid ${readableBrand}`, padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 3 }}>Cash-on-Cash ROI</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fp(activeResults.cashOnCashROI)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F0F4F8', border: `1pt solid ${readableBrand}`, padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 3 }}>Gross Yield</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fp(activeResults.grossYield)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#F0F4F8', border: `1pt solid ${readableBrand}`, padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 3 }}>Net Yield</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fp(activeResults.netYield)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F0F4F8', border: `1pt solid ${readableBrand}`, padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 3 }}>Payback Period</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fdPaybackDisplay}</Text>
            </View>
          </View>
        </Page>
      )}

      {/* ── Page 4: Deal Rationale ─────────────────────────────────────────── */}
      {hasRationale && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Deal Rationale" />

          {strategyNotesText ? (
            <View style={base.notePanel}>
              <Text style={[base.notePanelLabel, { color: readableBrand }]}>Why This Strategy?</Text>
              <Text style={base.notePanelText}>{strategyNotesText}</Text>
            </View>
          ) : null}

          {propertyDescText ? (
            <View style={base.notePanel}>
              <Text style={[base.notePanelLabel, { color: readableBrand }]}>Property Description</Text>
              <Text style={base.notePanelText}>{propertyDescText}</Text>
            </View>
          ) : null}
        </Page>
      )}

      {/* ── Page 5: Market Evidence ────────────────────────────────────────── */}
      {hasMarketEvidence && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Market Evidence" />

          {hasComparables && (
            <View style={[base.notePanel, { padding: 0, overflow: 'hidden' }]}>
              <Text style={[base.notePanelLabel, { color: readableBrand, padding: 10, paddingBottom: 6 }]}>Comparable Properties</Text>
              <View style={{ flexDirection: 'row', backgroundColor: readableBrand, paddingVertical: 4, paddingHorizontal: 10 }}>
                <Text style={{ flex: 2, fontSize: 8, fontFamily: 'Helvetica-Bold', color: getContrastText(readableBrand) }}>Address</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: getContrastText(readableBrand) }}>Beds / Type</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: getContrastText(readableBrand) }}>Date Sold</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: getContrastText(readableBrand), textAlign: 'right' }}>Price</Text>
              </View>
              {props.comparables
                .filter(r => r.address.trim())
                .map((row, i) => (
                  <View key={i} style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 10, backgroundColor: i % 2 === 0 ? '#ffffff' : '#f5f7fa' }}>
                    <Text style={{ flex: 2, fontSize: 8.5, color: '#333333' }}>{row.address}</Text>
                    <Text style={{ flex: 1, fontSize: 8.5, color: '#333333' }}>{row.bedsType}</Text>
                    <Text style={{ flex: 1, fontSize: 8.5, color: '#333333' }}>{row.dateSold}</Text>
                    <Text style={{ flex: 1, fontSize: 8.5, color: '#333333', textAlign: 'right' }}>{formatCompPrice(row.price)}</Text>
                  </View>
                ))}
            </View>
          )}

          {hasLinks && (
            <View style={[base.notePanel, { marginTop: hasComparables ? 8 : 0 }]}>
              <Text style={[base.notePanelLabel, { color: readableBrand, marginBottom: 6 }]}>{props.listingLinks.filter(r => r.url.trim()).length === 1 ? 'Property Listing' : 'Property Listings'}</Text>
              {props.listingLinks
                .filter(r => r.url.trim())
                .map((row, i, arr) => (
                  <View key={i} style={{ marginBottom: i < arr.length - 1 ? 4 : 0 }}>
                    <Link src={row.url.trim()} style={{ fontSize: 8.5, color: getReadableBrandColour(accent), textDecoration: 'underline' }}>
                      {row.label.trim() ? 'View on ' + row.label.trim() + ' >' : 'View Listing >'}
                    </Link>
                  </View>
                ))}
            </View>
          )}
        </Page>
      )}

      {/* ── Photo Pages: one full-page photo per page ── */}
      {photoPageSrcs.map((src, idx) => (
        <Page key={`photo-${idx}`} size="A4" style={base.page}>
          <Footer />
          <SH title={idx === 0 ? 'Property Photos' : 'Property Photos (continued)'} />
          <View style={{ flex: 1 }} wrap={false}>
            <Image
              src={src}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </View>
        </Page>
      ))}

      {/* ── Page 7: Legal & Disclosure ─────────────────────────────────────── */}
      {hasLegal && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Legal & Disclosure" />

          {vendorSituationText ? (
            <View style={base.notePanel}>
              <Text style={[base.notePanelLabel, { color: '#1B2B4B' }]}>Vendor Situation</Text>
              <Text style={base.notePanelText}>{vendorSituationText}</Text>
            </View>
          ) : null}

          {props.sourcingFee > 0 && (
            <View style={[base.notePanel, { marginTop: vendorSituationText ? 8 : 0 }]}>
              <Text style={[base.notePanelLabel, { color: '#1B2B4B' }]}>Sourcing Fee</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1B2B4B', marginBottom: 4 }}>
                {fc(props.sourcingFee)}
              </Text>
              <Text style={base.notePanelText}>Payable on completion.</Text>
              {props.sourcingFeeDisclaimer.trim().length > 0 && (
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Oblique', color: '#888888', marginTop: 6, lineHeight: 1.5 }}>
                  {props.sourcingFeeDisclaimer.trim()}
                </Text>
              )}
            </View>
          )}
        </Page>
      )}

    </Document>
  );
}
