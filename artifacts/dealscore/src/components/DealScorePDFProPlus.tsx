import React from 'react';
import { Document, Page, Text, View, Image, Svg, Rect, Circle, Line, Polyline } from '@react-pdf/renderer';
import { DEALSCORE_BRAND } from '@/config/brandConfig';
import type { DealScorePDFProps } from './DealScorePDF';

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
    ['Setup Costs', fc(props.r2rInputs.setupCosts)],
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
    const paybackMonths = r.monthlyProfit > 0 ? Math.ceil(props.r2rInputs.setupCosts / r.monthlyProfit) : 0;
    const paybackStr = paybackMonths > 0 ? `${paybackMonths} months` : 'not applicable at current profit';
    return `Monthly rent to landlord of ${fc(props.r2rInputs.monthlyRentPaid)}, sub-let for ${fc(r.grossMonthlyIncome)}, generating a monthly spread of ${fc(spread)}. After management fees and running costs, monthly profit is ${fc(r.monthlyProfit)}. Setup costs of ${fc(props.r2rInputs.setupCosts)} recover in ${paybackStr}.`;
  }
  const r = props.socialResults;
  const yieldVs = r.grossYield >= 6 ? 'exceeds' : 'falls short of';
  return `At a ${props.depositPercent}% deposit on a ${fc(props.purchasePrice)} purchase, total cash invested is ${fc(r.totalCashInvested)}. Guaranteed lease income of ${fc(props.socialInputs.leaseIncomePerMonth)}/mo over a ${props.socialInputs.leaseLengthYears}-year term produces monthly cash flow of ${fc(r.monthlyCashFlow)}. Gross yield of ${fp(r.grossYield)} ${yieldVs} the 6% benchmark for social housing strategy.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DealScorePDFProPlus(props: DealScorePDFProps) {

  const brand = props.brandColour;
  const coverBg = darkenColour(brand, 0.4);
  const coverBgText = getContrastText(coverBg);
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
  const { line1: coverLine1, line2: coverLine2 } = splitAddressForCover(addressPlain);

  const footerCentreText = isProPlus ? props.companyName.trim() : 'DealScore';

  const heroMetrics = computeHeroMetrics(props);
  const calloutMetrics = computeCalloutMetrics(props);
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
  const p2CiTotal = p2CiDeposit + props.effectiveTax + props.refurbCost + props.otherCosts;

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

  const calloutMetrics3 = calloutMetrics;
  const structureBg = '#F8FAFC';
  const verdictSummary = generateVerdictSummary(props);
  const whatThisMeans = generateWhatThisMeans(props);

  // ── Sub-components ──────────────────────────────────────────────────────────

  const SH = ({ title, mt, mb }: { title: string; mt?: number; mb?: number }) => (
    <View style={{ marginBottom: mb ?? 10, marginTop: mt ?? 0 }}>
      <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: structureColour, marginBottom: 3 }}>{title}</Text>
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
      <Text style={{ fontSize: 8, fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica', color: bold ? '#1B3A6B' : '#333333', textAlign: 'right' }}>{value}</Text>
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
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textAlign: 'center' }}>{footerCentreText}</Text>
      <Text
        style={{ flex: 1, fontSize: 7, color: '#9ca3af', textAlign: 'right' }}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );

  const PageHeader = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 5, borderBottom: '0.5pt solid #E2E8F0' }}>
      <Text style={{ flex: 1, fontSize: 7, color: '#9ca3af' }}>{props.dateStr}</Text>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textAlign: 'center' }}>{footerCentreText}</Text>
      <Text
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`}
        style={{ flex: 1, fontSize: 7, color: '#9ca3af', textAlign: 'right' }}
      />
    </View>
  );

  // ── Landscape page style ────────────────────────────────────────────────────
  const landscapePage = {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingTop: 32,
    paddingBottom: 56,
    paddingHorizontal: 36,
    fontSize: 10,
    color: '#333333',
  };

  // ── Derived for right-panel cover ──────────────────────────────────────────
  // cover style: always "bold" two-panel for ProPlus landscape
  const leftPanelBg = props.tierOverride === 'pro' ? DEALSCORE_BRAND.primaryColour : coverBg;
  const leftPanelText = getContrastText(leftPanelBg);

  return (
    <Document>

      {/* ── Page 1: Landscape Cover ─────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={{ fontFamily: 'Helvetica', backgroundColor: '#ffffff' }}>
        <View style={{ flex: 1, flexDirection: 'row' }}>

          {/* Left panel — dark brand */}
          <View style={{ width: '42%', backgroundColor: leftPanelBg, paddingTop: 36, paddingBottom: 36, paddingHorizontal: 32, flexDirection: 'column', justifyContent: 'space-between' }}>

            {/* Logo / company name */}
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

            {/* Address block */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: coverMuted(leftPanelBg, 0.65), textAlign: 'center', marginBottom: 10, letterSpacing: 0.3 }}>
                {DEAL_LABELS[props.dealType].replace(' Analysis', '').toUpperCase()}
              </Text>
              <View style={{ width: 32, borderBottom: `2pt solid ${isProPlus ? accent : coverMuted(leftPanelBg, 0.4)}`, marginBottom: 12 }} />
              <Text hyphenationCallback={(word: string) => [word]} style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: leftPanelText, textAlign: 'center', lineHeight: 1.35 }}>
                {coverLine1}
              </Text>
              {coverLine2 ? (
                <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: leftPanelText, textAlign: 'center', lineHeight: 1.35 }}>
                  {coverLine2}
                </Text>
              ) : null}
              <Text style={{ fontSize: 9, color: coverMuted(leftPanelBg, 0.5), textAlign: 'center', marginTop: 10 }}>
                {props.dateStr}
              </Text>
            </View>

            {/* Footer line */}
            <View>
              <View style={{ borderBottom: `1pt solid ${isProPlus ? accent : coverMuted(leftPanelBg, 0.25)}`, marginBottom: 10 }} />
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

          {/* Right panel — white */}
          <View style={{ width: '58%', backgroundColor: '#ffffff', paddingTop: 36, paddingBottom: 36, paddingHorizontal: 32, flexDirection: 'column', justifyContent: 'space-between' }}>

            {/* Hero photo or top spacer */}
            {heroPhoto ? (
              <View style={{ height: 140, borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <Image src={heroPhoto} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
              </View>
            ) : <View style={{ height: 8 }} />}

            {/* 3 key metric cards */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {heroMetrics.map(({ label, value }) => (
                <View key={label} style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  border: '0.5pt solid #d4dae8',
                  borderTop: `2.5pt solid ${structureColour}`,
                  borderRadius: 4,
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                }}>
                  <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', lineHeight: 1, marginBottom: 4 }}>{value}</Text>
                  <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Score badge */}
            {props.currentScore !== 'Incomplete' && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: SCORE_TINT[props.currentScore] ?? 'rgba(107,114,128,0.09)',
                borderLeft: `4pt solid ${scoreColor}`,
                borderRadius: 3,
                paddingVertical: 10,
                paddingHorizontal: 14,
                marginBottom: 16,
              }}>
                <View>
                  <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Deal Score</Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1B2B4B' }}>
                    {VERDICT_LABELS[props.currentScore] ?? props.currentScore}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                  <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#1B2B4B', lineHeight: 1 }}>{dealScoreOverall.toFixed(1)}</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>/ 10</Text>
                </View>
              </View>
            )}

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
                marginBottom: 16,
              }}>
                <View>
                  <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#166534', marginBottom: 2 }}>BELOW MARKET VALUE</Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.bmvAmount)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`${props.bmvPercent.toFixed(1)}%`}</Text>
                  <Text style={{ fontSize: 7, color: '#6B7280', marginTop: 2 }}>BMV discount</Text>
                </View>
              </View>
            )}

            {/* Attribute chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {props.propertyType ? (
                <View style={{ borderRadius: 10, border: '0.5pt solid #d4dae8', paddingVertical: 2, paddingHorizontal: 8, backgroundColor: '#f5f7fa' }}>
                  <Text style={{ fontSize: 7.5, color: '#1E2B3C', fontFamily: 'Helvetica-Bold' }}>{props.propertyType}</Text>
                </View>
              ) : null}
              {props.tenure ? (
                <View style={{
                  borderRadius: 10,
                  border: props.tenure === 'Freehold' ? '0.5pt solid #2EC4B6' : '0.5pt solid #fbbf24',
                  paddingVertical: 2, paddingHorizontal: 8,
                  backgroundColor: props.tenure === 'Freehold' ? '#E1F5EE' : '#fef3c7',
                }}>
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: props.tenure === 'Freehold' ? '#0F6E56' : '#92400e' }}>{props.tenure}</Text>
                </View>
              ) : null}
              {props.epcRating ? (
                <View style={{ borderRadius: 10, border: '0.5pt solid #d4dae8', paddingVertical: 2, paddingHorizontal: 8, backgroundColor: '#f5f7fa' }}>
                  <Text style={{ fontSize: 7.5, color: '#1E2B3C', fontFamily: 'Helvetica-Bold' }}>{`${props.epcRating} EPC`}</Text>
                </View>
              ) : null}
              <View style={{ borderRadius: 10, border: `0.5pt solid ${structureColour}`, paddingVertical: 2, paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour }}>{DEAL_LABELS[props.dealType].replace(' Analysis', '')}</Text>
              </View>
            </View>

          </View>
        </View>
      </Page>

      {/* ── Page 2: Deal Inputs + Cash Invested ─────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={landscapePage}>
        <Footer />
        <PageHeader />

        <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>

          {/* Left column — Property Details + Executive Summary */}
          <View style={{ width: '26%' }}>
            <SH title="Property Details" />
            {([
              ...(props.propertyAddress ? [['Address', addressPlain, true] as RowData] : []),
              ['Type', props.propertyType] as RowData,
              ['Tenure', props.tenure] as RowData,
              ...(props.tenure === 'Leasehold' && props.leaseLengthYears > 0
                ? [['Lease Remaining', `${props.leaseLengthYears} yrs`] as RowData] : []),
              ...(props.floorArea ? [['Floor Area', `${props.floorArea} m²`] as RowData] : []),
              ...(props.epcRating ? [['EPC Rating', props.epcRating] as RowData] : []),
              ...(props.constructionDate ? [['Built', props.constructionDate] as RowData] : []),
            ] as RowData[]).map(([label, value, bold], i) => (
              <TableRow key={i} label={label} value={value} bold={bold} alt={i % 2 === 0} />
            ))}

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
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3, paddingBottom: 3, borderBottom: `1pt solid ${structureColour}` }}>
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
                  <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3, paddingBottom: 3, borderBottom: `1pt solid ${structureColour}` }}>
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
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(p2CiDeposit)}</Text>
                    </View>
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 7.5, color: tintText }}>{props.taxLabel}</Text>
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.effectiveTax)}</Text>
                    </View>
                    {props.refurbCost > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Refurb Cost</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.refurbCost)}</Text>
                      </View>
                    )}
                    {props.otherCosts > 0 && (
                      <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>Other Costs</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.otherCosts)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: tintText, textTransform: 'uppercase', letterSpacing: 0.4 }}>TOTAL CASH INVESTED</Text>
                    <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(p2CiTotal)}</Text>
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
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.brrrResults.totalCostIn)}</Text>
                    </View>
                    <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                      <Text style={{ fontSize: 7.5, color: tintText }}>Refinance Proceeds</Text>
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{`(${fc(props.brrrResults.refinanceLoan)})`}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: tintText, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {props.brrrResults.moneyOut ? 'MONEY OUT' : 'CASH LEFT IN DEAL'}
                    </Text>
                    <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>
                      {props.brrrResults.moneyOut ? `${fc(Math.abs(props.brrrResults.cashLeftInDeal))} OUT` : fc(props.brrrResults.cashLeftInDeal)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Setup Costs — R2R */}
            {props.dealType === 'R2R' && (
              <View style={{ marginTop: 14 }}>
                <SH title="Setup Costs" />
                <View style={{ backgroundColor: tintBg, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12, borderTop: `2pt solid ${structureColour}` }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {[
                      ['Rent to Landlord', fc(props.r2rInputs.monthlyRentPaid)],
                      ['Gross Monthly Income', fc(props.r2rResults.grossMonthlyIncome)],
                      ['Monthly Spread', fc(props.r2rResults.grossMonthlyIncome - props.r2rInputs.monthlyRentPaid)],
                      ['Running Costs', fc(props.r2rInputs.monthlyRunningCosts)],
                    ].map(([lbl, val], i) => (
                      <View key={i} style={{ width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5, paddingRight: 8, borderBottom: `0.5pt solid ${tintBorder}` }}>
                        <Text style={{ fontSize: 7.5, color: tintText }}>{lbl}</Text>
                        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{val}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: tintText, textTransform: 'uppercase', letterSpacing: 0.4 }}>TOTAL SETUP COSTS</Text>
                    <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.r2rInputs.setupCosts)}</Text>
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
                        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{val}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: `1pt solid ${tintBorder}` }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: tintText, textTransform: 'uppercase', letterSpacing: 0.4 }}>NET PROFIT</Text>
                    <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(props.flipResults.netProfit)}</Text>
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
                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1B2B4B' }}>
                  {VERDICT_LABELS[props.currentScore] ?? props.currentScore}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                  <Text style={{ fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#1B2B4B', lineHeight: 1 }}>{dealScoreOverall.toFixed(1)}</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>/ 10</Text>
                </View>
              </View>
            )}

            {/* Score breakdown table */}
            {props.currentScore !== 'Incomplete' && (
              <View style={{ marginBottom: 12, borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 4, paddingHorizontal: 6, borderBottom: '0.5pt solid #E5E7EB' }}>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6B7280' }}>DIMENSION</Text>
                  <Text style={{ width: 44, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6B7280', textAlign: 'center' }}>SCORE</Text>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6B7280' }}> </Text>
                </View>
                {dealScoreDims.map((dim, i) => {
                  const barColor = dim.score >= 7 ? '#22C55E' : dim.score >= 4 ? '#F59E0B' : '#EF4444';
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3.5, paddingHorizontal: 6, backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB', borderBottom: i < dealScoreDims.length - 1 ? '0.5pt solid #E5E7EB' : undefined }}>
                      <Text style={{ flex: 1, fontSize: 8, color: '#1E2B3C' }}>{dim.name}</Text>
                      <Text style={{ width: 44, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', textAlign: 'center' }}>{dim.score} / 10</Text>
                      <View style={{ flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 2 }}>
                        <View style={{ width: `${(dim.score / 10) * 100}%`, height: 6, backgroundColor: barColor, borderRadius: 2 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 3 callout metric cards */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {calloutMetrics.map(({ label, value }) => (
                <View key={label} style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  border: '0.5pt solid #d4dae8',
                  borderTop: `2.5pt solid ${structureColour}`,
                  borderRadius: 4,
                  paddingVertical: 8,
                  paddingHorizontal: 7,
                }}>
                  <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{value}</Text>
                </View>
              ))}
            </View>

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
                <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: 'white', lineHeight: 1 }}>
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
                <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour }}>METRIC</Text>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>VALUE</Text>
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
                  <Text style={{ fontSize: 8.5, fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica', color: bold ? '#1B3A6B' : '#333333', textAlign: 'right' }}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Sensitivity Analysis */}
            {props.stressTest && (
              <View style={{ marginBottom: 12 }}>
                <SH title="Sensitivity Analysis" mt={4} />
                <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4 }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 7, borderBottom: `1.5pt solid ${structureColour}` }}>
                    <Text style={{ flex: 1.8, fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour }}>METRIC</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>BASE CASE</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>RENT {'\u221210%'}</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>RATE +1.5%</Text>
                  </View>
                  <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 7, backgroundColor: '#FFFFFF', borderBottom: '0.5pt solid #E5E7EB' }}>
                    <Text style={{ flex: 1.8, fontSize: 8, color: '#1E2B3C' }}>Monthly Cash Flow</Text>
                    {([props.stressTest.baseCashFlow, props.stressTest.rentDownCashFlow, props.stressTest.rateUpCashFlow] as number[]).map((v, i) => (
                      <Text key={i} style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>
                        {fc(v)}
                      </Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 7, backgroundColor: '#F9FAFB' }}>
                    <Text style={{ flex: 1.8, fontSize: 8, color: '#1E2B3C' }}>Cash-on-Cash ROI</Text>
                    {([props.stressTest.baseCoC, props.stressTest.rentDownCoC, props.stressTest.rateUpCoC] as number[]).map((v, i) => (
                      <Text key={i} style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>
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
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Strategy Notes</Text>
                <Text style={{ fontSize: 8, color: '#1E2B3C', lineHeight: 1.5 }}>
                  {props.strategyNotes.trim() || props.executiveSummary.trim()}
                </Text>
              </View>
            ) : null}

            {/* DealScore Pro Plus watermark line */}
            <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 0.5, backgroundColor: '#E5E7EB' }} />
              <Text style={{ fontSize: 7, color: '#9ca3af', fontFamily: 'Helvetica-Oblique' }}>
                {isProPlus ? `${DEALSCORE_BRAND.name} Pro Plus Report` : `${DEALSCORE_BRAND.name} Report`}
              </Text>
              <View style={{ flex: 1, height: 0.5, backgroundColor: '#E5E7EB' }} />
            </View>
          </View>

        </View>
      </Page>

    </Document>
  );
}
