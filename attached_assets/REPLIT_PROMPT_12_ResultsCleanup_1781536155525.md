# REPLIT PROMPT 12 — Results page cleanup + Deal Optimiser modal + Comps to Inputs

## Target file
`artifacts/dealscore/src/components/AnalysisHub.tsx`

## Standing rules
- Read the full file before making any changes
- Do NOT touch ViewInputs, ViewSensitivity, ViewWorkings logic or state
- Do NOT touch anything above return() in any sub-component
- npx tsc --noEmit must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 12: Results cleanup, Optimiser modal, Comps to Inputs" && git push origin stage-6`

---

## CHANGE 1 — Remove Section 5 (ICR Stress Test + Section 24) from ViewResults

Delete the entire Section 5 block from ViewResults's return().

Section 5 contains:
- The "ICR STRESS TEST & SECTION 24" label
- The two-column grid with the ICR Stress Test tile (left) and Section 24 / Ltd CT tile (right)

Do NOT remove Section 6 (Risk Flags panel) — keep that exactly as-is.

Rationale: the risk flag "ICR stress test fail" already surfaces the key signal. The full ICR/S24 panel detail belongs in Show Workings, not Results.

---

## CHANGE 2 — Remove Section 8 (Deal Optimiser navy box) from ViewResults

Delete the entire Section 8 block from ViewResults's return(). This is the dark navy (#152d55) box containing:
- Target pill row (CoC ROI / Cash flow / Gross yield / Net yield / Max cash in)
- 3×2 metrics grid
- Two scenario mini-grids (price changes / rent changes)
- "Open full optimiser with negotiation tips →" link

Also remove the `optimiserTarget` useState declaration from ViewResults (it's no longer needed there).

---

## CHANGE 3 — Wire the "Optimise" header button to a Deal Optimiser modal

The "Optimise" button already exists in the AnalysisHub header. It currently does nothing. Wire it to open a Deal Optimiser modal/drawer.

### 3a — Add modal state to AnalysisHub (above the sub-component renders)
```typescript
const [showOptimiser, setShowOptimiser] = useState(false)
```

### 3b — Wire the Optimise button
Find the existing Optimise button in the AnalysisHub header (it renders something like `<button ... >✦ Optimise</button>` or uses an icon). Add `onClick={() => setShowOptimiser(true)}` to it.

### 3c — Render the modal at the bottom of AnalysisHub's return(), before the closing tag
```tsx
{showOptimiser && (
  <div style={{
    position:'fixed', inset:0, zIndex:200,
    background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center'
  }} onClick={() => setShowOptimiser(false)}>
    <div style={{
      background:'#152d55', borderRadius:12, padding:'20px 24px',
      width:'min(820px,90vw)', maxHeight:'85vh', overflowY:'auto',
      boxShadow:'0 8px 40px rgba(0,0,0,0.35)'
    }} onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <span style={{fontSize:14, fontWeight:600, color:'#e0eaff', letterSpacing:'.04em'}}>
          DEAL OPTIMISER
        </span>
        <button onClick={() => setShowOptimiser(false)}
          style={{background:'none', border:'none', color:'#93c5fd', fontSize:18, cursor:'pointer', lineHeight:1}}>
          ×
        </button>
      </div>

      {/* Target selector */}
      <OptimiserContent results={results} deal={deal} />

    </div>
  </div>
)}
```

### 3d — Create OptimiserContent component (add near top of file, before AnalysisHub)

Move the full optimiser logic (formerly Section 8) into a standalone component:

```tsx
function OptimiserContent({ results, deal }: { results: CalcResult | null; deal: Deal | null }) {
  const [optimiserTarget, setOptimiserTarget] = useState<'coc'|'cf'|'yield'|'netyield'|'cashmax'>('coc')

  if (!results || !deal) return <p style={{color:'#93c5fd'}}>No results yet — fill in the inputs first.</p>

  const {
    cashOnCashROI = 0, monthlyCashFlow = 0, grossYield = 0, netYield = 0,
    totalCashInvested = 0, purchasePrice = 0, breakEvenRent = 0, monthlyRent = 0
  } = results

  const depositPercent = deal.depositPercent ?? 25

  // Back-solve: max price for 8% CoC target
  const targetCoC = 0.08
  const annualCF = monthlyCashFlow * 12
  const maxPurchasePrice = annualCF > 0
    ? Math.round(purchasePrice + (annualCF / targetCoC - totalCashInvested) * (depositPercent / 100))
    : 0
  const priceHeadroom = maxPurchasePrice - purchasePrice

  // Min rent for 8% CoC
  const minRent = Math.ceil(breakEvenRent + (totalCashInvested * targetCoC / 12))
  const rentBuffer = monthlyRent - minRent
  const targetMet = cashOnCashROI >= targetCoC * 100

  const targets = [
    { key:'coc',     label:'CoC ROI' },
    { key:'cf',      label:'Cash flow' },
    { key:'yield',   label:'Gross yield' },
    { key:'netyield',label:'Net yield' },
    { key:'cashmax', label:'Max cash in' },
  ] as const

  // Scenario approximations
  const priceScenarios = [-10000, 0, 10000].map(delta => {
    const newDeposit = (purchasePrice + delta) * (depositPercent / 100)
    const depositDelta = newDeposit - (purchasePrice * depositPercent / 100)
    const newCashInvested = totalCashInvested + depositDelta
    const approxCoc = newCashInvested > 0 ? (annualCF / newCashInvested) * 100 : 0
    return { price: purchasePrice + delta, coc: approxCoc }
  })

  const rentScenarios = [0.9, 1, 1.1].map(mult => {
    const newRent = Math.round(monthlyRent * mult)
    const rentDelta = newRent - monthlyRent
    const newCF = monthlyCashFlow + rentDelta
    return { rent: newRent, cf: newCF }
  })

  const good = '#6ee7b7'
  const warn = '#fca5a5'
  const label = { fontSize:10, color:'rgba(147,197,253,.75)', marginBottom:3 }
  const val = (color?: string) => ({ fontSize:14, fontWeight:500 as const, color: color ?? '#e0eaff' })

  return (
    <>
      {/* Target pills */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap' as const, marginBottom:16}}>
        <span style={{fontSize:11, color:'#93c5fd', marginRight:4, alignSelf:'center'}}>Target:</span>
        {targets.map(t => (
          <button key={t.key} onClick={() => setOptimiserTarget(t.key)}
            style={{
              padding:'4px 10px', fontSize:11, fontWeight:500, borderRadius:20, cursor:'pointer',
              background: optimiserTarget === t.key ? '#1B3A6B' : 'transparent',
              color: optimiserTarget === t.key ? '#e0eaff' : '#93c5fd',
              border: optimiserTarget === t.key ? '.5px solid #93c5fd' : '.5px solid rgba(147,197,253,.35)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 3×2 metrics grid */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16}}>
        {[
          { label:'Current CoC ROI',    value:`${cashOnCashROI.toFixed(1)}%`, color: cashOnCashROI >= 8 ? good : warn },
          { label:'Max purchase price', value: maxPurchasePrice > 0 ? `£${maxPurchasePrice.toLocaleString()}` : '—', color: good },
          { label:'Price headroom',     value: maxPurchasePrice > 0 ? `${priceHeadroom >= 0 ? '+' : ''}£${priceHeadroom.toLocaleString()}` : '—', color: priceHeadroom >= 0 ? good : warn },
          { label:'Min rent needed',    value:`£${minRent.toLocaleString()}/mo`, color:'#e0eaff' },
          { label:'Rent buffer',        value:`£${rentBuffer.toLocaleString()}/mo`, color: rentBuffer >= 0 ? good : warn },
          { label:'Verdict',           value: targetMet ? '✓ Target met' : '✗ Not met', color: targetMet ? good : warn },
        ].map((cell,i) => (
          <div key={i} style={{background:'rgba(255,255,255,.07)', borderRadius:6, padding:'9px 12px'}}>
            <div style={label}>{cell.label}</div>
            <div style={val(cell.color)}>{cell.value}</div>
          </div>
        ))}
      </div>

      {/* Scenario mini-grids */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        {/* Price scenarios */}
        <div>
          <div style={{fontSize:11, color:'rgba(147,197,253,.8)', fontWeight:500, marginBottom:6}}>
            If purchase price changes
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6}}>
            {priceScenarios.map((s,i) => (
              <div key={i} style={{
                borderRadius:6, padding:'7px 10px',
                background: i===1 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)',
                border: i===1 ? '.5px solid rgba(147,197,253,.4)' : 'none',
              }}>
                <div style={{fontSize:10, color:'rgba(147,197,253,.7)', marginBottom:3}}>
                  £{s.price.toLocaleString()}
                </div>
                <div style={{fontSize:12, fontWeight:500, color: s.coc >= 8 ? good : warn}}>
                  {s.coc.toFixed(1)}%
                </div>
                <div style={{fontSize:10, color:'rgba(147,197,253,.5)'}}>CoC</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rent scenarios */}
        <div>
          <div style={{fontSize:11, color:'rgba(147,197,253,.8)', fontWeight:500, marginBottom:6}}>
            If rent changes
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6}}>
            {rentScenarios.map((s,i) => (
              <div key={i} style={{
                borderRadius:6, padding:'7px 10px',
                background: i===1 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)',
                border: i===1 ? '.5px solid rgba(147,197,253,.4)' : 'none',
              }}>
                <div style={{fontSize:10, color:'rgba(147,197,253,.7)', marginBottom:3}}>
                  £{s.rent.toLocaleString()}/mo
                </div>
                <div style={{fontSize:12, fontWeight:500, color: i===0 ? warn : i===2 ? good : '#e0eaff'}}>
                  £{s.cf.toLocaleString()}
                </div>
                <div style={{fontSize:10, color:'rgba(147,197,253,.5)'}}>CF</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer link */}
      <div style={{textAlign:'right', marginTop:14, paddingTop:10, borderTop:'.5px solid rgba(147,197,253,.2)'}}>
        <span style={{fontSize:12, color:'#93c5fd', cursor:'pointer'}}>
          Negotiation tips: use price headroom as anchor in offer →
        </span>
      </div>
    </>
  )
}
```

---

## CHANGE 4 — Add "Avg comparable price" tile to S3 Capital group in ViewResults

In Section 3, the Capital group currently has 4 tiles:
  Cash invested | Purchase price | BMV discount | Refurb cost

Add a 5th tile: **Avg comparable price**

Update that grid to `grid-template-columns: repeat(5, 1fr)`.

The tile:
```tsx
{/* Only show when comps data exists */}
{(() => {
  try {
    const comps: Array<{price:number; kept?:boolean}> = JSON.parse((deal?.comps as string) ?? '[]')
    const relevant = comps.filter(c => c.kept !== false) // include all unless explicitly removed
    if (relevant.length === 0) return null
    const avg = Math.round(relevant.reduce((s,c) => s + c.price, 0) / relevant.length)
    const priceDiff = avg - (results?.purchasePrice ?? 0)
    return (
      <div style={tileStyle}>
        <div style={{fontSize:10, color:'var(--text-2)', marginBottom:4}}>Avg comparable price</div>
        <div style={{fontSize:18, fontWeight:600, color:'var(--navy)'}}>
          £{avg.toLocaleString()}
        </div>
        <div style={{fontSize:11, color: priceDiff >= 0 ? '#059669' : '#dc2626', marginTop:3}}>
          {priceDiff >= 0 ? '+' : ''}£{priceDiff.toLocaleString()} vs asking · {relevant.length} sold
        </div>
      </div>
    )
  } catch { return null }
})()}
```

If the comps array is empty or null, this tile simply doesn't render (grid stays 4-col).

---

## CHANGE 5 — Move Sold Price Comparables table to ViewInputs

### 5a — Remove Section 9 from ViewResults entirely
Delete the full "SOLD PRICE COMPARABLES" block from ViewResults's return(), including:
- The section header row with Refresh button
- The `localComps` useState and any other comps-specific state declared inside ViewResults
- The empty state placeholder card
- The comps table
- The summary line

Keep `CompsRow` interface if it's used anywhere else; remove it if ViewInputs will redeclare it locally.

### 5b — Add Sold Price Comparables to ViewInputs

Find ViewInputs's return(). Add the comps section at the bottom, after all existing input fields, before the closing tag.

ViewInputs already has access to `deal` and `setField` / `scheduleAutosave` via props or closure. If `fetchComps` is not available in ViewInputs scope, pass it as a prop from AnalysisHub (same way it's wired to ViewWorkings).

```tsx
{/* ── Sold Price Comparables ── */}
<div style={{marginTop:18}}>
  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
    <span style={{fontSize:11, fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--text-2)'}}>
      Sold Price Comparables
    </span>
    <button
      onClick={() => fetchComps(deal?.postcode ?? '')}
      style={{
        display:'flex', alignItems:'center', gap:5, padding:'4px 10px',
        fontSize:11, borderRadius:6, cursor:'pointer',
        background:'none', border:'.5px solid var(--ds-border)', color:'var(--text-2)'
      }}>
      ↺ Refresh
    </button>
  </div>

  {localComps.length === 0 ? (
    <div style={{
      background:'var(--bg-sec)', borderRadius:8, padding:'14px 16px',
      fontSize:12, color:'var(--text-2)', textAlign:'center'
    }}>
      No sold price data yet — click Refresh to fetch comparables for {deal?.postcode ?? 'this postcode'}.
    </div>
  ) : (
    <>
      {/* Table */}
      <div style={{border:'.5px solid var(--ds-border)', borderRadius:8, overflow:'hidden'}}>
        {/* Header */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 90px 100px 110px 100px 120px',
          background:'var(--bg-sec)', padding:'7px 14px',
          fontSize:11, fontWeight:500, color:'var(--text-2)',
          borderBottom:'.5px solid var(--ds-border)'
        }}>
          <span>Address</span><span>Sold</span><span>Price</span>
          <span>Type</span><span>Tenure</span><span style={{textAlign:'right'}}>Actions</span>
        </div>

        {localComps.map((row, idx) => (
          <div key={idx} style={{
            display:'grid', gridTemplateColumns:'1fr 90px 100px 110px 100px 120px',
            padding:'9px 14px', fontSize:12, alignItems:'center',
            borderBottom: idx < localComps.length - 1 ? '.5px solid var(--ds-border)' : 'none',
            background: row.kept ? 'rgba(29,158,117,.04)' : undefined
          }}>
            <span style={{color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
              {row.address}
            </span>
            <span style={{color:'var(--text-2)'}}>{row.date}</span>
            <span style={{fontWeight:500, color:'var(--navy)'}}>£{row.price.toLocaleString()}</span>
            <span style={{color:'var(--text-2)', fontSize:11}}>{row.type}</span>
            <span style={{color:'var(--text-2)', fontSize:11}}>{row.tenure}</span>
            <div style={{display:'flex', gap:6, justifyContent:'flex-end'}}>
              {/* Keep button */}
              <button
                onClick={() => {
                  const updated = localComps.map((r,i) => i===idx ? {...r, kept:!r.kept} : r)
                  setLocalComps(updated)
                  setField('comps', JSON.stringify(updated))
                  scheduleAutosave()
                }}
                style={{
                  padding:'3px 8px', fontSize:11, borderRadius:4, cursor:'pointer',
                  background: row.kept ? '#e6f7f1' : 'var(--bg-sec)',
                  color: row.kept ? '#1D9E75' : 'var(--text-2)',
                  border: row.kept ? '.5px solid #1D9E75' : '.5px solid var(--ds-border)'
                }}>
                {row.kept ? '✓ Keep' : 'Keep'}
              </button>
              {/* Remove button */}
              <button
                onClick={() => {
                  const updated = localComps.filter((_,i) => i!==idx)
                  setLocalComps(updated)
                  setField('comps', JSON.stringify(updated))
                  scheduleAutosave()
                }}
                style={{
                  width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, borderRadius:4, cursor:'pointer',
                  background:'none', border:'.5px solid var(--ds-border)', color:'var(--text-2)'
                }}>
                −
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary line */}
      {(() => {
        const kept = localComps.filter(c => c.kept)
        if (kept.length === 0) return (
          <div style={{fontSize:12, color:'#d97706', marginTop:6}}>
            No comparables marked for pack — click Keep on the rows you want to include.
          </div>
        )
        const avg = Math.round(kept.reduce((s,c)=>s+c.price,0) / kept.length)
        return (
          <div style={{fontSize:12, color:'var(--text-2)', marginTop:6}}>
            {kept.length} comparable{kept.length>1?'s':''} selected for investor pack · Avg price: £{avg.toLocaleString()}
          </div>
        )
      })()}
    </>
  )}
</div>
```

### 5c — State and props for ViewInputs comps

ViewInputs will need:
```typescript
interface CompsRow { address:string; date:string; price:number; type:string; tenure:string; kept:boolean }
const [localComps, setLocalComps] = useState<CompsRow[]>(() => {
  try { return JSON.parse((deal?.comps as string) ?? '[]') } catch { return [] }
})
```

And `fetchComps` passed as a prop (or imported from wherever it's defined — check AnalysisHub scope). If ViewInputs doesn't currently receive `deal` as a prop, thread it from AnalysisHub the same way ViewResults does.

---

## Summary of all changes

| Change | File location | Action |
|--------|--------------|--------|
| Remove ICR/S24 panel | ViewResults return() | Delete Section 5 |
| Remove Optimiser box | ViewResults return() | Delete Section 8 |
| Optimiser modal | AnalysisHub | Add `showOptimiser` state + modal overlay + `OptimiserContent` component |
| Wire Optimise button | AnalysisHub header | Add `onClick={() => setShowOptimiser(true)}` |
| Avg comps tile | ViewResults S3 Capital group | Add 5th tile reading from `deal.comps` JSON |
| Remove comps table | ViewResults return() | Delete Section 9 |
| Add comps table | ViewInputs return() | Add at bottom of inputs |

## TypeScript checks
- `deal?.comps` — may not be in Supabase generated types; cast as `string` if needed: `(deal?.comps as string)`
- `OptimiserContent` props: `{ results: CalcResult | null; deal: Deal | null }`
- All `results?.X` fields: guard with `?? 0` defaults
- Run `npx tsc --noEmit` — zero errors required
