export type DealType = 'BTL' | 'HMO' | 'FLIP';

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
  monthlyRent: number;
  monthlyExpenses: number;
}

export interface HMOInputs extends BaseInputs {
  depositPercent: number;
  mortgageRate: number;
  rooms: number;
  rentPerRoom: number;
  occupancyRate: number;
  monthlyExpenses: number;
}

export interface FlipInputs extends BaseInputs {
  holdingCostsPerMonth: number;
  projectLengthMonths: number;
  expectedSalePrice: number;
  sellingCostsPercent: number;
}

export function calculateSDLT(price: number, isSecondHome: boolean = true): number {
  if (price <= 0) return 0;
  
  // Simplified SDLT bands for BTL/Second home (assuming 3% surcharge -> 5% in 2024? rules say 3% mostly but prompt said 5% surcharge on second properties as of 2024. Wait, UK announced 5% in Oct 2024 budget).
  const surcharge = isSecondHome ? 0.05 : 0;
  let tax = 0;
  
  if (price > 1500000) {
    tax += (price - 1500000) * (0.12 + surcharge);
    price = 1500000;
  }
  if (price > 925000) {
    tax += (price - 925000) * (0.10 + surcharge);
    price = 925000;
  }
  if (price > 250000) {
    tax += (price - 250000) * (0.05 + surcharge);
    price = 250000;
  }
  if (price > 0) {
    tax += price * surcharge; // First £250k is 0% standard, so only surcharge
  }
  
  return tax;
}

export function calculateBTL(inputs: BTLInputs) {
  const deposit = inputs.purchasePrice * (inputs.depositPercent / 100);
  const totalCashInvested = deposit + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts;
  const mortgageAmount = inputs.purchasePrice - deposit;
  const monthlyMortgageInterest = (mortgageAmount * (inputs.mortgageRate / 100)) / 12;
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
  const monthlyMortgageInterest = (mortgageAmount * (inputs.mortgageRate / 100)) / 12;
  
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
