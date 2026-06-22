# REPLIT PROMPT 17h — Wire Postcode, Country, Bathrooms, Tenure & EPC in New Deal Flow

## Branch: stage-6 | Files: DashboardPage.tsx + wherever the New Deal slide-over UI lives

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

The `scrape-property` edge function now returns these fields in the `data` object:
- `postcode` — e.g. `"CF24 2LW"` or outcode `"CF24"`
- `country` — `"England"` | `"Wales"` | `"Scotland"` | `"Northern Ireland"`
- `bathrooms` — string e.g. `"1"`, `"2"`
- `tenure` — `"Freehold"` | `"Leasehold"` | `"Share of freehold"` | `"Commonhold"`
- `epcRating` — `"A"` | `"B"` | `"C"` | `"D"` | `"E"` | `"F"` | `"G"` | `"Unknown"`

None of these are currently wired in `handleScrapeUrl`, and three of them (bathrooms, tenure, EPC) have no visible input field in Step 2 of the New Deal slide-over.

**Two things to fix:**
1. Add Bathrooms, Tenure, and EPC Rating as visible dropdown fields to Step 2 UI
2. Wire all five new fields into `handleScrapeUrl` so they auto-populate from URL fill

---

## STEP 1 — READ FIRST

Read `DashboardPage.tsx` in full. Find and note:

**A. `ndData` shape** — exact property names for all current fields (address, price, beds, country, proptype, etc.)

**B. Step 2 UI** — find the JSX for the New Deal slide-over Step 2. Note:
- Current layout (what dropdowns/inputs exist and their grid arrangement)
- Country dropdown exact option values (e.g. `"England & NI"`, `"Wales"`, `"Scotland"`)
- Bedrooms dropdown exact option values

**C. `handleScrapeUrl`** — find where `d.address`, `d.price`, `d.beds`, `d.propertyType` are set into `ndData`

**D. Deal creation call** — find `supabase.from('deals').insert(...)` or equivalent. Note how `ndData` maps to `deal.inputs` and where `scrapeExtra` is spread.

**E. Read `AnalysisHub.tsx`** — find the exact `setField` keys for: property type, beds, bathrooms, tenure, EPC, country/tax region. These are the keys the deal creation call must use.

---

## STEP 2 — ADD ndData FIELDS

Add `bathrooms`, `tenure`, and `epcRating` to the `ndData` initial state if not already present:

```tsx
const [ndData, setNdData] = useState({
  // existing fields...
  bathrooms: '',   // ADD if missing
  tenure: '',      // ADD if missing
  epcRating: '',   // ADD if missing
})
```

---

## STEP 3 — ADD UI FIELDS TO STEP 2

Find the Step 2 grid/form in the New Deal slide-over. The current layout has:
- Asking Price | Country / Tax Region
- Property Type | Bedrooms

Add three new rows beneath, following the exact same component/styling pattern as the existing dropdowns:

**Bathrooms dropdown** (pair with Tenure in one row):
```
Bathrooms | Tenure
```

**EPC Rating dropdown** (half-width or full-width — match the visual pattern):
```
EPC Rating | (empty or another field)
```

**Bathrooms options** — use the same style as Bedrooms. Options:
`"" (placeholder "Select...")`, `"1"`, `"2"`, `"3"`, `"4"`, `"5"`, `"6+"`

**Tenure options:**
`"" (placeholder "Select...")`, `"Freehold"`, `"Leasehold"`, `"Share of freehold"`, `"Commonhold"`

**EPC Rating options:**
`"" (placeholder "Select...")`, `"A"`, `"B"`, `"C"`, `"D"`, `"E"`, `"F"`, `"G"`, `"Unknown"`

Each dropdown must:
- Be bound to its `ndData` field (`value={ndData.bathrooms}` etc.)
- Call `setNdData(nd => ({ ...nd, bathrooms: e.target.value }))` in `onChange`

---

## STEP 4 — WIRE handleScrapeUrl

Find the existing setters in `handleScrapeUrl` (address, price, beds, propertyType). After the existing block, add:

```tsx
// Postcode — append to address if available and not already present
if (d.address) {
  const pc = (d.postcode || '').trim().toUpperCase()
  const addr = d.address.trim()
  const fullAddress = (pc && !addr.toUpperCase().includes(pc.split(' ')[0]))
    ? `${addr}, ${pc}`
    : addr
  setNdData(nd => ({ ...nd, address: fullAddress }))
}

// Country — map to exact dropdown option value
if (d.country) {
  const newDealCountryMap: Record<string, string> = {
    'England': 'England & NI',          // use the exact option value from the dropdown
    'Wales': 'Wales',
    'Scotland': 'Scotland',
    'Northern Ireland': 'England & NI',
  }
  const mappedCountry = newDealCountryMap[d.country] ?? null
  if (mappedCountry) setNdData(nd => ({ ...nd, country: mappedCountry }))

  // Stamp duty — only if calcStampDuty and setStampDutyEstimate already exist in this file
  if (typeof calcStampDuty === 'function' && d.price) {
    const sdEstimate = calcStampDuty(d.price, d.country)
    if (sdEstimate > 0) setStampDutyEstimate(sdEstimate)
  }
}

// Bathrooms, Tenure, EPC
if (d.bathrooms) setNdData(nd => ({ ...nd, bathrooms: d.bathrooms }))
if (d.tenure)    setNdData(nd => ({ ...nd, tenure: d.tenure }))
if (d.epcRating) setNdData(nd => ({ ...nd, epcRating: d.epcRating }))
```

> **Important:** The address setter above REPLACES the existing `if (d.address) setNdData(...)` line — do not keep both.

> **Country map values:** Update `'England & NI'` etc. to match the exact option values you found in Step 1B.

---

## STEP 5 — UPDATE THE SUCCESS BANNER

Find the `populated` array. Replace with:

```tsx
const populated = [
  d.address    && 'address',
  d.price      && 'price',
  d.beds       && 'beds',
  d.bathrooms  && `${d.bathrooms} bath`,
  d.propertyType && 'property type',
  d.country    && d.country,
  d.tenure     && d.tenure,
  d.epcRating  && `EPC ${d.epcRating}`,
  d.floorAreaSqm && `${d.floorAreaSqm}m²`,
].filter(Boolean)
```

---

## STEP 6 — SAVE TO DEAL INPUTS

In the deal creation call, add the new fields using the exact field keys from AnalysisHub (found in Step 1E):

```tsx
inputs: {
  // existing fields (address, price, beds, propertyType, country)...
  [bathroomsKey]: ndData.bathrooms,
  [tenureKey]:    ndData.tenure,
  [epcKey]:       ndData.epcRating,
  ...scrapeExtra,  // keep this spread LAST
}
```

Replace `bathroomsKey`, `tenureKey`, `epcKey` with the actual field key strings from Step 1E.

---

## STEP 7 — UPDATE scrapeExtra

Find where `scrapeExtra` is built. Add:

```tsx
if (d.country)    extra.country    = d.country
if (d.bathrooms)  extra.bathrooms  = d.bathrooms
if (d.tenure)     extra.tenure     = d.tenure
if (d.epcRating)  extra.epcRating  = d.epcRating
```

Update the `scrapeExtra` TypeScript type to include these fields if not already present.

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test with `https://www.rightmove.co.uk/properties/89477043` (Elm Street, Cardiff):
   - Address: `"Elm Street, Cardiff, CF24 2LW"` or `"Elm Street, Cardiff, CF24"` ✅
   - Country: **Wales** ✅
   - Bathrooms: **1** (or whatever the scraper returns) ✅
   - Tenure: **Freehold** ✅
   - EPC: (whatever is available) ✅
   - Banner: `"address, price, beds, 1 bath, property type, Wales, Freehold"` ✅
3. Confirm Step 2 UI shows Bathrooms, Tenure, EPC dropdowns below Bedrooms
4. Create deal → open → Inputs tab: all fields populated ✅

Commit:
```
git add -A && git commit -m "fix: Prompt 17h — wire postcode, country, bathrooms, tenure, EPC in new deal flow" && git push origin stage-6
```

## REPORT BACK

1. What were the exact `ndData` field names for country, bathrooms, tenure, epcRating?
2. What are the exact Country dropdown option values in the new deal slide-over?
3. Did the address show with postcode appended?
4. Did Country update to Wales?
5. Did Bathrooms, Tenure, EPC dropdowns appear in Step 2?
6. Did all fields populate correctly from the URL fill?
