# REPLIT PROMPT 2 — Inputs Visual Redesign (Step 1 / Step 2 / Strategy Tiles)
> Run AFTER Prompt 1 is complete and tsc passes. This redesigns the ViewInputs JSX to match the confirmed mockup.

---

## Files to read in full before touching anything

```
artifacts/dealscore/src/components/AnalysisHub.tsx
```

Read it in full. Do not touch anything until you have read it.

---

## Context

Prompt 1 added controlled state and autosave to ViewInputs. This prompt redesigns the JSX inside ViewInputs `return()` to match the confirmed mockup design. The mockup has:

- **Step 1:** Buy / Rent / Specialist 3-card picker (controls which strategy tiles appear in Step 2)
- **Step 2:** Strategy tiles (Buy mode: BTL / HMO / SA / Social / BRRR / FLIP; Rent mode: R2R)
- **Seller section** between Property information and Step 1 — quick-capture form for seller/landlord details
- **Strategy-specific input sections** below, showing only for the active strategy
- A **Locked banner** when not editing + an **Edit button** to enter editing mode

**Standing rule:** Only modify JSX inside `return()` of ViewInputs. Do NOT touch:
- The `form` state, `setField`, `scheduleAutosave` added in Prompt 1
- The `onSave`, `dealId` props
- Anything above `return()` in ViewInputs
- Any other function (ViewResults, ViewSensitivity, ViewWorkings, IField, etc.)
- Anything in AnalysisHub's main return()

---

## STEP 1 — Add mode and activeTile state to ViewInputs (ABOVE return)

Add these three state variables inside the ViewInputs function, immediately after the existing `saveStatus` and `saveTimer` declarations from Prompt 1:

```ts
// Derive initial mode from strategy
const initialMode: 'buy' | 'rent' | 'specialist' =
  p.strategy === 'R2R' ? 'rent' : 'buy'
const [mode, setMode] = useState<'buy' | 'rent' | 'specialist'>(initialMode)
const [activeTile, setActiveTile] = useState<string>(p.strategy.toLowerCase())
```

Add a `selectStrategy` handler:

```ts
async function selectStrategy(stratKey: string) {
  setActiveTile(stratKey)
  // Persist the strategy change immediately (not debounced — it's a deliberate selection)
  const stratMap: Record<string, string> = {
    btl: 'BTL', hmo: 'HMO', sa: 'SA', brrr: 'BRRR', flip: 'FLIP', r2r: 'R2R', social: 'SOCIAL',
  }
  const supaStrategy = stratMap[stratKey]
  if (supaStrategy) {
    const updated = await updateDealInputs(dealId, { ...form, strategy: supaStrategy }, {
      strategy: supaStrategy,
      address: String(form.address ?? ''),
      purchase_price: Number((form.sharedInputs as Record<string,unknown>)?.purchasePrice) || null,
      market_value: Number(form.marketValue) || null,
    })
    if (updated) { setSaveStatus('saved'); onSave?.(updated) }
  }
}
```

---

## STEP 2 — Redesign the JSX inside ViewInputs `return()`

Replace the entire JSX inside the `<InputsCtx.Provider>` wrapper with the following structure. Keep the `<InputsCtx.Provider value={{ isEditing, isNewDeal }}>` wrapper — just replace what's inside it.

### Structure overview (implement each section):

```
<InputsCtx.Provider>
  <div> {/* outer container — 1fr 280px grid, matching existing layout */}
    <div> {/* main column */}

      {/* 1. LOCKED BANNER — shown when not editing */}
      {!isEditing && (
        <div style={lockedBannerStyle}>
          <i className="ti ti-lock" />
          <div>Viewing deal — all inputs are read-only. Click Edit to make changes.</div>
          <button style={editBtnStyle} onClick={() => navigate(`?tab=analysis&view=inputs&editing=true`)}>
            <i className="ti ti-pencil" /> Edit
          </button>
        </div>
      )}

      {/* 2. PROPERTY INFORMATION */}
      <Sec title="Property information">
        <IGrid> {/* Keep existing IGrid — 3-col */}
          <IField label="Address" value={String(form.address ?? '')} onChange={v => setField('address', v)} required />
          <IField label="Property type" value={String(form.propertyType ?? '')} onChange={v => setField('propertyType', v)} />
          <IField label="Bedrooms" value={String(form.bedrooms ?? '')} onChange={v => setField('bedrooms', v)} />
          <IField label="Bathrooms" value={String(form.bathrooms ?? '')} onChange={v => setField('bathrooms', v)} />
          <IField label="Tenure" value={String(form.tenure ?? 'Freehold')} onChange={v => setField('tenure', v)} />
          <IField label="EPC rating" value={String(form.epcRating ?? '')} onChange={v => setField('epcRating', v)} />
        </IGrid>
      </Sec>

      {/* 3. SELLER / LANDLORD — quick-capture, between property info and Step 1 */}
      <SellerCard
        form={form}
        setField={setField}
        isEditing={isEditing}
        isR2R={activeTile === 'r2r'}
      />

      {/* 4. STEP 1 — Buy / Rent / Specialist */}
      <Step1ModePicker mode={mode} onSelect={setMode} />

      {/* 5. STEP 2 — Strategy tiles (filtered by mode) */}
      <Step2StrategyPicker mode={mode} activeTile={activeTile} onSelect={selectStrategy} isEditing={isEditing} />

      {/* 6. STRATEGY-SPECIFIC INPUT SECTIONS */}
      {/* Property & purchase — shown for Buy strategies (not R2R) */}
      {mode === 'buy' && (
        <Sec title="Property &amp; purchase">
          <IGrid>
            <IField label="Purchase price" value={Number((form.sharedInputs as Record<string,unknown>)?.purchasePrice) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).purchasePrice)) : ''} onChange={v => setField('sharedInputs.purchasePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Market value / GDV" value={Number(form.marketValue) > 0 ? fc(Number(form.marketValue)) : ''} onChange={v => setField('marketValue', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Country" value={COUNTRY_LABEL[p.taxCountry] ?? p.taxCountry} />
            <IField label={`${taxLabel} (auto-calculated)`} value={taxValue > 0 ? fc(taxValue) : '—'} />
            <IField label="Refurb cost" value={Number((form.sharedInputs as Record<string,unknown>)?.refurbCost) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).refurbCost)) : ''} onChange={v => setField('sharedInputs.refurbCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Other costs (legal, broker)" value={Number((form.sharedInputs as Record<string,unknown>)?.otherCosts) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).otherCosts)) : ''} onChange={v => setField('sharedInputs.otherCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
          </IGrid>
        </Sec>
      )}

      {/* Purchase financing — Buy only, not FLIP */}
      {mode === 'buy' && activeTile !== 'flip' && (
        <Sec title="Purchase financing">
          <IGrid>
            <IField label="Deposit %" value={fp(Number((form.sharedInputs as Record<string,unknown>)?.depositPercent ?? 25))} onChange={v => setField('sharedInputs.depositPercent', parseFloat(v) || 25)} />
            <IField label="Mortgage rate" value={Number((form.sharedInputs as Record<string,unknown>)?.mortgageRate) > 0 ? fp(Number((form.sharedInputs as Record<string,unknown>).mortgageRate)) : ''} onChange={v => setField('sharedInputs.mortgageRate', parseFloat(v) || 0)} />
            <IField label="Term (years)" value={String((form.sharedInputs as Record<string,unknown>)?.mortgageTerm ?? 25)} onChange={v => setField('sharedInputs.mortgageTerm', parseInt(v) || 25)} />
            <IField label="Type" value={String((form.sharedInputs as Record<string,unknown>)?.mortgageType ?? 'IO') === 'IO' ? 'Interest only' : 'Repayment'} />
          </IGrid>
        </Sec>
      )}

      {/* Monthly costs — Buy strategies only (not FLIP) */}
      {mode === 'buy' && activeTile !== 'flip' && (
        <Sec title="Monthly costs">
          <IGrid>
            <IField label="Management fee %" value={fp(Number(form.managementFeePercent ?? 10))} onChange={v => setField('managementFeePercent', parseFloat(v) || 10)} />
            <IField label="Buildings insurance / mo" value={fc(Number(form.buildingsInsurance ?? 30))} onChange={v => setField('buildingsInsurance', parseFloat(v.replace(/[£,]/g, '')) || 30)} />
            <IField label="Maintenance reserve / mo" value={fc(Number(form.maintenanceReserve ?? 75))} onChange={v => setField('maintenanceReserve', parseFloat(v.replace(/[£,]/g, '')) || 75)} />
            <IField label="Void allowance %" value={fp(Number(form.voidAllowancePercent ?? 5))} onChange={v => setField('voidAllowancePercent', parseFloat(v) || 5)} />
          </IGrid>
        </Sec>
      )}

      {/* BTL */}
      {activeTile === 'btl' && (
        <Sec title="BTL — income">
          <IGrid>
            <IField label="Monthly rent" value={Number((form.btlInputs as Record<string,unknown>)?.monthlyRent) > 0 ? fc(Number((form.btlInputs as Record<string,unknown>).monthlyRent)) : ''} onChange={v => setField('btlInputs.monthlyRent', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
          </IGrid>
        </Sec>
      )}

      {/* HMO */}
      {activeTile === 'hmo' && (
        <Sec title="HMO — room breakdown">
          <IGrid>
            <IField label="Rooms" value={String((form.hmoInputs as Record<string,unknown>)?.rooms || '')} onChange={v => setField('hmoInputs.rooms', parseInt(v) || 0)} required />
            <IField label="Rent per room / mo" value={Number((form.hmoInputs as Record<string,unknown>)?.rentPerRoom) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).rentPerRoom)) : ''} onChange={v => setField('hmoInputs.rentPerRoom', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Occupancy rate" value={fp(Number((form.hmoInputs as Record<string,unknown>)?.occupancyRate ?? 90))} onChange={v => setField('hmoInputs.occupancyRate', parseFloat(v) || 90)} />
            <IField label="HMO licence cost" value={Number((form.hmoInputs as Record<string,unknown>)?.licenceCost) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).licenceCost)) : ''} onChange={v => setField('hmoInputs.licenceCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Bills & utilities / mo" value={Number((form.hmoInputs as Record<string,unknown>)?.billsUtilities) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).billsUtilities)) : ''} onChange={v => setField('hmoInputs.billsUtilities', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
          </IGrid>
        </Sec>
      )}

      {/* SA */}
      {activeTile === 'sa' && (
        <Sec title="SA — nightly rate &amp; occupancy">
          <IGrid>
            <IField label="Avg nightly rate" value={Number((form.saInputs as Record<string,unknown>)?.nightlyRate) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).nightlyRate)) : ''} onChange={v => setField('saInputs.nightlyRate', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Target occupancy" value={fp(Number((form.saInputs as Record<string,unknown>)?.occupancyPercent ?? 75))} onChange={v => setField('saInputs.occupancyPercent', parseFloat(v) || 75)} required />
            <IField label="Platform fee %" value={fp(Number((form.saInputs as Record<string,unknown>)?.platformFeesPercent ?? 0))} onChange={v => setField('saInputs.platformFeesPercent', parseFloat(v) || 0)} />
            <IField label="Cleaning cost / stay" value={Number((form.saInputs as Record<string,unknown>)?.cleaningCostPerStay) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).cleaningCostPerStay)) : ''} onChange={v => setField('saInputs.cleaningCostPerStay', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Bills & utilities / mo" value={Number((form.saInputs as Record<string,unknown>)?.billsUtilities) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).billsUtilities)) : ''} onChange={v => setField('saInputs.billsUtilities', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
          </IGrid>
        </Sec>
      )}

      {/* FLIP */}
      {activeTile === 'flip' && (
        <Sec title="FLIP — project details">
          <IGrid>
            <IField label="Purchase price" value={Number((form.sharedInputs as Record<string,unknown>)?.purchasePrice) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).purchasePrice)) : ''} onChange={v => setField('sharedInputs.purchasePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Expected sale price" value={Number((form.flipInputs as Record<string,unknown>)?.expectedSalePrice) > 0 ? fc(Number((form.flipInputs as Record<string,unknown>).expectedSalePrice)) : ''} onChange={v => setField('flipInputs.expectedSalePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Refurb cost" value={Number((form.sharedInputs as Record<string,unknown>)?.refurbCost) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).refurbCost)) : ''} onChange={v => setField('sharedInputs.refurbCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Contingency %" value={fp(Number((form.flipInputs as Record<string,unknown>)?.contingencyPercent ?? 10))} onChange={v => setField('flipInputs.contingencyPercent', parseFloat(v) || 10)} />
            <IField label="Project length (months)" value={String((form.flipInputs as Record<string,unknown>)?.projectLengthMonths || '')} onChange={v => setField('flipInputs.projectLengthMonths', parseInt(v) || 0)} required />
            <IField label="Holding costs / mo" value={Number((form.flipInputs as Record<string,unknown>)?.holdingCostsPerMonth) > 0 ? fc(Number((form.flipInputs as Record<string,unknown>).holdingCostsPerMonth)) : ''} onChange={v => setField('flipInputs.holdingCostsPerMonth', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Selling costs %" value={fp(Number((form.flipInputs as Record<string,unknown>)?.sellingCostsPercent ?? 2))} onChange={v => setField('flipInputs.sellingCostsPercent', parseFloat(v) || 2)} />
          </IGrid>
        </Sec>
      )}

      {/* BRRR */}
      {activeTile === 'brrr' && (
        <Sec title="BRRR — refurb &amp; refinance">
          <IGrid>
            <IField label="Post-refurb value (GDV)" value={Number((form.brrrInputs as Record<string,unknown>)?.postRefurbValue) > 0 ? fc(Number((form.brrrInputs as Record<string,unknown>).postRefurbValue)) : ''} onChange={v => setField('brrrInputs.postRefurbValue', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Target refinance LTV" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.refinancePercent ?? 75))} onChange={v => setField('brrrInputs.refinancePercent', parseFloat(v) || 75)} />
            <IField label="Refinance rate" value={Number((form.brrrInputs as Record<string,unknown>)?.newMortgageRate) > 0 ? fp(Number((form.brrrInputs as Record<string,unknown>).newMortgageRate)) : ''} onChange={v => setField('brrrInputs.newMortgageRate', parseFloat(v) || 0)} />
            <IField label="Rent post-refurb" value={Number((form.brrrInputs as Record<string,unknown>)?.monthlyRent) > 0 ? fc(Number((form.brrrInputs as Record<string,unknown>).monthlyRent)) : ''} onChange={v => setField('brrrInputs.monthlyRent', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
          </IGrid>
        </Sec>
      )}

      {/* R2R */}
      {activeTile === 'r2r' && (
        <Sec title="R2R — lease details">
          <IGrid>
            <IField label="Monthly rent paid to landlord" value={Number((form.r2rInputs as Record<string,unknown>)?.monthlyRentPaid) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).monthlyRentPaid)) : ''} onChange={v => setField('r2rInputs.monthlyRentPaid', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Rooms" value={String((form.r2rInputs as Record<string,unknown>)?.rooms || '')} onChange={v => setField('r2rInputs.rooms', parseInt(v) || 0)} required />
            <IField label="Rent per room / mo" value={Number((form.r2rInputs as Record<string,unknown>)?.rentPerRoom) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).rentPerRoom)) : ''} onChange={v => setField('r2rInputs.rentPerRoom', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Occupancy rate" value={fp(Number((form.r2rInputs as Record<string,unknown>)?.occupancyRate ?? 90))} onChange={v => setField('r2rInputs.occupancyRate', parseFloat(v) || 90)} />
            <IField label="Management fee %" value={fp(Number((form.r2rInputs as Record<string,unknown>)?.managementFeesPercent ?? 0))} onChange={v => setField('r2rInputs.managementFeesPercent', parseFloat(v) || 0)} />
            <IField label="Monthly running costs" value={Number((form.r2rInputs as Record<string,unknown>)?.monthlyRunningCosts) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).monthlyRunningCosts)) : ''} onChange={v => setField('r2rInputs.monthlyRunningCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Setup costs" value={Number((form.r2rInputs as Record<string,unknown>)?.setupCosts) > 0 ? fc(Number((form.r2rInputs as Record<string,unknown>).setupCosts)) : ''} onChange={v => setField('r2rInputs.setupCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
            <IField label="Landlord deposit (months)" value={String(form.r2rLandlordDepositMonths ?? '0')} onChange={v => setField('r2rLandlordDepositMonths', parseInt(v) || 0)} />
          </IGrid>
        </Sec>
      )}

      {/* SOCIAL */}
      {activeTile === 'social' && (
        <Sec title="Social Housing — guaranteed lease">
          <IGrid>
            <IField label="Monthly lease income" value={Number((form.socialInputs as Record<string,unknown>)?.leaseIncomePerMonth) > 0 ? fc(Number((form.socialInputs as Record<string,unknown>).leaseIncomePerMonth)) : ''} onChange={v => setField('socialInputs.leaseIncomePerMonth', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
            <IField label="Lease term (years)" value={String((form.socialInputs as Record<string,unknown>)?.leaseLengthYears || 5)} onChange={v => setField('socialInputs.leaseLengthYears', parseInt(v) || 5)} />
          </IGrid>
        </Sec>
      )}

    </div>

    {/* SIDEBAR — keep existing Quick summary card + save status */}
    {/* ... existing sidebar code, unchanged ... */}
  </div>
</InputsCtx.Provider>
```

---

## STEP 3 — Implement the sub-components used above

Add these as standalone functions **inside AnalysisHub.tsx, before ViewInputs**. Keep them simple:

### `SellerCard`

This replaces the old `VendorSituationCard`. Do NOT implement `VendorSituationCard` — delete it if it exists anywhere in the file.

**What it does:**
- Captures seller/landlord details at the inputs stage — name, phone, motivation level, situation notes
- Label adapts: shows "Seller" for all strategies except R2R, which shows "Landlord"
- Motivation uses a 3-level quick-select (aligns with the Sellers CRM data model) plus an "Other" option with inline text capture
- All values are written to `deals.inputs` via `setField` — they autosave through the existing debounce from Prompt 1
- `sellerName` is the key field — it is read by DealChrome's info strip via `deal.inputs?.sellerName ?? deal.inputs?.vendorName`
- `sellerId` is written as `null` — placeholder for a future Supabase sellers table FK (do not create any Supabase table in this prompt)
- PII fields (name, phone) should receive the same privacy-masking treatment used elsewhere in the codebase (look for how other PII is masked — usually a CSS class or a context value — and apply it here)

**Motivation quick-select values and their CRM mapping:**

| Button label | Value stored in `sellerMotivation` | CRM `motivation` field |
|---|---|---|
| Motivated | `'hot'` | `'hot'` |
| Flexible | `'warm'` | `'warm'` |
| Firm | `'cool'` | `'cool'` |
| Other | `'other'` | — (see `sellerMotivationOther`) |

When "Other" is selected, a small text input appears inline below the tag row for the user to describe the situation. This value is stored in `sellerMotivationOther`.

**Fields written to `deals.inputs`:**

| Field key | Type | Notes |
|---|---|---|
| `sellerName` | `string` | Full name — first + last. DealChrome info strip reads this. |
| `sellerPhone` | `string` | Phone number |
| `sellerMotivation` | `'hot' \| 'warm' \| 'cool' \| 'other'` | Motivation level |
| `sellerMotivationOther` | `string` | Only populated when motivation = 'other' |
| `sellerNotes` | `string` | Free-text situation context |
| `sellerId` | `null` | Placeholder — no Supabase sellers table yet |

**Implementation:**

```tsx
const MOTIVATION_OPTS = [
  { key: 'hot'   as const, label: 'Motivated', color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  { key: 'warm'  as const, label: 'Flexible',  color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  { key: 'cool'  as const, label: 'Firm',      color: '#1e3a5f', bg: '#dbeafe', border: '#93c5fd' },
  { key: 'other' as const, label: 'Other',     color: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
] as const

type MotivationKey = typeof MOTIVATION_OPTS[number]['key']

function SellerCard({
  form,
  setField,
  isEditing,
  isR2R,
}: {
  form: Record<string, unknown>
  setField: (path: string, v: unknown) => void
  isEditing: boolean
  isR2R: boolean
}) {
  const label = isR2R ? 'Landlord' : 'Seller'
  const sellerMotivation = form.sellerMotivation as MotivationKey | undefined
  const hasData = !!(form.sellerName || form.sellerPhone)

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      border: '.5px solid var(--ds-border)',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      padding: '18px 20px',
      marginBottom: '10px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '7px',
          background: 'var(--bg-sec)', border: '.5px solid var(--ds-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', color: 'var(--navy)',
        }}>
          <i className="ti ti-user-circle" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{label}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
            {hasData
              ? `${String(form.sellerName ?? '')}${form.sellerPhone ? ` · ${String(form.sellerPhone)}` : ''}`
              : `Add ${label.toLowerCase()} contact details`}
          </div>
        </div>
        <span style={{
          fontSize: '10px', color: '#bbb',
          background: 'var(--bg-sec)', border: '.5px solid var(--ds-border)',
          padding: '2px 8px', borderRadius: '20px',
        }}>Optional</span>
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {/* Full name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb' }}>
            Full name
          </label>
          <input
            readOnly={!isEditing}
            value={String(form.sellerName ?? '')}
            onChange={isEditing ? e => {
              setField('sellerName', e.target.value)
              setField('sellerId', null) // placeholder FK — no Supabase sellers table yet
            } : undefined}
            placeholder={`${label} full name`}
            style={{
              padding: '7px 10px', borderRadius: '7px',
              border: '.5px solid var(--ds-border)', fontSize: '12px',
              background: isEditing ? '#fff' : 'var(--bg-sec)',
              color: 'var(--text-1)', outline: 'none',
              fontFamily: 'inherit',
              /* Apply the same privacy-masking class/style used elsewhere in the codebase for PII */
            }}
          />
        </div>

        {/* Phone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb' }}>
            Phone
          </label>
          <input
            readOnly={!isEditing}
            value={String(form.sellerPhone ?? '')}
            onChange={isEditing ? e => setField('sellerPhone', e.target.value) : undefined}
            placeholder="e.g. 07700 900 123"
            style={{
              padding: '7px 10px', borderRadius: '7px',
              border: '.5px solid var(--ds-border)', fontSize: '12px',
              background: isEditing ? '#fff' : 'var(--bg-sec)',
              color: 'var(--text-1)', outline: 'none',
              fontFamily: 'inherit',
              /* Apply the same privacy-masking class/style used elsewhere in the codebase for PII */
            }}
          />
        </div>
      </div>

      {/* Motivation quick-select */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb', marginBottom: '6px' }}>
          Motivation
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {MOTIVATION_OPTS.map(opt => {
            const active = sellerMotivation === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => isEditing && setField('sellerMotivation', opt.key)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                  border: `1.5px solid ${active ? opt.border : 'var(--ds-border)'}`,
                  background: active ? opt.bg : '#fff',
                  color: active ? opt.color : 'var(--text-2)',
                  cursor: isEditing ? 'pointer' : 'default',
                  fontFamily: 'inherit', transition: 'all .15s',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* "Other" inline text capture — appears only when Other is selected */}
        {sellerMotivation === 'other' && (
          <input
            readOnly={!isEditing}
            value={String(form.sellerMotivationOther ?? '')}
            onChange={isEditing ? e => setField('sellerMotivationOther', e.target.value) : undefined}
            placeholder="Describe the situation…"
            style={{
              marginTop: '8px', padding: '7px 10px', borderRadius: '7px',
              border: '.5px solid var(--ds-border)', fontSize: '12px', width: '100%',
              background: isEditing ? '#fff' : 'var(--bg-sec)',
              color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit',
            }}
          />
        )}
      </div>

      {/* Situation notes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: '#bbb' }}>
          Situation notes
        </label>
        <textarea
          readOnly={!isEditing}
          value={String(form.sellerNotes ?? '')}
          onChange={isEditing ? e => setField('sellerNotes', e.target.value) : undefined}
          placeholder="e.g. relocating to Scotland, needs to complete before end of month. Open to negotiation."
          style={{
            padding: '8px 10px', borderRadius: '7px',
            border: '.5px solid var(--ds-border)', fontSize: '12px',
            background: isEditing ? '#fff' : 'var(--bg-sec)',
            color: 'var(--text-1)', outline: 'none',
            width: '100%', fontFamily: 'inherit', resize: 'none', height: '60px', lineHeight: 1.5,
          }}
        />
      </div>

      {/* Future note (comment only — do not render) */}
      {/* TODO: When a Supabase 'sellers' table is created, add a "Link existing seller" search above the
               quick-capture fields. The sellerId FK should then point to sellers.id.
               The SellersCrmPage will auto-sync sellers that have a dealRef set. */}
    </div>
  )
}
```

---

### `Step1ModePicker`

```tsx
function Step1ModePicker({ mode, onSelect }: { mode: string; onSelect: (m: 'buy' | 'rent' | 'specialist') => void }) {
  const cards = [
    { key: 'buy' as const, icon: 'ti-home', title: 'Buy', desc: 'Purchase and hold, flip, or refinance.', examples: 'BTL · HMO · SA · BRRR · FLIP · Social' },
    { key: 'rent' as const, icon: 'ti-key', title: 'Rent', desc: 'Rent from landlord and sublet — no purchase.', examples: 'R2R' },
    { key: 'specialist' as const, icon: 'ti-arrows-exchange', title: 'Specialist / Other', desc: 'Control without purchase, or fee-based structures.', examples: 'Lease Option · Assisted Sale' },
  ]
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: `.5px solid var(--ds-border)`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '18px 20px', marginBottom: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: '#aaa', marginBottom: '3px' }}>Step 1 of 2</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '12px' }}>How are you planning to control this property?</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {cards.map(c => (
          <div key={c.key} onClick={() => onSelect(c.key)}
            style={{ border: `${mode === c.key ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`, borderRadius: '12px', padding: '14px', cursor: 'pointer', background: mode === c.key ? 'var(--navy-light)' : '#fff', transition: 'all .18s' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '7px', background: mode === c.key ? 'var(--navy)' : 'var(--bg-sec)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', color: mode === c.key ? '#fff' : 'var(--text-2)', marginBottom: '9px', border: mode === c.key ? 'none' : '.5px solid var(--ds-border)' }}>
              <i className={`ti ${c.icon}`} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px' }}>{c.title}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.45, marginBottom: '5px' }}>{c.desc}</div>
            <div style={{ fontSize: '10px', color: '#aaa' }}>{c.examples}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### `Step2StrategyPicker`

```tsx
const BUY_TILES = [
  { key: 'btl', name: 'BTL', full: 'Buy to Let — single household', live: true },
  { key: 'hmo', name: 'HMO', full: 'House in Multiple Occupation', live: true },
  { key: 'sa',  name: 'SA',  full: 'Serviced Accommodation — short-let', live: true },
  { key: 'social', name: 'Social Housing', full: 'Lease to council / housing provider', live: true },
  { key: 'brrr', name: 'BRRR', full: 'Buy, Refurb, Refinance, Rent', live: true },
  { key: 'flip', name: 'FLIP', full: 'Buy, Refurb, Sell — trade for profit', live: true },
]
const RENT_TILES = [
  { key: 'r2r', name: 'R2R', full: 'Rent to Rent — sublet rooms', live: true },
]

function Step2StrategyPicker({ mode, activeTile, onSelect, isEditing }: { mode: string; activeTile: string; onSelect: (k: string) => void; isEditing: boolean }) {
  const tiles = mode === 'rent' ? RENT_TILES : BUY_TILES
  const modeLabel = mode === 'rent' ? 'Rent strategies' : mode === 'specialist' ? 'Specialist strategies' : 'Buy strategies'
  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: `.5px solid var(--ds-border)`, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '18px 20px', marginBottom: '10px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: '#aaa', marginBottom: '3px' }}>Step 2 of 2 — {modeLabel}</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '12px' }}>Select your strategy</div>
      {mode === 'specialist' ? (
        <div style={{ fontSize: '12px', color: 'var(--text-2)', padding: '16px', background: 'var(--bg-sec)', borderRadius: '8px' }}>Lease Option and Assisted Sale coming soon.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {tiles.map(t => (
            <div key={t.key}
              onClick={() => isEditing && t.live && onSelect(t.key)}
              style={{ border: `${activeTile === t.key ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`, borderRadius: '8px', padding: '11px', cursor: isEditing && t.live ? 'pointer' : 'default', background: activeTile === t.key ? 'var(--navy-light)' : 'var(--bg-sec)', transition: 'all .18s', opacity: t.live ? 1 : 0.55 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>{t.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-2)', lineHeight: 1.4, marginBottom: '5px' }}>{t.full}</div>
              <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '20px', background: t.live ? 'var(--teal-light)' : '#fef3c7', color: t.live ? '#065f46' : '#92400e', display: 'inline-block' }}>
                {t.live ? '✓ Live' : 'Coming soon'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## After making all changes

1. Run `npx tsc --noEmit` — zero errors required
2. Commit: `git add -A && git commit -m "feat: ViewInputs visual redesign — Step 1/Step 2 mode+strategy picker + SellerCard" && git push origin stage-6`
3. Report every file changed and what changed in each

---

## Notes for future prompts (do NOT implement now)

- **Link existing seller**: not possible yet — `SellersCrmPage` is 100% local state with no Supabase table. A future "Prompt 5" will create a `sellers` Supabase table and wire up the link-existing flow. The `sellerId: null` placeholder written above is ready for that FK.
- **Sellers CRM sync**: the intended architecture is that `deal.inputs.sellerName/Phone/Motivation` eventually syncs into the `sellers` table. The `SellersCrmPage` already has `dealRef` and `dealAddress` fields on its `Seller` interface for this purpose.
- **Reminders**: `sellerName` now flows into DealChrome's info strip and will surface in "Today & Upcoming" panels once a reminders table is built. No action needed here.
