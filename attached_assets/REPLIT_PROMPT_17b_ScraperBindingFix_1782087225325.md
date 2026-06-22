# REPLIT PROMPT 17b — Scraper Binding Debug & Fix

## Branch: stage-6 | Files: artifacts/dealscore/src/...

**Standing rule:** Read every file in full before editing. Zero `npx tsc --noEmit` errors before committing. Do NOT touch anything not explicitly listed below.

---

## PROBLEM STATEMENT

After Prompt 17, the URL scraper fills in address + price successfully but four things are broken:

1. **Property type dropdown in new deal slide-over shows "Select..."** — the scraped value is not rendering in the dropdown even though the success banner says "property type" was filled
2. **Beds shows blank in the Inputs tab** after the deal is opened — set in the new deal flow but not saved to `deal.inputs`
3. **Country/Tax Region stays on "England & NI"** for a CF24 postcode (Wales) — postcodes.io is running (SDLT estimate appears) but the dropdown isn't updating
4. **Property type in Inputs tab shows "Other / Terraced"** instead of selecting "Terraced house" from the dropdown — the value saved is `"Terraced"` not `"Terraced house"`

All four failures share the same root cause: **mismatches between the field names in `ndData`, the dropdown option values, and the `deal.inputs` field keys.**

---

## STEP 1 — READ BEFORE TOUCHING ANYTHING

Read `artifacts/dealscore/src/DashboardPage.tsx` (or wherever the New Deal slide-over lives) in full. Find and note:

**A. `ndData` shape** — what are the exact property names? e.g.:
```ts
const [ndData, setNdData] = useState({
  address: '',
  price: '',
  beds: '',         // ← what is this field actually called?
  proptype: '',     // ← what is this field actually called?
  country: '',      // ← what is this field actually called?
  // etc.
})
```

**B. Property type dropdown option values** — find the JSX for the Property Type select/dropdown in Step 2. What are the `value` attributes on its `<option>` elements or option array? List all of them exactly. Are they `"Terraced house"` or `"Terraced"` or something else?

**C. Country/Tax Region dropdown option values** — find the JSX for the Country dropdown in Step 2. What are the `value` attributes? Are they `"England"`, `"England & NI"`, `"England & N. Ireland"`, or something else? List all of them exactly.

**D. Deal creation call** — find the `supabase.from('deals').insert(...)` or `createDeal(...)` call. How does `ndData` get mapped to the deal's `inputs` object? Specifically:
- What key does `ndData.beds` (or whatever it's called) map to in `inputs`?
- What key does `ndData.proptype` (or whatever it's called) map to in `inputs`?
- What key does `ndData.country` (or whatever it's called) map to in `inputs`?
- Is `scrapeExtra` spread into `inputs`? Where exactly?

**E. Read `AnalysisHub.tsx`** — find the Inputs tab's Property Information section. What are the exact field keys used with `setField()` for:
- Property type? (e.g. `setField('propertyType', ...)` or `setField('sharedInputs.propertyType', ...)`)
- Beds? (e.g. `setField('beds', ...)` or `setField('sharedInputs.beds', ...)`)
- Country/Tax Region? (e.g. `setField('taxRegion', ...)` or `setField('country', ...)`)

What are the ISelect option values for property type in the Inputs tab? List them all.

---

## STEP 2 — FIX THE PROPERTY TYPE BINDING

Once you know the actual property type dropdown option values from Step 1B, check if `"Terraced house"` is one of them.

**If the option values in the new deal dropdown use different strings than what `normaliseType()` returns** (e.g. the dropdown uses `"Terraced"` but the scraper returns `"Terraced house"`), you have two options:

- **Option A (preferred):** Change the dropdown option values to exactly match the canonical strings from `normaliseType()`:
  ```
  'Terraced house' | 'End-of-terrace house' | 'Semi-detached house' | 'Detached house'
  'Flat / Apartment' | 'Studio flat' | 'Maisonette' | 'Bungalow (detached)'
  'Bungalow (semi-detached)' | 'Converted flat' | 'Purpose-built flat'
  'HMO' | 'Block of flats' | 'Commercial / mixed use' | 'Land'
  ```
  These must exactly match what `normaliseType()` returns in the `scrape-property` edge function.

- **Option B:** Add a reverse normalisation map in `handleScrapeUrl` to convert "Terraced house" → whatever string the new deal dropdown uses. Only use this if the Inputs tab ISelect also uses those same strings.

**The canonical strings above (Option A) are locked.** The Inputs tab ISelect already uses them. The new deal dropdown must match.

---

## STEP 3 — FIX THE COUNTRY BINDING

From Step 1C, you now know the exact option values in the Country dropdown.

Find the `handleScrapeUrl` function. Find the postcodes.io block added by Prompt 17. Update the `countryMap` to use the **exact** option value strings from the dropdown:

```tsx
// Replace the countryMap with the actual option values from the dropdown.
// Example — update these to match exactly what you found in Step 1C:
const countryMap: Record<string, string> = {
  'England': 'England & NI',        // ← use the actual option value for England
  'Wales': 'Wales',                  // ← use the actual option value for Wales
  'Scotland': 'Scotland',            // ← use the actual option value for Scotland
  'Northern Ireland': 'England & NI', // ← NI shares England & NI option
}
```

Also check the **timestamp**: the postcodes.io `fetch` call is async. Make sure the `setNdData` call for country is inside the `.then()` / awaited block — NOT outside it. If the stamp duty `calcStampDuty` is running synchronously before the postcodes.io resolves, it will always use the old default country. Fix this by computing stamp duty INSIDE the postcodes.io response handler, after `mappedCountry` is known:

```tsx
// WRONG — stamp duty runs before postcodes.io resolves:
const sdEstimate = calcStampDuty(price, 'England') // uses default
fetch('https://api.postcodes.io/...').then(r => {
  setNdData(nd => ({ ...nd, country: mappedCountry }))
})

// CORRECT — stamp duty runs AFTER country is known:
fetch('https://api.postcodes.io/...').then(r => {
  const mappedCountry = countryMap[r.result.country] ?? 'England & NI'
  setNdData(nd => ({ ...nd, country: mappedCountry }))
  const sdEstimate = calcStampDuty(price, r.result.country) // use raw postcodes.io country string
  setStampDutyEstimate(sdEstimate)
}).catch(() => {
  // Fallback: use postcode prefix
  const pc = postcode.toUpperCase()
  const fallbackCountry = pc.startsWith('BT') ? 'Northern Ireland'
    : ['CF','CH','LD','LL','NP','SA','SY'].some(p => pc.startsWith(p)) ? 'Wales'
    : ['AB','DD','DG','EH','FK','IV','KA','KW','KY','ML','PA','PH','TD','ZE'].some(p => pc.startsWith(p)) ? 'Scotland'
    : 'England'
  const mappedFallback = countryMap[fallbackCountry] ?? 'England & NI'
  setNdData(nd => ({ ...nd, country: mappedFallback }))
  const sdEstimate = calcStampDuty(price, fallbackCountry)
  setStampDutyEstimate(sdEstimate)
})
```

The `calcStampDuty` function takes the raw postcodes.io country string (`'Wales'`, `'England'`, `'Scotland'`, `'Northern Ireland'`) — not the mapped dropdown value. Keep that logic separate.

---

## STEP 4 — FIX BEDS AND PROPERTY TYPE NOT SAVING TO DEAL INPUTS

From Step 1D, you found how `ndData` maps to `deal.inputs` in the deal creation call.

The symptoms tell us:
- `beds` is set in `ndData` (shows in new deal flow) but NOT reaching `deal.inputs`
- `propertyType` is saved as `"Terraced"` in `deal.inputs` instead of `"Terraced house"`

**Find the deal creation/insert call and check:**

1. Is `ndData.beds` (or whatever it's named) included in the `inputs` object? If not, add it:
   ```tsx
   // Find the inputs object in the deal creation call.
   // Make sure beds is included using the exact field key AnalysisHub reads:
   inputs: {
     // existing fields...
     [bedsFieldKey]: ndData.beds,           // use the key from Step 1E
     [propTypeFieldKey]: ndData.proptype,    // use the key from Step 1E  
     [countryFieldKey]: ndData.country,      // use the key from Step 1E
     ...scrapeExtra,                         // ensure this spread happens LAST
   }
   ```

2. Is `scrapeExtra` being spread? `scrapeExtra` contains `tenure`, `epcRating`, `floorAreaSqm`, `images` from the edge function. Make sure it's spread at the end of the `inputs` object so it doesn't overwrite the explicit fields set above.

3. **Why property type saves as "Terraced" instead of "Terraced house":** If `ndData.proptype = 'Terraced house'` is correctly set, and it's being saved under the right field key, it should appear correctly. But if the ISelect in AnalysisHub doesn't have `'Terraced house'` as an option, it will fall through to ISelectOther free text. Check that the ISelect options in AnalysisHub's Property Information section include all the canonical strings listed in Step 2 above. If any are missing, add them.

---

## STEP 5 — FIX COUNTRY IN INPUTS TAB (AnalysisHub.tsx)

From Step 1E, you found the exact `setField` key for Country/Tax Region.

In the Prompt 17 address onChange handler (added to AnalysisHub.tsx), find the line:
```tsx
setField('taxRegion', mappedCountry)   // this key may be wrong
```

Replace with the **exact** key found in Step 1E. The mapped value must also match the exact option value string used in the AnalysisHub country ISelect (not the new deal dropdown — they may differ).

Find the country ISelect in AnalysisHub's Property & Purchase or Property Information section. What are its option values? Common patterns:
- `'ENGLAND'` / `'WALES'` / `'SCOTLAND'` (uppercase enum)
- `'England & N. Ireland'` / `'Wales'` / `'Scotland'` (display string)
- `'england'` / `'wales'` / `'scotland'` (lowercase)

The postcodes.io → AnalysisHub country map must use whatever these values are:
```tsx
const analysisHubCountryMap: Record<string, string> = {
  'England': 'England & N. Ireland',   // adjust to actual option value
  'Wales': 'Wales',
  'Scotland': 'Scotland',
  'Northern Ireland': 'England & N. Ireland',
}
setField(actualCountryKey, analysisHubCountryMap[pcData.result.country] ?? 'England & N. Ireland')
```

---

## STEP 6 — VERIFY EVERYTHING

After all fixes:

1. `npx tsc --noEmit` — zero errors
2. Test the flow:
   - Paste `https://www.rightmove.co.uk/properties/88012917` (CF24 4RL property)
   - Country should update to **Wales** (not England & NI)
   - Property type should show **Terraced house** (not "Select...")
   - Beds should show **4**
   - SDLT estimate should show Wales LTT rate (~£24,450 for £370k at investor rates — NOT £17,100 which is England rate)
3. Create the deal, open it, go to Inputs
   - Address populated ✅
   - Property type: **Terraced house** in the main dropdown (not "Other / Terraced") ✅
   - Beds: **4** ✅
   - Country/Tax Region: **Wales** ✅
   - Tenure: Freehold ✅

---

## COMMIT

```
git add -A && git commit -m "fix: Prompt 17b — scraper binding fixes (property type, beds, country)" && git push origin stage-6
```

## REPORT BACK

Tell me exactly:
1. The actual ndData field names for beds, proptype, country
2. The actual Country dropdown option values in the new deal slide-over
3. The actual Country option values in the AnalysisHub ISelect
4. The actual field keys used in `setField()` for property type, beds, country in AnalysisHub
5. What was wrong with the deal creation call (which fields were missing/wrong)
6. Whether the test with CF24 4RL now shows Wales + Terraced house + 4 beds correctly
