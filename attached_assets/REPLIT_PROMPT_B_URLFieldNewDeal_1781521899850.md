# REPLIT PROMPT B — URL Scraper Field in New Deal Slide-Over
## Paste after Prompt A is deployed. File: DealsDashboard.tsx (or wherever the nd-panel / NewDealPanel component lives)

---

You are working on the DealScore app on branch `stage-6`. File paths are `artifacts/dealscore/src/...`

**Standing rule:** Only edit inside `return()` JSX and only add the minimal new state/handler code needed. Do NOT touch existing Supabase calls, auth, deal state, navigation, or routing.

## TASK: Add "Paste listing URL" field to Step 2 of the New Deal slide-over

Find the New Deal slide-over component — it contains step dots (Strategy → Deal basics → Source & vendor) and nd-pane / nd-field sections. Step 2 is the "Deal basics" pane with address, price, beds, property type.

### 1. Add state (near the top of the component, alongside existing nd* state)

```tsx
const [scrapeUrl, setScrapeUrl] = useState('')
const [scrapeLoading, setScrapeLoading] = useState(false)
const [scrapeResult, setScrapeResult] = useState<string | null>(null) // 'success:...' | error message
// Extra scraped fields — stashed here and merged into deal inputs on creation
// so tenure, epcRating, and images are pre-populated when the user opens the deal
const [scrapeExtra, setScrapeExtra] = useState<{
  tenure?: string
  epcRating?: string
  floorAreaSqm?: number
  images?: string[]
}>({})
```

### 2. Add the scrape handler (alongside existing handlers)

```tsx
async function handleScrapeUrl() {
  const url = scrapeUrl.trim()
  if (!url) return
  setScrapeLoading(true)
  setScrapeResult(null)
  setScrapeExtra({})
  try {
    const { data, error } = await supabase.functions.invoke('scrape-property', {
      body: { url },
    })
    if (error || !data?.success) {
      setScrapeResult(data?.error || 'Could not read that listing — please enter details manually.')
      return
    }
    const d = data.data

    // ── Basic fields: populate existing Step 2 form state ──
    // Replace setNdAddress / setNdPrice / setNdBeds / setNdPropType / setNdCountry
    // with the actual state setters already used by the Step 2 form fields.
    // Do NOT rename or change the existing setters — just call them here.
    if (d.address) setNdAddress(d.address)
    if (d.price) setNdPrice(`£${d.price.toLocaleString('en-GB')}`)
    if (d.beds) setNdBeds(d.beds)
    if (d.propertyType) setNdPropType(d.propertyType)
    if (d.postcode && !d.address) setNdAddress(d.postcode)

    // Determine country from postcode prefix if available
    if (d.postcode) {
      const pc = d.postcode.toUpperCase()
      if (pc.startsWith('BT')) setNdCountry('Northern Ireland')
      else if (['AB','DD','DG','EH','FK','G','HS','IV','KA','KW','KY','ML','PA','PH','TD','ZE'].some(p => pc.startsWith(p))) setNdCountry('Scotland')
      else if (['CF','CH','LD','LL','NP','SA','SY'].some(p => pc.startsWith(p))) setNdCountry('Wales')
      else setNdCountry('England')
    }

    // ── Extra fields: stash for merging into deal inputs on creation ──
    // tenure and epcRating are already canonical ISelect values from the Edge Function
    // so they will auto-select the correct dropdown when the deal is opened.
    const extra: { tenure?: string; epcRating?: string; floorAreaSqm?: number; images?: string[] } = {}
    if (d.tenure) extra.tenure = d.tenure
    if (d.epcRating) extra.epcRating = d.epcRating
    if (d.floorAreaSqm) extra.floorAreaSqm = d.floorAreaSqm
    if (d.images?.length) extra.images = d.images
    setScrapeExtra(extra)

    const populated = [
      d.address && 'address',
      d.price && 'price',
      d.beds && 'beds',
      d.propertyType && 'property type',
      d.tenure && 'tenure',
      d.epcRating && `EPC ${d.epcRating}`,
      d.floorAreaSqm && `${d.floorAreaSqm}m²`,
    ].filter(Boolean)
    setScrapeResult(`success:${populated.join(', ')}`)
  } catch (err) {
    setScrapeResult('Could not read that listing — please enter details manually.')
  } finally {
    setScrapeLoading(false)
  }
}
```

> **Note:** Replace `setNdAddress`, `setNdPrice`, `setNdBeds`, `setNdPropType`, `setNdCountry` with the actual state setters already used by the Step 2 form fields. Do NOT rename or change the existing setters — just call them here.

### 3. Merge scrapeExtra into the deal's initial inputs on creation

Find the existing deal creation call — where the new deal object is built and saved to Supabase (likely a `supabase.from('deals').insert(...)` call or a `createDeal(...)` helper). In the `inputs` object passed to that call, spread `scrapeExtra` at the end so the extra fields are saved with the deal:

```tsx
// Before (example — adapt to match the actual creation call structure):
inputs: { address: ndAddress, price: ndPrice, beds: ndBeds, propertyType: ndPropType, ... }

// After — spread scrapeExtra at the end (won't override explicit Step 2 values):
inputs: { address: ndAddress, price: ndPrice, beds: ndBeds, propertyType: ndPropType, ..., ...scrapeExtra }
```

This ensures that when the user opens the deal and navigates to Inputs, tenure and epcRating are already pre-selected in their dropdowns, and images are available.

### 4. Add the URL field at the TOP of the Step 2 pane, ABOVE the Address field

Insert this JSX immediately after the opening `<div>` of the Step 2 pane (before the existing Address field):

```tsx
{/* ── Listing URL auto-fill ── */}
<div style={{
  background: '#f0f9f5',
  border: '1px solid #b6e8d5',
  borderRadius: 8,
  padding: '12px 14px',
  marginBottom: 14,
}}>
  <div style={{ fontSize: 11, fontWeight: 600, color: '#1D9E75', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
    <i className="ti ti-sparkles" style={{ fontSize: 12 }} />
    Auto-fill from listing
  </div>
  <div style={{ fontSize: 11, color: '#5a6270', marginBottom: 8 }}>
    Paste a Rightmove, Zoopla, or OnTheMarket URL and we'll fill in the details for you.
  </div>
  <div style={{ display: 'flex', gap: 6 }}>
    <input
      type="url"
      value={scrapeUrl}
      onChange={e => { setScrapeUrl(e.target.value); setScrapeResult(null) }}
      placeholder="https://www.rightmove.co.uk/properties/..."
      style={{
        flex: 1,
        fontSize: 11,
        padding: '6px 10px',
        border: '.5px solid #b6e8d5',
        borderRadius: 6,
        fontFamily: 'inherit',
        color: '#1a2332',
        background: '#fff',
        outline: 'none',
      }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleScrapeUrl() } }}
    />
    <button
      onClick={handleScrapeUrl}
      disabled={!scrapeUrl.trim() || scrapeLoading}
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: 6,
        border: 'none',
        background: scrapeLoading ? '#9ca3af' : '#1D9E75',
        color: '#fff',
        cursor: scrapeLoading ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        minWidth: 80,
        justifyContent: 'center',
      }}
    >
      {scrapeLoading
        ? <><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 12 }} /> Reading…</>
        : <><i className="ti ti-download" style={{ fontSize: 12 }} /> Fill in</>
      }
    </button>
  </div>

  {/* Result feedback */}
  {scrapeResult && scrapeResult.startsWith('success:') && (
    <div style={{ marginTop: 7, fontSize: 11, color: '#1D9E75', display: 'flex', alignItems: 'center', gap: 5 }}>
      <i className="ti ti-circle-check" style={{ fontSize: 12 }} />
      Filled in: {scrapeResult.replace('success:', '')}
    </div>
  )}
  {scrapeResult && !scrapeResult.startsWith('success:') && (
    <div style={{ marginTop: 7, fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />
      {scrapeResult}
    </div>
  )}
</div>
```

### 5. Reset on panel close

In the existing panel reset / close handler (where address, price, beds etc. are cleared), also add:
```tsx
setScrapeUrl('')
setScrapeResult(null)
setScrapeLoading(false)
setScrapeExtra({})
```

---

After making all changes, run `npx tsc --noEmit`. Zero errors before committing. Tell me:
1. What was changed and which state setters you used for address/price/beds/propType/country
2. Where you merged `scrapeExtra` into the deal creation call
