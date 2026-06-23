# REPLIT PROMPT 17k — Property Intelligence: EPC, Tenure & Flood Risk from Address

## Branch: stage-6

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

The old UI had a "Property Intelligence" feature that auto-populated EPC rating, tenure, and flood risk purely from the property's postcode/address — without needing a Rightmove URL. We need to restore this behaviour so it works in two cases:

1. **URL fill** — after scraping a Rightmove/Zoopla/OTM URL
2. **Manual address entry** — when the user types an address directly into the Address field in the New Deal slide-over Step 2

In both cases, the moment we have a postcode (either scraped or extracted from a typed address), we should call a property intelligence lookup and auto-populate: EPC Rating, Tenure, and Flood Risk.

---

## STEP 1 — Create a new Supabase edge function: `property-intelligence`

Create `supabase/functions/property-intelligence/index.ts` with the following logic:

### Input
```json
{ "postcode": "CF24 2LW" }
```
Postcode can be a full postcode (`CF24 2LW`) or outcode only (`CF24`).

### Output
```json
{
  "success": true,
  "epcRating": "D",
  "tenure": "Freehold",
  "floodRisk": "Very low",
  "lat": 51.487,
  "lng": -3.156,
  "country": "Wales"
}
```

### Logic

**1. Postcodes.io — get lat/lng and country**
```
GET https://api.postcodes.io/postcodes/{postcode}
```
- If full postcode: use `/postcodes/{postcode}`
- If outcode only: use `/outcodes/{outcode}`
- Extract: `latitude`, `longitude`, `country`
- Map country to canonical: 'England' | 'Wales' | 'Scotland' | 'Northern Ireland'

**2. EPC Register API — get EPC rating**
```
GET https://epc.opendatacommunities.org/api/v1/domestic/search?postcode={postcode}&size=1
Authorization: Basic base64(EPC_API_EMAIL:EPC_API_KEY)
Accept: application/json
```
- Extract `rows[0]['current-energy-rating']`
- Normalise to A–G

Also check EPC rows for tenure mention:
```typescript
// EPC certificates sometimes record tenure
const tenure = rows[0]?.tenure || rows[0]?.['property-type'] || ''
// Look for freehold/leasehold in any text fields
const epcText = JSON.stringify(rows[0] || {}).toLowerCase()
if (/share.of.freehold/.test(epcText)) epcTenure = 'Share of freehold'
else if (/leasehold/.test(epcText)) epcTenure = 'Leasehold'
else if (/freehold/.test(epcText)) epcTenure = 'Freehold'
```

**3. Environment Agency Flood Risk API — get flood risk**

Requires lat/lng from step 1:
```
GET https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat={lat}&long={lng}&dist=0.1
```
OR use the Flood Guidance API:
```
GET https://check-long-term-flood-risk.service.gov.uk/api/flood-risk?x={easting}&y={northing}
```

Simplest reliable approach — use the EA's flood zone lookup:
```
GET https://environment.data.gov.uk/arcgis/rest/services/EA/FloodMapForPlanningRiversAndSeaFloodZone3/MapServer/0/query?geometry={lng},{lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&f=json
```

Flood risk output mapping:
- Zone 3 present → `"High"`
- Zone 2 present → `"Medium"`  
- Zone 1 only → `"Low"`
- No result → `"Very low"`

If the EA API is unreliable or too complex, use this simpler alternative which returns a flood risk score:
```
GET https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat={lat}&long={lng}&dist=1
```
If `items` array is non-empty → "Medium or High", else → "Low or Very low"

**Note:** Flood risk is only relevant for England and Wales. For Scotland, use SEPA flood maps (skip if too complex — return null for Scotland).

**4. CORS headers**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Full function structure
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { postcode } = await req.json()
    if (!postcode) return errorResponse('Postcode required', 400)
    
    const result: Record<string, unknown> = { success: true }
    const pc = postcode.trim().toUpperCase()
    const isFullPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}$/.test(pc)
    
    // 1. postcodes.io
    // 2. EPC Register
    // 3. Flood risk (if lat/lng available)
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return errorResponse((err as Error)?.message || 'Lookup failed', 500)
  }
})
```

---

## STEP 2 — Deploy the new function

1. In Supabase dashboard → Edge Functions → **New function** → name it `property-intelligence`
2. Paste the complete function code
3. Deploy

---

## STEP 3 — Wire in DashboardPage.tsx

Read `DashboardPage.tsx`. Find the New Deal slide-over Step 2 and `handleScrapeUrl`.

### 3a. Create a shared helper function

```tsx
async function fetchPropertyIntelligence(postcode: string) {
  const { data, error } = await supabase.functions.invoke('property-intelligence', {
    body: { postcode },
  })
  return error ? null : data
}
```

### 3b. Call it after URL fill

**Priority rule: Rightmove scraper data always wins.** The property intelligence APIs only fill fields that the scraper could not populate. Never overwrite a value the scraper already returned.

Inside `handleScrapeUrl`, after all scraper fields have been set into ndData, add:

```tsx
// Property intelligence — fills gaps only, never overwrites scraper values
const pcForLookup = d.postcode || extractPostcodeFromAddress(d.address || '')
if (pcForLookup) {
  fetchPropertyIntelligence(pcForLookup).then(intel => {
    if (!intel) return
    // Only set if scraper did NOT return a value (d.xxx is falsy)
    if (intel.epcRating && !d.epcRating) setNdData(nd => ({ ...nd, epcRating: intel.epcRating }))
    if (intel.tenure && !d.tenure)       setNdData(nd => ({ ...nd, tenure: intel.tenure }))
    // Flood risk — always store (scraper never returns this)
    if (intel.floodRisk) setScrapeExtra(e => ({ ...e, floodRisk: intel.floodRisk }))
    // Country — only if scraper didn't set it
    if (intel.country && !d.country) {
      const mapped = newDealCountryMap[intel.country] ?? null
      if (mapped) setNdData(nd => ({ ...nd, country: mapped }))
    }
  })
}
```

### 3c. Trigger on manual address entry

Find the address input field in Step 2. Add an `onBlur` handler (fires when user finishes typing and tabs away):

```tsx
onBlur={(e) => {
  const typed = e.target.value
  const pc = extractPostcodeFromAddress(typed)
  if (pc) {
    fetchPropertyIntelligence(pc).then(intel => {
      if (!intel) return
      if (intel.epcRating) setNdData(nd => ({ ...nd, epcRating: intel.epcRating }))
      if (intel.tenure)    setNdData(nd => ({ ...nd, tenure: intel.tenure }))
      if (intel.floodRisk) setScrapeExtra(e => ({ ...e, floodRisk: intel.floodRisk }))
      if (intel.country && !ndData.country) {
        const mapped = newDealCountryMap[intel.country] ?? null
        if (mapped) setNdData(nd => ({ ...nd, country: mapped }))
      }
    })
  }
}}
```

### 3d. Add the postcode extraction helper

Add this utility near the top of the file or in a utils file:

```tsx
function extractPostcodeFromAddress(address: string): string {
  const full = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2})\b/i)
  if (full) return full[1].toUpperCase().trim()
  const outcode = address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*$/i)
  if (outcode) return outcode[1].toUpperCase().trim()
  return ''
}
```

---

## STEP 4 — Auto-populated source labels

Each field that gets auto-populated should show a small inline label beneath or beside the input indicating the source. This helps the user understand where the data came from and builds trust.

### Label design

Use a small muted tag — match the existing design system's caption/label style. Examples:

```
EPC RATING        [D ▾]
                  ↳ 🔗 Via EPC Register

TENURE            [Freehold ▾]
                  ↳ 🔗 Via Rightmove

COUNTRY           [Wales ▾]
                  ↳ 🔗 Via Rightmove
```

The label should:
- Appear only when the field was auto-populated (not when the user manually selected a value)
- Be small, muted text (e.g. `text-xs text-gray-400`) placed directly below the dropdown
- Show the source: `"Via Rightmove"`, `"Via EPC Register"`, `"Via postcode lookup"`, or `"Via flood data"`
- Disappear / not show when the user manually changes the value

### Implementation

Add a source tracking state object alongside `ndData`:

```tsx
const [ndDataSource, setNdDataSource] = useState<Record<string, string>>({})
```

When setting a field from the scraper, also set its source:
```tsx
setNdDataSource(s => ({ ...s, epcRating: 'Via EPC Register' }))
setNdDataSource(s => ({ ...s, tenure: 'Via Rightmove' }))
setNdDataSource(s => ({ ...s, country: 'Via Rightmove' }))
```

When the user manually changes a dropdown (`onChange`), clear that field's source:
```tsx
onChange={(e) => {
  setNdData(nd => ({ ...nd, tenure: e.target.value }))
  setNdDataSource(s => { const n = {...s}; delete n.tenure; return n })
}}
```

In the JSX, beneath each auto-populated dropdown, render the label conditionally:
```tsx
{ndDataSource.tenure && (
  <p className="text-xs text-gray-400 mt-0.5">{ndDataSource.tenure}</p>
)}
```

Apply this pattern to: **EPC Rating**, **Tenure**, **Country / Tax Region**, and **Bedrooms** (if scraped).

---

## STEP 5 — Flood Risk in deal.inputs

Find where `scrapeExtra` is spread into `deal.inputs` at deal creation. Ensure `floodRisk` is included:

```tsx
inputs: {
  // ... existing fields
  ...scrapeExtra,  // floodRisk will be in here
}
```

Also check if `scrapeExtra` type includes `floodRisk?: string` — add it if not.

---

## STEP 5 — Scraper remains the primary source; property intelligence fills gaps

**Do not remove anything from `scrape-property/index.ts`.** The scraper's tenure text extraction and any EPC it finds from the listing HTML take priority because they reflect what Rightmove actually shows for that specific listing.

The property intelligence function is a fallback — it fills fields the scraper couldn't get. The `!d.epcRating` / `!d.tenure` guards in Step 3b enforce this.

Summary of priority order:
1. Rightmove structured data (`__NEXT_DATA__` / `PAGE_MODEL`) — highest priority
2. Rightmove HTML text extraction (tenure from listing text, EPC from key features)
3. Property intelligence APIs (EPC Register, EA flood risk) — fills remaining gaps
4. Manual user input — always overrides everything

---

## STEP 6 — Auto-populated field labels

When a field in Step 2 has been auto-populated (by scraper OR by property intelligence), show a small inline label beneath the field to signal the source. This helps users know which values were filled automatically vs. left as defaults.

### Label design
Small pill/badge beneath the dropdown, matching the existing UI style:
```tsx
{ndData.epcRating && autoPopulated.epcRating && (
  <span className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
    <CheckCircle size={10} /> Auto-filled
  </span>
)}
```

Use a subtle green `Auto-filled` label with a small check icon (use whatever check/tick icon is already imported in the file).

### Track which fields were auto-populated

Add a state object to track this:
```tsx
const [autoPopulated, setAutoPopulated] = useState<Record<string, boolean>>({})
```

When the scraper sets a field, also mark it:
```tsx
if (d.epcRating) {
  setNdData(nd => ({ ...nd, epcRating: d.epcRating }))
  setAutoPopulated(a => ({ ...a, epcRating: true }))
}
if (d.tenure) {
  setNdData(nd => ({ ...nd, tenure: d.tenure }))
  setAutoPopulated(a => ({ ...a, tenure: true }))
}
```

Do the same when property intelligence sets a field:
```tsx
if (intel.epcRating && !d.epcRating) {
  setNdData(nd => ({ ...nd, epcRating: intel.epcRating }))
  setAutoPopulated(a => ({ ...a, epcRating: true }))
}
```

Clear `autoPopulated` when the user manually changes a field's value (in its `onChange` handler):
```tsx
onChange={e => {
  setNdData(nd => ({ ...nd, epcRating: e.target.value }))
  setAutoPopulated(a => ({ ...a, epcRating: false }))
}}
```

Apply the same pattern to: `country`, `beds`, `propertyType`, `tenure`, `epcRating`.

### Fields that should show the label
- Country / Tax Region
- Property Type
- Bedrooms
- Tenure
- EPC Rating

Address and Price already have the green banner — no additional label needed on those.

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test URL fill: `https://www.rightmove.co.uk/properties/167094860`
   - EPC populates after fill ✅
   - Tenure populates after fill ✅
   - Flood risk stored in scrapeExtra ✅
3. Test manual entry: type `"97 Donald Street, Cardiff, CF24"` into address field, tab away
   - EPC populates ✅
   - Tenure populates ✅
4. Commit:
```
git add -A && git commit -m "feat: Prompt 17k — property intelligence edge function (EPC, tenure, flood risk from postcode)" && git push origin stage-6
```

---

## REPORT BACK

1. Did the `property-intelligence` function deploy successfully?
2. What secrets were found — `EPC_API_KEY` and `EPC_API_EMAIL` both present?
3. After URL fill: did EPC and Tenure populate?
4. After manual address entry: did EPC and Tenure populate?
5. What flood risk level was returned for CF24?
