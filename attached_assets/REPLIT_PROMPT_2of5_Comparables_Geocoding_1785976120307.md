# Replit Agent Prompt 2 of 5 — Comparable Evidence: Geocoding & Distance

**Branch: confirm you are on `production-candidate`, and confirm Prompt 1 (comparable data structure change) has already landed before starting this.**

This is the second of five prompts. **This prompt only covers geocoding and distance calculation** — no scoring engine, no UI wiring yet (that's Prompts 3–4). The goal here is just plumbing: by the end of this prompt, every comparable with a valid postcode should have real `lat`/`lng` populated, and a distance-calculation utility should exist and be callable, even though nothing visible uses it yet.

Read `artifacts/dealscore/src/pages/Home.tsx` in full, specifically the existing postcode-lookup effect that currently fetches `https://api.postcodes.io/postcodes/${postcode}` for flood-risk checking (search for where `geoFloodFetch` or similar is defined).

## What to do

**1. Persist the subject property's own coordinates.** That existing fetch currently calculates `lat`/`lng` only to check flood risk via the Environment Agency API, then discards them. Add `subjectLat` / `subjectLng` to component state (or extend the existing `propertyData` object, whichever fits the existing pattern more cleanly) and store them from that same fetch — do not add a second, duplicate call for the same postcode.

**2. Add comparable geocoding.** When a comparable row's `postcode` field loses focus (on blur, not on every keystroke — avoid hammering the API while the user is still typing), fetch `https://api.postcodes.io/postcodes/${postcode}` the same way, and store the returned `result.latitude` / `result.longitude` onto that specific comparable row's `lat`/`lng` fields (added in Prompt 1). Handle invalid or not-found postcodes gracefully — if the API returns a 404 or no result, leave `lat`/`lng` as `null` and don't block the row or show an error; this will be surfaced later as "distance unverified" once scoring is built in Prompt 3.

**3. Add a Haversine distance utility function**, exported so later prompts can import it:
```typescript
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```
Place this in `calculations.ts` if it makes sense alongside the other pure calculation helpers, or directly in `Home.tsx` if that fits the existing code organisation better — use your judgement on the cleanest placement and note which you chose.

**4. Nothing user-visible needs to change in this prompt.** Don't build the traffic light or wire distance into any display yet — that's Prompt 3 (scoring) and Prompt 4 (UI). For verification purposes only, it's fine to temporarily `console.log` a calculated distance when a comparable postcode resolves, so it can be checked in the browser console — remove or leave that log at your discretion, just make sure it doesn't ship as noisy production logging if you keep it (a single dev-only log statement is fine).

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Manually enter the subject property's postcode and a comparable's postcode that you know the real-world distance between, and confirm (via console log or a temporary display) that the calculated Haversine distance is roughly sensible (within a reasonable margin — this is straight-line distance, not driving distance, so it should be close to but not necessarily exactly the real-world distance).
4. Confirm an invalid/nonsense postcode on a comparable doesn't crash the app or throw an unhandled error — it should just leave that row's `lat`/`lng` as null.
5. Do not push automatically — report back what changed, the `tsc` result, and the test distance calculation you verified, and I'll check before you push to `production-candidate`.
