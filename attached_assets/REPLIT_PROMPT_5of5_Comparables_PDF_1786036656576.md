# Replit Agent Prompt 5 of 5 — Comparable Evidence: PDF Filtering & Clean Display

**Branch: confirm you are on `production-candidate`, and confirm Prompts 1–4 (data structure, geocoding, scoring engine, Inputs UI) have already landed and been tested before starting this.**

This is the fifth and final prompt in the comparable-evidence overhaul. This prompt only touches the PDF output — the traffic light, scoring, and factor breakdown built in Prompts 3–4 must **never appear in the PDF**. The PDF is investor-facing; the scoring is a sourcer's internal QA tool only.

Read `artifacts/dealscore/src/components/DealScorePDF.tsx` and `artifacts/dealscore/src/components/DealScorePDFProPlus.tsx` in full, specifically the existing Comparable Evidence / Comparable Properties section in each, and the `pdfProps` building logic in `Home.tsx` that feeds them.

## What to do

1. **Filter comparables before they reach the PDF.** In the `pdfProps` construction in `Home.tsx`, filter the comparables array to only those where `includeInPdf` resolves to `true` — either explicitly set `true` by the sourcer, or `null` (default) combined with a `Strong` or `Fair` rating from `scoreComparable`. Comparables that are `Weak` and not manually overridden to `true` must not be passed to the PDF props at all.

2. **Never pass scoring data to the PDF components.** Only pass the plain comparable fields needed for display: `type`, `address`, `postcode`, `propertyType`, `bedrooms`, `floorArea`, `date`, `price`. Do not pass `ComparableScore`, the traffic-light rating, or any factor breakdown data into `pdfProps` at all — this isn't just a rendering choice, the data shouldn't be available to the PDF components in the first place.

3. **In both `DealScorePDF.tsx` and `DealScorePDFProPlus.tsx`, update the Comparable Evidence section to:**
   - Split into two sub-sections when both types are present: **"Comparable Sales"** and **"Comparable Lettings"** — each as its own small heading with its own table, matching the existing section-heading style used elsewhere in the pack (the green underline heading treatment visible in the current PDF).
   - Comparable Sales table columns: Address, Property Type, Bedrooms, Floor Area, Sale Price, Date Sold.
   - Comparable Lettings table columns: Address, Property Type, Bedrooms, Floor Area, Monthly Rent, Date Let.
   - Plain label/value row styling, consistent with the rest of the pack — no colour coding, no badges, no scores of any kind.
   - If a deal has zero sale comparables passing the filter, show the existing "not yet supplied" empty-state pattern for that sub-section (check how the current PDF handles an empty comparables case and reuse the same treatment) rather than showing an empty table or omitting the heading entirely. Same for zero letting comparables. If a deal genuinely has no comparables of a given type entered at all (not just filtered out), it's fine to omit that sub-section heading entirely rather than showing an empty-state for a type that was never used.

4. **Do not change anything else in either PDF file** — this prompt is scoped strictly to the Comparable Evidence section.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Using the test deals from Prompt 4 (the mix of Strong/Fair/Weak comparables you already tested), generate a PDF preview and confirm: Strong/Fair comparables appear, Weak ones are excluded, a manually-overridden Weak comparable (ticked "Include in PDF") does appear, and nothing resembling a score, badge, or colour rating shows anywhere in the output.
4. Test a deal with both sale and let comparables — confirm the two sub-sections render separately with the correct columns for each.
5. Test a deal where all comparables are Weak and unoverridden — confirm the empty-state shows correctly rather than a blank or broken section.
6. Do not push automatically — report back what changed, the `tsc` result, and PDF screenshots covering the scenarios in steps 3–5, and I'll do a final review of the whole feature before you push to `production-candidate`.
