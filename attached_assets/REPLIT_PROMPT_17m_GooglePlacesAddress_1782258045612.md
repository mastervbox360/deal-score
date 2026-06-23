# REPLIT PROMPT 17m — Google Places Autocomplete on Address field

## Branch: stage-6 | File: DashboardPage.tsx (New Deal slide-over Step 2)

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

The New Deal slide-over address field is a plain text input. The old UI had Google Places Autocomplete — as the user types, a dropdown shows matching UK addresses including full postcodes. Selecting an address auto-fills the full address string (e.g. "65a Horwood Close, Cardiff, CF24 2LW") which then gives us the postcode needed for property intelligence (EPC, flood risk, country).

`VITE_GOOGLE_MAPS_API_KEY` may already exist in Replit Secrets/environment.

---

## STEP 1 — Check if Google Maps API key exists

In the Shell:
```bash
echo $VITE_GOOGLE_MAPS_API_KEY
```

If empty, check Replit Secrets tab for any key named `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, or similar.

Report what key name and value (first 8 chars only) you find.

---

## STEP 2 — Check if Google Places is already wired anywhere

Search the codebase for any existing Google Places/Maps implementation:
```bash
grep -r "google\|places\|autocomplete\|GooglePlaces" src/ --include="*.tsx" --include="*.ts" -l
```

If found, read those files and note how it was previously implemented.

---

## STEP 3 — Add Google Places Autocomplete to the address input

### 3a. Load the Google Maps script

In the main HTML file (`index.html`) or wherever scripts are loaded, add (if not already present):
```html
<script
  src="https://maps.googleapis.com/maps/api/js?key=VITE_GOOGLE_MAPS_API_KEY_VALUE&libraries=places&region=GB&language=en"
  async
  defer
></script>
```

Replace `VITE_GOOGLE_MAPS_API_KEY_VALUE` with the actual env variable reference for your setup (e.g. `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`). If using Vite, inject it via the HTML plugin or load it dynamically in the component.

### 3b. Dynamic script loading in the component

If the key isn't already loaded globally, add a dynamic loader in DashboardPage.tsx:

```tsx
useEffect(() => {
  if (typeof window === 'undefined') return
  if ((window as any).google?.maps?.places) return // already loaded
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) return
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&region=GB&language=en`
  script.async = true
  document.head.appendChild(script)
}, [])
```

### 3c. Wire Autocomplete to the address input

Add a ref to the address input and initialise Places Autocomplete when the New Deal slide-over opens (Step 2 is shown):

```tsx
const addressInputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  // Only initialise when Step 2 is visible
  if (ndStep !== 2) return
  if (!(window as any).google?.maps?.places) return
  if (!addressInputRef.current) return

  const autocomplete = new (window as any).google.maps.places.Autocomplete(
    addressInputRef.current,
    {
      componentRestrictions: { country: 'gb' },
      fields: ['formatted_address', 'address_components', 'geometry'],
      types: ['address'],
    }
  )

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace()
    if (!place?.formatted_address) return

    // Extract full address
    const fullAddress = place.formatted_address
      .replace(', UK', '')
      .replace(', United Kingdom', '')
      .trim()

    // Extract postcode from address components
    const postcodeComponent = place.address_components?.find(
      (c: any) => c.types.includes('postal_code')
    )
    const postcode = postcodeComponent?.long_name || ''

    // Set address in ndData
    setNdData(nd => ({ ...nd, address: fullAddress }))

    // Immediately call property intelligence with the full postcode
    if (postcode || fullAddress) {
      fetchPropertyIntelligence(postcode, fullAddress).then(intel => {
        if (!intel || !intel.success) return
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
        if (intel.country) {
          const mapped = newDealCountryMap[intel.country as string] ?? null
          if (mapped) {
            setNdData(nd => ({ ...nd, country: mapped }))
            setNdDataSource(s => ({ ...s, country: 'Via postcode lookup' }))
          }
        }
      }).catch(() => {})
    }
  })

  return () => {
    (window as any).google?.maps?.event?.clearInstanceListeners(autocomplete)
  }
}, [ndStep])
```

### 3d. Attach the ref to the address input

Find the address `<input>` in Step 2 and add `ref={addressInputRef}`:
```tsx
<input
  ref={addressInputRef}
  type="text"
  value={ndData.address}
  onChange={e => setNdData(nd => ({ ...nd, address: e.target.value }))}
  placeholder="Start typing an address..."
  // ... existing className etc
/>
```

**Remove the `onBlur` handler** from the address input — the Places `place_changed` listener replaces it.

---

## STEP 4 — Keep the onBlur as fallback

If Google Places fails to load (no key, blocked, etc.), keep the `onBlur` handler as a fallback so manual address entry still triggers property intelligence:

```tsx
onBlur={(e) => {
  // Only fire if Google Places hasn't already handled this
  if ((window as any).google?.maps?.places) return
  const typed = e.target.value.trim()
  if (!typed) return
  const pc = extractPostcodeFromAddress(typed)
  if (!pc) return // without Google Places, we need a postcode in the address
  fetchPropertyIntelligence(pc, typed).then(intel => {
    if (!intel?.success) return
    if (intel.epcRating) setNdData(nd => ({ ...nd, epcRating: intel.epcRating }))
    if (intel.tenure)    setNdData(nd => ({ ...nd, tenure: intel.tenure }))
    if (intel.country) {
      const mapped = newDealCountryMap[intel.country as string] ?? null
      if (mapped) setNdData(nd => ({ ...nd, country: mapped }))
    }
  }).catch(() => {})
}}
```

---

## STEP 5 — Also call property-intelligence after URL fill

This is still needed for URL fills where the user doesn't touch the address field. In `handleScrapeUrl`, after setting ndData from the scrape:

```tsx
const pcForLookup = d.postcode || extractPostcodeFromAddress(d.address || '')
if (pcForLookup || d.address) {
  fetchPropertyIntelligence(pcForLookup || '', d.address || '').then(intel => {
    if (!intel?.success) return
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

---

## STEP 6 — Update property-intelligence to handle address-only

Update `supabase/functions/property-intelligence/index.ts`:

Change the validation:
```typescript
if (!postcode && !address) {
  return errorResponse('postcode or address required', 400)
}
```

When postcode is empty but address is provided, use Nominatim to geocode:
```typescript
let pc = postcode ? postcode.replace(/\s+/g, ' ').trim().toUpperCase() : ''
let isFullPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}$/.test(pc)

if (!pc && address) {
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', UK')}&limit=1&format=json`,
      { headers: { 'User-Agent': 'DealScore/1.0' } }
    )
    if (geoRes.ok) {
      const geoJson = await geoRes.json()
      if (Array.isArray(geoJson) && geoJson.length > 0) {
        result.latitude = parseFloat(geoJson[0].lat)
        result.longitude = parseFloat(geoJson[0].lon)
        // Reverse geocode to postcode
        const revRes = await fetch(
          `https://api.postcodes.io/postcodes?lon=${geoJson[0].lon}&lat=${geoJson[0].lat}&limit=1`
        )
        if (revRes.ok) {
          const revJson = await revRes.json()
          const derived = revJson?.result?.[0]?.postcode
          if (derived) { pc = derived; isFullPostcode = true }
        }
      }
    }
  } catch (_) {}
}
```

Deploy the updated function to Supabase after editing.

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test: open New Deal → Step 2 → type "Horwood Close Cardiff" in address → confirm Google Places dropdown appears with full address options including postcode
3. Select an address → confirm EPC, Tenure, Country auto-populate with "Via EPC Register" / "Via postcode lookup" labels
4. Test URL fill → confirm property intelligence fires and fills gaps
5. Commit:
```
git add -A && git commit -m "feat: Prompt 17m — Google Places autocomplete + property intelligence wiring" && git push origin stage-6
```

## REPORT BACK

1. Was `VITE_GOOGLE_MAPS_API_KEY` found in secrets?
2. Did Google Places dropdown appear on address field?
3. After selecting an address: did EPC, Tenure, Country populate?
4. After URL fill: did property intelligence fire (check browser console for `[intel] result:`)?
