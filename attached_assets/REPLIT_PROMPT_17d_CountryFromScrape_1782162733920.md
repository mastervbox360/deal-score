# REPLIT PROMPT 17d — Country Direct from Scrape + Bathrooms Fix

## Branch: stage-6 | Files: supabase/functions/scrape-property/index.ts + DashboardPage.tsx

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

Two bugs remain after 17c:
1. **Bathrooms not populating** — edge function may not be finding the right field path in `__NEXT_DATA__`
2. **Country always "England & NI"** — we've been trying to derive the country from the postcode, but Rightmove's `__NEXT_DATA__` already provides the country directly in `prop.address.ukCountry` (e.g. `"WALES"`, `"ENGLAND"`, `"SCOTLAND"`, `"NORTHERN_IRELAND"`). We should read it straight from the scraped data.

This makes postcodes.io unnecessary for URL-scraped deals. Country becomes a first-class scraped field just like address, price, and beds.

---

## FIX 1 — Add `country` and fix `bathrooms` in the `scrape-property` edge function

Open `supabase/functions/scrape-property/index.ts`.

**A. Add `country` and `bathrooms` to the `PropertyData` interface (if not already there):**

```typescript
interface PropertyData {
  address?: string
  price?: number
  beds?: string
  bathrooms?: string     // number as string e.g. "1", "2"
  country?: string       // canonical: 'England' | 'Wales' | 'Scotland' | 'Northern Ireland'
  propertyType?: string
  description?: string
  postcode?: string
  images?: string[]
  tenure?: string
  epcRating?: string
  floorAreaSqm?: number
  source: string
  sourceUrl: string
}
```

**B. Add a `normaliseCountry` helper function** (place it near the other normalisation helpers at the bottom of the file):

```typescript
function normaliseCountry(raw: string): string {
  if (!raw) return ''
  const r = raw.toUpperCase().replace(/[_\s-]/g, '')
  if (r === 'WALES' || r === 'CYM' || r === 'CYMRU') return 'Wales'
  if (r === 'SCOTLAND' || r === 'SCO' || r === 'ALBA') return 'Scotland'
  if (r.includes('NORTHERN') || r === 'NI' || r === 'NORTHERNIRELAND') return 'Northern Ireland'
  if (r === 'ENGLAND' || r === 'ENG') return 'England'
  return ''
}
```

**C. In `parseRightmove`, add country and bathrooms extraction.**

Find the block inside the `if (nextMatch)` / `try` section that reads `prop.address`. Add the two new fields immediately after the existing address/postcode lines:

```typescript
// After: if (prop.address?.outcode || prop.address?.incode) { ... }
// ADD:
if (prop.address?.ukCountry) {
  const nc = normaliseCountry(prop.address.ukCountry)
  if (nc) data.country = nc
}

// After: if (prop.bedrooms != null) data.beds = normaliseBeds(String(prop.bedrooms))
// ADD (try multiple field paths — Rightmove has used different names across versions):
const bathroomValue = prop.bathrooms ?? prop.bathroomCount ?? prop.numberOfBathrooms
  ?? prop.internalDetails?.bathrooms ?? prop.summary?.bathrooms
if (bathroomValue != null) {
  const bathroomNum = parseInt(String(bathroomValue))
  if (!isNaN(bathroomNum) && bathroomNum > 0) data.bathrooms = String(bathroomNum)
}
```

Also add it to the `window.PAGE_MODEL` fallback block (the second `try` inside `parseRightmove`):

```typescript
// After: if (prop.bedrooms != null) data.beds = normaliseBeds(String(prop.bedrooms))
const bv2 = prop.bathrooms ?? prop.bathroomCount ?? prop.numberOfBathrooms
if (bv2 != null && !isNaN(parseInt(String(bv2)))) data.bathrooms = String(parseInt(String(bv2)))
if (prop.address?.ukCountry) {
  const nc = normaliseCountry(prop.address.ukCountry)
  if (nc) data.country = nc
}
```

**D. In `parseZoopla`, add country and bathrooms:**

```typescript
// After: if (beds != null) data.beds = normaliseBeds(String(beds))
const zBaths = listing.numBathrooms ?? listing.bathrooms ?? listing.bathroomsCount
  ?? listing.internalDetails?.bathrooms
if (zBaths != null && !isNaN(parseInt(String(zBaths)))) {
  data.bathrooms = String(parseInt(String(zBaths)))
}
const zCountry = listing.countryCode || listing.country || listing.address?.country
if (zCountry) {
  const nc = normaliseCountry(String(zCountry))
  if (nc) data.country = nc
}
```

**E. In `parseOTM`, add country and bathrooms:**

```typescript
// After: if (listing.bedrooms != null) data.beds = normaliseBeds(String(listing.bedrooms))
const otmBaths = listing.bathrooms ?? listing.bathroomCount
if (otmBaths != null && !isNaN(parseInt(String(otmBaths)))) {
  data.bathrooms = String(parseInt(String(otmBaths)))
}
const otmCountry = listing.address?.country || listing.country
if (otmCountry) {
  const nc = normaliseCountry(String(otmCountry))
  if (nc) data.country = nc
}
```

**F. Redeploy the edge function:**
```
supabase functions deploy scrape-property
```

---

## FIX 2 — Wire `d.country` and `d.bathrooms` in `handleScrapeUrl` (DashboardPage.tsx)

Open `DashboardPage.tsx`. Find `handleScrapeUrl`.

**A. After the existing basic field setters (address, price, beds, proptype), add:**

```tsx
// Country — read directly from scrape result (most reliable source)
if (d.country) {
  // Map canonical country string to the exact dropdown option value used in the new deal form
  // (Check what option values your Country dropdown uses — update this map to match exactly)
  const newDealCountryMap: Record<string, string> = {
    'England': 'England & NI',          // use the exact option value from the dropdown
    'Wales': 'Wales',
    'Scotland': 'Scotland',
    'Northern Ireland': 'England & NI',
  }
  const mappedCountry = newDealCountryMap[d.country] ?? null
  if (mappedCountry) setNdData(nd => ({ ...nd, country: mappedCountry }))

  // Stamp duty — now calculated with the correct country from scrape
  if (d.price) {
    const sdEstimate = calcStampDuty(d.price, d.country)
    setStampDutyEstimate(sdEstimate)
  }
}

// Bathrooms
if (d.bathrooms) setNdData(nd => ({ ...nd, bathrooms: d.bathrooms }))
```

**IMPORTANT — remove or guard the existing postcodes.io country detection block** so it doesn't overwrite the scraped country. Find the postcodes.io block (added in Prompt 17 / 17c). Wrap it in a condition so it only fires when `d.country` is NOT available from the scrape:

```tsx
// Only run postcodes.io country detection if the scrape didn't return a country directly
if (!d.country && d.postcode) {
  // ... existing postcodes.io / outcode block here (keep as-is) ...
}
```

**B. Add `d.country` and `d.bathrooms` to the `populated` success message array:**

Find the `populated` array. Update it:

```tsx
const populated = [
  d.address && 'address',
  d.price && 'price',
  d.beds && 'beds',
  d.bathrooms && `${d.bathrooms} bath`,          // ADD
  d.propertyType && 'property type',
  d.country && d.country,                         // ADD — shows 'Wales' / 'Scotland' etc.
  d.tenure && 'tenure',
  d.epcRating && `EPC ${d.epcRating}`,
  d.floorAreaSqm && `${d.floorAreaSqm}m²`,
  stamDutyEstimate && `SDLT est. £${stamDutyEstimate.toLocaleString('en-GB')}`,
].filter(Boolean)
```

**C. Ensure bathrooms is saved in the deal creation call.**

Find the `supabase.from('deals').insert(...)` or `createDeal(...)` call where `ndData` maps to `deal.inputs`. Add bathrooms using the same field key that AnalysisHub reads for bathrooms (check AnalysisHub.tsx for the ISelect `setField` key for Bathrooms):

```tsx
inputs: {
  // existing fields ...
  [bathroomsFieldKey]: ndData.bathrooms,    // replace bathroomsFieldKey with actual key
  // ...scrapeExtra at end
}
```

---

## FIX 3 — Wire country into the AnalysisHub.tsx address onChange cascade

In AnalysisHub.tsx, find the address onChange handler added in Prompt 17. It currently calls postcodes.io to detect the country when the address changes. Now that URL-scraped deals already have country set via `scrapeExtra` or `deal.inputs`, this handler mainly matters for MANUALLY entered addresses.

Make sure the country detection from postcodes.io in the address onChange is still there and working — do NOT remove it. This still provides value when a user types an address manually.

However, also check: is `d.country` from the scrape being passed through `scrapeExtra` and merged into `deal.inputs` on creation? If not, add `country` to `scrapeExtra`:

Find `scrapeExtra` state (added in Prompt B). Update it to include country:
```tsx
const [scrapeExtra, setScrapeExtra] = useState<{
  tenure?: string
  epcRating?: string
  floorAreaSqm?: number
  images?: string[]
  country?: string       // ADD
  bathrooms?: string     // ADD
}>({})
```

And in `handleScrapeUrl` where `scrapeExtra` is built, add:
```tsx
if (d.country) extra.country = d.country
if (d.bathrooms) extra.bathrooms = d.bathrooms
```

This ensures that when the deal is opened and AnalysisHub loads `deal.inputs`, the country and bathrooms are already persisted.

---

## FIX 4 — Add address onChange to the New Deal slide-over (manual address entry)

When a user types an address manually in Step 2 (no URL fill), the Country dropdown currently stays on the default. This fix makes it auto-correct as soon as the user types a recognisable postcode into the address field.

Open `DashboardPage.tsx`. Find the Address input field in Step 2 of the New Deal slide-over. It currently calls `setNdData(nd => ({ ...nd, address: e.target.value }))` (or similar) in its `onChange`.

**A. Add a debounce ref near the top of the component** (alongside existing state):

```tsx
const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

Make sure `useRef` is imported from React.

**B. Update the Address field onChange** to add postcode detection after the existing state setter:

```tsx
onChange={e => {
  const val = e.target.value
  setNdData(nd => ({ ...nd, address: val }))

  // Auto-detect country from postcode — debounced 1.2s
  if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current)
  addressDebounceRef.current = setTimeout(async () => {
    // Try full postcode first, then outcode
    const fullPcMatch = val.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2})\b/i)
    const outcodePcMatch = val.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/i)
    const rawPc = (fullPcMatch?.[1] ?? outcodePcMatch?.[1] ?? '').toUpperCase().trim()
    if (!rawPc) return

    const isFullPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}$/.test(rawPc)
    const pcApiUrl = isFullPostcode
      ? `https://api.postcodes.io/postcodes/${encodeURIComponent(rawPc)}`
      : `https://api.postcodes.io/outcodes/${encodeURIComponent(rawPc)}`

    try {
      const res = await fetch(pcApiUrl)
      const json = await res.json()
      if (json.status !== 200 || !json.result) return

      const r = json.result
      const countryStr = typeof r.country === 'string' ? r.country
        : Array.isArray(r.country) ? (r.country[0] ?? '') : ''
      if (!countryStr) return

      // Map to exact dropdown option value — update to match your dropdown
      const newDealCountryMap: Record<string, string> = {
        'England': 'England & NI',
        'Wales': 'Wales',
        'Scotland': 'Scotland',
        'Northern Ireland': 'England & NI',
      }
      const mappedCountry = newDealCountryMap[countryStr]
      if (!mappedCountry) return

      setNdData(nd => ({ ...nd, country: mappedCountry }))

      // Recalculate stamp duty with correct country if price is set
      const priceNum = parseFloat(String(ndData.price ?? '').replace(/[£,]/g, ''))
      if (!isNaN(priceNum) && priceNum > 0) {
        setStampDutyEstimate(calcStampDuty(priceNum, countryStr))
      }
    } catch (_) {
      // Silently ignore — country stays at current selection
    }
  }, 1200)
}}
```

> **Note:** The `newDealCountryMap` values must match the exact option values in the Country dropdown (same map as used in Fixes 2 and 3 above). Use what was confirmed in Prompt 17b.

**C. Clean up the timeout on panel close.** In the existing panel reset/close handler, add:

```tsx
if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current)
```

---

## FINAL STEPS

1. Run `npx tsc --noEmit` — zero errors
2. Test URL scrape with `https://www.rightmove.co.uk/properties/89477043` (Elm Street, Cardiff):
   - Success banner shows: "Filled in: address, price, beds, 1 bath, property type, **Wales**, tenure"
   - Country dropdown updates to **Wales**
   - SDLT estimate uses Wales LTT rates (~£3,200 for £230k investor rate)
3. Test manual entry: type `"12 High Street, Cardiff, CF24 3BJ"` into the Address field without using the URL fill — country should auto-switch to **Wales** after ~1.2 seconds
4. Create deal, open Inputs tab:
   - Property Type: **Semi-detached house** ✅
   - Bedrooms: **3** ✅
   - Bathrooms: **1** ✅
   - Country/Tax Region: **Wales** ✅
   - Tenure: **Freehold** ✅

Commit:
```
git add -A && git commit -m "fix: Prompt 17d — country from scrape + bathrooms + manual address onChange" && git push origin stage-6
```

## REPORT BACK

1. What value did `prop.address.ukCountry` return for the Elm Street listing? (e.g. `"WALES"`, `"Wales"`, `"W"`)
2. What field contained bathrooms in the `__NEXT_DATA__`? (`prop.bathrooms`? `prop.bathroomCount`? Something else?)
3. Did the success banner show Wales and "1 bath" correctly after URL fill?
4. Did manual address entry with a Welsh postcode auto-switch Country to Wales?
5. Did the Inputs tab show Wales + 1 bath after creating the deal?
