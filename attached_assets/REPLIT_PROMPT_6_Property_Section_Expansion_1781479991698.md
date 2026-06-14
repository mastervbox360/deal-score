# REPLIT PROMPT 6 — Property Information Expansion + Leasehold + Deal Context
> Run AFTER Prompt 5 is complete and tsc passes. Touches AnalysisHub.tsx only.

---

## Files to read in full before touching anything

```
artifacts/dealscore/src/components/AnalysisHub.tsx
```

Read it in full. Do not touch anything until you have read it.

---

## Context

This prompt expands the Property information section in ViewInputs and adds several new conditional sections. All new field values are stored in `deals.inputs` via the existing `setField` / `scheduleAutosave` mechanism from Prompt 1. No new Supabase tables or columns are needed — everything goes into the `inputs` JSONB.

**Standing rule:** Only modify JSX inside `return()` of ViewInputs and the sub-components defined before it. Do NOT touch the form state initializer, setField, scheduleAutosave, selectStrategy, or any other logic above return().

---

## STEP 1 — Expand the Property information section

The current Property information `<Sec>` has 6 fields in an `<IGrid>`. Replace the contents of this `<IGrid>` with the expanded set below. Keep using `<IGrid>` (3-col grid).

**Field key** = what gets stored in `deals.inputs` via `setField('key', value)`.

### Row 1 — Address + Property type + Bedrooms (unchanged)
```tsx
<IField label="Address" value={String(form.address ?? '')} onChange={v => setField('address', v)} required />
<IField label="Property type" value={String(form.propertyType ?? '')} onChange={v => setField('propertyType', v)} />
<IField label="Bedrooms" value={String(form.bedrooms ?? '')} onChange={v => setField('bedrooms', v)} />
```

### Row 2 — Bathrooms + Floor area + Year built
```tsx
<IField label="Bathrooms" value={String(form.bathrooms ?? '')} onChange={v => setField('bathrooms', v)} />
<IField label="Floor area (sqm)" value={String(form.floorAreaSqm ?? '')} onChange={v => setField('floorAreaSqm', parseFloat(v) || 0)} />
<IField label="Year built" value={String(form.yearBuilt ?? '')} onChange={v => setField('yearBuilt', parseInt(v) || 0)} />
```

### Row 3 — Tenure + EPC rating + Construction type
```tsx
<IField label="Tenure" value={String(form.tenure ?? 'Freehold')} onChange={v => setField('tenure', v)} />
<IField label="EPC rating" value={String(form.epcRating ?? '')} onChange={v => setField('epcRating', v)} />
<IField label="Construction type" value={String(form.constructionType ?? 'Standard (brick/block)')} onChange={v => setField('constructionType', v)} />
```

> **Note on constructionType:** add a small helper text below the field if value is not 'Standard': "⚠️ Non-standard construction — some lenders will not lend on this property type. Confirm mortgage eligibility early."

### Row 4 — Asking price + Buyer type + Source of deal
```tsx
<IField label="Asking price (£)" value={Number(form.askingPrice) > 0 ? fc(Number(form.askingPrice)) : ''} onChange={v => setField('askingPrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
<IField label="Buyer type" value={String(form.buyerType ?? 'Standard')} onChange={v => setField('buyerType', v)} />
<IField label="Source of deal" value={String(form.sourceOfDeal ?? '')} onChange={v => setField('sourceOfDeal', v)} />
```

> **Buyer type options** (use a select-style IField or add a note in placeholder): Standard | First-time buyer | Ltd company | Non-UK resident
> This drives the stamp duty calculation — confirm the existing stamp duty logic reads from `form.buyerType`.

### Row 5 — Flood risk + Gas supply + Council tax band
```tsx
<IField label="Flood risk" value={String(form.floodRisk ?? 'Low')} onChange={v => setField('floodRisk', v)} />
<IField label="Gas supply" value={String(form.hasGasSupply ?? 'Yes')} onChange={v => setField('hasGasSupply', v)} />
<IField label="Council tax band" value={String(form.councilTaxBand ?? '')} onChange={v => setField('councilTaxBand', v)} />
```

### Row 6 — Toggles: Currently tenanted / Uninhabitable / Listed building
```tsx
<IField label="Currently tenanted?" value={String(form.isCurrentlyTenanted ?? 'No')} onChange={v => setField('isCurrentlyTenanted', v)} />
<IField label="Uninhabitable?" value={String(form.isUninhabitable ?? 'No')} onChange={v => setField('isUninhabitable', v)} />
<IField label="Listed building" value={String(form.listedStatus ?? 'None')} onChange={v => setField('listedStatus', v)} />
```

### Row 7 — Conservation area / PD rights / Cash buyer
```tsx
<IField label="Conservation area?" value={String(form.isConservationArea ?? 'No')} onChange={v => setField('isConservationArea', v)} />
<IField label="PD rights available?" value={String(form.pdRightsAvailable ?? 'Unknown')} onChange={v => setField('pdRightsAvailable', v)} />
<IField label="Cash buyer?" value={String(form.isCashBuyer ?? 'No')} onChange={v => setField('isCashBuyer', v)} />
```

---

## STEP 2 — Add MEES / EPC compliance warning

Immediately after the Property information `</Sec>` closing tag, add this block:

```tsx
{/* MEES warning — shown when EPC is D or below */}
{['D','E','F','G'].includes(String(form.epcRating ?? '').toUpperCase()) && (
  <div style={{
    background: '#fef3c7', border: '.5px solid #fcd34d', borderRadius: '10px',
    padding: '12px 16px', marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start',
  }}>
    <i className="ti ti-alert-triangle" style={{ fontSize: '16px', color: '#92400e', flexShrink: 0, marginTop: '1px' }} />
    <div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>
        EPC {String(form.epcRating).toUpperCase()} — MEES compliance required
      </div>
      <div style={{ fontSize: '11px', color: '#78350f', lineHeight: 1.5, marginBottom: '10px' }}>
        From 2025, new tenancies in England require a minimum EPC C rating. This property may need improvement works before it can be legally let.
      </div>
      <IField
        label="Estimated EPC improvement cost (£)"
        value={Number(form.epcImprovementCost) > 0 ? fc(Number(form.epcImprovementCost)) : ''}
        onChange={v => setField('epcImprovementCost', parseFloat(v.replace(/[£,]/g, '')) || 0)}
      />
    </div>
  </div>
)}
```

---

## STEP 3 — Add Auction purchase section

Add this block immediately after the MEES warning block:

```tsx
{/* Auction purchase — conditional */}
<div style={{
  background: '#fff', borderRadius: '12px', border: '.5px solid var(--ds-border)',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: '14px 18px', marginBottom: '10px',
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <i className="ti ti-gavel" style={{ fontSize: '16px', color: 'var(--text-2)' }} />
    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>Auction purchase?</span>
    <button
      onClick={() => isEditing && setField('isAuctionPurchase', !(form.isAuctionPurchase))}
      style={{
        padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
        border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default',
        background: form.isAuctionPurchase ? 'var(--navy)' : 'var(--bg-sec)',
        color: form.isAuctionPurchase ? '#fff' : 'var(--text-2)',
      }}
    >{form.isAuctionPurchase ? 'Yes' : 'No'}</button>
  </div>
  {form.isAuctionPurchase && (
    <IGrid style={{ marginTop: '12px' }}>
      <IField label="Buyer's premium (%)" value={fp(Number(form.auctionBuyersPremiumPercent ?? 0))} onChange={v => setField('auctionBuyersPremiumPercent', parseFloat(v) || 0)} />
      <IField label="Reservation fee (£)" value={Number(form.auctionReservationFee) > 0 ? fc(Number(form.auctionReservationFee)) : ''} onChange={v => setField('auctionReservationFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    </IGrid>
  )}
</div>
```

---

## STEP 4 — Add Leasehold section (conditional on Tenure = Leasehold)

Add this block immediately after the Auction purchase block:

```tsx
{/* Leasehold details — shown only when Tenure = Leasehold */}
{String(form.tenure ?? '').toLowerCase() === 'leasehold' && (
  <Sec title="Leasehold details">
    <IGrid>
      <IField label="Remaining lease (years)" value={String(form.remainingLeaseYears ?? '')} onChange={v => setField('remainingLeaseYears', parseInt(v) || 0)} required />
      <IField label="Lease extension cost (£)" value={Number(form.leaseExtensionCost) > 0 ? fc(Number(form.leaseExtensionCost)) : ''} onChange={v => setField('leaseExtensionCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Service charge (£/mo)" value={Number(form.serviceChargeMonthly) > 0 ? fc(Number(form.serviceChargeMonthly)) : ''} onChange={v => setField('serviceChargeMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Ground rent (£/yr)" value={Number(form.groundRentAnnual) > 0 ? fc(Number(form.groundRentAnnual)) : ''} onChange={v => setField('groundRentAnnual', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Ground rent review" value={String(form.groundRentReviewClause ?? 'None')} onChange={v => setField('groundRentReviewClause', v)} />
      <IField label="Share of freehold?" value={String(form.shareOfFreehold ?? 'No')} onChange={v => setField('shareOfFreehold', v)} />
      <IField label="Sinking fund balance (£)" value={Number(form.sinkingFundBalance) > 0 ? fc(Number(form.sinkingFundBalance)) : ''} onChange={v => setField('sinkingFundBalance', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    </IGrid>
    {/* Doubling ground rent warning */}
    {String(form.groundRentReviewClause ?? '').toLowerCase().includes('doubl') && (
      <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fef2f2', border: '.5px solid #fca5a5', borderRadius: '8px', fontSize: '11px', color: '#991b1b' }}>
        ⚠️ <strong>Doubling ground rent</strong> — this lease structure may make the property unmortgageable. Confirm with solicitor before proceeding.
      </div>
    )}
  </Sec>
)}
```

---

## STEP 5 — After making all changes

1. Run `npx tsc --noEmit` — zero errors required
2. Commit: `git add -A && git commit -m "feat: property section expansion — floor area, buyer type, leasehold, MEES, auction fields" && git push origin stage-6`
3. Report every new field added and confirm tsc passes

---

## Field reference — all new `deals.inputs` keys added in this prompt

| Key | Type | Default | Notes |
|---|---|---|---|
| `floorAreaSqm` | number | — | Floor area in sqm |
| `yearBuilt` | number | — | Year of construction |
| `constructionType` | string | 'Standard (brick/block)' | |
| `askingPrice` | number | — | For BMV% calc |
| `buyerType` | string | 'Standard' | Drives stamp duty |
| `sourceOfDeal` | string | — | Context field |
| `floodRisk` | string | 'Low' | Risk flag |
| `hasGasSupply` | string | 'Yes' | Affects running costs |
| `councilTaxBand` | string | — | A–H |
| `isCurrentlyTenanted` | string | 'No' | |
| `isUninhabitable` | string | 'No' | |
| `listedStatus` | string | 'None' | |
| `isConservationArea` | string | 'No' | |
| `pdRightsAvailable` | string | 'Unknown' | |
| `isCashBuyer` | string | 'No' | Hides mortgage fields in P7 |
| `epcImprovementCost` | number | — | Shown when EPC D/E/F/G |
| `isAuctionPurchase` | boolean | false | |
| `auctionBuyersPremiumPercent` | number | 0 | |
| `auctionReservationFee` | number | 0 | |
| `remainingLeaseYears` | number | — | Leasehold only |
| `leaseExtensionCost` | number | — | Leasehold only |
| `serviceChargeMonthly` | number | 0 | Leasehold only |
| `groundRentAnnual` | number | 0 | Leasehold only |
| `groundRentReviewClause` | string | 'None' | Leasehold only |
| `shareOfFreehold` | string | 'No' | Leasehold only |
| `sinkingFundBalance` | number | 0 | Leasehold only |
