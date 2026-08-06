# Replit Agent Prompt — Fix: R2R PDF Shows "Setup Costs" Instead of True Total Cash Invested

**Branch: confirm you are on `production-candidate` before making any changes. This is a small, standalone fix.**

## The bug

Every place `DealScorePDF.tsx` and `DealScorePDFProPlus.tsx` display R2R's committed-capital figure, they use `props.r2rInputs.setupCosts` (the raw setup cost input) labelled as **"Setup Costs"** — but the actual R2R return on investment shown right next to it (`props.r2rResults.roi`, labelled "Net Return on Setup Costs" / "Net Return on Setup") is calculated in `calculations.ts` against `r2rResults.totalCashInvested`, which equals `setupCosts + landlordDeposit + sourcingFee` — a larger figure. The result: the percentage shown and the pound figure shown next to it don't reconcile with each other, since landlord deposit and sourcing fee are baked into the ROI% but missing from the displayed cash figure it's supposedly based on.

The payback period calculation has the same problem — it divides `props.r2rInputs.setupCosts` by monthly profit, when it should divide the true total cash invested by monthly profit, understating the real payback period.

## What to do

Read `DealScorePDF.tsx` and `DealScorePDFProPlus.tsx` in full, specifically every place `props.r2rInputs.setupCosts` is used as a displayed cash figure or in a calculation (not just referenced as a sub-component). For each:

1. **Where it's shown as the headline committed-capital figure** (the large "Setup Costs" number near the ROI/return figures, and in any label/value breakdown row that's presenting it as "what's invested"): rename the label from "Setup Costs" to **"Total Cash Invested"** and change the value from `props.r2rInputs.setupCosts` to `props.r2rResults.totalCashInvested`.

2. **In the payback period calculation** (`paybackMonths = ... Math.ceil(props.r2rInputs.setupCosts / r.monthlyProfit) ...`, appears in both files): change the numerator from `props.r2rInputs.setupCosts` to `props.r2rResults.totalCashInvested` so the payback period reflects true capital recovery time.

3. **In the narrative/summary sentence** ("Setup costs of £X recover in Y months"): update both the wording and the figure to reflect total cash invested, e.g. "Total cash invested of £X recovers in Y months" — keep it natural, matching the existing sentence style.

4. **Where `setupCosts` is shown as its own distinct line item alongside other cost components** (if there's a breakdown row structure similar to what was just added for BTL/HMO/SA/Social's Sourcing Fee row): consider keeping "Setup Costs" as its own row for transparency, and add **Landlord Deposit** and **Sourcing Fee** (when > 0) as their own rows too, with a **Total Cash Invested** row summing all three — matching the pattern used in the BTL-style breakdown fixed last session, rather than just silently swapping one number for another. Use your judgement on whether the existing layout has room for this fuller breakdown or whether a simpler swap (just correct the single headline figure) is the better fit — flag which approach you took in your summary.

5. Do not change anything for BTL, HMO, SA, Social, BRRR, or Flip in this prompt — this is scoped to R2R only.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Generate a PDF for an R2R deal with a non-zero landlord deposit and sourcing fee, and confirm the total cash invested figure shown now equals `setupCosts + landlordDeposit + sourcingFee`, and that this figure is consistent everywhere it appears in the pack (headline box, any breakdown table, payback period, narrative sentence).
4. Do not push automatically — report back what changed, the `tsc` result, and a screenshot/PDF excerpt showing the corrected R2R figures, and I'll verify before you push to `production-candidate`.
