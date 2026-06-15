# REPLIT PROMPT 9 — Wire New Inputs into Calculation Engine
> Run AFTER Prompt 8 is complete and tsc passes. Touches calculations.ts and any related type files.

---

## Files to read in full before touching anything

```
artifacts/dealscore/src/lib/calculations.ts
artifacts/dealscore/src/components/AnalysisHub.tsx  (parseInputs function only)
```

Read both in full. Do not touch anything until you have read them.

---

## Context

Prompts 6–8 added many new input fields to the UI. This prompt wires them into the calculation engine so they affect the actual results. Some fields are already partially wired (e.g. `serviceChargeMonthly`, `groundRentAnnual` may exist in the old calc). Check for each field before adding — do not duplicate.

All new fields come from `deal.inputs` via the `parseInputs` function in AnalysisHub.tsx, which builds the `ParsedInputs` object that `calculations.ts` receives.

---

## Priority order — implement in this order

### GROUP A — Calculation-critical (materially affects results)

**A1. Total purchase costs — add explicit cost line items**

In the calculation of `totalCashInvested` / `totalPurchaseCosts`, add:
- `solicitorFee` — add to total purchase costs
- `surveyCost` — add to total purchase costs
- `brokerFee` — add to total purchase costs
- `sourcingFeePaid` — add to total purchase costs
- `mortgageArrangementFee` — add to total purchase costs (also apply to BRRR refinance separately)
- `auctionBuyersPremiumPercent` × purchase price — conditional on `isAuctionPurchase`
- `auctionReservationFee` — conditional on `isAuctionPurchase`
- `leaseExtensionCost` — conditional on `tenure === 'Leasehold'`
- `epcImprovementCost` — add to total upfront costs
- `flipPlanningCost` — FLIP only: add to total project costs

**A2. Bridging finance costs**

For any strategy where `purchaseFinanceMethod === 'Bridging'` (or `flipPurchaseFinanceMethod === 'Bridging'`):
```
bridgingLoanAmount = purchasePrice * (bridgingLTV / 100)
bridgingInterestCost = bridgingLoanAmount * (bridgingRateMonthly / 100) * bridgingTermMonths
bridgingArrangementCostAmount = bridgingLoanAmount * (bridgingArrangementFeePercent / 100)
bridgingExitCostAmount = bridgingLoanAmount * (bridgingExitFeePercent / 100)
totalBridgingCost = bridgingInterestCost + bridgingArrangementCostAmount + bridgingExitCostAmount
```
Add `totalBridgingCost` to `totalCashInvested` (or `totalProjectCost` for FLIP).

**A3. BRRR purchase bridging**

For BRRR, the purchase bridging cost should be calculated the same way as A2 but using `brrrInputs.purchaseBridgingRate`, `purchaseBridgingTermMonths`, `purchaseBridgingLTV`, `purchaseBridgingArrangementFee`, `purchaseBridgingExitFee`. Add to `totalCashInvested`.

**A4. BRRR refinance arrangement fee**

```
refinanceLoanAmount = postRefurbValue * (refinancePercent / 100)
refinanceArrangementFeeAmount = refinanceLoanAmount * (brrrInputs.refinanceArrangementFeePercent / 100)
```
Subtract `refinanceArrangementFeeAmount` from the money-out calculation (it reduces the equity released).

**A5. SA cleaning turns per month — use avg stay length**

If `saInputs.avgStayLengthNights` is provided:
```
cleaningTurnsPerMonth = (30 * saInputs.occupancyPercent / 100) / saInputs.avgStayLengthNights
monthlyCleaningCost = cleaningTurnsPerMonth * saInputs.cleaningCostPerStay
```
Replace any fixed cleaning cost calculation with this formula. If `avgStayLengthNights` is not set, fall back to the existing behaviour.

**A6. SA additional costs**

Add to SA monthly costs:
- `saInputs.linenCostPerStay × cleaningTurnsPerMonth` → monthly linen cost
- `saInputs.consumablesMonthly` → direct monthly deduction
- `saInputs.councilTaxMonthly` → direct monthly deduction
- `saInputs.channelManagerMonthly` → direct monthly deduction
- `saInputs.furnishingSetupCost` → add to `totalCashInvested` (one-off)

**A7. HMO additional costs**

Add to HMO monthly costs:
- `hmoInputs.councilTaxMonthly` → direct monthly deduction

Add to HMO `totalCashInvested`:
- `hmoInputs.fireComplianceCost` → one-off compliance cost

**A8. Monthly costs — new shared fields**

Add these to monthly operating costs for all Buy strategies:
- `landlordInsuranceMonthly` — monthly deduction
- `rentGuaranteeInsurance` — monthly deduction
- `legalExpensesInsurance / 12` — monthly deduction (stored as annual)
- `annualComplianceCosts / 12` — monthly deduction (stored as annual)
- `councilTaxVoids` — monthly deduction (applies during void periods proportionally)
- `serviceChargeMonthly` — conditional on leasehold (may already exist — check before adding)
- `groundRentAnnual / 12` — conditional on leasehold (may already exist — check before adding)

**A9. R2R lease length — fix leaseBreakEvenRisk**

`leaseLengthMonths` is now captured as `r2rInputs.leaseLengthMonths`. Wire it into the `leaseBreakEvenRisk` calculation. The existing logic uses `leaseLengthMonths` but the value was never populated — it should now flow through from the UI.

**A10. BTL initial void period**

Add initial void cost to `totalCashInvested`:
```
initialVoidCost = (btlInputs.initialVoidWeeks / 4) * monthlyMortgageCost
```
(The mortgage must still be paid during the initial void before the first tenant.)

---

### GROUP B — Display/scoring (affects results shown, not underlying P&L)

**B1. BMV% calculation**

If `askingPrice > 0` and `purchasePrice > 0`:
```
bmvPercent = ((askingPrice - purchasePrice) / askingPrice) * 100
```
Add `bmvPercent` to the results object so it can be displayed in ViewResults and the deal score.

**B2. ICR stress test**

Calculate and expose in results:
```
stressTestRate = 0.055  // 5.5% industry standard
monthlyStressPayment = (purchasePrice * (1 - depositPercent/100)) * (stressTestRate / 12)
icrMultiplier = monthlyRent / monthlyStressPayment
icrRequirement = ownershipStructure === 'Ltd company' ? 1.25 : 1.45
passesICR = icrMultiplier >= icrRequirement
```
Add `icrMultiplier`, `icrRequirement`, `passesICR` to results.

**B3. Section 24 net yield**

If `ownershipStructure === 'Personal name'` and `purchaseFinanceMethod !== 'Cash'`:
```
annualMortgageInterest = mortgageLoanAmount * (mortgageRate / 100)
section24TaxCredit = annualMortgageInterest * 0.20
taxableProfit = annualRentalIncome - (annualCosts - annualMortgageInterest)
incomeTaxRate = incomeTaxBand === '40%' ? 0.40 : incomeTaxBand === '45%' ? 0.45 : 0.20
taxLiability = (taxableProfit * incomeTaxRate) - section24TaxCredit
netProfitAfterTax = annualRentalIncome - annualCosts - taxLiability
```
Add `netProfitAfterTax` and `effectiveTaxRate` to results.

---

### GROUP C — Risk flags (no calc, just boolean output)

Add these to the results/risk object:

```ts
riskFlags: {
  doubling_ground_rent: groundRentReviewClause === 'Doubling',
  non_standard_construction: constructionType !== 'Standard (brick/block)',
  epc_below_c: ['D','E','F','G'].includes(epcRating?.toUpperCase()),
  article_4_area: hmoInputs?.article4Area === true,
  flood_risk_high: floodRisk === 'High',
  listed_building: listedStatus !== 'None',
  r2r_no_sublet_right: activeTile === 'r2r' && !r2rInputs?.rightToSubletConfirmed,
  r2r_no_mortgage_consent: activeTile === 'r2r' && !r2rInputs?.landlordMortgageConsentObtained,
  sa_licence_required: saInputs?.licenceRequired === true,
  fails_icr: !passesICR,
}
```

---

## STEP — After making all changes

1. Run `npx tsc --noEmit` — zero errors required
2. Manual test: open a BTL deal, add a bridging finance method, check that bridging costs appear in the results total cash invested. Add solicitor/survey fees and confirm they're included.
3. Open an HMO deal, add council tax and fire compliance costs — confirm they affect monthly cash flow and total cash invested respectively.
4. Open an R2R deal, enter lease length — confirm `leaseBreakEvenRisk` now evaluates.
5. Commit: `git add -A && git commit -m "feat: calc engine — bridging costs, SA linen+council tax, HMO fire+council tax, BTL void, R2R lease length fix, BMV%, ICR stress test, Section 24 modelling, risk flags" && git push origin stage-6`
6. Report which calculation functions were changed and what was added to each

---

## Important notes for the agent

- Check whether `serviceChargeMonthly` and `groundRentAnnual` are ALREADY in `calculations.ts` before adding — the audit confirms they were in the original code. If they exist, just ensure they're reading from the correct input path.
- The `parseInputs` function in AnalysisHub.tsx converts `deal.inputs` into a typed `ParsedInputs` object. New fields need to be added there too — read it carefully and add the new fields with correct fallbacks to 0 / '' / false.
- Do not change the calculation function signatures in a way that breaks the existing Results, Sensitivity, or Workings views.
- All monetary results should remain in £ (not £000s). Do not change units.
