# Replit Agent Prompt — Fix: Sourcing Fee Missing From PDF Cash-Invested Breakdown

**Branch: confirm you are on `production-candidate` before making any changes. This is a small, standalone fix — unrelated to the comparables work in progress.**

## The bug

A real deal was tested end-to-end (BTL, £250,000 purchase, £5,000 sourcing fee). The generated PDF shows **two different "Total Cash Invested" figures for the same deal**:

- Cover page and "What I Commit" panel: **£92,450** (correct — includes the £5,000 sourcing fee, matching the calculations.ts fix from the previous session)
- A page titled "Deal Inputs" (or similarly named — locate it by its itemised breakdown showing Deposit / LTT / Refurb Cost rows followed by a TOTAL row): itemises **Deposit £62,500 + LTT £14,950 + Refurb Cost £10,000 = £87,450** — missing the £5,000 sourcing fee entirely, so it under-totals by exactly that amount.

Separately, the **Glossary/Formulas page's definition text for "Cash Invested"** still reads "Deposit + Tax + Refurb + Other Costs" — also missing sourcing fee from the explanation, even though the actual calculation now includes it.

## What to do

1. Read `DealScorePDF.tsx` and `DealScorePDFProPlus.tsx` in full. Locate the itemised cash-invested breakdown section described above in **both** files (check both — the bug was found in one generated pack, but the same stale breakdown logic may exist in both PDF components since they likely share a similar structure here).
2. Add a **Sourcing Fee** row to that breakdown, positioned alongside the existing Deposit/LTT/Refurb Cost/Other Costs rows, shown conditionally (only when `sourcingFee > 0`, matching the pattern already used for the Sourcing Fee row in Show Workings from the previous session's work). Update the TOTAL row calculation in that section so it actually sums to match the cover page / "What I Commit" figure — do not just add a display row without checking the underlying total calculation in that specific breakdown component actually includes it.
3. Update the Glossary/Formulas page's "Cash Invested" definition text in both files, from "Deposit + Tax + Refurb + Other Costs" to "Deposit + Tax + Refurb + Other Costs + Sourcing Fee" (or the equivalent wording already used, keep the existing style/formatting — just add the missing term).
4. **Check whether this same stale-breakdown pattern exists for any other strategy's equivalent page** (HMO, SA, BRRR, Flip, R2R, Social) — not just BTL, since sourcing fee was added to all 7 calculation formulas in the previous session, and if BTL's breakdown box was missed, the same box for other strategies may have been missed too. Fix all of them, not just BTL, if the same gap exists.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Regenerate a PDF for the same BTL test deal (or similar) and confirm the Deal Inputs breakdown page and the cover/What-I-Commit figure now match exactly (both should show £92,450 for this deal, or whatever the correct total is with sourcing fee included).
4. Spot-check at least one other strategy (e.g. HMO or Flip) with a sourcing fee entered, to confirm the same fix applies there if the same bug existed.
5. Do not push automatically — report back what changed, the `tsc` result, and a screenshot/PDF excerpt showing the two figures now matching, and I'll verify before you push to `production-candidate`.
