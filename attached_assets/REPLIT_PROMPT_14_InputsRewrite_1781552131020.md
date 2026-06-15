# REPLIT PROMPT 14 — Inputs page rewrite

## Target file
`artifacts/dealscore/src/components/AnalysisHub.tsx`

## Reference mockup
`04_Mockups/UI_Screens/_Confirmed/ds_inputs_v8.html`  
Open it and use it as the visual reference throughout. Every CSS class name and component pattern below comes from this file.

## Standing rules
- Read `AnalysisHub.tsx` in full before making any changes
- Only rewrite the JSX inside `ViewInputs`'s `return()` — do NOT touch state, hooks, handlers, or logic above `return()` in any sub-component
- Do NOT touch `ViewResults`, `ViewSensitivity`, `ViewWorkings`, or any logic outside `ViewInputs`
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14: Inputs rewrite — SC toggle, optional fields, format hints, photo card, visual alignment" && git push origin stage-6`

---

## CHANGE 1 — Import useTier

At the top of `AnalysisHub.tsx`, add:
```tsx
import { useTier } from '../contexts/TierContext'
```

Inside `ViewInputs` component body (above `return()`), add:
```tsx
const { tier } = useTier()
const isPro = tier === 'pro' || tier === 'proplus'
```

---

## CHANGE 2 — Property Information section

Replace the current Property Information section with this structure:

### Mandatory fields (always visible)
Show as a flat grid (3 columns):
- Address (required `*`)
- Property type (ISelect dropdown — existing options)
- Bedrooms (ISelect dropdown — existing options)
- Tenure (segmented control: **Freehold | Leasehold** — 2 options = segmented, NOT stacked list)
- Source of deal (free text input)

### Format hints on mandatory fields
- All currency fields: £ prefix inside the input box
- All percentage fields: % suffix inside the input box
- All number-only fields: numeric keyboard hint (`inputMode="numeric"`)

Pattern for a field with £ prefix:
```tsx
<div style={{display:'flex',alignItems:'center',background:'#fff',border:'.5px solid var(--ds-border)',borderRadius:7,overflow:'hidden',transition:'border-color .15s'}}
  onFocus={(e)=>(e.currentTarget.style.borderColor='var(--navy)')}
  onBlur={(e)=>(e.currentTarget.style.borderColor='var(--ds-border)')}>
  <span style={{fontSize:12,fontWeight:500,color:'var(--text-2)',padding:'0 6px 0 10px',flexShrink:0}}>£</span>
  <input style={{border:'none',outline:'none',fontSize:13,color:'var(--text-1)',padding:'7px 10px 7px 0',width:'100%',background:'transparent',fontFamily:'inherit'}}
    inputMode="numeric" ... />
</div>
```

Pattern for % suffix (mirror of above, suffix on right).

### Optional details expandable sub-group

Below the mandatory grid, add a toggle row:
```tsx
const [showOptional, setShowOptional] = useState(false)
```

```tsx
<button
  onClick={() => setShowOptional(v => !v)}
  style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-2)',background:'none',border:'none',cursor:'pointer',padding:'6px 0',marginTop:8,fontFamily:'inherit'}}>
  <i className={`ti ti-chevron-${showOptional ? 'up' : 'down'}`} style={{fontSize:12}} />
  {showOptional ? 'Hide optional details' : 'Show optional details'}
  <span style={{fontSize:10,color:'#bbb',marginLeft:4}}>Floor area, year built, EPC, construction type, flood risk, gas supply, council tax, listed building, conservation area, PD rights, cash buyer, bathrooms, currently tenanted, uninhabitable</span>
</button>

{showOptional && (
  <div style={{marginTop:10,paddingTop:10,borderTop:'.5px solid var(--ds-border)'}}>
    {/* All optional property fields in a 3-column grid */}
    {/* These are the ~15 fields currently in ViewInputs that are NOT in the mandatory list above */}
    {/* Move them here exactly as they are — do not change their IField/ISelect components */}
    {/* Include: floor area, year built, EPC rating, construction type, flood risk, gas supply, */}
    {/*          council tax band, listed building, conservation area, PD rights, cash buyer,   */}
    {/*          bathrooms, currently tenanted, uninhabitable, asking price, buyer type         */}
  </div>
)}
```

The MEES warning card (EPC D/E/F/G amber) stays immediately after Property Information — outside the optional group, always visible if EPC triggers it.

---

## CHANGE 3 — Property photos card

Add a dedicated **Property photos** collapsible card immediately after the Property Information section and before the Vendor Situation / Step 1 section.

```tsx
const [photosOpen, setPhotosOpen] = useState(false)
```

```tsx
<div style={{background:'#fff',borderRadius:10,border:'.5px solid var(--ds-border)',boxShadow:'0 1px 3px rgba(0,0,0,.06)',marginBottom:10,overflow:'hidden'}}>
  {/* Card header — clickable to expand */}
  <div
    onClick={() => setPhotosOpen(v => !v)}
    style={{display:'flex',alignItems:'center',padding:'13px 18px',cursor:'pointer',userSelect:'none',gap:10}}
    onMouseEnter={e => (e.currentTarget.style.background='var(--bg-sec)')}
    onMouseLeave={e => (e.currentTarget.style.background='')}>
    <i className="ti ti-photo" style={{fontSize:16,color:'var(--navy)',opacity:.7}} />
    <span style={{fontSize:13,fontWeight:600,color:'var(--text-1)',flex:1}}>Property photos</span>
    <span style={{fontSize:10,fontWeight:500,color:'#bbb',background:'var(--bg-sec)',border:'.5px solid var(--ds-border)',padding:'2px 8px',borderRadius:20}}>Optional</span>
    <span style={{fontSize:10,fontWeight:500,color:'var(--navy)',background:'var(--navy-light)',border:'.5px solid rgba(27,58,107,.15)',padding:'2px 8px',borderRadius:20,display:'flex',alignItems:'center',gap:3}}>
      <i className="ti ti-file-text" style={{fontSize:10}} /> Used in investor pack
    </span>
    <i className={`ti ti-chevron-${photosOpen ? 'up' : 'down'}`} style={{fontSize:16,color:'#ccc'}} />
  </div>

  {photosOpen && (
    <div style={{padding:'0 18px 16px'}}>
      {/* Move the existing photo upload UI here — whatever currently handles property photos */}
      {/* If there's a deal card image toggle, include it here too */}
      {/* Drag-drop zone placeholder if no upload component exists yet: */}
      <div style={{border:'1.5px dashed var(--ds-border)',borderRadius:8,padding:'20px 16px',textAlign:'center',color:'var(--text-2)',fontSize:12}}>
        <i className="ti ti-upload" style={{fontSize:20,marginBottom:6,display:'block',opacity:.4}} />
        Drag photos here or <span style={{color:'var(--navy)',cursor:'pointer',fontWeight:500}}>browse</span>
        <div style={{fontSize:10,color:'#bbb',marginTop:4}}>Used on the deal card and in the investor pack</div>
      </div>
    </div>
  )}
</div>
```

---

## CHANGE 4 — Step 2 SC toggle (v8 pattern)

Find the Step 2 section in ViewInputs. Replace whatever SC toggle currently exists with the v8 pattern: a `Manual | Smart Capture` pill toggle in the **Step 2 section header**, right-aligned. Pro badge sits next to it.

```tsx
{/* Step 2 header row */}
<div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
  <div>
    <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.07em',color:'#bbb',marginBottom:3}}>
      Step 2 of 2 — {mode === 'buy' ? 'Buy' : mode === 'rent' ? 'Rent' : 'Specialist'} strategies
    </div>
    <div style={{fontSize:14,fontWeight:600,color:'var(--text-1)'}}>Select your strategy</div>
    <div style={{fontSize:12,color:'var(--text-2)',marginTop:3}}>
      Select one as your primary. All scoreable strategies appear in the Results tab ranking simultaneously.
    </div>
  </div>

  {/* Manual | SC toggle — Pro only */}
  <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0,paddingTop:2}}>
    {isPro ? (
      <>
        <div style={{display:'flex',background:'var(--bg-sec)',border:'.5px solid var(--ds-border)',borderRadius:8,padding:2,gap:1}}>
          <button
            onClick={() => setScMode('manual')}
            style={{
              padding:'5px 10px',fontSize:11,border:'none',borderRadius:6,cursor:'pointer',
              fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .12s',
              background: scMode === 'manual' ? '#fff' : 'transparent',
              color: scMode === 'manual' ? 'var(--navy)' : 'var(--text-2)',
              fontWeight: scMode === 'manual' ? 500 : 400,
              boxShadow: scMode === 'manual' ? '0 0 0 0.5px rgba(27,58,107,.15)' : 'none',
            }}>
            Manual
          </button>
          <button
            onClick={() => setScMode('sc')}
            style={{
              padding:'5px 10px',fontSize:11,border:'none',borderRadius:6,cursor:'pointer',
              fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .12s',
              background: scMode === 'sc' ? '#5B21B6' : 'transparent',
              color: scMode === 'sc' ? '#fff' : 'var(--text-2)',
              fontWeight: scMode === 'sc' ? 500 : 400,
            }}>
            Smart Capture
          </button>
        </div>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:'.04em',color:'var(--navy)',background:'var(--navy-light)',border:'.5px solid rgba(27,58,107,.2)',padding:'2px 7px',borderRadius:20}}>
          PRO
        </span>
      </>
    ) : (
      /* Free tier — show locked SC button */
      <div style={{display:'flex',alignItems:'center',gap:6,opacity:.5,cursor:'not-allowed'}}>
        <div style={{display:'flex',background:'var(--bg-sec)',border:'.5px solid var(--ds-border)',borderRadius:8,padding:2}}>
          <button disabled style={{padding:'5px 10px',fontSize:11,border:'none',borderRadius:6,background:'transparent',color:'var(--text-2)',fontFamily:'inherit',cursor:'not-allowed'}}>
            Manual
          </button>
          <button disabled style={{padding:'5px 10px',fontSize:11,border:'none',borderRadius:6,background:'transparent',color:'var(--text-2)',fontFamily:'inherit',cursor:'not-allowed'}}>
            Smart Capture 🔒
          </button>
        </div>
        <span style={{fontSize:9,fontWeight:700,color:'var(--navy)',background:'var(--navy-light)',border:'.5px solid rgba(27,58,107,.2)',padding:'2px 7px',borderRadius:20}}>
          PRO
        </span>
      </div>
    )}
  </div>
</div>
```

Add `scMode` state to ViewInputs (above return):
```tsx
const [scMode, setScMode] = useState<'manual'|'sc'>('manual')
```

When `scMode === 'sc'`: hide the strategy grid and show the SC grouped form (if SC form exists) or a URL paste input placeholder. When `scMode === 'manual'`: show the strategy grid as normal.

---

## CHANGE 5 — Country selector → tax rule chip

Find the Country field in the Property & purchase section. After the country selector, add a tax rule chip that shows when a country is selected:

```tsx
{form.country && (
  <div style={{
    display:'inline-flex',alignItems:'center',gap:6,
    marginTop:8,padding:'5px 10px',borderRadius:20,
    fontSize:11,whiteSpace:'nowrap',width:'fit-content',
    ...(form.country === 'Wales'
      ? {background:'#f0fdf4',border:'.5px solid #6ee7b7',color:'#064e3b'}
      : form.country === 'Scotland'
      ? {background:'#faf5ff',border:'.5px solid #c4b5fd',color:'#3b0764'}
      : {background:'#eff6ff',border:'.5px solid #93c5fd',color:'#1e3a5f'})
  }}>
    <i className={
      form.country === 'Wales' ? 'ti ti-leaf' :
      form.country === 'Scotland' ? 'ti ti-diamond' :
      'ti ti-home-2'
    } style={{fontSize:12,flexShrink:0}} />
    <strong style={{fontWeight:600}}>
      {form.country === 'Wales' ? 'Wales — LTT applies' :
       form.country === 'Scotland' ? 'Scotland — LBTT applies' :
       'England / N. Ireland — SDLT applies'}
    </strong>
    <a
      href={
        form.country === 'Wales' ? 'https://gov.wales/land-transaction-tax-rates-and-bands' :
        form.country === 'Scotland' ? 'https://revenue.scot/taxes/land-buildings-transaction-tax' :
        'https://www.gov.uk/stamp-duty-land-tax'
      }
      target="_blank" rel="noopener noreferrer"
      style={{fontWeight:600,textDecoration:'none',marginLeft:4,
        color: form.country === 'Wales' ? '#059669' : form.country === 'Scotland' ? '#7c3aed' : '#2563eb'}}>
      View current bands →
    </a>
  </div>
)}
```

---

## CHANGE 6 — Leasehold costs conditional

In the Monthly costs section, find service charge and ground rent fields. Wrap them so they only render when tenure is Leasehold:

```tsx
{(form.tenure === 'Leasehold' || form.tenure === 'Share of freehold') && (
  <>
    {/* Service charge field */}
    {/* Ground rent field */}
  </>
)}
```

If the Leasehold section (7 fields: remaining lease, lease extension cost, service charge, ground rent, ground rent review, share of freehold, managing agent) already exists as a conditional block, ensure it uses the same tenure check and is consistent with the Monthly costs section.

---

## CHANGE 7 — Field tooltip hints

Add tooltip hints to the most non-obvious fields. Use this inline pattern (no external library needed):

```tsx
// Add to component body:
const [activeTip, setActiveTip] = useState<string|null>(null)

// Tooltip trigger component:
const FieldTip = ({ id, text }: { id:string; text:string }) => (
  <span style={{position:'relative',display:'inline-flex',alignItems:'center',marginLeft:4}}>
    <i
      className="ti ti-info-circle"
      onMouseEnter={() => setActiveTip(id)}
      onMouseLeave={() => setActiveTip(null)}
      style={{fontSize:11,color:'#bbb',cursor:'help'}}
    />
    {activeTip === id && (
      <span style={{
        position:'absolute',bottom:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',
        background:'#1a2332',color:'#fff',fontSize:10,lineHeight:1.5,
        padding:'6px 9px',borderRadius:6,whiteSpace:'normal',width:200,zIndex:50,
        boxShadow:'0 4px 12px rgba(0,0,0,.2)'
      }}>
        {text}
      </span>
    )}
  </span>
)
```

Apply `<FieldTip>` to these fields (minimum set — add more if obvious):

| Field | Tip text |
|-------|----------|
| ICR requirement | "Lenders stress-test rent against mortgage at 5.5%. Ltd companies need 125%, personal name needs 145%." |
| JV split % | "Your share of profits in a joint venture deal. The remaining % goes to your JV partner." |
| Cooling-off period | "Days the investor has to withdraw after signing. Standard is 14 days under UK consumer protection law." |
| Payment terms | "When your sourcing fee is due — typically on pack release, reservation, or completion." |
| Holding costs / mo (FLIP) | "Monthly costs while you own during refurb — council tax, utilities, insurance, and bridging interest." |
| Post-refurb value | "Estimated market value after the refurbishment is complete. Used to calculate BRRR refinance LTV." |
| Void allowance % | "Percentage of the year the property is empty. 0% if income is guaranteed (social/lease). Typically 8–10% for BTL." |
| Arrangement fee | "Lender's upfront fee for setting up the mortgage. Can be added to the loan or paid on completion." |
| Exit fee (bridging) | "Fee paid when bridging loan is repaid. Typically 1% of the loan amount." |
| Re-let fee | "Agent fee to find a new tenant after a void. Typically half a month's rent." |

---

## CHANGE 8 — Source badges on SC-populated fields

When `deal.scSource` is set (i.e. a URL was scraped to populate this deal), show a small source badge below SC-populated fields.

SC-populated fields (those auto-filled by the scraper): address, property type, bedrooms, tenure, purchase price, postcode, EPC rating, leasehold data.

```tsx
const scSource = (deal as Record<string,unknown>)?.scSource as string | undefined

// Source badge component:
const ScBadge = ({ source }: { source?: string }) =>
  source ? (
    <div style={{display:'flex',alignItems:'center',gap:4,marginTop:3}}>
      <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em',color:'#fff',background:'var(--navy)',padding:'1px 5px',borderRadius:3,opacity:.7}}>
        {source}
      </span>
      <span style={{fontSize:10,color:'var(--navy)',opacity:.8}}>auto-filled</span>
    </div>
  ) : null
```

Add `<ScBadge source={scSource} />` below the address, property type, bedrooms, tenure, and price fields when `scSource` is defined.

If `deal.scSource` doesn't exist on the Deal type, cast it: `(deal as Record<string,unknown>)?.scSource as string | undefined` — this avoids TypeScript errors until the Supabase column is added in a later migration.

---

## CHANGE 9 — Visual alignment: segmented controls, stacked lists, method rows

Audit all binary toggle fields in ViewInputs. Any field with exactly 2 options that currently uses a dropdown (ISelect) or radio buttons should use the segmented control pattern:

```tsx
// Segmented control (2-option binary) — e.g. Yes/No, Freehold/Leasehold, Interest only/Repayment
<div style={{display:'flex',background:'var(--bg-sec)',border:'.5px solid var(--ds-border)',borderRadius:8,padding:2,gap:1}}>
  {['Option A','Option B'].map(opt => (
    <button key={opt}
      onClick={() => setField('fieldName', opt)}
      style={{
        flex:1,padding:'5px 8px',fontSize:12,border:'none',borderRadius:6,
        cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .12s',
        background: form.fieldName === opt ? '#fff' : 'transparent',
        color: form.fieldName === opt ? 'var(--navy)' : 'var(--text-2)',
        fontWeight: form.fieldName === opt ? 500 : 400,
        boxShadow: form.fieldName === opt ? '0 0 0 0.5px rgba(27,58,107,.15)' : 'none',
      }}>
      {opt}
    </button>
  ))}
</div>
```

Apply to: Yes/No fields (currently tenanted, uninhabitable, listed building, conservation area, PD rights, cash buyer, gas supply, auction purchase, furnished, Article 4, ensuite, SA licence, R2R sublet right, R2R mortgage consent, flood risk Low/Med/High if it's currently a dropdown).

For 3+ option non-financing selectors (e.g. ownership structure, income tax band, mortgage type if it has 3+ options): keep as ISelect dropdown — the stacked list is only used in v8 for the Buy/Rent/Specialist Step 1 cards and Country selector, not for every multi-option field.

Financing method rows (Mortgage / Bridging / Cash) already use the horizontal tile pattern — verify they still do and leave them.

---

## TypeScript notes
- `showOptional` and `photosOpen` and `scMode` and `activeTip`: all new useState — declare above `return()`
- `deal.scSource`: cast as `(deal as Record<string,unknown>)?.scSource as string | undefined` until DB migration
- `isPro`: derived from `useTier()` — no new prop needed
- All existing IField / ISelect / ISelectOther components: do NOT change their implementations — only change how they're called in JSX
- Run `npx tsc --noEmit` — zero errors required

---

## After completing
1. Run `npx tsc --noEmit` — zero errors required
2. Screenshot the Inputs tab and confirm:
   - Property info shows mandatory fields + "Show optional details" toggle
   - Photo card is a collapsible section
   - Step 2 has Manual | Smart Capture toggle (Pro-badged)
   - Country selection shows tax chip
   - Currency fields have £ prefix
   - Service charge / ground rent hidden when Freehold selected
3. Push: `git add -A && git commit -m "Stage 10 — Prompt 14: Inputs rewrite — SC toggle, optional fields, format hints, photo card, visual alignment" && git push origin stage-6`

## Tell me
1. Which binary fields were converted to segmented controls (list them)
2. Whether `deal.scSource` needed a type cast or already existed on Deal type
3. Whether `scMode` state wires to an existing SC form or just shows a placeholder
4. Any fields where the tooltip couldn't be added cleanly and why
