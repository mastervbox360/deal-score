export type DealType = 'BTL' | 'HMO' | 'FLIP';
export type MortgageType = 'IO' | 'REPAYMENT';

export interface BaseInputs {
  purchasePrice: number;
  stampDuty: number;
  refurbCost: number;
  otherCosts: number;
}

export interface BTLInputs extends BaseInputs {
  depositPercent: number;
  mortgageRate: number;
  mortgageTerm: number;
  mortgageType: MortgageType;
  monthlyRent: number;
  monthlyExpenses: number;
}

export interface HMOInputs extends BaseInputs {
  depositPercent: number;
  mortgageRate: number;
  mortgageTerm: number;
  mortgageType: MortgageType;
  rooms: number;
  rentPerRoom: number;
  occupancyRate: number;
  monthlyExpenses: number;
}

function calculateMonthlyMortgagePayment(
  principal: number,
  annualRatePercent: number,
  termYears: number,
  type: MortgageType,
): number {
  if (principal <= 0) return 0;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (type === 'IO') {
    return principal * monthlyRate;
  }
  const n = termYears * 12;
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

export interface FlipInputs extends BaseInputs {
  holdingCostsPerMonth: number;
  projectLengthMonths: number;
  expectedSalePrice: number;
  sellingCostsPercent: number;
}

export type Country = 'ENGLAND' | 'WALES' | 'SCOTLAND';
export type BuyerType = 'STANDARD' | 'ADDITIONAL';

interface TaxBand {
  upTo: number;
  rate: number;
}

const ENGLAND_BANDS: TaxBand[] = [
  { upTo: 125000, rate: 0 },
  { upTo: 250000, rate: 0.02 },
  { upTo: 925000, rate: 0.05 },
  { upTo: Infinity, rate: 0.10 },
];

const WALES_BANDS: TaxBand[] = [
  { upTo: 225000, rate: 0 },
  { upTo: 400000, rate: 0.06 },
  { upTo: 750000, rate: 0.075 },
  { upTo: Infinity, rate: 0.10 },
];

const SCOTLAND_BANDS: TaxBand[] = [
  { upTo: 145000, rate: 0 },
  { upTo: 250000, rate: 0.02 },
  { upTo: 325000, rate: 0.05 },
  { upTo: 750000, rate: 0.10 },
  { upTo: Infinity, rate: 0.12 },
];

const SURCHARGE: Record<Country, number> = {
  ENGLAND: 0.05,
  WALES: 0.05,
  SCOTLAND: 0.08,
};

export const TAX_LABEL: Record<Country, string> = {
  ENGLAND: 'SDLT',
  WALES: 'LTT',
  SCOTLAND: 'LBTT',
};

export const COUNTRY_LABEL: Record<Country, string> = {
  ENGLAND: 'England / N. Ireland',
  WALES: 'Wales',
  SCOTLAND: 'Scotland',
};

export function calculatePropertyTax(
  price: number,
  country: Country,
  buyerType: BuyerType,
): number {
  if (price <= 0) return 0;
  const bands =
    country === 'ENGLAND' ? ENGLAND_BANDS :
    country === 'WALES' ? WALES_BANDS :
    SCOTLAND_BANDS;
  const surcharge = buyerType === 'ADDITIONAL' ? SURCHARGE[country] : 0;

  let tax = 0;
  let lower = 0;
  for (const band of bands) {
    if (price <= lower) break;
    const upper = Math.min(price, band.upTo);
    const slice = upper - lower;
    tax += slice * (band.rate + surcharge);
    lower = upper;
    if (price <= band.upTo) break;
  }
  return tax;
}

export function calculateSDLT(price: number, isSecondHome: boolean = true): number {
  return calculatePropertyTax(price, 'ENGLAND', isSecondHome ? 'ADDITIONAL' : 'STANDARD');
}

export function calculateBTL(inputs: BTLInputs) {
  const deposit = inputs.purchasePrice * (inputs.depositPercent / 100);
  const totalCashInvested = deposit + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts;
  const mortgageAmount = inputs.purchasePrice - deposit;
  const monthlyMortgageInterest = calculateMonthlyMortgagePayment(
    mortgageAmount,
    inputs.mortgageRate,
    inputs.mortgageTerm,
    inputs.mortgageType,
  );
  const monthlyCashFlow = inputs.monthlyRent - monthlyMortgageInterest - inputs.monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const annualRent = inputs.monthlyRent * 12;
  const annualExpenses = inputs.monthlyExpenses * 12 + (monthlyMortgageInterest * 12);
  
  const grossYield = inputs.purchasePrice > 0 ? (annualRent / inputs.purchasePrice) * 100 : 0;
  const netYield = (inputs.purchasePrice + inputs.refurbCost + inputs.otherCosts) > 0 ? ((annualRent - annualExpenses) / (inputs.purchasePrice + inputs.refurbCost + inputs.otherCosts)) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

  let score: 'Strong' | 'Average' | 'Weak' | 'Incomplete' = 'Weak';
  if (!inputs.purchasePrice || !inputs.monthlyRent) {
    score = 'Incomplete';
  } else if (cashOnCashROI >= 8 && monthlyCashFlow >= 200) {
    score = 'Strong';
  } else if (cashOnCashROI >= 5) {
    score = 'Average';
  }

  return {
    totalCashInvested,
    mortgageAmount,
    monthlyMortgageInterest,
    monthlyCashFlow,
    annualCashFlow,
    grossYield,
    netYield,
    cashOnCashROI,
    score
  };
}

export function calculateHMO(inputs: HMOInputs) {
  const deposit = inputs.purchasePrice * (inputs.depositPercent / 100);
  const totalCashInvested = deposit + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts;
  const mortgageAmount = inputs.purchasePrice - deposit;
  const monthlyMortgageInterest = calculateMonthlyMortgagePayment(
    mortgageAmount,
    inputs.mortgageRate,
    inputs.mortgageTerm,
    inputs.mortgageType,
  );
  
  const grossMonthlyRent = inputs.rooms * inputs.rentPerRoom * (inputs.occupancyRate / 100);
  const annualRent = grossMonthlyRent * 12;
  const monthlyCashFlow = grossMonthlyRent - monthlyMortgageInterest - inputs.monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const annualExpenses = inputs.monthlyExpenses * 12 + (monthlyMortgageInterest * 12);

  const grossYield = inputs.purchasePrice > 0 ? (annualRent / inputs.purchasePrice) * 100 : 0;
  const netYield = (inputs.purchasePrice + inputs.refurbCost + inputs.otherCosts) > 0 ? ((annualRent - annualExpenses) / (inputs.purchasePrice + inputs.refurbCost + inputs.otherCosts)) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

  let score: 'Strong' | 'Average' | 'Weak' | 'Incomplete' = 'Weak';
  if (!inputs.purchasePrice || !inputs.rentPerRoom || !inputs.rooms) {
    score = 'Incomplete';
  } else if (cashOnCashROI >= 12 && monthlyCashFlow >= 500) {
    score = 'Strong';
  } else if (cashOnCashROI >= 8) {
    score = 'Average';
  }

  return {
    totalCashInvested,
    mortgageAmount,
    monthlyMortgageInterest,
    grossMonthlyRent,
    monthlyCashFlow,
    annualCashFlow,
    grossYield,
    netYield,
    cashOnCashROI,
    score
  };
}

export function calculateFlip(inputs: FlipInputs) {
  const totalCost = inputs.purchasePrice + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts + (inputs.holdingCostsPerMonth * inputs.projectLengthMonths);
  const sellingCosts = inputs.expectedSalePrice * (inputs.sellingCostsPercent / 100);
  const netProfit = inputs.expectedSalePrice - totalCost - sellingCosts;
  
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const annualisedROI = inputs.projectLengthMonths > 0 ? roi * (12 / inputs.projectLengthMonths) : 0;
  const profitPerMonth = inputs.projectLengthMonths > 0 ? netProfit / inputs.projectLengthMonths : 0;

  let score: 'Strong' | 'Average' | 'Weak' | 'Incomplete' = 'Weak';
  if (!inputs.purchasePrice || !inputs.expectedSalePrice) {
    score = 'Incomplete';
  } else if (roi >= 20 && netProfit >= 25000) {
    score = 'Strong';
  } else if (roi >= 12) {
    score = 'Average';
  }

  return {
    totalCost,
    sellingCosts,
    netProfit,
    roi,
    annualisedROI,
    profitPerMonth,
    score
  };
}
