import React, { useState } from 'react';
import { Building2, Home, Hammer, TrendingUp, Calculator, Download, ChevronDown, BedDouble, RefreshCw, Key, Shield } from 'lucide-react';
import jsPDF from 'jspdf';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateBTL, calculateHMO, calculateFlip, calculateSA, calculateBRRR, calculateR2R, calculateSocialHousing, calculatePropertyTax, TAX_LABEL, COUNTRY_LABEL, BUYER_LABEL, type DealType, type BTLInputs, type HMOInputs, type FlipInputs, type SAInputs, type BRRRInputs, type R2RInputs, type SocialHousingInputs, type Country, type BuyerType } from '@/lib/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function HomePage() {
  const [dealType, setDealType] = useState<DealType>('BTL');

  const [btlInputs, setBtlInputs] = useState<BTLInputs>({
    purchasePrice: 200000,
    stampDuty: 6000,
    refurbCost: 10000,
    otherCosts: 2500,
    depositPercent: 25,
    mortgageRate: 5.5,
    mortgageTerm: 25,
    mortgageType: 'IO',
    monthlyRent: 1200,
    monthlyExpenses: 200
  });

  const [hmoInputs, setHmoInputs] = useState<HMOInputs>({
    purchasePrice: 300000,
    stampDuty: 14000,
    refurbCost: 40000,
    otherCosts: 3000,
    depositPercent: 25,
    mortgageRate: 6.0,
    mortgageTerm: 25,
    mortgageType: 'IO',
    rooms: 5,
    rentPerRoom: 650,
    occupancyRate: 90,
    monthlyExpenses: 800
  });

  const [preparedBy, setPreparedBy] = useState({ name: '', email: '', phone: '' });
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState<string>('Terraced');
  const [tenure, setTenure] = useState<'Freehold' | 'Leasehold'>('Freehold');
  const [leaseLengthYears, setLeaseLengthYears] = useState<number>(125);
  const [sourcingFee, setSourcingFee] = useState<number>(0);
  const [marketValue, setMarketValue] = useState<number>(0);
  const [strategyNotes, setStrategyNotes] = useState<string>('');
  const [propertyDescription, setPropertyDescription] = useState<string>('');
  const [vendorSituation, setVendorSituation] = useState<string>('');
  const [comparableProperties, setComparableProperties] = useState<string>('');
  const [strategyOpen, setStrategyOpen] = useState<boolean>(false);
  const [dealNotesOpen, setDealNotesOpen] = useState<boolean>(false);
  const [taxCountry, setTaxCountry] = useState<Country>('WALES');
  const [buyerType, setBuyerType] = useState<BuyerType>('ADDITIONAL');

  const [flipInputs, setFlipInputs] = useState<FlipInputs>({
    purchasePrice: 150000,
    stampDuty: 4500,
    refurbCost: 35000,
    otherCosts: 2500,
    holdingCostsPerMonth: 800,
    projectLengthMonths: 6,
    expectedSalePrice: 240000,
    sellingCostsPercent: 2.0
  });

  const [saInputs, setSaInputs] = useState<SAInputs>({
    purchasePrice: 200000,
    stampDuty: 0,
    refurbCost: 15000,
    otherCosts: 2500,
    depositPercent: 25,
    mortgageRate: 5.5,
    mortgageTerm: 25,
    mortgageType: 'IO',
    nightlyRate: 120,
    occupancyPercent: 70,
    platformFeesPercent: 15,
    monthlyRunningCosts: 800,
  });

  const [brrrInputs, setBrrrInputs] = useState<BRRRInputs>({
    purchasePrice: 120000,
    stampDuty: 0,
    refurbCost: 30000,
    otherCosts: 2500,
    postRefurbValue: 200000,
    refinancePercent: 75,
    newMortgageRate: 5.5,
    monthlyRent: 950,
    monthlyExpenses: 150,
  });

  const [r2rInputs, setR2rInputs] = useState<R2RInputs>({
    monthlyRentPaid: 800,
    rooms: 5,
    rentPerRoom: 500,
    occupancyRate: 90,
    managementFeesPercent: 10,
    monthlyRunningCosts: 200,
    setupCosts: 8000,
  });

  const [socialInputs, setSocialInputs] = useState<SocialHousingInputs>({
    purchasePrice: 150000,
    stampDuty: 0,
    refurbCost: 5000,
    otherCosts: 2000,
    depositPercent: 25,
    mortgageRate: 5.5,
    mortgageTerm: 25,
    mortgageType: 'IO',
    leaseIncomePerMonth: 950,
    leaseLengthYears: 5,
    managementCostsPerMonth: 50,
  });

  const handleBtlChange = (field: keyof BTLInputs, value: string) => {
    setBtlInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleHmoChange = (field: keyof HMOInputs, value: string) => {
    setHmoInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleFlipChange = (field: keyof FlipInputs, value: string) => {
    setFlipInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleSaChange = (field: keyof SAInputs, value: string) => {
    setSaInputs(prev => ({ ...prev, [field]: field === 'mortgageType' ? value : (Number(value) || 0) }));
  };

  const handleBrrrChange = (field: keyof BRRRInputs, value: string) => {
    setBrrrInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleR2rChange = (field: keyof R2RInputs, value: string) => {
    setR2rInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleSocialChange = (field: keyof SocialHousingInputs, value: string) => {
    setSocialInputs(prev => ({ ...prev, [field]: field === 'mortgageType' ? value : (Number(value) || 0) }));
  };

  const btlTax = calculatePropertyTax(btlInputs.purchasePrice, taxCountry, buyerType);
  const hmoTax = calculatePropertyTax(hmoInputs.purchasePrice, taxCountry, buyerType);
  const flipTax = calculatePropertyTax(flipInputs.purchasePrice, taxCountry, buyerType);
  const saTax = calculatePropertyTax(saInputs.purchasePrice, taxCountry, buyerType);
  const brrrTax = calculatePropertyTax(brrrInputs.purchasePrice, taxCountry, buyerType);

  const socialTax = calculatePropertyTax(socialInputs.purchasePrice, taxCountry, buyerType);

  const btlResults = calculateBTL({ ...btlInputs, stampDuty: btlTax });
  const hmoResults = calculateHMO({ ...hmoInputs, stampDuty: hmoTax });
  const flipResults = calculateFlip({ ...flipInputs, stampDuty: flipTax });
  const saResults = calculateSA({ ...saInputs, stampDuty: saTax });
  const brrrResults = calculateBRRR({ ...brrrInputs, stampDuty: brrrTax });
  const r2rResults = calculateR2R(r2rInputs);
  const socialResults = calculateSocialHousing({ ...socialInputs, stampDuty: socialTax });

  const taxLabel = TAX_LABEL[taxCountry];
  const buyerLabel = BUYER_LABEL[buyerType];

  const currentPurchasePrice =
    dealType === 'BTL' ? btlInputs.purchasePrice :
    dealType === 'HMO' ? hmoInputs.purchasePrice :
    dealType === 'FLIP' ? flipInputs.purchasePrice :
    dealType === 'SA' ? saInputs.purchasePrice :
    dealType === 'SOCIAL' ? socialInputs.purchasePrice :
    dealType === 'R2R' ? 0 :
    brrrInputs.purchasePrice;
  const equityDayOne = marketValue - currentPurchasePrice;
  const bmvAmount = equityDayOne;
  const bmvPercent = marketValue > 0 ? (bmvAmount / marketValue) * 100 : 0;

  const downloadPDF = () => {
    const MARGIN = 14;
    const ROW_H = 5.0;
    const SEC_GAP = 2;
    const FOOTER_H = 11;

    // ── Deal metadata ────────────────────────────────────────────────────────
    const now = new Date();
    const dealLabel =
      dealType === 'BTL' ? 'Buy-to-Let' :
      dealType === 'HMO' ? 'HMO' :
      dealType === 'FLIP' ? 'Flip / Refurb' :
      dealType === 'SA' ? 'Serviced Accommodation' :
      dealType === 'BRRR' ? 'BRRR' :
      dealType === 'R2R' ? 'Rent to Rent' :
      'Social Housing';
    const dd = now.getDate().toString().padStart(2, '0');
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const yy = now.getFullYear().toString().slice(2);
    const dealRef = `${dealType}-${dd}${mm}${yy}`;
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const currentScore =
      dealType === 'BTL' ? btlResults.score :
      dealType === 'HMO' ? hmoResults.score :
      dealType === 'FLIP' ? flipResults.score :
      dealType === 'SA' ? saResults.score :
      dealType === 'BRRR' ? brrrResults.score :
      dealType === 'R2R' ? r2rResults.score :
      socialResults.score;

    // Render to a jsPDF instance; returns final page height in mm
    const doRender = (doc: jsPDF): number => {
    const navy: [number, number, number] = [27, 58, 107];
    const navyPanel: [number, number, number] = [238, 242, 248];
    const white: [number, number, number] = [255, 255, 255];
    const rowAlt: [number, number, number] = [245, 247, 250];
    const pageWidth = doc.internal.pageSize.getWidth();

    // ── Header banner ────────────────────────────────────────────────────────
    const HEADER_H = 48;
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, HEADER_H, 'F');

    // DealScore title (left) + Deal Ref (right)
    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('DealScore', MARGIN, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(185, 205, 230);
    doc.text(dealRef, pageWidth - MARGIN, 9, { align: 'right' });

    // Investor Summary (left) + date (right)
    doc.setFontSize(10);
    doc.setTextColor(185, 205, 230);
    doc.text('Investor Summary', MARGIN, 21);
    doc.text(dateStr, pageWidth - MARGIN, 21, { align: 'right' });

    // Deal type
    doc.setTextColor(220, 230, 245);
    doc.text(dealLabel, MARGIN, 30);

    // Property Type · Tenure
    doc.setFontSize(9);
    doc.setTextColor(165, 185, 215);
    doc.text(`${propertyType}  ·  ${tenure}`, MARGIN, 38);

    // Thin white rule at bottom of banner
    doc.setDrawColor(...white);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, HEADER_H - 2, pageWidth - MARGIN, HEADER_H - 2);

    // ── Address strip ────────────────────────────────────────────────────────
    let y = HEADER_H + 5;
    if (propertyAddress.trim()) {
      const addrLines = doc.splitTextToSize(propertyAddress.trim(), pageWidth - 28) as string[];
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      addrLines.forEach((line: string) => {
        doc.text(line, MARGIN, y);
        y += 5;
      });
      y += 1;
    }

    // ── Deal Score pill ──────────────────────────────────────────────────────
    const scoreColors: Record<string, [number, number, number]> = {
      Strong: [22, 163, 74],
      Average: [217, 119, 6],
      Weak: [220, 38, 38],
    };
    if (currentScore !== 'Incomplete') {
      const bg = scoreColors[currentScore] ?? ([100, 100, 100] as [number, number, number]);
      const pillText = `${currentScore} Deal`.toUpperCase();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const textW = doc.getTextWidth(pillText);
      const pillW = textW + 9;
      const pillH = 6;
      const pillX = pageWidth - MARGIN - pillW;
      const pillY = y - 4.5;
      doc.setFillColor(...bg);
      doc.roundedRect(pillX, pillY, pillW, pillH, 2.5, 2.5, 'F');
      doc.setTextColor(...white);
      doc.text(pillText, pillX + pillW / 2, pillY + 4, { align: 'center' });
      y += 4;
    }

    // ── Hero metrics strip ───────────────────────────────────────────────────
    type HeroMetric = { label: string; value: string };
    const bmvHero: HeroMetric | null = marketValue > 0
      ? { label: 'BMV', value: `${formatCurrency(bmvAmount)}  (${bmvPercent.toFixed(1)}%)` }
      : null;
    let heroMetrics: HeroMetric[];
    if (dealType === 'BTL') {
      heroMetrics = [
        { label: 'Monthly Cash Flow', value: formatCurrency(btlResults.monthlyCashFlow) },
        { label: 'Gross Yield', value: formatPercent(btlResults.grossYield) },
        ...(bmvHero ? [bmvHero] : []),
      ];
    } else if (dealType === 'HMO') {
      heroMetrics = [
        { label: 'Monthly Cash Flow', value: formatCurrency(hmoResults.monthlyCashFlow) },
        { label: 'Gross Yield', value: formatPercent(hmoResults.grossYield) },
        ...(bmvHero ? [bmvHero] : []),
      ];
    } else if (dealType === 'FLIP') {
      heroMetrics = [
        { label: 'Net Profit', value: formatCurrency(flipResults.netProfit) },
        { label: 'Total ROI', value: formatPercent(flipResults.roi) },
        { label: 'GDV', value: formatCurrency(flipInputs.expectedSalePrice) },
      ];
    } else if (dealType === 'SA') {
      heroMetrics = [
        { label: 'Monthly Cash Flow', value: formatCurrency(saResults.monthlyCashFlow) },
        { label: 'Net Yield', value: formatPercent(saResults.netYield) },
        { label: 'Occupancy Income', value: formatCurrency(saResults.grossMonthlyRevenue) },
      ];
    } else if (dealType === 'BRRR') {
      heroMetrics = [
        { label: 'Monthly Cash Flow', value: formatCurrency(brrrResults.monthlyCashFlow) },
        { label: 'Cash Left In', value: brrrResults.moneyOut ? 'Money Out' : formatCurrency(brrrResults.cashLeftInDeal) },
        { label: 'Cash-on-Cash ROI', value: brrrResults.moneyOut ? '∞' : formatPercent(brrrResults.cashOnCashROI) },
      ];
    } else if (dealType === 'R2R') {
      heroMetrics = [
        { label: 'Monthly Profit', value: formatCurrency(r2rResults.monthlyProfit) },
        { label: 'Annual Profit', value: formatCurrency(r2rResults.annualProfit) },
        { label: 'ROI on Setup', value: formatPercent(r2rResults.roi) },
      ];
    } else {
      heroMetrics = [
        { label: 'Monthly Cash Flow', value: formatCurrency(socialResults.monthlyCashFlow) },
        { label: 'Gross Yield', value: formatPercent(socialResults.grossYield) },
        ...(bmvHero ? [bmvHero] : []),
      ];
    }
    const heroCardH = 17;
    const heroGap = 3;
    const cardCount = heroMetrics.length;
    const heroW = (pageWidth - 2 * MARGIN - (cardCount - 1) * heroGap) / cardCount;
    y += 3;
    heroMetrics.forEach(({ label, value }, i) => {
      const hx = MARGIN + i * (heroW + heroGap);
      const hy = y;
      doc.setFillColor(...rowAlt);
      doc.setDrawColor(210, 218, 232);
      doc.setLineWidth(0.3);
      doc.roundedRect(hx, hy, heroW, heroCardH, 2, 2, 'FD');
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(value, hx + heroW / 2, hy + 10, { align: 'center' });
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 120, 140);
      doc.text(label, hx + heroW / 2, hy + 15, { align: 'center' });
    });
    y += heroCardH + 4;

    // ── Section renderer (with alternating row backgrounds) ──────────────────
    type PDFRow = [string, string] | [string, string, boolean];

    const writeSection = (title: string, rows: PDFRow[]) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(title, MARGIN, y);
      y += 1.5;
      doc.setDrawColor(...navy);
      doc.setLineWidth(0.4);
      doc.line(MARGIN, y, pageWidth - MARGIN, y);
      y += 3.5;

      rows.forEach((row, idx) => {
        const label = row[0];
        const value = row[1];
        const isBold = row.length === 3 ? row[2] : false;
        doc.setFontSize(9);

        if (idx % 2 === 0) {
          doc.setFillColor(...rowAlt);
          doc.rect(MARGIN, y - ROW_H + 0.8, pageWidth - 2 * MARGIN, ROW_H + 0.4, 'F');
        }

        doc.setTextColor(60, 65, 75);
        doc.setFont('helvetica', 'normal');
        doc.text(label, MARGIN + 1.5, y);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(isBold ? navy[0] : 60, isBold ? navy[1] : 65, isBold ? navy[2] : 75);
        doc.text(value, pageWidth - MARGIN - 1.5, y, { align: 'right' });
        y += ROW_H;
      });
      y += SEC_GAP;
    };

    const tenureRows: PDFRow[] = [
      ['Tenure', tenure],
      ...(tenure === 'Leasehold' ? [['Remaining Lease Length', `${leaseLengthYears} years`] as PDFRow] : []),
    ];

    if (dealType === 'BTL') {
      writeSection('Inputs', [
        ['Purchase Price', formatCurrency(btlInputs.purchasePrice)],
        [`${taxLabel} (${COUNTRY_LABEL[taxCountry]}, ${buyerLabel})`, formatCurrency(btlTax)],
        ['Refurb Cost', formatCurrency(btlInputs.refurbCost)],
        ['Other Costs', formatCurrency(btlInputs.otherCosts)],
        ['Deposit', `${btlInputs.depositPercent}%`],
        ['Mortgage Rate', `${btlInputs.mortgageRate}%`],
        ['Mortgage Type', btlInputs.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ...(btlInputs.mortgageType === 'REPAYMENT' ? [['Mortgage Term', `${btlInputs.mortgageTerm} years`] as PDFRow] : []),
        ['Monthly Rent', formatCurrency(btlInputs.monthlyRent)],
        ['Monthly Expenses', formatCurrency(btlInputs.monthlyExpenses)],
        ...tenureRows,
      ]);
      writeSection('Results', [
        ['Cash Invested', formatCurrency(btlResults.totalCashInvested)],
        ['Mortgage Amount', formatCurrency(btlResults.mortgageAmount)],
        ['Monthly Cash Flow', formatCurrency(btlResults.monthlyCashFlow), true],
        ['Annual Cash Flow', formatCurrency(btlResults.annualCashFlow)],
        ['Gross Yield', formatPercent(btlResults.grossYield)],
        ['Net Yield', formatPercent(btlResults.netYield)],
        ['Cash-on-Cash ROI', formatPercent(btlResults.cashOnCashROI), true],
        ...(marketValue > 0 ? [
          ['Market Value', formatCurrency(marketValue)] as PDFRow,
          ['Equity on Day One', formatCurrency(equityDayOne)] as PDFRow,
          ['BMV (Below Market Value)', `${formatCurrency(bmvAmount)}  (${bmvPercent.toFixed(1)}%)`, true] as PDFRow,
        ] : []),
      ]);
    } else if (dealType === 'HMO') {
      writeSection('Inputs', [
        ['Purchase Price', formatCurrency(hmoInputs.purchasePrice)],
        [`${taxLabel} (${COUNTRY_LABEL[taxCountry]}, ${buyerLabel})`, formatCurrency(hmoTax)],
        ['Refurb / Conversion Cost', formatCurrency(hmoInputs.refurbCost)],
        ['Other Costs', formatCurrency(hmoInputs.otherCosts)],
        ['Deposit', `${hmoInputs.depositPercent}%`],
        ['Mortgage Rate', `${hmoInputs.mortgageRate}%`],
        ['Mortgage Type', hmoInputs.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ...(hmoInputs.mortgageType === 'REPAYMENT' ? [['Mortgage Term', `${hmoInputs.mortgageTerm} years`] as PDFRow] : []),
        ['Rooms', `${hmoInputs.rooms}`],
        ['Rent per Room (monthly)', formatCurrency(hmoInputs.rentPerRoom)],
        ['Occupancy Rate', `${hmoInputs.occupancyRate}%`],
        ['Monthly Expenses', formatCurrency(hmoInputs.monthlyExpenses)],
        ...tenureRows,
      ]);
      writeSection('Results', [
        ['Cash Invested', formatCurrency(hmoResults.totalCashInvested)],
        ['Gross Monthly Rent', formatCurrency(hmoResults.grossMonthlyRent)],
        ['Monthly Cash Flow', formatCurrency(hmoResults.monthlyCashFlow), true],
        ['Annual Cash Flow', formatCurrency(hmoResults.annualCashFlow)],
        ['Gross Yield', formatPercent(hmoResults.grossYield)],
        ['Net Yield', formatPercent(hmoResults.netYield)],
        ['Cash-on-Cash ROI', formatPercent(hmoResults.cashOnCashROI), true],
        ...(marketValue > 0 ? [
          ['Market Value', formatCurrency(marketValue)] as PDFRow,
          ['Equity on Day One', formatCurrency(equityDayOne)] as PDFRow,
          ['BMV (Below Market Value)', `${formatCurrency(bmvAmount)}  (${bmvPercent.toFixed(1)}%)`, true] as PDFRow,
        ] : []),
      ]);
    } else if (dealType === 'FLIP') {
      writeSection('Inputs', [
        ['Purchase Price', formatCurrency(flipInputs.purchasePrice)],
        [`${taxLabel} (${COUNTRY_LABEL[taxCountry]}, ${buyerLabel})`, formatCurrency(flipTax)],
        ['Refurb Cost', formatCurrency(flipInputs.refurbCost)],
        ['Other Costs', formatCurrency(flipInputs.otherCosts)],
        ['Holding Costs (per month)', formatCurrency(flipInputs.holdingCostsPerMonth)],
        ['Project Length', `${flipInputs.projectLengthMonths} months`],
        ['Expected Sale Price (GDV)', formatCurrency(flipInputs.expectedSalePrice)],
        ['Selling Costs', `${flipInputs.sellingCostsPercent}%`],
        ...tenureRows,
      ]);
      writeSection('Results', [
        ['Total Cost', formatCurrency(flipResults.totalCost)],
        ['Selling Costs', formatCurrency(flipResults.sellingCosts)],
        ['Net Profit', formatCurrency(flipResults.netProfit), true],
        ['Profit per Month', formatCurrency(flipResults.profitPerMonth)],
        ['Total ROI', formatPercent(flipResults.roi), true],
        ['Annualised ROI', formatPercent(flipResults.annualisedROI)],
        ...(marketValue > 0 ? [
          ['Market Value', formatCurrency(marketValue)] as PDFRow,
          ['Equity on Day One', formatCurrency(equityDayOne)] as PDFRow,
          ['BMV (Below Market Value)', `${formatCurrency(bmvAmount)}  (${bmvPercent.toFixed(1)}%)`, true] as PDFRow,
        ] : []),
      ]);
    } else if (dealType === 'SA') {
      writeSection('Inputs', [
        ['Purchase Price', formatCurrency(saInputs.purchasePrice)],
        [`${taxLabel} (${COUNTRY_LABEL[taxCountry]}, ${buyerLabel})`, formatCurrency(saTax)],
        ['Refurb Cost', formatCurrency(saInputs.refurbCost)],
        ['Other Costs', formatCurrency(saInputs.otherCosts)],
        ['Deposit', `${saInputs.depositPercent}%`],
        ['Mortgage Rate', `${saInputs.mortgageRate}%`],
        ['Mortgage Type', saInputs.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ...(saInputs.mortgageType === 'REPAYMENT' ? [['Mortgage Term', `${saInputs.mortgageTerm} years`] as PDFRow] : []),
        ['Nightly Rate', formatCurrency(saInputs.nightlyRate)],
        ['Avg Occupancy', `${saInputs.occupancyPercent}%`],
        ['Platform Fees', `${saInputs.platformFeesPercent}%`],
        ['Monthly Running Costs', formatCurrency(saInputs.monthlyRunningCosts)],
        ...tenureRows,
      ]);
      writeSection('Results', [
        ['Cash Invested', formatCurrency(saResults.totalCashInvested)],
        ['Mortgage Amount', formatCurrency(saResults.mortgageAmount)],
        ['Gross Monthly Revenue', formatCurrency(saResults.grossMonthlyRevenue)],
        ['Platform Fees/mo', formatCurrency(saResults.platformFees)],
        ['Net Monthly Revenue', formatCurrency(saResults.netMonthlyRevenue)],
        ['Monthly Mortgage', formatCurrency(saResults.monthlyMortgage)],
        ['Monthly Cash Flow', formatCurrency(saResults.monthlyCashFlow), true],
        ['Annual Cash Flow', formatCurrency(saResults.annualCashFlow)],
        ['Gross Yield', formatPercent(saResults.grossYield)],
        ['Net Yield', formatPercent(saResults.netYield)],
        ['Cash-on-Cash ROI', formatPercent(saResults.cashOnCashROI), true],
        ...(marketValue > 0 ? [
          ['Market Value', formatCurrency(marketValue)] as PDFRow,
          ['Equity on Day One', formatCurrency(equityDayOne)] as PDFRow,
          ['BMV (Below Market Value)', `${formatCurrency(bmvAmount)}  (${bmvPercent.toFixed(1)}%)`, true] as PDFRow,
        ] : []),
      ]);
    } else if (dealType === 'BRRR') {
      writeSection('Inputs', [
        ['Purchase Price', formatCurrency(brrrInputs.purchasePrice)],
        [`${taxLabel} (${COUNTRY_LABEL[taxCountry]}, ${buyerLabel})`, formatCurrency(brrrTax)],
        ['Refurb Cost', formatCurrency(brrrInputs.refurbCost)],
        ['Other Costs', formatCurrency(brrrInputs.otherCosts)],
        ['Post-Refurb Value (GDV)', formatCurrency(brrrInputs.postRefurbValue)],
        ['Refinance %', `${brrrInputs.refinancePercent}%`],
        ['New Mortgage Rate', `${brrrInputs.newMortgageRate}%`],
        ['Monthly Rent', formatCurrency(brrrInputs.monthlyRent)],
        ['Monthly Expenses', formatCurrency(brrrInputs.monthlyExpenses)],
        ...tenureRows,
      ]);
      writeSection('Results', [
        ['Total Cost In', formatCurrency(brrrResults.totalCostIn)],
        ['Refinance Loan', formatCurrency(brrrResults.refinanceLoan)],
        ['Cash Left in Deal', brrrResults.moneyOut ? `${formatCurrency(Math.abs(brrrResults.cashLeftInDeal))} OUT` : formatCurrency(brrrResults.cashLeftInDeal)],
        ['Equity Created', formatCurrency(brrrResults.equityCreated)],
        ['Monthly Cash Flow', formatCurrency(brrrResults.monthlyCashFlow), true],
        ['Annual Cash Flow', formatCurrency(brrrResults.annualCashFlow)],
        ['Gross Yield', formatPercent(brrrResults.grossYield)],
        ['Net Yield', formatPercent(brrrResults.netYield)],
        ['Cash-on-Cash ROI', brrrResults.moneyOut ? '∞ (money out)' : formatPercent(brrrResults.cashOnCashROI), true],
        ...(marketValue > 0 ? [
          ['Market Value', formatCurrency(marketValue)] as PDFRow,
          ['Equity on Day One', formatCurrency(equityDayOne)] as PDFRow,
          ['BMV (Below Market Value)', `${formatCurrency(bmvAmount)}  (${bmvPercent.toFixed(1)}%)`, true] as PDFRow,
        ] : []),
      ]);
    } else if (dealType === 'R2R') {
      writeSection('Inputs', [
        ['Monthly Rent to Landlord', formatCurrency(r2rInputs.monthlyRentPaid)],
        ['Rooms', `${r2rInputs.rooms}`],
        ['Rent per Room (monthly)', formatCurrency(r2rInputs.rentPerRoom)],
        ['Occupancy Rate', `${r2rInputs.occupancyRate}%`],
        ['Management / Platform Fees', `${r2rInputs.managementFeesPercent}%`],
        ['Monthly Running Costs', formatCurrency(r2rInputs.monthlyRunningCosts)],
        ['Setup Costs', formatCurrency(r2rInputs.setupCosts)],
        ...tenureRows,
      ]);
      writeSection('Results', [
        ['Gross Monthly Income', formatCurrency(r2rResults.grossMonthlyIncome)],
        ['Management Fees/mo', formatCurrency(r2rResults.managementFees)],
        ['Net Monthly Income', formatCurrency(r2rResults.netMonthlyIncome)],
        ['Monthly Profit', formatCurrency(r2rResults.monthlyProfit), true],
        ['Annual Profit', formatCurrency(r2rResults.annualProfit)],
        ['Gross Return on Setup', formatPercent(r2rResults.grossYield)],
        ['Net ROI on Setup Costs', formatPercent(r2rResults.roi), true],
      ]);
    } else {
      writeSection('Inputs', [
        ['Purchase Price', formatCurrency(socialInputs.purchasePrice)],
        [`${taxLabel} (${COUNTRY_LABEL[taxCountry]}, ${buyerLabel})`, formatCurrency(socialTax)],
        ['Refurb Cost', formatCurrency(socialInputs.refurbCost)],
        ['Other Costs', formatCurrency(socialInputs.otherCosts)],
        ['Deposit', `${socialInputs.depositPercent}%`],
        ['Mortgage Rate', `${socialInputs.mortgageRate}%`],
        ['Mortgage Type', socialInputs.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ...(socialInputs.mortgageType === 'REPAYMENT' ? [['Mortgage Term', `${socialInputs.mortgageTerm} years`] as PDFRow] : []),
        ['Guaranteed Lease Income/mo', formatCurrency(socialInputs.leaseIncomePerMonth)],
        ['Lease Length', `${socialInputs.leaseLengthYears} years`],
        ['Management Costs/mo', formatCurrency(socialInputs.managementCostsPerMonth)],
        ...tenureRows,
      ]);
      writeSection('Results', [
        ['Cash Invested', formatCurrency(socialResults.totalCashInvested)],
        ['Mortgage Amount', formatCurrency(socialResults.mortgageAmount)],
        ['Monthly Mortgage', formatCurrency(socialResults.monthlyMortgage)],
        ['Monthly Cash Flow', formatCurrency(socialResults.monthlyCashFlow), true],
        ['Annual Cash Flow', formatCurrency(socialResults.annualCashFlow)],
        ['Gross Yield', formatPercent(socialResults.grossYield)],
        ['Net Yield', formatPercent(socialResults.netYield)],
        ['Cash-on-Cash ROI', formatPercent(socialResults.cashOnCashROI), true],
        ...(marketValue > 0 ? [
          ['Market Value', formatCurrency(marketValue)] as PDFRow,
          ['Equity on Day One', formatCurrency(equityDayOne)] as PDFRow,
          ['BMV (Below Market Value)', `${formatCurrency(bmvAmount)}  (${bmvPercent.toFixed(1)}%)`, true] as PDFRow,
        ] : []),
      ]);
    }

    // ── Sourcing Fee ─────────────────────────────────────────────────────────
    if (sourcingFee > 0) {
      doc.setDrawColor(...navy);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y - 1, pageWidth - MARGIN, y - 1);
      y += 2;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text('Sourcing Fee', MARGIN + 1.5, y);
      doc.text(formatCurrency(sourcingFee), pageWidth - MARGIN - 1.5, y, { align: 'right' });
      y += ROW_H + SEC_GAP;
    }

    // ── Deal Notes ───────────────────────────────────────────────────────────
    const allNotes: Array<{ label: string; text: string }> = [
      { label: 'Why This Strategy?', text: strategyNotes.trim() },
      { label: 'Property Description', text: propertyDescription.trim() },
      { label: 'Vendor Situation', text: vendorSituation.trim() },
      { label: 'Comparable Properties', text: comparableProperties.trim() },
    ].filter((n) => n.text.length > 0);

    if (allNotes.length) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text('Deal Notes', MARGIN, y);
      y += 1.5;
      doc.setDrawColor(...navy);
      doc.setLineWidth(0.4);
      doc.line(MARGIN, y, pageWidth - MARGIN, y);
      y += 9;

      // All subsections get the same subtle grey (#F5F7FA) panel
      const noteGrey: [number, number, number] = [245, 247, 250];
      const paddingTop = 2;
      const paddingBottom = 4;

      allNotes.forEach(({ label, text }) => {
        const lines = doc.splitTextToSize(text, pageWidth - 30) as string[];
        const panelH = paddingTop + ROW_H + lines.length * ROW_H + paddingBottom;
        const panelY = y - ROW_H + 0.5 - paddingTop;
        doc.setFillColor(...noteGrey);
        doc.rect(MARGIN, panelY, pageWidth - 2 * MARGIN, panelH, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...navy);
        doc.text(`${label}:`, MARGIN + 1.5, y);
        y += ROW_H;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 65, 75);
        lines.forEach((line: string) => { doc.text(line, MARGIN + 1.5, y); y += ROW_H; });
        y += paddingBottom + 2;
      });
    }

    // ── Footer strip ─────────────────────────────────────────────────────────
    const FOOTER_Y = y + 6;
    doc.setFillColor(...navy);
    doc.rect(0, FOOTER_Y, pageWidth, FOOTER_H, 'F');
    const preparedParts = [
      preparedBy.name ? `Prepared by  ${preparedBy.name}` : '',
      preparedBy.email,
      preparedBy.phone,
    ].filter(Boolean).join('  ·  ');
    if (preparedParts) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...white);
      doc.text(preparedParts, MARGIN, FOOTER_Y + 7);
    }
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(185, 205, 230);
    doc.text('For informational purposes only. Not financial advice.', pageWidth - MARGIN, FOOTER_Y + 7, { align: 'right' });

    return FOOTER_Y + FOOTER_H;
    }; // end doRender

    // Two-pass render: measure height with A4, then render at exact size
    const tmpDoc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const finalH = doRender(tmpDoc);
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [210, finalH] });
    doRender(doc);

    doc.save(`DealScore-${dealLabel.replace(/[\s/]+/g, '-')}-${now.toISOString().slice(0, 10)}.pdf`);
  };

  const renderScoreBadge = (score: string) => {
    if (score === 'Incomplete') return null;
    
    const colors = {
      Strong: 'bg-emerald-500 text-white',
      Average: 'bg-amber-500 text-white',
      Weak: 'bg-red-500 text-white'
    };

    return (
      <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${colors[score as keyof typeof colors]}`}>
        {score} DEAL
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5F7FA' }}>
      <header className="text-primary-foreground py-6 shadow-md" style={{ backgroundColor: '#1B3A6B' }}>
        <div className="container max-w-5xl mx-auto px-4 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">DealScore</h1>
            <p className="text-primary-foreground/80 text-sm">Professional property deal analyser</p>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 mt-8">
        <div className="mb-8">
          <Tabs value={dealType} onValueChange={(v) => setDealType(v as DealType)} className="w-full">
            <TabsList className="w-full grid grid-cols-7 h-12 bg-white border border-border rounded-xl p-1 shadow-sm">
              <TabsTrigger value="BTL" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Home className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">BTL</span>
              </TabsTrigger>
              <TabsTrigger value="HMO" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Building2 className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">HMO</span>
              </TabsTrigger>
              <TabsTrigger value="FLIP" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Hammer className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">Flip</span>
              </TabsTrigger>
              <TabsTrigger value="SA" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <BedDouble className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">SA</span>
              </TabsTrigger>
              <TabsTrigger value="BRRR" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <RefreshCw className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">BRRR</span>
              </TabsTrigger>
              <TabsTrigger value="R2R" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Key className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">R2R</span>
              </TabsTrigger>
              <TabsTrigger value="SOCIAL" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Shield className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">Social</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Inputs Panel */}
          <div className="lg:col-span-7">
            <Card className="border-0 bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)' }}>
              <div className="bg-muted px-6 py-4 border-b border-border flex justify-between items-center" style={{ borderLeft: '4px solid #1B3A6B' }}>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" style={{ color: '#1B3A6B' }} /> Deal Numbers
                </h2>
              </div>
              <CardContent className="p-6">
                {dealType === 'BTL' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Address</Label>
                      <Input type="text" placeholder="e.g. 12 High Street, Cardiff, CF10 1AB" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} data-testid="input-property-address" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Type</Label>
                      <PropertyTypeSelect value={propertyType} onChange={setPropertyType} />
                    </div>
                    <TenureSection tenure={tenure} onChange={setTenure} leaseLength={leaseLengthYears} onLeaseLength={setLeaseLengthYears} />
                    <div className="space-y-2">
                      <Label>Purchase Price (£)</Label>
                      <Input type="number" value={btlInputs.purchasePrice} onChange={(e) => handleBtlChange('purchasePrice', e.target.value)} />
                    </div>
                    <TaxSection country={taxCountry} buyerType={buyerType} onCountry={setTaxCountry} onBuyerType={setBuyerType} amount={btlTax} />
                    <div className="space-y-2">
                      <Label>Refurb Cost (£)</Label>
                      <Input type="number" value={btlInputs.refurbCost} onChange={(e) => handleBtlChange('refurbCost', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Costs (Legal, Broker) (£)</Label>
                      <Input type="number" value={btlInputs.otherCosts} onChange={(e) => handleBtlChange('otherCosts', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Deposit (%)</Label>
                      <Input type="number" value={btlInputs.depositPercent} onChange={(e) => handleBtlChange('depositPercent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mortgage Rate (%)</Label>
                      <Input type="number" step="0.1" value={btlInputs.mortgageRate} onChange={(e) => handleBtlChange('mortgageRate', e.target.value)} />
                      <MortgageTypeToggle
                        value={btlInputs.mortgageType}
                        onChange={(v) => setBtlInputs(prev => ({ ...prev, mortgageType: v }))}
                      />
                    </div>
                    {btlInputs.mortgageType === 'REPAYMENT' && (
                      <div className="space-y-2">
                        <Label>Mortgage Term (years)</Label>
                        <Input type="number" value={btlInputs.mortgageTerm} onChange={(e) => handleBtlChange('mortgageTerm', e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Monthly Rent (£)</Label>
                      <Input type="number" value={btlInputs.monthlyRent} onChange={(e) => handleBtlChange('monthlyRent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Expenses (£)</Label>
                      <Input type="number" value={btlInputs.monthlyExpenses} onChange={(e) => handleBtlChange('monthlyExpenses', e.target.value)} />
                    </div>
                  </div>
                )}

                {dealType === 'HMO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Address</Label>
                      <Input type="text" placeholder="e.g. 12 High Street, Cardiff, CF10 1AB" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} data-testid="input-property-address" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Type</Label>
                      <PropertyTypeSelect value={propertyType} onChange={setPropertyType} />
                    </div>
                    <TenureSection tenure={tenure} onChange={setTenure} leaseLength={leaseLengthYears} onLeaseLength={setLeaseLengthYears} />
                    <div className="space-y-2">
                      <Label>Purchase Price (£)</Label>
                      <Input type="number" value={hmoInputs.purchasePrice} onChange={(e) => handleHmoChange('purchasePrice', e.target.value)} />
                    </div>
                    <TaxSection country={taxCountry} buyerType={buyerType} onCountry={setTaxCountry} onBuyerType={setBuyerType} amount={hmoTax} />
                    <div className="space-y-2">
                      <Label>Refurb Cost (£)</Label>
                      <Input type="number" value={hmoInputs.refurbCost} onChange={(e) => handleHmoChange('refurbCost', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Costs (£)</Label>
                      <Input type="number" value={hmoInputs.otherCosts} onChange={(e) => handleHmoChange('otherCosts', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Rooms</Label>
                      <Input type="number" value={hmoInputs.rooms} onChange={(e) => handleHmoChange('rooms', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rent Per Room (£/mo)</Label>
                      <Input type="number" value={hmoInputs.rentPerRoom} onChange={(e) => handleHmoChange('rentPerRoom', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Occupancy Rate (%)</Label>
                      <Input type="number" value={hmoInputs.occupancyRate} onChange={(e) => handleHmoChange('occupancyRate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Expenses (£)</Label>
                      <Input type="number" value={hmoInputs.monthlyExpenses} onChange={(e) => handleHmoChange('monthlyExpenses', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Deposit (%)</Label>
                      <Input type="number" value={hmoInputs.depositPercent} onChange={(e) => handleHmoChange('depositPercent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mortgage Rate (%)</Label>
                      <Input type="number" step="0.1" value={hmoInputs.mortgageRate} onChange={(e) => handleHmoChange('mortgageRate', e.target.value)} />
                      <MortgageTypeToggle
                        value={hmoInputs.mortgageType}
                        onChange={(v) => setHmoInputs(prev => ({ ...prev, mortgageType: v }))}
                      />
                    </div>
                    {hmoInputs.mortgageType === 'REPAYMENT' && (
                      <div className="space-y-2">
                        <Label>Mortgage Term (years)</Label>
                        <Input type="number" value={hmoInputs.mortgageTerm} onChange={(e) => handleHmoChange('mortgageTerm', e.target.value)} />
                      </div>
                    )}
                  </div>
                )}

                {dealType === 'FLIP' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Address</Label>
                      <Input type="text" placeholder="e.g. 12 High Street, Cardiff, CF10 1AB" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} data-testid="input-property-address" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Type</Label>
                      <PropertyTypeSelect value={propertyType} onChange={setPropertyType} />
                    </div>
                    <TenureSection tenure={tenure} onChange={setTenure} leaseLength={leaseLengthYears} onLeaseLength={setLeaseLengthYears} />
                    <div className="space-y-2">
                      <Label>Purchase Price (£)</Label>
                      <Input type="number" value={flipInputs.purchasePrice} onChange={(e) => handleFlipChange('purchasePrice', e.target.value)} />
                    </div>
                    <TaxSection country={taxCountry} buyerType={buyerType} onCountry={setTaxCountry} onBuyerType={setBuyerType} amount={flipTax} />
                    <div className="space-y-2">
                      <Label>Refurb Cost (£)</Label>
                      <Input type="number" value={flipInputs.refurbCost} onChange={(e) => handleFlipChange('refurbCost', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Costs (£)</Label>
                      <Input type="number" value={flipInputs.otherCosts} onChange={(e) => handleFlipChange('otherCosts', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Holding Costs/mo (£)</Label>
                      <Input type="number" value={flipInputs.holdingCostsPerMonth} onChange={(e) => handleFlipChange('holdingCostsPerMonth', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Project Length (months)</Label>
                      <Input type="number" value={flipInputs.projectLengthMonths} onChange={(e) => handleFlipChange('projectLengthMonths', e.target.value)} />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <div className="h-px w-full bg-border my-2" />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected Sale Price / GDV (£)</Label>
                      <Input type="number" value={flipInputs.expectedSalePrice} onChange={(e) => handleFlipChange('expectedSalePrice', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Costs (%)</Label>
                      <Input type="number" step="0.1" value={flipInputs.sellingCostsPercent} onChange={(e) => handleFlipChange('sellingCostsPercent', e.target.value)} />
                    </div>
                  </div>
                )}

                {dealType === 'SA' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Address</Label>
                      <Input type="text" placeholder="e.g. 12 High Street, Cardiff, CF10 1AB" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} data-testid="input-property-address" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Type</Label>
                      <PropertyTypeSelect value={propertyType} onChange={setPropertyType} />
                    </div>
                    <TenureSection tenure={tenure} onChange={setTenure} leaseLength={leaseLengthYears} onLeaseLength={setLeaseLengthYears} />
                    <div className="space-y-2">
                      <Label>Purchase Price (£)</Label>
                      <Input type="number" value={saInputs.purchasePrice} onChange={(e) => handleSaChange('purchasePrice', e.target.value)} data-testid="input-sa-purchase-price" />
                    </div>
                    <TaxSection country={taxCountry} buyerType={buyerType} onCountry={setTaxCountry} onBuyerType={setBuyerType} amount={saTax} />
                    <div className="space-y-2">
                      <Label>Refurb Cost (£)</Label>
                      <Input type="number" value={saInputs.refurbCost} onChange={(e) => handleSaChange('refurbCost', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Costs (Legal, Broker) (£)</Label>
                      <Input type="number" value={saInputs.otherCosts} onChange={(e) => handleSaChange('otherCosts', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Deposit (%)</Label>
                      <Input type="number" value={saInputs.depositPercent} onChange={(e) => handleSaChange('depositPercent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mortgage Rate (%)</Label>
                      <Input type="number" step="0.1" value={saInputs.mortgageRate} onChange={(e) => handleSaChange('mortgageRate', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Mortgage Type</Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaChange('mortgageType', 'IO')}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${saInputs.mortgageType === 'IO' ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}
                        >Interest Only</button>
                        <button
                          type="button"
                          onClick={() => handleSaChange('mortgageType', 'REPAYMENT')}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${saInputs.mortgageType === 'REPAYMENT' ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}
                        >Repayment</button>
                      </div>
                    </div>
                    {saInputs.mortgageType === 'REPAYMENT' && (
                      <div className="space-y-2">
                        <Label>Mortgage Term (years)</Label>
                        <Input type="number" value={saInputs.mortgageTerm} onChange={(e) => handleSaChange('mortgageTerm', e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Nightly Rate (£)</Label>
                      <Input type="number" value={saInputs.nightlyRate} onChange={(e) => handleSaChange('nightlyRate', e.target.value)} data-testid="input-sa-nightly-rate" />
                    </div>
                    <div className="space-y-2">
                      <Label>Avg Occupancy (%)</Label>
                      <Input type="number" value={saInputs.occupancyPercent} onChange={(e) => handleSaChange('occupancyPercent', e.target.value)} data-testid="input-sa-occupancy" />
                    </div>
                    <div className="space-y-2">
                      <Label>Platform Fees (%)</Label>
                      <Input type="number" step="0.5" value={saInputs.platformFeesPercent} onChange={(e) => handleSaChange('platformFeesPercent', e.target.value)} data-testid="input-sa-platform-fees" />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Running Costs (£)</Label>
                      <Input type="number" value={saInputs.monthlyRunningCosts} onChange={(e) => handleSaChange('monthlyRunningCosts', e.target.value)} data-testid="input-sa-running-costs" />
                    </div>
                  </div>
                )}

                {dealType === 'BRRR' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Address</Label>
                      <Input type="text" placeholder="e.g. 12 High Street, Cardiff, CF10 1AB" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} data-testid="input-property-address" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Type</Label>
                      <PropertyTypeSelect value={propertyType} onChange={setPropertyType} />
                    </div>
                    <TenureSection tenure={tenure} onChange={setTenure} leaseLength={leaseLengthYears} onLeaseLength={setLeaseLengthYears} />
                    <div className="space-y-2">
                      <Label>Purchase Price (£)</Label>
                      <Input type="number" value={brrrInputs.purchasePrice} onChange={(e) => handleBrrrChange('purchasePrice', e.target.value)} data-testid="input-brrr-purchase-price" />
                    </div>
                    <TaxSection country={taxCountry} buyerType={buyerType} onCountry={setTaxCountry} onBuyerType={setBuyerType} amount={brrrTax} />
                    <div className="space-y-2">
                      <Label>Refurb Cost (£)</Label>
                      <Input type="number" value={brrrInputs.refurbCost} onChange={(e) => handleBrrrChange('refurbCost', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Costs (£)</Label>
                      <Input type="number" value={brrrInputs.otherCosts} onChange={(e) => handleBrrrChange('otherCosts', e.target.value)} />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <div className="h-px w-full bg-border my-1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Post-Refurb Value / GDV (£)</Label>
                      <Input type="number" value={brrrInputs.postRefurbValue} onChange={(e) => handleBrrrChange('postRefurbValue', e.target.value)} data-testid="input-brrr-gdv" />
                    </div>
                    <div className="space-y-2">
                      <Label>Refinance % (typically 75%)</Label>
                      <Input type="number" step="1" value={brrrInputs.refinancePercent} onChange={(e) => handleBrrrChange('refinancePercent', e.target.value)} data-testid="input-brrr-refinance-pct" />
                    </div>
                    <div className="space-y-2">
                      <Label>New Mortgage Rate (%)</Label>
                      <Input type="number" step="0.1" value={brrrInputs.newMortgageRate} onChange={(e) => handleBrrrChange('newMortgageRate', e.target.value)} data-testid="input-brrr-mortgage-rate" />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Rent (£)</Label>
                      <Input type="number" value={brrrInputs.monthlyRent} onChange={(e) => handleBrrrChange('monthlyRent', e.target.value)} data-testid="input-brrr-monthly-rent" />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Expenses (£)</Label>
                      <Input type="number" value={brrrInputs.monthlyExpenses} onChange={(e) => handleBrrrChange('monthlyExpenses', e.target.value)} />
                    </div>
                  </div>
                )}

                {dealType === 'R2R' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Address</Label>
                      <Input type="text" placeholder="e.g. 12 High Street, Cardiff, CF10 1AB" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} data-testid="input-property-address" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Type</Label>
                      <PropertyTypeSelect value={propertyType} onChange={setPropertyType} />
                    </div>
                    <TenureSection tenure={tenure} onChange={setTenure} leaseLength={leaseLengthYears} onLeaseLength={setLeaseLengthYears} />
                    <div className="space-y-2">
                      <Label>Monthly Rent to Landlord (£)</Label>
                      <Input type="number" value={r2rInputs.monthlyRentPaid} onChange={(e) => handleR2rChange('monthlyRentPaid', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Setup Costs — furniture, light works (£)</Label>
                      <Input type="number" value={r2rInputs.setupCosts} onChange={(e) => handleR2rChange('setupCosts', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Rooms</Label>
                      <Input type="number" value={r2rInputs.rooms} onChange={(e) => handleR2rChange('rooms', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Rent per Room / month (£)</Label>
                      <Input type="number" value={r2rInputs.rentPerRoom} onChange={(e) => handleR2rChange('rentPerRoom', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Occupancy Rate (%)</Label>
                      <Input type="number" value={r2rInputs.occupancyRate} onChange={(e) => handleR2rChange('occupancyRate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Platform / Management Fees (%)</Label>
                      <Input type="number" step="0.5" value={r2rInputs.managementFeesPercent} onChange={(e) => handleR2rChange('managementFeesPercent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Running Costs (£)</Label>
                      <Input type="number" value={r2rInputs.monthlyRunningCosts} onChange={(e) => handleR2rChange('monthlyRunningCosts', e.target.value)} />
                    </div>
                  </div>
                )}

                {dealType === 'SOCIAL' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Address</Label>
                      <Input type="text" placeholder="e.g. 12 High Street, Cardiff, CF10 1AB" value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} data-testid="input-property-address" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Property Type</Label>
                      <PropertyTypeSelect value={propertyType} onChange={setPropertyType} />
                    </div>
                    <TenureSection tenure={tenure} onChange={setTenure} leaseLength={leaseLengthYears} onLeaseLength={setLeaseLengthYears} />
                    <div className="space-y-2">
                      <Label>Purchase Price (£)</Label>
                      <Input type="number" value={socialInputs.purchasePrice} onChange={(e) => handleSocialChange('purchasePrice', e.target.value)} />
                    </div>
                    <TaxSection country={taxCountry} buyerType={buyerType} onCountry={setTaxCountry} onBuyerType={setBuyerType} amount={socialTax} />
                    <div className="space-y-2">
                      <Label>Refurb Cost (£)</Label>
                      <Input type="number" value={socialInputs.refurbCost} onChange={(e) => handleSocialChange('refurbCost', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Costs (Legal, Broker) (£)</Label>
                      <Input type="number" value={socialInputs.otherCosts} onChange={(e) => handleSocialChange('otherCosts', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Deposit (%)</Label>
                      <Input type="number" value={socialInputs.depositPercent} onChange={(e) => handleSocialChange('depositPercent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mortgage Rate (%)</Label>
                      <Input type="number" step="0.1" value={socialInputs.mortgageRate} onChange={(e) => handleSocialChange('mortgageRate', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Mortgage Type</Label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleSocialChange('mortgageType', 'IO')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${socialInputs.mortgageType === 'IO' ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}>Interest Only</button>
                        <button type="button" onClick={() => handleSocialChange('mortgageType', 'REPAYMENT')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${socialInputs.mortgageType === 'REPAYMENT' ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}>Repayment</button>
                      </div>
                    </div>
                    {socialInputs.mortgageType === 'REPAYMENT' && (
                      <div className="space-y-2">
                        <Label>Mortgage Term (years)</Label>
                        <Input type="number" value={socialInputs.mortgageTerm} onChange={(e) => handleSocialChange('mortgageTerm', e.target.value)} />
                      </div>
                    )}
                    <div className="col-span-1 md:col-span-2">
                      <div className="h-px w-full bg-border my-1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Guaranteed Lease Income / month (£)</Label>
                      <Input type="number" value={socialInputs.leaseIncomePerMonth} onChange={(e) => handleSocialChange('leaseIncomePerMonth', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Lease Length (years)</Label>
                      <Input type="number" value={socialInputs.leaseLengthYears} onChange={(e) => handleSocialChange('leaseLengthYears', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Management Costs / month (£)</Label>
                      <Input type="number" value={socialInputs.managementCostsPerMonth} onChange={(e) => handleSocialChange('managementCostsPerMonth', e.target.value)} />
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="market-value">Market Value (£)</Label>
                      <Input
                        id="market-value"
                        type="number"
                        value={marketValue}
                        onChange={(e) => setMarketValue(Number(e.target.value) || 0)}
                        data-testid="input-market-value"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sourcing-fee">Sourcing Fee (£)</Label>
                      <Input
                        id="sourcing-fee"
                        type="number"
                        value={sourcingFee}
                        onChange={(e) => setSourcingFee(Number(e.target.value) || 0)}
                        data-testid="input-sourcing-fee"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setStrategyOpen((v) => !v)}
                    aria-expanded={strategyOpen}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    data-testid="toggle-strategy"
                  >
                    <span className="font-semibold text-sm uppercase tracking-widest" style={{ color: '#1B3A6B' }}>
                      Recommended Strategy
                    </span>
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200"
                      style={{
                        color: '#1B3A6B',
                        transform: strategyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                </div>
                {strategyOpen && (
                <div className="mt-4 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="strategy-notes">Why This Strategy?</Label>
                    <Textarea
                      id="strategy-notes"
                      placeholder="Explain why this strategy fits the deal — e.g. strong rental demand, room to add value, exit options, etc."
                      value={strategyNotes}
                      onChange={(e) => setStrategyNotes(e.target.value)}
                      rows={4}
                      data-testid="input-strategy-notes"
                    />
                  </div>
                </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setDealNotesOpen((v) => !v)}
                    aria-expanded={dealNotesOpen}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    data-testid="toggle-deal-notes"
                  >
                    <span className="font-semibold text-sm uppercase tracking-widest" style={{ color: '#1B3A6B' }}>
                      Deal Notes
                    </span>
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200"
                      style={{
                        color: '#1B3A6B',
                        transform: dealNotesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                </div>
                {dealNotesOpen && (
                <div className="mt-4 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="property-description">Property Description</Label>
                    <Textarea
                      id="property-description"
                      placeholder="e.g. 3-bed mid-terrace, 90 sqm, double glazing, gas central heating, west-facing garden, off-road parking…"
                      value={propertyDescription}
                      onChange={(e) => setPropertyDescription(e.target.value)}
                      rows={3}
                      data-testid="input-property-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor-situation">Vendor Situation</Label>
                    <Textarea
                      id="vendor-situation"
                      placeholder="e.g. Motivated seller — relocating for work, needs quick completion within 6 weeks, open to offers…"
                      value={vendorSituation}
                      onChange={(e) => setVendorSituation(e.target.value)}
                      rows={3}
                      data-testid="input-vendor-situation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comparable-properties">Comparable Properties</Label>
                    <Textarea
                      id="comparable-properties"
                      placeholder="e.g. 8 High Street sold £215k (Mar 2026), 14 High Street SSTC £220k, similar 3-bed terraces averaging £210–225k on this street…"
                      value={comparableProperties}
                      onChange={(e) => setComparableProperties(e.target.value)}
                      rows={3}
                      data-testid="input-comparable-properties"
                    />
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5">
            <Card className="bg-white text-foreground rounded-2xl overflow-hidden" style={{ border: '1px solid #1B3A6B', boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)' }}>
              <div className="p-6 pb-4 flex flex-col items-center justify-center text-center space-y-4">
                <h2 className="font-medium uppercase tracking-widest text-sm" style={{ color: '#1B3A6B' }}>Deal Score</h2>
                {dealType === 'BTL' && renderScoreBadge(btlResults.score)}
                {dealType === 'HMO' && renderScoreBadge(hmoResults.score)}
                {dealType === 'FLIP' && renderScoreBadge(flipResults.score)}
                {dealType === 'SA' && renderScoreBadge(saResults.score)}
                {dealType === 'BRRR' && renderScoreBadge(brrrResults.score)}
                {dealType === 'R2R' && renderScoreBadge(r2rResults.score)}
                {dealType === 'SOCIAL' && renderScoreBadge(socialResults.score)}

                {(dealType === 'BTL' && btlResults.score === 'Incomplete') ||
                 (dealType === 'HMO' && hmoResults.score === 'Incomplete') ||
                 (dealType === 'FLIP' && flipResults.score === 'Incomplete') ||
                 (dealType === 'SA' && saResults.score === 'Incomplete') ||
                 (dealType === 'BRRR' && brrrResults.score === 'Incomplete') ||
                 (dealType === 'R2R' && r2rResults.score === 'Incomplete') ||
                 (dealType === 'SOCIAL' && socialResults.score === 'Incomplete') ? (
                  <p className="text-sm opacity-80 mt-2">Enter properties to see verdict</p>
                ) : null}

                {marketValue > 0 && (
                  <div
                    className="w-full mt-2 rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{
                      backgroundColor: bmvAmount >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${bmvAmount >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    }}
                    data-testid="bmv-banner"
                  >
                    <div className="text-left">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Below Market Value
                      </div>
                      <div className="text-lg font-bold" style={{ color: bmvAmount >= 0 ? '#047857' : '#b91c1c' }}>
                        {formatCurrency(bmvAmount)}
                      </div>
                    </div>
                    <div
                      className="text-2xl font-extrabold"
                      style={{ color: bmvAmount >= 0 ? '#047857' : '#b91c1c' }}
                      data-testid="bmv-percent"
                    >
                      {bmvPercent.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-card text-card-foreground p-6 rounded-t-3xl">
                {dealType === 'BTL' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Cash Invested" value={formatCurrency(btlResults.totalCashInvested)} />
                      <MetricBox label="Mortgage" value={formatCurrency(btlResults.mortgageAmount)} />
                      <MetricBox label="Monthly Flow" value={formatCurrency(btlResults.monthlyCashFlow)} highlight={btlResults.monthlyCashFlow < 0} />
                      <MetricBox label="Annual Flow" value={formatCurrency(btlResults.annualCashFlow)} highlight={btlResults.annualCashFlow < 0} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <Row label="Gross Yield" value={formatPercent(btlResults.grossYield)} />
                      <Row label="Net Yield" value={formatPercent(btlResults.netYield)} />
                      <Row label="Cash-on-Cash ROI" value={formatPercent(btlResults.cashOnCashROI)} isBold />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'HMO' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Cash Invested" value={formatCurrency(hmoResults.totalCashInvested)} />
                      <MetricBox label="Gross Rent/mo" value={formatCurrency(hmoResults.grossMonthlyRent)} />
                      <MetricBox label="Monthly Flow" value={formatCurrency(hmoResults.monthlyCashFlow)} highlight={hmoResults.monthlyCashFlow < 0} />
                      <MetricBox label="Annual Flow" value={formatCurrency(hmoResults.annualCashFlow)} highlight={hmoResults.annualCashFlow < 0} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <Row label="Gross Yield" value={formatPercent(hmoResults.grossYield)} />
                      <Row label="Net Yield" value={formatPercent(hmoResults.netYield)} />
                      <Row label="Cash-on-Cash ROI" value={formatPercent(hmoResults.cashOnCashROI)} isBold />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'FLIP' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Total Cost" value={formatCurrency(flipResults.totalCost)} />
                      <MetricBox label="Selling Costs" value={formatCurrency(flipResults.sellingCosts)} />
                      <MetricBox label="Net Profit" value={formatCurrency(flipResults.netProfit)} highlight={flipResults.netProfit < 0} />
                      <MetricBox label="Profit / Month" value={formatCurrency(flipResults.profitPerMonth)} highlight={flipResults.profitPerMonth < 0} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <Row label="Total ROI" value={formatPercent(flipResults.roi)} isBold />
                      <Row label="Annualised ROI" value={formatPercent(flipResults.annualisedROI)} />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'SA' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Gross Rev/mo" value={formatCurrency(saResults.grossMonthlyRevenue)} />
                      <MetricBox label="Net Rev/mo" value={formatCurrency(saResults.netMonthlyRevenue)} />
                      <MetricBox label="Monthly Flow" value={formatCurrency(saResults.monthlyCashFlow)} highlight={saResults.monthlyCashFlow < 0} />
                      <MetricBox label="Annual Flow" value={formatCurrency(saResults.annualCashFlow)} highlight={saResults.annualCashFlow < 0} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <Row label="Gross Yield" value={formatPercent(saResults.grossYield)} />
                      <Row label="Net Yield" value={formatPercent(saResults.netYield)} />
                      <Row label="Cash-on-Cash ROI" value={formatPercent(saResults.cashOnCashROI)} isBold />
                      <Row label="Cash Invested" value={formatCurrency(saResults.totalCashInvested)} />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'BRRR' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox
                        label="Cash Left In"
                        value={brrrResults.moneyOut ? `${formatCurrency(Math.abs(brrrResults.cashLeftInDeal))} OUT` : formatCurrency(brrrResults.cashLeftInDeal)}
                        highlight={!brrrResults.moneyOut && brrrResults.cashLeftInDeal > 0 && brrrResults.cashLeftInDeal > 30000}
                      />
                      <MetricBox label="Equity Created" value={formatCurrency(brrrResults.equityCreated)} highlight={brrrResults.equityCreated < 0} />
                      <MetricBox label="Monthly Flow" value={formatCurrency(brrrResults.monthlyCashFlow)} highlight={brrrResults.monthlyCashFlow < 0} />
                      <MetricBox label="Annual Flow" value={formatCurrency(brrrResults.annualCashFlow)} highlight={brrrResults.annualCashFlow < 0} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <Row label="Refinance Loan" value={formatCurrency(brrrResults.refinanceLoan)} />
                      <Row label="Gross Yield (on GDV)" value={formatPercent(brrrResults.grossYield)} />
                      <Row label="Net Yield" value={formatPercent(brrrResults.netYield)} />
                      <Row
                        label="Cash-on-Cash ROI"
                        value={brrrResults.moneyOut ? '∞ (money out!)' : formatPercent(brrrResults.cashOnCashROI)}
                        isBold
                      />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'R2R' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Gross Income/mo" value={formatCurrency(r2rResults.grossMonthlyIncome)} />
                      <MetricBox label="Net Income/mo" value={formatCurrency(r2rResults.netMonthlyIncome)} />
                      <MetricBox label="Monthly Profit" value={formatCurrency(r2rResults.monthlyProfit)} highlight={r2rResults.monthlyProfit < 0} />
                      <MetricBox label="Annual Profit" value={formatCurrency(r2rResults.annualProfit)} highlight={r2rResults.annualProfit < 0} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <Row label="Management Fees/mo" value={formatCurrency(r2rResults.managementFees)} />
                      <Row label="Gross Return on Setup" value={formatPercent(r2rResults.grossYield)} />
                      <Row label="Net ROI on Setup Costs" value={formatPercent(r2rResults.roi)} isBold />
                    </div>
                  </div>
                )}

                {dealType === 'SOCIAL' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Cash Invested" value={formatCurrency(socialResults.totalCashInvested)} />
                      <MetricBox label="Mortgage" value={formatCurrency(socialResults.mortgageAmount)} />
                      <MetricBox label="Monthly Flow" value={formatCurrency(socialResults.monthlyCashFlow)} highlight={socialResults.monthlyCashFlow < 0} />
                      <MetricBox label="Annual Flow" value={formatCurrency(socialResults.annualCashFlow)} highlight={socialResults.annualCashFlow < 0} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <Row label="Gross Yield" value={formatPercent(socialResults.grossYield)} />
                      <Row label="Net Yield" value={formatPercent(socialResults.netYield)} />
                      <Row label="Cash-on-Cash ROI" value={formatPercent(socialResults.cashOnCashROI)} isBold />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold />
                      )}
                    </div>
                  </div>
                )}

              </div>
            </Card>
          </div>
        </div>

        <div
          className="mt-8 bg-white rounded-2xl p-6"
          style={{ borderTop: '2px solid #1B3A6B', boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)' }}
        >
          <h3 className="font-semibold text-sm uppercase tracking-widest mb-5" style={{ color: '#1B3A6B' }}>
            Prepared by
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prepared-name" className="text-xs">Name</Label>
              <Input
                id="prepared-name"
                type="text"
                placeholder="Your name"
                value={preparedBy.name}
                onChange={(e) => setPreparedBy(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-prepared-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prepared-email" className="text-xs">Email</Label>
              <Input
                id="prepared-email"
                type="email"
                placeholder="you@example.com"
                value={preparedBy.email}
                onChange={(e) => setPreparedBy(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-prepared-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prepared-phone" className="text-xs">Phone Number</Label>
              <Input
                id="prepared-phone"
                type="tel"
                placeholder="07123 456789"
                value={preparedBy.phone}
                onChange={(e) => setPreparedBy(prev => ({ ...prev, phone: e.target.value }))}
                data-testid="input-prepared-phone"
              />
            </div>
          </div>

          <button
            onClick={downloadPDF}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[0.99] transition"
            style={{ backgroundColor: '#1B3A6B' }}
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4" />
            Download Investor Summary PDF
          </button>
        </div>
      </main>
    </div>
  );
}

function MetricBox({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col justify-center">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <span className={`text-xl font-bold tracking-tight ${highlight ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

const PROPERTY_TYPES = ['Terraced', 'End of Terrace', 'Semi-Detached', 'Detached', 'Flat/Apartment', 'Bungalow', 'HMO', 'Commercial Conversion', 'Mixed Use'] as const;

function PropertyTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid="select-property-type"><SelectValue /></SelectTrigger>
      <SelectContent>
        {PROPERTY_TYPES.map((t) => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TenureSection({
  tenure,
  onChange,
  leaseLength,
  onLeaseLength,
}: {
  tenure: 'Freehold' | 'Leasehold';
  onChange: (v: 'Freehold' | 'Leasehold') => void;
  leaseLength: number;
  onLeaseLength: (v: number) => void;
}) {
  return (
    <>
      <div className="space-y-2 md:col-span-2">
        <Label>Tenure</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange('Freehold')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${tenure === 'Freehold' ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}
          >
            Freehold
          </button>
          <button
            type="button"
            onClick={() => onChange('Leasehold')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${tenure === 'Leasehold' ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}
          >
            Leasehold
          </button>
        </div>
      </div>
      {tenure === 'Leasehold' && (
        <>
          <div className="space-y-2">
            <Label>Remaining Lease Length (years)</Label>
            <Input
              type="number"
              value={leaseLength}
              onChange={(e) => onLeaseLength(Number(e.target.value) || 0)}
              data-testid="input-lease-length"
            />
          </div>
          <div className="md:col-span-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800">
              Most mortgage lenders require 70+ years remaining on a lease. Ground rent over £250/year may affect mortgageability and lender eligibility.
            </p>
          </div>
        </>
      )}
    </>
  );
}

function TaxSection({
  country,
  buyerType,
  onCountry,
  onBuyerType,
  amount,
}: {
  country: Country;
  buyerType: BuyerType;
  onCountry: (v: Country) => void;
  onBuyerType: (v: BuyerType) => void;
  amount: number;
}) {
  const label = TAX_LABEL[country];

  const handleCountryChange = (v: Country) => {
    onCountry(v);
    if (v === 'WALES' && (buyerType === 'FTB' || buyerType === 'NON_UK_RESIDENT')) {
      onBuyerType('STANDARD');
    }
    if (v === 'SCOTLAND' && buyerType === 'NON_UK_RESIDENT') {
      onBuyerType('STANDARD');
    }
  };

  const showFTB = country !== 'WALES';
  const showNonUK = country === 'ENGLAND';

  return (
    <div className="md:col-span-2 rounded-xl bg-muted/40 border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold" style={{ color: '#1B3A6B' }}>
          Property Tax ({label})
        </Label>
        <span className="text-base font-bold" style={{ color: '#1B3A6B' }} data-testid="tax-amount">
          {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount)}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Country</Label>
          <Select value={country} onValueChange={(v) => handleCountryChange(v as Country)}>
            <SelectTrigger data-testid="select-country"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ENGLAND">England / N. Ireland (SDLT)</SelectItem>
              <SelectItem value="WALES">Wales (LTT)</SelectItem>
              <SelectItem value="SCOTLAND">Scotland (LBTT)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Buyer Type</Label>
          <Select value={buyerType} onValueChange={(v) => onBuyerType(v as BuyerType)}>
            <SelectTrigger data-testid="select-buyer-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="STANDARD">Standard Buyer</SelectItem>
              {showFTB && <SelectItem value="FTB">First-Time Buyer</SelectItem>}
              <SelectItem value="ADDITIONAL">Additional Property / Buy-to-Let</SelectItem>
              <SelectItem value="COMPANY">Company / SPV Purchase</SelectItem>
              {showNonUK && <SelectItem value="NON_UK_RESIDENT">Non-UK Resident (+2%)</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>
      {country === 'WALES' && (
        <p className="text-xs text-muted-foreground italic">Wales has no first-time buyer relief</p>
      )}
    </div>
  );
}

function MortgageTypeToggle({ value, onChange }: { value: 'IO' | 'REPAYMENT', onChange: (v: 'IO' | 'REPAYMENT') => void }) {
  const baseBtn = 'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors';
  const active = 'bg-white shadow-sm text-foreground';
  const inactive = 'text-muted-foreground hover:text-foreground';
  return (
    <div className="inline-flex w-full p-1 rounded-lg bg-muted border border-border" role="radiogroup" aria-label="Mortgage type">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'IO'}
        onClick={() => onChange('IO')}
        className={`${baseBtn} ${value === 'IO' ? active : inactive}`}
        data-testid="toggle-mortgage-io"
      >
        Interest Only
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'REPAYMENT'}
        onClick={() => onChange('REPAYMENT')}
        className={`${baseBtn} ${value === 'REPAYMENT' ? active : inactive}`}
        data-testid="toggle-mortgage-repayment"
      >
        Repayment
      </button>
    </div>
  );
}

function Row({ label, value, isBold = false }: { label: string, value: string, isBold?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-base ${isBold ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
