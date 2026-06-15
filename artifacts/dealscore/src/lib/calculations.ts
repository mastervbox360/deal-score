export type DealType = 'BTL' | 'HMO' | 'FLIP' | 'SA' | 'BRRR' | 'R2R' | 'SOCIAL';
export type MortgageType = 'IO' | 'REPAYMENT';

export interface BaseInputs {
  purchasePrice: number;
  stampDuty: number;
  refurbCost: number;
  otherCosts: number;
  additionalMonthlyCosts?: number;
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
  billsUtilities?: number;
  councilTaxMonthly?: number;
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
  cleaningCostPerStay?: number;
  billsUtilities?: number;
  avgStayLengthNights?: number;
  linenCostPerStay?: number;
  consumablesMonthly?: number;
  councilTaxMonthly?: number;
  channelManagerMonthly?: number;
  furnishingSetupCost?: number;
}

export interface BRRRInputs extends BaseInputs {
  postRefurbValue: number;
  refinancePercent: number;
  newMortgageRate: number;
  refinanceMortgageType?: MortgageType;
  refinanceMortgageTerm?: number;
  refinanceArrangementFeePercent?: number;
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
  financingMethod?: 'cash' | 'bridging' | 'mortgage';
  contingencyPercent?: number;
  bridgingRate?: number;
  bridgingTerm?: number;
  bridgingLTV?: number;
  depositPercent?: number;
  mortgageRate?: number;
  mortgageTerm?: number;
  mortgageType?: MortgageType;
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
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly + (inputs.additionalMonthlyCosts ?? 0);
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgageInterest;
  const annualNetCashFlow = netCashFlow * 12;
  const annualRent = inputs.monthlyRent * 12;

  const grossYield = inputs.purchasePrice > 0 ? (annualRent / inputs.purchasePrice) * 100 : 0;
  const netYield = inputs.purchasePrice > 0 ? (netOperatingIncome * 12 / inputs.purchasePrice) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualNetCashFlow / totalCashInvested) * 100 : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const fixedCostsBTL = inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly + (inputs.additionalMonthlyCosts ?? 0);
  const breakEvenRent = (inputs.voidAllowancePercent < 100 && inputs.managementFeePercent < 100)
    ? (monthlyMortgageInterest + fixedCostsBTL) / ((1 - inputs.voidAllowancePercent / 100) * (1 - inputs.managementFeePercent / 100))
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
  const fullOccupancyMonthlyRent = inputs.rooms * inputs.rentPerRoom;
  const annualRent = fullOccupancyMonthlyRent * 12;

  const grossRent = grossMonthlyRent;
  const voidAllowanceAmount = grossRent * (inputs.voidAllowancePercent / 100);
  const effectiveRent = grossRent - voidAllowanceAmount;
  const managementFeeAmount = effectiveRent * (inputs.managementFeePercent / 100);
  const groundRentMonthly = inputs.groundRentAnnual / 12;
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly + (inputs.billsUtilities ?? 0) + (inputs.councilTaxMonthly ?? 0) + (inputs.additionalMonthlyCosts ?? 0);
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgageInterest;
  const annualNetCashFlow = netCashFlow * 12;

  const grossYield = inputs.purchasePrice > 0 ? (annualRent / inputs.purchasePrice) * 100 : 0;
  const netYield = inputs.purchasePrice > 0 ? (netOperatingIncome * 12 / inputs.purchasePrice) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualNetCashFlow / totalCashInvested) * 100 : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const fixedCostsHMO = inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly + (inputs.billsUtilities ?? 0) + (inputs.councilTaxMonthly ?? 0) + (inputs.additionalMonthlyCosts ?? 0);
  const breakEvenRent = (inputs.voidAllowancePercent < 100 && inputs.managementFeePercent < 100)
    ? (monthlyMortgageInterest + fixedCostsHMO) / ((1 - inputs.voidAllowancePercent / 100) * (1 - inputs.managementFeePercent / 100))
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
  const financingMethod = inputs.financingMethod ?? 'cash';
  const contingencyPercent = inputs.contingencyPercent ?? 0;
  const bridgingRate = inputs.bridgingRate ?? 0;
  const bridgingTerm = inputs.bridgingTerm ?? 0;
  const bridgingLTV = inputs.bridgingLTV ?? 0;
  const depositPercent = inputs.depositPercent ?? 0;
  const mortgageRate = inputs.mortgageRate ?? 0;
  const mortgageTerm = inputs.mortgageTerm ?? 25;
  const mortgageType: MortgageType = inputs.mortgageType ?? 'REPAYMENT';

  const refurbWithContingency = inputs.refurbCost * (1 + contingencyPercent / 100);

  let financingCost = 0;
  if (financingMethod === 'bridging') {
    financingCost = (inputs.purchasePrice * bridgingLTV / 100) * (bridgingRate / 100) * bridgingTerm;
  } else if (financingMethod === 'mortgage') {
    const deposit = inputs.purchasePrice * (depositPercent / 100);
    const mortgageAmount = inputs.purchasePrice - deposit;
    const monthlyPayment = calculateMonthlyMortgagePayment(mortgageAmount, mortgageRate, mortgageTerm, mortgageType);
    financingCost = monthlyPayment * inputs.projectLengthMonths;
  }

  const totalCost = inputs.purchasePrice + inputs.stampDuty + refurbWithContingency + inputs.otherCosts + (inputs.holdingCostsPerMonth * inputs.projectLengthMonths) + financingCost;
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

  return { totalCost, sellingCosts, netProfit, roi, annualisedROI, profitPerMonth, profitOnCost, score, financingCost, refurbWithContingency };
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
  const totalCashInvested = deposit + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts + (inputs.furnishingSetupCost ?? 0);

  const nightsPerMonth = 365 / 12;
  const grossMonthlyRevenue = inputs.nightlyRate * (inputs.occupancyPercent / 100) * nightsPerMonth;
  const platformFees = grossMonthlyRevenue * (inputs.platformFeesPercent / 100);
  const netMonthlyRevenue = grossMonthlyRevenue - platformFees;
  const annualNetRevenue = netMonthlyRevenue * 12;

  // Cleaning turns — use avg stay length if provided (A5)
  const avgStayNights = (inputs.avgStayLengthNights && inputs.avgStayLengthNights > 0) ? inputs.avgStayLengthNights : 3;
  const cleaningTurnsPerMonth = (nightsPerMonth * (inputs.occupancyPercent / 100)) / avgStayNights;
  const monthlyCleaningCost = cleaningTurnsPerMonth * (inputs.cleaningCostPerStay ?? 0);
  const monthlyLinenCost = cleaningTurnsPerMonth * (inputs.linenCostPerStay ?? 0);

  const grossRent = netMonthlyRevenue;
  const voidAllowanceAmount = grossRent * (inputs.voidAllowancePercent / 100);
  const effectiveRent = grossRent - voidAllowanceAmount;
  const managementFeeAmount = effectiveRent * (inputs.managementFeePercent / 100);
  const groundRentMonthly = inputs.groundRentAnnual / 12;
  // Fixed additional monthly costs (independent of occupancy)
  const saFixedAdditional = (inputs.billsUtilities ?? 0) + (inputs.consumablesMonthly ?? 0) + (inputs.councilTaxMonthly ?? 0) + (inputs.channelManagerMonthly ?? 0) + (inputs.additionalMonthlyCosts ?? 0);
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly + monthlyCleaningCost + monthlyLinenCost + saFixedAdditional;
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgage;
  const annualNetCashFlow = netCashFlow * 12;

  const grossYield = inputs.purchasePrice > 0 ? (annualNetRevenue / inputs.purchasePrice) * 100 : 0;
  const netYield = inputs.purchasePrice > 0 ? (netOperatingIncome * 12 / inputs.purchasePrice) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualNetCashFlow / totalCashInvested) * 100 : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  // Fixed costs for break-even (excludes variable cleaning/linen which scale with occupancy)
  const fixedCostsSA = inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly + saFixedAdditional;
  const breakEvenRent = (inputs.voidAllowancePercent < 100 && inputs.managementFeePercent < 100)
    ? (monthlyMortgage + fixedCostsSA) / ((1 - inputs.voidAllowancePercent / 100) * (1 - inputs.managementFeePercent / 100))
    : 0;
  const netNightlyRate = inputs.nightlyRate * (1 - inputs.platformFeesPercent / 100);
  const breakEvenOccupancy = (netNightlyRate * 30.42 * (1 - inputs.managementFeePercent / 100)) > 0
    ? ((monthlyMortgage + fixedCostsSA) / (netNightlyRate * 30.42 * (1 - inputs.managementFeePercent / 100))) * 100
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
    breakEvenOccupancy,
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
  leaseLengthMonths?: number;
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
  additionalMonthlyCosts?: number;
}

export function calculateR2R(inputs: R2RInputs) {
  const grossMonthlyIncome = inputs.rooms * inputs.rentPerRoom * (inputs.occupancyRate / 100);
  const managementFees = grossMonthlyIncome * (inputs.managementFeesPercent / 100);
  const netMonthlyIncome = grossMonthlyIncome - managementFees;
  const monthlyProfit = netMonthlyIncome - inputs.monthlyRentPaid - inputs.monthlyRunningCosts;
  const annualProfit = monthlyProfit * 12;
  const annualGrossIncome = grossMonthlyIncome * 12;
  const roi = inputs.setupCosts > 0 ? (annualProfit / inputs.setupCosts) * 100 : 0;
  const spreadPerRoom = inputs.rooms > 0
    ? (grossMonthlyIncome - inputs.monthlyRentPaid) / inputs.rooms
    : 0;
  const breakEvenMonths = monthlyProfit > 0 ? inputs.setupCosts / monthlyProfit : Infinity;
  const leaseBreakEvenRisk = inputs.leaseLengthMonths && inputs.leaseLengthMonths > 0 && breakEvenMonths !== Infinity
    ? breakEvenMonths > inputs.leaseLengthMonths * 0.6
    : false;
  const fixedCostsR2R = inputs.monthlyRentPaid + inputs.monthlyRunningCosts;
  const netRentPerRoom = inputs.rentPerRoom * (1 - inputs.managementFeesPercent / 100);
  const occupancyBreakEven = (inputs.rooms > 0 && netRentPerRoom > 0)
    ? (fixedCostsR2R / (inputs.rooms * netRentPerRoom)) * 100
    : 0;

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
    spreadPerRoom,
    breakEvenMonths,
    leaseBreakEvenRisk,
    occupancyBreakEven,
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
  const totalOperatingCosts = managementFeeAmount + inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly + (inputs.additionalMonthlyCosts ?? 0);
  const netOperatingIncome = effectiveRent - totalOperatingCosts;
  const netCashFlow = netOperatingIncome - monthlyMortgage;
  const annualNetCashFlow = netCashFlow * 12;

  const grossYield = inputs.purchasePrice > 0 ? (inputs.leaseIncomePerMonth * 12 / inputs.purchasePrice) * 100 : 0;
  const netYield = inputs.purchasePrice > 0 ? (netOperatingIncome * 12 / inputs.purchasePrice) * 100 : 0;
  const cashOnCashROI = totalCashInvested > 0 ? (annualNetCashFlow / totalCashInvested) * 100 : 0;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const fixedCostsSocial = inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly + (inputs.additionalMonthlyCosts ?? 0);
  const breakEvenRent = (inputs.voidAllowancePercent < 100 && inputs.managementFeePercent < 100)
    ? (monthlyMortgage + fixedCostsSocial) / ((1 - inputs.voidAllowancePercent / 100) * (1 - inputs.managementFeePercent / 100))
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

  const totalLeaseIncome = inputs.leaseIncomePerMonth * 12 * inputs.leaseLengthYears;
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
    totalLeaseIncome,
    leaseLengthYears: inputs.leaseLengthYears,
  };
}

export function calculateBRRR(inputs: BRRRInputs) {
  const totalCostIn = inputs.purchasePrice + inputs.stampDuty + inputs.refurbCost + inputs.otherCosts;
  const refinanceLoan = inputs.postRefurbValue * (inputs.refinancePercent / 100);
  const refinanceArrangementFeeAmount = refinanceLoan * ((inputs.refinanceArrangementFeePercent ?? 0) / 100);
  const cashLeftInDeal = totalCostIn - refinanceLoan + refinanceArrangementFeeAmount;
  const equityCreated = inputs.postRefurbValue - inputs.purchasePrice - inputs.stampDuty - inputs.refurbCost - inputs.otherCosts;
  const refinanceMortgageType: MortgageType = inputs.refinanceMortgageType ?? 'IO';
  const refinanceMortgageTerm: number = inputs.refinanceMortgageTerm ?? 25;
  const monthlyMortgage = calculateMonthlyMortgagePayment(
    refinanceLoan,
    inputs.newMortgageRate,
    refinanceMortgageTerm,
    refinanceMortgageType,
  );
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
  const moneyOut = cashLeftInDeal < 1;
  const cashOnCashROI = !moneyOut
    ? (annualNetCashFlow / cashLeftInDeal) * 100
    : annualNetCashFlow > 0
    ? Infinity
    : -Infinity;
  const monthlyCashFlow = netCashFlow;
  const annualCashFlow = annualNetCashFlow;
  const fixedCostsBRRR = inputs.maintenanceReserve + inputs.buildingsInsurance + inputs.serviceCharge + groundRentMonthly;
  const breakEvenRent = (inputs.voidAllowancePercent < 100 && inputs.managementFeePercent < 100)
    ? (monthlyMortgage + fixedCostsBRRR) / ((1 - inputs.voidAllowancePercent / 100) * (1 - inputs.managementFeePercent / 100))
    : 0;
  const paybackPeriod = annualNetCashFlow <= 0 ? Infinity : moneyOut ? -1 : cashLeftInDeal / annualNetCashFlow;

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

export type DealScoreInput =
  | { strategy: 'BTL'; cashOnCashROI: number; monthlyCashFlow: number; grossYield: number }
  | { strategy: 'HMO'; cashOnCashROI: number; monthlyCashFlow: number; grossYield: number; cashFlowPerRoom: number }
  | { strategy: 'SA'; cashOnCashROI: number; monthlyCashFlow: number; netYield: number; breakEvenOccupancy: number }
  | { strategy: 'FLIP'; roi: number; netProfit: number; annualisedROI: number }
  | { strategy: 'BRRR'; cashLeftInDeal: number; moneyOut: boolean; monthlyCashFlow: number; cashOnCashROI: number; equityUpliftPct: number }
  | { strategy: 'R2R'; monthlyProfit: number; roi: number; spreadPerRoom: number; occupancyBreakEven: number }
  | { strategy: 'SOCIAL'; cashOnCashROI: number; monthlyCashFlow: number; grossYield: number; leaseLengthYears: number };

export interface DealScoreResult {
  score: number;
  verdict: 'RECOMMENDED' | 'REVIEW' | 'AVOID';
  dimensions: {
    label: string;
    value: number;
    points: number;
    maxPoints: number;
    strongThreshold: string;
    averageThreshold: string;
  }[];
}

function interpolate(value: number, weakThreshold: number, strongThreshold: number, maxPoints: number, invert = false): number {
  if (invert) {
    // Lower is better: value <= strongThreshold = full points, value >= weakThreshold = 0 points
    if (value <= strongThreshold) return maxPoints;
    if (value >= weakThreshold) return 0;
    return Math.round(maxPoints * (weakThreshold - value) / (weakThreshold - strongThreshold));
  } else {
    if (value >= strongThreshold) return maxPoints;
    if (value <= 0) return 0;
    if (value >= weakThreshold) {
      return Math.round((maxPoints / 2) + (maxPoints / 2) * (value - weakThreshold) / (strongThreshold - weakThreshold));
    }
    return Math.round((maxPoints / 2) * (value / weakThreshold));
  }
}

export function calculateDealScore(input: DealScoreInput): DealScoreResult {
  let dimensions: DealScoreResult['dimensions'] = [];
  let totalPoints = 0;

  if (input.strategy === 'BTL') {
    const cocPts = interpolate(input.cashOnCashROI, 3, 8, 45);
    const cfPts = interpolate(input.monthlyCashFlow, 100, 300, 30);
    const yieldPts = interpolate(input.grossYield, 5, 7, 25);
    dimensions = [
      { label: 'Cash-on-Cash ROI', value: input.cashOnCashROI, points: cocPts, maxPoints: 45, strongThreshold: '≥ 8%', averageThreshold: '≥ 3%' },
      { label: 'Monthly Cash Flow', value: input.monthlyCashFlow, points: cfPts, maxPoints: 30, strongThreshold: '≥ £300', averageThreshold: '≥ £100' },
      { label: 'Gross Yield', value: input.grossYield, points: yieldPts, maxPoints: 25, strongThreshold: '≥ 7%', averageThreshold: '≥ 5%' },
    ];
    totalPoints = cocPts + cfPts + yieldPts;
  }

  else if (input.strategy === 'HMO') {
    const cocPts = interpolate(input.cashOnCashROI, 8, 15, 35);
    const cfPts = interpolate(input.monthlyCashFlow, 500, 800, 25);
    const yieldPts = interpolate(input.grossYield, 8, 12, 20);
    const cfrPts = interpolate(input.cashFlowPerRoom, 150, 250, 20);
    dimensions = [
      { label: 'Cash-on-Cash ROI', value: input.cashOnCashROI, points: cocPts, maxPoints: 35, strongThreshold: '≥ 15%', averageThreshold: '≥ 8%' },
      { label: 'Monthly Cash Flow', value: input.monthlyCashFlow, points: cfPts, maxPoints: 25, strongThreshold: '≥ £800', averageThreshold: '≥ £500' },
      { label: 'Gross Yield', value: input.grossYield, points: yieldPts, maxPoints: 20, strongThreshold: '≥ 12%', averageThreshold: '≥ 8%' },
      { label: 'Cash Flow Per Room', value: input.cashFlowPerRoom, points: cfrPts, maxPoints: 20, strongThreshold: '≥ £250/room', averageThreshold: '≥ £150/room' },
    ];
    totalPoints = cocPts + cfPts + yieldPts + cfrPts;
  }

  else if (input.strategy === 'FLIP') {
    const roiPts = interpolate(input.roi, 8, 15, 40);
    const profitPts = interpolate(input.netProfit, 18000, 30000, 35);
    const annPts = interpolate(input.annualisedROI, 12, 25, 25);
    dimensions = [
      { label: 'Total ROI', value: input.roi, points: roiPts, maxPoints: 40, strongThreshold: '≥ 15%', averageThreshold: '≥ 8%' },
      { label: 'Net Profit', value: input.netProfit, points: profitPts, maxPoints: 35, strongThreshold: '≥ £30,000', averageThreshold: '≥ £18,000' },
      { label: 'Annualised ROI', value: input.annualisedROI, points: annPts, maxPoints: 25, strongThreshold: '≥ 25%', averageThreshold: '≥ 12%' },
    ];
    totalPoints = roiPts + profitPts + annPts;
  }

  else if (input.strategy === 'SA') {
    const cocPts = interpolate(input.cashOnCashROI, 8, 20, 35);
    const cfPts = interpolate(input.monthlyCashFlow, 500, 800, 25);
    const yieldPts = interpolate(input.netYield, 7, 12, 20);
    const bePts = interpolate(input.breakEvenOccupancy, 65, 50, 20, true);
    dimensions = [
      { label: 'Cash-on-Cash ROI', value: input.cashOnCashROI, points: cocPts, maxPoints: 35, strongThreshold: '≥ 20%', averageThreshold: '≥ 8%' },
      { label: 'Monthly Cash Flow', value: input.monthlyCashFlow, points: cfPts, maxPoints: 25, strongThreshold: '≥ £800', averageThreshold: '≥ £500' },
      { label: 'Net Yield', value: input.netYield, points: yieldPts, maxPoints: 20, strongThreshold: '≥ 12%', averageThreshold: '≥ 7%' },
      { label: 'Occupancy Break-Even', value: input.breakEvenOccupancy, points: bePts, maxPoints: 20, strongThreshold: '≤ 50%', averageThreshold: '≤ 65%' },
    ];
    totalPoints = cocPts + cfPts + yieldPts + bePts;
  }

  else if (input.strategy === 'BRRR') {
    const cashLeftValue = input.moneyOut ? 0 : input.cashLeftInDeal;
    const cashLeftPts = interpolate(cashLeftValue, 25000, 5000, 35, true);
    const cfPts = interpolate(input.monthlyCashFlow, 0, 300, 25);
    const equityPts = interpolate(input.equityUpliftPct, 10, 20, 25);
    const cocValue = input.cashOnCashROI === Infinity ? 100 : input.cashOnCashROI === -Infinity ? -100 : input.cashOnCashROI;
    const cocPts = interpolate(cocValue, 5, 15, 15);
    dimensions = [
      { label: 'Cash Left in Deal', value: cashLeftValue, points: cashLeftPts, maxPoints: 35, strongThreshold: '≤ £5,000 (or money out)', averageThreshold: '≤ £25,000' },
      { label: 'Monthly Cash Flow', value: input.monthlyCashFlow, points: cfPts, maxPoints: 25, strongThreshold: '≥ £300', averageThreshold: '≥ £0' },
      { label: 'Equity Uplift', value: input.equityUpliftPct, points: equityPts, maxPoints: 25, strongThreshold: '≥ 20%', averageThreshold: '≥ 10%' },
      { label: 'Cash-on-Cash ROI', value: input.cashOnCashROI, points: cocPts, maxPoints: 15, strongThreshold: '≥ 15% (or ∞)', averageThreshold: '≥ 5%' },
    ];
    totalPoints = cashLeftPts + cfPts + equityPts + cocPts;
  }

  else if (input.strategy === 'R2R') {
    const profitPts = interpolate(input.monthlyProfit, 200, 800, 35);
    const roiPts = interpolate(input.roi, 25, 75, 30);
    const spreadPts = interpolate(input.spreadPerRoom, 100, 250, 20);
    const bePts = interpolate(input.occupancyBreakEven, 75, 60, 15, true);
    dimensions = [
      { label: 'Monthly Profit', value: input.monthlyProfit, points: profitPts, maxPoints: 35, strongThreshold: '≥ £800', averageThreshold: '≥ £200' },
      { label: 'ROI on Setup', value: input.roi, points: roiPts, maxPoints: 30, strongThreshold: '≥ 75%', averageThreshold: '≥ 25%' },
      { label: 'Spread Per Room', value: input.spreadPerRoom, points: spreadPts, maxPoints: 20, strongThreshold: '≥ £250', averageThreshold: '≥ £100' },
      { label: 'Occupancy Break-Even', value: input.occupancyBreakEven, points: bePts, maxPoints: 15, strongThreshold: '≤ 60%', averageThreshold: '≤ 75%' },
    ];
    totalPoints = profitPts + roiPts + spreadPts + bePts;
  }

  else if (input.strategy === 'SOCIAL') {
    const cocPts = interpolate(input.cashOnCashROI, 2, 6, 35);
    const cfPts = interpolate(input.monthlyCashFlow, 50, 200, 25);
    const yieldPts = interpolate(input.grossYield, 4, 6, 20);
    const leasePts = interpolate(input.leaseLengthYears, 5, 10, 20);
    dimensions = [
      { label: 'Cash-on-Cash ROI', value: input.cashOnCashROI, points: cocPts, maxPoints: 35, strongThreshold: '≥ 6%', averageThreshold: '≥ 2%' },
      { label: 'Monthly Cash Flow', value: input.monthlyCashFlow, points: cfPts, maxPoints: 25, strongThreshold: '≥ £200', averageThreshold: '≥ £50' },
      { label: 'Gross Yield', value: input.grossYield, points: yieldPts, maxPoints: 20, strongThreshold: '≥ 6%', averageThreshold: '≥ 4%' },
      { label: 'Lease Length', value: input.leaseLengthYears, points: leasePts, maxPoints: 20, strongThreshold: '≥ 10 years', averageThreshold: '≥ 5 years' },
    ];
    totalPoints = cocPts + cfPts + yieldPts + leasePts;
  }

  const score = Math.min(100, Math.max(0, totalPoints));
  const verdict: DealScoreResult['verdict'] =
    score >= 65 ? 'RECOMMENDED' :
    score >= 40 ? 'REVIEW' :
    'AVOID';

  return { score, verdict, dimensions };
}
