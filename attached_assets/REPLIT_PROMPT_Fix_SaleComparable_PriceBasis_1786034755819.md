# Replit Agent Prompt — Fix: Sale Comparable Price/m² Must Compare Against the Right Reference Price Per Strategy

**Branch: confirm you are on `production-candidate`.**

## The problem

Sale comparables currently always compare against the subject's **purchase price per m²**, regardless of strategy. This is correct for BTL, HMO, SA, and Social (where "is this comparable evidence the purchase price is fair" is exactly the right question) — but wrong for two strategies, and inapplicable to a third:

- **Flip**: the deal is intentionally bought below market and sold at market — a sold comparable at market rate should be validating the **expected sale price (GDV)**, not the purchase price. Comparing against purchase price will always show a large, misleading gap on a genuinely good flip, making strong comparables score as weak evidence.
- **BRRR**: similarly, the comparable should validate the **post-refurb value**, not the purchase price, since that's the figure the deal's viability actually depends on (refinance is based on post-refurb value, not purchase price).
- **R2R**: there is no purchase price at all in this strategy (it's rent-to-rent — no property purchase, just setup costs and a landlord deposit). A sale comparable's price/m² factor has nothing valid to compare against here and should be marked unavailable, not silently compared against something meaningless.

## What to do

### Step 1 — Update the subject's price/m² basis by strategy

In `Home.tsx`, where `subjectCtx` is built, change how `pricePerSqM` is computed so it reflects the correct reference price per `dealType`:

- `FLIP`: `flipInputs.expectedSalePrice / effectiveFloorAreaSqM`
- `BRRR`: `brrrInputs.postRefurbValue / effectiveFloorAreaSqM`
- `R2R`: `null` (no valid reference price — see Step 2 for how this should be handled downstream)
- `BTL`, `HMO`, `SA`, `SOCIAL`: unchanged — `purchasePrice / effectiveFloorAreaSqM` as it currently works

Guard against division by zero / missing floor area the same way the existing calculation already does.

### Step 2 — Handle the unavailable case in the scoring engine

In `comparableScoring.ts`, for `type: 'sale'` comparables, if `subject.pricePerSqM` is `null` (i.e. R2R), mark the price/m² proximity factor as `unavailable` — following the exact same pattern already used for SA's `rentMetricUnavailable` on let comparables (exclude it from the weighted average, redistribute the remaining weight proportionally, don't produce NaN). Add a corresponding `priceMetricUnavailable` flag to the result shape, mirroring `rentMetricUnavailable`.

### Step 3 — Clarify the factor label in the UI so it's not misleading

Currently the breakdown shows a factor labelled something like "Price/m² proximity" regardless of strategy — but for Flip and BRRR, this is genuinely comparing against a different reference price than for other strategies, and a sourcer reading the breakdown should know which one. Update the factor label dynamically based on `dealType`:

- `FLIP`: "Exit price/m² proximity" (or similar wording — comparing against expected sale price)
- `BRRR`: "Post-refurb price/m² proximity" (comparing against post-refurb value)
- `R2R`: show the "unavailable" state with a note, e.g. "Price comparison not applicable for Rent-to-Rent deals"
- All others: keep the existing "Price/m² proximity" wording, unchanged

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Test on a Flip deal with a comparable sold near the expected sale price/m² — confirm it now scores as a strong price match (previously would have shown a large, misleading gap against purchase price).
4. Test on a BRRR deal similarly, against post-refurb value.
5. Test on an R2R deal with a sale-type comparable — confirm the price factor shows as unavailable with a clear note, and the overall score is computed sensibly from the remaining factors, no NaN.
6. Confirm BTL/HMO/SA/Social comparables are completely unaffected — same behaviour as before this fix.
7. Do not push automatically — report back what changed, the `tsc` result, and screenshots showing the corrected factor labels/values for a Flip and a BRRR test case, and I'll verify before you push to `production-candidate`.
