# REPLIT PROMPT 17c — Outcode Country Detection + Bathrooms Scrape

## Branch: stage-6 | Files: artifacts/dealscore/src/... + supabase/functions/scrape-property/index.ts

**Standing rule:** Read each file before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

Two bugs remain after 17b:

1. **Country always "England & NI"** — Rightmove withholds full postcodes on active listings. Only the outcode (e.g. `"CF24"`) is stored in `prop.address.outcode` / `prop.address.incode`. The current country detection calls `api.postcodes.io/postcodes/CF24` which fails because postcodes.io requires a full postcode. Solution: when a full postcode isn't available, fall back to `api.postcodes.io/outcodes/{outcode}` which works with just the first half and still returns country.

2. **Bathrooms not populating** — `bathrooms` is not in the `PropertyData` interface in `scrape-property/index.ts` and is not extracted from `prop.bathrooms` in `parseRightmove`. Rightmove's `__NEXT_DATA__` exposes `prop.bathrooms` as a number.

---

## FIX 1 — Update `scrape-property` edge function to add bathrooms

Open `supabase/functions/scrape-property/index.ts`.

**A. Add `bathrooms` to the `PropertyData` interface:**

```typescript
interface PropertyData {
  address?: string
  price?: number
  beds?: string
  bathrooms?: string      // ← ADD THIS
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

**B. In `parseRightmove`, add bathroom extraction immediately after the beds line:**

Find this line:
```typescript
if (prop.bedrooms != null) data.beds = normaliseBeds(String(prop.bedrooms))
```

Add immediately after it:
```typescript
if (prop.bathrooms != null) data.bathrooms = String(parseInt(String(prop.bathrooms)) || 0)
```

**C. In `parseZoopla`, add bathrooms after the beds line:**

Find:
```typescript
if (beds != null) data.beds = normaliseBeds(String(beds))
```

Add immediately after:
```typescript
const baths = listing.numBathrooms ?? listing.bathrooms ?? listing.bathroomsCount
if (baths != null) data.bathrooms = String(parseInt(String(baths)) || 0)
```

**D. In `parseOTM`, add bathrooms after the beds line:**

Find:
```typescript
if (listing.bedrooms != null) data.beds = normaliseBeds(String(listing.bedrooms))
```

Add immediately after:
```typescript
if (listing.bathrooms != null) data.bathrooms = String(parseInt(String(listing.bathrooms)) || 0)
```

After editing, redeploy the edge function:
```
supabase functions deploy scrape-property
```

---

## FIX 2 — Update `handleScrapeUrl` in DashboardPage.tsx to save bathrooms

Open `DashboardPage.tsx` (or wherever the New Deal slide-over lives).

In `handleScrapeUrl`, find the block where basic fields are set from the scrape result:

```tsx
if (d.address) setNdData(...)
if (d.price) setNdData(...)
if (d.beds) setNdData(...)
if (d.propertyType) setNdData(...)
```

Add bathrooms immediately after the beds line:

```tsx
if (d.bathrooms) setNdData(nd => ({ ...nd, bathrooms: d.bathrooms }))
```

> **Note:** Replace `bathrooms` in `nd.bathrooms` with whatever field name `ndData` uses for bathrooms. If bathrooms isn't in `ndData` yet, add it to the initial state: `const [ndData, setNdData] = useState({ ..., bathrooms: '' })`.

Also add `d.bathrooms` to the success message `populated` array:

Find the populated array (the lines building the success text):
```tsx
const populated = [
  d.address && 'address',
  d.price && 'price',
  d.beds && 'beds',
  d.propertyType && 'property type',
  ...
]
```

Add after the beds line:
```tsx
d.bathrooms && `${d.bathrooms} bath`,
```

---

## FIX 3 — Update deal creation to persist bathrooms

Find the deal creation/insert call where `ndData` maps to `deal.inputs`. Wherever `beds` is saved, add `bathrooms` next to it using the same field key pattern that AnalysisHub uses for bathrooms.

Read AnalysisHub.tsx — find the Bathrooms ISelect in the Property Information section. Note what `setField` key it uses (e.g. `setField('bathrooms', ...)` or `setField('sharedInputs.bathrooms', ...)`).

Then in the deal creation call:
```tsx
inputs: {
  // existing fields...
  [bathroomsFieldKey]: ndData.bathrooms,   // use the actual key from AnalysisHub
  // rest of inputs...
}
```

---

## FIX 4 — Fix country detection when only outcode is available

Open `DashboardPage.tsx`. Find the `handleScrapeUrl` function. Find the postcodes.io block that was added in Prompt 17.

The current code calls `api.postcodes.io/postcodes/{postcode}`. This only works for full postcodes like `"CF24 4RL"`. When Rightmove only provides the outcode (`"CF24"`), this call fails and the country falls back to the default.

**Replace** the entire postcodes.io country detection block with this updated version that handles both full postcodes and outcodes:

```tsx
// Country detection — handles both full postcodes (CF24 4RL) and outcodes (CF24)
if (d.postcode) {
  const rawPc = d.postcode.trim().toUpperCase()
  const isFullPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/.test(rawPc)
  const isOutcodeOnly = /^[A-Z]{1,2}\d{1,2}[A-Z]?$/.test(rawPc)

  let postcodeApiUrl = ''
  if (isFullPostcode) {
    postcodeApiUrl = `https://api.postcodes.io/postcodes/${encodeURIComponent(rawPc)}`
  } else if (isOutcodeOnly) {
    postcodeApiUrl = `https://api.postcodes.io/outcodes/${encodeURIComponent(rawPc)}`
  }

  if (postcodeApiUrl) {
    try {
      const pcRes = await fetch(postcodeApiUrl)
      const pcJson = await pcRes.json()
      if (pcJson.status === 200 && pcJson.result) {
        const r = pcJson.result
        // postcodes.io full postcode returns r.country
        // postcodes.io outcode returns r.admin_county or r.country (as array for outcodes)
        // Handle both response shapes:
        let countryStr = ''
        if (typeof r.country === 'string') {
          countryStr = r.country  // full postcode response
        } else if (Array.isArray(r.country)) {
          countryStr = r.country[0] || ''  // outcode response (array of countries)
        } else if (r.admin_county) {
          // Some outcodes return admin_county — infer country from outcode prefix
          countryStr = rawPc.startsWith('BT') ? 'Northern Ireland'
            : ['CF','CH','LD','LL','NP','SA','SY'].some(p => rawPc.startsWith(p)) ? 'Wales'
            : ['AB','DD','DG','EH','FK','IV','KA','KW','KY','ML','PA','PH','TD','ZE'].some(p => rawPc.startsWith(p)) ? 'Scotland'
            : 'England'
        }

        if (countryStr) {
          // Map postcodes.io country to the exact dropdown option value used in ndData
          // (Check what was confirmed in Prompt 17b — update the map below to match)
          const countryMap: Record<string, string> = {
            'England': 'England & NI',         // adjust if dropdown uses different value
            'Wales': 'Wales',
            'Scotland': 'Scotland',
            'Northern Ireland': 'England & NI',
          }
          const mappedCountry = countryMap[countryStr] ?? 'England & NI'
          setNdData(nd => ({ ...nd, country: mappedCountry }))

          // Calculate stamp duty using raw country string (not mapped dropdown value)
          const sdEstimate = calcStampDuty(d.price ?? 0, countryStr)
          if (sdEstimate > 0) setStampDutyEstimate(sdEstimate)
        }
      }
    } catch (_) {
      // API failed — use prefix matching as final fallback
      const rawPcUp = rawPc.toUpperCase()
      const fallback = rawPcUp.startsWith('BT') ? 'Northern Ireland'
        : ['CF','CH','LD','LL','NP','SA','SY'].some(p => rawPcUp.startsWith(p)) ? 'Wales'
        : ['AB','DD','DG','EH','FK','IV','KA','KW','KY','ML','PA','PH','TD','ZE'].some(p => rawPcUp.startsWith(p)) ? 'Scotland'
        : 'England'
      const countryMap: Record<string, string> = {
        'England': 'England & NI',
        'Wales': 'Wales',
        'Scotland': 'Scotland',
        'Northern Ireland': 'England & NI',
      }
      setNdData(nd => ({ ...nd, country: countryMap[fallback] ?? 'England & NI' }))
      setStampDutyEstimate(calcStampDuty(d.price ?? 0, fallback))
    }
  }
}
```

> **Important:** The `countryMap` values must match the exact dropdown option values confirmed in Prompt 17b. If the Country dropdown uses `"England & NI"` for England/NI, keep it. If it uses `"England"`, change it.

---

## FIX 5 — Also update the AnalysisHub.tsx address onChange cascade for outcode support

In `AnalysisHub.tsx`, find the address field `onChange` handler that was added in Prompt 17. Find the postcode extraction regex and the subsequent postcodes.io fetch call.

The regex currently extracts full postcodes. Update it to also detect outcodes:

```tsx
// Current (full postcode only):
const postcodeMatch = value.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i)

// Replace with (full postcode preferred, outcode as fallback):
const fullPcMatch = value.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2})\b/i)
const outcodePcMatch = value.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/i)
const extractedPostcode = fullPcMatch?.[1] ?? outcodePcMatch?.[1] ?? null
```

Then update the fetch URL in the same block:

```tsx
if (extractedPostcode) {
  const rawPc = extractedPostcode.trim().toUpperCase()
  const isFullPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}$/.test(rawPc)
  const pcApiUrl = isFullPostcode
    ? `https://api.postcodes.io/postcodes/${encodeURIComponent(rawPc)}`
    : `https://api.postcodes.io/outcodes/${encodeURIComponent(rawPc)}`

  fetch(pcApiUrl)
    .then(r => r.json())
    .then(pcData => {
      if (pcData.status === 200 && pcData.result) {
        const r = pcData.result
        let countryStr = typeof r.country === 'string' ? r.country
          : Array.isArray(r.country) ? r.country[0]
          : rawPc.startsWith('BT') ? 'Northern Ireland'
          : ['CF','CH','LD','LL','NP','SA','SY'].some(p => rawPc.startsWith(p)) ? 'Wales'
          : ['AB','DD','DG','EH','FK','IV','KA','KW','KY','ML','PA','PH','TD','ZE'].some(p => rawPc.startsWith(p)) ? 'Scotland'
          : 'England'

        // Map to the exact setField value used in AnalysisHub for country/taxRegion
        // (Use the exact key and value format confirmed in Prompt 17b)
        const analysisHubCountryMap: Record<string, string> = {
          'England': 'England & N. Ireland',    // ← adjust to actual setField value
          'Wales': 'Wales',
          'Scotland': 'Scotland',
          'Northern Ireland': 'England & N. Ireland',
        }
        setField(actualCountryFieldKey, analysisHubCountryMap[countryStr] ?? 'England & N. Ireland')
      }
    })
    .catch(() => {})
}
```

Replace `actualCountryFieldKey` with the real key confirmed in Prompt 17b.

---

## FINAL STEPS

1. Run `npx tsc --noEmit` — zero errors
2. Test with `https://www.rightmove.co.uk/properties/172676537` (Donald Street, Cardiff — no full postcode):
   - Country should update to **Wales**
   - Property type: **Terraced house** ✅
   - Beds: **2** ✅
   - Bathrooms: **1** ✅ (new)
   - SDLT estimate should show Wales LTT rate (~£5,600 for £260k at investor rates)
3. Create the deal, open it, check Inputs tab:
   - Bathrooms: **1** ✅
   - Country/Tax Region: **Wales** ✅

Commit:
```
git add -A && git commit -m "fix: Prompt 17c — outcode country detection + bathrooms scrape" && git push origin stage-6
```

## REPORT BACK

1. Confirm the outcode endpoint (`api.postcodes.io/outcodes/CF24`) returned Wales correctly
2. Confirm `prop.bathrooms` exists in the `__NEXT_DATA__` for this listing and what value it returned
3. What field key bathrooms is saved under in AnalysisHub
4. Whether the test with Donald Street now shows Wales + 1 bathroom correctly
