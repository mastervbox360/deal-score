# Replit Agent Prompt — Fix: EPC Lookup Must Match the Actual Address, Not Just the First Result for the Postcode

**Branch: confirm you are on `production-candidate`.**

## The bug

`netlify/functions/epc-lookup.js` currently does this:

```js
const firstResult = searchData?.data?.[0];
```

This takes whichever certificate the search API happens to return first for the **postcode as a whole**, without checking whether it's actually the property the user entered. A UK postcode typically covers 15+ addresses (different house numbers, flats, units), so "first result" can easily be a different property than the one being analysed — this was confirmed as the likely cause of an implausibly small floor area (54 m² for a semi-detached house) showing for a specific address.

## What to do

### Step 1 — Diagnose first (mandatory, do not skip)

1. Call the search endpoint for a postcode you know covers multiple properties (e.g. reuse `CF24 2LY` from the earlier test, or any postcode with several results) and log the **full array** of results, not just the first one — specifically look at `addressLine1`, `addressLine2`, and any other address fields present on each result.
2. Confirm how the house number/name actually appears in these fields — e.g. is it "65A Horwood Close" as a single string in `addressLine1`, or split across `addressLine1`/`addressLine2` some other way? This determines how matching needs to work.
3. Report what you find before writing the matching logic — don't assume the format.

### Step 2 — Match the search results against the entered address

1. The frontend already has the full entered address available (from the Google Places autocomplete selection, or manually typed) before it calls the EPC lookup function — pass the house number/name (not just the postcode) as an additional parameter to the Netlify function, e.g. `?postcode=CF24+2LY&houseNumber=65a`.
2. In the Netlify function, after getting the search results array, **filter/match** against the passed house number rather than blindly taking index `[0]`. Matching should be reasonably fuzzy — normalise both sides (lowercase, strip spaces/punctuation) and check whether the house number/name appears at the start of `addressLine1`, since EPC address formatting won't necessarily match Google's formatting exactly (e.g. "65A" vs "65a" vs "Flat 65A").
3. **If no confident match is found**, don't silently fall back to the first result — instead, return a clear "no confident match" signal to the frontend rather than guessing, so the app can show something like "EPC data found for this postcode but couldn't confirm it matches this address — please verify manually" rather than presenting an unverified property's data as if it were confirmed. This matters because presenting the wrong property's floor area as fact is worse than not showing one at all.
4. If there's only one result for the postcode, matching confidence is naturally high — no need to be overly strict in that case.

### Step 3 — Update the frontend

1. Pass the house number/name through when calling the EPC lookup function.
2. Handle the new "no confident match" response state distinctly from both "found and matched" and "no certificate at all" — the UI messaging should be different for each of these three states, since they mean different things to the user.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Re-test the same address from the last test (65a Horwood Close, Cardiff CF24 2LY) on the deployed branch preview and confirm the floor area now looks plausible for a semi-detached house, or confirm the "no confident match" state shows if the postcode's certificates genuinely can't be matched to this specific address.
4. Test a postcode you know has only one registered property, to confirm the single-result case still works smoothly.
5. Do not push automatically — report back what the real search response's address fields look like (Step 1), what changed, the `tsc` result, and ask me to review before you push to `production-candidate` and re-test on the deploy preview.
