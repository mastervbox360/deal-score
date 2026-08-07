REPLIT PROMPT — Prompt 2 follow-up: verify ProPlus cover headline metric
Branch: production-candidate

CONTEXT: In the new editorial cover for DealScorePDFProPlus.tsx, the key
stats line uses `heroMetrics[0]` instead of the portrait file's
`coverKeyMetric` logic, because `computeCoverKeyMetric` wasn't exported
from DealScorePDF.tsx. This needs checking — `coverKeyMetric` was
specifically built to show the correct headline number per strategy
(e.g. Net Profit for Flip, Cash Flow for BTL), and `heroMetrics[0]` may
not carry the same per-strategy logic. Do not assume it's equivalent —
verify directly.

---

STEP 1 — Find and read both definitions

1. Find where `computeCoverKeyMetric` is defined in DealScorePDF.tsx.
   Read the full function and note, for each of the 7 strategies
   (BTL, HMO, FLIP, SA, BRRR, R2R, SOCIAL), exactly which value and
   label it returns.

2. Find where `heroMetrics` is defined/computed in
   DealScorePDFProPlus.tsx. Read the full logic and note what
   `heroMetrics[0]` actually resolves to for each of the same 7
   strategies.

3. Write out a direct side-by-side comparison, strategy by strategy:
   what `coverKeyMetric` shows vs what `heroMetrics[0]` shows. Flag
   every strategy where they differ.

---

STEP 2 — Generate real proof, not just code-reading

For at least Flip and one other strategy (BTL or HMO), generate an
actual PDF from DealScorePDFProPlus.tsx using realistic populated
inputs, and report the exact label and value that appears in the cover's
key stats line for each. Do the same for DealScorePDF.tsx (portrait)
with the same two strategies, so we have a direct before/after
comparison across both formats.

---

STEP 3 — Fix if needed

If `heroMetrics[0]` shows a different or less appropriate headline
number than `coverKeyMetric` would for any strategy, the correct fix is
to export `computeCoverKeyMetric` from DealScorePDF.tsx (or move it to a
shared location both files import from) and use it in
DealScorePDFProPlus.tsx instead of `heroMetrics[0]` — do not write a
second, separate implementation that could drift from the original.

If they turn out to be equivalent for all 7 strategies, no code change
is needed — just report the confirmation.

---

VERIFICATION (only if you made changes in Step 3)

1. `npx tsc --noEmit` — zero errors.
2. `git status` — confirm only the expected files changed.
3. Do NOT push. Report back:
   - The strategy-by-strategy comparison table from Step 1
   - The actual generated PDF output from Step 2 for both strategies,
     both formats
   - Whether a fix was needed, and if so, exactly what changed
