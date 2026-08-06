# Replit Agent Prompt — Fix: EPC Lookup Using the Correct Two-Step API Flow

**Branch: confirm you are on `production-candidate`.**

## What we now know for certain (confirmed against the live API and official docs — do not re-guess any of this)

1. **Auth works correctly already.** `Authorization: Bearer <token>` with `Accept: application/json` is the right format, and the token in `EPC_BEARER_TOKEN` is valid — confirmed via a successful live call to `/api/codes/info`.
2. **The search endpoint (`GET /api/domestic/search?postcode=...`) does NOT return floor area or property type.** It only returns: `certificateNumber`, `addressLine1-4`, `postcode`, `postTown`, `council`, `constituency`, `currentEnergyEfficiencyBand`, `registrationDate`, `uprn`, `schemaType` — all in **camelCase**. This is genuinely a thinner response than the old API used to give.
3. **Floor area, property type, and richer data live on a separate second endpoint**: `GET /api/certificate?certificate_number=<the certificateNumber from step 2's result>`. This endpoint's documented example response uses **snake_case** (`current_energy_efficiency_band`, `address_line_1`, etc.) — a genuinely different casing convention from the search endpoint. The full field list wasn't fully documented (the docs example truncates with "..."), so **you must inspect a real live response** to know the exact fields available for floor area/property type — do not guess these field names from documentation alone.

## What to do

### Step 1 — Live diagnostic (mandatory, do this before writing the real fix)

1. Update the Netlify function (or add a temporary test path) to call the search endpoint first: `GET https://api.get-energy-performance-data.communities.gov.uk/api/domestic/search?postcode=<real postcode>`, using the confirmed working auth header.
2. Take the `certificateNumber` from the first result, then call `GET https://api.get-energy-performance-data.communities.gov.uk/api/certificate?certificate_number=<that number>`.
3. Log the full raw JSON of that second call's response — this is the ground truth for what floor area, property type, and other richer fields are actually called and how they're structured. Test against a real postcode you're confident has a registered EPC.
4. **Report the actual raw response back before proceeding to Step 2** — specifically, identify the real field names for total floor area, property type, potential energy rating, environmental impact rating, main heating type, and estimated energy cost, if present. Some fields may not be present for every property — that's fine, just report what's genuinely there.

### Step 2 — Rebuild the EPC lookup function and parsing based on Step 1's real findings

1. Update `netlify/functions/epc-lookup.js` (or split into two functions/one function doing both calls server-side, whichever is cleaner) to perform the two-step flow: search by postcode → take the first/most recent result's `certificateNumber` → fetch the full certificate → return the full certificate data to the frontend. Doing both calls server-side in the Netlify function (rather than two round-trips from the browser) is preferable — keeps the token server-side only, consistent with how this function already works.
2. Update the parsing in `Home.tsx`'s `epcFetch` block to read from the **certificate response's real field names** (confirmed in Step 1), not the search response's fields, since the certificate response is where floor area and property type actually live. Keep the existing property-type mapping table (`epcTypeMap`) but update it against the real values the certificate endpoint returns, which may differ from what's currently assumed.
3. Confirm `setManualFloorArea(floorArea)` fires correctly once real floor area data is being parsed — this existing line should just start working correctly once fed real data.
4. Extract whatever additional fields Step 1 confirmed are available (potential rating, environmental impact, heating type, estimated energy cost) into the `propertyData` state, following the existing pattern, and add a small display of the most useful 2-3 of these near the existing EPC rating badge in the Property Intelligence panel — same approach as originally planned, just now grounded in real data instead of assumed fields.
5. Handle the case where a postcode genuinely has no EPC certificate (search returns empty) gracefully — the existing "no certificate found" message should still work; don't regress that path.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files. Remove or reduce the Step 1 debug logging once the real fix is confirmed working (a single dev-only log is fine to leave).
3. Test with a real address/postcode known to have an EPC certificate — confirm EPC rating badge, floor area auto-fill, and at least one new richer data point all populate correctly end-to-end in the actual UI (not just the console).
4. Test with an address that has no EPC certificate — confirm graceful "no certificate found" handling still works.
5. Do not push automatically — report back the real field names found in Step 1, what changed in Step 2, the `tsc` result, and a screenshot showing EPC rating + floor area + at least one new data point populated correctly, and I'll verify before you push to `production-candidate`.
