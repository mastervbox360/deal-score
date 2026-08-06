# Replit Agent Prompt — Fix: Subject Property EPC Lookup & Floor Area Auto-Fill, Then Expand EPC Data

**Branch: confirm you are on `production-candidate`. This is about the SUBJECT property's own EPC lookup — separate from the comparables work.**

## Step 1 — Diagnose before fixing anything (mandatory, do not skip)

The current code in `Home.tsx`'s `epcFetch` block checks for `row.currentEnergyEfficiencyBand || row['current-energy-rating']` and `row.totalFloorArea ?? row['total-floor-area']`. The user reports EPC rating doesn't populate and floor area doesn't auto-fill on the subject property. Rather than guess at new field names, do this first:

1. Temporarily add `console.log('[EPC DEBUG] raw response:', JSON.stringify(epc, null, 2))` right after the `epc-lookup` fetch resolves, before any parsing logic runs.
2. Also check the Network tab behaviour — confirm the `/.netlify/functions/epc-lookup?postcode=...` call is returning HTTP 200 and not failing silently (401/403/500). If it's failing at the HTTP level (e.g. bad or missing `EPC_BEARER_TOKEN` in Netlify env vars), that's a different, more fundamental problem than a field-name mismatch — report this clearly rather than continuing to "fix" parsing logic that was never going to run.
3. Test against a real UK postcode you know should have a registered EPC certificate (e.g. use the subject property address already in the app, or a well-known one).
4. **Report the actual raw JSON structure you see** — the real field names, whether it's `rows` or `data` at the top level, and whether fields are camelCase, kebab-case, or something else — before writing any fix. This is the ground truth the fix needs to be based on.

## Step 2 — Fix the parsing based on what Step 1 actually shows

Once you know the real field names:
1. Fix the `epcRating` extraction so it correctly reads whatever the real field is.
2. Fix (or confirm already-correct) the `totalFloorArea` extraction the same way.
3. Confirm `setManualFloorArea(floorArea)` actually fires with a real value once the fix is in — this line already exists in the code, so if the field-name fix is correct, floor area auto-fill should start working as a side effect without needing separate logic.
4. Test end-to-end: enter/select a real subject property address with a known EPC certificate, and confirm both EPC rating and floor area now populate correctly in the UI.

## Step 3 — Expand what EPC data is captured and shown (once Steps 1–2 are confirmed working)

Currently only EPC rating, floor area, and construction age band are extracted. A full EPC record (as seen on gov.uk's public certificate lookup, https://www.gov.uk/find-energy-certificate) typically also includes: potential energy rating (post-improvement), environmental impact (CO2) rating, estimated annual energy cost, main heating type and controls, wall/roof/floor construction and insulation description, window glazing type, hot water system type, and the certificate's lodgement/expiry date. Using the real field names confirmed in Step 1, extract whichever of these are actually present in the API response (not all UK properties will have every field populated — handle missing fields gracefully, same pattern as the existing code) and store them in an expanded `propertyData` shape.

**Don't build new UI for all of this yet in this prompt** — just get the data captured and stored correctly in state, matching the existing `propertyData` pattern. Add a small, sensible display of at least the most useful additions (potential rating, main heating type, estimated annual energy cost) somewhere near the existing EPC rating badge in the Property Intelligence panel, using the same visual style already used there. If there's meaningfully more data than fits cleanly in the current panel, flag that in your summary rather than cramming everything in — we can decide on a fuller display separately once we see what's actually available.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files. Remove the temporary debug console.log from Step 1 before finalising (or leave a single dev-only log if useful going forward — your judgement).
3. Test with a real address and confirm: EPC rating badge shows correctly, floor area auto-fills in the Inputs form, and at least one new EPC data point (potential rating / heating type / energy cost) is visible somewhere in the Property Intelligence panel.
4. Test with an address that genuinely has no EPC certificate on record, and confirm the existing "no certificate found" handling still works gracefully — don't break that path while fixing this one.
5. Do not push automatically — report back the raw API structure you found in Step 1, what changed, the `tsc` result, and a screenshot showing EPC rating + floor area + at least one new data point populated correctly, and I'll verify before you push to `production-candidate`.
