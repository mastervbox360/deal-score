# REPLIT PROMPT 17 — Scraper Fix + Full Property Intelligence Cascade

## Branch: stage-6 | File paths: artifacts/dealscore/src/...

**Standing rule:** Only edit the minimal code required. Do NOT touch existing Supabase calls, auth, deal calculations, routing, or any prompt-unrelated state. `npx tsc --noEmit` zero errors before committing.

---

## OVERVIEW

This prompt does **five things**:

1. **Fix two binding bugs** in the New Deal slide-over — property type and country dropdowns not reflecting scraped values
2. **Deploy `land-registry-comps` edge function** (written below — creates it for the first time)
3. **Add a `property-intelligence` edge function** — postcodes.io + EPC Register + EA Flood Risk, all free, no API key needed for postcodes.io and EA
4. **Wire the intelligence cascade** — when a listing URL is pasted OR a postcode is typed in the address field, auto-populate Country, EPC Rating, Flood Risk, and stamp duty estimate
5. **Auto-trigger Land Registry comps** — when postcode is available (from scrape or address entry), fire comps automatically rather than requiring manual button press

---

## PART 1 — Fix the binding bugs in the New Deal slide-over

**Before making any changes**, read the New Deal slide-over component (DealsDashboard.tsx or wherever the nd-panel / step dots live) in full. You need to identify the **actual** state setter names currently used for these Step 2 form fields:

- Address field → what is the `useState` setter called? (e.g. `setAddress`, `setNdAddress`, `setNewDealAddress`)
- Purchase price field → what is the setter called?
- Beds field → what is the setter called?
- Property type dropdown → what is the setter called? What is the ISelect `value` prop bound to?
- Country dropdown → what is the setter called? What are the option values used? (e.g. `'England'`, `'England & NI'`, `'Wales'`, `'Scotland'`, `'Northern Ireland'`?)

Once you have found the real names, locate the `handleScrapeUrl` function (added by Prompt B) and fix these two specific lines to use the actual setter names:

```tsx
// FIND these lines (they may use placeholder names):
if (d.propertyType) setNdPropType(d.propertyType)
// ...country detection block calling setNdCountry(...)
```

**For property type:**
Replace `setNdPropType` with the real setter name you found. The value `d.propertyType` is already the canonical ISelect option string (e.g. `'Terraced house'`) — no mapping needed.

**For country — replace the entire prefix-matching block** with a postcodes.io call:

```tsx
// REPLACE the existing if (d.postcode) { ... setNdCountry(...) } block with:
if (d.postcode) {
  try {
    const pcRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(d.postcode.trim())}`)
    const pcJson = await pcRes.json()
    if (pcJson.status === 200 && pcJson.result) {
      const r = pcJson.result
      // Map postcodes.io country string to the exact option value used in your dropdown
      // Check what option values the Country dropdown uses and map accordingly:
      const countryMap: Record<string, string> = {
        'England': 'England',          // adjust if dropdown uses 'England & NI'
        'Wales': 'Wales',
        'Scotland': 'Scotland',
        'Northern Ireland': 'Northern Ireland',
      }
      const mappedCountry = countryMap[r.country] ?? r.country
      // Store lat/lng for flood risk lookup later in this function
      scrapeLatLng = { lat: r.latitude, lng: r.longitude }
      // Replace setNdCountry with the actual setter name:
      setNdCountry(mappedCountry)
    }
  } catch (_) {
    // postcodes.io failed — fall back silently, country stays blank
  }
}
```

> **IMPORTANT:** The postcodes.io country value is one of: `'England'`, `'Wales'`, `'Scotland'`, `'Northern Ireland'`. Compare these to the actual option values in the Country/Tax Region ISelect and use the correct values. If the dropdown option for England is `'England & NI'`, update the map accordingly.

Add this variable declaration just before the `try` block in `handleScrapeUrl`:
```tsx
let scrapeLatLng: { lat: number; lng: number } | null = null
```

---

## PART 2 — Create `property-intelligence` edge function

Create `supabase/functions/property-intelligence/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { postcode, address } = await req.json()
    if (!postcode) {
      return new Response(JSON.stringify({ error: 'postcode required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const pc = postcode.replace(/\s+/g, ' ').trim().toUpperCase()
    const result: Record<string, unknown> = {}

    // ── 1. postcodes.io — country, region, lat/lng ──────────────────────────
    try {
      const pcRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)
      const pcJson = await pcRes.json()
      if (pcJson.status === 200 && pcJson.result) {
        const r = pcJson.result
        result.country = r.country          // 'England' | 'Wales' | 'Scotland' | 'Northern Ireland'
        result.region = r.region
        result.latitude = r.latitude
        result.longitude = r.longitude
        result.ward = r.admin_ward
        result.constituency = r.parliamentary_constituency
      }
    } catch (_) {}

    // ── 2. EPC Register (gov.uk) — energy rating, floor area, property type ─
    // Uses the EPC open data API. Requires EPC_API_KEY env var.
    // Register free at: https://epc.opendatacommunities.org/
    const epcKey = Deno.env.get('EPC_API_KEY')
    if (epcKey) {
      try {
        const epcQuery = address
          ? `postcode=${encodeURIComponent(pc)}&address=${encodeURIComponent(address)}&size=1`
          : `postcode=${encodeURIComponent(pc)}&size=1`
        const epcRes = await fetch(
          `https://epc.opendatacommunities.org/api/v1/domestic/search?${epcQuery}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Basic ${btoa(`${epcKey}:`)}`
            }
          }
        )
        if (epcRes.ok) {
          const epcJson = await epcRes.json()
          const rows = epcJson?.rows
          if (rows && rows.length > 0) {
            const row = rows[0]
            const band = String(row['current-energy-rating'] || '').trim().toUpperCase()
            if (['A','B','C','D','E','F','G'].includes(band)) result.epcRating = band
            if (row['floor-area']) result.floorAreaSqm = Math.round(Number(row['floor-area']))
            if (row['construction-age-band']) result.constructionAgeBand = row['construction-age-band']
            if (row['built-form']) result.builtForm = row['built-form']
            if (row['main-fuel']) result.heatingType = row['main-fuel']
          }
        }
      } catch (_) {}
    }

    // ── 3. Environment Agency Flood Risk (England only) ─────────────────────
    // Uses lat/lng from postcodes.io. Free, no API key.
    if (result.latitude && result.longitude && result.country === 'England') {
      try {
        const lat = result.latitude as number
        const lng = result.longitude as number
        // EA Flood Map for Planning — spatial query
        const eaUrl = `https://environment.data.gov.uk/arcgis/rest/services/EA/FloodMapForPlanningRiversAndSeaFloodZone3/MapServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json`
        const zone3Res = await fetch(eaUrl)
        if (zone3Res.ok) {
          const zone3Json = await zone3Res.json()
          const inZone3 = (zone3Json?.count ?? 0) > 0
          if (inZone3) {
            result.floodRisk = 'High'
            result.floodZone = '3'
          } else {
            // Check Zone 2
            const ea2Url = `https://environment.data.gov.uk/arcgis/rest/services/EA/FloodMapForPlanningRiversAndSeaFloodZone2/MapServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json`
            const zone2Res = await fetch(ea2Url)
            if (zone2Res.ok) {
              const zone2Json = await zone2Res.json()
              const inZone2 = (zone2Json?.count ?? 0) > 0
              result.floodRisk = inZone2 ? 'Medium' : 'Low'
              result.floodZone = inZone2 ? '2' : '1'
            }
          }
        }
      } catch (_) {}
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error)?.message || 'Property intelligence lookup failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
```

Deploy:
```
supabase functions deploy property-intelligence
```

> **Note on EPC:** Add `EPC_API_KEY` to Replit secrets if available (free registration at epc.opendatacommunities.org). If key is not set, the function skips EPC silently and returns everything else. Flood risk only works for England (EA API covers England only) — for Wales/Scotland, `floodRisk` will be absent.

---

## PART 3 — Create `land-registry-comps` edge function

Create `supabase/functions/land-registry-comps/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { postcode } = await req.json()
    if (!postcode) {
      return new Response(JSON.stringify({ error: 'postcode required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }
    const pc = postcode.replace(/\s+/g, '+').toUpperCase()
    const lrUrl = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${pc}&_pageSize=50&_sort=-transactionDate&_properties=transactionDate,pricePaid,propertyAddress,propertyType,estateType`
    const response = await fetch(lrUrl, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Land Registry returned HTTP ${response.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
      })
    }
    const json = await response.json()
    const items = json?.result?.items || []
    const comps = items.map((item: Record<string, unknown>) => {
      const addr = item.propertyAddress as Record<string, string> | undefined
      const addressParts = [addr?.paon, addr?.saon, addr?.street, addr?.town].filter(Boolean).join(' ')
      const typeLabel = String((item.propertyType as Record<string,string>)?.prefLabel || '')
      const t = typeLabel.toLowerCase()
      const normType = t.includes('semi') ? 'Semi-det.' : t.includes('detached') ? 'Detached' : t.includes('terrace') ? 'Terraced' : t.includes('flat') || t.includes('maisonette') ? 'Flat' : typeLabel
      return {
        date: item.transactionDate,
        price: item.pricePaid,
        address: addressParts || addr?.displayAddress || 'Address not available',
        type: normType,
        tenure: String((item.estateType as Record<string,string>)?.prefLabel || ''),
      }
    })
    return new Response(JSON.stringify({ success: true, postcode: pc.replace(/\+/g, ' '), comps }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error)?.message || 'Failed to fetch comparables' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
```

Deploy:
```
supabase functions deploy land-registry-comps
```

---

## PART 4 — Wire intelligence cascade into `handleScrapeUrl`

After the postcodes.io block (which sets country and stores `scrapeLatLng`), add a parallel cascade to populate EPC, flood risk, and comps. Also add stamp duty auto-calculation.

Add these state variables near the existing scrape state in the New Deal component:

```tsx
const [scrapeIntelligence, setScrapeIntelligence] = useState<{
  epcRating?: string
  floodRisk?: string
  floodZone?: string
  region?: string
} | null>(null)
const [stamDutyEstimate, setStampDutyEstimate] = useState<number | null>(null)
```

At the end of the `handleScrapeUrl` function, **after** the postcodes.io block has run and `d.postcode` is available, add:

```tsx
// ── Intelligence cascade — fire in background after basic fields populated ──
if (d.postcode) {
  // 1. Property intelligence (EPC + flood risk) — fire and forget, updates state when done
  supabase.functions.invoke('property-intelligence', {
    body: { postcode: d.postcode, address: d.address || '' }
  }).then(({ data: intel }) => {
    if (intel && !intel.error) {
      const intelligenceUpdate: { epcRating?: string; floodRisk?: string; floodZone?: string; region?: string } = {}
      if (intel.epcRating) {
        intelligenceUpdate.epcRating = intel.epcRating
        // Auto-set the EPC field in the form if there's a state setter for it
        // Look for the setter that controls EPC rating in Step 2 and call it here:
        // setNdEpc?.(intel.epcRating) — replace with actual setter if it exists
      }
      if (intel.floodRisk) intelligenceUpdate.floodRisk = intel.floodRisk
      if (intel.floodZone) intelligenceUpdate.floodZone = intel.floodZone
      if (intel.region) intelligenceUpdate.region = intel.region
      setScrapeIntelligence(intelligenceUpdate)
    }
  }).catch(() => {})

  // 2. Land Registry comps — auto-trigger, results used in Workings tab
  supabase.functions.invoke('land-registry-comps', {
    body: { postcode: d.postcode }
  }).then(({ data: compsResult }) => {
    if (compsResult?.success && compsResult.comps?.length > 0) {
      // Store comps for use in Workings tab
      // If there is a setCompsData or setScrapeComps state setter, call it here:
      // setScrapeComps(compsResult.comps)
      // Also update the compsPostcode field in Workings tab if accessible
    }
  }).catch(() => {})
}
```

### Stamp duty auto-calculation

Add this helper function to the component (outside the render function):

```tsx
function calcStampDuty(price: number, country: string, isAdditionalDwelling = true): number {
  // All DealScore deals are investment properties (BTL/HMO etc.) — additional dwelling rates apply
  if (country === 'Wales') {
    // Land Transaction Tax — Higher Rates
    const bands = [[0, 180000, 0.04], [180000, 250000, 0.075], [250000, 400000, 0.10], [400000, 750000, 0.115], [750000, 1500000, 0.14], [1500000, Infinity, 0.17]]
    return bands.reduce((tax, [min, max, rate]) => {
      const taxable = Math.min(price, max as number) - (min as number)
      return taxable > 0 ? tax + taxable * (rate as number) : tax
    }, 0)
  }
  if (country === 'Scotland') {
    // Land and Buildings Transaction Tax — Additional Dwelling Supplement (ADS = 6% of full price) + standard LBTT
    const lbttBands = [[0, 145000, 0], [145000, 250000, 0.02], [250000, 325000, 0.05], [325000, 750000, 0.10], [750000, Infinity, 0.12]]
    const lbtt = lbttBands.reduce((tax, [min, max, rate]) => {
      const taxable = Math.min(price, max as number) - (min as number)
      return taxable > 0 ? tax + taxable * (rate as number) : tax
    }, 0)
    const ads = isAdditionalDwelling ? price * 0.06 : 0
    return Math.round(lbtt + ads)
  }
  // England or Northern Ireland — SDLT
  // Standard rates + 3% additional dwelling surcharge
  const bands = [[0, 250000, 0.03], [250000, 925000, 0.08], [925000, 1500000, 0.13], [1500000, Infinity, 0.15]]
  return Math.round(bands.reduce((tax, [min, max, rate]) => {
    const taxable = Math.min(price, max as number) - (min as number)
    return taxable > 0 ? tax + taxable * (rate as number) : tax
  }, 0))
}
```

In `handleScrapeUrl`, after country is set, add:

```tsx
// Auto-calculate stamp duty estimate if we have price and country
if (d.price) {
  // Get the country value just set (from the setter we called above)
  // We need to read the mapped country — use the variable we built in the postcodes.io block:
  const countryForCalc = mappedCountry || 'England'
  const sdEstimate = calcStampDuty(d.price, countryForCalc, true)
  setStampDutyEstimate(sdEstimate)
  // If Step 2 has a stamp duty field with a state setter, auto-fill it:
  // Look for the stamp duty / SDLT setter in Step 2 form fields and call it:
  // setNdStampDuty?.(String(sdEstimate)) — only if such a field exists
}
```

> **Note:** `mappedCountry` needs to be declared at the top of the postcodes.io block so it's accessible later. Refactor the postcodes.io block to declare `let mappedCountry = ''` before the try, and assign inside the try.

### Update the "Filled in" success message to include stamp duty and intelligence:

```tsx
const populated = [
  d.address && 'address',
  d.price && 'price',
  d.beds && 'beds',
  d.propertyType && 'property type',
  d.tenure && 'tenure',
  d.epcRating && `EPC ${d.epcRating}`,
  d.floorAreaSqm && `${d.floorAreaSqm}m²`,
  stamDutyEstimate && `SDLT ~£${stamDutyEstimate.toLocaleString('en-GB')}`,
].filter(Boolean)
setScrapeResult(`success:${populated.join(', ')}`)
```

Also show the intelligence enrichment (EPC from API, flood risk) under the success message. After the `scrapeResult` success display block, add:

```tsx
{scrapeIntelligence && (
  <div style={{ marginTop: 6, fontSize: 10, color: '#5a6270', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
    {scrapeIntelligence.epcRating && (
      <span style={{ background: '#f0f9f5', border: '1px solid #b6e8d5', borderRadius: 4, padding: '2px 7px', color: '#1D9E75', fontWeight: 600 }}>
        EPC {scrapeIntelligence.epcRating}
      </span>
    )}
    {scrapeIntelligence.floodRisk && (
      <span style={{
        background: scrapeIntelligence.floodRisk === 'Low' ? '#f0fdf4' : scrapeIntelligence.floodRisk === 'Medium' ? '#fffbeb' : '#fef2f2',
        border: `1px solid ${scrapeIntelligence.floodRisk === 'Low' ? '#bbf7d0' : scrapeIntelligence.floodRisk === 'Medium' ? '#fde68a' : '#fecaca'}`,
        borderRadius: 4,
        padding: '2px 7px',
        color: scrapeIntelligence.floodRisk === 'Low' ? '#16a34a' : scrapeIntelligence.floodRisk === 'Medium' ? '#d97706' : '#dc2626',
        fontWeight: 600,
      }}>
        Flood risk: {scrapeIntelligence.floodRisk}
      </span>
    )}
    {stamDutyEstimate !== null && (
      <span style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 4, padding: '2px 7px', color: '#4338ca', fontWeight: 600 }}>
        SDLT est. £{stamDutyEstimate.toLocaleString('en-GB')}
      </span>
    )}
  </div>
)}
```

---

## PART 5 — Auto-trigger comps from address field in Inputs tab (AnalysisHub.tsx)

In AnalysisHub.tsx, find the Address field (`sharedInputs.address` or wherever it lives in the Property Information section of ViewInputs).

Add a postcode extraction + auto-cascade on address change. Find where `setField('sharedInputs.address', value)` (or equivalent) is called and add this **after** the setField call:

```tsx
// Extract postcode from address and auto-trigger intelligence + comps
const postcodeMatch = value.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i)
if (postcodeMatch) {
  const extractedPostcode = postcodeMatch[1].toUpperCase()

  // Auto-populate Country/Tax Region via postcodes.io
  fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(extractedPostcode)}`)
    .then(r => r.json())
    .then(pcData => {
      if (pcData.status === 200 && pcData.result) {
        const countryMap: Record<string, string> = {
          'England': 'England',          // adjust to match actual dropdown option values
          'Wales': 'Wales',
          'Scotland': 'Scotland',
          'Northern Ireland': 'Northern Ireland',
        }
        const mappedCountry = countryMap[pcData.result.country] ?? pcData.result.country
        // Auto-set the country/tax region field:
        setField('sharedInputs.country', mappedCountry)   // adjust key to match actual field key
      }
    })
    .catch(() => {})

  // Auto-trigger Land Registry comps
  if (extractedPostcode !== compsPostcode) {
    setCompsPostcode(extractedPostcode)
    // Auto-fetch — small delay to avoid firing on every keystroke mid-typing
    setTimeout(() => {
      supabase.functions.invoke('land-registry-comps', { body: { postcode: extractedPostcode } })
        .then(({ data }) => {
          if (data?.success && data.comps?.length > 0) {
            setCompsData(data.comps)
          }
        })
        .catch(() => {})
    }, 1500)
  }
}
```

> **Note:** `compsPostcode`, `setCompsPostcode`, `compsData`, `setCompsData` should already exist from Prompt C. If they don't exist yet, add them alongside existing workings state. The `sharedInputs.country` field key — confirm the actual key used by `setField()` for the country/tax region dropdown and substitute it here.

---

## PART 6 — Add "Sold prices nearby" card to Workings tab

In ViewWorkings (AnalysisHub.tsx), add this card at the bottom of the workings content. Add the state if not already present:

```tsx
const [compsPostcode, setCompsPostcode] = useState<string>(
  // Pre-populate from the deal's address if a postcode can be extracted:
  (() => {
    const addr = String(form?.['sharedInputs.address'] || form?.address || '')
    const m = addr.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i)
    return m ? m[1].toUpperCase() : ''
  })()
)
const [compsLoading, setCompsLoading] = useState(false)
const [compsData, setCompsData] = useState<Array<{
  date: string; price: number; address: string; type: string; tenure: string
}> | null>(null)
const [compsError, setCompsError] = useState<string | null>(null)
```

Add fetch handler:

```tsx
async function fetchComps(postcode = compsPostcode) {
  if (!postcode.trim()) return
  setCompsLoading(true)
  setCompsData(null)
  setCompsError(null)
  try {
    const { data, error } = await supabase.functions.invoke('land-registry-comps', {
      body: { postcode: postcode.trim() },
    })
    if (error || !data?.success) {
      setCompsError(data?.error || 'Could not load comparables. Check the postcode and try again.')
    } else {
      setCompsData(data.comps || [])
    }
  } catch (_) {
    setCompsError('Failed to load comparables.')
  } finally {
    setCompsLoading(false)
  }
}
```

Auto-fetch on mount if postcode is available:

```tsx
useEffect(() => {
  if (compsPostcode) fetchComps(compsPostcode)
}, []) // eslint-disable-line react-hooks/exhaustive-deps
```

Add JSX card at the bottom of the Workings tab render:

```tsx
{/* ── Sold prices nearby (Land Registry) ── */}
<div style={{
  background: '#fff',
  border: '.5px solid var(--ds-border)',
  borderRadius: 10,
  overflow: 'hidden',
  marginTop: 16,
}}>
  <div style={{
    padding: '12px 16px',
    borderBottom: '.5px solid var(--ds-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  }}>
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
        <i className="ti ti-building-estate" style={{ marginRight: 5, fontSize: 12, color: 'var(--teal)' }} />
        Sold prices nearby
      </div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
        Land Registry Price Paid Data · updated monthly · © HM Land Registry
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="text"
        value={compsPostcode}
        onChange={e => setCompsPostcode(e.target.value.toUpperCase())}
        placeholder="e.g. CF24 3BJ"
        style={{
          fontSize: 11, padding: '5px 9px',
          border: '.5px solid var(--ds-border)', borderRadius: 6,
          fontFamily: 'inherit', width: 110, color: 'var(--text-1)', outline: 'none',
        }}
        onKeyDown={e => { if (e.key === 'Enter') fetchComps() }}
      />
      <button
        onClick={() => fetchComps()}
        disabled={!compsPostcode.trim() || compsLoading}
        style={{
          fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 6,
          border: 'none', background: compsLoading ? '#9ca3af' : 'var(--navy)',
          color: '#fff', cursor: compsLoading ? 'default' : 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        {compsLoading
          ? <><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 11 }} /> Loading</>
          : <><i className="ti ti-search" style={{ fontSize: 11 }} /> Search</>
        }
      </button>
    </div>
  </div>

  {!compsData && !compsError && !compsLoading && (
    <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
      {compsPostcode ? 'Fetching sold prices…' : 'Enter a postcode above to load recent sold prices'}
    </div>
  )}
  {compsError && (
    <div style={{ padding: '14px 16px', fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 12 }} /> {compsError}
    </div>
  )}
  {compsData && compsData.length === 0 && (
    <div style={{ padding: '14px 16px', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
      No sold prices found for {compsPostcode} — try the full outward code (e.g. CF24)
    </div>
  )}
  {compsData && compsData.length > 0 && (
    <div style={{ overflowX: 'auto' }}>
      <div style={{
        padding: '8px 16px', background: 'var(--bg-sec)',
        borderBottom: '.5px solid var(--ds-border)',
        display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-2)',
      }}>
        <span><strong style={{ color: 'var(--text-1)' }}>{compsData.length}</strong> sales</span>
        <span>Avg: <strong style={{ color: 'var(--navy)' }}>
          £{Math.round(compsData.reduce((s, c) => s + c.price, 0) / compsData.length).toLocaleString('en-GB')}
        </strong></span>
        <span>Range: <strong style={{ color: 'var(--navy)' }}>
          £{Math.min(...compsData.map(c => c.price)).toLocaleString('en-GB')} –{' '}
          £{Math.max(...compsData.map(c => c.price)).toLocaleString('en-GB')}
        </strong></span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {['Date', 'Price', 'Address', 'Type', 'Tenure'].map(h => (
              <th key={h} style={{
                padding: '7px 12px', textAlign: 'left', fontWeight: 600,
                color: 'var(--text-2)', fontSize: 10,
                borderBottom: '.5px solid var(--ds-border)', whiteSpace: 'nowrap',
                background: 'var(--bg-sec)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compsData.slice(0, 20).map((comp, i) => (
            <tr key={i} style={{ borderBottom: '.5px solid #f0f1f3' }}>
              <td style={{ padding: '7px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                {comp.date ? new Date(comp.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                £{comp.price?.toLocaleString('en-GB') ?? '—'}
              </td>
              <td style={{ padding: '7px 12px', color: 'var(--text-1)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {comp.address}
              </td>
              <td style={{ padding: '7px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{comp.type || '—'}</td>
              <td style={{ padding: '7px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{comp.tenure || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {compsData.length > 20 && (
        <div style={{ padding: '8px 16px', fontSize: 10, color: '#9ca3af', textAlign: 'center', borderTop: '.5px solid #f0f1f3' }}>
          Showing 20 of {compsData.length} — refine postcode for closer matches
        </div>
      )}
    </div>
  )}
</div>
```

---

## FINAL STEPS

1. Run `npx tsc --noEmit` — zero errors
2. Commit and push:
```
git add -A && git commit -m "feat: Prompt 17 — scraper fix + property intelligence cascade + Land Registry comps" && git push origin stage-6
```

## REPORT BACK

Tell me:
1. The actual state setter names you found for address / price / beds / property type / country in the New Deal slide-over
2. What option values the Country/Tax Region dropdown uses (so I can confirm the postcodes.io mapping is correct)
3. Whether `EPC_API_KEY` is already in Replit Secrets
4. Whether comps auto-triggered correctly on mount in the Workings tab
5. Any TypeScript errors and how you resolved them
