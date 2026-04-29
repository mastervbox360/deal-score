import React, { useState } from 'react';
import { Building2, Home, Hammer, TrendingUp, Calculator, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateBTL, calculateHMO, calculateFlip, calculatePropertyTax, TAX_LABEL, COUNTRY_LABEL, type DealType, type BTLInputs, type HMOInputs, type FlipInputs, type Country, type BuyerType } from '@/lib/calculations';
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
  const [sourcingFee, setSourcingFee] = useState<number>(0);
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

  const handleBtlChange = (field: keyof BTLInputs, value: string) => {
    setBtlInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleHmoChange = (field: keyof HMOInputs, value: string) => {
    setHmoInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleFlipChange = (field: keyof FlipInputs, value: string) => {
    setFlipInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const btlTax = calculatePropertyTax(btlInputs.purchasePrice, taxCountry, buyerType);
  const hmoTax = calculatePropertyTax(hmoInputs.purchasePrice, taxCountry, buyerType);
  const flipTax = calculatePropertyTax(flipInputs.purchasePrice, taxCountry, buyerType);

  const btlResults = calculateBTL({ ...btlInputs, stampDuty: btlTax });
  const hmoResults = calculateHMO({ ...hmoInputs, stampDuty: hmoTax });
  const flipResults = calculateFlip({ ...flipInputs, stampDuty: flipTax });

  const taxLabel = TAX_LABEL[taxCountry];
  const buyerLabel = buyerType === 'ADDITIONAL' ? 'Additional Property' : 'Standard Buyer';

  const downloadPDF = () => {
    const doc = new jsPDF();
    const navy: [number, number, number] = [27, 58, 107];
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DealScore', 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Investor Summary', 14, 22);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 38);

    let cursorY = 38;
    if (propertyAddress.trim()) {
      cursorY += 10;
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      const labelText = 'Property Address: ';
      doc.text(labelText, 14, cursorY);
      const labelWidth = doc.getTextWidth(labelText);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const addrLines = doc.splitTextToSize(propertyAddress.trim(), pageWidth - 28 - labelWidth);
      doc.text(addrLines[0], 14 + labelWidth, cursorY);
      for (let i = 1; i < addrLines.length; i++) {
        cursorY += 6;
        doc.text(addrLines[i], 14, cursorY);
      }
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    const dealLabel = dealType === 'BTL' ? 'Buy-to-Let' : dealType === 'HMO' ? 'HMO' : 'Flip / Refurb';
    const dealTypeY = cursorY + 12;
    doc.text(`Deal Type: ${dealLabel}`, 14, dealTypeY);

    let y = dealTypeY + 12;
    const writeSection = (title: string, rows: Array<[string, string]>) => {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(title, 14, y);
      y += 2;
      doc.setDrawColor(...navy);
      doc.line(14, y, pageWidth - 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      rows.forEach(([label, value]) => {
        doc.text(label, 14, y);
        doc.text(value, pageWidth - 14, y, { align: 'right' });
        y += 6;
      });
      y += 6;
    };

    if (dealType === 'BTL') {
      writeSection('Inputs', [
        ['Purchase Price', formatCurrency(btlInputs.purchasePrice)],
        [`${taxLabel} (${COUNTRY_LABEL[taxCountry]}, ${buyerLabel})`, formatCurrency(btlTax)],
        ['Refurb Cost', formatCurrency(btlInputs.refurbCost)],
        ['Other Costs', formatCurrency(btlInputs.otherCosts)],
        ['Deposit', `${btlInputs.depositPercent}%`],
        ['Mortgage Rate', `${btlInputs.mortgageRate}%`],
        ['Mortgage Type', btlInputs.mortgageType === 'IO' ? 'Interest Only' : 'Repayment'],
        ...(btlInputs.mortgageType === 'REPAYMENT' ? [['Mortgage Term', `${btlInputs.mortgageTerm} years`] as [string, string]] : []),
        ['Monthly Rent', formatCurrency(btlInputs.monthlyRent)],
        ['Monthly Expenses', formatCurrency(btlInputs.monthlyExpenses)],
      ]);
      writeSection('Results', [
        ['Deal Score', btlResults.score],
        ['Cash Invested', formatCurrency(btlResults.totalCashInvested)],
        ['Mortgage Amount', formatCurrency(btlResults.mortgageAmount)],
        ['Monthly Cash Flow', formatCurrency(btlResults.monthlyCashFlow)],
        ['Annual Cash Flow', formatCurrency(btlResults.annualCashFlow)],
        ['Gross Yield', formatPercent(btlResults.grossYield)],
        ['Net Yield', formatPercent(btlResults.netYield)],
        ['Cash-on-Cash ROI', formatPercent(btlResults.cashOnCashROI)],
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
        ...(hmoInputs.mortgageType === 'REPAYMENT' ? [['Mortgage Term', `${hmoInputs.mortgageTerm} years`] as [string, string]] : []),
        ['Rooms', `${hmoInputs.rooms}`],
        ['Rent per Room (monthly)', formatCurrency(hmoInputs.rentPerRoom)],
        ['Occupancy Rate', `${hmoInputs.occupancyRate}%`],
        ['Monthly Expenses', formatCurrency(hmoInputs.monthlyExpenses)],
      ]);
      writeSection('Results', [
        ['Deal Score', hmoResults.score],
        ['Cash Invested', formatCurrency(hmoResults.totalCashInvested)],
        ['Gross Monthly Rent', formatCurrency(hmoResults.grossMonthlyRent)],
        ['Monthly Cash Flow', formatCurrency(hmoResults.monthlyCashFlow)],
        ['Annual Cash Flow', formatCurrency(hmoResults.annualCashFlow)],
        ['Gross Yield', formatPercent(hmoResults.grossYield)],
        ['Net Yield', formatPercent(hmoResults.netYield)],
        ['Cash-on-Cash ROI', formatPercent(hmoResults.cashOnCashROI)],
      ]);
    } else {
      writeSection('Inputs', [
        ['Purchase Price', formatCurrency(flipInputs.purchasePrice)],
        [`${taxLabel} (${COUNTRY_LABEL[taxCountry]}, ${buyerLabel})`, formatCurrency(flipTax)],
        ['Refurb Cost', formatCurrency(flipInputs.refurbCost)],
        ['Other Costs', formatCurrency(flipInputs.otherCosts)],
        ['Holding Costs (per month)', formatCurrency(flipInputs.holdingCostsPerMonth)],
        ['Project Length', `${flipInputs.projectLengthMonths} months`],
        ['Expected Sale Price (GDV)', formatCurrency(flipInputs.expectedSalePrice)],
        ['Selling Costs', `${flipInputs.sellingCostsPercent}%`],
      ]);
      writeSection('Results', [
        ['Deal Score', flipResults.score],
        ['Total Cost', formatCurrency(flipResults.totalCost)],
        ['Selling Costs', formatCurrency(flipResults.sellingCosts)],
        ['Net Profit', formatCurrency(flipResults.netProfit)],
        ['Profit per Month', formatCurrency(flipResults.profitPerMonth)],
        ['Total ROI', formatPercent(flipResults.roi)],
        ['Annualised ROI', formatPercent(flipResults.annualisedROI)],
      ]);
    }

    const preparedRows: Array<[string, string]> = [
      ['Name', preparedBy.name || '—'],
      ['Email', preparedBy.email || '—'],
      ['Phone', preparedBy.phone || '—'],
    ];
    const neededHeight = 9 + preparedRows.length * 6 + 6 + 10;
    if (y + neededHeight > 275) {
      doc.addPage();
      y = 20;
    }
    writeSection('Prepared By', preparedRows);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('Sourcing Fee', 14, y);
    doc.text(formatCurrency(sourcingFee), pageWidth - 14, y, { align: 'right' });
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('DealScore — for informational purposes only. Not financial advice.', 14, 285);

    doc.save(`DealScore-${dealLabel.replace(/[\s/]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
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
            <TabsList className="w-full grid grid-cols-3 h-14 bg-white border border-border rounded-xl p-1 shadow-sm">
              <TabsTrigger value="BTL" className="rounded-lg text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Home className="w-4 h-4 mr-2" /> Buy-to-Let
              </TabsTrigger>
              <TabsTrigger value="HMO" className="rounded-lg text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Building2 className="w-4 h-4 mr-2" /> HMO
              </TabsTrigger>
              <TabsTrigger value="FLIP" className="rounded-lg text-base font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Hammer className="w-4 h-4 mr-2" /> Flip / Refurb
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

                <div className="mt-6 pt-5 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
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
                
                {(dealType === 'BTL' && btlResults.score === 'Incomplete') ||
                 (dealType === 'HMO' && hmoResults.score === 'Incomplete') ||
                 (dealType === 'FLIP' && flipResults.score === 'Incomplete') ? (
                  <p className="text-sm opacity-80 mt-2">Enter properties to see verdict</p>
                ) : null}
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
          <Select value={country} onValueChange={(v) => onCountry(v as Country)}>
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
              <SelectItem value="ADDITIONAL">Additional Property</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
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
