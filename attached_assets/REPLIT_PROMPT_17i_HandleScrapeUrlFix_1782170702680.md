# REPLIT PROMPT 17i — Fix handleScrapeUrl country/postcode wiring

## Branch: stage-6 | File: DashboardPage.tsx (or wherever New Deal slide-over lives)

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## PROBLEM

The scraper now returns `country`, `postcode`, `bathrooms`, `tenure`, and `epcRating` correctly.
Prompt 17h added the UI dropdowns (Bathrooms, Tenure, EPC) but the **`handleScrapeUrl` wiring was not applied** — country stays on its default ("England & NI"), postcode isn't appended to address, and bathrooms/tenure/epc don't auto-populate.

---

## STEP 1 — READ the file

Read `DashboardPage.tsx` (or whichever file contains `handleScrapeUrl` and the New Deal slide-over).

Find and note:
- The exact function `handleScrapeUrl` — copy its current full body
- The line(s) that currently set `address` from `d.address`
- Whether `country`, `bathrooms`, `tenure`, `epcRating` are set anywhere in this function
- The exact option values in the Country dropdown (e.g. `"England & NI"`, `"Wales"`, `"Scotland"`)
- The current `populated` array used for the success banner

---

## STEP 2 — Fix handleScrapeUrl

Inside `handleScrapeUrl`, after the existing setters for address/price/beds/propertyType:

### 2a. Replace the address setter

Find the existing line like:
```tsx
if (d.address) setNdData(nd => ({ ...nd, address: d.address }))
```
Replace with:
```tsx
if (d.address) {
  const pc = (d.postcode || '').trim().toUpperCase()
  const addr = d.address.trim()
  const fullAddress = (pc && !addr.toUpperCase().includes(pc.split(' ')[0]))
    ? `${addr}, ${pc}`
    : addr
  setNdData(nd => ({ ...nd, address: fullAddress }))
}
```

### 2b. Add country mapping (after address block)

Use the exact Country dropdown option values you found in Step 1:
```tsx
if (d.country) {
  const newDealCountryMap: Record<string, string> = {
    'England': 'England & NI',
    'Wales': 'Wales',
    'Scotland': 'Scotland',
    'Northern Ireland': 'England & NI',
  }
  const mappedCountry = newDealCountryMap[d.country] ?? null
  if (mappedCountry) setNdData(nd => ({ ...nd, country: mappedCountry }))

  // Stamp duty — only if calcStampDuty and setStampDutyEstimate exist
  if (typeof calcStampDuty === 'function' && d.price) {
    const sdEstimate = calcStampDuty(d.price, d.country)
    if (sdEstimate > 0) setStampDutyEstimate(sdEstimate)
  }
}
```

> Update `'England & NI'` to match the exact dropdown option value if it differs.

### 2c. Add bathrooms, tenure, epcRating (after country block)

```tsx
if (d.bathrooms) setNdData(nd => ({ ...nd, bathrooms: d.bathrooms }))
if (d.tenure)    setNdData(nd => ({ ...nd, tenure: d.tenure }))
if (d.epcRating) setNdData(nd => ({ ...nd, epcRating: d.epcRating }))
```

---

## STEP 3 — Update the success banner

Find the `populated` array. Replace with:
```tsx
const populated = [
  d.address      && 'address',
  d.price        && 'price',
  d.beds         && 'beds',
  d.bathrooms    && `${d.bathrooms} bath`,
  d.propertyType && 'property type',
  d.country      && d.country,
  d.tenure       && d.tenure,
  d.epcRating    && `EPC ${d.epcRating}`,
  d.floorAreaSqm && `${d.floorAreaSqm}m²`,
].filter(Boolean)
```

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test with `https://www.rightmove.co.uk/properties/167094860`:
   - Address: `"97 Donald Street, Cardiff, CF24"` ✅
   - Country: **Wales** ✅
   - Banner includes "Wales" ✅
3. Commit:
```
git add -A && git commit -m "fix: Prompt 17i — wire country, postcode, bathrooms, tenure, EPC in handleScrapeUrl" && git push origin stage-6
```

## REPORT BACK

1. What did handleScrapeUrl look like before the fix — was country being set?
2. After fix: does address show with CF24 appended?
3. Does country switch to Wales?
4. Does the banner show "Wales"?
