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
  pricePerSqFt: number | null;
  pricePerSqM: number | null;
  floorAreaUnit: 'sqm' | 'sqft';
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
  timelineStages?: Array<{ label: string; month: number }>;
  areaAverageYield?: number;
  offerDeadline?: string;
  viewingAvailable?: boolean;
  refurbScope?: string;
  bedrooms?: number;
  bathrooms?: number;
  remainingLeaseYears?: number;
  leaseExtensionCost?: number;
  isCashBuyer?: boolean;
  isUninhabitable?: boolean;
  isAuctionPurchase?: boolean;
  auctionDate?: string;
  auctionCompletionDate?: string;
  buyersPremiumPct?: number;
  buyersPremiumAmount?: number;
  buyersPremiumMode?: 'pct' | 'fixed';
  auctionReservationFee?: number;
  buyersPremiumValue?: number;
  auctionReservationFeeValue?: number;
  protectAddress?: boolean;
  protectedAddressDescription?: string;
  paymentTerms?: string;
}

const fc = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const fp = (n: number) => n.toFixed(1) + '%';

export const hasMeaningfulInputs = (props: DealScorePDFProps): boolean => {
  if (props.dealType === 'R2R') {
    return props.r2rInputs.monthlyRentPaid > 0 && props.r2rInputs.setupCosts > 0;
  }
  if (props.dealType === 'FLIP') {
    return props.purchasePrice > 0 && props.flipInputs.expectedSalePrice > 0;
  }
  if (props.dealType === 'BRRR') {
    return props.purchasePrice > 0 && props.brrrInputs.postRefurbValue > 0;
  }
  return props.purchasePrice > 0;
};

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
  Strong: 'RECOMMENDED',
  Average: 'REVIEW',
  Weak: 'AVOID',
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

/** Returns a quality-adjusted structural colour guaranteed to sit in the
 *  legible range (luminance 0.08–0.35) for use on white paper.
 *  Too-light colours are progressively darkened. Too-dark colours are
 *  nudged slightly lighter. In-range colours are used as-is. */
function getStructureColour(hex: string): string {
  const lum = getLuminance(hex);
  if (lum >= 0.08 && lum <= 0.35) return hex;
  if (lum > 0.35) {
    let amount = 0.3;
    let result = darkenColour(hex, amount);
    while (getLuminance(result) > 0.30 && amount < 0.75) {
      amount += 0.05;
      result = darkenColour(hex, amount);
    }
    return result;
  }
  // Too dark — nudge slightly lighter by blending 15% toward white
  const clean = hex.replace('#', '');
  const r = Math.round(parseInt(clean.substring(0, 2), 16) * 0.85 + 255 * 0.15);
  const g = Math.round(parseInt(clean.substring(2, 4), 16) * 0.85 + 255 * 0.15);
  const b = Math.round(parseInt(clean.substring(4, 6), 16) * 0.85 + 255 * 0.15);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Returns the darkest useful version of the brand hue for use as a
 *  filled panel background (NCF hero only). Progressively darkens until
 *  luminance ≤ 0.10, staying within the brand hue family. Only falls
 *  back to fixed navy if the brand has no hue to darken (near-pure white). */
function getPanelBg(hex: string): string {
  const lum = getLuminance(hex);
  if (lum <= 0.12) return hex;
  let amount = 0.5;
  let result = darkenColour(hex, amount);
  while (getLuminance(result) > 0.10 && amount < 0.92) {
    amount += 0.05;
    result = darkenColour(hex, amount);
  }
  return getLuminance(result) <= 0.15 ? result : '#1B3A6B';
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


function computeCoverKeyMetric(props: DealScorePDFProps): { label: string; value: string } {
  const dt = props.dealType;
  const mh = hasMeaningfulInputs(props);
  if (dt === 'BTL' || dt === 'HMO' || dt === 'SA' || dt === 'SOCIAL') {
    const cf = dt === 'BTL' ? props.btlResults.monthlyCashFlow
      : dt === 'HMO' ? props.hmoResults.monthlyCashFlow
      : dt === 'SA' ? props.saResults.monthlyCashFlow
      : props.socialResults.monthlyCashFlow;
    return { label: 'Cash Flow', value: mh ? fc(cf) + '/mo' : '\u2014' };
  }
  if (dt === 'FLIP') {
    return { label: 'Profit on Cost', value: mh ? fp(props.flipResults.profitOnCost) : '\u2014' };
  }
  if (dt === 'BRRR') {
    const moneyOut = props.brrrResults.moneyOut && props.purchasePrice > 0;
    return { label: 'Cash Left In', value: mh ? (moneyOut ? '\u221E recycled' : fc(props.brrrResults.cashLeftInDeal)) : '\u2014' };
  }
  return { label: 'Monthly Profit', value: mh ? fc(props.r2rResults.monthlyProfit) + '/mo' : '\u2014' };
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
  sectionLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#2EC4B6',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sectionRule: {
    height: 1,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 8.5,
    color: '#444444',
    lineHeight: 1.55,
  },
  inputColLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#2EC4B6',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 3,
    paddingBottom: 3,
  },
  metCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 8,
    border: '0.5pt solid #d4dae8',
  },
  metCardLabel: { fontSize: 7.5, color: '#6B7280', marginBottom: 3 },
  metCardValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' },
});

export default function DealScorePDF(props: DealScorePDFProps) {
  console.log('[DealScorePDF] props:', props);

  const brand = props.brandColour;
  const coverBg = darkenColour(brand, 0.4);           // darkened brand for cover backgrounds
  const readableBrand = getReadableBrandColour(brand); // brand colour safe as TEXT on white
  const coverBgText = getContrastText(coverBg);        // text colour on darkened cover bg
  const isProPlus = props.tierOverride === 'pro_plus';
  const accent = props.accentColour;

  // ── Intelligent colour system ─────────────────────────────────────────────

  // STRUCTURECOLOUR: section labels, rules, card borders, bullets, timeline,
  // table header text, tint background base. Quality-adjusted to always sit
  // in the legible range on white paper.
  const structureColour = (() => {
    if (isProPlus && accent && getLuminance(accent) < 0.85) {
      return getStructureColour(accent);
    }
    return getStructureColour(brand);
  })();

  // PANELBG: used exclusively for the NCF hero panel. Darkest useful version
  // of the brand hue. Always dark enough for white text.
  const panelBg = getPanelBg(brand);
  const panelText = getContrastText(panelBg);

  // TINTBG: light brand wash for Cash Invested, Key Assumptions panels.
  // Expressed as an rgba string using structureColour parsed to RGB.
  const tintBgRgb = (() => {
    const c = structureColour.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `${r},${g},${b}`;
  })();
  const tintBg = `rgba(${tintBgRgb},0.07)`;
  const tintBorder = `rgba(${tintBgRgb},0.15)`;
  const tintText = structureColour;

  // STRUCTUREBG: fixed neutral for editorial panels (Deal Insights,
  // What This Means, Risk Factors). Never brand-derived.
  const structureBg = '#F8FAFC';

  const LOGO_H: Record<'S' | 'M' | 'L', number> = { S: 35, M: 60, L: 100 };
  const LOGO_MAX_W: Record<'S' | 'M' | 'L', number> = { S: 100, M: 170, L: 280 };
  const logoHeight = LOGO_H[props.logoSize];
  const logoMaxWidth = LOGO_MAX_W[props.logoSize];

  const addressPlain = expandAddress(props.propertyAddress || '') || props.propertyAddress || 'Property Address Not Entered';
  const address = addressPlain;
  const displayAddress = (props.protectAddress && props.protectedAddressDescription)
    ? props.protectedAddressDescription
    : addressPlain;
  const addressForCover = displayAddress;
  const postcodeMatch = addressForCover.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/);
  const addressLine1 = postcodeMatch
    ? addressForCover.replace(postcodeMatch[0], '').replace(/,\s*$/, '').trim()
    : addressForCover;
  const addressLine2 = postcodeMatch ? postcodeMatch[0] : '';
  const [boldLine1, boldLine2, boldLine3] = splitAddressThreeLines(addressForCover);

  // ── Sub-components ──────────────────────────────────────────────────────────

  // Section header: structureColour used for title text (on white) + underline rule
  const SH = ({ title, mt, mb }: { title: string; mt?: number; mb?: number }) => (
    <View style={{ marginBottom: mb ?? 14, marginTop: mt ?? 0 }}>
      <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: structureColour, marginBottom: 4 }}>{title}</Text>
      <View style={{ borderBottom: `1pt solid ${structureColour}` }} />
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
    const _mh = hasMeaningfulInputs(props);
    const g = (v: string) => _mh ? v : '\u2014';
    if (props.dealType === 'BTL') return [
      { label: 'Cash Invested', value: g(fc(props.btlResults.totalCashInvested)) },
      { label: 'Monthly Cash Flow', value: g(fc(props.btlResults.monthlyCashFlow)) },
      { label: 'Gross Yield', value: g(fp(props.btlResults.grossYield)) },
    ];
    if (props.dealType === 'HMO') return [
      { label: 'Cash Invested', value: g(fc(props.hmoResults.totalCashInvested)) },
      { label: 'Monthly Cash Flow', value: g(fc(props.hmoResults.monthlyCashFlow)) },
      { label: 'Gross Yield', value: g(fp(props.hmoResults.grossYield)) },
    ];
    if (props.dealType === 'FLIP') return [
      { label: 'Net Profit', value: g(fc(props.flipResults.netProfit)) },
      { label: 'Total ROI', value: g(fp(props.flipResults.roi)) },
      { label: 'Annualised ROI', value: g(fp(props.flipResults.annualisedROI)) },
    ];
    if (props.dealType === 'SA') return [
      { label: 'Cash Invested', value: g(fc(props.saResults.totalCashInvested)) },
      { label: 'Monthly Cash Flow', value: g(fc(props.saResults.monthlyCashFlow)) },
      { label: 'Net Yield', value: g(fp(props.saResults.netYield)) },
    ];
    if (props.dealType === 'BRRR') return [
      { label: 'Cash Left In', value: _mh ? ((props.brrrResults.moneyOut && props.purchasePrice > 0) ? 'Money Out' : fc(props.brrrResults.cashLeftInDeal)) : '\u2014' },
      { label: 'Monthly Cash Flow', value: g(fc(props.brrrResults.monthlyCashFlow)) },
      { label: 'Equity Created', value: g(fc(props.brrrResults.equityCreated)) },
    ];
    if (props.dealType === 'R2R') return [
      { label: 'Monthly Profit', value: g(fc(props.r2rResults.monthlyProfit)) },
      { label: 'Annual Profit', value: g(fc(props.r2rResults.annualProfit)) },
      { label: 'Net Return on Setup', value: g(fp(props.r2rResults.roi)) },
    ];
    return [
      { label: 'Cash Invested', value: g(fc(props.socialResults.totalCashInvested)) },
      { label: 'Monthly Cash Flow', value: g(fc(props.socialResults.monthlyCashFlow)) },
      { label: 'Gross Yield', value: g(fp(props.socialResults.grossYield)) },
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
  })().map(([label, value, bold]): RowData => [label as string, hasMeaningfulInputs(props) ? value as string : '\u2014', bold as boolean | undefined]);

  const { dims: dealScoreDims, overall: dealScoreOverall } = computeDealScoreBreakdown(props);
  const verdictSummary = generateVerdictSummary(props);
  const whatThisMeans = generateWhatThisMeans(props);

  const execSummaryText = props.executiveSummary.trim();
  const strategyNotesText = props.strategyNotes.trim();
  const propertyDescText = props.propertyDescription.trim();
  const vendorSituationText = props.vendorSituation.trim();
  const hasRationale = true;
  const hasComparables = props.comparables.some(r => r.address.trim());
  const hasLinks = props.listingLinks.some(r => r.url.trim());
  const hasMarketEvidence = hasComparables || hasLinks;
  const hasLegal = !!(props.sourcingFee > 0 || props.preparedBy.name || props.preparedBy.email);

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
  const coverKeyMetric = computeCoverKeyMetric(props);
  console.log('[DealScorePDF] riskFlags:', props.riskFlags);

  const preparedLine = [
    props.preparedBy.name ? `Prepared by ${props.preparedBy.name}` : '',
    props.preparedBy.email,
    props.preparedBy.phone,
  ].filter(Boolean).join(' · ');

  // ── Page 2: Cash Invested breakdown ──────────────────────────────────────
  const p2CiDeposit = props.purchasePrice * props.depositPercent / 100;
  const p2CiAuctionFees = (props.isAuctionPurchase ? (props.buyersPremiumValue ?? 0) : 0) + (props.auctionReservationFeeValue ?? 0);
  const p2CiLeaseExt = props.leaseExtensionCost ?? 0;
  const p2CiTotal = p2CiDeposit + props.effectiveTax + props.refurbCost + props.otherCosts + p2CiAuctionFees + p2CiLeaseExt;

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

  // ── Stress Testing page derived values ───────────────────────────────────
  const stVoidPct = (props.voidAllowancePercent ?? 5) / 100;
  const stMgmtPct = (props.managementFeePercent ?? 10) / 100;
  const stMaintenance = props.maintenanceReserve ?? 75;
  const stInsurance = props.buildingsInsurance ?? 30;
  const stSc = props.serviceCharge ?? 0;
  const stGr = (props.groundRentAnnual ?? 0) / 12;
  const stTotalFixedOpCosts = stMaintenance + stInsurance + stSc + stGr;

  const stGrossRent =
    props.dealType === 'BTL' ? props.btlInputs.monthlyRent :
    props.dealType === 'HMO' ? props.hmoResults.grossMonthlyRent :
    props.dealType === 'SA' ? props.saResults.netMonthlyRevenue :
    props.dealType === 'BRRR' ? props.brrrInputs.monthlyRent :
    props.socialInputs.leaseIncomePerMonth;

  const stCashInvested =
    props.dealType === 'BRRR' ? props.brrrResults.cashLeftInDeal :
    props.dealType === 'BTL' ? props.btlResults.totalCashInvested :
    props.dealType === 'HMO' ? props.hmoResults.totalCashInvested :
    props.dealType === 'SA' ? props.saResults.totalCashInvested :
    props.socialResults.totalCashInvested;

  const stLoanAmount =
    props.dealType === 'BRRR' ? props.brrrResults.refinanceLoan :
    props.dealType === 'BTL' ? props.btlResults.mortgageAmount :
    props.dealType === 'HMO' ? props.hmoResults.mortgageAmount :
    props.dealType === 'SA' ? props.saResults.mortgageAmount :
    props.socialResults.mortgageAmount;

  const stBaseRate =
    props.dealType === 'BRRR' ? props.brrrInputs.newMortgageRate : props.mortgageRate;

  const stEffectiveRent = stGrossRent * (1 - stVoidPct);
  const stMgmtFee = stEffectiveRent * stMgmtPct;
  const stTotalOpCosts = stMgmtFee + stTotalFixedOpCosts;

  const computeStScenario = (offset: number) => {
    const rate = stBaseRate + offset;
    let mortgage: number;
    if (props.mortgageType === 'REPAYMENT') {
      const monthlyRate = rate / 100 / 12;
      const n = props.mortgageTerm * 12;
      mortgage = (monthlyRate === 0 || n <= 0)
        ? (n > 0 ? stLoanAmount / n : 0)
        : (stLoanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
    } else {
      mortgage = stLoanAmount * (rate / 100) / 12;
    }
    const cf = stEffectiveRent - stTotalOpCosts - mortgage;
    const roi = stCashInvested > 0 ? (cf * 12 / stCashInvested) * 100 : 0;
    const payback = (stCashInvested > 0 && cf > 0) ? stCashInvested / (cf * 12) : Infinity;
    return { rate, mortgage, cf, roi, payback };
  };

  const stOpt = computeStScenario(-0.5);
  const stBase = computeStScenario(0);
  const stStress = computeStScenario(1.5);

  const stBreakEvenRent = (stBase.mortgage + stTotalOpCosts) / (1 - stVoidPct);
  const stRentHeadroom = stGrossRent - stBreakEvenRent;
  const stStressCF = stStress.cf;
  const stStressRate = stStress.rate;

  const stPaybackDisplay = (p: { payback: number }) =>
    (p.payback <= 0 || !isFinite(p.payback) || p.payback > 25) ? 'N/A' : `${p.payback.toFixed(1)} yrs`;
  const stCfColor = (v: number) => v > 0 ? '#16A34A' : v < 0 ? '#DC2626' : '#1E2B3C';

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
              {props.companyName.trim() ? (
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 4, letterSpacing: 0.8 }}>
                  {props.companyName.trim()}
                </Text>
              ) : null}
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
            <View>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <View style={{ backgroundColor: scoreColor + '25', borderRadius: 4, paddingVertical: 4, paddingHorizontal: 10, border: `0.5pt solid ${scoreColor}50` }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: scoreColor }}>
                    {VERDICT_LABELS[props.currentScore] ?? ''}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', marginBottom: 1 }}>
                    {coverKeyMetric.label}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }}>
                    {coverKeyMetric.value}
                  </Text>
                </View>
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
            <View>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <View style={{ backgroundColor: scoreColor + '25', borderRadius: 4, paddingVertical: 4, paddingHorizontal: 10, border: `0.5pt solid ${scoreColor}50` }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: scoreColor }}>
                    {VERDICT_LABELS[props.currentScore] ?? ''}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 8, color: coverMuted(coverBg, 0.55), marginBottom: 1 }}>
                    {coverKeyMetric.label}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: coverBgText }}>
                    {coverKeyMetric.value}
                  </Text>
                </View>
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
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                  <View style={{ backgroundColor: scoreColor + '25', borderRadius: 4, paddingVertical: 4, paddingHorizontal: 10, border: `0.5pt solid ${scoreColor}50` }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: scoreColor }}>
                      {VERDICT_LABELS[props.currentScore] ?? ''}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 8, color: '#777777', marginBottom: 1 }}>
                      {coverKeyMetric.label}
                    </Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: readableBrand }}>
                      {coverKeyMetric.value}
                    </Text>
                  </View>
                </View>
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
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                  <View style={{ backgroundColor: scoreColor + '25', borderRadius: 4, paddingVertical: 4, paddingHorizontal: 10, border: `0.5pt solid ${scoreColor}50` }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: scoreColor }}>
                      {VERDICT_LABELS[props.currentScore] ?? ''}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 8, color: coverMuted(coverBg, 0.55), marginBottom: 1 }}>
                      {coverKeyMetric.label}
                    </Text>
                    <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: coverBgText }}>
                      {coverKeyMetric.value}
                    </Text>
                  </View>
                </View>
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

        {/* Top page header — date left, company name centre, page number right */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 6, borderBottom: '0.5pt solid #E2E8F0' }}>
          <Text style={{ flex: 1, fontSize: 7.5, color: '#9ca3af' }}>{props.dateStr}</Text>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textAlign: 'center' }}>{footerCentreText}</Text>
          <Text
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`}
            style={{ flex: 1, fontSize: 7.5, color: '#9ca3af', textAlign: 'right' }}
          />
        </View>

        {/* Incomplete notice */}
        {!hasMeaningfulInputs(props) && (
          <View style={{ backgroundColor: '#FEF3C7', border: '0.5pt solid #F59E0B', borderRadius: 4, padding: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 8.5, color: '#92400E', fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
              Template preview — deal inputs not yet entered
            </Text>
            <Text style={{ fontSize: 8, color: '#92400E', lineHeight: 1.4 }}>
              Enter your deal numbers in the analyser to see real figures in this pack. This preview shows the pack structure only.
            </Text>
          </View>
        )}

        {/* Hero photo — full width 200px */}
        {heroPhoto ? (
          <View style={{ width: '100%', height: 200, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
            <Image src={heroPhoto} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
          </View>
        ) : null}
        {heroPhoto ? (
          <Text style={{ fontSize: 8.5, color: '#9ca3af', textAlign: 'center', marginBottom: 10 }}>{displayAddress}</Text>
        ) : null}

        {/* Auction callout */}
        {props.isAuctionPurchase && props.auctionDate && (
          <View style={{ backgroundColor: '#FEF3CD', borderLeft: '3pt solid #E29839', borderRadius: 3, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#E29839', textTransform: 'uppercase', letterSpacing: 0.6 }}>AUCTION</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{'Auction Date: ' + props.auctionDate}</Text>
              {props.auctionCompletionDate ? (
                <Text style={{ fontSize: 8, color: '#6B7280' }}>{'Completion: ' + props.auctionCompletionDate}</Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Attribute chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {props.propertyType ? (
            <View style={{ borderRadius: 10, border: '0.5pt solid #d4dae8', paddingVertical: 3, paddingHorizontal: 9, backgroundColor: '#f5f7fa' }}>
              <Text style={{ fontSize: 8, color: '#1E2B3C', fontFamily: 'Helvetica-Bold' }}>{props.propertyType}</Text>
            </View>
          ) : null}
          {props.tenure ? (
            <View style={{
              borderRadius: 10,
              border: props.tenure === 'Freehold' ? '0.5pt solid #2EC4B6' : '0.5pt solid #fbbf24',
              paddingVertical: 3, paddingHorizontal: 9,
              backgroundColor: props.tenure === 'Freehold' ? '#E1F5EE' : '#fef3c7',
            }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: props.tenure === 'Freehold' ? '#0F6E56' : '#92400e' }}>{props.tenure}</Text>
            </View>
          ) : null}
          {props.epcRating ? (
            <View style={{ borderRadius: 10, border: '0.5pt solid #d4dae8', paddingVertical: 3, paddingHorizontal: 9, backgroundColor: '#f5f7fa' }}>
              <Text style={{ fontSize: 8, color: '#1E2B3C', fontFamily: 'Helvetica-Bold' }}>{`${props.epcRating} EPC`}</Text>
            </View>
          ) : null}
          {props.floodRisk ? (
            <View style={{ borderRadius: 10, border: '0.5pt solid #d4dae8', paddingVertical: 3, paddingHorizontal: 9, backgroundColor: '#f5f7fa' }}>
              <Text style={{ fontSize: 8, color: '#1E2B3C', fontFamily: 'Helvetica-Bold' }}>
                {props.floodRisk.includes('No') ? 'No Flood Risk' : props.floodRisk}
              </Text>
            </View>
          ) : null}
          <View style={{ borderRadius: 10, border: `0.5pt solid ${structureColour}`, paddingVertical: 3, paddingHorizontal: 9 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour }}>{DEAL_LABELS[props.dealType].replace(' Analysis', '')}</Text>
          </View>
        </View>

        {/* Two-column: Property Details (left) + Executive Summary (right) */}
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, marginBottom: 2 }}>Property Details</Text>
            <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
            {([
              ...(props.propertyAddress ? [['Address', displayAddress, true] as RowData] : []),
              ['Property Type', props.propertyType] as RowData,
              ...(props.bedrooms && props.bedrooms > 0 ? [['Bedrooms', `${props.bedrooms}`] as RowData] : []),
              ...(props.bathrooms && props.bathrooms > 0 ? [['Bathrooms', `${props.bathrooms}`] as RowData] : []),
              ['Tenure', props.tenure] as RowData,
              ...(props.tenure === 'Leasehold' && props.leaseLengthYears > 0
                ? [['Remaining Lease', `${props.leaseLengthYears} years`] as RowData] : []),
              ...(props.floorArea ? [['Floor Area', `${props.floorArea} m\u00B2`] as RowData] : []),
              ...(props.floorAreaUnit === 'sqft' && props.pricePerSqFt != null
                ? [['Price / sq ft', `£${Math.round(props.pricePerSqFt).toLocaleString('en-GB')}`] as RowData]
                : props.pricePerSqM != null
                ? [['Price / m²', `£${Math.round(props.pricePerSqM).toLocaleString('en-GB')}`] as RowData]
                : []),
              ...(props.constructionDate ? [['Construction Date', props.constructionDate] as RowData] : []),
            ] as RowData[]).map(([label, value, bold], i) => (
              <View key={i} style={[base.tableRow, i % 2 === 0 ? base.tableRowAlt : {}]}>
                <Text style={[base.tableLabel, { fontSize: 8 }]}>{label}</Text>
                <Text style={[bold ? base.tableValueHighlight : base.tableValue, { fontSize: 8 }]}>{value}</Text>
              </View>
            ))}
            {props.tenure === 'Leasehold' && props.remainingLeaseYears != null && props.remainingLeaseYears > 0 && (() => {
              const yrs = props.remainingLeaseYears!;
              const leaseColor = yrs < 70 ? '#A32D2D' : yrs < 80 ? '#E29839' : '#1E2B3C';
              const leaseWarning = yrs < 70 ? ' — Mortgage risk' : yrs < 80 ? ' — Below lender threshold' : '';
              const leaseBg = yrs < 70 ? '#FEE2E2' : yrs < 80 ? '#FEF3CD' : undefined;
              return (
                <View style={[base.tableRow, leaseBg ? { backgroundColor: leaseBg } : {}]}>
                  <Text style={[base.tableLabel, { fontSize: 8, color: leaseColor }]}>Remaining Lease</Text>
                  <Text style={[base.tableValue, { fontSize: 8, color: leaseColor, fontFamily: 'Helvetica-Bold' }]}>{`${yrs} years${leaseWarning}`}</Text>
                </View>
              );
            })()
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, marginBottom: 2 }}>Executive Summary</Text>
            <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
            {execSummaryText ? (
              <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{execSummaryText}</Text>
            ) : null}
          </View>
        </View>

        {/* Three hero metric cards */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {heroMetrics.map(({ label, value }) => (
            <View key={label} style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2.5pt solid ${structureColour}`, borderRadius: 4, padding: 10 }}>
              <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', lineHeight: 1, marginBottom: 4 }}>{value}</Text>
              <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* BMV strip */}
        {props.bmvAmount > 0 && props.dealType !== 'R2R' && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f0fdf4',
            border: '0.5pt solid #86efac',
            borderRadius: 4,
            paddingVertical: 8,
            paddingHorizontal: 12,
            marginBottom: 12,
          }}>
            <View>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#166534', marginBottom: 3 }}>BELOW MARKET VALUE</Text>
              <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.bmvAmount)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`${props.bmvPercent.toFixed(1)}%`}</Text>
              <Text style={{ fontSize: 7.5, color: '#6B7280', textAlign: 'right', marginTop: 2 }}>BMV discount</Text>
            </View>
          </View>
        )}

      </Page>

      {/* ── Page 3: Deal Inputs + Cash Invested ────────────────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />

        <SH title="Deal Inputs" />

        {/* Two-column inputs — first half left, second half right */}
        {(() => {
          const half = Math.ceil(inputRows.length / 2);
          const leftRows = inputRows.slice(0, half);
          const rightRows = inputRows.slice(half);
          return (
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3, paddingBottom: 3, borderBottom: `1pt solid ${structureColour}` }}>
                  {props.dealType === 'R2R' ? 'Rental Agreement' : props.dealType === 'FLIP' ? 'Purchase & Project' : props.dealType === 'BRRR' ? 'Purchase & Refinance' : 'Purchase & Mortgage'}
                </Text>
                {leftRows.map(([label, value, bold], i) => (
                  <View key={i} style={[base.tableRow, i % 2 === 0 ? base.tableRowAlt : {}]}>
                    <Text style={[base.tableLabel, { fontSize: 8.5 }]}>{label}</Text>
                    <Text style={[bold ? base.tableValueHighlight : base.tableValue, { fontSize: 8.5 }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3, paddingBottom: 3, borderBottom: `1pt solid ${structureColour}` }}>
                  {props.dealType === 'FLIP' ? 'Sale & Returns' : 'Income & Costs'}
                </Text>
                {rightRows.map(([label, value, bold], i) => (
                  <View key={i} style={[base.tableRow, i % 2 === 0 ? base.tableRowAlt : {}]}>
                    <Text style={[base.tableLabel, { fontSize: 8.5 }]}>{label}</Text>
                    <Text style={[bold ? base.tableValueHighlight : base.tableValue, { fontSize: 8.5 }]}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Cash Invested — BTL / HMO / SA / SOCIAL */}
        {(props.dealType === 'BTL' || props.dealType === 'HMO' || props.dealType === 'SA' || props.dealType === 'SOCIAL') && (
          <View wrap={false}>
            <SH title="Cash Invested" mt={8} mb={8} />
            <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 14, borderTop: `2pt solid ${structureColour}` }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>{`Deposit (${props.depositPercent}%)`}</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(p2CiDeposit)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>{props.taxLabel}</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.effectiveTax)}</Text>
                </View>
                {props.refurbCost > 0 && (
                  <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, color: tintText }}>Refurb Cost</Text>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.refurbCost)}</Text>
                  </View>
                )}
                {props.otherCosts > 0 && (
                  <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, color: tintText }}>Other Costs</Text>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.otherCosts)}</Text>
                  </View>
                )}
                {props.isAuctionPurchase && (props.buyersPremiumValue ?? 0) > 0 && (
                  <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, color: tintText }}>{"Buyer's Premium"}</Text>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.buyersPremiumValue!)}</Text>
                  </View>
                )}
                {(props.auctionReservationFeeValue ?? 0) > 0 && (
                  <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, color: tintText }}>Reservation Fee</Text>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.auctionReservationFeeValue!)}</Text>
                  </View>
                )}
                {(props.leaseExtensionCost ?? 0) > 0 && (
                  <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, color: tintText }}>Lease Extension</Text>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.leaseExtensionCost!)}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1pt solid ${tintBorder}` }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: tintText, textTransform: 'uppercase', letterSpacing: 0.5 }}>TOTAL CASH INVESTED</Text>
                <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(p2CiTotal)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Cash Invested — BRRR */}
        {props.dealType === 'BRRR' && (
          <View wrap={false}>
            <SH title="Cash Invested" mt={8} mb={8} />
            <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 14, borderTop: `2pt solid ${structureColour}` }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Initial Cash Out</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.brrrResults.totalCostIn)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Refinance Proceeds</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`(${fc(props.brrrResults.refinanceLoan)})`}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1pt solid ${tintBorder}` }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: tintText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {props.brrrResults.moneyOut ? 'MONEY OUT' : 'CASH LEFT IN DEAL'}
                </Text>
                <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>
                  {props.brrrResults.moneyOut
                    ? `${fc(Math.abs(props.brrrResults.cashLeftInDeal))} OUT`
                    : fc(props.brrrResults.cashLeftInDeal)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Setup Costs panel — R2R only */}
        {props.dealType === 'R2R' && (
          <View wrap={false}>
            <SH title="Setup Costs" mt={8} mb={8} />
            <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14, borderTop: `2pt solid ${structureColour}` }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Monthly Rent to Landlord</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.r2rInputs.monthlyRentPaid)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Gross Monthly Income</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.r2rResults.grossMonthlyIncome)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Monthly Spread</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Monthly Running Costs</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.r2rInputs.monthlyRunningCosts)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1pt solid ${tintBorder}` }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: tintText, textTransform: 'uppercase', letterSpacing: 0.5 }}>TOTAL SETUP COSTS</Text>
                <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.r2rInputs.setupCosts)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Project Cost panel — FLIP only */}
        {props.dealType === 'FLIP' && (
          <View wrap={false}>
            <SH title="Project Cost Summary" mt={8} mb={8} />
            <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14, borderTop: `2pt solid ${structureColour}` }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Purchase Price</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.purchasePrice)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Stamp Duty</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.effectiveTax)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Refurb Cost</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.refurbCost)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Holding Costs</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.flipInputs.holdingCostsPerMonth * props.flipInputs.projectLengthMonths)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Selling Costs</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.flipResults.sellingCosts)}</Text>
                </View>
                <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                  <Text style={{ fontSize: 8, color: tintText }}>Target GDV</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.flipInputs.expectedSalePrice)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1pt solid ${tintBorder}` }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: tintText, textTransform: 'uppercase', letterSpacing: 0.5 }}>NET PROFIT</Text>
                <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.flipResults.netProfit)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Deal Insights paragraph */}
        {(() => {
          let insightText = '';
          if (props.dealType === 'BTL') {
            const mortgagePct = Math.round((fdMortgagePayment / props.btlInputs.monthlyRent) * 100);
            const capitalEfficiency = props.btlResults.grossYield >= 7 ? 'efficient' : props.btlResults.grossYield >= 5 ? 'moderate' : 'stretched';
            const refurbLine = props.refurbCost > 0
              ? ` Refurb and acquisition costs of ${fc(props.refurbCost + props.otherCosts)} represent ${((props.refurbCost + props.otherCosts) / props.purchasePrice * 100).toFixed(1)}% of purchase price.`
              : '';
            insightText = `A ${props.depositPercent}% deposit on a ${fc(props.purchasePrice)} purchase commits ${fc(props.btlResults.totalCashInvested)} of capital — ${capitalEfficiency} use relative to the ${fp(props.btlResults.grossYield)} gross yield generated. The mortgage at ${props.mortgageRate}% consumes ${mortgagePct}% of gross rent, leaving ${fc(props.btlResults.netOperatingIncome > 0 ? props.btlResults.netOperatingIncome : 0)} net operating income before debt service.${refurbLine}`;
          } else if (props.dealType === 'HMO') {
            insightText = `${props.hmoInputs.rooms} rooms at ${fc(props.hmoInputs.rentPerRoom)}/mo at ${props.hmoInputs.occupancyRate}% occupancy generates ${fc(props.hmoResults.grossMonthlyRent)} gross monthly rent. After mortgage and all expenses, net cash flow is ${fc(props.hmoResults.monthlyCashFlow)}, representing ${fp(props.hmoResults.cashOnCashROI)} cash-on-cash return on ${fc(props.hmoResults.totalCashInvested)} invested.`;
          } else if (props.dealType === 'BRRR') {
            insightText = `Total cash in of ${fc(props.brrrResults.totalCostIn)} is ${props.brrrResults.moneyOut ? 'fully recycled — this deal is money out.' : `partially recycled via refinance, leaving ${fc(props.brrrResults.cashLeftInDeal)} in the deal.`} The ${props.brrrInputs.refinancePercent}% refinance of a ${fc(props.brrrInputs.postRefurbValue)} GDV releases ${fc(props.brrrResults.refinanceLoan)}.`;
          } else if (props.dealType === 'SA') {
            insightText = `At ${props.saInputs.occupancyPercent}% occupancy and ${fc(props.saInputs.nightlyRate)}/night, gross monthly revenue is ${fc(props.saResults.grossMonthlyRevenue)}. After platform fees of ${fp(props.saInputs.platformFeesPercent)} and running costs, net monthly cash flow is ${fc(props.saResults.monthlyCashFlow)}.`;
          } else if (props.dealType === 'R2R') {
            insightText = `Monthly rent paid to landlord of ${fc(props.r2rInputs.monthlyRentPaid)} sub-let for ${fc(props.r2rResults.grossMonthlyIncome)}, generating a monthly spread of ${fc(props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid)}. Setup costs of ${fc(props.r2rInputs.setupCosts)} recover in ${props.r2rResults.monthlyProfit > 0 ? Math.ceil(props.r2rInputs.setupCosts / props.r2rResults.monthlyProfit) + ' months' : 'N/A'} at current profit.`;
          } else if (props.dealType === 'FLIP') {
            insightText = `Total project cost of ${fc(props.flipResults.totalCost)} against a GDV of ${fc(props.flipInputs.expectedSalePrice)} produces a gross margin of ${((props.flipResults.netProfit / props.flipInputs.expectedSalePrice) * 100).toFixed(1)}%. ROI of ${fp(props.flipResults.roi)} ${props.flipResults.roi >= 12 ? 'exceeds' : 'falls short of'} the 12% minimum threshold.`;
          } else {
            insightText = `A ${props.depositPercent}% deposit on a ${fc(props.purchasePrice)} purchase commits ${fc(props.socialResults.totalCashInvested)} of capital with ${fp(props.socialResults.grossYield)} gross yield. After mortgage and management costs, net cash flow is ${fc(props.socialResults.monthlyCashFlow)} on a guaranteed lease income of ${fc(props.socialInputs.leaseIncomePerMonth)}/mo.`;
          }
          if (!insightText) return null;
          return (
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 3, paddingVertical: 8, paddingHorizontal: 10, marginTop: 12, borderLeft: `2pt solid ${structureColour}` }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Deal Insights</Text>
              <Text style={{ fontSize: 8.5, color: '#1E2B3C', lineHeight: 1.55 }}>{insightText}</Text>
            </View>
          );
        })()}
      </Page>

      {/* ── Page 4: Financial Analysis ─────────────────────────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />

        <SH title={DEAL_LABELS[props.dealType]} />

        {/* Verdict badge — overall score on right */}
        {props.currentScore !== 'Incomplete' && (
          <View style={{
            marginBottom: 10,
            borderLeftWidth: 4,
            borderLeftColor: scoreColor,
            borderLeftStyle: 'solid',
            backgroundColor: SCORE_TINT[props.currentScore] ?? 'rgba(107,114,128,0.09)',
            paddingVertical: 8,
            paddingHorizontal: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1B2B4B' }}>
              {VERDICT_LABELS[props.currentScore] ?? props.currentScore}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={{ fontSize: 32, fontFamily: 'Helvetica-Bold', color: '#1B2B4B', lineHeight: 1 }}>{dealScoreOverall.toFixed(1)}</Text>
              <Text style={{ fontSize: 14, color: '#9ca3af' }}>/ 10</Text>
            </View>
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

        {/* Deal Score Breakdown Table — progress bars flex full-width, overall score removed */}
        {props.currentScore !== 'Incomplete' && (
          <View style={{ marginBottom: 8, borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 5, paddingHorizontal: 8, borderBottom: '0.5pt solid #E5E7EB' }}>
              <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280' }}>DIMENSION</Text>
              <Text style={{ width: 50, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280', textAlign: 'center' }}>SCORE</Text>
              <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280' }}></Text>
            </View>
            {dealScoreDims.map((dim, i) => {
              const barColor = dim.score >= 7 ? '#22C55E' : dim.score >= 4 ? '#F59E0B' : '#EF4444';
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB', borderBottom: i < dealScoreDims.length - 1 ? '0.5pt solid #E5E7EB' : undefined }}>
                  <Text style={{ flex: 1, fontSize: 8.5, color: '#1E2B3C' }}>{dim.name}</Text>
                  <Text style={{ width: 50, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'center' }}>{dim.score} / 10</Text>
                  <View style={{ flex: 1, height: 7, backgroundColor: '#F3F4F6', borderRadius: 2 }}>
                    <View style={{ width: `${(dim.score / 10) * 100}%`, height: 7, backgroundColor: barColor, borderRadius: 2 }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Verdict summary sentence */}
        {verdictSummary ? (
          <Text style={{ fontSize: 9.5, color: '#1E2B3C', marginBottom: 10, lineHeight: 1.45 }}>{verdictSummary}</Text>
        ) : null}

        {/* Three-group analysis panel */}
        {(() => {
          const mh = hasMeaningfulInputs(props);
          const g = (v: string) => mh ? v : '\u2014';
          const dt = props.dealType;

          // Group 1 — What I Commit rows
          const commitRows: [string, string][] = (() => {
            if (dt === 'BTL' || dt === 'HMO' || dt === 'SA' || dt === 'SOCIAL') {
              const ci = dt === 'BTL' ? props.btlResults.totalCashInvested
                : dt === 'HMO' ? props.hmoResults.totalCashInvested
                : dt === 'SA' ? props.saResults.totalCashInvested
                : props.socialResults.totalCashInvested;
              return [['Cash Invested', g(fc(ci))]];
            }
            if (dt === 'FLIP') return [
              ['Total Cost In', g(fc(props.flipResults.totalCost))],
              ['Net Profit', g(fc(props.flipResults.netProfit))],
            ];
            if (dt === 'BRRR') {
              const mo = props.brrrResults.moneyOut && props.purchasePrice > 0;
              return [
                ['Cash Invested', g(fc(props.brrrResults.totalCostIn))],
                ['Cash Left In', mh ? (mo ? '\u221E recycled' : fc(props.brrrResults.cashLeftInDeal)) : '\u2014'],
                ['Refinance Loan', g(fc(props.brrrResults.refinanceLoan))],
              ];
            }
            return [['Setup Costs', g(fc(props.r2rInputs.setupCosts))]];
          })();

          // Group 2 — Monthly
          const btlMortgage = Math.max(0, props.btlInputs.monthlyRent - props.btlResults.monthlyCashFlow - props.btlInputs.monthlyExpenses);
          const mortgageVal: string | null = (dt === 'FLIP' || dt === 'R2R') ? null
            : g(fc(dt === 'BTL' ? btlMortgage
              : dt === 'HMO' ? props.hmoResults.monthlyMortgageInterest
              : dt === 'SA' ? props.saResults.monthlyMortgage
              : dt === 'BRRR' ? props.brrrResults.monthlyMortgage
              : props.socialResults.monthlyMortgage));

          const opCostLabel = dt === 'FLIP' ? 'Holding Costs /mo' : 'Operating Costs';
          const opCostVal = g(fc(
            dt === 'BTL' ? props.btlInputs.monthlyExpenses
            : dt === 'HMO' ? props.hmoInputs.monthlyExpenses
            : dt === 'SA' ? props.saInputs.monthlyRunningCosts
            : dt === 'BRRR' ? props.brrrInputs.monthlyExpenses
            : dt === 'R2R' ? props.r2rInputs.monthlyRunningCosts
            : dt === 'SOCIAL' ? props.socialInputs.managementCostsPerMonth
            : props.flipInputs.holdingCostsPerMonth
          ));

          const cfVal = dt === 'BTL' ? props.btlResults.monthlyCashFlow
            : dt === 'HMO' ? props.hmoResults.monthlyCashFlow
            : dt === 'SA' ? props.saResults.monthlyCashFlow
            : dt === 'BRRR' ? props.brrrResults.monthlyCashFlow
            : dt === 'SOCIAL' ? props.socialResults.monthlyCashFlow
            : dt === 'R2R' ? props.r2rResults.monthlyProfit
            : props.flipResults.netProfit;

          const cfLabel = dt === 'R2R' ? 'Monthly Profit' : dt === 'FLIP' ? 'Net Profit' : 'Cash Flow';
          const cfColor = mh ? (cfVal >= 0 ? '#22C55E' : '#EF4444') : '#1E2B3C';

          // Group 3 — Returns rows
          const returnRows: [string, string][] = (() => {
            if (dt === 'BTL' || dt === 'SA' || dt === 'SOCIAL') {
              const coc = dt === 'BTL' ? props.btlResults.cashOnCashROI : dt === 'SA' ? props.saResults.cashOnCashROI : props.socialResults.cashOnCashROI;
              const gy = dt === 'BTL' ? props.btlResults.grossYield : dt === 'SA' ? props.saResults.grossYield : props.socialResults.grossYield;
              return [['Cash-on-Cash ROI', g(fp(coc))], ['Gross Yield', g(fp(gy))]];
            }
            if (dt === 'HMO') {
              const ppr = props.hmoInputs.rooms > 0 ? props.hmoResults.monthlyCashFlow / props.hmoInputs.rooms : 0;
              return [
                ['Cash-on-Cash ROI', g(fp(props.hmoResults.cashOnCashROI))],
                ['Gross Yield', g(fp(props.hmoResults.grossYield))],
                ['Profit Per Room /mo', g(fc(ppr))],
              ];
            }
            if (dt === 'BRRR') {
              const mo = props.brrrResults.moneyOut && props.purchasePrice > 0;
              return [
                ['Cash-on-Cash ROI', mh ? (mo ? '\u221E recycled' : fp(props.brrrResults.cashOnCashROI)) : '\u2014'],
                ['Gross Yield (on GDV)', g(fp(props.brrrResults.grossYield))],
              ];
            }
            if (dt === 'FLIP') return [
              ['Total ROI', g(fp(props.flipResults.roi))],
              ['Annualised ROI', g(fp(props.flipResults.annualisedROI))],
              ['Profit on Cost', g(fp(props.flipResults.profitOnCost))],
            ];
            return [
              ['ROI on Setup', g(fp(props.r2rResults.roi))],
              ['Monthly Spread', g(fc(props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid))],
            ];
          })();

          return (
            <View style={{ marginBottom: 10 }}>
              {/* Group 1 — What I Commit */}
              <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8, borderTop: `2pt solid ${structureColour}` }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>What I Commit</Text>
                {commitRows.map(([lbl, val]) => (
                  <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                    <Text style={{ fontSize: 8.5, color: '#6B7280' }}>{lbl}</Text>
                    <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{val}</Text>
                  </View>
                ))}
              </View>

              {/* Group 2 — Monthly */}
              <View style={{ border: '0.5pt solid #E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderBottom: `1.5pt solid ${structureColour}` }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8 }}>Monthly</Text>
                </View>
                <View style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                  {mortgageVal !== null && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                      <Text style={{ fontSize: 8.5, color: '#6B7280' }}>Mortgage</Text>
                      <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{mortgageVal}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                    <Text style={{ fontSize: 8.5, color: '#6B7280' }}>{opCostLabel}</Text>
                    <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{opCostVal}</Text>
                  </View>
                  {dt !== 'FLIP' && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, marginTop: 2, borderTop: '0.5pt solid #E5E7EB' }}>
                      <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{cfLabel}</Text>
                      <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: cfColor }}>{g(fc(cfVal))}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Group 3 — Returns */}
              <View style={{ border: '0.5pt solid #E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderBottom: `1.5pt solid ${structureColour}` }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8 }}>Returns</Text>
                </View>
                <View style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                  {returnRows.map(([lbl, val]) => (
                    <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                      <Text style={{ fontSize: 8.5, color: '#6B7280' }}>{lbl}</Text>
                      <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{val}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );
        })()}

        {/* What This Means */}
        {whatThisMeans && hasMeaningfulInputs(props) ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: structureColour, marginBottom: 5 }}>What This Means</Text>
            <Text style={{ fontSize: 9, color: '#1E2B3C', lineHeight: 1.5 }}>{whatThisMeans}</Text>
          </View>
        ) : null}

        {/* Sensitivity Analysis — stress test */}
        {props.stressTest && (
          <View style={{ marginTop: 10 }}>
            <SH title="Sensitivity Analysis" />
            <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 5, paddingHorizontal: 8, borderBottom: `1.5pt solid ${structureColour}` }}>
                <Text style={{ flex: 1.8, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour }}>METRIC</Text>
                <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>BASE CASE</Text>
                <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>RENT {'\u221210%'}</Text>
                <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>RATE +1.5%</Text>
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 5, paddingHorizontal: 8, borderTop: '0.5pt solid #E5E7EB' }}>
                <Text style={{ flex: 1.8, fontSize: 8.5, color: '#1E2B3C' }}>Monthly Cash Flow</Text>
                {([props.stressTest.baseCashFlow, props.stressTest.rentDownCashFlow, props.stressTest.rateUpCashFlow] as number[]).map((v, i) => (
                  <Text key={i} style={{ flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>
                    {hasMeaningfulInputs(props) ? fc(v) : '\u2014'}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 5, paddingHorizontal: 8, borderTop: '0.5pt solid #E5E7EB' }}>
                <Text style={{ flex: 1.8, fontSize: 8.5, color: '#1E2B3C' }}>Cash-on-Cash ROI</Text>
                {([props.stressTest.baseCoC, props.stressTest.rentDownCoC, props.stressTest.rateUpCoC] as number[]).map((v, i) => (
                  <Text key={i} style={{ flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>
                    {hasMeaningfulInputs(props) ? (isFinite(v) ? fp(v) : '\u221E') : '\u2014'}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

      </Page>

      {/* ── Financial Detail Page ─────────────────────────────────────────── */}
      {(props.dealType === 'BTL' || props.dealType === 'HMO' ||
        props.dealType === 'SA' || props.dealType === 'BRRR' ||
        props.dealType === 'SOCIAL') && !hasMeaningfulInputs(props) && (
        <Page size="A4" style={base.page}>
          <Footer />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>Financial Detail</Text>
            <Text style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>Enter your deal inputs to see the full financial breakdown.</Text>
          </View>
        </Page>
      )}
      {(props.dealType === 'BTL' || props.dealType === 'HMO' ||
        props.dealType === 'SA' || props.dealType === 'BRRR' ||
        props.dealType === 'SOCIAL') && hasMeaningfulInputs(props) && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Financial Detail" />

          {/* NET CASH FLOW hero panel */}
          <View style={{ backgroundColor: panelBg, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Net Cash Flow</Text>
              <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold', color: 'white', lineHeight: 1 }}>{fc(activeResults.monthlyCashFlow)}</Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{`${fc(activeResults.monthlyCashFlow * 12)} annually`}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Net Operating Income</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.85)' }}>{`${fc(activeResults.netOperatingIncome)} / mo`}</Text>
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Mortgage Payment</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.85)' }}>{`${fc(fdMortgagePayment)} / mo`}</Text>
              </View>
            </View>
          </View>

          {/* Waterfall — wrapped in border container with updated header */}
          <View style={{ border: '0.5pt solid #E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 5, paddingHorizontal: 8, borderBottom: '0.5pt solid #E5E7EB' }}>
              <Text style={{ flex: 2, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase' }}>Item</Text>
              <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280', textAlign: 'right', textTransform: 'uppercase' }}>Monthly</Text>
              <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6B7280', textAlign: 'right', textTransform: 'uppercase' }}>Annual</Text>
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA' }}>
              <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Gross Rent</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{fc(fdGrossRent)}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{fc(fdGrossRent * 12)}</Text>
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
              <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>{`Void Allowance (${fdVoidPct}%)`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(activeResults.voidAllowanceAmount)})`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(activeResults.voidAllowanceAmount * 12)})`}</Text>
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA', borderTop: `1pt solid ${structureColour}` }}>
              <Text style={{ flex: 2, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>Effective Rent</Text>
              <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.effectiveRent)}</Text>
              <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.effectiveRent * 12)}</Text>
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
              <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>{`Management Fee (${fdMgmtPct}%)`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(activeResults.managementFeeAmount)})`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(activeResults.managementFeeAmount * 12)})`}</Text>
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA' }}>
              <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Maintenance Reserve</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdMaintenance)})`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdMaintenance * 12)})`}</Text>
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
              <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Buildings Insurance</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdInsurance)})`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdInsurance * 12)})`}</Text>
            </View>
            {fdSc > 0 && (
              <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA' }}>
                <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Service Charge</Text>
                <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdSc)})`}</Text>
                <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdSc * 12)})`}</Text>
              </View>
            )}
            {fdGr > 0 && (
              <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
                <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Ground Rent</Text>
                <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdGrMonthly)})`}</Text>
                <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdGr)})`}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#FAFAFA', borderTop: `1pt solid ${structureColour}` }}>
              <Text style={{ flex: 2, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>Net Operating Income</Text>
              <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.netOperatingIncome)}</Text>
              <Text style={{ flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.netOperatingIncome * 12)}</Text>
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ffffff' }}>
              <Text style={{ flex: 2, fontSize: 9, color: '#1E2B3C' }}>Mortgage Payment</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdMortgagePayment)})`}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: '#1E2B3C', textAlign: 'right' }}>{`(${fc(fdMortgagePayment * 12)})`}</Text>
            </View>
            <View style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, backgroundColor: '#FAFAFA', borderTop: `1pt solid ${structureColour}` }}>
              <Text style={{ flex: 2, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>NET CASH FLOW</Text>
              <Text style={{ flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.monthlyCashFlow)}</Text>
              <Text style={{ flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'right' }}>{fc(activeResults.monthlyCashFlow * 12)}</Text>
            </View>
          </View>

          {/* Key Metrics 2×2 — brand top border only */}
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Key Metrics</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2pt solid ${structureColour}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 7.5, color: '#6B7280', marginBottom: 3 }}>Cash-on-Cash ROI</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fp(activeResults.cashOnCashROI)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2pt solid ${structureColour}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 7.5, color: '#6B7280', marginBottom: 3 }}>Gross Yield</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fp(activeResults.grossYield)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2pt solid ${structureColour}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 7.5, color: '#6B7280', marginBottom: 3 }}>Net Yield</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fp(activeResults.netYield)}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2pt solid ${structureColour}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 7.5, color: '#6B7280', marginBottom: 3 }}>Payback Period</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fdPaybackDisplay}</Text>
            </View>
          </View>
        </Page>
      )}

      {/* ── Stress Testing Page ───────────────────────────────────────────── */}
      {(props.dealType === 'BTL' || props.dealType === 'HMO' ||
        props.dealType === 'SA' || props.dealType === 'BRRR' ||
        props.dealType === 'SOCIAL') && !hasMeaningfulInputs(props) && (
        <Page size="A4" style={base.page}>
          <Footer />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'Helvetica-Bold', marginBottom: 6 }}>Stress Testing</Text>
            <Text style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>Enter your deal inputs to see stress testing.</Text>
          </View>
        </Page>
      )}
      {(props.dealType === 'BTL' || props.dealType === 'HMO' ||
        props.dealType === 'SA' || props.dealType === 'BRRR' ||
        props.dealType === 'SOCIAL') && hasMeaningfulInputs(props) && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Stress Testing" />

          <Text style={{ fontSize: 8, color: '#64748B', fontFamily: 'Helvetica-Oblique', marginBottom: 14, marginTop: -8 }}>
            Analysis based on interest rate movements. Rent held constant across all scenarios.
          </Text>

          {/* Table header — navy */}
          <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 5, paddingHorizontal: 8, borderBottom: `1.5pt solid ${structureColour}` }}>
            <Text style={{ flex: 2.4, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour }}> </Text>
            <Text style={{ flex: 1.2, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'center' }}>
              {`OPTIMISTIC\nRate -0.5%`}
            </Text>
            <Text style={{ flex: 1.2, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'center' }}>
              {`BASE CASE\nCurrent Rate`}
            </Text>
            <Text style={{ flex: 1.2, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'center' }}>
              {`STRESS\nRate +1.5%`}
            </Text>
          </View>

          {/* Row 1: Mortgage Rate */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FAFAFA', borderBottom: '0.5pt solid #E5E7EB' }}>
            <Text style={{ flex: 2.4, fontSize: 8.5, color: '#1E2B3C' }}>Mortgage Rate</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{stOpt.rate.toFixed(2)}%</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center', borderLeftWidth: 2, borderLeftColor: structureColour, borderLeftStyle: 'solid' }}>{stBase.rate.toFixed(2)}%</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{stStress.rate.toFixed(2)}%</Text>
          </View>

          {/* Row 2: Monthly Mortgage */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderBottom: '0.5pt solid #E5E7EB' }}>
            <Text style={{ flex: 2.4, fontSize: 8.5, color: '#1E2B3C' }}>Monthly Mortgage</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{fc(stOpt.mortgage)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center', borderLeftWidth: 2, borderLeftColor: structureColour, borderLeftStyle: 'solid' }}>{fc(stBase.mortgage)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{fc(stStress.mortgage)}</Text>
          </View>

          {/* Row 3: Monthly Cash Flow */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FAFAFA', borderBottom: '0.5pt solid #E5E7EB' }}>
            <Text style={{ flex: 2.4, fontSize: 8.5, color: '#1E2B3C' }}>Monthly Cash Flow</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: stCfColor(stOpt.cf), textAlign: 'center' }}>{fc(stOpt.cf)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: stCfColor(stBase.cf), textAlign: 'center', borderLeftWidth: 2, borderLeftColor: structureColour, borderLeftStyle: 'solid' }}>{fc(stBase.cf)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: stCfColor(stStress.cf), textAlign: 'center' }}>{fc(stStress.cf)}</Text>
          </View>

          {/* Row 4: Cash-on-Cash ROI */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderBottom: '0.5pt solid #E5E7EB' }}>
            <Text style={{ flex: 2.4, fontSize: 8.5, color: '#1E2B3C' }}>Cash-on-Cash ROI</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: stCfColor(stOpt.roi), textAlign: 'center' }}>{fp(stOpt.roi)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: stCfColor(stBase.roi), textAlign: 'center', borderLeftWidth: 2, borderLeftColor: structureColour, borderLeftStyle: 'solid' }}>{fp(stBase.roi)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: stCfColor(stStress.roi), textAlign: 'center' }}>{fp(stStress.roi)}</Text>
          </View>

          {/* Light divider */}
          <View style={{ height: 6, backgroundColor: '#F8FAFC', borderBottom: '0.5pt solid #E5E7EB' }} />

          {/* Row 5: Break-Even Rent */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FAFAFA', borderBottom: '0.5pt solid #E5E7EB' }}>
            <Text style={{ flex: 2.4, fontSize: 8.5, color: '#1E2B3C' }}>Break-Even Rent</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{fc(stBreakEvenRent)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center', borderLeftWidth: 2, borderLeftColor: structureColour, borderLeftStyle: 'solid' }}>{fc(stBreakEvenRent)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{fc(stBreakEvenRent)}</Text>
          </View>

          {/* Row 6: Rent Headroom */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderBottom: '0.5pt solid #E5E7EB' }}>
            <Text style={{ flex: 2.4, fontSize: 8.5, color: '#1E2B3C' }}>Rent Headroom</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{fc(stRentHeadroom)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center', borderLeftWidth: 2, borderLeftColor: structureColour, borderLeftStyle: 'solid' }}>{fc(stRentHeadroom)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{fc(stRentHeadroom)}</Text>
          </View>

          {/* Light divider */}
          <View style={{ height: 6, backgroundColor: '#F8FAFC', borderBottom: '0.5pt solid #E5E7EB' }} />

          {/* Row 7: Payback Period */}
          <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FAFAFA' }}>
            <Text style={{ flex: 2.4, fontSize: 8.5, color: '#1E2B3C' }}>Payback Period</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{stPaybackDisplay(stOpt)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center', borderLeftWidth: 2, borderLeftColor: structureColour, borderLeftStyle: 'solid' }}>{stPaybackDisplay(stBase)}</Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: '#1E2B3C', textAlign: 'center' }}>{stPaybackDisplay(stStress)}</Text>
          </View>

          {/* Three break-even callout cards */}
          {(() => {
            const beOpt = stBreakEvenRent > 0 && fdGrossRent > 0 ? Math.max(0, (1 - stBreakEvenRent / fdGrossRent) * 100) : 0;
            const beBase = beOpt;
            const beStress = stBreakEvenRent > 0 && fdGrossRent > 0 ? Math.max(0, (1 - (stBreakEvenRent + (stStress.mortgage - stBase.mortgage)) / fdGrossRent) * 100) : 0;
            return (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2.5pt solid #22C55E`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>Optimistic — Rent Buffer</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`${beOpt.toFixed(1)}%`}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: '2.5pt solid #3B82F6', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>Base — Rent Buffer</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`${beBase.toFixed(1)}%`}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2.5pt solid ${stStress.cf < 0 ? '#EF4444' : '#F59E0B'}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>Stress — Rent Buffer</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`${beStress.toFixed(1)}%`}</Text>
                </View>
              </View>
            );
          })()}

          {/* What This Means panel */}
          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 3, paddingVertical: 8, paddingHorizontal: 10, marginTop: 14, borderLeft: `2pt solid ${structureColour}` }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>What This Means</Text>
            {stStressCF > 0 ? (
              <Text style={{ fontSize: 8.5, color: '#1E2B3C', lineHeight: 1.5 }}>
                {`At the stress rate of ${stStressRate.toFixed(2)}%, monthly cash flow remains positive at ${fc(stStressCF)}. Break-even rent of ${fc(stBreakEvenRent)} provides ${fc(stRentHeadroom)} headroom against contracted rent — this deal survives a significant rate shock.`}
              </Text>
            ) : (
              <Text style={{ fontSize: 8.5, color: '#1E2B3C', lineHeight: 1.5 }}>
                {`At the stress rate of ${stStressRate.toFixed(2)}%, this deal moves to negative cash flow of ${fc(Math.abs(stStressCF))}. Break-even rent of ${fc(stBreakEvenRent)} exceeds contracted rent by ${fc(Math.abs(stRentHeadroom))} — monitor rate movements carefully and maintain adequate cash reserves.`}
              </Text>
            )}
          </View>
        </Page>
      )}

      {/* ── Page 4: Deal Rationale ─────────────────────────────────────────── */}
      {hasRationale && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Deal Rationale" />

          {/* Why This Strategy */}
          {strategyNotesText ? (
            <View wrap={false} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Why This Strategy?</Text>
              <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
              <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{strategyNotesText}</Text>
            </View>
          ) : null}

          {/* Property Description */}
          {propertyDescText ? (
            <View wrap={false} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Property Description</Text>
              <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
              <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{propertyDescText}</Text>
            </View>
          ) : null}

          {/* Refurb Scope + Vendor Situation — two columns */}
          {(props.refurbScope?.trim() || vendorSituationText) ? (
            <View wrap={false} style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
              {props.refurbScope?.trim() ? (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Refurb Scope</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{props.refurbScope}</Text>
                </View>
              ) : null}
              {vendorSituationText ? (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Vendor Situation</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{vendorSituationText}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Investment Timeline — proportional segments + concentric ring nodes */}
          {(() => {
            if (!props.timelineStages) return null;
            const filteredStages = props.timelineStages.filter(s => s.label.trim());
            if (filteredStages.length < 2) return null;

            const durations: number[] = [];
            for (let i = 0; i < filteredStages.length - 1; i++) {
              durations.push(Math.max(1, filteredStages[i + 1].month - filteredStages[i].month));
            }
            const totalDuration = durations.reduce((a, b) => a + b, 0);

            return (
              <View wrap={false} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Investment Timeline</Text>
                <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 10 }} />

                {/* Duration labels row — proportional to segment widths */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: 14 }}>
                  <View style={{ width: 16, flexShrink: 0 }} />
                  {durations.map((dur, i) => (
                    <View key={i} style={{ flex: dur, alignItems: 'center' }}>
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour }}>
                        {dur === 1 ? '1 month' : `${dur} months`}
                      </Text>
                    </View>
                  ))}
                  <View style={{ width: 16, flexShrink: 0 }} />
                </View>

                {/* Line and concentric ring nodes row */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {filteredStages.map((stage, i) => (
                    <React.Fragment key={i}>
                      <View style={{
                        width: 20, height: 20, borderRadius: 10,
                        border: `2pt solid ${structureColour}`,
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: structureColour }} />
                      </View>
                      {i < filteredStages.length - 1 && (
                        <View style={{ flex: durations[i], height: 1.5, backgroundColor: structureColour }} />
                      )}
                    </React.Fragment>
                  ))}
                </View>

                {/* Stage name labels row — left / centre / right aligned, overflow beyond node width */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }}>
                  {filteredStages.map((stage, i) => {
                    const isFirst = i === 0;
                    const isLast = i === filteredStages.length - 1;
                    return (
                      <React.Fragment key={i}>
                        <View style={{
                          width: 20, flexShrink: 0,
                          alignItems: isFirst ? 'flex-start' : isLast ? 'flex-end' : 'center',
                        }}>
                          <Text style={{
                            fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C',
                            textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
                            width: 60,
                            marginLeft: isFirst ? 0 : isLast ? -40 : -20,
                          }}>
                            {stage.label}
                          </Text>
                        </View>
                        {i < filteredStages.length - 1 && (
                          <View style={{ flex: durations[i] }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>

              </View>
            );
          })()}

          {/* Risk Factors — F8FAFC panel */}
          <View wrap={false} style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Risk Factors</Text>
            <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 3, paddingVertical: 6, paddingHorizontal: 8 }}>
              {/* Bullet 1: Rate risk — strategy-aware */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                <View style={{ width: 4, height: 4, backgroundColor: structureColour, marginTop: 3, marginRight: 6 }} />
                <Text style={{ fontSize: 8.5, color: '#1E2B3C', flex: 1, lineHeight: 1.45 }}>
                  {props.stressTest
                    ? (props.stressTest.rateUpCashFlow > 0
                        ? `Rate risk — at the stress rate of ${(stBaseRate + 1.5).toFixed(2)}%, monthly cash flow reduces to ${fc(props.stressTest.rateUpCashFlow)} and remains positive.`
                        : `Rate risk — at the stress rate of ${(stBaseRate + 1.5).toFixed(2)}%, this deal moves to negative cash flow of ${fc(Math.abs(props.stressTest.rateUpCashFlow))}. Monitor rate movements carefully.`)
                    : props.dealType === 'R2R'
                      ? `Income risk — monthly profit depends on maintaining ${props.r2rInputs.occupancyRate}% occupancy across ${props.r2rInputs.rooms} rooms. A drop to ${Math.round(props.r2rInputs.occupancyRate * 0.85)}% occupancy reduces gross income by ${fc(props.r2rResults.grossMonthlyIncome * 0.15)}/mo.`
                      : props.dealType === 'FLIP'
                        ? `Cost overrun risk — project budgeted at ${fc(props.flipResults.totalCost)} over ${props.flipInputs.projectLengthMonths} months. A 10% cost overrun reduces net profit from ${fc(props.flipResults.netProfit)} to ${fc(props.flipResults.netProfit - props.flipResults.totalCost * 0.1)}.`
                        : 'Rate sensitivity: stress test not available for this strategy.'}
                </Text>
              </View>

              {/* Bullet 2: Void/occupancy risk — suppressed for R2R and FLIP */}
              {props.dealType !== 'R2R' && props.dealType !== 'FLIP' && (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                  <View style={{ width: 4, height: 4, backgroundColor: structureColour, marginTop: 3, marginRight: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#1E2B3C', flex: 1, lineHeight: 1.45 }}>
                    {`Void risk — a ${fdVoidPct}% void allowance has been applied, equivalent to approximately ${Math.round(fdVoidPct / 100 * 52)} weeks vacant per year.`}
                  </Text>
                </View>
              )}

              {/* Bullet 3: Tenure/lease risk — strategy-aware */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: 4, height: 4, backgroundColor: structureColour, marginTop: 3, marginRight: 6 }} />
                <Text style={{ fontSize: 8.5, color: '#1E2B3C', flex: 1, lineHeight: 1.45 }}>
                  {props.dealType === 'R2R'
                    ? `Landlord agreement risk — income depends on the lease agreement with the landlord. Ensure the agreement term, break clauses, and permitted subletting are clearly documented.`
                    : props.dealType === 'FLIP'
                      ? `Resale risk — target GDV of ${fc(props.flipInputs.expectedSalePrice)} is an estimate. Market conditions at point of sale may affect achievable price and selling timeline.`
                      : props.tenure === 'Leasehold'
                        ? 'Tenure risk — leasehold property. Review lease length, service charge, and ground rent terms carefully before proceeding.'
                        : 'Tenure — freehold. No lease expiry, service charge, or escalating ground rent risk.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Key Assumptions — dark navy panel */}
          {(() => {
            const [rentLabel, rentValue] = (() => {
              if (props.dealType === 'HMO') return ['Rent per room', fc(props.hmoInputs.rentPerRoom)];
              if (props.dealType === 'SA') return ['Nightly rate', fc(props.saInputs.nightlyRate)];
              if (props.dealType === 'FLIP') return ['Target GDV', fc(props.flipInputs.expectedSalePrice)];
              if (props.dealType === 'R2R') return ['Rent per room', fc(props.r2rInputs.rentPerRoom)];
              if (props.dealType === 'SOCIAL') return ['Lease income', fc(props.socialInputs.leaseIncomePerMonth)];
              return ['Monthly rent', fc((props.btlInputs?.monthlyRent ?? props.brrrInputs?.monthlyRent ?? 0))];
            })();
            return (
              <View wrap={false} style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, borderTop: `2pt solid ${structureColour}` }}>
                <Text style={{ fontSize: 7.5, color: tintText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Key Assumptions</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {props.dealType !== 'R2R' && props.dealType !== 'FLIP' ? (
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 8, color: tintText }}>{`Deposit`}</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`${props.depositPercent}%`}</Text>
                    </View>
                  ) : null}
                  {props.mortgageRate > 0 && props.dealType !== 'R2R' && props.dealType !== 'FLIP' ? (
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 8, color: tintText }}>Mortgage Rate</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`${props.mortgageRate}%`}</Text>
                    </View>
                  ) : null}
                  <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, color: tintText }}>{rentLabel}</Text>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{rentValue}</Text>
                  </View>
                  {props.taxLabel && props.dealType !== 'R2R' ? (
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 8, color: tintText }}>{props.taxLabel}</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.effectiveTax)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })()}
        </Page>
      )}

      {/* ── Page 5: Market Evidence ────────────────────────────────────────── */}
      {hasMarketEvidence && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Market Evidence" />

          {hasComparables && (
            <View style={[base.notePanel, { padding: 0, overflow: 'hidden' }]}>
              <Text style={[base.notePanelLabel, { color: structureColour, padding: 10, paddingBottom: 6 }]}>Comparable Properties</Text>
              <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 10, borderBottom: `1.5pt solid ${structureColour}` }}>
                <Text style={{ flex: 2, fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour }}>Address</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour }}>Beds / Type</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour }}>Date Sold</Text>
                <Text style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>Price</Text>
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

          {(() => {
            const validPrices = props.comparables
              .filter(r => r.address.trim())
              .map(r => parseFloat(r.price.replace(/[£,\s]/g, '')))
              .filter(n => !isNaN(n) && n > 0);
            if (validPrices.length < 2) return null;
            if (props.dealType === 'R2R') return null;
            const avgPrice = validPrices.reduce((s, n) => s + n, 0) / validPrices.length;
            const priceDiffPct = ((props.purchasePrice - avgPrice) / avgPrice) * 100;
            let commentary: string;
            if (priceDiffPct < -2) {
              commentary = `The purchase price of ${fc(props.purchasePrice)} sits ${Math.abs(priceDiffPct).toFixed(1)}% below the average of ${validPrices.length} recent comparable sales (avg ${fc(avgPrice)}), indicating a below-market acquisition with immediate equity on completion.`;
            } else if (priceDiffPct > 2) {
              commentary = `The purchase price of ${fc(props.purchasePrice)} sits ${priceDiffPct.toFixed(1)}% above the average of ${validPrices.length} recent comparable sales (avg ${fc(avgPrice)}).`;
            } else {
              commentary = `The purchase price of ${fc(props.purchasePrice)} is broadly in line with ${validPrices.length} recent comparable sales averaging ${fc(avgPrice)}, suggesting fair market pricing and a credible entry point.`;
            }
            return (
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#64748B', marginTop: 8 }}>
                {commentary}
              </Text>
            );
          })()}

          {props.areaAverageYield != null && props.areaAverageYield > 0 && props.dealType !== 'R2R' && props.dealType !== 'FLIP' && (() => {
            const activeGrossYield = activeResults.grossYield;
            const yieldDiff = activeGrossYield - props.areaAverageYield!;
            const areaBar = Math.min(100, props.areaAverageYield! * 8);
            const dealBar = Math.min(100, activeGrossYield * 8);
            const diffColor = yieldDiff >= 0 ? '#16A34A' : '#DC2626';
            return (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Area Yield Context</Text>
                {/* Three hero cards */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: '2.5pt solid #9ca3af', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>Area Average Yield</Text>
                    <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fp(props.areaAverageYield!)}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2.5pt solid ${structureColour}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>This Deal (Gross)</Text>
                    <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fp(activeGrossYield)}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2.5pt solid ${diffColor}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>Premium / Discount</Text>
                    <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: diffColor }}>{`${yieldDiff >= 0 ? '+' : ''}${fp(Math.abs(yieldDiff))}`}</Text>
                  </View>
                </View>
                {/* Bar visualisation */}
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 3, paddingVertical: 8, paddingHorizontal: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 7.5, color: '#6B7280', width: 90 }}>Area average</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 2 }}>
                      <View style={{ width: `${areaBar}%`, height: 6, backgroundColor: '#9ca3af', borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', width: 36, textAlign: 'right' }}>{fp(props.areaAverageYield!)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 7.5, color: '#6B7280', width: 90 }}>This deal</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 2 }}>
                      <View style={{ width: `${dealBar}%`, height: 6, backgroundColor: structureColour, borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', width: 36, textAlign: 'right' }}>{fp(activeGrossYield)}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {hasLinks && (
            <View style={[base.notePanel, { marginTop: hasComparables ? 8 : 0 }]}>
              <Text style={[base.notePanelLabel, { color: structureColour, marginBottom: 6 }]}>{props.listingLinks.filter(r => r.url.trim()).length === 1 ? 'Property Listing' : 'Property Listings'}</Text>
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

      {/* ── Glossary Page ────────────────────────────────────────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />
        <SH title="Glossary" />

        <View style={{ flexDirection: 'row', gap: 0 }}>

          {/* Left column */}
          <View style={{ flex: 1, paddingRight: 12 }}>

            {(props.dealType === 'BTL' || props.dealType === 'SOCIAL' || props.dealType === 'HMO') && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Yield &amp; Return</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual rent as a percentage of purchase price.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual income minus operating costs divided by purchase price. Mortgage excluded (UK standard).</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash-on-Cash ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual cash flow as a percentage of total cash invested. Includes mortgage payment.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Payback Period</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Years to recover total cash invested from annual cash flow.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Equity on Day One</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Immediate equity created when a property is purchased below market value.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>BMV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Below Market Value. The discount between purchase price and estimated market value.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Cash Flow &amp; Expenses</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total rental income before any deductions or void allowance.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Void Allowance</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Estimated cost of vacancy. A 5% void allowance equals approximately 2.5 weeks vacant per year.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Effective Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Gross rent after void allowance deducted.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Operating Income (NOI)</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Effective rent minus all operating costs, excluding mortgage.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Cash Flow</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly surplus after all costs including mortgage payment.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Minimum rent required to cover all costs at the current mortgage rate.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Rent Headroom</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The buffer between contracted rent and break-even rent.</Text>
              </>
            )}

            {/* Stress Testing & Resilience — BTL / SOCIAL left column only */}
            {(props.dealType === 'BTL' || props.dealType === 'SOCIAL') && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Stress Testing &amp; Resilience</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The minimum rent or revenue required to cover all costs at the current mortgage rate. Cash flow is exactly zero at this level.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Stress Test</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Analysis of deal performance under a higher mortgage rate (+1.5%) and lower rent (-10%), applied independently.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The mortgage rate at which monthly cash flow reaches exactly zero.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Sensitivity Analysis</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Shows the impact on cash flow and ROI of a 10% rent reduction and a 1.5% rate increase independently.</Text>
              </>
            )}

            {/* Finance & Structure — HMO only */}
            {props.dealType === 'HMO' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Finance &amp; Structure</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Interest-Only Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers interest only. Capital balance remains unchanged throughout the term.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Repayment Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers both interest and capital. Balance reduces to zero over the term.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Loan to Value. Mortgage amount expressed as a percentage of property value.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed: deposit + tax + refurb + other costs.</Text>
              </>
            )}

            {props.dealType === 'SA' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Yield &amp; Return</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual income minus operating costs divided by purchase price. Mortgage excluded (UK standard).</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash-on-Cash ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual cash flow as a percentage of total cash invested. Includes mortgage payment.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Equity on Day One</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Immediate equity created when a property is purchased below market value.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>BMV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Below Market Value. The discount between purchase price and estimated market value.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>SA Income</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Revenue</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total nightly income before platform fees and running costs. Calculated as: Nightly Rate × (Occupancy % ÷ 100) × 30.42 days.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Platform Fees</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Commission charged by booking platforms such as Airbnb and Booking.com.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Monthly Revenue</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Gross revenue after platform fees deducted.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Occupancy Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Percentage of nights in a month the property is occupied and generating income. DealScore default: 75%.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Cash Flow</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly surplus after all costs including mortgage payment.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Minimum revenue required to cover all costs at the current mortgage rate.</Text>
              </>
            )}

            {props.dealType === 'BRRR' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Yield &amp; Return</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>BRRR Gross Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Yield calculated on post-refurb value (GDV), not purchase price.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual income minus operating costs divided by post-refurb value. Mortgage excluded.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash-on-Cash ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual cash flow as a percentage of cash left in the deal after refinance.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Equity Created</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The uplift in property value above total cost in, realised through refurbishment.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Money Out / Recycled</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>When the refinance loan exceeds total cost in. All capital returned plus a surplus. Cash-on-cash ROI is infinite.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Cash Flow &amp; Expenses</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total rental income before any deductions or void allowance.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Void Allowance</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Estimated cost of vacancy. A 5% void allowance equals approximately 2.5 weeks vacant per year.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Effective Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Gross rent after void allowance deducted.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Operating Income (NOI)</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Effective rent minus all operating costs, excluding mortgage.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Cash Flow</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly surplus after all costs including the refinance mortgage payment.</Text>
              </>
            )}

            {props.dealType === 'FLIP' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Project Returns</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Total ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net profit as a percentage of total project cost.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Annualised ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total ROI scaled to a 12-month equivalent based on project length in months.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Profit on Cost</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net profit expressed as a percentage of total costs. Benchmark: 18%+ with planning permission, 25%+ without.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Profit</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Sale proceeds minus all acquisition, build, and selling costs.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>GDV (Gross Development Value)</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The target sale price or estimated open market value after works are complete.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Project Costs</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Total Cost In</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital deployed: purchase price + tax + refurb + contingency + holding costs + other costs.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Holding Costs</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly financing or carrying costs during the project period.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Selling Costs</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Agent fees and legal costs on sale, expressed as a percentage of GDV.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Contingency</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>A percentage buffer added to refurb costs to absorb unexpected expenses. DealScore default: 10%.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Bridging Finance</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Short-term property-secured loan used to fund acquisition and/or refurbishment.</Text>
              </>
            )}

            {props.dealType === 'R2R' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>R2R Income</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Monthly Spread</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The difference between sub-let income collected and rent paid to the landlord. The core R2R profit driver.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Income</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total sub-let rent collected from all rooms at current occupancy.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Monthly Profit</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly income after rent to landlord, management fees, and running costs.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Annual Profit</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net monthly profit multiplied by 12.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Setup Costs</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>One-off costs to establish the R2R agreement: furniture, deposits, compliance, and fit-out.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Returns</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>ROI on Setup</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual profit as a percentage of total setup costs.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Payback Period</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Number of months to recover setup costs from monthly profit.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Total Upfront</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital needed to begin: setup costs + landlord deposit + first month rent.</Text>
              </>
            )}

          </View>

          {/* Vertical rule */}
          <View style={{ width: 0.5, backgroundColor: '#E5E7EB' }} />

          {/* Right column */}
          <View style={{ flex: 1, paddingLeft: 12 }}>

            {/* Stress Testing & Resilience — HMO / SA only (BTL/SOCIAL moved to left column) */}
            {(props.dealType === 'HMO' || props.dealType === 'SA') && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Stress Testing &amp; Resilience</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The minimum rent or revenue required to cover all costs at the current mortgage rate. Cash flow is exactly zero at this level.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Stress Test</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>{props.dealType === 'SA' ? 'Analysis of deal performance under a higher mortgage rate (+1.5%) and lower revenue (-10%), applied independently.' : 'Analysis of deal performance under a higher mortgage rate (+1.5%) and lower rent (-10%), applied independently.'}</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The mortgage rate at which monthly cash flow reaches exactly zero.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Sensitivity Analysis</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>{props.dealType === 'SA' ? 'Shows the impact on cash flow and ROI of a 10% revenue reduction and a 1.5% rate increase independently.' : 'Shows the impact on cash flow and ROI of a 10% rent reduction and a 1.5% rate increase independently.'}</Text>
              </>
            )}

            {/* Finance & Structure — BTL / SOCIAL: first in right column, no marginTop */}
            {(props.dealType === 'BTL' || props.dealType === 'SOCIAL') && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Finance &amp; Structure</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Interest-Only Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers interest only. Capital balance remains unchanged throughout the term.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Repayment Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers both interest and capital. Balance reduces to zero over the term.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Loan to Value. Mortgage amount expressed as a percentage of property value.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed: deposit + tax + refurb + other costs.</Text>
              </>
            )}

            {/* Finance & Structure — SA: after Stress Testing, with marginTop */}
            {props.dealType === 'SA' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Finance &amp; Structure</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Interest-Only Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers interest only. Capital balance remains unchanged throughout the term.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Repayment Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers both interest and capital. Balance reduces to zero over the term.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Loan to Value. Mortgage amount expressed as a percentage of property value.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed: deposit + tax + refurb + other costs.</Text>
              </>
            )}

            {props.dealType === 'HMO' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>HMO</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Profit Per Room</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly cash flow divided equally across all rooms. Key HMO efficiency metric.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>HMO Licence</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Required local authority licence for larger HMOs. Cost is a one-off acquisition cost, not monthly.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total room rental income across all rooms at current occupancy rate.</Text>
              </>
            )}

            {props.dealType === 'BRRR' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>BRRR Structure</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>GDV (Gross Development Value)</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The estimated market value of the property after refurbishment is complete.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Refinance Loan</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Capital released by remortgaging against the post-refurb value at a set LTV.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Left In</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Capital remaining in the deal after subtracting the refinance loan from total cost in.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Total Cost In</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital deployed into the BRRR: purchase price + tax + refurb + bridging interest + other costs.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Bridging Finance</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Short-term property-secured loan used to fund acquisition and refurbishment before refinancing.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Stress Testing &amp; Resilience</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Stress Test</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Analysis of deal performance under a higher mortgage rate (+1.5%) and lower rent (-10%), applied independently.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The mortgage rate at which monthly cash flow reaches exactly zero.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Sensitivity Analysis</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Shows the impact on cash flow and ROI of a 10% rent reduction and a 1.5% rate increase independently.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Tax &amp; Structure</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Loan to Value. Mortgage amount expressed as a percentage of property value.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>LTT / SDLT</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Land Transaction Tax (Wales) or Stamp Duty Land Tax (England &amp; NI).</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed into the deal before refinance.</Text>
              </>
            )}

            {props.dealType === 'FLIP' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Stress &amp; Sensitivity</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cost Overrun Risk</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Impact on profit if build costs increase beyond budget. A 10% overrun on a £30k refurb reduces profit by £3,000.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>GDV Sensitivity</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Impact on profit if the achieved sale price is lower than the GDV estimate.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even GDV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The minimum sale price at which the project still makes a profit.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Tax &amp; Structure</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>LTT / SDLT</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Land Transaction Tax (Wales) or Stamp Duty Land Tax (England &amp; NI). Government purchase tax on property transactions.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed into the project.</Text>
              </>
            )}

            {props.dealType === 'R2R' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Agreement &amp; Risk</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Landlord Agreement</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The lease or licence between the sourcer and the property owner permitting sub-letting. Term, break clauses, and subletting rights must be clearly documented.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Subletting</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Renting out a property or individual rooms that you yourself rent from the owner.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Occupancy Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Percentage of rooms occupied and generating income. DealScore default: 90%.</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Management Fees</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Platform or agent commission charged on gross income collected.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Structure</Text>

                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total setup costs deployed to establish the agreement.</Text>
              </>
            )}

            {/* Universal terms — all strategies */}
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Tax, Legal &amp; Verdicts</Text>

            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Sourcing Fee</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Fee payable to the deal sourcer on legal completion.</Text>

            {(props.dealType !== 'BRRR' && props.dealType !== 'FLIP') && (
              <>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>LTT / SDLT</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Land Transaction Tax (Wales) or Stamp Duty Land Tax (England &amp; NI). Government purchase tax on property transactions.</Text>
              </>
            )}

            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Deal Score</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Weighted composite score from 1 to 10 across six dimensions: Gross Yield, Net Cash Flow, Capital Growth Potential, Tenant Demand, Deal Structure, and Risk Profile.</Text>

            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Recommended</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Deal meets or exceeds all key thresholds for this strategy. Strong candidate for investor presentation.</Text>

            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Review</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Deal partially meets thresholds. Worth progressing with negotiation or cost review.</Text>

            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Avoid</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Deal falls below minimum thresholds. Not recommended at current numbers.</Text>

          </View>
        </View>
      </Page>

      {/* ── Formulas & Calculations Page ─────────────────────────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />
        <SH title="Formulas &amp; Calculations" />

        {(props.dealType === 'BTL' || props.dealType === 'HMO' || props.dealType === 'SA' || props.dealType === 'SOCIAL' || props.dealType === 'BRRR') ? (
          <View style={{ flexDirection: 'row', gap: 0 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Yield &amp; Return</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Yield</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual rent as a percentage of purchase price.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Annual Rent ÷ Purchase Price) × 100</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Yield</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Income after operating costs divided by purchase price. Mortgage excluded (UK standard).</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Annual Income - Operating Costs) ÷ Purchase Price × 100</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash-on-Cash ROI</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual cash flow as a percentage of total cash invested. Includes mortgage.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Annual Cash Flow ÷ Cash Invested) × 100</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Payback Period</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Years to recover invested capital from annual cash flow.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Cash Invested ÷ Annual Cash Flow</Text>

              {props.dealType !== 'BRRR' ? (
                <>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Equity on Day One</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Equity when purchased below market value.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Market Value - Purchase Price</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Equity Created</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Equity generated through refurbishment.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Post-Refurb Value - Total Cost In</Text>

                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>BRRR Gross Yield</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Yield calculated on GDV.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Annual Rent ÷ Post-Refurb Value) × 100</Text>
                </>
              )}

              {props.dealType === 'SA' && (
                <>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>SA Revenue</Text>

                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Revenue</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Nightly rate at target occupancy over an average month.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Nightly Rate × (Occupancy % ÷ 100) × 30.42</Text>

                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Platform Fees</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Commission deducted from gross revenue.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Gross Monthly Revenue × Platform Fee %</Text>

                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Monthly Revenue</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Revenue after platform fees.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Gross Monthly Revenue - Platform Fees</Text>
                </>
              )}

              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Cash Flow &amp; Expenses</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Effective Rent</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Gross rent after void allowance deducted.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Gross Rent × (1 - Void %)</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Operating Income</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Effective rent minus all operating costs, excluding mortgage.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Effective Rent - Operating Costs</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Cash Flow</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly surplus after all costs including mortgage.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Net Operating Income - Mortgage Payment</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Monthly Mortgage (Interest-Only)</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly interest payment.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Mortgage Amount × Annual Rate %) ÷ 12</Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB' }} />

            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Stress Testing &amp; Resilience</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Minimum rent to cover all costs at current rate.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Operating Costs + Mortgage Payment</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Rent Headroom</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Buffer before deal becomes cash-flow negative.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Contracted Rent - Break-Even Rent</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rate</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Mortgage rate at which cash flow reaches zero.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Solved from: Rent = Operating Costs + (Mortgage Amount × Rate ÷ 12)</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Sensitivity Analysis</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Performance under rent -10% and rate +1.5% applied independently. See sensitivity table in report.</Text>

              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Capital &amp; Structure</Text>

              {props.dealType === 'BRRR' ? (
                <>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital deployed before refinance.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Purchase Price + Tax + Refurb + Bridging Interest + Other Costs</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed into the deal.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Deposit + Tax + Refurb + Other Costs</Text>
                </>
              )}

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Loan to value ratio.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Mortgage Amount ÷ Property Value) × 100</Text>

              {props.dealType === 'BRRR' && (
                <>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Refinance Loan</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Capital released on refinance.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Post-Refurb Value × (Refinance % ÷ 100)</Text>

                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cash Left In</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Capital remaining after refinance.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Total Cost In - Refinance Loan</Text>
                </>
              )}

              {props.dealType === 'HMO' && (
                <>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>HMO</Text>

                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Profit Per Room</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly cash flow divided by number of rooms.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Monthly Cash Flow ÷ Number of Rooms</Text>

                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Rent</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total room income at current occupancy.</Text>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Rent per Room × Rooms × (Occupancy % ÷ 100)</Text>
                </>
              )}
            </View>
          </View>
        ) : props.dealType === 'FLIP' ? (
          <View style={{ flexDirection: 'row', gap: 0 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Project Returns</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Total ROI</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net profit as a percentage of total cost.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Net Profit ÷ Total Cost In) × 100</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Annualised ROI</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>ROI scaled to a 12-month equivalent.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Total ROI ÷ Project Length in months) × 12</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Profit on Cost</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net profit as a percentage of total project cost.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Net Profit ÷ Total Cost) × 100</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Profit</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Sale proceeds minus all costs.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Expected Sale Price - Total Cost - Selling Costs</Text>

              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Project Costs</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Total Cost In</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital deployed into the project.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Purchase Price + Tax + Refurb + Holding Costs + Other Costs</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Holding Costs</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Finance costs during the project period.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Monthly Holding Cost × Project Length (months)</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Selling Costs</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Agent and legal fees on sale.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Expected Sale Price × Selling Costs %</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Contingency</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Buffer added to refurb costs for unexpected expenses.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Refurb Cost × Contingency %</Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB' }} />

            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Stress &amp; Sensitivity</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Cost Overrun Scenario</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Profit impact if costs increase by 10%.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Net Profit - (Total Cost × 10%)</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>GDV Sensitivity</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Profit impact of a 5% lower sale price.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Net Profit - (Expected Sale Price × 5%)</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Bridging Interest</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Cost of bridging finance during the project.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Purchase Price × LTV %) × (Annual Rate % ÷ 12) × Term (months)</Text>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 0 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3 }}>Income &amp; Spread</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Income</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Sub-let income at current occupancy.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Rent per Room × Rooms × (Occupancy % ÷ 100)</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Monthly Spread</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Income minus rent paid to landlord.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Gross Monthly Income - Monthly Rent to Landlord</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Net Monthly Profit</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Profit after all costs.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Gross Monthly Income - Rent to Landlord - Management Fees - Running Costs</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Annual Profit</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net monthly profit scaled annually.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Net Monthly Profit × 12</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Management Fees</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Platform or agent commission on gross income.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Gross Monthly Income × Management Fee %</Text>

              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Returns &amp; Recovery</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>ROI on Setup</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual profit as a percentage of setup costs.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>(Annual Profit ÷ Setup Costs) × 100</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Payback Period</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Months to recover setup costs from monthly profit.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Setup Costs ÷ Net Monthly Profit</Text>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 0 }}>Total Upfront</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital needed to begin the agreement.</Text>
              <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 5 }}>Setup Costs + (Landlord Deposit Months × Monthly Rent) + First Month Rent</Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB' }} />

            <View style={{ flex: 1, paddingLeft: 12 }} />
          </View>
        )}
      </Page>

      {/* ── Page 7: Legal & Disclosure ─────────────────────────────────────── */}
      {hasLegal && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Legal & Disclosure" />

          {(props.preparedBy.name || props.preparedBy.email) && (
            <View style={[base.notePanel, { marginBottom: 8 }]}>
              <Text style={[base.notePanelLabel, { color: structureColour }]}>Next Steps</Text>
              <Text style={[base.notePanelText, { marginBottom: 6 }]}>
                {`To discuss this opportunity or proceed with an offer, contact ${props.preparedBy.name || 'the deal sourcer'} directly:`}
              </Text>
              {props.preparedBy.email ? (
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Email</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{props.preparedBy.email}</Text>
                </View>
              ) : null}
              {props.preparedBy.phone ? (
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Phone</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{props.preparedBy.phone}</Text>
                </View>
              ) : null}
              {props.companyName ? (
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Company</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{props.companyName}</Text>
                </View>
              ) : null}
              {props.offerDeadline ? (
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Offer Deadline</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{props.offerDeadline}</Text>
                </View>
              ) : null}
              {props.viewingAvailable !== undefined && (
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Viewing Available</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{props.viewingAvailable ? 'Yes' : 'No'}</Text>
                </View>
              )}
            </View>
          )}

          {props.sourcingFee > 0 && (
            <View style={base.notePanel}>
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
          {props.paymentTerms && props.paymentTerms.trim().length > 0 && (
            <View style={base.notePanel}>
              <Text style={[base.notePanelLabel, { fontSize: 8, color: structureColour }]}>Payment Terms & Cooling Off Period</Text>
              <Text style={{ fontSize: 8.5, color: '#1E2B3C', lineHeight: 1.55 }}>{props.paymentTerms.trim()}</Text>
            </View>
          )}
        </Page>
      )}

    </Document>
  );
}
