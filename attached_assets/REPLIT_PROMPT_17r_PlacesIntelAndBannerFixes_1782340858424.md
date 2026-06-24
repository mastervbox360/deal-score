# REPLIT PROMPT 17r — Fix Places intel cascade + country default + banner

## Branch: stage-6 | File: DashboardPage.tsx

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

Google Places dropdown is now working. When an address is selected, three problems remain:

1. **Country doesn't populate on first selection** — only after clicking back into the address field a second time
2. **Tenure, EPC Rating, Flood Risk never populate** from property-intelligence (even though the function is deployed and reachable)
3. **Country defaults to "England & NI"** when unknown — should show "Select..."
4. **"Filled in:" banner** has inconsistent language — needs reformatting

---

## FIX 1 — Add diagnostics to `place_changed` and fix country update

Read `DashboardPage.tsx`. Find the `useEffect` that creates `google.maps.places.Autocomplete` and its `place_changed` listener.

Inside the listener, immediately after `const postcode = postcodeComp?.long_name || ''`, add:
```tsx
console.log('[places] selected — postcode:', postcode, '| address:', fullAddress)
```

Then inside the `.then(intel => { ... })` block, as the first line, add:
```tsx
console.log('[places] intel result:', JSON.stringify(intel))
```

**Also fix the stale closure bug causing the "re-click needed" issue:**

The `place_changed` listener is set up once when `newDealStep` becomes 2, but it closes over functions that may have stale references. Fix by using a `ref` to hold the latest intel handler:

Find where `fetchPropertyIntelligence` is defined. Make sure it's defined with `useCallback` or outside the component so it's a stable reference. If it's a plain `async function` inside the component, that's fine — just ensure the `place_changed` listener doesn't get stale.

The most reliable fix: move the property-intelligence call OUT of the `place_changed` listener and into a separate `useEffect` that watches a new state variable `ndSelectedPostcode`:

```tsx
const [ndSelectedPostcode, setNdSelectedPostcode] = useState('')
const [ndSelectedAddress, setNdSelectedAddress] = useState('')
```

In the `place_changed` listener, after setting `ndData.address`, just set these:
```tsx
setNdSelectedPostcode(postcode)
setNdSelectedAddress(fullAddress)
```

Then add a NEW `useEffect` that fires when either changes:
```tsx
useEffect(() => {
  if (!ndSelectedPostcode && !ndSelectedAddress) return
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
    if (intel.country) {
      const mapped = newDealCountryMap[intel.country as string] ?? null
      if (mapped) {
        setNdData(nd => ({ ...nd, country: mapped }))
        setNdDataSource(s => ({ ...s, country: 'Via postcode lookup' }))
      }
    }
  }).catch(() => {})
}, [ndSelectedPostcode, ndSelectedAddress])
```

**Important:** Check what `newDealCountryMap` looks like. It should map:
- `'Wales'` → the Wales dropdown value (e.g. `'Wales (LTT)'` or `'Wales'`)
- `'Scotland'` → the Scotland dropdown value
- `'Northern Ireland'` → the Northern Ireland dropdown value
- `'England'` → the England dropdown value (e.g. `'England & NI'` or `'England'`)

Print it in a console.log so we can verify the mapping is correct:
```tsx
console.log('[places] newDealCountryMap:', JSON.stringify(newDealCountryMap))
console.log('[places] intel.country raw:', intel.country)
```

---

## FIX 2 — Country should default to "Select..." not "England & NI"

Find `handleScrapeUrl` (or wherever the scrape result populates `ndData`). Find where `country` is set:
```tsx
country: d.country || 'England'   // or similar default
```
Change to:
```tsx
country: d.country || ''
```

Also check the `ndData` initial state at the top of the component — if `country` is initialised to `'England'`, `'England & NI'`, or any non-empty string, change it to `''`.

The Country dropdown should show "Select..." when no country has been determined.

---

## FIX 3 — Rewrite the "Filled in:" / "Auto-filled:" banner

Find where the banner string is constructed after a successful scrape (look for "Filled in:" string). Replace the entire banner construction with:

```tsx
const filledParts: string[] = []
if (d.address)       filledParts.push('Address')
if (d.price)         filledParts.push(`£${Number(d.price).toLocaleString()}`)
if (d.propertyType)  filledParts.push(d.propertyType)
if (d.beds)          filledParts.push(`${d.beds} bed`)
if (d.bathrooms)     filledParts.push(`${d.bathrooms} bath`)
if (d.tenure)        filledParts.push(d.tenure)
if (d.country)       filledParts.push(d.country)
if (d.epcRating)     filledParts.push(`EPC ${d.epcRating}`)

const filledText = filledParts.length > 0
  ? `Auto-filled: ${filledParts.join(' · ')}`
  : 'Details filled in'
```

Update wherever `filledText` (or the equivalent variable) is rendered in JSX to use this new string.

Examples of what this produces:
- `Auto-filled: Address · £350,000 · Town house · 3 bed · 2 bath · Freehold`
- `Auto-filled: Address · £160,000 · Semi-detached house · 2 bed · 1 bath · Freehold · Wales`

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test: open New Deal → Step 2 → type "Horwood Close Cardiff" → select "65a Horwood Close, Cardiff CF24 2LW"
   - Open DevTools console
   - Check `[places] selected —` log: does it show postcode CF24 2LW?
   - Check `[places] intel result:` log: what fields does it return?
   - Does Country populate with "Wales" immediately (without re-clicking)?
3. Test URL fill with `https://www.rightmove.co.uk/properties/89986869`:
   - Banner should show `Auto-filled: Address · £160,000 · ...`
   - Country should show "Select..." if no country detected
4. Commit:
```
git add -A && git commit -m "fix: Prompt 17r — Places intel cascade, country default Select, auto-filled banner" && git push origin stage-6
```

## REPORT BACK

1. What does `[places] selected —` show for postcode and address?
2. What does `[places] intel result:` show? (full JSON)
3. What does `[places] newDealCountryMap:` show?
4. Does country now populate immediately on first address selection?
5. Does the banner now show `Auto-filled: ...` format?
