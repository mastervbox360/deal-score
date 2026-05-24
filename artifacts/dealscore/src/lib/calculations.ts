export type DealType = 'BTL' | 'HMO' | 'FLIP' | 'SA' | 'BRRR' | 'R2R' | 'SOCIAL';
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
  managementFeePercent: number;
  voidAllowancePercent: number;
  maintenanceReserve: number;
  buildingsInsurance: number;
  serviceCharge: number;
  groundRentAnnual: number;
}

export interface HMOInputs extends BaseInputs {
  depositPercent: number;
  mortgageRate: number;
  mortgageTerm: number;
  mortgageType: MortgageType;
  rooms: number;
  rentPerRoom: number;
  occupancyRate: number;
  managementFeePercent: number;
  voidAllowancePercent: number;
  maintenanceReserve: number;
  buildingsInsurance: number;
  serviceCharge: number;
  groundRentAnnual: number;
}

export interface SAInputs extends BaseInputs {
  depositPercent: number;
  mortgageRate: number;
  mortgageTerm: number;
  mortgageType: MortgageType;
  nightlyRate: number;
  occupancyPercent: number;
  platformFeesPercent: number;
  managementFeePercent: number;
  voidAllowancePercent: number;
  maintenanceReserve: number;
  buildingsInsurance: number;
  serviceCharge: number;
  groundRentAnnual: number;
}

export interface BRRRInputs extends BaseInputs {
  postRefurbValue: number;
  refinancePercent: number;
  newMortgageRate: number;
  monthlyRent: number;
  managementFeePercent: number;
  voidAllowancePercent: number;
  maintenanceReserve: number;
  buildingsInsurance: number;
  serviceCharge: number;
  groundRentAnnual: number;
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
// COMPANY maps to additional property rates
// NON_UK_RESIDENT: England only — standard/FTB base + 2% surcharge on full price
// FTB: nil-rate relief (England + Scotland only; Wales has no FTB relief)
export type BuyerType = 'STANDARD' | 'FTB' | 'ADDITIONAL' | 'COMPANY' | 'NON_UK_RESIDENT';

interface TaxBand {
  upTo: number;
  rate: number;
}

// ── England / Northern Ireland (SDLT) ────────────────────────────────────────
const ENGLAND_STANDARD_BANDS: TaxBand[] = [
  { upTo: 125000, rate: 0 },
  { upTo: 250000, rate: 0.02 },
  { upTo: 925000, rate: 0.05 },
  { upTo: 1500000, rate: 0.10 },
  { upTo: Infinity, rate: 0.12 },
];
// Additional property: all bands have 5% surcharge applied directly
const ENGLAND_ADDITIONAL_BANDS: TaxBand[] = [
  { upTo: 125000, rate: 0.05 },
  { upTo: 250000, rate: 0.07 },
  { upTo: 925000, rate: 0.10 },
  { upTo: 1500000, rate: 0.15 },
  { upTo: Infinity, rate: 0.17 },
];
// FTB relief: 0% to £300k · 5% to £500k · no relief above £500k (use standard)
const ENGLAND_FTB_BANDS: TaxBand[] = [
  { upTo: 300000, rate: 0 },
  { upTo: 500000, rate: 0.05 },
];

// ── Wales (LTT) ──────────────────────────────────────────────────────────────
// Wales uses two completely separate rate tables, not a surcharge model
const WALES_STANDARD_BANDS: TaxBand[] = [
  { upTo: 225000, rate: 0 },
  { upTo: 400000, rate: 0.06 },
  { upTo: 750000, rate: 0.075 },
  { upTo: 1500000, rate: 0.10 },
  { upTo: Infinity, rate: 0.12 },
];
// Higher rates (additional property) — standalone bands
const WALES_ADDITIONAL_BANDS: TaxBand[] = [
  { upTo: 180000, rate: 0.05 },
  { upTo: 250000, rate: 0.085 },
  { upTo: 400000, rate: 0.10 },
  { upTo: 750000, rate: 0.125 },
  { upTo: 1500000, rate: 0.15 },
  { upTo: Infinity, rate: 0.17 },
];

// ── Scotland (LBTT) ──────────────────────────────────────────────────────────
const SCOTLAND_STANDARD_BANDS: TaxBand[] = [
  { upTo: 145000, rate: 0 },
  { upTo: 250000, rate: 0.02 },
  { upTo: 325000, rate: 0.05 },
  { upTo: 750000, rate: 0.10 },
  { upTo: Infinity, rate: 0.12 },
];
// FTB: nil-rate extends to £175k (max saving £600; no upper price cap)
const SCOTLAND_FTB_BANDS: TaxBand[] = [
  { upTo: 175000, rate: 0 },
  { upTo: 250000, rate: 0.02 },
  { upTo: 325000, rate: 0.05 },
  { upTo: 750000, rate: 0.10 },
  { upTo: Infinity, rate: 0.12 },
];
// Additional: standard LBTT + flat 8% ADS on full purchase price

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

export const BUYER_LABEL: Record<BuyerType, string> = {
  STANDARD: 'Standard Buyer',
  FTB: 'First-Time Buyer',
  ADDITIONAL: 'Additional Property / Buy-to-Let',
  COMPANY: 'Company / SPV',
  NON_UK_RESIDENT: 'Non-UK Resident',
};

function applyBands(price: number, bands: TaxBand[]): number {
  let tax = 0;
  let lower = 0;
  for (const band of bands) {
    if (price <= lower) break;
    const upper = Math.min(price, band.upTo);
    tax += (upper - lower) * band.rate;
    lower = upper;
    if (price <= band.upTo) break;
  }
  return tax;
}

export function calculatePropertyTax(
  price: number,
  country: Country,
  buyerType: BuyerType,
): number {
  if (price <= 0) return 0;

  const isAdditional = buyerType === 'ADDITIONAL' || buyerType === 'COMPANY';
  const isFTB = buyerType === 'FTB';
  const isNonUK = buyerType === 'NON_UK_RESIDENT';

  if (country === 'ENGLAND') {
    let tax: number;
    if (isAdditional) {
      tax = applyBands(price, ENGLAND_ADDITIONAL_BANDS);
    } else if (isFTB) {
      // Above £500k FTB relief is withdrawn — use standard rates
      tax = price > 500000
        ? applyBands(price, ENGLAND_STANDARD_BANDS)
        : applyBands(price, ENGLAND_FTB_BANDS);
    } else {
      // STANDARD or NON_UK_RESIDENT (same base rates)
      tax = applyBands(price, ENGLAND_STANDARD_BANDS);
    }
    // Non-UK resident: additional 2% on full price
    if (isNonUK) tax += price * 0.02;
    return tax;
  }

  if (country === 'WALES') {
    // Wales has no FTB relief and no non-UK resident surcharge
    return isAdditional
      ? applyBands(price, WALES_ADDITIONAL_BANDS)
      : applyBands(price, WALES_STANDARD_BANDS);
  }

  // Scotland
  if (isAdditional) {
    // ADS = flat 8% on FULL purchase price, added to standard LBTT
    return applyBands(price, SCOTLAND_STANDARD_BANDS) + price * 0.08;
  }
  return isFTB
    ? applyBands(price, SCOTLAND_FTB_BANDS)
    : applyBands(price, SCOTLAND_STANDARD_BANDS);
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

  const grossRent = inputs.monthlyRent;
  const voidAllowanceAmount = grossRent * (inputs.voidAllowancePercent / 100);
  const effectiveRent = grossRent - voidAllowanceAmount;
  const managementFeeAmount = effectiveRent * (inputs.managementFeePercent / 100);
  const groundRentMonthly = inputs.groundRentAnnual / 12;
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly;
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgageInterest;
  const annualNetCashFlow = netCashFlow * 12;
  const annualRent = inputs.monthlyRent * 12;

  const grossYield = inputs.purchasePrice > 0 ? (annualRent / inputs.purchasePrice) * 100 : 0;
  const netYield = inputs.purchasePrice > 0 ? (netOperatingIncome * 12 / inputs.purchasePrice) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualNetCashFlow / totalCashInvested) * 100 : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const breakEvenRent = inputs.voidAllowancePercent < 100
    ? (monthlyMortgageInterest + totalOperatingCosts) / (1 - inputs.voidAllowancePercent / 100)
    : 0;
  const paybackPeriod = annualNetCashFlow > 0 ? totalCashInvested / annualNetCashFlow : Infinity;

  let score: 'Strong' | 'Average' | 'Weak' | 'Incomplete' = 'Weak';
  if (!inputs.purchasePrice || !inputs.monthlyRent) {
    score = 'Incomplete';
  } else if (cashOnCashROI >= 5 && monthlyCashFlow >= 100) {
    score = 'Strong';
  } else if (cashOnCashROI >= 3 || monthlyCashFlow >= 100) {
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
    score,
    voidAllowanceAmount,
    effectiveRent,
    managementFeeAmount,
    totalOperatingCosts,
    netOperatingIncome,
    breakEvenRent,
    paybackPeriod,
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

  const grossRent = grossMonthlyRent;
  const voidAllowanceAmount = grossRent * (inputs.voidAllowancePercent / 100);
  const effectiveRent = grossRent - voidAllowanceAmount;
  const managementFeeAmount = effectiveRent * (inputs.managementFeePercent / 100);
  const groundRentMonthly = inputs.groundRentAnnual / 12;
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly;
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgageInterest;
  const annualNetCashFlow = netCashFlow * 12;

  const grossYield = inputs.purchasePrice > 0 ? (annualRent / inputs.purchasePrice) * 100 : 0;
  const netYield = inputs.purchasePrice > 0 ? (netOperatingIncome * 12 / inputs.purchasePrice) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualNetCashFlow / totalCashInvested) * 100 : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const breakEvenRent = inputs.voidAllowancePercent < 100
    ? (monthlyMortgageInterest + totalOperatingCosts) / (1 - inputs.voidAllowancePercent / 100)
    : 0;
  const paybackPeriod = annualNetCashFlow > 0 ? totalCashInvested / annualNetCashFlow : Infinity;

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
    score,
    voidAllowanceAmount,
    effectiveRent,
    managementFeeAmount,
    totalOperatingCosts,
    netOperatingIncome,
    breakEvenRent,
    paybackPeriod,
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
  } else if (roi >= 12 && netProfit >= 18000) {
    score = 'Strong';
  } else if (roi >= 8) {
    score = 'Average';
  }

  const profitOnCost = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  return {
    totalCost,
    sellingCosts,
    netProfit,
    roi,
    annualisedROI,
    profitPerMonth,
    profitOnCost,
    score
  };
}

export function calculateSA(inputs: SAInputs) {
  const deposit = inputs.purchasePrice * (inputs.depositPercent / 100);
  const mortgageAmount = inputs.purchasePrice - deposit;
  const monthlyMortgage = calculateMonthlyMortgagePayment(
    mortgageAmount,
    inputs.mortgageRate,
    inputs.mortgageTerm,
    inputs.mortgageType,
  );
  const totalCashInvested = deposit + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts;

  const nightsPerMonth = 365 / 12;
  const grossMonthlyRevenue = inputs.nightlyRate * (inputs.occupancyPercent / 100) * nightsPerMonth;
  const platformFees = grossMonthlyRevenue * (inputs.platformFeesPercent / 100);
  const netMonthlyRevenue = grossMonthlyRevenue - platformFees;
  const annualRevenue = grossMonthlyRevenue * 12;

  const grossRent = netMonthlyRevenue;
  const voidAllowanceAmount = grossRent * (inputs.voidAllowancePercent / 100);
  const effectiveRent = grossRent - voidAllowanceAmount;
  const managementFeeAmount = effectiveRent * (inputs.managementFeePercent / 100);
  const groundRentMonthly = inputs.groundRentAnnual / 12;
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly;
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgage;
  const annualNetCashFlow = netCashFlow * 12;

  const grossYield = inputs.purchasePrice > 0 ? (annualRevenue / inputs.purchasePrice) * 100 : 0;
  const netYield = inputs.purchasePrice > 0 ? (netOperatingIncome * 12 / inputs.purchasePrice) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualNetCashFlow / totalCashInvested) * 100 : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const breakEvenRent = inputs.voidAllowancePercent < 100
    ? (monthlyMortgage + totalOperatingCosts) / (1 - inputs.voidAllowancePercent / 100)
    : 0;
  const paybackPeriod = annualNetCashFlow > 0 ? totalCashInvested / annualNetCashFlow : Infinity;

  let score: 'Strong' | 'Average' | 'Weak' | 'Incomplete' = 'Weak';
  if (!inputs.purchasePrice || !inputs.nightlyRate) {
    score = 'Incomplete';
  } else if (cashOnCashROI >= 15 && monthlyCashFlow >= 500) {
    score = 'Strong';
  } else if (cashOnCashROI >= 8) {
    score = 'Average';
  }

  return {
    totalCashInvested,
    mortgageAmount,
    monthlyMortgage,
    grossMonthlyRevenue,
    platformFees,
    netMonthlyRevenue,
    monthlyCashFlow,
    annualCashFlow,
    grossYield,
    netYield,
    cashOnCashROI,
    score,
    voidAllowanceAmount,
    effectiveRent,
    managementFeeAmount,
    totalOperatingCosts,
    netOperatingIncome,
    breakEvenRent,
    paybackPeriod,
  };
}

export interface R2RInputs {
  monthlyRentPaid: number;
  rooms: number;
  rentPerRoom: number;
  occupancyRate: number;
  managementFeesPercent: number;
  monthlyRunningCosts: number;
  setupCosts: number;
}

export interface SocialHousingInputs {
  purchasePrice: number;
  stampDuty: number;
  refurbCost: number;
  otherCosts: number;
  depositPercent: number;
  mortgageRate: number;
  mortgageTerm: number;
  mortgageType: MortgageType;
  leaseIncomePerMonth: number;
  leaseLengthYears: number;
  managementFeePercent: number;
  voidAllowancePercent: number;
  maintenanceReserve: number;
  buildingsInsurance: number;
  serviceCharge: number;
  groundRentAnnual: number;
}

export function calculateR2R(inputs: R2RInputs) {
  const grossMonthlyIncome = inputs.rooms * inputs.rentPerRoom * (inputs.occupancyRate / 100);
  const managementFees = grossMonthlyIncome * (inputs.managementFeesPercent / 100);
  const netMonthlyIncome = grossMonthlyIncome - managementFees;
  const monthlyProfit = netMonthlyIncome - inputs.monthlyRentPaid - inputs.monthlyRunningCosts;
  const annualProfit = monthlyProfit * 12;
  const annualGrossIncome = grossMonthlyIncome * 12;
  const roi = inputs.setupCosts > 0 ? (annualProfit / inputs.setupCosts) * 100 : 0;
  const grossYield = inputs.setupCosts > 0 ? (annualGrossIncome / inputs.setupCosts) * 100 : 0;
  const netYield = inputs.setupCosts > 0 ? (annualProfit / inputs.setupCosts) * 100 : 0;

  let score: 'Strong' | 'Average' | 'Weak' | 'Incomplete' = 'Weak';
  if (!inputs.rooms || !inputs.rentPerRoom || !inputs.monthlyRentPaid) {
    score = 'Incomplete';
  } else if (monthlyProfit >= 500 && roi >= 50) {
    score = 'Strong';
  } else if (monthlyProfit >= 200 && roi >= 25) {
    score = 'Average';
  }

  return {
    grossMonthlyIncome,
    managementFees,
    netMonthlyIncome,
    monthlyProfit,
    annualProfit,
    annualGrossIncome,
    roi,
    grossYield,
    netYield,
    score,
  };
}

export function calculateSocialHousing(inputs: SocialHousingInputs) {
  const deposit = inputs.purchasePrice * (inputs.depositPercent / 100);
  const mortgageAmount = inputs.purchasePrice - deposit;
  const monthlyMortgage = calculateMonthlyMortgagePayment(
    mortgageAmount,
    inputs.mortgageRate,
    inputs.mortgageTerm,
    inputs.mortgageType,
  );
  const totalCashInvested = deposit + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts;

  const grossRent = inputs.leaseIncomePerMonth;
  const voidAllowanceAmount = grossRent * (inputs.voidAllowancePercent / 100);
  const effectiveRent = grossRent - voidAllowanceAmount;
  const managementFeeAmount = effectiveRent * (inputs.managementFeePercent / 100);
  const groundRentMonthly = inputs.groundRentAnnual / 12;
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly;
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgage;
  const annualNetCashFlow = netCashFlow * 12;

  const grossYield = inputs.purchasePrice > 0 ? (inputs.leaseIncomePerMonth * 12 / inputs.purchasePrice) * 100 : 0;
  const netYield = inputs.purchasePrice > 0 ? (netOperatingIncome * 12 / inputs.purchasePrice) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualNetCashFlow / totalCashInvested) * 100 : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const breakEvenRent = inputs.voidAllowancePercent < 100
    ? (monthlyMortgage + totalOperatingCosts) / (1 - inputs.voidAllowancePercent / 100)
    : 0;
  const paybackPeriod = annualNetCashFlow > 0 ? totalCashInvested / annualNetCashFlow : Infinity;

  let score: 'Strong' | 'Average' | 'Weak' | 'Incomplete' = 'Weak';
  if (!inputs.purchasePrice || !inputs.leaseIncomePerMonth) {
    score = 'Incomplete';
  } else if (cashOnCashROI >= 5 && monthlyCashFlow >= 50) {
    score = 'Strong';
  } else if (cashOnCashROI >= 2) {
    score = 'Average';
  }

  return {
    totalCashInvested,
    mortgageAmount,
    monthlyMortgage,
    monthlyCashFlow,
    annualCashFlow,
    grossYield,
    netYield,
    cashOnCashROI,
    score,
    voidAllowanceAmount,
    effectiveRent,
    managementFeeAmount,
    totalOperatingCosts,
    netOperatingIncome,
    breakEvenRent,
    paybackPeriod,
  };
}

export function calculateBRRR(inputs: BRRRInputs) {
  const totalCostIn = inputs.purchasePrice + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts;
  const refinanceLoan = inputs.postRefurbValue * (inputs.refinancePercent / 100);
  const cashLeftInDeal = totalCostIn - refinanceLoan;
  const equityCreated = inputs.postRefurbValue - inputs.purchasePrice - inputs.refurbCost - inputs.otherCosts;
  const monthlyMortgage = refinanceLoan * (inputs.newMortgageRate / 100) / 12;
  const annualRent = inputs.monthlyRent * 12;

  const grossRent = inputs.monthlyRent;
  const voidAllowanceAmount = grossRent * (inputs.voidAllowancePercent / 100);
  const effectiveRent = grossRent - voidAllowanceAmount;
  const managementFeeAmount = effectiveRent * (inputs.managementFeePercent / 100);
  const groundRentMonthly = inputs.groundRentAnnual / 12;
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly;
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgage;
  const annualNetCashFlow = netCashFlow * 12;

  const grossYield = inputs.postRefurbValue > 0 ? (annualRent / inputs.postRefurbValue) * 100 : 0;
  const netYield = inputs.postRefurbValue > 0 ? (netOperatingIncome * 12 / inputs.postRefurbValue) * 100 : 0;
  const cashOnCashROI = cashLeftInDeal > 0
    ? (annualNetCashFlow / cashLeftInDeal) * 100
    : cashLeftInDeal <= 0 && annualNetCashFlow > 0
    ? Infinity
    : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const moneyOut = cashLeftInDeal <= 0;
  const breakEvenRent = inputs.voidAllowancePercent < 100
    ? (monthlyMortgage + totalOperatingCosts) / (1 - inputs.voidAllowancePercent / 100)
    : 0;
  const paybackPeriod = annualNetCashFlow <= 0 ? Infinity : cashLeftInDeal / annualNetCashFlow;

  let score: 'Strong' | 'Average' | 'Weak' | 'Incomplete' = 'Weak';
  if (!inputs.purchasePrice || !inputs.postRefurbValue) {
    score = 'Incomplete';
  } else if (monthlyCashFlow > 0 && (moneyOut || cashOnCashROI >= 15)) {
    score = 'Strong';
  } else if (monthlyCashFlow >= 0 && cashOnCashROI >= 5) {
    score = 'Average';
  }

  return {
    totalCostIn,
    refinanceLoan,
    cashLeftInDeal,
    equityCreated,
    monthlyMortgage,
    monthlyCashFlow,
    annualCashFlow,
    grossYield,
    netYield,
    cashOnCashROI,
    moneyOut,
    score,
    voidAllowanceAmount,
    effectiveRent,
    managementFeeAmount,
    totalOperatingCosts,
    netOperatingIncome,
    breakEvenRent,
    paybackPeriod,
  };
}
