# REPLIT PROMPT 17n — HTML fallback: bathrooms + tenure + verify intel wiring

## Branch: stage-6

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

When Rightmove doesn't include `__NEXT_DATA__` in the page (which is the case for most active listings), the scraper falls back to parsing rendered HTML. This fallback path currently extracts: address, price, beds, property type, postcode, country, images. It does **not** extract bathrooms or tenure, even though both are visible on the Rightmove listing page.

Example listing: `https://www.rightmove.co.uk/properties/89986869`
- Shows: Semi-Detached, 2 beds, **1 bathroom**, Freehold tenure, £160,000
- Scraper returns: address, price, beds, property type ✅ — but **no bathrooms, no tenure** ❌

Additionally, property-intelligence isn't firing after URL fill so Country stays wrong (shows "England & NI" for a Cardiff CF5 listing) and EPC/Flood risk are never populated.

---

## FIX 1 — Add tenure extraction to HTML fallback in `scrape-property/index.ts`

Read `supabase/functions/scrape-property/index.ts`. Find the HTML fallback section in `parseRightmove` — it starts with the comment `// ── Fallback: parse rendered HTML ──` and ends just before `return data`.

Inside this section, after the leasehold details block and before `return data`, add:

```typescript
// Tenure from full HTML text — Rightmove renders this in the specs section
if (!data.tenure) {
  if (/share\s+of\s+freehold/i.test(html)) data.tenure = 'Share of freehold'
  else if (/commonhold/i.test(html)) data.tenure = 'Commonhold'
  else if (/leasehold/i.test(html)) data.tenure = 'Leasehold'
  else if (/freehold/i.test(html)) data.tenure = 'Freehold'
}
```

---

## FIX 2 — Add bathrooms extraction to HTML fallback

In the same location (HTML fallback section, before `return data`), add:

```typescript
// Bathrooms from rendered HTML text
// Rightmove renders "1 bathroom" or "2 bathrooms" as visible text in the specs section
if (!data.bathrooms) {
  const pageText = stripHtml(html)
  // Match "1 bathroom" or "2 bathrooms"
  const bathM = pageText.match(/\b(\d+)\s+bathroom/i)
  if (bathM) {
    const n = parseInt(bathM[1])
    if (!isNaN(n) && n > 0 && n <= 10) data.bathrooms = String(n)
  }
}
```

---

## FIX 3 — Update the console.log to include all fields

Find the existing `console.log('[scraper] result:', ...)` line near the bottom of the HTML fallback and replace it with:

```typescript
console.log('[scraper] result:', JSON.stringify({
  postcode: data.postcode, country: data.country,
  address: data.address, price: data.price,
  tenure: data.tenure, bathrooms: data.bathrooms, beds: data.beds
}))
```

---

## FIX 4 — Deploy updated scraper to Supabase

Paste the full updated `scrape-property/index.ts` into Supabase → Edge Functions → `scrape-property` → Code tab → Deploy updates.

---

## FIX 5 — Verify property-intelligence wiring in `DashboardPage.tsx`

Read `DashboardPage.tsx`. Find `handleScrapeUrl` (or wherever the scrape result is processed).

**Report:** Is there a call to `fetchPropertyIntelligence` after the scrape data is applied? If yes, paste the exact condition that guards it — specifically what `if (...)` wraps the call.

If the condition is `if (pcForLookup)` or `if (pcForLookup && ...)` with no fallback for address-only, fix it to:

```tsx
const pcForLookup = d.postcode || extractPostcodeFromAddress(d.address || '')
const addressForLookup = d.address || ''

if (pcForLookup || addressForLookup) {
  fetchPropertyIntelligence(pcForLookup || '', addressForLookup).then(intel => {
    if (!intel || !intel.success) return
    console.log('[intel] result after URL fill:', JSON.stringify(intel))
    if (intel.epcRating && !d.epcRating) {
      setNdData(nd => ({ ...nd, epcRating: intel.epcRating }))
      setNdDataSource(s => ({ ...s, epcRating: 'Via EPC Register' }))
    }
    if (intel.tenure && !d.tenure) {
      setNdData(nd => ({ ...nd, tenure: intel.tenure }))
      setNdDataSource(s => ({ ...s, tenure: 'Via EPC Register' }))
    }
    if (intel.floodRisk) {
      setScrapeExtra((e: ScrapeExtra) => ({ ...e, floodRisk: intel.floodRisk }))
    }
    if (intel.country && !d.country) {
      const mapped = newDealCountryMap[intel.country as string] ?? null
      if (mapped) {
        setNdData(nd => ({ ...nd, country: mapped }))
        setNdDataSource(s => ({ ...s, country: 'Via postcode lookup' }))
      }
    }
  }).catch(() => {})
}
```

Make sure `fetchPropertyIntelligence` accepts an optional `address` string and passes it to the edge function:

```tsx
async function fetchPropertyIntelligence(postcode: string, address?: string) {
  const { data, error } = await supabase.functions.invoke('property-intelligence', {
    body: { postcode, address },
  })
  if (error) {
    console.error('[intel] error:', error)
    return null
  }
  console.log('[intel] result:', JSON.stringify(data))
  return data
}
```

---

## FIX 6 — Debug Google Places autocomplete

The Google Places dropdown is not appearing. Find the `useEffect` that loads the Google Maps script and the `useEffect` that initialises `Autocomplete` on the address input.

Add a console.log to each to help diagnose:

In the script loader useEffect:
```tsx
console.log('[maps] VITE_GOOGLE_MAPS_API_KEY present:', !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
console.log('[maps] google.maps already loaded:', !!(window as any).google?.maps)
```

In the Autocomplete init useEffect:
```tsx
console.log('[maps] ndStep:', ndStep, '| google.maps.places:', !!(window as any).google?.maps?.places)
console.log('[maps] addressInputRef.current:', !!addressInputRef.current)
```

After the `autocomplete.addListener('place_changed', ...)` setup:
```tsx
console.log('[maps] Autocomplete attached to input')
```

These logs will tell us whether the issue is: (a) no API key, (b) script not loading, (c) ref not attached, or (d) Places library not available.

**Do not** try to fix Places in this prompt — just get the debug logs in place so we can diagnose from the browser console.

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Deploy updated `scrape-property` to Supabase (full paste)
3. Test with `https://www.rightmove.co.uk/properties/89986869`:
   - Open browser DevTools → Console
   - Paste URL → Fill in
   - Check `[scraper] result:` log — tenure and bathrooms should now be present
   - Check `[intel] result after URL fill:` log — should show country: "Wales", epcRating, floodRisk
   - In the slide-over: Bathrooms, Tenure, EPC Rating, Country should all populate
4. Also check the `[maps]` logs to report back on Google Places status
5. Commit:
```
git add -A && git commit -m "fix: Prompt 17n — HTML fallback bathrooms+tenure, fix intel wiring, debug Places" && git push origin stage-6
```

## REPORT BACK

1. What did `[scraper] result:` show for tenure and bathrooms after deploy?
2. What did `[intel] result after URL fill:` show?
3. Did Bathrooms, Tenure, Country, EPC Rating all populate in the slide-over?
4. What did the `[maps]` logs show? (Is the API key present? Is google.maps loading?)
