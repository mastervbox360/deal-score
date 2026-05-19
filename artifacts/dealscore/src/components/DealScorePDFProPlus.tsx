import React from 'react';
import { Document, Page, Text, View, Image, Link, Svg, Rect, Circle, Line, Polyline } from '@react-pdf/renderer';
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

  // ── Rationale / Market / Photo / Legal derived values ─────────────────────
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
  const notePanelLabel = { fontSize: 9, fontFamily: 'Helvetica-Bold' as const, marginBottom: 4 };
  const notePanelText = { fontSize: 9, color: '#444444', lineHeight: 1.5 };

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
              <Text style={{ fontSize: 38, fontFamily: 'Helvetica-Bold', color: '#ffffff', lineHeight: 1 }}>
                {dealScoreOverall.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                {VERDICT_LABELS[props.currentScore] ?? props.currentScore}
              </Text>
            </View>

            {/* Score dimensions table */}
            <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', backgroundColor: structureColour, paddingVertical: 4, paddingHorizontal: 8 }}>
                <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>DIMENSION</Text>
                <Text style={{ width: 40, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' }}>SCORE</Text>
                <Text style={{ width: 44, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' }}>WEIGHT</Text>
                <Text style={{ width: 50, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' }}>CONTRIB</Text>
              </View>
              {dealScoreDims.map((d, i) => (
                <View key={i} style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: i % 2 === 0 ? '#ffffff' : '#F9FAFB', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 8, color: '#555555' }}>{d.name}</Text>
                  <View style={{ width: 40, alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: d.score >= 7 ? '#D1FAE5' : d.score >= 4 ? '#FEF9C3' : '#FEE2E2', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: d.score >= 7 ? '#166534' : d.score >= 4 ? '#854D0E' : '#991B1B' }}>{d.score.toFixed(0)}</Text>
                    </View>
                  </View>
                  <Text style={{ width: 44, fontSize: 8, color: '#6B7280', textAlign: 'right' }}>{`${(d.weight * 100).toFixed(0)}%`}</Text>
                  <Text style={{ width: 50, fontSize: 8, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>{(d.score * d.weight).toFixed(2)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#F0F4FF', borderTop: `1pt solid ${structureColour}` }}>
                <Text style={{ flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour }}>Overall DealScore</Text>
                <Text style={{ width: 40, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: scoreColor, textAlign: 'right' }}>{dealScoreOverall.toFixed(1)}</Text>
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
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>What This Means</Text>
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

            {/* Callout metric cards */}
            <View style={{ gap: 8 }}>
              {calloutMetrics3.map((m, i) => (
                <View key={i} style={{ backgroundColor: '#ffffff', border: `0.5pt solid #E5E7EB`, borderLeft: `3pt solid ${structureColour}`, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 14 }}>
                  <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 }}>{m.label}</Text>
                  <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{m.value}</Text>
                </View>
              ))}
            </View>

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
                  <Text style={{ flex: 1, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>P&L BREAKDOWN</Text>
                  <Text style={{ width: 70, fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' }}>MONTHLY</Text>
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
                    <Text style={{ flex: 1, fontSize: 8, color: bold ? structureColour : indent ? '#6B7280' : '#333333', fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica' }}>{label}</Text>
                    <Text style={{ width: 70, fontSize: 8, fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica', color: value < 0 ? '#DC2626' : bold ? structureColour : '#333333', textAlign: 'right' }}>{fc(value)}</Text>
                  </View>
                ))}
              </View>

              {/* Payback period callout */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, borderTop: `2pt solid ${structureColour}` }}>
                  <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Payback Period</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fdPaybackDisplay}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, borderTop: `2pt solid ${structureColour}` }}>
                  <Text style={{ fontSize: 7, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Annual Cash Flow</Text>
                  <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold', color: activeResults.monthlyCashFlow >= 0 ? '#166534' : '#991B1B' }}>{fc(activeResults.monthlyCashFlow * 12)}</Text>
                </View>
              </View>

              {/* Sensitivity Analysis */}
              {props.stressTest && (
                <View style={{ borderWidth: 0.5, borderColor: '#E5E7EB', borderStyle: 'solid', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 4, paddingHorizontal: 8, borderBottom: `1.5pt solid ${structureColour}` }}>
                    <Text style={{ flex: 1.8, fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour }}>SENSITIVITY</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>BASE CASE</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>RENT {'\u221210%'}</Text>
                    <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: structureColour, textAlign: 'right' }}>RATE +1.5%</Text>
                  </View>
                  <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#ffffff', borderBottom: '0.5pt solid #E5E7EB' }}>
                    <Text style={{ flex: 1.8, fontSize: 8, color: '#1E2B3C' }}>Monthly Cash Flow</Text>
                    {([props.stressTest.baseCashFlow, props.stressTest.rentDownCashFlow, props.stressTest.rateUpCashFlow] as number[]).map((v, i) => (
                      <Text key={i} style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>{fc(v)}</Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F9FAFB' }}>
                    <Text style={{ flex: 1.8, fontSize: 8, color: '#1E2B3C' }}>Cash-on-Cash ROI</Text>
                    {([props.stressTest.baseCoC, props.stressTest.rentDownCoC, props.stressTest.rateUpCoC] as number[]).map((v, i) => (
                      <Text key={i} style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: v < 0 ? '#EF4444' : '#22C55E', textAlign: 'right' }}>{isFinite(v) ? fp(v) : '\u221E'}</Text>
                    ))}
                  </View>
                </View>
              )}

            </View>

            {/* Right — Income Waterfall SVG + key metric cards */}
            <View style={{ flex: 1 }}>

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Income Waterfall</Text>
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
                  { label: 'Eff.Rent', value: effectiveRent, floor: 0, barH: (effectiveRent / grossRent) * barMaxH, color: '#1B3A6B' },
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
                    <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{m.value}</Text>
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
                  <Text style={{ flex: 1.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>METRIC</Text>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' }}>OPTIMISTIC</Text>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' }}>BASE CASE</Text>
                  <Text style={{ flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'right' }}>STRESS</Text>
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
                        <Text key={j} style={{ flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: colored ? stCfColor(s.cf) : '#333333', textAlign: 'right' }}>{val}</Text>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Rent buffer callout cards */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, borderTop: `2pt solid ${structureColour}` }}>
                  <Text style={{ fontSize: 6.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Break-Even Rent</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1E2B3C' }}>{fc(stBreakEvenRent)}</Text>
                  <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 1 }}>/mo minimum</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, borderTop: `2pt solid ${stRentHeadroom >= 0 ? '#16A34A' : '#DC2626'}` }}>
                  <Text style={{ fontSize: 6.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Rent Headroom</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: stRentHeadroom >= 0 ? '#166534' : '#991B1B' }}>{fc(stRentHeadroom)}</Text>
                  <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 1 }}>buffer before loss</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, borderTop: `2pt solid ${stStressCF >= 0 ? '#16A34A' : '#DC2626'}` }}>
                  <Text style={{ fontSize: 6.5, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Stress CF ({stStressRate.toFixed(2)}%)</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: stCfColor(stStressCF) }}>{fc(stStressCF)}</Text>
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

              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Cash Flow vs. Mortgage Rate</Text>
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
                    <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: m.color }}>{m.value}</Text>
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
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Why This Strategy?</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{strategyNotesText}</Text>
                </View>
              ) : null}

              {propertyDescText ? (
                <View wrap={false} style={{ marginBottom: 10, marginTop: strategyNotesText ? 10 : 0 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Property Description</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{propertyDescText}</Text>
                </View>
              ) : null}

              {props.refurbScope?.trim() ? (
                <View wrap={false} style={{ marginBottom: 10, marginTop: 10 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Refurb Scope</Text>
                  <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 6 }} />
                  <Text style={{ fontSize: 8.5, color: '#444444', lineHeight: 1.55 }}>{props.refurbScope}</Text>
                </View>
              ) : null}

              {vendorSituationText && props.dealType !== 'R2R' ? (
                <View wrap={false} style={{ marginBottom: 10, marginTop: 10 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Vendor Situation</Text>
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
                    <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Investment Timeline</Text>
                    <View style={{ height: 1, backgroundColor: structureColour, marginBottom: 10 }} />

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

              {/* Risk Factors */}
              <View wrap={false} style={{ marginBottom: 10, marginTop: 14 }}>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Risk Factors</Text>
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

              {hasComparables && (
                <View style={{ ...notePanel, padding: 0, overflow: 'hidden' }}>
                  <Text style={{ ...notePanelLabel, color: structureColour, padding: 10, paddingBottom: 6 }}>Comparable Properties</Text>
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
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Area Yield Context</Text>
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
          </View>
        </Page>
      ))}

      {/* ── Glossary Page ────────────────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={landscapePage}>
        <PageHeader />
        <Footer />
        <SH title="Glossary" />

        <View style={{ flexDirection: 'row', gap: 0, flex: 1 }}>

          {/* Left column */}
          <View style={{ flex: 1, paddingRight: 16 }}>

            {/* Section 1 — Yield & Return */}
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Yield & Return</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Gross Yield</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Annual rent divided by purchase price.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>(Annual Rent / Purchase Price) × 100</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Net Yield</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Annual income minus operating costs divided by purchase price. Mortgage excluded (UK standard).</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>(Annual Income − Operating Costs) / Purchase Price × 100</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Cash-on-Cash ROI</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Annual cash flow divided by total cash invested. Includes mortgage payment.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>(Annual Cash Flow / Cash Invested) × 100</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Payback Period</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Years to recover invested capital from cash flow.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>Cash Invested / Annual Cash Flow</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Equity on Day One</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Immediate equity if property purchased below market value.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>Market Value − Purchase Price</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>BMV</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Below Market Value. The discount between purchase price and estimated market value.</Text>

            {/* Section 2 — Cash Flow & Expenses */}
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6, marginTop: 12 }}>Cash Flow & Expenses</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Gross Rent</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Total rental income before any deductions or void allowance.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Void Allowance</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Estimated cost of vacancy — periods with no rental income.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Effective Rent</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Gross rent after void allowance deducted.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>Gross Rent × (1 − Void %)</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Net Operating Income (NOI)</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Effective rent minus all operating costs, excluding mortgage.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Net Cash Flow</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Monthly surplus after all costs including mortgage.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>NOI − Mortgage Payment</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Break-Even Rent</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Minimum rent to cover all costs at the current mortgage rate.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Rent Headroom</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Buffer between contracted rent and break-even rent.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>Gross Rent − Break-Even Rent</Text>

          </View>

          {/* Vertical rule */}
          <View style={{ width: 0.5, backgroundColor: '#E5E7EB', marginHorizontal: 0 }} />

          {/* Right column */}
          <View style={{ flex: 1, paddingLeft: 16 }}>

            {/* Section 3 — Stress Testing & Resilience */}
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6 }}>Stress Testing & Resilience</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Break-Even Rent</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>The rent level at which monthly cash flow reaches exactly zero.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Rent Headroom</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>How far rent can fall before the deal becomes cash-flow negative.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Stress Test</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Analysis of deal performance under higher mortgage rates and lower rent scenarios.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Break-Even Rate</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>The mortgage rate at which monthly cash flow reaches zero.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Sensitivity Analysis</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Impact on returns of a 10% rent reduction and a 1.5% rate increase applied independently.</Text>

            {/* Section 4 — Mortgage, Tax & Structure */}
            <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: structureColour, textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 3, borderBottom: `0.5pt solid ${structureColour}`, marginBottom: 6, marginTop: 12 }}>Mortgage, Tax & Structure</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Interest-Only Mortgage</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Monthly payment covers interest only. Capital balance remains unchanged throughout the term.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>LTV</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Loan to Value. Mortgage amount expressed as a percentage of property value.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>Mortgage / Property Value × 100</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>LTT / SDLT</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Land Transaction Tax (Wales) or Stamp Duty Land Tax (England & NI). Government purchase tax on property transactions.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Cash Invested</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 1 }}>Total capital deployed into the deal.</Text>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#3B82F6', marginBottom: 6 }}>Deposit + Tax + Refurb + Other Costs</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Deal Score</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Weighted composite score from 1 to 10 across six dimensions of deal quality.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Sourcing Fee</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>Fee payable to the deal sourcer on legal completion.</Text>

            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1E2B3C', marginBottom: 1 }}>Cash-on-Cash ROI</Text>
            <Text style={{ fontSize: 8, color: '#6B7280', lineHeight: 1.45, marginBottom: 6 }}>The annual return on actual cash invested, after all costs including mortgage.</Text>

          </View>
        </View>
      </Page>

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
            </View>

            {/* Right column — Sourcing Fee */}
            <View style={{ flex: 1 }}>
              {props.sourcingFee > 0 && (
                <View style={notePanel}>
                  <Text style={{ ...notePanelLabel, color: '#1B2B4B' }}>Sourcing Fee</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1B2B4B', marginBottom: 4 }}>
                    {fc(props.sourcingFee)}
                  </Text>
                  <Text style={notePanelText}>Payable on completion.</Text>
                  {props.sourcingFeeDisclaimer.trim().length > 0 && (
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Oblique', color: '#888888', marginTop: 6, lineHeight: 1.5 }}>
                      {props.sourcingFeeDisclaimer.trim()}
                    </Text>
                  )}
                </View>
              )}
            </View>

          </View>
        </Page>
      )}

    </Document>
  );
}
