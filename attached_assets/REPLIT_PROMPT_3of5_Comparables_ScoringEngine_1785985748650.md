# Replit Agent Prompt 3 of 5 — Comparable Evidence: Scoring Engine

**Branch: confirm you are on `production-candidate`, and confirm Prompts 1 (data structure) and 2 (geocoding) have already landed before starting this.**

This is the third of five prompts. **This prompt builds the scoring function itself** — no UI wiring yet (that's Prompt 4), no PDF changes (that's Prompt 5). By the end of this prompt, a `scoreComparable()` function should exist, be fully correct, and be unit-testable/callable, even though nothing in the UI displays its output yet.

Read `artifacts/dealscore/src/lib/calculations.ts` in full first — specifically find the `interpolate` helper used by `calculateDealScore`, since this new function should reuse it rather than duplicating the same logic.

## What to build

Create a new exported function, `scoreComparable(comparable: ComparableRow, subject: SubjectContext)`, where `SubjectContext` is a new small interface you define carrying whatever the subject deal needs to expose for comparison: `propertyType`, `tenure`, `postcode`, `lat`, `lng`, `floorArea`, `pricePerSqM` (for sale scoring), `dealType`, and the appropriate rent figure depending on `dealType` (see the rent-metric logic below).

### Gates — fail any of these and the comparable is `Weak` immediately; skip weighted scoring entirely and return early

- **Property type mismatch** (comparable's `propertyType` ≠ subject's `propertyType`) — **only apply this gate when `comparable.type === 'sale'`.** For `type: 'let'` comparables, do not gate on this — treat it as a weighted factor instead (see the let-type factor table below), since near-but-not-identical property types can still be valid rent evidence even when they wouldn't be good sale evidence.
- **Tenure mismatch** — **only apply this gate when `comparable.type === 'sale'`.** Skip entirely for `type: 'let'` — tenure has limited bearing on achievable rent.
- **Distance > 2 miles** (applies to both types) — using `haversineMiles` from Prompt 2. **If distance is unknown** (either the subject or comparable's lat/lng is null, meaning geocoding failed or wasn't run), **do not apply this gate.** Instead, exclude distance from the weighted factors entirely for that row, and set a flag/note (e.g. `distanceUnverified: true` in the return value) so Prompt 4's UI can show "distance unverified" rather than silently treating it as fine.

### Weighted factors — only computed for comparables that pass the gates above

For `comparable.type === 'sale'`:

| Factor | Weight | Strong threshold | Weak threshold |
|---|---|---|---|
| Recency | 25% | ≤ 6 months | > 12 months |
| Price/m² proximity vs subject | 25% | within 10% | beyond 20% |
| Distance | 20% | ≤ 0.3 miles | > 1 mile |
| Floor area proximity vs subject | 20% | within 15% | beyond 30% |
| Bedroom count match | 10% | exact | ±2 or more |

For `comparable.type === 'let'`:

| Factor | Weight | Strong threshold | Weak threshold |
|---|---|---|---|
| Recency | 25% | ≤ 6 months | > 12 months |
| Rent metric proximity (see below) | 25% | within 10% | beyond 20% |
| Distance | 20% | ≤ 0.3 miles | > 1 mile |
| Property type match | 15% | exact | any mismatch |
| Floor area proximity vs subject | 10% | within 15% | beyond 30% |
| Bedroom count match | 5% | exact | ±2 or more |

**Rent metric for let comparables — branches on the subject deal's `dealType`:**
- `HMO` or `R2R` (room-based income): compare **rent per room** — `comparable.price / comparable.bedrooms` against the subject's `rentPerRoom` input.
- `BTL`, `Social`, or `BRRR` (whole-property rent): compare **rent per m²** — `comparable.price / comparable.floorArea` against the subject's monthly rent (or `leaseIncomePerMonth` for Social) ÷ the subject's own floor area.
- `SA` (nightly rate, not monthly rent): **do not compute a rent-metric score at all.** Return the comparable with `rentMetricUnavailable: true` and skip that factor from the weighting entirely (redistribute its weight proportionally across the remaining let-type factors, or simply treat the weighted average as being over the remaining factors only — use your judgement, but do not produce a NaN or a misleading score). This is a deliberate, known limitation for SA deals, not a bug — flag it clearly in your summary when done.

Score each factor 0–100 via linear interpolation between its Strong and Weak thresholds using the existing `interpolate` helper (import/reuse it, don't rewrite the same logic). Weighted-sum the factor scores (re-normalising weights if any factor was excluded, e.g. unavailable distance or unavailable rent metric for SA) to get an overall 0–100. Band it: **Strong ≥ 75, Fair ≥ 50, Weak < 50.**

### Return shape

Return enough detail for Prompt 4's UI to render a full factor breakdown, e.g.:
```typescript
interface ComparableScore {
  overall: 'Strong' | 'Fair' | 'Weak';
  overallNumeric: number; // 0-100, or -1/null if gated to Weak without a computed score
  gateFailed: string | null; // e.g. "Property type mismatch" or null if no gate failed
  factors: Array<{
    label: string; // e.g. "Recency", "Price/m² proximity"
    status: 'strong' | 'fair' | 'weak' | 'unavailable';
    detail: string; // human-readable, e.g. "4 months" or "0.6 miles"
  }>;
}
```

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Write a few inline test calls (temporary, in a dev-only spot, or via console) covering: a clearly Strong sale comparable, a gated-Weak sale comparable (wrong property type), an HMO let comparable, a BTL let comparable, and an SA let comparable — confirm each returns sensible output and the SA case doesn't error or return NaN.
4. Do not push automatically — report back what changed, the `tsc` result, and the output of your test calls, and I'll verify the logic before you push to `production-candidate`.
