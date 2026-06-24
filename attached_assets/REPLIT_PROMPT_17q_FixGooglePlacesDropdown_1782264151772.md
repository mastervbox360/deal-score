# REPLIT PROMPT 17q — Fix Google Places dropdown not appearing

## Branch: stage-6 | File: DashboardPage.tsx

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

Google Places is loading correctly (`[maps] script loaded, places available: true`) but the dropdown never appears when typing in the address field. The current implementation is using the **new Places API v2** (`AutocompleteSuggestion.fetchAutocompleteSuggestions`) which requires manually fetching suggestions AND manually rendering a dropdown in React state — that's why nothing appears.

The fix is to switch to the **classic `google.maps.places.Autocomplete` widget**, which attaches directly to an `<input>` element and renders its own native dropdown (the `.pac-container` div). Much simpler and far more reliable.

---

## STEP 1 — Read and understand the current implementation

Read `DashboardPage.tsx`. Find:
1. The `useEffect` that loads the Google Maps script
2. The `useEffect` that sets up autocomplete/suggestions on the address input
3. Any state variables related to address suggestions (e.g. `ndAddressSuggestions`, `fetchNdAddressSuggestions`, etc.)
4. Any JSX that renders the suggestion dropdown

Note exactly what you find before changing anything.

---

## STEP 2 — Remove the new Places API implementation

Remove ALL of the following (search for and delete):
- Any state for address suggestions (e.g. `const [ndAddressSuggestions, setNdAddressSuggestions] = useState(...)`)
- The `fetchNdAddressSuggestions` function
- The `selectNdSuggestion` function  
- Any `useEffect` that calls `AutocompleteSuggestion.fetchAutocompleteSuggestions`
- Any JSX dropdown that maps over `ndAddressSuggestions`

Keep the script loader `useEffect` (the one that appends the `<script>` tag to `document.head`) — just remove the suggestion-fetching logic.

---

## STEP 3 — Add classic Autocomplete widget

### 3a. Add the addressInputRef (if not already present)

At the top of the component, near other refs:
```tsx
const addressInputRef = useRef<HTMLInputElement>(null)
```

### 3b. Add the Autocomplete init useEffect

Add this effect (replace any existing autocomplete init effect):

```tsx
useEffect(() => {
  if (ndStep !== 2) return
  const maps = (window as any).google?.maps
  if (!maps?.places) return
  if (!addressInputRef.current) return

  const autocomplete = new maps.places.Autocomplete(addressInputRef.current, {
    componentRestrictions: { country: 'gb' },
    fields: ['formatted_address', 'address_components'],
    types: ['address'],
  })

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace()
    if (!place?.formatted_address) return

    const fullAddress = place.formatted_address
      .replace(/, UK$/, '')
      .replace(/, United Kingdom$/, '')
      .trim()

    const postcodeComp = place.address_components?.find(
      (c: any) => c.types.includes('postal_code')
    )
    const postcode = postcodeComp?.long_name || ''

    setNdData(nd => ({ ...nd, address: fullAddress }))
    setNdDataSource(s => ({ ...s, address: 'Via Google Places' }))

    if (postcode || fullAddress) {
      fetchPropertyIntelligence(postcode, fullAddress).then(intel => {
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
    maps.event?.clearInstanceListeners(autocomplete)
  }
}, [ndStep])
```

### 3c. Attach the ref to the address input

Find the address `<input>` in Step 2 of the slide-over. Add `ref={addressInputRef}` to it:

```tsx
<input
  ref={addressInputRef}
  type="text"
  value={ndData.address}
  onChange={e => setNdData(nd => ({ ...nd, address: e.target.value }))}
  placeholder="Start typing an address..."
  // ... existing className and other props
/>
```

**Important:** The `<input>` must be a standard HTML input element (not a `<textarea>`). If it's currently a textarea, change it to an input. Google Places Autocomplete only works with `<input>` elements.

---

## STEP 4 — Fix the z-index so the dropdown appears above the modal

The classic Places widget injects a `.pac-container` div into `<body>`. If the slide-over modal has `overflow: hidden` or a low z-index, the dropdown gets clipped or hidden.

Find `index.css` (or the global stylesheet). Add at the bottom:

```css
/* Google Places autocomplete dropdown — must appear above modals */
.pac-container {
  z-index: 9999 !important;
}
```

---

## STEP 5 — Verify the script loader loads `places` library

Find the script loader `useEffect`. Make sure the `<script>` src includes `&libraries=places`:

```tsx
script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&region=GB&language=en`
```

Add a console log after `document.head.appendChild(script)`:
```tsx
script.onload = () => {
  console.log('[maps] script loaded, places available:', !!(window as any).google?.maps?.places)
}
```

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test: open New Deal → Step 2 → type "Horwood Close Cardiff" in the address field slowly
   - A native Google Places dropdown should appear below the input with UK address suggestions
   - Select "65a Horwood Close, Cardiff CF24 2LW"
   - Address field should fill with the full address
   - EPC Rating, Tenure, Country should auto-populate
3. Check browser console for `[places] intel result:` to confirm property intelligence ran
4. Commit:
```
git add -A && git commit -m "fix: Prompt 17q — switch to classic Places Autocomplete, fix dropdown z-index" && git push origin stage-6
```

## REPORT BACK

1. What did the old implementation use? (new API vs classic Autocomplete)
2. Does the Places dropdown now appear when typing?
3. After selecting an address: does EPC, Tenure, Country populate?
4. What does `[places] intel result:` show in console?
