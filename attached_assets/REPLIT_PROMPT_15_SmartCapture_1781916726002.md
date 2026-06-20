# REPLIT PROMPT 15 — Smart Capture: guided deal intake wizard

## What this does
Redesigns Smart Capture from a Rightmove URL box into a proper multi-step guided form flow. Smart Capture is a **Pro+** feature — a wizard-style interview that walks the user through every input DealScore needs to rank all strategies from strongest to weakest. Rightmove/Zoopla URL scraping becomes a standalone "Import listing" button available in **both** modes.

**Key product distinctions:**
- **Smart Capture** = Pro+ only, guided multi-step wizard (full-page overlay)
- **Rightmove/Zoopla import** = Pro feature, data-entry shortcut, available in both modes
- **Manual mode** = existing inputs page, unchanged

**Dependency:** Prompt 14ar merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 15: Smart Capture guided wizard" && git push origin stage-6`

---

## CRITICAL ARCHITECTURE NOTES

1. `IField`, `ISelect`, `ISelectOther`, and `InfoIcon` are **not exported** — they are functions defined locally inside `AnalysisHub.tsx`. Therefore the SmartCaptureWizard and all its step components **must be defined in the same file** (`AnalysisHub.tsx`), NOT in a separate file. Do NOT create `SmartCaptureWizard.tsx`.

2. `AnalysisHub.tsx` uses **named React imports only** (`import { useState, useEffect, ... } from 'react'`). There is no default `React` import. Do NOT use `React.Dispatch`, `React.SetStateAction`, or any `React.X` type references — they will fail. Use named types instead: `Dispatch<SetStateAction<T>>` (add `Dispatch, SetStateAction` to the existing react import line), or use the simpler callback type shown in Part E.

3. **HMO data model**: The HMO section uses `hmoInputs.rooms` (number of rooms) and `hmoInputs.rentPerRoom` (single average rent per room) — NOT individual `room1Rent`, `room2Rent` etc. The wizard Step 5 must match this.

---

## PART A — State and constants changes inside ViewInputs (AnalysisHub.tsx)

### 1. Add `isProPlus` after the existing `isPro` line (~line 2102)

```tsx
const isPro = tier === 'pro' || tier === 'proplus'       // already exists
const isProPlus = tier === 'proplus'                      // ← add this
```

### 2. Remove `scMode` state entirely (~line 2106)

Delete this line:
```tsx
const [scMode, setScMode] = useState<'manual' | 'sc'>('manual')
```
It is no longer used. Also remove any remaining references to `scMode` or `setScMode`.

### 3. Add new state variables near line 2106

```tsx
const [showSmartCapture, setShowSmartCapture] = useState(false)
const [showImportModal, setShowImportModal] = useState(false)
const [scData, setScData] = useState<Record<string, any>>({})
// Note: useState returns a standard setter — no React.Dispatch needed in this file
```

---

## PART B — Replace the Manual / Smart Capture toggle block (~lines 2624–2662)

Find the entire block starting at `{isPro ? (` through the closing `)}` that renders the Manual/Smart Capture segmented control and the `{scMode === 'manual' ? ... : <URL box>}` conditional below it.

Replace the **toggle div** (the `{isPro ? ... : ...}` block) with:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 2 }}>
  {/* Import listing — Pro, both modes */}
  {isPro && (
    <button
      onClick={() => setShowImportModal(true)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 500,
        padding: '5px 10px', borderRadius: 6,
        border: '.5px solid var(--ds-border)',
        background: '#fff', color: 'var(--text-1)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      Import listing
    </button>
  )}

  {/* Smart Capture — Pro+ only */}
  {isProPlus ? (
    <button
      onClick={() => {
        setScData({
          address:           String(form.address ?? ''),
          propertyType:      String(form.propertyType ?? ''),
          bedrooms:          String(form.bedrooms ?? ''),
          epc:               String(form.epc ?? ''),
          floodRisk:         String(form.floodRisk ?? ''),
          tenure:            String(form.tenure ?? 'freehold'),
          purchasePrice:     String(Number((form.sharedInputs as any)?.purchasePrice ?? 0) || ''),
          marketValue:       String(Number(form.marketValue ?? 0) || ''),
          taxRegion:         String(form.taxRegion ?? 'ENGLAND'),
          depositPct:        String(Number((form.sharedInputs as any)?.depositPercent ?? 25)),
          mortgageRate:      String(Number((form.sharedInputs as any)?.mortgageRate ?? 0) || ''),
          mortgageType:      (form.sharedInputs as any)?.mortgageType === 'IO' ? 'Interest only' : 'Repayment',
          mortgageTerm:      String(Number((form.sharedInputs as any)?.mortgageTerm ?? 25)),
          financeType:       'mortgage',
          refurbCost:        String(Number((form.sharedInputs as any)?.refurbCost ?? 0) || ''),
          ownershipStructure: String(form.ownershipStructure ?? 'Personal name'),
          incomeTaxBand:     String(form.incomeTaxBand ?? '20%'),
          strategy:          String(p.strategy ?? 'btl').toLowerCase(),
        })
        setShowSmartCapture(true)
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 600,
        padding: '5px 11px', borderRadius: 6,
        border: 'none', background: '#5B21B6', color: '#fff',
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      ✦ Smart Capture
    </button>
  ) : isPro ? (
    <button disabled title="Smart Capture requires Pro+"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 11, padding: '5px 11px', borderRadius: 6,
        border: '.5px solid var(--ds-border)', background: 'var(--bg-sec)', color: 'var(--text-2)',
        cursor: 'not-allowed', fontFamily: 'inherit', opacity: 0.6,
      }}
    >
      Smart Capture
      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: '#5B21B6', color: '#fff' }}>PRO+</span>
    </button>
  ) : (
    <button disabled style={{ fontSize: 11, padding: '5px 10px', border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--text-2)', fontFamily: 'inherit', cursor: 'not-allowed', opacity: 0.5 }}>
      Smart Capture 🔒
    </button>
  )}
</div>
```

Replace the **strategy picker conditional** (the `{scMode === 'manual' ? ... : <URL box div>}`) with simply:

```tsx
<Step2StrategyPicker mode={mode} activeTile={activeTile} onSelect={selectStrategy} isEditing={isEditing} />
```

The URL box is gone. The strategy picker always shows.

---

## PART C — Import listing modal

Add this inside the `ViewInputs` return, just before the closing `</div>`:

```tsx
{/* Import listing modal */}
{showImportModal && (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    onClick={() => setShowImportModal(false)}
  >
    <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 480, boxShadow: '0 12px 40px rgba(0,0,0,.18)' }}
      onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Import from listing</div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
        Paste a Rightmove, Zoopla, or OnTheMarket URL to auto-fill property details.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="url" placeholder="https://www.rightmove.co.uk/properties/..."
          style={{ flex: 1, padding: '8px 11px', fontSize: 13, border: '.5px solid var(--ds-border)', borderRadius: 7, outline: 'none', fontFamily: 'inherit', color: 'var(--text-1)' }} />
        <button style={{ padding: '8px 16px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
          Import →
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-2)', opacity: .7 }}>
        Address, asking price, bedrooms, and property type will be auto-filled where available.
      </div>
    </div>
  </div>
)}
```

---

## PART D — Smart Capture wizard overlay

Add this inside the `ViewInputs` return, just before the closing `</div>` (after the import modal):

```tsx
{/* Smart Capture wizard */}
{showSmartCapture && (
  <SCWizard
    scData={scData}
    setScData={setScData}
    onFinish={(data: Record<string, any>) => {
      // Apply all wizard data back to the deal form using exact setField paths
      if (data.address)           setField('address', data.address)
      if (data.propertyType)      setField('propertyType', data.propertyType)
      if (data.bedrooms)          setField('bedrooms', parseInt(data.bedrooms) || 0)
      if (data.epc)               setField('epc', data.epc)
      if (data.floodRisk)         setField('floodRisk', data.floodRisk)
      if (data.tenure)            setField('tenure', data.tenure)
      if (data.purchasePrice)     setField('sharedInputs.purchasePrice', parseFloat(String(data.purchasePrice).replace(/[£,]/g, '')) || 0)
      if (data.marketValue)       setField('marketValue', parseFloat(String(data.marketValue).replace(/[£,]/g, '')) || 0)
      if (data.taxRegion)         setField('taxRegion', data.taxRegion)
      if (data.depositPct)        setField('sharedInputs.depositPercent', parseFloat(data.depositPct) || 25)
      if (data.mortgageRate)      setField('sharedInputs.mortgageRate', parseFloat(data.mortgageRate) || 0)
      if (data.mortgageType)      setField('sharedInputs.mortgageType', data.mortgageType === 'Interest only' ? 'IO' : 'Repayment')
      if (data.mortgageTerm)      setField('sharedInputs.mortgageTerm', parseInt(data.mortgageTerm) || 25)
      if (data.refurbCost)        setField('sharedInputs.refurbCost', parseFloat(String(data.refurbCost).replace(/[£,]/g, '')) || 0)
      if (data.ownershipStructure) setField('ownershipStructure', data.ownershipStructure)
      if (data.incomeTaxBand)     setField('incomeTaxBand', data.incomeTaxBand)
      // Monthly costs (top-level fields, not nested under strategy)
      if (data.mgmtFee)     setField('managementFeePercent', parseFloat(data.mgmtFee) || 0)
      if (data.voidPct)     setField('voidAllowancePercent', parseFloat(data.voidPct) || 0)
      if (data.maintenance) setField('maintenanceReserve', parseFloat(String(data.maintenance).replace(/[£,]/g, '')) || 0)
      // Strategy-specific income fields
      if (data.strategy === 'btl') {
        if (data.monthlyRent)      setField('btlInputs.monthlyRent', parseFloat(String(data.monthlyRent).replace(/[£,]/g, '')) || 0)
        if (data.initialVoidWeeks) setField('btlInputs.initialVoidWeeks', parseInt(data.initialVoidWeeks) || 0)
      }
      if (data.strategy === 'hmo') {
        // HMO uses a room count + single average rent per room (not individual room fields)
        if (data.hmoRooms)       setField('hmoInputs.rooms', parseInt(data.hmoRooms) || 0)
        if (data.hmoRentPerRoom) setField('hmoInputs.rentPerRoom', parseFloat(String(data.hmoRentPerRoom).replace(/[£,]/g, '')) || 0)
      }
      if (data.strategy === 'sa') {
        if (data.nightlyRate)  setField('saInputs.nightlyRate', parseFloat(data.nightlyRate) || 0)
        if (data.occupancy)    setField('saInputs.occupancyPercent', parseFloat(data.occupancy) || 0)
        if (data.platformFee)  setField('saInputs.platformFeesPercent', parseFloat(data.platformFee) || 0)
        if (data.cleaningCost) setField('saInputs.cleaningCostPerStay', parseFloat(data.cleaningCost) || 0)
      }
      if (data.strategy === 'flip') {
        if (data.targetSalePrice) setField('flipInputs.expectedSalePrice', parseFloat(String(data.targetSalePrice).replace(/[£,]/g, '')) || 0)
        if (data.saleTimeline)    setField('flipInputs.projectLengthMonths', parseInt(data.saleTimeline) || 0)
        if (data.agentFee)        setField('flipInputs.sellingCostsPercent', parseFloat(data.agentFee) || 0)
      }
      // Select the strategy tile
      if (data.strategy) selectStrategy(data.strategy)
      // Close wizard and navigate to results
      setShowSmartCapture(false)
      onViewChange?.('results')
    }}
    onClose={() => setShowSmartCapture(false)}
  />
)}
```

---

## PART E — SCWizard and step components (define in AnalysisHub.tsx, BEFORE ViewInputs)

Add these functions to `AnalysisHub.tsx` **before** the `ViewInputs` function definition. They are standalone functions that use `IField`, `ISelect`, and `InfoIcon` which are already in scope in the same file.

```tsx
// ── Smart Capture Wizard ─────────────────────────────────────────────────────

function SCStepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy,#1B3A6B)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text-2,#6c757d)', lineHeight: 1.5 }}>{subtitle}</div>
    </div>
  )
}

function SCNavRow({ onBack, onNext, nextLabel = 'Continue →', nextDisabled = false }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--ds-border,#e3e5e9)' }}>
      {onBack
        ? <button onClick={onBack} style={{ fontSize: 13, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        : <div />}
      <button onClick={onNext} disabled={nextDisabled}
        style={{ fontSize: 14, fontWeight: 600, padding: '12px 28px', borderRadius: 8, border: 'none', background: nextDisabled ? 'var(--bg-sec)' : 'var(--navy,#1B3A6B)', color: nextDisabled ? 'var(--text-2)' : '#fff', cursor: nextDisabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
        {nextLabel}
      </button>
    </div>
  )
}

function SCStep1({ data, set, onNext }: { data: Record<string,any>; set: (k: string, v: any) => void; onNext: () => void }) {
  const canContinue = !!(data.address?.trim() && data.propertyType)
  return (
    <>
      <SCStepHeader title="Tell us about the property" subtitle="We'll use this to identify the deal and check comparable sold prices." />
      <IField label="Address" value={data.address ?? ''} onChange={v => set('address', v)} required
        info="Full address including postcode. DealScore uses the postcode to fetch Land Registry sold price comparables. Postcode must include a space (e.g. CF24 1RN)." />
      <div style={{ marginTop: 14 }}>
        <ISelect label="Property type" value={data.propertyType ?? ''} onChange={v => set('propertyType', v)} required
          options={['House', 'Flat', 'Bungalow', 'HMO', 'Commercial / Mixed use']}
          info="Property type affects mortgage eligibility. Some lenders restrict lending on ex-local authority flats, high-rise blocks, or non-standard construction." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
        <IField label="Bedrooms" value={data.bedrooms ?? ''} onChange={v => set('bedrooms', v)}
          info="For HMOs, informs room count and licensing thresholds — mandatory HMO licensing typically applies at 5+ occupants from 2+ households." />
        <ISelect label="EPC rating" value={data.epc ?? ''} onChange={v => set('epc', v)}
          options={['A','B','C','D','E','F','G','Not yet assessed']}
          info="Properties rated F or G incur a DealScore penalty. Minimum EPC rating of E is required for most tenancies." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
        <ISelect label="Flood risk" value={data.floodRisk ?? ''} onChange={v => set('floodRisk', v)}
          options={['Very low','Low','Medium','High','Very high','Unknown']}
          info="High flood risk properties incur a DealScore penalty and face higher insurance premiums and reduced mortgage lender appetite." />
        <ISelect label="Tenure" value={data.tenure ?? 'freehold'} onChange={v => set('tenure', v)}
          options={['Freehold','Leasehold']}
          info="Freehold: you own the property and land outright. Leasehold: additional costs and risks — select Leasehold to reveal extra fields in manual mode." />
      </div>
      <SCNavRow onNext={onNext} nextDisabled={!canContinue} />
    </>
  )
}

function SCStep2({ data, set, onNext, onBack }: { data: Record<string,any>; set: (k: string, v: any) => void; onNext: () => void; onBack: () => void }) {
  const canContinue = !!(Number(data.purchasePrice) > 0)
  return (
    <>
      <SCStepHeader title="What's the deal?" subtitle="Purchase price and market value let DealScore calculate your equity on entry." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <IField label="Purchase price" value={data.purchasePrice ?? ''} onChange={v => set('purchasePrice', v)} required
          info="The price agreed with the seller. Used for equity on entry, Land Transaction Tax, and total cash-in." />
        <IField label="Market value / GDV" value={data.marketValue ?? ''} onChange={v => set('marketValue', v)}
          info="The open market value at completion. Leave blank if same as purchase price. Used to calculate day-one equity." />
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#999', marginBottom: 8 }}>Country</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ENGLAND','SCOTLAND','WALES'] as const).map(c => {
            const lbl = c === 'ENGLAND' ? 'England & N. Ireland' : c === 'SCOTLAND' ? 'Scotland' : 'Wales'
            const isActive = (data.taxRegion ?? 'ENGLAND') === c
            return (
              <button key={c} onClick={() => set('taxRegion', c)}
                style={{ flex: 1, padding: '8px 11px', borderRadius: 7, border: `.5px solid ${isActive ? 'var(--navy)' : 'var(--ds-border)'}`, background: isActive ? 'var(--navy-light)' : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--navy)' : '#444', transition: 'all .15s' }}>
                {lbl}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 6 }}>
          Determines which land transaction tax applies — DealScore auto-calculates.
        </div>
      </div>
      <SCNavRow onBack={onBack} onNext={onNext} nextDisabled={!canContinue} />
    </>
  )
}

function SCStep3({ data, set, onNext, onBack }: { data: Record<string,any>; set: (k: string, v: any) => void; onNext: () => void; onBack: () => void }) {
  const financeType = (data.financeType as string) ?? 'mortgage'
  return (
    <>
      <SCStepHeader title="How are you financing this?" subtitle="This calculates your monthly mortgage cost and total cash-in." />
      <div style={{ display: 'flex', background: 'var(--bg-sec)', border: '.5px solid var(--ds-border)', borderRadius: 8, padding: 2, gap: 1, marginBottom: 20 }}>
        {(['cash','mortgage','bridging'] as const).map(t => (
          <button key={t} onClick={() => set('financeType', t)}
            style={{ flex: 1, padding: '7px 10px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s', background: financeType === t ? '#fff' : 'transparent', color: financeType === t ? 'var(--navy)' : 'var(--text-2)', fontWeight: financeType === t ? 600 : 400, boxShadow: financeType === t ? '0 0 0 0.5px rgba(27,58,107,.15)' : 'none', textTransform: 'capitalize' as const }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {financeType !== 'cash' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <IField label="Deposit %" value={data.depositPct ?? '25'} onChange={v => set('depositPct', v)}
            info="Your cash contribution as a percentage of the purchase price. Most BTL lenders require minimum 25% deposit." />
          <IField label="Mortgage rate (%)" value={data.mortgageRate ?? ''} onChange={v => set('mortgageRate', v)}
            info="Annual interest rate. DealScore defaults to 5.5% if blank — shown with an 'est.' badge on your results." />
          <ISelect label="Mortgage type" value={data.mortgageType ?? 'Interest only'} onChange={v => set('mortgageType', v)}
            options={['Interest only','Repayment']}
            info="Interest-only: monthly payment is interest only. Repayment: you pay down the mortgage balance over the term." />
        </div>
      )}
      <div style={{ marginTop: financeType !== 'cash' ? 14 : 0, paddingTop: financeType !== 'cash' ? 14 : 0, borderTop: financeType !== 'cash' ? '1px solid var(--ds-border)' : 'none' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 12 }}>Refurb</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <IField label="Works cost (£)" value={data.refurbCost ?? ''} onChange={v => set('refurbCost', v)}
            info="Total estimated cost of all works. Added to cash-in for ROI calculation. Include a 10–15% contingency." />
          <ISelect label="Refurb financing" value={data.refurbFinancing ?? 'Cash'} onChange={v => set('refurbFinancing', v)}
            options={['Cash','Separate bridging facility']}
            info="Cash: works come from your own capital. Bridging: DealScore will model the financing cost separately." />
        </div>
      </div>
      <SCNavRow onBack={onBack} onNext={onNext} />
    </>
  )
}

function SCStep4({ data, set, onNext, onBack }: { data: Record<string,any>; set: (k: string, v: any) => void; onNext: () => void; onBack: () => void }) {
  const selected = data.strategy as string | undefined
  const purchasePrice = Number(String(data.purchasePrice ?? '').replace(/[£,]/g, '')) || 0
  const marketValue = Number(String(data.marketValue ?? '').replace(/[£,]/g, '')) || purchasePrice
  const financeType = (data.financeType as string) ?? 'mortgage'

  // Rough preliminary estimates — clearly marked as approximate in UI
  const btlYield = purchasePrice > 0 ? ((purchasePrice * 0.006 * 12) / purchasePrice) * 100 : 0
  const hmoYield = btlYield * 1.4
  const saYield  = btlYield * 1.8
  const flipViable = purchasePrice > 0 && marketValue > purchasePrice * 1.08

  const strategies: { id: string; label: string; est: string; viable: boolean }[] = [
    { id: 'btl',   label: 'Buy to Let',              est: purchasePrice > 0 ? `~${btlYield.toFixed(1)}% est. gross yield` : 'Enter purchase price for estimate', viable: btlYield >= 5 },
    { id: 'hmo',   label: 'HMO',                     est: purchasePrice > 0 ? `~${hmoYield.toFixed(1)}% est. gross yield` : 'Enter purchase price for estimate', viable: hmoYield >= 7 },
    { id: 'sa',    label: 'Serviced Accommodation',  est: purchasePrice > 0 ? `~${saYield.toFixed(1)}% est. gross yield` : 'Enter purchase price for estimate', viable: saYield >= 10 },
    { id: 'flip',  label: 'Flip / Trade for profit', est: flipViable ? `${(((marketValue - purchasePrice) / purchasePrice) * 100).toFixed(0)}% below market value` : 'Thin margin at current entry price', viable: flipViable },
  ]

  return (
    <>
      <SCStepHeader title="Which strategy suits this property?" subtitle="Select your intended approach. Estimates below are approximate — enter income figures in the next step for accurate results." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {strategies.map(s => (
          <div key={s.id} onClick={() => set('strategy', s.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${selected === s.id ? 'var(--teal,#1D9E75)' : 'var(--ds-border,#e3e5e9)'}`, background: selected === s.id ? 'rgba(29,158,117,.05)' : '#fff', transition: 'all .15s' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.viable ? 'var(--teal)' : '#F59E0B', display: 'inline-block', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{s.est}</div>
            </div>
            {selected === s.id && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="var(--teal)"/>
                <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 10, opacity: .7 }}>
        ● Teal = likely viable at this price point · ● Amber = marginal or insufficient data
      </div>
      <SCNavRow onBack={onBack} onNext={onNext}
        nextLabel={selected ? `Continue with ${strategies.find(s => s.id === selected)?.label} →` : 'Select a strategy to continue'}
        nextDisabled={!selected} />
    </>
  )
}

function SCStep5({ data, set, onFinish, onBack }: { data: Record<string,any>; set: (k: string, v: any) => void; onFinish: () => void; onBack: () => void }) {
  const strategy = data.strategy as string
  const beds = parseInt(data.bedrooms as string) || 4
  return (
    <>
      <SCStepHeader
        title="Income & running costs"
        subtitle={
          strategy === 'btl'  ? 'Rental income and monthly costs for this BTL.' :
          strategy === 'hmo'  ? 'Room rents and HMO running costs.' :
          strategy === 'sa'   ? 'SA nightly rate, occupancy, and running costs.' :
                                'Flip costs and target sale price.'
        }
      />
      {strategy === 'btl' && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <IField label="Monthly rent (£)" value={data.monthlyRent ?? ''} onChange={v => set('monthlyRent', v)} required
            info="Expected gross monthly rent. Check Rightmove/Zoopla for comparables in the same postcode." />
          <IField label="Initial void period (weeks)" value={data.initialVoidWeeks ?? '4'} onChange={v => set('initialVoidWeeks', v)}
            info="Time between completion and first tenant moving in. Typically 4–8 weeks. Costs you mortgage payments with no rental income." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
          <IField label="Management fee (%)" value={data.mgmtFee ?? ''} onChange={v => set('mgmtFee', v)}
            info="Letting agent fee as a percentage of gross rent. Typically 10–15% fully managed. Set to 0% if self-managing." />
          <IField label="Void allowance (%)" value={data.voidPct ?? ''} onChange={v => set('voidPct', v)}
            info="Provision for vacant periods. DealScore defaults to 8.3% (4 weeks/yr) if blank." />
          <IField label="Maintenance (£/mo)" value={data.maintenance ?? ''} onChange={v => set('maintenance', v)}
            info="Monthly provision for repairs. DealScore defaults to 5% of gross rent if blank." />
        </div>
      </>}
      {strategy === 'hmo' && <>
        {/* HMO uses rooms count + single average rent per room — NOT individual room fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <IField label="Number of rooms" value={data.hmoRooms ?? String(beds)} onChange={v => set('hmoRooms', v)} required
            info="Total lettable rooms. DealScore multiplies this by rent per room to calculate gross HMO income." />
          <IField label="Rent per room (£/mo)" value={data.hmoRentPerRoom ?? ''} onChange={v => set('hmoRentPerRoom', v)} required
            info="Average monthly rent per room. Check SpareRoom for comparable room rates in your area." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
          <IField label="Management fee (%)" value={data.mgmtFee ?? ''} onChange={v => set('mgmtFee', v)}
            info="Letting agent fee as a percentage of gross rent. Typically 10–15% fully managed." />
          <IField label="Void allowance (%)" value={data.voidPct ?? ''} onChange={v => set('voidPct', v)}
            info="Provision for vacant periods — per room for HMOs. Allow 10–15% for a multi-room property." />
          <IField label="Maintenance (£/mo)" value={data.maintenance ?? ''} onChange={v => set('maintenance', v)}
            info="Monthly provision for repairs and upkeep across the whole HMO." />
        </div>
      </>}
      {strategy === 'sa' && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <IField label="Avg nightly rate (£)" value={data.nightlyRate ?? ''} onChange={v => set('nightlyRate', v)} required
            info="Blended average nightly rate across the year. Check AirDNA for your postcode." />
          <IField label="Target occupancy (%)" value={data.occupancy ?? ''} onChange={v => set('occupancy', v)} required
            info="Percentage of nights occupied. Typical SA: 60–75%. Model at 60% as your downside scenario." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
          <IField label="Platform fee (%)" value={data.platformFee ?? ''} onChange={v => set('platformFee', v)}
            info="Airbnb ~3%, Booking.com ~15%. Deducted from gross nightly revenue." />
          <IField label="Cleaning per stay (£)" value={data.cleaningCost ?? ''} onChange={v => set('cleaningCost', v)}
            info="Turnover cleaning cost per stay. Typically £50–£80 for a 1-bed." />
        </div>
      </>}
      {strategy === 'flip' && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <IField label="Target sale price (£)" value={data.targetSalePrice ?? ''} onChange={v => set('targetSalePrice', v)} required
            info="Expected sale price after refurbishment. Used to calculate gross profit and return on capital." />
          <IField label="Sale timeline (months)" value={data.saleTimeline ?? ''} onChange={v => set('saleTimeline', v)}
            info="Expected time from completion to sale. Longer timelines increase holding costs." />
        </div>
        <div style={{ marginTop: 14 }}>
          <IField label="Estate agent fee (%)" value={data.agentFee ?? ''} onChange={v => set('agentFee', v)}
            info="Selling agent commission, typically 1–2.5%. Deducted from sale proceeds." />
        </div>
      </>}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--ds-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Values must match exact strings used by the form */}
          <ISelect label="Ownership structure" value={data.ownershipStructure ?? 'Personal name'}
            onChange={v => set('ownershipStructure', v)}
            options={['Personal name','Ltd company','Joint (personal)','Joint (Ltd)']}
            info="Personal name: simpler but Section 24 reduces interest deductibility for higher-rate taxpayers. Ltd Co: avoids Section 24 but has set-up costs and corporation tax." />
          <ISelect label="Income tax band" value={data.incomeTaxBand ?? '20%'}
            onChange={v => set('incomeTaxBand', v)}
            options={['20%','40%','45%']}
            info="Your marginal income tax rate. Under Section 24, personal landlords only receive a 20% tax credit on mortgage interest — higher-rate taxpayers are taxed on income they may not have received." />
        </div>
      </div>
      <SCNavRow onBack={onBack} onNext={onFinish} nextLabel="Generate DealScore →" />
    </>
  )
}

function SCWizard({ scData, setScData, onFinish, onClose }: {
  scData: Record<string,any>
  // Avoid React.Dispatch — file has no default React import. Use explicit callback type:
  setScData: (fn: (prev: Record<string,any>) => Record<string,any>) => void
  onFinish: (data: Record<string,any>) => void
  onClose: () => void
}) {
  const [step, setStep] = useState(1)
  const set = (k: string, v: any) => setScData(prev => ({ ...prev, [k]: v }))
  const totalSteps = 5
  const progress = (step / totalSteps) * 100

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-body,#f0f2f5)', zIndex: 500, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: '#fff', borderBottom: '1px solid var(--ds-border,#e3e5e9)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy,#1B3A6B)' }}>Smart Capture</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#5B21B6', color: '#fff', letterSpacing: '.04em' }}>PRO+</span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-2,#6c757d)' }}>Step {step} of {totalSteps}</span>
        <button onClick={onClose}
          style={{ fontSize: 12, color: 'var(--text-2,#6c757d)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          Switch to manual ✕
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--ds-border,#e3e5e9)', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--teal,#1D9E75)', transition: 'width 0.3s ease' }} />
      </div>

      {/* Step card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 620, background: '#fff', border: '1px solid var(--ds-border,#e3e5e9)', borderRadius: 14, padding: '32px 36px' }}>
          {step === 1 && <SCStep1 data={scData} set={set} onNext={() => setStep(2)} />}
          {step === 2 && <SCStep2 data={scData} set={set} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <SCStep3 data={scData} set={set} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <SCStep4 data={scData} set={set} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
          {step === 5 && <SCStep5 data={scData} set={set} onFinish={() => onFinish(scData)} onBack={() => setStep(4)} />}
        </div>
      </div>
    </div>
  )
}
```

---

## Summary checklist
- [ ] `isProPlus` constant added after `isPro` (~line 2102)
- [ ] `scMode` / `setScMode` state removed entirely — no remaining references anywhere in file
- [ ] `showSmartCapture`, `showImportModal`, `scData` states added to ViewInputs
- [ ] Manual/Smart Capture toggle replaced with Import listing button + Smart Capture button (three-tier gating: Pro+ / Pro locked / Free locked)
- [ ] Smart Capture button pre-fills `scData` from current `form` state before opening
- [ ] Strategy picker (`Step2StrategyPicker`) always renders — not conditional on scMode
- [ ] Import listing modal: centred overlay, URL input, dismisses on backdrop click
- [ ] All SC* functions defined in AnalysisHub.tsx BEFORE ViewInputs — NOT in a separate file
- [ ] No `React.X` type references anywhere in SC functions — file has no default React import
- [ ] `SCWizard` prop `setScData` typed as `(fn: (prev: Record<string,any>) => Record<string,any>) => void`
- [ ] `SCWizard` rendered inside ViewInputs return when `showSmartCapture === true`
- [ ] `onFinish` maps all wizard keys to correct `setField` paths:
  - [ ] `managementFeePercent`, `voidAllowancePercent`, `maintenanceReserve` (top-level)
  - [ ] `btlInputs.monthlyRent`, `btlInputs.initialVoidWeeks`
  - [ ] `hmoInputs.rooms`, `hmoInputs.rentPerRoom` (NOT individual room fields)
  - [ ] `saInputs.nightlyRate`, `saInputs.occupancyPercent`, `saInputs.platformFeesPercent`, `saInputs.cleaningCostPerStay`
  - [ ] `flipInputs.expectedSalePrice`, `flipInputs.projectLengthMonths`, `flipInputs.sellingCostsPercent`
- [ ] `mortgageType` written as `'IO'` or `'Repayment'` (not `'Interest only'`)
- [ ] `ownershipStructure` ISelect options match form exactly: `'Personal name'`, `'Ltd company'`, etc.
- [ ] `selectStrategy(data.strategy)` called on finish to update the strategy tile
- [ ] `onViewChange?.('results')` called on finish to navigate to Results tab
- [ ] "Switch to manual ✕" closes wizard without data loss (`scData` persists in ViewInputs state)
- [ ] Step 4 preliminary yields clearly marked as approximate in subtitle and legend
- [ ] BTL Step 5 includes initial void period field
- [ ] HMO Step 5 uses rooms + rentPerRoom (not individual room fields)
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
