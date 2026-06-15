# REPLIT PROMPT C — Free Comparables (Land Registry Sold Prices)
## Paste after Prompts A & B are done. Adds a "Sold prices nearby" section to the Analysis > Workings tab.

---

You are working on the DealScore app on branch `stage-6`. File paths are `artifacts/dealscore/src/...`

**Standing rule:** Only edit inside `return()` JSX and only add the minimal new state/handler code needed. Do NOT touch existing Supabase calls, auth, deal calculations, or routing.

---

## PART 1: Create Edge Function `land-registry-comps`

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

    // Clean postcode — remove spaces, uppercase
    const pc = postcode.replace(/\s+/g, '+').toUpperCase()

    // Land Registry Price Paid Linked Data API — free, no auth required
    // Returns up to 100 transactions sorted by date descending
    const lrUrl = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${pc}&_pageSize=50&_sort=-transactionDate&_properties=transactionDate,pricePaid,propertyAddress,propertyType,estateType`

    const response = await fetch(lrUrl, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Land Registry returned HTTP ${response.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
      })
    }

    const json = await response.json()
    const items = json?.result?.items || []

    const comps = items.map((item: Record<string, unknown>) => {
      const addr = item.propertyAddress as Record<string, string> | undefined
      const addressParts = [
        addr?.paon, addr?.saon, addr?.street, addr?.town
      ].filter(Boolean).join(' ')
      
      return {
        date: item.transactionDate,
        price: item.pricePaid,
        address: addressParts || addr?.displayAddress || 'Address not available',
        type: normaliseType(String((item.propertyType as Record<string,string>)?.prefLabel || '')),
        tenure: String((item.estateType as Record<string,string>)?.prefLabel || ''),
      }
    })

    return new Response(JSON.stringify({ success: true, postcode: pc.replace('+', ' '), comps }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error)?.message || 'Failed to fetch comparables' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})

function normaliseType(raw: string): string {
  const t = raw.toLowerCase()
  if (t.includes('semi')) return 'Semi-det.'
  if (t.includes('detached')) return 'Detached'
  if (t.includes('terraced') || t.includes('terrace')) return 'Terraced'
  if (t.includes('flat') || t.includes('maisonette')) return 'Flat'
  if (t.includes('other')) return 'Other'
  return raw
}
```

Deploy with:
```
supabase functions deploy land-registry-comps
```

---

## PART 2: Add "Sold prices nearby" section to the Workings tab

Find the Workings sub-view component in AnalysisHub.tsx (or wherever the `activeView === 'workings'` / WorkingsPanel renders).

### Add state near existing workings state:

```tsx
const [compsPostcode, setCompsPostcode] = useState('')
const [compsLoading, setCompsLoading] = useState(false)
const [compsData, setCompsData] = useState<Array<{
  date: string; price: number; address: string; type: string; tenure: string
}> | null>(null)
const [compsError, setCompsError] = useState<string | null>(null)
```

Also, on mount or when the deal's postcode is available, pre-populate `compsPostcode`:
```tsx
useEffect(() => {
  // Use deal.postcode if available (adjust field name to match your deal data shape)
  if (deal?.postcode && !compsPostcode) setCompsPostcode(deal.postcode)
}, [deal?.postcode])
```

### Add the fetch handler:

```tsx
async function fetchComps() {
  if (!compsPostcode.trim()) return
  setCompsLoading(true)
  setCompsData(null)
  setCompsError(null)
  try {
    const { data, error } = await supabase.functions.invoke('land-registry-comps', {
      body: { postcode: compsPostcode.trim() },
    })
    if (error || !data?.success) {
      setCompsError(data?.error || 'Could not load comparables. Check the postcode and try again.')
    } else {
      setCompsData(data.comps || [])
    }
  } catch (err) {
    setCompsError('Failed to load comparables.')
  } finally {
    setCompsLoading(false)
  }
}
```

### Add the JSX section inside the Workings tab render (add as a new card at the bottom of the workings content):

```tsx
{/* ── Sold prices nearby (Land Registry) ── */}
<div style={{
  background: '#fff',
  border: '.5px solid #e3e5e9',
  borderRadius: 10,
  overflow: 'hidden',
  marginTop: 16,
}}>
  {/* Header */}
  <div style={{
    padding: '12px 16px',
    borderBottom: '.5px solid #e3e5e9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  }}>
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a2332' }}>
        <i className="ti ti-building-estate" style={{ marginRight: 5, fontSize: 12, color: '#1D9E75' }} />
        Sold prices nearby
      </div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
        Land Registry Price Paid Data · updated monthly
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="text"
        value={compsPostcode}
        onChange={e => setCompsPostcode(e.target.value.toUpperCase())}
        placeholder="e.g. CF24 3BJ"
        style={{
          fontSize: 11,
          padding: '5px 9px',
          border: '.5px solid #e3e5e9',
          borderRadius: 6,
          fontFamily: 'inherit',
          width: 110,
          color: '#1a2332',
          outline: 'none',
        }}
        onKeyDown={e => { if (e.key === 'Enter') fetchComps() }}
      />
      <button
        onClick={fetchComps}
        disabled={!compsPostcode.trim() || compsLoading}
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '5px 11px',
          borderRadius: 6,
          border: 'none',
          background: compsLoading ? '#9ca3af' : '#1B3A6B',
          color: '#fff',
          cursor: compsLoading ? 'default' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {compsLoading
          ? <><i className="ti ti-loader-2 ti-spin" style={{ fontSize: 11 }} /> Loading</>
          : <><i className="ti ti-search" style={{ fontSize: 11 }} /> Search</>
        }
      </button>
    </div>
  </div>

  {/* Body */}
  {!compsData && !compsError && !compsLoading && (
    <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
      Enter a postcode above to load recent sold prices from Land Registry
    </div>
  )}

  {compsError && (
    <div style={{ padding: '14px 16px', fontSize: 11, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5 }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 12 }} />
      {compsError}
    </div>
  )}

  {compsData && compsData.length === 0 && (
    <div style={{ padding: '14px 16px', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
      No sold prices found for {compsPostcode} — try a nearby postcode
    </div>
  )}

  {compsData && compsData.length > 0 && (
    <div style={{ overflowX: 'auto' }}>
      {/* Summary row */}
      <div style={{
        padding: '8px 16px',
        background: '#f5f6f8',
        borderBottom: '.5px solid #e3e5e9',
        display: 'flex',
        gap: 20,
        fontSize: 11,
        color: '#5a6270',
      }}>
        <span><strong style={{ color: '#1a2332' }}>{compsData.length}</strong> sales found</span>
        <span>Avg: <strong style={{ color: '#1B3A6B' }}>
          £{Math.round(compsData.reduce((s, c) => s + c.price, 0) / compsData.length).toLocaleString('en-GB')}
        </strong></span>
        <span>Range: <strong style={{ color: '#1B3A6B' }}>
          £{Math.min(...compsData.map(c => c.price)).toLocaleString('en-GB')} – £{Math.max(...compsData.map(c => c.price)).toLocaleString('en-GB')}
        </strong></span>
        <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 10 }}>
          Data © HM Land Registry
        </span>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f5f6f8' }}>
            {['Date', 'Price', 'Address', 'Type', 'Tenure'].map(h => (
              <th key={h} style={{
                padding: '7px 12px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#5a6270',
                fontSize: 10,
                borderBottom: '.5px solid #e3e5e9',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compsData.slice(0, 20).map((comp, i) => (
            <tr key={i} style={{ borderBottom: '.5px solid #f0f1f3' }}>
              <td style={{ padding: '7px 12px', color: '#5a6270', whiteSpace: 'nowrap' }}>
                {comp.date ? new Date(comp.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td style={{ padding: '7px 12px', fontWeight: 600, color: '#1B3A6B', whiteSpace: 'nowrap' }}>
                £{comp.price?.toLocaleString('en-GB') ?? '—'}
              </td>
              <td style={{ padding: '7px 12px', color: '#1a2332', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {comp.address}
              </td>
              <td style={{ padding: '7px 12px', color: '#5a6270', whiteSpace: 'nowrap' }}>{comp.type || '—'}</td>
              <td style={{ padding: '7px 12px', color: '#5a6270', whiteSpace: 'nowrap' }}>{comp.tenure || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {compsData.length > 20 && (
        <div style={{ padding: '8px 16px', fontSize: 10, color: '#9ca3af', borderTop: '.5px solid #f0f1f3', textAlign: 'center' }}>
          Showing 20 of {compsData.length} results — refine your postcode to narrow results
        </div>
      )}
    </div>
  )}
</div>
```

---

After all changes, run `npx tsc --noEmit`. Zero errors before committing.

Then commit everything:
```
git add -A && git commit -m "feat: URL scraper (Rightmove/Zoopla) + Land Registry comparables" && git push origin stage-6
```
