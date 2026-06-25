# REPLIT PROMPT 17s — Instant country from postcodes.io + EPC background call

## Branch: stage-6 | File: DashboardPage.tsx

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

Country takes 3-4 seconds to populate after selecting a Google Places address. This is because `fetchPropertyIntelligence` (the Supabase edge function) waits for EPC + flood risk API calls to complete before returning — even though the country is available after a fast postcodes.io call (~200ms).

The fix: call postcodes.io **directly from the frontend** for instant country, then call property-intelligence separately in the background for EPC and flood risk.

postcodes.io is a public API with no CORS restrictions — it can be called directly from the browser.

---

## STEP 1 — Add a fast postcodes.io lookup function

Read `DashboardPage.tsx`. Near the `fetchPropertyIntelligence` function, add:

```tsx
async function fetchPostcodeCountry(postcode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`)
    const json = await res.json()
    if (json.status === 200 && json.result?.country) {
      return json.result.country as string
    }
  } catch (_) {}
  return null
}
```

---

## STEP 2 — Update the Places useEffect to call postcodes.io directly

Find the `useEffect` with `[ndSelectedPostcode, ndSelectedAddress]` dependency (added in Prompt 17r). This currently calls `fetchPropertyIntelligence` for everything.

Replace it with two separate calls — one instant, one background:

```tsx
useEffect(() => {
  if (!ndSelectedPostcode && !ndSelectedAddress) return

  // ── Fast: get country instantly from postcodes.io ──────────────────────
  if (ndSelectedPostcode) {
    fetchPostcodeCountry(ndSelectedPostcode).then(countryRaw => {
      if (!countryRaw) return
      const mapped = newDealCountryMap[countryRaw] ?? null
      if (mapped) {
        setNdData(nd => ({ ...nd, country: mapped }))
        setNdDataSource(s => ({ ...s, country: 'Via postcode lookup' }))
      }
    }).catch(() => {})
  }

  // ── Background: EPC + flood risk via edge function ─────────────────────
  fetchPropertyIntelligence(ndSelectedPostcode, ndSelectedAddress).then(intel => {
    if (!intel?.success) return
    console.log('[places] intel result:', JSON.stringify(intel))
    if (intel.epcRating) {
      setNdData(nd => ({ ...nd, epcRating: intel.epcRating }))
      setNdDataSource(s => ({ ...s, epcRating: 'Via EPC Register' }))
    }
    if (intel.tenure) {
      setNdData(nd => ({ ...nd, tenure: intel.tenure }))
      setNdDataSource(s => ({ ...s, tenure: 'Via EPC Register' }))
    }
    if (intel.floodRisk) {
      setScrapeExtra((e: ScrapeExtra) => ({ ...e, floodRisk: intel.floodRisk }))
    }
    // Only set country from intel if not already set by the fast lookup
    if (intel.country && !ndData.country) {
      const mapped = newDealCountryMap[intel.country as string] ?? null
      if (mapped) {
        setNdData(nd => ({ ...nd, country: mapped }))
        setNdDataSource(s => ({ ...s, country: 'Via postcode lookup' }))
      }
    }
  }).catch(() => {})
}, [ndSelectedPostcode, ndSelectedAddress])
```

---

## STEP 3 — Also do the fast lookup after URL fill

Find `handleScrapeUrl`. After the scrape result is applied, find where `fetchPropertyIntelligence` is called for URL fills. Add the same fast postcodes.io lookup immediately before it:

```tsx
const pcForLookup = d.postcode || extractPostcodeFromAddress(d.address || '')

// Fast: instant country
if (pcForLookup && !d.country) {
  fetchPostcodeCountry(pcForLookup).then(countryRaw => {
    if (!countryRaw) return
    const mapped = newDealCountryMap[countryRaw] ?? null
    if (mapped) {
      setNdData(nd => ({ ...nd, country: mapped }))
      setNdDataSource(s => ({ ...s, country: 'Via postcode lookup' }))
    }
  }).catch(() => {})
}

// Background: EPC + flood
if (pcForLookup || d.address) {
  fetchPropertyIntelligence(pcForLookup || '', d.address || '').then(intel => {
    // ... existing intel cascade
  }).catch(() => {})
}
```

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test: open New Deal → Step 2 → type "Horwood Close Cardiff" → select address from dropdown
   - Country should populate **within ~1 second** (not 3-4s)
   - EPC/tenure/flood should populate a few seconds later in background (if EPC_API_KEY is set in Supabase)
3. Test URL fill with `https://www.rightmove.co.uk/properties/89986869` — country should also populate quickly
4. Commit:
```
git add -A && git commit -m "fix: Prompt 17s — instant country via postcodes.io direct call, EPC in background" && git push origin stage-6
```

## REPORT BACK

1. How quickly does country now populate after selecting a Places address?
2. Does `[places] intel result:` show epcRating, tenure, floodRisk in console?
3. Do those fields populate in the slide-over?
