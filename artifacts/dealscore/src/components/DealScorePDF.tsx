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
  tableValueBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  heroRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  heroCard: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    borderRadius: 4,
    padding: 10,
    alignItems: 'center',
    border: '0.5pt solid #d4dae8',
  },
  heroLabel: { fontSize: 7.5, color: '#6b7280', textAlign: 'center', marginTop: 3 },
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
  const brand = props.brandColour;

  const SH = ({ title }: { title: string }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: brand, marginBottom: 4 }}>{title}</Text>
      <View style={{ borderBottom: `1pt solid ${brand}` }} />
    </View>
  );

  const Table = ({ rows }: { rows: RowData[] }) => (
    <View style={{ marginBottom: 14 }}>
      {rows.map(([label, value, bold], i) => (
        <View key={i} style={[base.tableRow, i % 2 === 0 ? base.tableRowAlt : {}]}>
          <Text style={base.tableLabel}>{label}</Text>
          <Text style={bold ? [base.tableValueBold, { color: brand }] : base.tableValue}>{value}</Text>
        </View>
      ))}
    </View>
  );

  const Hero = ({ metrics }: { metrics: { label: string; value: string }[] }) => (
    <View style={base.heroRow}>
      {metrics.map(({ label, value }) => (
        <View key={label} style={base.heroCard}>
          <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: brand, textAlign: 'center' }}>{value}</Text>
          <Text style={base.heroLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );

  const Footer = () => (
    <View style={base.pageFooter} fixed>
      <Text style={base.footerLeft}>{props.preparedBy.name || ''}</Text>
      <Text style={[base.footerCentre, { color: brand }]}>DealScore</Text>
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
    const base: RowData[] = [];
    if (props.dealType === 'BTL') {
      base.push(
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
      base.push(
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
      base.push(
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
      base.push(
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
      base.push(
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
      base.push(
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
      base.push(
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
    if (props.sourcingFee > 0) base.push(['Sourcing Fee', fc(props.sourcingFee), true]);
    return base;
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
    { label: 'Why This Strategy?', text: props.strategyNotes.trim() },
    { label: 'Property Description', text: props.propertyDescription.trim() },
    { label: 'Vendor Situation', text: props.vendorSituation.trim() },
    { label: 'Comparable Properties', text: props.comparableProperties.trim() },
  ].filter((n) => n.text.length > 0);

  const hasNotes = notes.length > 0 || props.sourcingFee > 0;
  const scoreColor = SCORE_COLOR[props.currentScore] ?? '#6b7280';

  const preparedLine = [
    props.preparedBy.name ? `Prepared by  ${props.preparedBy.name}` : '',
    props.preparedBy.email,
    props.preparedBy.phone,
  ].filter(Boolean).join('   ·   ');

  return (
    <Document>

      {/* ── Page 1: Cover ─────────────────────────────────────────────────── */}
      <Page size="A4" style={{ fontFamily: 'Helvetica', backgroundColor: brand }}>
        <View style={{ flex: 1, padding: 40, justifyContent: 'space-between' }}>

          {/* Logo */}
          {props.logoBase64 && (
            <View style={{ marginBottom: 16 }}>
              <Image
                src={props.logoBase64}
                style={{ maxHeight: 80, objectFit: 'contain', alignSelf: 'flex-start' }}
              />
            </View>
          )}

          {/* Centre content */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, textAlign: 'center', marginBottom: 14 }}>
              {DEAL_LABELS[props.dealType].toUpperCase()}
            </Text>
            <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center', lineHeight: 1.3, marginBottom: 14 }}>
              {props.propertyAddress || 'Property Address Not Entered'}
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
              Date Prepared: {props.dateStr}
            </Text>
          </View>

          {/* Rule + prepared by + confidential */}
          <View>
            <View style={{ borderBottom: '1pt solid rgba(255,255,255,0.2)', marginBottom: 20 }} />
            {preparedLine ? (
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.7, marginBottom: 10 }}>
                {preparedLine}
              </Text>
            ) : null}
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              Confidential — Prepared for investor review only
            </Text>
          </View>
        </View>
      </Page>

      {/* ── Page 2: Property & Financial Summary ──────────────────────────── */}
      <Page size="A4" style={base.page}>
        <Footer />

        <SH title="Property Details" />
        <Table rows={[
          ...(props.propertyAddress ? [['Address', props.propertyAddress] as RowData] : []),
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

        {props.marketValue > 0 && (
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

          {notes.map(({ label, text }) => (
            <View key={label} style={base.notePanel}>
              <Text style={[base.notePanelLabel, { color: brand }]}>{label}</Text>
              <Text style={base.notePanelText}>{text}</Text>
            </View>
          ))}

          {props.sourcingFee > 0 && (
            <View style={[base.notePanel, { marginTop: 4 }]}>
              <Text style={[base.notePanelLabel, { color: brand }]}>Sourcing Fee</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: brand }}>{fc(props.sourcingFee)}</Text>
            </View>
          )}
        </Page>
      )}

    </Document>
  );
}
