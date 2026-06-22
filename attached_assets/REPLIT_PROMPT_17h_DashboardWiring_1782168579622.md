# REPLIT PROMPT 17h — Wire Postcode, Country & Bathrooms in DashboardPage.tsx

## Branch: stage-6 | File: DashboardPage.tsx (wherever handleScrapeUrl lives)

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

The `scrape-property` edge function now returns these fields in addition to the originals:
- `postcode` — e.g. `"CF24 2LW"` or outcode only `"CF24"`
- `country` — canonical string: `"England"` | `"Wales"` | `"Scotland"` | `"Northern Ireland"`
- `bathrooms` — string e.g. `"1"`, `"2"`

These are returned in the `data` object from the edge function call (`d.postcode`, `d.country`, `d.bathrooms`).

**The problem:** `handleScrapeUrl` in `DashboardPage.tsx` does not yet use these three fields. They are returned by the edge function but silently ignored on the frontend. The success banner only shows "address, price, beds, property type" — confirming none of the 17d/17e wiring was applied.

---

## STEP 1 — READ FIRST

Read `DashboardPage.tsx` in full. Find `handleScrapeUrl`. Identify:

1. Where `d.address`, `d.price`, `d.beds`, `d.propertyType` are set into `ndData` (the existing setters)
2. The exact field name in `ndData` for country (e.g. `ndData.country`, `ndData.taxRegion`, `ndData.countryRegion`)
3. The exact option values in the Country/Tax Region dropdown — what string does `"England & NI"` use? What does `"Wales"` use? List all.
4. The `populated` array that builds the success banner text
5. Where `scrapeExtra` is built and spread into the deal creation call
6. The exact field key in `AnalysisHub.tsx` for bathrooms (e.g. `setField('bathrooms', ...)`)

---

## STEP 2 — ADD POSTCODE TO ADDRESS

Find the existing address setter in `handleScrapeUrl`:
```tsx
if (d.address) setNdData(nd => ({ ...nd, address: d.address }))
```

Replace with:
```tsx
if (d.address) {
  // Append postcode to address if available and not already present
  const pc = (d.postcode || '').trim().toUpperCase()
  const addr = d.address.trim()
  const fullAddress = (pc && !addr.toUpperCase().includes(pc.split(' ')[0]))
    ? `${addr}, ${pc}`
    : addr
  setNdData(nd => ({ ...nd, address: fullAddress }))
}
```

> **Note:** The edge function now also appends the postcode to `d.address` directly. So `d.address` may already contain the postcode (e.g. `"Elm Street, Cardiff, CF24 2LW"`). The guard `!addr.toUpperCase().includes(pc.split(' ')[0])` prevents doubling up.

---

## STEP 3 — ADD COUNTRY DROPDOWN WIRING

After the existing setters, add:

```tsx
// Country — map canonical scrape result to exact dropdown option value
if (d.country) {
  // UPDATE this map to use the exact option values from the Country dropdown (from Step 1)
  const newDealCountryMap: Record<string, string> = {
    'England': 'England & NI',          // use exact value from dropdown
    'Wales': 'Wales',
    'Scotland': 'Scotland',
    'Northern Ireland': 'England & NI', // NI shares England & NI option
  }
  const mappedCountry = newDealCountryMap[d.country] ?? null
  if (mappedCountry) setNdData(nd => ({ ...nd, country: mappedCountry }))

  // Stamp duty — calculate with the correct country
  if (d.price) {
    const sdEstimate = calcStampDuty(d.price, d.country)
    if (sdEstimate > 0) setStampDutyEstimate(sdEstimate)
  }
}
```

> **Important:** If `calcStampDuty` or `setStampDutyEstimate` don't exist yet, skip those two lines — don't add them unless they're already in the file.

---

## STEP 4 — ADD BATHROOMS WIRING

After the country block, add:

```tsx
// Bathrooms
if (d.bathrooms) setNdData(nd => ({ ...nd, bathrooms: d.bathrooms }))
```

> Replace `bathrooms` in `nd.bathrooms` with the actual field name from `ndData` for bathrooms (from Step 1). If `bathrooms` doesn't exist in `ndData` yet, add it to the initial state object.

---

## STEP 5 — UPDATE THE SUCCESS BANNER

Find the `populated` array (the list that builds "Filled in: address, price, beds…"). Update it to include the new fields:

```tsx
const populated = [
  d.address && 'address',
  d.price && 'price',
  d.beds && 'beds',
  d.bathrooms && `${d.bathrooms} bath`,      // ADD
  d.propertyType && 'property type',
  d.country && d.country,                     // ADD — shows 'Wales', 'Scotland' etc.
  d.tenure && 'tenure',
  d.epcRating && `EPC ${d.epcRating}`,
  d.floorAreaSqm && `${d.floorAreaSqm}m²`,
].filter(Boolean)
```

---

## STEP 6 — SAVE BATHROOMS TO DEAL INPUTS

Find the deal creation call where `ndData` maps to `deal.inputs`. Add bathrooms next to beds, using the exact field key that AnalysisHub uses (from Step 1):

```tsx
inputs: {
  // existing fields...
  [bathroomsFieldKey]: ndData.bathrooms,   // use the actual key from AnalysisHub
  // ...scrapeExtra at end
}
```

---

## STEP 7 — ADD TO scrapeExtra

Find where `scrapeExtra` is built in `handleScrapeUrl`. Add country and bathrooms:

```tsx
if (d.country) extra.country = d.country
if (d.bathrooms) extra.bathrooms = d.bathrooms
```

Also update the `scrapeExtra` TypeScript type/interface to include:
```tsx
country?: string
bathrooms?: string
```

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test with `https://www.rightmove.co.uk/properties/89477043` (Elm Street, Cardiff):
   - Address: **"Elm Street, Cardiff, CF24 2LW"** (or "Elm Street, Cardiff, CF24" if only outcode available) ✅
   - Country: **Wales** ✅
   - Success banner shows: **"address, price, beds, property type, Wales"** ✅
3. Create the deal, open Inputs tab:
   - Country/Tax Region: **Wales** ✅
   - Bathrooms: whatever the scraper returned ✅

Commit:
```
git add -A && git commit -m "fix: Prompt 17h — wire postcode, country, bathrooms in handleScrapeUrl" && git push origin stage-6
```

## REPORT BACK

1. What were the exact `ndData` field names for country and bathrooms?
2. What are the exact Country dropdown option values?
3. Did the address now show with postcode appended?
4. Did the Country dropdown update to Wales?
5. Did the banner show Wales?
