import React from 'react';
import { Document, Page, Text, View, Image, Link, Svg, Rect, Circle, Line, Polyline, Font } from '@react-pdf/renderer';
import { DEALSCORE_BRAND } from '@/config/brandConfig';
import type { DealScorePDFProps } from './DealScorePDF';
import { hasMeaningfulInputs, computeCoverKeyMetric, splitAddressThreeLines, formatCompAddress } from './DealScorePDF';
Font.register({
  family: 'DM Sans',
  fonts: [
    { src: new URL('../fonts/DMSans-Regular.ttf', import.meta.url).href, fontWeight: 'normal' },
    { src: new URL('../fonts/DMSans-Bold.ttf', import.meta.url).href, fontWeight: 'bold' },
    { src: new URL('../fonts/DMSans-Italic.ttf', import.meta.url).href, fontStyle: 'italic' },
  ],
});


// ── Formatters ────────────────────────────────────────────────────────────────
const fc = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const fp = (n: number) => n.toFixed(1) + '%';

// ── Constants ─────────────────────────────────────────────────────────────────
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

const DEAL_LABELS: Record<string, string> = {
  BTL: 'Buy-to-Let Analysis',
  HMO: 'HMO Analysis',
  FLIP: 'Flip / Refurb Analysis',
  SA: 'Serviced Accommodation Analysis',
  BRRR: 'BRRR Analysis',
  R2R: 'Rent to Rent Analysis',
  SOCIAL: 'Social Housing Analysis',
};

// ── Colour helpers (duplicated from DealScorePDF — keep in sync) ──────────────

function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastText(bgHex: string): string {
  return getLuminance(bgHex) > 0.35 ? '#1A1A1A' : '#FFFFFF';
}

function getReadableBrandColour(hex: string): string {
  if (getLuminance(hex) <= 0.6) return hex;
  const clean = hex.replace('#', '');
  const r = Math.round(parseInt(clean.substring(0, 2), 16) * 0.6);
  const g = Math.round(parseInt(clean.substring(2, 4), 16) * 0.6);
  const b = Math.round(parseInt(clean.substring(4, 6), 16) * 0.6);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function coverMuted(bgHex: string, opacity: number): string {
  const isDark = getLuminance(bgHex) <= 0.35;
  return isDark ? `rgba(255,255,255,${opacity})` : `rgba(26,26,26,${opacity})`;
}

function darkenColour(hex: string, amount: number = 0.5): string {
  const clean = hex.replace('#', '');
  const r = Math.round(parseInt(clean.substring(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(clean.substring(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(clean.substring(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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
  const clean = hex.replace('#', '');
  const r = Math.round(parseInt(clean.substring(0, 2), 16) * 0.85 + 255 * 0.15);
  const g = Math.round(parseInt(clean.substring(2, 4), 16) * 0.85 + 255 * 0.15);
  const b = Math.round(parseInt(clean.substring(4, 6), 16) * 0.85 + 255 * 0.15);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

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

// ── Address helpers ───────────────────────────────────────────────────────────

function expandAddress(address: string): string {
  let s = address;
  s = s.replace(/([A-Za-z0-9]) Cl\b/g, '$1 Close');
  s = s.replace(/([A-Za-z0-9]) St\b/g, '$1 Street');
  const simple: Array<[RegExp, string]> = [
    [/\bRd\b/g, 'Road'], [/\bAve\b/g, 'Avenue'], [/\bDr\b/g, 'Drive'],
    [/\bLn\b/g, 'Lane'], [/\bCt\b/g, 'Court'], [/\bPl\b/g, 'Place'],
    [/\bSq\b/g, 'Square'], [/\bCres\b/g, 'Crescent'], [/\bGdns\b/g, 'Gardens'],
    [/\bGr\b/g, 'Grove'], [/\bPk\b/g, 'Park'], [/\bTer\b/g, 'Terrace'],
    [/\bVw\b/g, 'View'], [/\bWk\b/g, 'Walk'], [/\bWy\b/g, 'Way'],
    [/\bBlvd\b/g, 'Boulevard'],
  ];
  for (const [re, full] of simple) s = s.replace(re, full);
  return s;
}

function splitAddressForCover(address: string): { line1: string; line2: string } {
  const postcodeRegex = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/;
  const postcodeMatch = address.match(postcodeRegex);
  const postcode = postcodeMatch ? postcodeMatch[0] : '';
  const withoutPostcode = address.replace(postcode, '').replace(/,\s*$/, '').trim();
  const parts = withoutPostcode.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return { line1: address, line2: '' };
  if (parts.length === 1) return { line1: parts[0], line2: postcode };
  const street = parts.slice(0, -1).join(', ');
  const cityPostcode = [parts[parts.length - 1], postcode].filter(Boolean).join(' ');
  return { line1: street, line2: cityPostcode };
}

// ── Score breakdown ───────────────────────────────────────────────────────────

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
    { name: 'Capital Growth', score: cgScore, weight: 0.20 },
    { name: 'Tenant Demand', score: tdScore, weight: 0.15 },
    { name: 'Deal Structure', score: dsScore, weight: 0.10 },
    { name: 'Risk Profile', score: rpScore, weight: 0.10 },
  ];
  const overall = dims.reduce((sum, d) => sum + d.score * d.weight, 0);
  return { dims, overall };
}

// ── Callout metrics ───────────────────────────────────────────────────────────


// ── Hero metrics ──────────────────────────────────────────────────────────────

function computeHeroMetrics(props: DealScorePDFProps): { label: string; value: string }[] {
  const dt = props.dealType;
  if (dt === 'BTL') return [
    { label: 'Cash Invested', value: fc(props.btlResults.totalCashInvested) },
    { label: 'Monthly Cash Flow', value: fc(props.btlResults.monthlyCashFlow) },
    { label: 'Gross Yield', value: fp(props.btlResults.grossYield) },
  ];
  if (dt === 'HMO') return [
    { label: 'Cash Invested', value: fc(props.hmoResults.totalCashInvested) },
    { label: 'Monthly Cash Flow', value: fc(props.hmoResults.monthlyCashFlow) },
    { label: 'Gross Yield', value: fp(props.hmoResults.grossYield) },
  ];
  if (dt === 'FLIP') return [
    { label: 'Net Profit', value: fc(props.flipResults.netProfit) },
    { label: 'Total ROI', value: fp(props.flipResults.roi) },
    { label: 'Annualised ROI', value: fp(props.flipResults.annualisedROI) },
  ];
  if (dt === 'SA') return [
    { label: 'Cash Invested', value: fc(props.saResults.totalCashInvested) },
    { label: 'Monthly Cash Flow', value: fc(props.saResults.monthlyCashFlow) },
    { label: 'Net Yield', value: fp(props.saResults.netYield) },
  ];
  if (dt === 'BRRR') return [
    { label: 'Cash Left In', value: (props.brrrResults.moneyOut && props.purchasePrice > 0) ? 'Money Out' : fc(props.brrrResults.cashLeftInDeal) },
    { label: 'Monthly Cash Flow', value: fc(props.brrrResults.monthlyCashFlow) },
    { label: 'Equity Created', value: fc(props.brrrResults.equityCreated) },
  ];
  if (dt === 'R2R') return [
    { label: 'Monthly Profit', value: fc(props.r2rResults.monthlyProfit) },
    { label: 'Annual Profit', value: fc(props.r2rResults.annualProfit) },
    { label: 'Net Return on Setup', value: fp(props.r2rResults.roi) },
  ];
  return [
    { label: 'Cash Invested', value: fc(props.socialResults.totalCashInvested) },
    { label: 'Monthly Cash Flow', value: fc(props.socialResults.monthlyCashFlow) },
    { label: 'Gross Yield', value: fp(props.socialResults.grossYield) },
  ];
}

// ── Results rows ──────────────────────────────────────────────────────────────

type RowData = [string, string, boolean?];

function computeResultsRows(props: DealScorePDFProps): RowData[] {
  const dt = props.dealType;
  const bmvRows: RowData[] = props.marketValue > 0 && dt !== 'R2R' ? [
    ['Market Value', fc(props.marketValue)],
    ['Equity on Day One', fc(props.equityDayOne), true],
    ['BMV', `${fc(props.bmvAmount)}  (${props.bmvPercent.toFixed(1)}%)`, true],
  ] : [];
  if (dt === 'BTL') return [
    ['Cash Invested', fc(props.btlResults.totalCashInvested)],
    ['Mortgage Amount', fc(props.btlResults.mortgageAmount)],
    ['Monthly Cash Flow', fc(props.btlResults.monthlyCashFlow), true],
    ['Annual Cash Flow', fc(props.btlResults.annualCashFlow)],
    ['Gross Yield', fp(props.btlResults.grossYield)],
    ['Net Yield', fp(props.btlResults.netYield)],
    ['Cash-on-Cash ROI', fp(props.btlResults.cashOnCashROI), true],
    ...bmvRows,
  ];
  if (dt === 'HMO') return [
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
  if (dt === 'FLIP') return [
    ['Total Cost', fc(props.flipResults.totalCost)],
    ['Selling Costs', fc(props.flipResults.sellingCosts)],
    ['Net Profit', fc(props.flipResults.netProfit), true],
    ['Profit per Month', fc(props.flipResults.profitPerMonth)],
    ['Total ROI', fp(props.flipResults.roi), true],
    ['Annualised ROI', fp(props.flipResults.annualisedROI)],
    ...bmvRows,
  ];
  if (dt === 'SA') return [
    ['Cash Invested', fc(props.saResults.totalCashInvested)],
    ['Mortgage Amount', fc(props.saResults.mortgageAmount)],
    ['Gross Monthly Revenue', fc(props.saResults.grossMonthlyRevenue)],
    ['Platform Fees / mo', fc(props.saResults.platformFees)],
    ['Net Monthly Revenue', fc(props.saResults.netMonthlyRevenue)],
    ['Monthly Cash Flow', fc(props.saResults.monthlyCashFlow), true],
    ['Annual Cash Flow', fc(props.saResults.annualCashFlow)],
    ['Net Yield', fp(props.saResults.netYield)],
    ['Cash-on-Cash ROI', fp(props.saResults.cashOnCashROI), true],
    ...bmvRows,
  ];
  if (dt === 'BRRR') return [
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
  if (dt === 'R2R') return [
    ['Gross Monthly Income', fc(props.r2rResults.grossMonthlyIncome)],
    ['Management Fees / mo', fc(props.r2rResults.managementFees)],
    ['Net Monthly Income', fc(props.r2rResults.netMonthlyIncome)],
    ['Monthly Profit', fc(props.r2rResults.monthlyProfit), true],
    ['Annual Profit', fc(props.r2rResults.annualProfit)],
    ['Total Cash Invested', fc(props.r2rResults.totalCashInvested)],
    ['Monthly Spread', fc(props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid)],
    ['Net Return on Setup', fp(props.r2rResults.roi), true],
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
}

// ── Input rows ────────────────────────────────────────────────────────────────

function computeInputRows(props: DealScorePDFProps): RowData[] {
  const rows: RowData[] = [];
  const tenureRows: RowData[] = [
    ['Tenure', props.tenure],
    ...(props.tenure === 'Leasehold' && props.leaseLengthYears > 0
      ? [['Remaining Lease', `${props.leaseLengthYears} years`] as RowData] : []),
  ];
  if (props.dealType === 'BTL') {
    rows.push(
      ['Purchase Price', fc(props.purchasePrice)],
      [`${props.taxLabel} (${props.taxCountryLabel})`, fc(props.effectiveTax)],
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
      [`${props.taxLabel} (${props.taxCountryLabel})`, fc(props.effectiveTax)],
      ['Refurb / Conversion Cost', fc(props.refurbCost)],
      ['Other Costs', fc(props.otherCosts)],
      ['Deposit', `${props.depositPercent}%`],
      ['Mortgage Rate', `${props.mortgageRate}%`],
      ['Rooms', `${props.hmoInputs.rooms}`],
      ['Rent per Room', fc(props.hmoInputs.rentPerRoom)],
      ['Occupancy Rate', `${props.hmoInputs.occupancyRate}%`],
      ['Monthly Expenses', fc(props.hmoInputs.monthlyExpenses)],
      ...tenureRows,
    );
  } else if (props.dealType === 'FLIP') {
    rows.push(
      ['Purchase Price', fc(props.purchasePrice)],
      [`${props.taxLabel} (${props.taxCountryLabel})`, fc(props.effectiveTax)],
      ['Refurb Cost', fc(props.refurbCost)],
      ['Other Costs', fc(props.otherCosts)],
      ['Holding Costs / mo', fc(props.flipInputs.holdingCostsPerMonth)],
      ['Project Length', `${props.flipInputs.projectLengthMonths} months`],
      ['Expected Sale Price (GDV)', fc(props.flipInputs.expectedSalePrice)],
      ['Selling Costs', `${props.flipInputs.sellingCostsPercent}%`],
      ...tenureRows,
    );
  } else if (props.dealType === 'SA') {
    rows.push(
      ['Purchase Price', fc(props.purchasePrice)],
      [`${props.taxLabel} (${props.taxCountryLabel})`, fc(props.effectiveTax)],
      ['Refurb Cost', fc(props.refurbCost)],
      ['Other Costs', fc(props.otherCosts)],
      ['Deposit', `${props.depositPercent}%`],
      ['Mortgage Rate', `${props.mortgageRate}%`],
      ['Nightly Rate', fc(props.saInputs.nightlyRate)],
      ['Avg Occupancy', `${props.saInputs.occupancyPercent}%`],
      ['Platform Fees', `${props.saInputs.platformFeesPercent}%`],
      ['Monthly Running Costs', fc(props.saInputs.monthlyRunningCosts)],
      ...tenureRows,
    );
  } else if (props.dealType === 'BRRR') {
    rows.push(
      ['Purchase Price', fc(props.purchasePrice)],
      [`${props.taxLabel} (${props.taxCountryLabel})`, fc(props.effectiveTax)],
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
      ['Rent per Room', fc(props.r2rInputs.rentPerRoom)],
      ['Occupancy Rate', `${props.r2rInputs.occupancyRate}%`],
      ['Management / Platform Fees', `${props.r2rInputs.managementFeesPercent}%`],
      ['Monthly Running Costs', fc(props.r2rInputs.monthlyRunningCosts)],
      ['Setup Costs', fc(props.r2rInputs.setupCosts)],
      ...tenureRows,
    );
  } else {
    rows.push(
      ['Purchase Price', fc(props.purchasePrice)],
      [`${props.taxLabel} (${props.taxCountryLabel})`, fc(props.effectiveTax)],
      ['Refurb Cost', fc(props.refurbCost)],
      ['Other Costs', fc(props.otherCosts)],
      ['Deposit', `${props.depositPercent}%`],
      ['Mortgage Rate', `${props.mortgageRate}%`],
      ['Guaranteed Lease Income / mo', fc(props.socialInputs.leaseIncomePerMonth)],
      ['Lease Length', `${props.socialInputs.leaseLengthYears} years`],
      ['Management Costs / mo', fc(props.socialInputs.managementCostsPerMonth)],
      ...tenureRows,
    );
  }
  return rows;
}

// ── Verdict summary sentence ──────────────────────────────────────────────────

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
  const gy = r.grossYield;
  const cf2 = r.monthlyCashFlow;
  const roi = r.cashOnCashROI;
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

// ── "What This Means" narrative ───────────────────────────────────────────────

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
    const paybackMonths = r.monthlyProfit > 0 ? Math.ceil(r.totalCashInvested / r.monthlyProfit) : 0;
    const paybackStr = paybackMonths > 0 ? `${paybackMonths} months` : 'not applicable at current profit';
    return `Monthly rent to landlord of ${fc(props.r2rInputs.monthlyRentPaid)}, sub-let for ${fc(r.grossMonthlyIncome)}, generating a monthly spread of ${fc(spread)}. After management fees and running costs, monthly profit is ${fc(r.monthlyProfit)}. Total cash invested of ${fc(r.totalCashInvested)} recovers in ${paybackStr}.`;
  }
  const r = props.socialResults;
  const yieldVs = r.grossYield >= 6 ? 'exceeds' : 'falls short of';
  return `At a ${props.depositPercent}% deposit on a ${fc(props.purchasePrice)} purchase, total cash invested is ${fc(r.totalCashInvested)}. Guaranteed lease income of ${fc(props.socialInputs.leaseIncomePerMonth)}/mo over a ${props.socialInputs.leaseLengthYears}-year term produces monthly cash flow of ${fc(r.monthlyCashFlow)}. Gross yield of ${fp(r.grossYield)} ${yieldVs} the 6% benchmark for social housing strategy.`;
}

// ── SVG Text typed alias (fontSize + fill direct props, not via style) ────────
const SvgText = Text as React.ComponentType<{
  x: number | string;
  y: number | string;
  fontSize?: number;
  fill?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  children?: React.ReactNode;
}>;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DealScorePDFProPlus(props: DealScorePDFProps) {

  const brand = props.brandColour;
  const coverBg = darkenColour(brand, 0.4);
  const readableBrand = getReadableBrandColour(brand);
  const accent = props.accentColour;
  const isProPlus = props.tierOverride === 'pro_plus';

  const structureColour = (() => {
    if (isProPlus && accent && getLuminance(accent) < 0.85) return getStructureColour(accent);
    return getStructureColour(brand);
  })();

  const panelBg = getPanelBg(brand);

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

  const LOGO_H: Record<'S' | 'M' | 'L', number> = { S: 30, M: 50, L: 80 };
  const LOGO_MAX_W: Record<'S' | 'M' | 'L', number> = { S: 90, M: 150, L: 240 };
  const logoHeight = LOGO_H[props.logoSize];
  const logoMaxWidth = LOGO_MAX_W[props.logoSize];

  const addressPlain = expandAddress(props.propertyAddress || '') || props.propertyAddress || 'Property Address Not Entered';
  const displayAddress = (props.protectAddress && props.protectedAddressDescription)
    ? props.protectedAddressDescription
    : addressPlain;
  const { line1: coverLine1, line2: coverLine2 } = splitAddressForCover(displayAddress);
  const [, city] = splitAddressThreeLines(displayAddress); // city/area hint for breadcrumb

  const footerCentreText = isProPlus ? props.companyName.trim() : 'DealScore';

  const heroMetrics = computeHeroMetrics(props);
  const coverKeyMetric = computeCoverKeyMetric(props);
  const { dims: dealScoreDims, overall: dealScoreOverall } = computeDealScoreBreakdown(props);
  const resultsRows = computeResultsRows(props);
  const inputRows = computeInputRows(props);
  const scoreColor = SCORE_COLOR[props.currentScore] ?? '#6b7280';

  const validPhotos = props.photoFiles.filter((s) => Boolean(s) && s.startsWith('data:image/'));
  const heroIdx = props.heroPhotoIndex ?? 0;
  const heroPhoto = validPhotos[heroIdx] ?? validPhotos[0] ?? null;

  const preparedLine = [
    props.preparedBy.name ? `Prepared by ${props.preparedBy.name}` : '',
    props.preparedBy.email,
    props.preparedBy.phone,
  ].filter(Boolean).join(' · ');

  const p2CiDeposit = props.purchasePrice * props.depositPercent / 100;
  const p2CiAuctionFees = (props.isAuctionPurchase ? (props.buyersPremiumValue ?? 0) : 0) + (props.auctionReservationFeeValue ?? 0);
  const p2CiLeaseExt = props.leaseExtensionCost ?? 0;
  const p2CiTotal = p2CiDeposit + props.effectiveTax + props.refurbCost + props.otherCosts + p2CiAuctionFees + p2CiLeaseExt + props.sourcingFee;

  // ── Financial Detail derived values ───────────────────────────────────────
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

  // ── Stress Testing derived values ──────────────────────────────────────────
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
    const mortgage = stLoanAmount * (rate / 100) / 12;
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

  const structureBg = '#F8FAFC';
  const verdictSummary = generateVerdictSummary(props);
  const whatThisMeans = generateWhatThisMeans(props);

  // ── Rationale / Market / Photo / Legal derived values ─────────────────────
  const strategyNotesText = props.strategyNotes.trim();
  const propertyDescText = props.propertyDescription.trim();
  const vendorSituationText = props.vendorSituation.trim();
  const hasRationale = true;
  const hasComparables = props.comparableSaleTypeUsed || props.comparableLetTypeUsed;
  const hasLinks = props.listingLinks.some(r => r.url.trim());
  const hasMarketEvidence = hasComparables || hasLinks;
  const hasLegal = !!(props.sourcingFee > 0 || props.preparedBy.name || props.preparedBy.email);
  const hasContactPage = !!(props.preparedBy.name || props.preparedBy.email || props.preparedBy.phone || props.companyName?.trim() || props.whatsappNumber?.trim());

  const formatCompPrice = (price: string): string => {
    const trimmed = price.trim();
    if (!trimmed) return '';
    const cleaned = trimmed.replace(/[£,\s]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) return '\u00A3' + Math.round(num).toLocaleString('en-GB');
    return trimmed.startsWith('\u00A3') ? trimmed : '\u00A3' + trimmed;
  };

  const gridPhotos = validPhotos.filter((_, i) => i !== heroIdx);
  const validGridPhotos = gridPhotos.filter((s) => s.startsWith('data:image/'));
  const photoPageSrcs: string[] = [
    ...(heroPhoto ? [heroPhoto] : []),
    ...validGridPhotos,
  ].filter((src): src is string => Boolean(src) && src.startsWith('data:image/'));

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };
  const photoChunks = chunkArray(photoPageSrcs, 6);

  // ── Shared panel styles ────────────────────────────────────────────────────
  const notePanel = { backgroundColor: '#f5f7fa', borderRadius: 3, padding: 10, marginBottom: 8 };
  const notePanelLabel = { fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700 as const, marginBottom: 4 };
  const notePanelText = { fontSize: 9, color: '#444444', lineHeight: 1.5 };

  // ── Sub-components ──────────────────────────────────────────────────────────

  const SH = ({ title, mt, mb }: { title: string; mt?: number; mb?: number }) => (
    <View style={{ marginBottom: mb ?? 10, marginTop: mt ?? 0 }}>
      <Text style={{ fontSize: 11, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, marginBottom: 3 }}>{title}</Text>
      <View style={{ borderBottom: `1pt solid ${structureColour}` }} />
    </View>
  );

  const TableRow = ({ label, value, bold, alt }: { label: string; value: string; bold?: boolean; alt?: boolean }) => (
    <View style={{
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 5,
      backgroundColor: alt ? '#f5f7fa' : '#ffffff',
    }}>
      <Text style={{ flex: 1, fontSize: 8, color: '#555555' }}>{label}</Text>
      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: bold ? 'bold' : 'normal', color: bold ? structureColour : '#333333', textAlign: 'right' }}>{value}</Text>
    </View>
  );

  const Footer = () => (
    <View style={{
      position: 'absolute',
      bottom: 16,
      left: 36,
      right: 36,
      flexDirection: 'row',
      alignItems: 'center',
      borderTop: '0.5pt solid #e2e8f0',
      paddingTop: 5,
    }} fixed>
      <Text style={{ flex: 1, fontSize: 7, color: '#9ca3af' }}>{props.dateStr}</Text>
      <Text style={{ fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#9ca3af', textAlign: 'center' }}>{footerCentreText}</Text>
      <Text
        style={{ flex: 1, fontSize: 7, color: '#9ca3af', textAlign: 'right', letterSpacing: 0.8 }}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `PAGE ${pageNumber} OF ${totalPages}`
        }
      />
    </View>
  );

  const PageHeader = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 5, borderBottom: '0.5pt solid #E2E8F0' }}>
      <Text style={{ flex: 1, fontSize: 7, color: '#9ca3af' }}>{props.dateStr}</Text>
      <Text style={{ fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#9ca3af', textAlign: 'center' }}>{footerCentreText}</Text>
      <Text
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `PAGE ${pageNumber} OF ${totalPages}`}
        style={{ flex: 1, fontSize: 7, color: '#9ca3af', textAlign: 'right', letterSpacing: 0.8 }}
      />
    </View>
  );

  // ── Landscape page style ────────────────────────────────────────────────────
  const landscapePage = {
    fontFamily: 'DM Sans',
    backgroundColor: '#ffffff',
    paddingTop: 32,
    paddingBottom: 56,
    paddingHorizontal: 36,
    fontSize: 10,
    color: '#333333',
  };

  // ── Derived for right-panel cover ──────────────────────────────────────────
  // cover style: always "bold" two-panel for ProPlus landscape
  const leftPanelBg = props.tierOverride === 'pro' ? brand : coverBg;
  const leftPanelText = getContrastText(leftPanelBg);

  return (
    <Document>

      {/* ── Page 1: Landscape Cover ─────────────────────────────────────────── */}
      <Page
        size="A4"
        orientation="landscape"
        style={{
          fontFamily: 'DM Sans',
          backgroundColor: props.tierOverride === 'pro' ? brand : '#ffffff',
        }}
      >

        {/* ── Pro tier — DealScore branded bold cover ──────────────────────── */}
        {props.tierOverride === 'pro' && (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ width: '42%', backgroundColor: leftPanelBg, paddingTop: 36, paddingBottom: 36, paddingHorizontal: 32, flexDirection: 'column', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center' }}>
                {props.logoBase64 ? (
                  <Image src={props.logoBase64} style={{ maxHeight: logoHeight, maxWidth: logoMaxWidth, objectFit: 'contain' }} />
                ) : null}
                {props.companyName.trim() ? (
                  <Text style={{ fontSize: 8, color: coverMuted(leftPanelBg, 0.55), textAlign: 'center', letterSpacing: 1.6, marginTop: props.logoBase64 ? 8 : 0 }}>
                    {props.companyName.trim().toUpperCase()}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 10, color: coverMuted(leftPanelBg, 0.65), textAlign: 'center', marginBottom: 10, letterSpacing: 0.3 }}>
                  {DEAL_LABELS[props.dealType].replace(' Analysis', '').toUpperCase()}
                </Text>
                <View style={{ width: 32, borderBottom: `2pt solid ${coverMuted(leftPanelBg, 0.4)}`, marginBottom: 12 }} />
                <Text hyphenationCallback={(word: string) => [word]} style={{ fontSize: 17, fontFamily: 'DM Sans', fontWeight: 700, color: leftPanelText, textAlign: 'center', lineHeight: 1.35 }}>
                  {coverLine1}
                </Text>
                {coverLine2 ? (
                  <Text style={{ fontSize: 17, fontFamily: 'DM Sans', fontWeight: 700, color: leftPanelText, textAlign: 'center', lineHeight: 1.35 }}>
                    {coverLine2}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 9, color: coverMuted(leftPanelBg, 0.5), textAlign: 'center', marginTop: 10 }}>
                  {props.dateStr}
                </Text>
              </View>
              <View>
                <View style={{ borderBottom: `1pt solid ${coverMuted(leftPanelBg, 0.25)}`, marginBottom: 10 }} />
                {preparedLine ? (
                  <Text style={{ fontSize: 8, color: coverMuted(leftPanelBg, 0.55), textAlign: 'center', marginBottom: 6 }}>
                    {preparedLine}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 7, color: coverMuted(leftPanelBg, 0.4), textAlign: 'center' }}>
                  Confidential — Prepared for investor review only
                </Text>
              </View>
            </View>
            <View style={{ width: '58%', backgroundColor: '#ffffff', paddingTop: 36, paddingBottom: 36, paddingHorizontal: 32, flexDirection: 'column', justifyContent: 'space-between' }}>
              {heroPhoto ? (
                <View style={{ height: 140, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                  <Image src={heroPhoto} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                </View>
              ) : <View style={{ height: 8 }} />}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {heroMetrics.map(({ label, value }) => (
                  <View key={label} style={{ flex: 1, backgroundColor: '#ffffff', border: '0.5pt solid #d4dae8', borderTop: `2.5pt solid ${structureColour}`, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 18, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', lineHeight: 1, marginBottom: 4 }}>{value}</Text>
                    <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
                  </View>
                ))}
              </View>
              {props.currentScore !== 'Incomplete' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: SCORE_TINT[props.currentScore] ?? 'rgba(107,114,128,0.09)', borderLeft: `4pt solid ${scoreColor}`, borderRadius: 3, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16 }}>
                  <View>
                    <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Deal Score</Text>
                    <Text style={{ fontSize: 14, fontFamily: 'DM Sans', fontWeight: 700, color: '#1B2B4B' }}>{VERDICT_LABELS[props.currentScore] ?? props.currentScore}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                    <Text style={{ fontSize: 28, fontFamily: 'DM Sans', fontWeight: 700, color: '#1B2B4B', lineHeight: 1 }}>{dealScoreOverall.toFixed(1)}</Text>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>/ 10</Text>
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {props.propertyType ? (
                  <View style={{ borderRadius: 10, border: '0.5pt solid #d4dae8', paddingVertical: 2, paddingHorizontal: 8, backgroundColor: '#f5f7fa' }}>
                    <Text style={{ fontSize: 7.5, color: '#1E2B3C', fontFamily: 'DM Sans', fontWeight: 700 }}>{props.propertyType}</Text>
                  </View>
                ) : null}
                {props.tenure ? (
                  <View style={{ borderRadius: 10, border: props.tenure === 'Freehold' ? `0.5pt solid ${accent}` : '0.5pt solid #fbbf24', paddingVertical: 2, paddingHorizontal: 8, backgroundColor: props.tenure === 'Freehold' ? '#E1F5EE' : '#fef3c7' }}>
                    <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: props.tenure === 'Freehold' ? '#0F6E56' : '#92400e' }}>{props.tenure}</Text>
                  </View>
                ) : null}
                {props.epcRating ? (
                  <View style={{ borderRadius: 10, border: '0.5pt solid #d4dae8', paddingVertical: 2, paddingHorizontal: 8, backgroundColor: '#f5f7fa' }}>
                    <Text style={{ fontSize: 7.5, color: '#1E2B3C', fontFamily: 'DM Sans', fontWeight: 700 }}>{`${props.epcRating} EPC`}</Text>
                  </View>
                ) : null}
                <View style={{ borderRadius: 10, border: `0.5pt solid ${structureColour}`, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>{DEAL_LABELS[props.dealType].replace(' Analysis', '')}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Editorial cover (unified landscape) ─────────────────────────────
             Replaces coverStyle='classic'|'clean'|'bold'. The coverStyle prop
             is retained on the interface for backward compat; the UI selector
             can be removed in a follow-up sweep. */}
        {props.tierOverride !== 'pro' && (
          <View style={{ flex: 1, flexDirection: 'row' }}>

            {/* LEFT PANEL — logo + breadcrumb + address */}
            <View style={{ width: '48%', paddingTop: 36, paddingBottom: 36, paddingLeft: 40, paddingRight: 24, flexDirection: 'column', borderRight: '0.5pt solid #E2E8F0' }}>

              {/* Header row: logo + page indicator */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 10, marginBottom: 20, borderBottom: '0.5pt solid #E2E8F0' }}>
                <View style={{ flex: 1 }}>
                  {props.logoBase64 ? (
                    <Image src={props.logoBase64} style={{ maxHeight: logoHeight, maxWidth: logoMaxWidth, objectFit: 'contain', alignSelf: 'flex-start' }} />
                  ) : null}
                </View>
                <Text
                  style={{ fontSize: 7, color: '#9ca3af', fontFamily: 'DM Sans', letterSpacing: 0.8 }}
                  render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                    `PAGE ${pageNumber} OF ${totalPages}`
                  }
                />
              </View>

              {/* Breadcrumb */}
              <Text style={{ fontSize: 8, color: '#9ca3af', fontFamily: 'DM Sans', marginBottom: 10 }}>
                {DEAL_LABELS[props.dealType]}{city ? ` · ${city}` : ''}
              </Text>

              {/* Address heading — brand colour */}
              <Text style={{ fontSize: 22, fontFamily: 'DM Sans', fontWeight: 700, color: readableBrand, lineHeight: 1.2, marginBottom: 2 }}>
                {coverLine1}
              </Text>
              {coverLine2 ? (
                <Text style={{ fontSize: 22, fontFamily: 'DM Sans', fontWeight: 700, color: readableBrand, lineHeight: 1.2 }}>
                  {coverLine2}
                </Text>
              ) : null}
            </View>

            {/* RIGHT PANEL — key stats + overview + footer */}
            <View style={{ width: '52%', paddingTop: 36, paddingBottom: 36, paddingLeft: 28, paddingRight: 40, flexDirection: 'column' }}>

              {/* Key stats line */}
              <Text style={{ fontSize: 9, color: '#555555', fontFamily: 'DM Sans', marginBottom: 28 }}>
                {fc(props.purchasePrice)} purchase{props.refurbCost > 0 ? ` · ${fc(props.refurbCost)} refurb` : ''}{` · ${coverKeyMetric.label}: ${coverKeyMetric.value}`}
              </Text>

              {/* Overview section */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 10, fontFamily: 'DM Sans', fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>
                  Overview
                </Text>
                <View style={{ width: 28, borderBottom: `2pt solid ${accent}`, marginBottom: 10 }} />
                {props.currentScore !== 'Incomplete' ? (
                  <Text style={{ fontSize: 8.5, color: '#444444', fontFamily: 'DM Sans', lineHeight: 1.5 }}>
                    {verdictSummary}
                  </Text>
                ) : null}
              </View>

              {/* Spacer — pushes footer to bottom */}
              <View style={{ flex: 1 }} />

              {/* Footer */}
              <View>
                <View style={{ borderBottom: '0.5pt solid #E2E8F0', marginBottom: 10 }} />
                {props.preparedBy.name ? (
                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#333333', marginBottom: 3 }}>
                    Prepared by {props.preparedBy.name}
                  </Text>
                ) : null}
                {props.preparedBy.email ? (
                  <Text style={{ fontSize: 9, color: '#555555', fontFamily: 'DM Sans', marginBottom: 2 }}>
                    {props.preparedBy.email}
                  </Text>
                ) : null}
                {props.preparedBy.phone ? (
                  <Text style={{ fontSize: 9, color: '#555555', fontFamily: 'DM Sans', marginBottom: 10 }}>
                    {props.preparedBy.phone}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 7.5, color: '#999999', fontFamily: 'DM Sans' }}>
                  Confidential — Prepared for investor review only
                </Text>
              </View>
            </View>
          </View>
        )}

      </Page>

      {/* ── Page 2: Deal Inputs + Cash Invested ─────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={landscapePage}>
        <Footer />
        <PageHeader />

        {/* Auction callout */}
        {props.isAuctionPurchase && props.auctionDate && (
          <View style={{ backgroundColor: '#FEF3CD', borderLeft: '3pt solid #E29839', borderRadius: 3, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#E29839', textTransform: 'uppercase', letterSpacing: 0.6 }}>AUCTION</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{'Auction Date: ' + props.auctionDate}</Text>
              {props.auctionCompletionDate ? (
                <Text style={{ fontSize: 8, color: '#6B7280' }}>{'Completion: ' + props.auctionCompletionDate}</Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>

          {/* Left column — Property Details + Executive Summary */}
          <View style={{ width: '26%' }}>
            <SH title="Property Details" />
            {([
              ...(props.propertyAddress ? [['Address', displayAddress, true] as RowData] : []),
              ['Type', props.propertyType] as RowData,
              ...(props.bedrooms && props.bedrooms > 0 ? [['Bedrooms', `${props.bedrooms}`] as RowData] : []),
              ...(props.bathrooms && props.bathrooms > 0 ? [['Bathrooms', `${props.bathrooms}`] as RowData] : []),
              ['Tenure', props.tenure] as RowData,
              ...(props.tenure === 'Leasehold' && props.leaseLengthYears > 0
                ? [['Lease Remaining', `${props.leaseLengthYears} yrs`] as RowData] : []),
              ...(props.floorArea ? [['Floor Area', `${props.floorArea} m²`] as RowData] : []),
              ...(props.floorAreaUnit === 'sqft' && props.pricePerSqFt != null
                ? [['Price / sq ft', `£${Math.round(props.pricePerSqFt).toLocaleString('en-GB')}`] as RowData]
                : props.pricePerSqM != null
                ? [['Price / m²', `£${Math.round(props.pricePerSqM).toLocaleString('en-GB')}`] as RowData]
                : []),
              ...(props.epcRating ? [['EPC Rating', props.epcRating] as RowData] : []),
              ...(props.constructionDate ? [['Built', props.constructionDate] as RowData] : []),
            ] as RowData[]).map(([label, value, bold], i) => (
              <TableRow key={i} label={label} value={value} bold={bold} alt={i % 2 === 0} />
            ))}
            {props.tenure === 'Leasehold' && props.remainingLeaseYears != null && props.remainingLeaseYears > 0 && (() => {
              const yrs = props.remainingLeaseYears!;
              const leaseColor = yrs < 70 ? '#A32D2D' : yrs < 80 ? '#E29839' : '#1E2B3C';
              const leaseWarning = yrs < 70 ? ' — Mortgage risk' : yrs < 80 ? ' — Below threshold' : '';
              const leaseBg = yrs < 70 ? '#FEE2E2' : yrs < 80 ? '#FEF3CD' : undefined;
              return (
                <View style={{ flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 5, backgroundColor: leaseBg ?? '#ffffff' }}>
                  <Text style={{ flex: 1, fontSize: 8, color: leaseColor }}>Remaining Lease</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: leaseColor, textAlign: 'right' }}>{`${yrs} yrs${leaseWarning}`}</Text>
                </View>
              );
            })()
            }

            {props.executiveSummary.trim() ? (
              <View style={{ marginTop: 12 }}>
                <SH title="Executive Summary" />
                <Text style={{ fontSize: 7.5, color: '#444444', lineHeight: 1.5 }}>{props.executiveSummary.trim()}</Text>
              </View>
            ) : null}
          </View>

          {/* Centre column — Deal Inputs (left half) */}
          <View style={{ flex: 1 }}>
            <SH title="Deal Inputs" />
            {(() => {
              const half = Math.ceil(inputRows.length / 2);
              const leftRows = inputRows.slice(0, half);
              return (
                <View>
                  <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3, paddingBottom: 3, borderBottom: `1pt solid ${structureColour}` }}>
                    {props.dealType === 'R2R' ? 'Rental Agreement' : props.dealType === 'FLIP' ? 'Purchase & Project' : props.dealType === 'BRRR' ? 'Purchase & Refinance' : 'Purchase & Mortgage'}
                  </Text>
                  {leftRows.map(([label, value, bold], i) => (
                    <TableRow key={i} label={label} value={value} bold={bold} alt={i % 2 === 0} />
                  ))}
                </View>
              );
            })()}
          </View>

          {/* Right column — Deal Inputs (right half) + Cash Invested panel */}
          <View style={{ flex: 1 }}>
            <SH title=" " />
            {(() => {
              const half = Math.ceil(inputRows.length / 2);
              const rightRows = inputRows.slice(half);
              return (
                <View>
                  <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3, paddingBottom: 3, borderBottom: `1pt solid ${structureColour}` }}>
                    {props.dealType === 'FLIP' ? 'Sale & Returns' : 'Income & Costs'}
                  </Text>
                  {rightRows.map(([label, value, bold], i) => (
                    <TableRow key={i} label={label} value={value} bold={bold} alt={i % 2 === 0} />
                  ))}
                </View>
              );
            })()}

            {/* Cash Invested — BTL / HMO / SA / SOCIAL */}
            {(props.dealType === 'BTL' || props.dealType === 'HMO' || props.dealType === 'SA' || props.dealType === 'SOCIAL') && (
              <View style={{ marginTop: 14 }}>
                <SH title="Cash Invested" />
                <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12, borderTop: `2pt solid ${structureColour}` }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 7.5, color: tintText }}>{`Deposit (${props.depositPercent}%)`}</Text>
                      <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(p2CiDeposit)}</Text>
                    </View>
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 7.5, color: tintText }}>{props.taxLabel}</Text>
                      <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.effectiveTax)}</Text>
                    </View>
                    {props.refurbCost > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Refurb Cost</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.refurbCost)}</Text>
                      </View>
                    )}
                    {props.otherCosts > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Other Costs</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.otherCosts)}</Text>
                      </View>
                    )}
                    {props.isAuctionPurchase && (props.buyersPremiumValue ?? 0) > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>{"Buyer's Premium"}</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.buyersPremiumValue!)}</Text>
                      </View>
                    )}
                    {(props.auctionReservationFeeValue ?? 0) > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Reservation Fee</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.auctionReservationFeeValue!)}</Text>
                      </View>
                    )}
                    {(props.leaseExtensionCost ?? 0) > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Lease Extension</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.leaseExtensionCost!)}</Text>
                      </View>
                    )}
                    {props.sourcingFee > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Sourcing Fee</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.sourcingFee)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: tintText, textTransform: 'uppercase', letterSpacing: 0.4 }}>TOTAL CASH INVESTED</Text>
                    <Text style={{ fontSize: 16, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(p2CiTotal)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Cash Invested — BRRR */}
            {props.dealType === 'BRRR' && (
              <View style={{ marginTop: 14 }}>
                <SH title="Cash Invested" />
                <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12, borderTop: `2pt solid ${structureColour}` }}>
                  <View style={{ flexDirection: 'row' }}>
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 7.5, color: tintText }}>Initial Cash Out</Text>
                      <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.brrrResults.totalCostIn)}</Text>
                    </View>
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 7.5, color: tintText }}>Refinance Proceeds</Text>
                      <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{`(${fc(props.brrrResults.refinanceLoan)})`}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: tintText, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {props.brrrResults.moneyOut ? 'MONEY OUT' : 'CASH LEFT IN DEAL'}
                    </Text>
                    <Text style={{ fontSize: 16, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>
                      {props.brrrResults.moneyOut ? `${fc(Math.abs(props.brrrResults.cashLeftInDeal))} OUT` : fc(props.brrrResults.cashLeftInDeal)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Cash Invested — R2R */}
            {props.dealType === 'R2R' && (
              <View style={{ marginTop: 14 }}>
                <SH title="Cash Invested" />
                <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12, borderTop: `2pt solid ${structureColour}` }}>
                  {/* Monthly income / cost summary */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5 }}>
                    {[
                      ['Rent to Landlord', fc(props.r2rInputs.monthlyRentPaid)],
                      ['Gross Monthly Income', fc(props.r2rResults.grossMonthlyIncome)],
                      ['Monthly Spread', fc(props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid)],
                      ['Running Costs', fc(props.r2rInputs.monthlyRunningCosts)],
                    ].map(([lbl, val], i) => (
                      <View key={i} style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>{lbl}</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{val}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Capital committed breakdown */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingTop: 3, borderTop: `1pt solid ${tintBorder}` }}>
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 7.5, color: tintText }}>Setup Costs</Text>
                      <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.r2rInputs.setupCosts)}</Text>
                    </View>
                    {props.r2rInputs.landlordDeposit > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Landlord Deposit</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.r2rInputs.landlordDeposit)}</Text>
                      </View>
                    )}
                    {props.sourcingFee > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Sourcing Fee</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.sourcingFee)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: tintText, textTransform: 'uppercase', letterSpacing: 0.4 }}>TOTAL CASH INVESTED</Text>
                    <Text style={{ fontSize: 16, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.r2rResults.totalCashInvested)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Project Cost — FLIP */}
            {props.dealType === 'FLIP' && (
              <View style={{ marginTop: 14 }}>
                <SH title="Project Cost Summary" />
                <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12, borderTop: `2pt solid ${structureColour}` }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {[
                      ['Purchase Price', fc(props.purchasePrice)],
                      ['Stamp Duty', fc(props.effectiveTax)],
                      ['Refurb Cost', fc(props.refurbCost)],
                      ['Holding Costs', fc(props.flipInputs.holdingCostsPerMonth * props.flipInputs.projectLengthMonths)],
                      ['Selling Costs', fc(props.flipResults.sellingCosts)],
                      ['Target GDV', fc(props.flipInputs.expectedSalePrice)],
                    ].map(([lbl, val], i) => (
                      <View key={i} style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>{lbl}</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{val}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: tintText, textTransform: 'uppercase', letterSpacing: 0.4 }}>NET PROFIT</Text>
                    <Text style={{ fontSize: 16, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.flipResults.netProfit)}</Text>
                  </View>
                </View>
              </View>
            )}

          </View>
        </View>
      </Page>

      {/* ── Page 3: Strategy Analysis ────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={landscapePage}>
        <Footer />
        <PageHeader />

        <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>

          {/* Left column — Score breakdown + 3 callout cards + verdict panel */}
          <View style={{ width: '40%', flexDirection: 'column' }}>
            <SH title={DEAL_LABELS[props.dealType]} />

            {/* Verdict badge */}
            {props.currentScore !== 'Incomplete' && (
              <View style={{
                marginBottom: 10,
                borderLeft: `4pt solid ${scoreColor}`,
                borderLeftStyle: 'solid',
                backgroundColor: SCORE_TINT[props.currentScore] ?? 'rgba(107,114,128,0.09)',
                paddingVertical: 7,
                paddingHorizontal: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: 3,
              }}>
                <Text style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700, color: '#1B2B4B' }}>
                  {VERDICT_LABELS[props.currentScore] ?? props.currentScore}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                  <Text style={{ fontSize: 26, fontFamily: 'DM Sans', fontWeight: 700, color: '#1B2B4B', lineHeight: 1 }}>{dealScoreOverall.toFixed(1)}</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>/ 10</Text>
                </View>
              </View>
            )}

            {/* Score breakdown table */}
            {props.currentScore !== 'Incomplete' && (
              <View style={{ marginBottom: 12, borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 4, paddingHorizontal: 6, borderBottom: '0.5pt solid #E5E7EB' }}>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#6B7280' }}>DIMENSION</Text>
                  <Text style={{ width: 44, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#6B7280', textAlign: 'center' }}>SCORE</Text>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#6B7280' }}> </Text>
                </View>
                {dealScoreDims.map((dim, i) => {
                  const barColor = dim.score >= 7 ? '#22C55E' : dim.score >= 4 ? '#F59E0B' : '#EF4444';
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3.5, paddingHorizontal: 6, backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB', borderBottom: i < dealScoreDims.length - 1 ? '0.5pt solid #E5E7EB' : undefined }}>
                      <Text style={{ flex: 1, fontSize: 8, color: '#1E2B3C' }}>{dim.name}</Text>
                      <Text style={{ width: 44, fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', textAlign: 'center' }}>{dim.score} / 10</Text>
                      <View style={{ flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 2 }}>
                        <View style={{ width: `${(dim.score / 10) * 100}%`, height: 6, backgroundColor: barColor, borderRadius: 2 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Three-group analysis panel */}
            {(() => {
              const mh = hasMeaningfulInputs(props);
              const g = (v: string) => mh ? v : '\u2014';
              const dt = props.dealType;

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
                return [['Total Cash Invested', g(fc(props.r2rResults.totalCashInvested))]];
              })();

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
                  <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6, borderTop: `2pt solid ${structureColour}` }}>
                    <Text style={{ fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>What I Commit</Text>
                    {commitRows.map(([lbl, val]) => (
                      <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                        <Text style={{ fontSize: 8, color: '#6B7280' }}>{lbl}</Text>
                        <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{val}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Group 2 — Monthly */}
                  <View style={{ border: '0.5pt solid #E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                    <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderBottom: `1.5pt solid ${structureColour}` }}>
                      <Text style={{ fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8 }}>Monthly</Text>
                    </View>
                    <View style={{ paddingVertical: 5, paddingHorizontal: 8 }}>
                      {mortgageVal !== null && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                          <Text style={{ fontSize: 8, color: '#6B7280' }}>Mortgage</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{mortgageVal}</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                        <Text style={{ fontSize: 8, color: '#6B7280' }}>{opCostLabel}</Text>
                        <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{opCostVal}</Text>
                      </View>
                      {dt !== 'FLIP' && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, marginTop: 2, borderTop: '0.5pt solid #E5E7EB' }}>
                          <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{cfLabel}</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: cfColor }}>{g(fc(cfVal))}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Group 3 — Returns */}
                  <View style={{ border: '0.5pt solid #E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderBottom: `1.5pt solid ${structureColour}` }}>
                      <Text style={{ fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8 }}>Returns</Text>
                    </View>
                    <View style={{ paddingVertical: 5, paddingHorizontal: 8 }}>
                      {returnRows.map(([lbl, val]) => (
                        <View key={lbl} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                          <Text style={{ fontSize: 8, color: '#6B7280' }}>{lbl}</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{val}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Risk flags */}
            {props.riskFlags.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                {props.riskFlags.map((flag, i) => (
                  <View key={i} style={{ backgroundColor: '#fef3c7', border: '0.5pt solid #fbbf24', borderRadius: 3, paddingVertical: 5, paddingHorizontal: 6, marginBottom: 3 }}>
                    <Text style={{ fontSize: 7.5, color: '#92400e', lineHeight: 1.4 }}>
                      {'WARNING: ' + flag.replace(/[^\u0020-\u00FF]/g, '').trim()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Net Cash Flow hero — mortgage strategies only */}
            {(props.dealType === 'BTL' || props.dealType === 'HMO' || props.dealType === 'SA' || props.dealType === 'BRRR' || props.dealType === 'SOCIAL') && (
              <View style={{ backgroundColor: panelBg, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14, marginTop: 'auto' }}>
                <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Net Monthly Cash Flow</Text>
                <Text style={{ fontSize: 22, fontFamily: 'DM Sans', fontWeight: 700, color: 'white', lineHeight: 1 }}>
                  {props.dealType === 'BTL' ? fc(props.btlResults.monthlyCashFlow)
                   : props.dealType === 'HMO' ? fc(props.hmoResults.monthlyCashFlow)
                   : props.dealType === 'SA' ? fc(props.saResults.monthlyCashFlow)
                   : props.dealType === 'BRRR' ? fc(props.brrrResults.monthlyCashFlow)
                   : fc(props.socialResults.monthlyCashFlow)}
                </Text>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  {props.dealType === 'BTL' ? `${fc(props.btlResults.monthlyCashFlow * 12)} annually`
                   : props.dealType === 'HMO' ? `${fc(props.hmoResults.monthlyCashFlow * 12)} annually`
                   : props.dealType === 'SA' ? `${fc(props.saResults.monthlyCashFlow * 12)} annually`
                   : props.dealType === 'BRRR' ? `${fc(props.brrrResults.monthlyCashFlow * 12)} annually`
                   : `${fc(props.socialResults.monthlyCashFlow * 12)} annually`}
                </Text>
              </View>
            )}
          </View>

          {/* Right column — Full results table + What This Means */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <SH title="Financial Summary" />

            {/* Results table */}
            <View style={{ marginBottom: 12, borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 7, borderBottom: `1.5pt solid ${structureColour}` }}>
                <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>METRIC</Text>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>VALUE</Text>
              </View>
              {resultsRows.map(([label, value, bold], i) => (
                <View key={i} style={{
                  flexDirection: 'row',
                  paddingVertical: 3.5,
                  paddingHorizontal: 7,
                  backgroundColor: i % 2 === 0 ? '#ffffff' : '#F9FAFB',
                  borderBottom: i < resultsRows.length - 1 ? '0.5pt solid #E5E7EB' : undefined,
                }}>
                  <Text style={{ flex: 1, fontSize: 8.5, color: '#555555' }}>{label}</Text>
                  <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: bold ? 'bold' : 'normal', color: bold ? structureColour : '#333333', textAlign: 'right' }}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Sensitivity Analysis */}
            {props.stressTest && (
              <View style={{ marginBottom: 12 }}>
                <SH title="Sensitivity Analysis" mt={4} />
                <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 7, borderBottom: `1.5pt solid ${structureColour}` }}>
                    <Text style={{ flex: 1.8, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>METRIC</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>BASE CASE</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>RENT {'\u221210%'}</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>RATE +1.5%</Text>
                  </View>
                  <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 7, backgroundColor: '#FFFFFF', borderBottom: '0.5pt solid #E5E7EB' }}>
                    <Text style={{ flex: 1.8, fontSize: 8, color: '#1E2B3C' }}>Monthly Cash Flow</Text>
                    {([props.stressTest.baseCashFlow, props.stressTest.rentDownCashFlow, props.stressTest.rateUpCashFlow] as number[]).map((v, i) => (
                      <Text key={i} style={{ flex: 1, fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>
                        {fc(v)}
                      </Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 7, backgroundColor: '#F9FAFB' }}>
                    <Text style={{ flex: 1.8, fontSize: 8, color: '#1E2B3C' }}>Cash-on-Cash ROI</Text>
                    {([props.stressTest.baseCoC, props.stressTest.rentDownCoC, props.stressTest.rateUpCoC] as number[]).map((v, i) => (
                      <Text key={i} style={{ flex: 1, fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>
                        {isFinite(v) ? fp(v) : '\u221E'}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* What This Means */}
            {props.executiveSummary.trim() || props.strategyNotes.trim() ? (
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 3, paddingVertical: 8, paddingHorizontal: 10, borderLeft: `2pt solid ${structureColour}`, marginBottom: 10 }}>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Strategy Notes</Text>
                <Text style={{ fontSize: 8, color: '#1E2B3C', lineHeight: 1.5 }}>
                  {props.strategyNotes.trim() || props.executiveSummary.trim()}
                </Text>
              </View>
            ) : null}

            {/* DealScore Pro Plus watermark line */}
            <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 0.5, backgroundColor: '#E5E7EB' }} />
              <Text style={{ fontSize: 7, color: '#9ca3af', fontFamily: 'DM Sans', fontStyle: 'italic' }}>
                {isProPlus ? `${DEALSCORE_BRAND.name} Pro Plus Report` : `${DEALSCORE_BRAND.name} Report`}
              </Text>
              <View style={{ flex: 1, height: 0.5, backgroundColor: '#E5E7EB' }} />
            </View>
          </View>

        </View>
      </Page>


      {/* ── Page 4: Deal Score Verdict ──────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={landscapePage}>
        <PageHeader />
        <Footer />
        <SH title="Deal Score Verdict" />

        <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>

          {/* Left — Score badge + dims table + verdict sentence */}
          <View style={{ flex: 1 }}>

            {/* Verdict badge */}
            <View style={{ backgroundColor: scoreColor, borderRadius: 6, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 38, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
                {dealScoreOverall.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                {VERDICT_LABELS[props.currentScore] ?? props.currentScore}
              </Text>
            </View>

            {/* Score dimensions table */}
            <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', backgroundColor: structureColour, paddingVertical: 4, paddingHorizontal: 8 }}>
                <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff' }}>DIMENSION</Text>
                <Text style={{ width: 40, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>SCORE</Text>
                <Text style={{ width: 44, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>WEIGHT</Text>
                <Text style={{ width: 50, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>CONTRIB</Text>
              </View>
              {dealScoreDims.map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: i % 2 === 0 ? '#ffffff' : '#F9FAFB', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 8, color: '#555555' }}>{d.name}</Text>
                  <View style={{ width: 40, alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: d.score >= 7 ? '#D1FAE5' : d.score >= 4 ? '#FEF9C3' : '#FEE2E2', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: d.score >= 7 ? '#166534' : d.score >= 4 ? '#854D0E' : '#991B1B' }}>{d.score.toFixed(0)}</Text>
                    </View>
                  </View>
                  <Text style={{ width: 44, fontSize: 8, color: '#6B7280', textAlign: 'right' }}>{`${(d.weight * 100).toFixed(0)}%`}</Text>
                  <Text style={{ width: 50, fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>{(d.score * d.weight).toFixed(2)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#F0F4FF', borderTop: `1pt solid ${structureColour}` }}>
                <Text style={{ flex: 1, fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Overall DealScore</Text>
                <Text style={{ width: 40, fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: scoreColor, textAlign: 'right' }}>{dealScoreOverall.toFixed(1)}</Text>
                <Text style={{ width: 44, fontSize: 8, color: '#9ca3af', textAlign: 'right' }}>/ 10</Text>
                <Text style={{ width: 50 }} />
              </View>
            </View>

            {/* Verdict summary sentence */}
            {verdictSummary ? (
              <View style={{ backgroundColor: structureBg, borderLeft: `2pt solid ${scoreColor}`, borderRadius: 3, paddingVertical: 8, paddingHorizontal: 10 }}>
                <Text style={{ fontSize: 8.5, color: '#1E2B3C', lineHeight: 1.5 }}>{verdictSummary}</Text>
              </View>
            ) : null}

          </View>

          {/* Right — What This Means + risk flags + callout metric cards */}
          <View style={{ flex: 1 }}>

            {/* What This Means */}
            {whatThisMeans ? (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>What This Means</Text>
                <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 8 }} />
                <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{whatThisMeans}</Text>
              </View>
            ) : null}

            {/* Risk flags */}
            {props.riskFlags.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                {props.riskFlags.map((flag, i) => (
                  <View key={i} style={{ backgroundColor: '#fef3c7', border: '0.5pt solid #fbbf24', borderRadius: 3, paddingVertical: 5, paddingHorizontal: 6, marginBottom: 3 }}>
                    <Text style={{ fontSize: 7.5, color: '#92400e', lineHeight: 1.4 }}>
                      {'⚠ ' + flag.replace(/[^\u0020-\u00FF]/g, '').trim()}
                    </Text>
                  </View>
                ))}
              </View>
            )}


          </View>
        </View>
      </Page>

      {/* ── Page 5: Financial Detail + Income Waterfall ───────────────────────── */}
      {(props.dealType === 'BTL' || props.dealType === 'HMO' || props.dealType === 'SA' || props.dealType === 'BRRR' || props.dealType === 'SOCIAL') && (
        <Page size="A4" orientation="landscape" style={landscapePage}>
          <PageHeader />
          <Footer />
          <SH title="Financial Detail" />

          <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>

            {/* Left — P&L waterfall table + sensitivity */}
            <View style={{ flex: 1 }}>

              {/* P&L table */}
              <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', backgroundColor: structureColour, paddingVertical: 4, paddingHorizontal: 8 }}>
                  <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff' }}>P&L BREAKDOWN</Text>
                  <Text style={{ width: 70, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>MONTHLY</Text>
                </View>
                {[
                  { label: 'Gross Rent', value: fdGrossRent, bold: false, indent: 0 },
                  { label: `  Void Allowance (${fdVoidPct}%)`, value: -(fdGrossRent * fdVoidPct / 100), bold: false, indent: 1 },
                  { label: 'Effective Rent', value: fdGrossRent * (1 - fdVoidPct / 100), bold: true, indent: 0 },
                  { label: `  Management Fee (${fdMgmtPct}%)`, value: -(fdGrossRent * (1 - fdVoidPct / 100) * fdMgmtPct / 100), bold: false, indent: 1 },
                  { label: '  Maintenance Reserve', value: -fdMaintenance, bold: false, indent: 1 },
                  { label: '  Buildings Insurance', value: -fdInsurance, bold: false, indent: 1 },
                  ...(fdSc > 0 ? [{ label: '  Service Charge', value: -fdSc, bold: false, indent: 1 }] : []),
                  ...(fdGrMonthly > 0 ? [{ label: '  Ground Rent', value: -fdGrMonthly, bold: false, indent: 1 }] : []),
                  { label: 'Net Operating Income', value: fdGrossRent * (1 - fdVoidPct / 100) - fdGrossRent * (1 - fdVoidPct / 100) * fdMgmtPct / 100 - fdMaintenance - fdInsurance - fdSc - fdGrMonthly, bold: true, indent: 0 },
                  { label: '  Mortgage Payment', value: -fdMortgagePayment, bold: false, indent: 1 },
                  { label: 'Net Cash Flow', value: activeResults.monthlyCashFlow, bold: true, indent: 0 },
                ].map(({ label, value, bold, indent }, i) => (
                  <View key={i} style={{ flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 8, backgroundColor: bold ? '#F0F4FF' : i % 2 === 0 ? '#ffffff' : '#F9FAFB', borderTop: bold ? `0.5pt solid ${structureColour}` : undefined }}>
                    <Text style={{ flex: 1, fontSize: 8, color: bold ? structureColour : indent ? '#6B7280' : '#333333', fontFamily: 'DM Sans', fontWeight: bold ? 'bold' : 'normal' }}>{label}</Text>
                    <Text style={{ width: 70, fontSize: 8, fontFamily: 'DM Sans', fontWeight: bold ? 'bold' : 'normal', color: value < 0 ? '#DC2626' : bold ? structureColour : '#333333', textAlign: 'right' }}>{fc(value)}</Text>
                  </View>
                ))}
              </View>

              {/* Payback period callout */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, borderTop: `2pt solid ${structureColour}` }}>
                  <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Payback Period</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fdPaybackDisplay}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, borderTop: `2pt solid ${structureColour}` }}>
                  <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Annual Cash Flow</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'DM Sans', fontWeight: 700, color: activeResults.monthlyCashFlow >= 0 ? '#166534' : '#991B1B' }}>{fc(activeResults.monthlyCashFlow * 12)}</Text>
                </View>
              </View>

              {/* Sensitivity Analysis */}
              {props.stressTest && (
                <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 8, borderBottom: `1.5pt solid ${structureColour}` }}>
                    <Text style={{ flex: 1.8, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>SENSITIVITY</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>BASE CASE</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>RENT {'\u221210%'}</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>RATE +1.5%</Text>
                  </View>
                  <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#ffffff', borderBottom: '0.5pt solid #E5E7EB' }}>
                    <Text style={{ flex: 1.8, fontSize: 8, color: '#1E2B3C' }}>Monthly Cash Flow</Text>
                    {([props.stressTest.baseCashFlow, props.stressTest.rentDownCashFlow, props.stressTest.rateUpCashFlow] as number[]).map((v, i) => (
                      <Text key={i} style={{ flex: 1, fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>{fc(v)}</Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F9FAFB' }}>
                    <Text style={{ flex: 1.8, fontSize: 8, color: '#1E2B3C' }}>Cash-on-Cash ROI</Text>
                    {([props.stressTest.baseCoC, props.stressTest.rentDownCoC, props.stressTest.rateUpCoC] as number[]).map((v, i) => (
                      <Text key={i} style={{ flex: 1, fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>{isFinite(v) ? fp(v) : '\u221E'}</Text>
                    ))}
                  </View>
                </View>
              )}

            </View>

            {/* Right — Income Waterfall SVG + key metric cards */}
            <View style={{ flex: 1 }}>

              <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Income Waterfall</Text>
              <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 8 }} />

              {(() => {
                const grossRent = fdGrossRent;
                if (grossRent <= 0) return <Text style={{ fontSize: 8, color: '#9ca3af' }}>Chart not available.</Text>;
                const effectiveRent = grossRent * (1 - fdVoidPct / 100);
                const voidAmt = grossRent * fdVoidPct / 100;
                const mgmtFee = effectiveRent * fdMgmtPct / 100;
                const totalOpCosts = mgmtFee + fdMaintenance + fdInsurance + fdSc + fdGrMonthly;
                const noi = effectiveRent - totalOpCosts;
                const netCF = activeResults.monthlyCashFlow;
                const chartW = 270;
                const leftM = 42;
                const topM = 8;
                const barMaxH = 155;
                const barW = 26;
                const gap = 7;
                const yC = (v: number) => topM + barMaxH * (1 - Math.max(0, v) / grossRent);
                const bars = [
                  { label: 'Gross', value: grossRent, floor: 0, barH: barMaxH, color: '#2D7A4F' },
                  { label: 'Void', value: voidAmt, floor: (effectiveRent / grossRent) * barMaxH, barH: (voidAmt / grossRent) * barMaxH, color: '#DC2626' },
                  { label: 'Eff.Rent', value: effectiveRent, floor: 0, barH: (effectiveRent / grossRent) * barMaxH, color: brand },
                  { label: 'Costs', value: totalOpCosts, floor: Math.max(0, noi / grossRent) * barMaxH, barH: (totalOpCosts / grossRent) * barMaxH, color: '#DC2626' },
                  { label: 'NOI', value: noi, floor: 0, barH: Math.max(0, (noi / grossRent) * barMaxH), color: '#2D7A4F' },
                  { label: 'Mortgage', value: fdMortgagePayment, floor: Math.max(0, netCF / grossRent) * barMaxH, barH: (fdMortgagePayment / grossRent) * barMaxH, color: '#6B7280' },
                  { label: 'Net CF', value: netCF, floor: 0, barH: Math.abs((netCF / grossRent) * barMaxH), color: netCF >= 0 ? '#2D7A4F' : '#DC2626' },
                ];
                const gridFracs = [0.25, 0.5, 0.75, 1.0];
                return (
                  <Svg width={chartW} height={195}>
                    {gridFracs.map((frac, i) => {
                      const gy = topM + barMaxH * (1 - frac);
                      return <Line key={i} x1={leftM} y1={gy} x2={chartW} y2={gy} stroke="#E5E7EB" strokeWidth={0.5} />;
                    })}
                    {gridFracs.map((frac, i) => {
                      const gy = topM + barMaxH * (1 - frac);
                      return <SvgText key={i} x={leftM - 3} y={gy + 2.5} fontSize={5.5} fill="#9ca3af" textAnchor="end">{fc(grossRent * frac)}</SvgText>;
                    })}
                    {bars.map((bar, i) => (
                      <Rect key={i} x={leftM + i * (barW + gap)} y={topM + bar.floor} width={barW} height={Math.max(0, bar.barH)} fill={bar.color} rx={1} />
                    ))}
                    {bars.map((bar, i) => {
                      const bx = leftM + i * (barW + gap) + barW / 2;
                      const by = Math.max(topM + 8, topM + bar.floor - 2);
                      return <SvgText key={i} x={bx} y={by} fontSize={6} fill="#1E2B3C" textAnchor="middle">{fc(Math.abs(bar.value))}</SvgText>;
                    })}
                    {bars.map((bar, i) => (
                      <SvgText key={i} x={leftM + i * (barW + gap) + barW / 2} y={topM + barMaxH + 12} fontSize={6} fill="#6B7280" textAnchor="middle">{bar.label}</SvgText>
                    ))}
                  </Svg>
                );
              })()}

              {/* Key metric cards 2×2 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {([
                  { label: 'Gross Rent / mo', value: fc(fdGrossRent) },
                  { label: 'Mortgage / mo', value: fc(fdMortgagePayment) },
                  { label: 'Payback Period', value: fdPaybackDisplay },
                  { label: 'Net CF / mo', value: fc(activeResults.monthlyCashFlow) },
                ] as { label: string; value: string }[]).map((m, i) => (
                  <View key={i} style={{ width: '47%', backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, borderTop: `2pt solid ${structureColour}` }}>
                    <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>{m.label}</Text>
                    <Text style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{m.value}</Text>
                  </View>
                ))}
              </View>

            </View>
          </View>
        </Page>
      )}

      {/* ── Page 6: Stress Testing ───────────────────────────────────────────── */}
      {(props.dealType === 'BTL' || props.dealType === 'HMO' || props.dealType === 'SA' || props.dealType === 'BRRR' || props.dealType === 'SOCIAL') && (
        <Page size="A4" orientation="landscape" style={landscapePage}>
          <PageHeader />
          <Footer />
          <SH title="Stress Testing" />

          <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>

            {/* Left — Scenario table + rent buffer cards + what this means */}
            <View style={{ flex: 1 }}>

              {/* 3-scenario stress table */}
              <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: structureColour }}>
                  <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff' }}>METRIC</Text>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>OPTIMISTIC</Text>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>BASE CASE</Text>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'DM Sans', fontWeight: 700, color: '#ffffff', textAlign: 'right' }}>STRESS</Text>
                </View>
                <View style={{ flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 8, backgroundColor: '#F8FAFC', borderBottom: '0.5pt solid #E5E7EB' }}>
                  <Text style={{ flex: 1.5, fontSize: 7.5, color: '#6B7280' }}>Rate</Text>
                  {[stOpt, stBase, stStress].map((s, i) => (
                    <Text key={i} style={{ flex: 1, fontSize: 7.5, color: '#1E2B3C', textAlign: 'right' }}>{s.rate.toFixed(2)}%</Text>
                  ))}
                </View>
                {[
                  { label: 'Mortgage / mo', fn: (s: typeof stBase) => fc(s.mortgage) },
                  { label: 'Cash Flow / mo', fn: (s: typeof stBase) => fc(s.cf), colored: true },
                  { label: 'Cash-on-Cash ROI', fn: (s: typeof stBase) => isFinite(s.roi) ? fp(s.roi) : 'N/A', colored: true },
                  { label: 'Payback Period', fn: (s: typeof stBase) => stPaybackDisplay(s) },
                ].map(({ label, fn, colored }, i) => (
                  <View key={i} style={{ flexDirection: 'row', paddingVertical: 3.5, paddingHorizontal: 8, backgroundColor: i % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: i < 3 ? '0.5pt solid #E5E7EB' : undefined }}>
                    <Text style={{ flex: 1.5, fontSize: 8, color: '#555555' }}>{label}</Text>
                    {[stOpt, stBase, stStress].map((s, j) => {
                      const val = fn(s);
                      const isNeg = colored && s.cf < 0;
                      return (
                        <Text key={j} style={{ flex: 1, fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: colored ? stCfColor(s.cf) : '#333333', textAlign: 'right' }}>{val}</Text>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Rent buffer callout cards */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, borderTop: `2pt solid ${structureColour}` }}>
                  <Text style={{ fontSize: 6.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Break-Even Rent</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(stBreakEvenRent)}</Text>
                  <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 1 }}>/mo minimum</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, borderTop: `2pt solid ${stRentHeadroom >= 0 ? '#16A34A' : '#DC2626'}` }}>
                  <Text style={{ fontSize: 6.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Rent Headroom</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 700, color: stRentHeadroom >= 0 ? '#166534' : '#991B1B' }}>{fc(stRentHeadroom)}</Text>
                  <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 1 }}>buffer before loss</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, borderTop: `2pt solid ${stStressCF >= 0 ? '#16A34A' : '#DC2626'}` }}>
                  <Text style={{ fontSize: 6.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Stress CF ({stStressRate.toFixed(2)}%)</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 700, color: stCfColor(stStressCF) }}>{fc(stStressCF)}</Text>
                  <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 1 }}>at peak rate</Text>
                </View>
              </View>

              {/* What This Means tint panel */}
              <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, borderTop: `2pt solid ${structureColour}` }}>
                <Text style={{ fontSize: 7.5, color: tintText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Rate Resilience Summary</Text>
                <Text style={{ fontSize: 8, color: '#1E2B3C', lineHeight: 1.5 }}>
                  {stRentHeadroom > 0
                    ? `At the base rate of ${stBaseRate.toFixed(2)}%, rent must fall by ${fc(stRentHeadroom)} (to ${fc(stBreakEvenRent)}/mo) before this deal turns cash-flow negative. At the stress rate of ${stStressRate.toFixed(2)}%, monthly cash flow ${stStressCF >= 0 ? `remains positive at ${fc(stStressCF)}` : `moves to ${fc(stStressCF)}`}.`
                    : `At the base rate of ${stBaseRate.toFixed(2)}%, the break-even rent of ${fc(stBreakEvenRent)}/mo exceeds the contracted rent by ${fc(Math.abs(stRentHeadroom))}. Rate increases will widen this gap. Review costs or renegotiate terms.`}
                </Text>
              </View>

            </View>

            {/* Right — Cash Flow Rate Curve SVG */}
            <View style={{ flex: 1 }}>

              <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Cash Flow vs. Mortgage Rate</Text>
              <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 8 }} />

              {(() => {
                const chartW = 270;
                const leftM = 50;
                const topM = 10;
                const chartH = 180;
                const rateMin = Math.max(0.5, stBaseRate - 1.5);
                const rateMax = stStressRate + 0.5;
                const rateRange = rateMax - rateMin;
                const points: { r: number; cf: number }[] = [];
                for (let step = 0; step <= 20; step++) {
                  const r = rateMin + (step / 20) * rateRange;
                  const mortgage = stLoanAmount * (r / 100) / 12;
                  const cf = stEffectiveRent - stTotalOpCosts - mortgage;
                  points.push({ r, cf });
                }
                const cfMin = Math.min(...points.map(p => p.cf));
                const cfMax = Math.max(...points.map(p => p.cf));
                const cfRange = cfMax - cfMin || 1;
                const px = (r: number) => leftM + ((r - rateMin) / rateRange) * (chartW - leftM - 8);
                const py = (cf: number) => topM + (1 - (cf - cfMin) / cfRange) * chartH;
                const zeroY = py(0);
                const polylinePoints = points.map(p => `${px(p.r)},${py(p.cf)}`).join(' ');
                const gridYVals = [cfMin, cfMin + cfRange * 0.5, cfMax];
                return (
                  <Svg width={chartW} height={chartH + topM + 30}>
                    {/* horizontal grid */}
                    {gridYVals.map((v, i) => (
                      <Line key={i} x1={leftM} y1={py(v)} x2={chartW - 8} y2={py(v)} stroke="#E5E7EB" strokeWidth={0.5} />
                    ))}
                    {/* zero line */}
                    {zeroY >= topM && zeroY <= topM + chartH && (
                      <Line x1={leftM} y1={zeroY} x2={chartW - 8} y2={zeroY} stroke="#DC2626" strokeWidth={0.75} />
                    )}
                    {/* Y-axis labels */}
                    {gridYVals.map((v, i) => (
                      <SvgText key={i} x={leftM - 3} y={py(v) + 3} fontSize={5.5} fill="#9ca3af" textAnchor="end">{fc(v)}</SvgText>
                    ))}
                    {/* Curve */}
                    <Polyline points={polylinePoints} stroke={structureColour} strokeWidth={1.5} fill="none" />
                    {/* Scenario markers */}
                    {[
                      { s: stOpt, label: `${stOpt.rate.toFixed(1)}%`, color: '#16A34A' },
                      { s: stBase, label: `${stBase.rate.toFixed(1)}%`, color: structureColour },
                      { s: stStress, label: `${stStress.rate.toFixed(1)}%`, color: '#DC2626' },
                    ].map((m, i) => (
                      <React.Fragment key={i}>
                        <Circle cx={px(m.s.rate)} cy={py(m.s.cf)} r={3} fill={m.color} />
                        <SvgText x={px(m.s.rate)} y={py(m.s.cf) - 5} fontSize={6} fill={m.color} textAnchor="middle">{m.label}</SvgText>
                      </React.Fragment>
                    ))}
                    {/* X-axis labels */}
                    {[rateMin, stBaseRate, rateMax].map((r, i) => (
                      <SvgText key={i} x={px(r)} y={topM + chartH + 14} fontSize={5.5} fill="#6B7280" textAnchor="middle">{r.toFixed(1)}%</SvgText>
                    ))}
                    <SvgText x={(leftM + chartW - 8) / 2} y={topM + chartH + 24} fontSize={6} fill="#9ca3af" textAnchor="middle">Mortgage Rate</SvgText>
                  </Svg>
                );
              })()}

              {/* Rate resilience metric cards */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {[
                  { label: 'Optimistic CF', value: fc(stOpt.cf), color: '#16A34A' },
                  { label: 'Base CF', value: fc(stBase.cf), color: structureColour },
                  { label: 'Stress CF', value: fc(stStress.cf), color: stStressCF >= 0 ? '#16A34A' : '#DC2626' },
                ].map((m, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, borderTop: `2pt solid ${m.color}` }}>
                    <Text style={{ fontSize: 6.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>{m.label}</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'DM Sans', fontWeight: 700, color: m.color }}>{m.value}</Text>
                  </View>
                ))}
              </View>

            </View>
          </View>
        </Page>
      )}

      {/* ── Page 7: Deal Rationale ──────────────────────────────────────────── */}
      {hasRationale && (
        <Page size="A4" orientation="landscape" style={landscapePage}>
          <PageHeader />
          <Footer />
          <SH title="Deal Rationale" />

          <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>

            {/* Left column */}
            <View style={{ flex: 1 }}>

              {strategyNotesText ? (
                <View wrap={false} style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Why This Strategy?</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{strategyNotesText}</Text>
                </View>
              ) : null}

              {propertyDescText ? (
                <View wrap={false} style={{ marginBottom: 10, marginTop: strategyNotesText ? 10 : 0 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Property Description</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{propertyDescText}</Text>
                </View>
              ) : null}

              {props.refurbScope?.trim() ? (
                <View wrap={false} style={{ marginBottom: 10, marginTop: 10 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Refurb Scope</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{props.refurbScope}</Text>
                </View>
              ) : null}

              {vendorSituationText && props.dealType !== 'R2R' ? (
                <View wrap={false} style={{ marginBottom: 10, marginTop: 10 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Vendor Situation</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{vendorSituationText}</Text>
                </View>
              ) : null}

            </View>

            {/* Right column */}
            <View style={{ flex: 1 }}>

              {/* Investment Timeline */}
              {(() => {
                if (!props.timelineStages) return null;
                const filteredStages = props.timelineStages.filter(s => s.label.trim());
                if (filteredStages.length < 2) return null;
                const durations: number[] = [];
                for (let i = 0; i < filteredStages.length - 1; i++) {
                  durations.push(Math.max(1, filteredStages[i + 1].month - filteredStages[i].month));
                }
                return (
                  <View wrap={false} style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Investment Timeline</Text>
                    <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 10 }} />

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: 14 }}>
                      <View style={{ width: 16, flexShrink: 0 }} />
                      {durations.map((dur, i) => (
                        <View key={i} style={{ flex: dur, alignItems: 'center' }}>
                          <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>
                            {dur === 1 ? '1 month' : `${dur} months`}
                          </Text>
                        </View>
                      ))}
                      <View style={{ width: 16, flexShrink: 0 }} />
                    </View>

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

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }}>
                      {filteredStages.map((stage, i) => {
                        const isFirst = i === 0;
                        const isLast = i === filteredStages.length - 1;
                        return (
                          <React.Fragment key={i}>
                            <View style={{ width: 20, flexShrink: 0, alignItems: isFirst ? 'flex-start' : isLast ? 'flex-end' : 'center' }}>
                              <Text style={{
                                fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C',
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

              {/* Risk Factors */}
              <View wrap={false} style={{ marginBottom: 10, marginTop: 14 }}>
                <Text style={{ fontSize: 8.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Risk Factors</Text>
                <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 3, paddingVertical: 6, paddingHorizontal: 8 }}>
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

                  {props.dealType !== 'R2R' && props.dealType !== 'FLIP' && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                      <View style={{ width: 4, height: 4, backgroundColor: structureColour, marginTop: 3, marginRight: 6 }} />
                      <Text style={{ fontSize: 8.5, color: '#1E2B3C', flex: 1, lineHeight: 1.45 }}>
                        {`Void risk — a ${fdVoidPct}% void allowance has been applied, equivalent to approximately ${Math.round(fdVoidPct / 100 * 52)} weeks vacant per year.`}
                      </Text>
                    </View>
                  )}

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

              {/* Key Assumptions */}
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
                  <View wrap={false} style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, borderTop: `2pt solid ${structureColour}`, marginTop: 10 }}>
                    <Text style={{ fontSize: 7.5, color: tintText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Key Assumptions</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {props.dealType !== 'R2R' && props.dealType !== 'FLIP' ? (
                        <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                          <Text style={{ fontSize: 8, color: tintText }}>Deposit</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{`${props.depositPercent}%`}</Text>
                        </View>
                      ) : null}
                      {props.mortgageRate > 0 && props.dealType !== 'R2R' && props.dealType !== 'FLIP' ? (
                        <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                          <Text style={{ fontSize: 8, color: tintText }}>Mortgage Rate</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{`${props.mortgageRate}%`}</Text>
                        </View>
                      ) : null}
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 8, color: tintText }}>{rentLabel}</Text>
                        <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{rentValue}</Text>
                      </View>
                      {props.taxLabel && props.dealType !== 'R2R' ? (
                        <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingRight: 10, borderBottom: `0.5pt solid ${tintBorder}` }}>
                          <Text style={{ fontSize: 8, color: tintText }}>{props.taxLabel}</Text>
                          <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fc(props.effectiveTax)}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })()}

            </View>
          </View>
        </Page>
      )}

      {/* ── Page 8: Market Evidence ──────────────────────────────────────────── */}
      {hasMarketEvidence && (
        <Page size="A4" orientation="landscape" style={landscapePage}>
          <PageHeader />
          <Footer />
          <SH title="Market Evidence" />

          <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>

            {/* Left column */}
            <View style={{ flex: 1 }}>

              {/* ── Comparable Sales ─────────────────────────────────────────── */}
              {props.comparableSaleTypeUsed && (() => {
                const saleComps = props.comparables.filter(r => r.type === 'sale');
                return (
                  <View style={{ ...notePanel, padding: 0, overflow: 'hidden', marginBottom: 8 }}>
                    <Text style={{ ...notePanelLabel, color: structureColour, padding: 10, paddingBottom: 6 }}>Comparable Sales</Text>
                    {saleComps.length === 0 ? (
                      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#6B7280', paddingHorizontal: 10, paddingBottom: 8 }}>
                        No comparable sales met the quality threshold for inclusion in this report.
                      </Text>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 10, borderBottom: `1.5pt solid ${structureColour}` }}>
                          <Text style={{ flex: 2, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Address</Text>
                          <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Property Type</Text>
                          <Text style={{ flex: 0.5, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Beds</Text>
                          <Text style={{ flex: 0.7, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Floor Area</Text>
                          <Text style={{ flex: 0.9, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>Sale Price</Text>
                          <Text style={{ flex: 0.7, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>Date Sold</Text>
                        </View>
                        {saleComps.map((row, i) => (
                          <View key={i} style={{ flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 10, backgroundColor: i % 2 === 0 ? '#ffffff' : '#f5f7fa' }}>
                            <Text style={{ flex: 2, fontSize: 8, color: '#333333' }}>{formatCompAddress(row.address, row.postcode ?? '')}</Text>
                            <Text style={{ flex: 1, fontSize: 8, color: '#333333' }}>{row.propertyType || '—'}</Text>
                            <Text style={{ flex: 0.5, fontSize: 8, color: '#333333' }}>{row.bedrooms !== '' ? String(row.bedrooms) : '—'}</Text>
                            <Text style={{ flex: 0.7, fontSize: 8, color: '#333333' }}>{row.floorArea !== '' ? `${row.floorArea} m²` : '—'}</Text>
                            <Text style={{ flex: 0.9, fontSize: 8, color: '#333333', textAlign: 'right' }}>{formatCompPrice(row.price)}</Text>
                            <Text style={{ flex: 0.7, fontSize: 8, color: '#333333', textAlign: 'right' }}>{row.date || '—'}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                );
              })()}

              {/* ── Sale price commentary ─────────────────────────────────── */}
              {(() => {
                const saleComps = props.comparables.filter(r => r.type === 'sale');
                const validPrices = saleComps
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
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#64748B', marginTop: 4, marginBottom: 8 }}>
                    {commentary}
                  </Text>
                );
              })()}

              {/* ── Comparable Lettings ───────────────────────────────────── */}
              {props.comparableLetTypeUsed && (() => {
                const letComps = props.comparables.filter(r => r.type === 'let');
                return (
                  <View style={{ ...notePanel, padding: 0, overflow: 'hidden' }}>
                    <Text style={{ ...notePanelLabel, color: structureColour, padding: 10, paddingBottom: 6 }}>Comparable Lettings</Text>
                    {letComps.length === 0 ? (
                      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#6B7280', paddingHorizontal: 10, paddingBottom: 8 }}>
                        No comparable lettings met the quality threshold for inclusion in this report.
                      </Text>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 10, borderBottom: `1.5pt solid ${structureColour}` }}>
                          <Text style={{ flex: 2, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Address</Text>
                          <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Property Type</Text>
                          <Text style={{ flex: 0.5, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Beds</Text>
                          <Text style={{ flex: 0.7, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour }}>Floor Area</Text>
                          <Text style={{ flex: 0.9, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>Monthly Rent</Text>
                          <Text style={{ flex: 0.7, fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textAlign: 'right' }}>Date Let</Text>
                        </View>
                        {letComps.map((row, i) => (
                          <View key={i} style={{ flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 10, backgroundColor: i % 2 === 0 ? '#ffffff' : '#f5f7fa' }}>
                            <Text style={{ flex: 2, fontSize: 8, color: '#333333' }}>{formatCompAddress(row.address, row.postcode ?? '')}</Text>
                            <Text style={{ flex: 1, fontSize: 8, color: '#333333' }}>{row.propertyType || '—'}</Text>
                            <Text style={{ flex: 0.5, fontSize: 8, color: '#333333' }}>{row.bedrooms !== '' ? String(row.bedrooms) : '—'}</Text>
                            <Text style={{ flex: 0.7, fontSize: 8, color: '#333333' }}>{row.floorArea !== '' ? `${row.floorArea} m²` : '—'}</Text>
                            <Text style={{ flex: 0.9, fontSize: 8, color: '#333333', textAlign: 'right' }}>{formatCompPrice(row.price)}</Text>
                            <Text style={{ flex: 0.7, fontSize: 8, color: '#333333', textAlign: 'right' }}>{row.date || '—'}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                );
              })()}

            </View>

            {/* Right column */}
            <View style={{ flex: 1 }}>

              {props.areaAverageYield != null && props.areaAverageYield > 0 && props.dealType !== 'R2R' && props.dealType !== 'FLIP' && (() => {
                const activeGrossYield = activeResults.grossYield;
                const yieldDiff = activeGrossYield - props.areaAverageYield!;
                const areaBar = Math.min(100, props.areaAverageYield! * 8);
                const dealBar = Math.min(100, activeGrossYield * 8);
                const diffColor = yieldDiff >= 0 ? '#16A34A' : '#DC2626';
                return (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Area Yield Context</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: '2.5pt solid #9ca3af', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                        <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>Area Average Yield</Text>
                        <Text style={{ fontSize: 18, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fp(props.areaAverageYield!)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2.5pt solid ${structureColour}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                        <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>This Deal (Gross)</Text>
                        <Text style={{ fontSize: 18, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{fp(activeGrossYield)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: 'white', border: '0.5pt solid #d4dae8', borderTop: `2.5pt solid ${diffColor}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10 }}>
                        <Text style={{ fontSize: 7.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>Premium / Discount</Text>
                        <Text style={{ fontSize: 18, fontFamily: 'DM Sans', fontWeight: 700, color: diffColor }}>{`${yieldDiff >= 0 ? '+' : ''}${fp(Math.abs(yieldDiff))}`}</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 3, paddingVertical: 8, paddingHorizontal: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 7.5, color: '#6B7280', width: 90 }}>Area average</Text>
                        <View style={{ flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 2 }}>
                          <View style={{ width: `${areaBar}%`, height: 6, backgroundColor: '#9ca3af', borderRadius: 2 }} />
                        </View>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', width: 36, textAlign: 'right' }}>{fp(props.areaAverageYield!)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 7.5, color: '#6B7280', width: 90 }}>This deal</Text>
                        <View style={{ flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 2 }}>
                          <View style={{ width: `${dealBar}%`, height: 6, backgroundColor: structureColour, borderRadius: 2 }} />
                        </View>
                        <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', width: 36, textAlign: 'right' }}>{fp(activeGrossYield)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })()}

              {hasLinks && (
                <View style={{ ...notePanel, marginTop: hasComparables ? 8 : 0 }}>
                  <Text style={{ ...notePanelLabel, color: structureColour, marginBottom: 6 }}>
                    {props.listingLinks.filter(r => r.url.trim()).length === 1 ? 'Property Listing' : 'Property Listings'}
                  </Text>
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

            </View>
          </View>
        </Page>
      )}

      {/* ── Photo Pages — 2-up grid, 6 per page ─────────────────────────────── */}
      {photoChunks.map((chunk, chunkIdx) => (
        <Page key={`photos-${chunkIdx}`} size="A4" orientation="landscape" style={landscapePage}>
          <PageHeader />
          <Footer />
          <SH title={chunkIdx === 0 ? 'Property Photos' : 'Property Photos (continued)'} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {chunk.map((src, i) => (
              <View key={i} style={{ width: '48%', height: 200 }}>
                <Image src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 3 }} />
              </View>
            ))}

      {/* ── Floorplan Page ─────────────────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={landscapePage}>
        <PageHeader />
        <Footer />
        <SH title="Floorplan" />
        {props.floorPlanImage ? (
          <View style={{ flex: 1 }} wrap={false}>
            <Image
              src={props.floorPlanImage}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#6B7280' }}>
              Floorplan not yet supplied for this deal.
            </Text>
          </View>
        )}
      </Page>
          </View>
        </Page>
      ))}

      {/* ── Glossary Page ────────────────────────────────────────────────────── */}
      {props.includeGlossary && (
      <Page size="A4" orientation="landscape" style={{ ...landscapePage, paddingTop: 24 }}>
        <PageHeader />
        <Footer />
        <SH title="Glossary" />

        <View style={{ flexDirection: 'row', gap: 0, flex: 1 }}>

          {/* Left column — Yield & Return */}
          <View style={{ flex: 1, paddingRight: 10 }}>

            {(props.dealType === 'BTL' || props.dealType === 'SOCIAL' || props.dealType === 'HMO') && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Yield &amp; Return</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual rent as a percentage of purchase price.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual income minus operating costs divided by purchase price. Mortgage excluded (UK standard).</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash-on-Cash ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual cash flow as a percentage of total cash invested. Includes mortgage payment.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Payback Period</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Years to recover total cash invested from annual cash flow.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Equity on Day One</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Immediate equity created when a property is purchased below market value.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>BMV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Below Market Value. The discount between purchase price and estimated market value.</Text>
              </>
            )}

            {/* Finance & Structure — HMO only */}
            {props.dealType === 'HMO' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Finance &amp; Structure</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Interest-Only Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers interest only. Capital balance remains unchanged throughout the term.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Repayment Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers both interest and capital. Balance reduces to zero over the term.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Loan to Value. Mortgage amount expressed as a percentage of property value.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed: deposit + tax + refurb + other costs.</Text>
              </>
            )}

            {props.dealType === 'SA' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Yield &amp; Return</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual income minus operating costs divided by purchase price. Mortgage excluded (UK standard).</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash-on-Cash ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual cash flow as a percentage of total cash invested. Includes mortgage payment.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Equity on Day One</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Immediate equity created when a property is purchased below market value.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>BMV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Below Market Value. The discount between purchase price and estimated market value.</Text>
              </>
            )}

            {props.dealType === 'BRRR' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Yield &amp; Return</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>BRRR Gross Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Yield calculated on post-refurb value (GDV), not purchase price.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Yield</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual income minus operating costs divided by post-refurb value. Mortgage excluded.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash-on-Cash ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual cash flow as a percentage of cash left in the deal after refinance.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Equity Created</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The uplift in property value above total cost in, realised through refurbishment.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Money Out / Recycled</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>When the refinance loan exceeds total cost in. All capital returned plus a surplus. Cash-on-cash ROI is infinite.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>BRRR Structure</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>GDV (Gross Development Value)</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The estimated market value of the property after refurbishment is complete.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Refinance Loan</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Capital released by remortgaging against the post-refurb value at a set LTV.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Left In</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Capital remaining in the deal after subtracting the refinance loan from total cost in.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Total Cost In</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital deployed into the BRRR: purchase price + tax + refurb + bridging interest + other costs.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Bridging Finance</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Short-term property-secured loan used to fund acquisition and refurbishment before refinancing.</Text>
              </>
            )}

            {props.dealType === 'FLIP' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Project Returns</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Total ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net profit as a percentage of total project cost.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Annualised ROI</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total ROI scaled to a 12-month equivalent based on project length in months.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Profit on Cost</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net profit expressed as a percentage of total costs. Benchmark: 18%+ with planning permission, 25%+ without.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Profit</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Sale proceeds minus all acquisition, build, and selling costs.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>GDV (Gross Development Value)</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The target sale price or estimated open market value after works are complete.</Text>
              </>
            )}

            {props.dealType === 'R2R' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>R2R Income</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Monthly Spread</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The difference between sub-let income collected and rent paid to the landlord. The core R2R profit driver.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Income</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total sub-let rent collected from all rooms at current occupancy.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Monthly Profit</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly income after rent to landlord, management fees, and running costs.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Annual Profit</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Net monthly profit multiplied by 12.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Setup Costs</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>One-off costs to establish the R2R agreement: furniture, deposits, compliance, and fit-out.</Text>
              </>
            )}

          </View>

          {/* Vertical rule */}
          <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

          {/* Centre column — Cash Flow & Expenses + Stress Testing */}
          <View style={{ flex: 1, paddingHorizontal: 10 }}>

            {(props.dealType === 'BTL' || props.dealType === 'SOCIAL' || props.dealType === 'HMO') && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Cash Flow &amp; Expenses</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total rental income before any deductions or void allowance.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Void Allowance</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Estimated cost of vacancy. A 5% void allowance equals approximately 2.5 weeks vacant per year.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Effective Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Gross rent after void allowance deducted.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Operating Income (NOI)</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Effective rent minus all operating costs, excluding mortgage.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Cash Flow</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly surplus after all costs including mortgage payment.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Minimum rent required to cover all costs at the current mortgage rate.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Rent Headroom</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The buffer between contracted rent and break-even rent.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Stress Testing &amp; Resilience</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The minimum rent or revenue required to cover all costs at the current mortgage rate. Cash flow is exactly zero at this level.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Stress Test</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Analysis of deal performance under a higher mortgage rate (+1.5%) and lower rent (-10%), applied independently.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The mortgage rate at which monthly cash flow reaches exactly zero.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Sensitivity Analysis</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Shows the impact on cash flow and ROI of a 10% rent reduction and a 1.5% rate increase independently.</Text>
              </>
            )}

            {props.dealType === 'SA' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>SA Income</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Revenue</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total nightly income before platform fees and running costs. Calculated as: Nightly Rate × (Occupancy % ÷ 100) × 30.42 days.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Platform Fees</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Commission charged by booking platforms such as Airbnb and Booking.com.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Monthly Revenue</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Gross revenue after platform fees deducted.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Occupancy Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Percentage of nights in a month the property is occupied and generating income. DealScore default: 75%.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Cash Flow</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly surplus after all costs including mortgage payment.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Minimum revenue required to cover all costs at the current mortgage rate.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Stress Testing &amp; Resilience</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The minimum rent or revenue required to cover all costs at the current mortgage rate. Cash flow is exactly zero at this level.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Stress Test</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Analysis of deal performance under a higher mortgage rate (+1.5%) and lower revenue (-10%), applied independently.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The mortgage rate at which monthly cash flow reaches exactly zero.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Sensitivity Analysis</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Shows the impact on cash flow and ROI of a 10% revenue reduction and a 1.5% rate increase independently.</Text>
              </>
            )}

            {props.dealType === 'BRRR' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Cash Flow &amp; Expenses</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total rental income before any deductions or void allowance.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Void Allowance</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Estimated cost of vacancy. A 5% void allowance equals approximately 2.5 weeks vacant per year.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Effective Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Gross rent after void allowance deducted.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Operating Income (NOI)</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Effective rent minus all operating costs, excluding mortgage.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Cash Flow</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly surplus after all costs including the refinance mortgage payment.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Stress Testing &amp; Resilience</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Stress Test</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Analysis of deal performance under a higher mortgage rate (+1.5%) and lower rent (-10%), applied independently.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The mortgage rate at which monthly cash flow reaches exactly zero.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Sensitivity Analysis</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Shows the impact on cash flow and ROI of a 10% rent reduction and a 1.5% rate increase independently.</Text>
              </>
            )}

            {props.dealType === 'FLIP' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Project Costs</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Total Cost In</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital deployed: purchase price + tax + refurb + contingency + holding costs + other costs.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Holding Costs</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly financing or carrying costs during the project period.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Selling Costs</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Agent fees and legal costs on sale, expressed as a percentage of GDV.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Contingency</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>A percentage buffer added to refurb costs to absorb unexpected expenses. DealScore default: 10%.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Bridging Finance</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Short-term property-secured loan used to fund acquisition and/or refurbishment.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Stress &amp; Sensitivity</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cost Overrun Risk</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Impact on profit if build costs increase beyond budget. A 10% overrun on a £30k refurb reduces profit by £3,000.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>GDV Sensitivity</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Impact on profit if the achieved sale price is lower than the GDV estimate.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even GDV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The minimum sale price at which the project still makes a profit.</Text>
              </>
            )}

            {props.dealType === 'R2R' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Returns</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>ROI on Setup</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Annual profit as a percentage of total setup costs.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Payback Period</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Number of months to recover setup costs from monthly profit.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Total Upfront</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>All capital needed to begin: setup costs + landlord deposit + first month rent.</Text>

                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Agreement &amp; Risk</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Landlord Agreement</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>The lease or licence between the sourcer and the property owner permitting sub-letting. Term, break clauses, and subletting rights must be clearly documented.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Subletting</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Renting out a property or individual rooms that you yourself rent from the owner.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Occupancy Rate</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Percentage of rooms occupied and generating income. DealScore default: 90%.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Management Fees</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Platform or agent commission charged on gross income collected.</Text>
              </>
            )}

          </View>

          {/* Vertical rule */}
          <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

          {/* Right column — Finance & Structure + Tax, Legal & Verdicts */}
          <View style={{ flex: 1, paddingLeft: 10 }}>

            {/* Finance & Structure — BTL / SOCIAL / SA (standard spacing) */}
            {(props.dealType === 'BTL' || props.dealType === 'SOCIAL' || props.dealType === 'SA') && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Finance &amp; Structure</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Interest-Only Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers interest only. Capital balance remains unchanged throughout the term.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Repayment Mortgage</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly payment covers both interest and capital. Balance reduces to zero over the term.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Loan to Value. Mortgage amount expressed as a percentage of property value.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed: deposit + tax + refurb + other costs.</Text>
              </>
            )}

            {/* HMO — HMO only */}
            {props.dealType === 'HMO' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>HMO</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Profit Per Room</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Monthly cash flow divided equally across all rooms. Key HMO efficiency metric.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>HMO Licence</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Required local authority licence for larger HMOs. Cost is a one-off acquisition cost, not monthly.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Rent</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total room rental income across all rooms at current occupancy rate.</Text>
              </>
            )}

            {props.dealType === 'BRRR' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Tax &amp; Structure</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Loan to Value. Mortgage amount expressed as a percentage of property value.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>LTT / SDLT</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Land Transaction Tax (Wales) or Stamp Duty Land Tax (England &amp; NI).</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed into the deal before refinance.</Text>
              </>
            )}

            {props.dealType === 'FLIP' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Tax &amp; Structure</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>LTT / SDLT</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Land Transaction Tax (Wales) or Stamp Duty Land Tax (England &amp; NI). Government purchase tax on property transactions.</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total capital deployed into the project.</Text>
              </>
            )}

            {props.dealType === 'R2R' && (
              <>
                <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Structure</Text>

                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Total setup costs deployed to establish the agreement.</Text>
              </>
            )}

            {/* Universal terms — all strategies */}
            <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 3, marginTop: 10 }}>Tax, Legal &amp; Verdicts</Text>

            <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Sourcing Fee</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Fee payable to the deal sourcer on legal completion.</Text>

            {(props.dealType !== 'BRRR' && props.dealType !== 'FLIP') && (
              <>
                <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>LTT / SDLT</Text>
                <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Land Transaction Tax (Wales) or Stamp Duty Land Tax (England &amp; NI). Government purchase tax on property transactions.</Text>
              </>
            )}

            <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Deal Score</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Weighted composite score from 1 to 10 across six dimensions: Gross Yield, Net Cash Flow, Capital Growth Potential, Tenant Demand, Deal Structure, and Risk Profile.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Recommended</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Deal meets or exceeds all key thresholds for this strategy. Strong candidate for investor presentation.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Review</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Deal partially meets thresholds. Worth progressing with negotiation or cost review.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Avoid</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Deal falls below minimum thresholds. Not recommended at current numbers.</Text>

          </View>
        </View>
      </Page>
      )}

      {/* ── Formulas & Calculations Page ─────────────────────────────────────── */}
      {props.includeWorkings && (
      <Page size="A4" orientation="landscape" style={{ ...landscapePage, paddingTop: 28 }}>
        <PageHeader />
        <Footer />
        <SH title="Formulas &amp; Calculations" />

        {(props.dealType === 'BTL' || props.dealType === 'HMO' || props.dealType === 'SA' || props.dealType === 'SOCIAL' || props.dealType === 'BRRR') ? (
          <View style={{ flexDirection: 'row', gap: 0, flex: 1 }}>
            {/* Left column — Yield & Return */}
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Yield &amp; Return</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Yield</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Annual rent as a percentage of purchase price.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Annual Rent ÷ Purchase Price) × 100</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Yield</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Income after operating costs divided by purchase price. Mortgage excluded (UK standard).</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Annual Income - Operating Costs) ÷ Purchase Price × 100</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash-on-Cash ROI</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Annual cash flow as a percentage of total cash invested. Includes mortgage.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Annual Cash Flow ÷ Cash Invested) × 100</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Payback Period</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Years to recover invested capital from annual cash flow.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Cash Invested ÷ Annual Cash Flow</Text>

              {props.dealType !== 'BRRR' ? (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Equity on Day One</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Equity when purchased below market value.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Market Value - Purchase Price</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Equity Created</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Equity generated through refurbishment.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Post-Refurb Value - Total Cost In</Text>

                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>BRRR Gross Yield</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Yield calculated on GDV.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Annual Rent ÷ Post-Refurb Value) × 100</Text>
                </>
              )}

              {props.dealType === 'SA' && (
                <>
                  <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6, marginTop: 12 }}>SA Revenue</Text>

                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Revenue</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Nightly rate at target occupancy over an average month.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Nightly Rate × (Occupancy % ÷ 100) × 30.42</Text>

                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Platform Fees</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Commission deducted from gross revenue.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Gross Monthly Revenue × Platform Fee %</Text>

                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Monthly Revenue</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Revenue after platform fees.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Gross Monthly Revenue - Platform Fees</Text>
                </>
              )}
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

            {/* Centre column — Cash Flow & Expenses + Stress Testing */}
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Cash Flow &amp; Expenses</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Effective Rent</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Gross rent after void allowance deducted.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Gross Rent × (1 - Void %)</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Operating Income</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Effective rent minus all operating costs, excluding mortgage.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Effective Rent - Operating Costs</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Cash Flow</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Monthly surplus after all costs including mortgage.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Net Operating Income - Mortgage Payment</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Monthly Mortgage (Interest-Only)</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Monthly interest payment.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Mortgage Amount × Annual Rate %) ÷ 12</Text>

              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6, marginTop: 12 }}>Stress Testing &amp; Resilience</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rent</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Minimum rent to cover all costs at current rate.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Operating Costs + Mortgage Payment</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Rent Headroom</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Buffer before deal becomes cash-flow negative.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Contracted Rent - Break-Even Rent</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Break-Even Rate</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Mortgage rate at which cash flow reaches zero.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Solved from: Rent = Operating Costs + (Mortgage Amount × Rate ÷ 12)</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Sensitivity Analysis</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 2 }}>Performance under rent -10% and rate +1.5% applied independently. See sensitivity table in report.</Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

            {/* Right column — Capital & Structure */}
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Capital &amp; Structure</Text>

              {props.dealType === 'BRRR' ? (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>All capital deployed before refinance.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Purchase Price + Tax + Refurb + Bridging Interest + Other Costs</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Invested</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Total capital deployed into the deal.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Deposit + Tax + Refurb + Other Costs + Sourcing Fee</Text>
                </>
              )}

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>LTV</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Loan to value ratio.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Mortgage Amount ÷ Property Value) × 100</Text>

              {props.dealType === 'BRRR' && (
                <>
                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Refinance Loan</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Capital released on refinance.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Post-Refurb Value × (Refinance % ÷ 100)</Text>

                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cash Left In</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Capital remaining after refinance.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Total Cost In - Refinance Loan</Text>
                </>
              )}

              {props.dealType === 'HMO' && (
                <>
                  <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6, marginTop: 12 }}>HMO</Text>

                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Profit Per Room</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Monthly cash flow divided by number of rooms.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Monthly Cash Flow ÷ Number of Rooms</Text>

                  <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Rent</Text>
                  <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Total room income at current occupancy.</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Rent per Room × Rooms × (Occupancy % ÷ 100)</Text>
                </>
              )}
            </View>
          </View>
        ) : props.dealType === 'FLIP' ? (
          <View style={{ flexDirection: 'row', gap: 0, flex: 1 }}>
            {/* Left column — Project Returns */}
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Project Returns</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Total ROI</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Net profit as a percentage of total cost.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Net Profit ÷ Total Cost In) × 100</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Annualised ROI</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>ROI scaled to a 12-month equivalent.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Total ROI ÷ Project Length in months) × 12</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Profit on Cost</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Net profit as a percentage of total project cost.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Net Profit ÷ Total Cost) × 100</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Profit</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Sale proceeds minus all costs.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Expected Sale Price - Total Cost - Selling Costs</Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

            {/* Centre column — Project Costs + Stress & Sensitivity */}
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Project Costs</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Total Cost In</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>All capital deployed into the project.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Purchase Price + Tax + Refurb + Holding Costs + Other Costs</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Holding Costs</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Finance costs during the project period.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Monthly Holding Cost × Project Length (months)</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Selling Costs</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Agent and legal fees on sale.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Expected Sale Price × Selling Costs %</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Contingency</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Buffer added to refurb costs for unexpected expenses.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Refurb Cost × Contingency %</Text>

              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6, marginTop: 12 }}>Stress &amp; Sensitivity</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Cost Overrun Scenario</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Profit impact if costs increase by 10%.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Net Profit - (Total Cost × 10%)</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>GDV Sensitivity</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Profit impact of a 5% lower sale price.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Net Profit - (Expected Sale Price × 5%)</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Bridging Interest</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Cost of bridging finance during the project.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Purchase Price × LTV %) × (Annual Rate % ÷ 12) × Term (months)</Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

            {/* Right column — empty for FLIP */}
            <View style={{ flex: 1, paddingLeft: 10 }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 0, flex: 1 }}>
            {/* Left column — Income & Spread */}
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Income &amp; Spread</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Gross Monthly Income</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Sub-let income at current occupancy.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Rent per Room × Rooms × (Occupancy % ÷ 100)</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Monthly Spread</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Income minus rent paid to landlord.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Gross Monthly Income - Monthly Rent to Landlord</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Net Monthly Profit</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Profit after all costs.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Gross Monthly Income - Rent to Landlord - Management Fees - Running Costs</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Annual Profit</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Net monthly profit scaled annually.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Net Monthly Profit × 12</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Management Fees</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Platform or agent commission on gross income.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Gross Monthly Income × Management Fee %</Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

            {/* Centre column — Returns & Recovery */}
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 7.5, fontFamily: 'DM Sans', fontWeight: 700, color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Returns &amp; Recovery</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>ROI on Setup</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Annual profit as a percentage of setup costs.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>(Annual Profit ÷ Setup Costs) × 100</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Payback Period</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Months to recover setup costs from monthly profit.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Setup Costs ÷ Net Monthly Profit</Text>

              <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C', marginBottom: 0 }}>Total Upfront</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>All capital needed to begin the agreement.</Text>
              <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#3B82F6', marginBottom: 6 }}>Setup Costs + (Landlord Deposit Months × Monthly Rent) + First Month Rent</Text>
            </View>

            <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

            {/* Right column — empty for R2R */}
            <View style={{ flex: 1, paddingLeft: 10 }} />
          </View>
        )}
      </Page>
      )}

      {/* ── Book a Viewing / Enquiries Page ────────────────────────────────────── */}
      {hasContactPage && (
        <Page size="A4" orientation="landscape" style={landscapePage}>
          <PageHeader />
          <Footer />
          <SH title="Book a Viewing / Enquiries" />
          <View style={{ flex: 1 }}>
            <View style={{ ...notePanel, maxWidth: 380 }}>
              {props.companyName?.trim() ? (
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 100 }}>Company</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.companyName.trim()}</Text>
                </View>
              ) : null}
              {props.preparedBy.name ? (
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 100 }}>Contact Name</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.preparedBy.name}</Text>
                </View>
              ) : null}
              {props.preparedBy.email ? (
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 100 }}>Email</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.preparedBy.email}</Text>
                </View>
              ) : null}
              {props.preparedBy.phone ? (
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 100 }}>Phone</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.preparedBy.phone}</Text>
                </View>
              ) : null}
              {props.whatsappNumber?.trim() ? (
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ fontSize: 8, color: '#6B7280', width: 100 }}>WhatsApp</Text>
                  <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.whatsappNumber.trim()}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Page>
      )}


      {/* ── Legal Page (last) ────────────────────────────────────────────────── */}
      {hasLegal && (
        <Page size="A4" orientation="landscape" style={landscapePage}>
          <PageHeader />
          <Footer />
          <SH title="Legal & Disclosure" />

          <View style={{ flexDirection: 'row', gap: 24, flex: 1 }}>

            {/* Left column — Next Steps */}
            <View style={{ flex: 1 }}>
              {(props.preparedBy.name || props.preparedBy.email) && (
                <View style={{ ...notePanel, marginBottom: 8 }}>
                  <Text style={{ ...notePanelLabel, color: structureColour }}>Next Steps</Text>
                  <Text style={{ ...notePanelText, marginBottom: 6 }}>
                    {`To discuss this opportunity or proceed with an offer, contact ${props.preparedBy.name || 'the deal sourcer'} directly:`}
                  </Text>
                  {props.preparedBy.email ? (
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Email</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.preparedBy.email}</Text>
                    </View>
                  ) : null}
                  {props.preparedBy.phone ? (
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Phone</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.preparedBy.phone}</Text>
                    </View>
                  ) : null}
                  {props.companyName ? (
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Company</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.companyName}</Text>
                    </View>
                  ) : null}
                  {props.offerDeadline ? (
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Offer Deadline</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.offerDeadline}</Text>
                    </View>
                  ) : null}
                  {props.viewingAvailable !== undefined && (
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ fontSize: 8, color: '#6B7280', width: 80 }}>Viewing Available</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'DM Sans', fontWeight: 700, color: '#1E2B3C' }}>{props.viewingAvailable ? 'Yes' : 'No'}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Right column — Sourcing Fee + Payment Terms */}
            <View style={{ flex: 1 }}>
              {props.sourcingFee > 0 && (
                <View style={notePanel}>
                  <Text style={{ ...notePanelLabel, color: '#1B2B4B' }}>Sourcing Fee</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'DM Sans', fontWeight: 700, color: '#1B2B4B', marginBottom: 4 }}>
                    {fc(props.sourcingFee)}
                  </Text>
                  <Text style={notePanelText}>Payable on completion.</Text>
                  {props.sourcingFeeDisclaimer.trim().length > 0 && (
                    <Text style={{ fontSize: 9, fontFamily: 'DM Sans', fontStyle: 'italic', color: '#888888', marginTop: 6, lineHeight: 1.5 }}>
                      {props.sourcingFeeDisclaimer.trim()}
                    </Text>
                  )}
                </View>
              )}
              {props.paymentTerms && props.paymentTerms.trim().length > 0 && (
                <View style={notePanel}>
                  <Text style={{ ...notePanelLabel, fontSize: 8, color: structureColour }}>Payment Terms & Cooling Off Period</Text>
                  <Text style={{ fontSize: 8.5, color: '#1E2B3C', lineHeight: 1.55 }}>{props.paymentTerms.trim()}</Text>
                </View>
              )}
            </View>

          </View>
        </Page>
      )}

    </Document>
  );
}
