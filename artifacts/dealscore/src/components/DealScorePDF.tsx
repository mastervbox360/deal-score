import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
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
  equityDayOne: number;
  bmvAmount: number;
  bmvPercent: number;
  preparedBy: { name: string; email: string; phone: string };
  logoBase64: string | null;
  brandColour: string;
  logoSize: 'S' | 'M' | 'L';
  coverStyle: 'classic' | 'clean' | 'bold';
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
  strategyNotes: string;
  propertyDescription: string;
  vendorSituation: string;
  comparableProperties: string;
}

const fc = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const fp = (n: number) => n.toFixed(1) + '%';

const SCORE_COLOR: Record<string, string> = {
  Strong: '#16a34a',
  Average: '#d97706',
  Weak: '#dc2626',
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

// ── Comparables formatter ────────────────────────────────────────────────────

function formatComparables(text: string): string {
  let s = text.trim();
  s = s.replace(/ - /g, ' — ');
  s = s.replace(/\b(\d+)\s*[Kk]\b/g, (_, n) => '£' + (parseInt(n, 10) * 1000).toLocaleString('en-GB'));
  s = s.replace(/\b(\d{5,6})\b/g, (_, n) => '£' + parseInt(n, 10).toLocaleString('en-GB'));
  return s;
}

type RowData = [string, string, boolean?];

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
});

export default function DealScorePDF(props: DealScorePDFProps) {
  console.log('[DealScorePDF] props:', props);

  const brand = props.brandColour;
  const coverBg = darkenColour(brand, 0.4);           // darkened brand for cover backgrounds
  const readableBrand = getReadableBrandColour(brand); // brand colour safe as TEXT on white
  const coverBgText = getContrastText(coverBg);        // text colour on darkened cover bg

  const LOGO_H: Record<'S' | 'M' | 'L', number> = { S: 40, M: 70, L: 100 };
  const logoHeight = LOGO_H[props.logoSize];

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
      <View style={{ borderBottom: `1pt solid ${brand}` }} />
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

  // Footer: "DealScore" centre text uses readableBrand (safe on white footer)
  const Footer = () => (
    <View style={base.pageFooter} fixed>
      <Text style={base.footerLeft}>{props.preparedBy.name || ''}</Text>
      <Text style={[base.footerCentre, { color: readableBrand }]}>DealScore</Text>
      <Text
        style={base.footerRight}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} of ${totalPages}  ·  ${props.dateStr}`
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
        [`${props.taxLabel} (${props.taxCountryLabel}, ${props.buyerLabel})`, fc(props.effectiveTax)],
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
      { label: 'Cash Left In', value: props.brrrResults.moneyOut ? 'Money Out' : fc(props.brrrResults.cashLeftInDeal) },
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
      ['Cash Left in Deal', props.brrrResults.moneyOut ? `${fc(Math.abs(props.brrrResults.cashLeftInDeal))} OUT` : fc(props.brrrResults.cashLeftInDeal)],
      ['Equity Created', fc(props.brrrResults.equityCreated)],
      ['Monthly Cash Flow', fc(props.brrrResults.monthlyCashFlow), true],
      ['Annual Cash Flow', fc(props.brrrResults.annualCashFlow)],
      ['Gross Yield (on GDV)', fp(props.brrrResults.grossYield)],
      ['Net Yield', fp(props.brrrResults.netYield)],
      ['Cash-on-Cash ROI', props.brrrResults.moneyOut ? '∞ (money out)' : fp(props.brrrResults.cashOnCashROI), true],
    ];
    if (props.dealType === 'R2R') return [
      ['Gross Monthly Income', fc(props.r2rResults.grossMonthlyIncome)],
      ['Management Fees / mo', fc(props.r2rResults.managementFees)],
      ['Net Monthly Income', fc(props.r2rResults.netMonthlyIncome)],
      ['Monthly Profit', fc(props.r2rResults.monthlyProfit), true],
      ['Annual Profit', fc(props.r2rResults.annualProfit)],
      ['Gross Return on Setup', fp(props.r2rResults.grossYield)],
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

  const notes = [
    { label: 'Why This Strategy?', text: props.strategyNotes.trim(), isComparables: false },
    { label: 'Property Description', text: props.propertyDescription.trim(), isComparables: false },
    { label: 'Vendor Situation', text: props.vendorSituation.trim(), isComparables: false },
    { label: 'Comparable Properties', text: props.comparableProperties.trim(), isComparables: true },
  ].filter((n) => n.text.length > 0);

  const hasNotes = notes.length > 0 || props.sourcingFee > 0;
  const scoreColor = SCORE_COLOR[props.currentScore] ?? '#6b7280';

  const preparedLine = [
    props.preparedBy.name ? `Prepared by ${props.preparedBy.name}` : '',
    props.preparedBy.email,
    props.preparedBy.phone,
  ].filter(Boolean).join(' · ');


  return (
    <Document>

      {/* ── Page 1: Cover ─────────────────────────────────────────────────── */}
      {/* Single unconditional Page — React-PDF requires Page as direct Document child */}
      <Page
        size="A4"
        style={{ fontFamily: 'Helvetica', backgroundColor: props.coverStyle === 'classic' ? coverBg : '#ffffff' }}
      >
        {/* Classic */}
        {props.coverStyle === 'classic' && (
          <View style={{ flex: 1, padding: 40, flexDirection: 'column', justifyContent: 'space-between' }}>
            <View style={{ minHeight: 20 }}>
              {props.logoBase64 ? (
                <Image src={props.logoBase64} style={{ height: logoHeight, maxWidth: 200, objectFit: 'contain', alignSelf: 'center' }} />
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
              <View style={{ borderBottom: '1pt solid rgba(255,255,255,0.2)', marginBottom: 20 }} />
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
        {props.coverStyle === 'clean' && (
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <View style={{ height: 8, backgroundColor: brand }} />
            <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 32, paddingBottom: 40, borderLeft: `4pt solid ${brand}`, justifyContent: 'space-between' }}>
              {props.logoBase64 ? (
                <View>
                  <Image src={props.logoBase64} style={{ height: logoHeight, maxWidth: 200, objectFit: 'contain' }} />
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
              <View>
                <View style={{ borderBottom: `1pt solid ${brand}`, marginBottom: 12 }} />
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
        {props.coverStyle === 'bold' && (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ width: '45%', backgroundColor: coverBg, padding: 40, justifyContent: 'space-between' }}>
              <View>
                {props.logoBase64 ? (
                  <Image src={props.logoBase64} style={{ height: logoHeight, maxWidth: 160, objectFit: 'contain' }} />
                ) : null}
              </View>
              <View>
                <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: coverBgText, marginBottom: 6, lineHeight: 1.4 }}>
                  {DEAL_LABELS[props.dealType]}
                </Text>
                <Text style={{ fontSize: 9, color: coverMuted(coverBg, 0.7) }}>
                  Date Prepared: {props.dateStr}
                </Text>
                <View style={{ borderBottom: `1pt solid ${coverMuted(coverBg, 0.3)}`, marginTop: 20 }} />
              </View>
            </View>
            <View style={{ width: '55%', backgroundColor: '#ffffff', padding: 40, position: 'relative' }}>
              <Text style={{ fontSize: 8, color: '#999999', textAlign: 'right' }}>
                Confidential — Prepared for investor review only
              </Text>
              <View style={{ position: 'absolute', top: 280, left: 40, right: 40, alignItems: 'center' }}>
                {boldLine1 ? (
                  <Text hyphenationCallback={(word) => [word]} style={{ fontSize: 13, color: '#555555', textAlign: 'center', marginBottom: 6 }}>
                    {boldLine1}
                  </Text>
                ) : null}
                {boldLine2 ? (
                  <Text hyphenationCallback={(word) => [word]} style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1A1A1A', textAlign: 'center', lineHeight: 1.3, marginBottom: 6 }}>
                    {boldLine2}
                  </Text>
                ) : null}
                {boldLine3 ? (
                  <Text style={{ fontSize: 13, color: '#555555', textAlign: 'center' }}>
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

      {/* ── Page 2: Property & Financial Summary ──────────────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />

        <SH title="Property Details" />
        {/* FIX 3: EPC Rating row between Property Type and Flood Risk */}
        <Table rows={[
          ...(props.propertyAddress ? [['Address', addressPlain] as RowData] : []),
          ['Property Type', props.propertyType],
          ['Tenure', props.tenure],
          ...(props.tenure === 'Leasehold' && props.leaseLengthYears > 0
            ? [['Remaining Lease', `${props.leaseLengthYears} years`] as RowData] : []),
          ...(props.epcRating ? [['EPC Rating', props.epcRating] as RowData] : []),
          ...(props.floorArea ? [['Floor Area', `${props.floorArea} m²`] as RowData] : []),
          ...(props.constructionDate ? [['Construction Date', props.constructionDate] as RowData] : []),
          ...(props.floodRisk ? [['Flood Risk', props.floodRisk] as RowData] : []),
        ]} />

        <SH title="Financial Summary" />
        <Hero metrics={heroMetrics} />

        {props.bmvAmount > 0 && (
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
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: props.bmvAmount >= 0 ? '#047857' : '#b91c1c' }}>
                {fc(props.bmvAmount)}
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: props.bmvAmount >= 0 ? '#047857' : '#b91c1c' }}>
              {props.bmvPercent.toFixed(1)}%
            </Text>
          </View>
        )}

        <SH title="Deal Inputs" />
        <Table rows={inputRows} />
      </Page>

      {/* ── Page 3: Strategy Analysis & Deal Score ────────────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />

        <SH title={DEAL_LABELS[props.dealType]} />

        {props.currentScore !== 'Incomplete' && (
          <View style={{ marginBottom: 14 }}>
            {/* FIX 2: Deal Score badge — brand bg, contrast text */}
            <View style={{
              backgroundColor: scoreColor,
              borderRadius: 4,
              paddingVertical: 6,
              paddingHorizontal: 16,
              alignSelf: 'flex-start',
            }}>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1 }}>
                {props.currentScore.toUpperCase()} DEAL
              </Text>
            </View>
          </View>
        )}

        <Table rows={resultsRows} />

        {props.riskFlags.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <SH title="Risk Flags" />
            {props.riskFlags.map((flag, i) => (
              <View key={i} style={base.riskFlag}>
                <Text style={base.riskFlagText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* ── Page 4: Deal Notes ────────────────────────────────────────────── */}
      {hasNotes && (
        <Page size="A4" style={base.page}>
          <Footer />
          <SH title="Deal Notes" />

          {notes.map(({ label, text, isComparables }) => (
            <View key={label} style={base.notePanel}>
              {/* FIX 2: note panel label uses readableBrand (safe on white) */}
              <Text style={[base.notePanelLabel, { color: readableBrand }]}>{label}</Text>
              <Text style={base.notePanelText}>
                {isComparables ? formatComparables(text) : text}
              </Text>
            </View>
          ))}

          {props.sourcingFee > 0 && (
            <View style={[base.notePanel, { marginTop: 4 }]}>
              <Text style={[base.notePanelLabel, { color: readableBrand }]}>Sourcing Fee</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: readableBrand, marginBottom: 4 }}>
                {fc(props.sourcingFee)}
              </Text>
              <Text style={base.notePanelText}>Payable on completion.</Text>
            </View>
          )}
        </Page>
      )}

    </Document>
  );
}
