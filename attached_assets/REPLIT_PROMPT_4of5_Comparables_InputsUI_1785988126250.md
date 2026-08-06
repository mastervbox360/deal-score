# Replit Agent Prompt 4 of 5 — Comparable Evidence: Inputs UI (Traffic Light & Breakdown)

**Branch: confirm you are on `production-candidate`, and confirm Prompts 1–3 (data structure, geocoding, scoring engine) have already landed before starting this.**

This is the fourth of five prompts. **This is where the comparable-evidence work becomes visible and testable for the first time.** No PDF changes yet — that's Prompt 5.

Read `artifacts/dealscore/src/pages/Home.tsx` in full, specifically the Comparable Properties input section built in Prompt 1, and the `scoreComparable` function and `ComparableScore` return shape built in Prompt 3.

## What to do

1. **Confirm the Prompt 1 fields are all present and functional** (Sale/Let toggle, Property Type dropdown, Bedrooms, Postcode, Floor Area, dynamically-labelled Date/Price) — if anything from Prompt 1 was left incomplete, finish it now as part of this pass.

2. **Call `scoreComparable()` live for each comparable row** as its fields change (recompute on any relevant field edit — postcode, property type, bedrooms, floor area, date, price, type toggle), passing in the subject deal's current context (property type, tenure, postcode/lat/lng, floor area, price/m², dealType, and the relevant rent figure).

3. **Add a traffic-light badge per row** — a small coloured dot or pill (green/amber/red for Strong/Fair/Weak) positioned clearly on each comparable row, using the `overall` field from `ComparableScore`.

4. **Make the badge expandable to show the factor breakdown.** Clicking or hovering the badge should reveal each factor from `ComparableScore.factors` with its own visual indicator (e.g. ✅/⚠️/❌ or similar) and its `detail` text (e.g. "Recency: 4 months", "Distance: 0.6mi"). If `gateFailed` is set, show that prominently as the reason the comparable is Weak, rather than a full factor list (since gated comparables skip weighted scoring — showing the gate reason is more useful than empty/skipped factor rows).

5. **Add an "Include in PDF" checkbox per row.** Default it per the logic from Prompt 3: pre-ticked for Strong/Fair (when `includeInPdf` is `null`), pre-unticked for Weak (when `includeInPdf` is `null`). The checkbox should always be manually toggleable regardless of rating, and toggling it should set `includeInPdf` to an explicit `true`/`false` on that row (overriding the default logic going forward for that row).

6. **Handle the "distance unverified" and "rent metric unavailable" cases gracefully in the UI** — if `scoreComparable` flagged either of these, show a small note (e.g. "Distance unverified — check postcode" or "Rent comparison not available for Serviced Accommodation") near the badge rather than presenting an unqualified score as if it were fully reliable.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. **Test against at least 4–5 real comparables** (use real deals if you have them to hand) — a mix that should genuinely score differently: one that should clearly be Strong, one that should clearly be Weak (wrong type or far away), and a couple in between. Take screenshots of the badges and expanded breakdowns for each.
4. Test one HMO deal with a let comparable (rent/room path) and one BTL deal with a let comparable (rent/m² path) — confirm both produce sensible, different-looking breakdowns appropriate to their metric.
5. Test one SA deal with a let comparable — confirm the "not available for SA" note shows correctly and nothing crashes or shows NaN.
6. Do not push automatically — report back what changed, the `tsc` result, and the screenshots from step 3–5, and I'll review the actual scoring behaviour against real data before you push to `production-candidate`. **This is the natural checkpoint to sanity-check whether the scoring thresholds from Prompt 3 need adjusting before we move on to the PDF (Prompt 5)** — flag anything that looked wrong or surprising in your testing.
