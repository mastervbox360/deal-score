# REPLIT PROMPT 7 — Finance Restructure + Tax & Ownership
> Run AFTER Prompt 6 is complete and tsc passes. Touches AnalysisHub.tsx only.

---

## Files to read in full before touching anything

```
artifacts/dealscore/src/components/AnalysisHub.tsx
```

Read it in full. Do not touch anything until you have read it.

---

## Context

This prompt restructures the finance sections in ViewInputs:
1. Breaks "Other costs" into explicit line items
2. Adds a purchase financing method selector (Cash / Mortgage / Bridging) with conditional sub-fields
3. Adds a refurb financing section
4. Adds a Tax & ownership section
5. Adds MDR toggle for stamp duty

All values stored in `deals.inputs` via `setField`. No Supabase schema changes needed.

**Standing rule:** Only modify JSX inside `return()` of ViewInputs and sub-components defined before it. Do NOT touch form state, setField, scheduleAutosave, or anything above return().

---

## STEP 1 — Restructure "Property & purchase" section (Buy strategies)

Find the existing `<Sec title="Property &amp; purchase">` block. It currently has: purchase price, market value, country, stamp duty (auto), refurb cost, other costs.

**Replace it** with the expanded version below:

```tsx
{mode === 'buy' && (
  <Sec title="Property &amp; purchase">
    <IGrid>
      <IField label="Purchase price" value={Number((form.sharedInputs as Record<string,unknown>)?.purchasePrice) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).purchasePrice)) : ''} onChange={v => setField('sharedInputs.purchasePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
      <IField label="Market value / GDV" value={Number(form.marketValue) > 0 ? fc(Number(form.marketValue)) : ''} onChange={v => setField('marketValue', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Country" value={COUNTRY_LABEL[p.taxCountry] ?? p.taxCountry} />
      <IField label={`${taxLabel} (auto-calculated)`} value={taxValue > 0 ? fc(taxValue) : '—'} />
      <IField label="Refurb / works cost (£)" value={Number((form.sharedInputs as Record<string,unknown>)?.refurbCost) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).refurbCost)) : ''} onChange={v => setField('sharedInputs.refurbCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    </IGrid>

    {/* MDR toggle */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0 4px', padding: '10px 12px', background: 'var(--bg-sec)', borderRadius: '8px', border: '.5px solid var(--ds-border)' }}>
      <i className="ti ti-receipt-tax" style={{ fontSize: '15px', color: 'var(--text-2)' }} />
      <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1 }}>Multiple Dwellings Relief (MDR) applies?</span>
      <span style={{ fontSize: '11px', color: 'var(--text-2)', marginRight: '8px' }}>Buying 2+ units in one transaction can reduce stamp duty significantly</span>
      <button onClick={() => isEditing && setField('mdrApplies', !form.mdrApplies)} style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default', background: form.mdrApplies ? 'var(--navy)' : 'var(--bg-sec)', color: form.mdrApplies ? '#fff' : 'var(--text-2)' }}>
        {form.mdrApplies ? 'Yes' : 'No'}
      </button>
    </div>

    {/* Purchase costs breakdown */}
    <div style={{ marginTop: '12px', marginBottom: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#aaa' }}>Purchase costs breakdown</div>
    <IGrid>
      <IField label="Solicitor / conveyancing (£)" value={Number(form.solicitorFee) > 0 ? fc(Number(form.solicitorFee)) : ''} onChange={v => setField('solicitorFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Survey cost (£)" value={Number(form.surveyCost) > 0 ? fc(Number(form.surveyCost)) : ''} onChange={v => setField('surveyCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Broker fee (£)" value={Number(form.brokerFee) > 0 ? fc(Number(form.brokerFee)) : ''} onChange={v => setField('brokerFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Sourcing fee paid (£)" value={Number(form.sourcingFeePaid) > 0 ? fc(Number(form.sourcingFeePaid)) : ''} onChange={v => setField('sourcingFeePaid', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Mortgage arrangement fee (£)" value={Number(form.mortgageArrangementFee) > 0 ? fc(Number(form.mortgageArrangementFee)) : ''} onChange={v => setField('mortgageArrangementFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Other costs (£)" value={Number((form.sharedInputs as Record<string,unknown>)?.otherCosts) > 0 ? fc(Number((form.sharedInputs as Record<string,unknown>).otherCosts)) : ''} onChange={v => setField('sharedInputs.otherCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    </IGrid>
  </Sec>
)}
```

---

## STEP 2 — Restructure "Purchase financing" section

Find the existing `<Sec title="Purchase financing">` block. **Replace it entirely** with the version below that adds a financing method selector with conditional sub-fields.

```tsx
{mode === 'buy' && activeTile !== 'flip' && (
  <Sec title="Purchase financing">

    {/* Method selector */}
    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
      {(['Cash', 'Mortgage', 'Bridging'] as const).map(method => (
        <button key={method}
          onClick={() => isEditing && setField('purchaseFinanceMethod', method)}
          style={{
            flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            border: `${form.purchaseFinanceMethod === method ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`,
            background: form.purchaseFinanceMethod === method ? 'var(--navy-light)' : 'var(--bg-sec)',
            color: form.purchaseFinanceMethod === method ? 'var(--navy)' : 'var(--text-2)',
            cursor: isEditing ? 'pointer' : 'default', fontFamily: 'inherit',
          }}
        >{method}</button>
      ))}
    </div>

    {/* Mortgage fields */}
    {(form.purchaseFinanceMethod === 'Mortgage' || !form.purchaseFinanceMethod) && String(form.isCashBuyer ?? 'No') !== 'Yes' && (
      <IGrid>
        <IField label="Deposit %" value={fp(Number((form.sharedInputs as Record<string,unknown>)?.depositPercent ?? 25))} onChange={v => setField('sharedInputs.depositPercent', parseFloat(v) || 25)} />
        <IField label="Mortgage rate (%)" value={Number((form.sharedInputs as Record<string,unknown>)?.mortgageRate) > 0 ? fp(Number((form.sharedInputs as Record<string,unknown>).mortgageRate)) : ''} onChange={v => setField('sharedInputs.mortgageRate', parseFloat(v) || 0)} />
        <IField label="Term (years)" value={String((form.sharedInputs as Record<string,unknown>)?.mortgageTerm ?? 25)} onChange={v => setField('sharedInputs.mortgageTerm', parseInt(v) || 25)} />
        <IField label="Type" value={String((form.sharedInputs as Record<string,unknown>)?.mortgageType ?? 'IO') === 'IO' ? 'Interest only' : 'Repayment'} onChange={v => setField('sharedInputs.mortgageType', v === 'Interest only' ? 'IO' : 'Repayment')} />
        <IField label="Fixed rate ends" value={String(form.fixedRateEndDate ?? '')} onChange={v => setField('fixedRateEndDate', v)} />
        <IField label="Reversion / SVR rate (%)" value={Number(form.reversionRate) > 0 ? fp(Number(form.reversionRate)) : ''} onChange={v => setField('reversionRate', parseFloat(v) || 0)} />
      </IGrid>
    )}

    {/* Bridging fields */}
    {form.purchaseFinanceMethod === 'Bridging' && (
      <IGrid>
        <IField label="Bridging rate (% pm)" value={Number(form.bridgingRateMonthly) > 0 ? fp(Number(form.bridgingRateMonthly)) : ''} onChange={v => setField('bridgingRateMonthly', parseFloat(v) || 0)} />
        <IField label="Bridging term (months)" value={String(form.bridgingTermMonths ?? '')} onChange={v => setField('bridgingTermMonths', parseInt(v) || 0)} />
        <IField label="Bridging LTV (%)" value={fp(Number(form.bridgingLTV ?? 70))} onChange={v => setField('bridgingLTV', parseFloat(v) || 70)} />
        <IField label="Arrangement fee (%)" value={fp(Number(form.bridgingArrangementFeePercent ?? 2))} onChange={v => setField('bridgingArrangementFeePercent', parseFloat(v) || 2)} />
        <IField label="Exit fee (%)" value={fp(Number(form.bridgingExitFeePercent ?? 0))} onChange={v => setField('bridgingExitFeePercent', parseFloat(v) || 0)} />
      </IGrid>
    )}

    {/* Cash buyer message */}
    {String(form.isCashBuyer ?? 'No') === 'Yes' && (
      <div style={{ padding: '12px', background: 'var(--bg-sec)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-2)' }}>
        <i className="ti ti-check" style={{ color: 'var(--teal)', marginRight: '6px' }} />Cash purchase — no mortgage or bridging costs.
      </div>
    )}

  </Sec>
)}
```

---

## STEP 3 — Add Refurb financing section

Add this section immediately after the Purchase financing `</Sec>` (and before Monthly costs). Show for Buy strategies where refurb cost > 0:

```tsx
{mode === 'buy' && Number((form.sharedInputs as Record<string,unknown>)?.refurbCost) > 0 && (
  <Sec title="Refurb financing">
    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
      {(['Cash', 'Bridging'] as const).map(method => (
        <button key={method}
          onClick={() => isEditing && setField('refurbFinanceMethod', method)}
          style={{
            flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            border: `${form.refurbFinanceMethod === method ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`,
            background: form.refurbFinanceMethod === method ? 'var(--navy-light)' : 'var(--bg-sec)',
            color: form.refurbFinanceMethod === method ? 'var(--navy)' : 'var(--text-2)',
            cursor: isEditing ? 'pointer' : 'default', fontFamily: 'inherit',
          }}
        >{method}</button>
      ))}
    </div>
    {form.refurbFinanceMethod === 'Bridging' && (
      <IGrid>
        <IField label="Bridging rate (% pm)" value={Number(form.refurbBridgingRate) > 0 ? fp(Number(form.refurbBridgingRate)) : ''} onChange={v => setField('refurbBridgingRate', parseFloat(v) || 0)} />
        <IField label="Bridging term (months)" value={String(form.refurbBridgingTermMonths ?? '')} onChange={v => setField('refurbBridgingTermMonths', parseInt(v) || 0)} />
        <IField label="LTV (%)" value={fp(Number(form.refurbBridgingLTV ?? 70))} onChange={v => setField('refurbBridgingLTV', parseFloat(v) || 70)} />
        <IField label="Arrangement fee (%)" value={fp(Number(form.refurbBridgingArrangementFee ?? 2))} onChange={v => setField('refurbBridgingArrangementFee', parseFloat(v) || 2)} />
      </IGrid>
    )}
  </Sec>
)}
```

---

## STEP 4 — Add Tax & ownership section

Add this as a new `<Sec>` immediately after the SellerCard and before Step 1 (the mode picker). This section is shown for all strategies.

```tsx
<Sec title="Ownership &amp; tax">
  <IGrid>
    <IField label="Ownership structure" value={String(form.ownershipStructure ?? 'Personal name')} onChange={v => setField('ownershipStructure', v)} />
    <IField label="Income tax band" value={String(form.incomeTaxBand ?? '40%')} onChange={v => setField('incomeTaxBand', v)} />
    <IField label="Joint ownership?" value={String(form.isJointOwnership ?? 'No')} onChange={v => setField('isJointOwnership', v)} />
  </IGrid>

  {/* Joint ownership split */}
  {String(form.isJointOwnership ?? 'No') === 'Yes' && (
    <IGrid style={{ marginTop: '10px' }}>
      <IField label="Your ownership (%)" value={fp(Number(form.ownershipSplitPercent ?? 50))} onChange={v => setField('ownershipSplitPercent', parseFloat(v) || 50)} />
      <IField label="Partner's tax band" value={String(form.partnerTaxBand ?? '20%')} onChange={v => setField('partnerTaxBand', v)} />
    </IGrid>
  )}

  {/* JV investor split */}
  {String(form.ownershipStructure ?? '').toLowerCase().includes('jv') && (
    <IGrid style={{ marginTop: '10px' }}>
      <IField label="JV investor split (%)" value={fp(Number(form.jvInvestorSplitPercent ?? 50))} onChange={v => setField('jvInvestorSplitPercent', parseFloat(v) || 50)} />
    </IGrid>
  )}

  {/* Section 24 notice — shown for personal name + mortgage */}
  {(String(form.ownershipStructure ?? 'Personal name') === 'Personal name' || !form.ownershipStructure) &&
   String(form.isCashBuyer ?? 'No') !== 'Yes' &&
   form.purchaseFinanceMethod !== 'Cash' && (
    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#eff6ff', border: '.5px solid #bfdbfe', borderRadius: '8px', fontSize: '11px', color: '#1e3a5f', lineHeight: 1.6 }}>
      <i className="ti ti-info-circle" style={{ marginRight: '6px' }} />
      <strong>Section 24:</strong> Personal name landlords cannot deduct mortgage interest from rental profit — only a 20% basic rate tax credit applies. Higher-rate taxpayers may pay tax on profit they haven't made. Consider Ltd company structure.
    </div>
  )}
</Sec>
```

---

## STEP 5 — FLIP section: remove duplicate purchase price and refurb cost

Find the FLIP strategy section (`{activeTile === 'flip' && ...}`). It currently includes `Purchase price` and `Refurb cost` fields. These are already captured in the shared Property & purchase section above.

Remove these two IField items from the FLIP section — keep only:
- Expected sale price
- Contingency %
- Project length (months)
- Holding costs / mo
- Selling costs %

Also add a **FLIP purchase financing** block inside the FLIP section (bridging is standard for FLIP):

```tsx
{activeTile === 'flip' && (
  <>
    <Sec title="FLIP — project details">
      <IGrid>
        <IField label="Expected sale price" value={...} onChange={...} required />
        <IField label="Contingency %" value={...} onChange={...} />
        <IField label="Project length (months)" value={...} onChange={...} required />
        <IField label="Holding costs / mo" value={...} onChange={...} />
        <IField label="Selling costs %" value={...} onChange={...} />
        <IField label="Planning permission?" value={String(form.flipPlanningRequired ?? 'No')} onChange={v => setField('flipPlanningRequired', v)} />
      </IGrid>
      {String(form.flipPlanningRequired ?? 'No') === 'Yes' && (
        <IGrid style={{ marginTop: '10px' }}>
          <IField label="Planning / architect cost (£)" value={Number(form.flipPlanningCost) > 0 ? fc(Number(form.flipPlanningCost)) : ''} onChange={v => setField('flipPlanningCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
        </IGrid>
      )}
    </Sec>

    {/* FLIP purchase financing — bridging is typical */}
    <Sec title="FLIP — purchase financing">
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {(['Cash', 'Mortgage', 'Bridging'] as const).map(method => (
          <button key={method}
            onClick={() => isEditing && setField('flipPurchaseFinanceMethod', method)}
            style={{
              flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              border: `${form.flipPurchaseFinanceMethod === method ? '1.5px solid var(--navy)' : '.5px solid var(--ds-border)'}`,
              background: form.flipPurchaseFinanceMethod === method ? 'var(--navy-light)' : 'var(--bg-sec)',
              color: form.flipPurchaseFinanceMethod === method ? 'var(--navy)' : 'var(--text-2)',
              cursor: isEditing ? 'pointer' : 'default', fontFamily: 'inherit',
            }}
          >{method}</button>
        ))}
      </div>
      {form.flipPurchaseFinanceMethod === 'Bridging' && (
        <IGrid>
          <IField label="Bridging rate (% pm)" value={Number(form.flipBridgingRate) > 0 ? fp(Number(form.flipBridgingRate)) : ''} onChange={v => setField('flipBridgingRate', parseFloat(v) || 0)} />
          <IField label="Bridging term (months)" value={String(form.flipBridgingTermMonths ?? '')} onChange={v => setField('flipBridgingTermMonths', parseInt(v) || 0)} />
          <IField label="Bridging LTV (%)" value={fp(Number(form.flipBridgingLTV ?? 70))} onChange={v => setField('flipBridgingLTV', parseFloat(v) || 70)} />
          <IField label="Arrangement fee (%)" value={fp(Number(form.flipBridgingArrangementFee ?? 2))} onChange={v => setField('flipBridgingArrangementFee', parseFloat(v) || 2)} />
          <IField label="Exit fee (%)" value={fp(Number(form.flipBridgingExitFee ?? 0))} onChange={v => setField('flipBridgingExitFee', parseFloat(v) || 0)} />
        </IGrid>
      )}
    </Sec>
  </>
)}
```

---

## STEP 6 — After making all changes

1. Run `npx tsc --noEmit` — zero errors required
2. Commit: `git add -A && git commit -m "feat: finance restructure — purchase method selector, bridging, refurb finance, tax/ownership, MDR, FLIP planning" && git push origin stage-6`
3. Report every section changed and confirm tsc passes

---

## Field reference — all new `deals.inputs` keys added in this prompt

| Key | Type | Default | Notes |
|---|---|---|---|
| `mdrApplies` | boolean | false | Multiple Dwellings Relief |
| `solicitorFee` | number | — | Split from otherCosts |
| `surveyCost` | number | — | Split from otherCosts |
| `brokerFee` | number | — | Split from otherCosts |
| `sourcingFeePaid` | number | — | Fee paid to deal sourcer |
| `mortgageArrangementFee` | number | — | Lender arrangement fee |
| `purchaseFinanceMethod` | string | 'Mortgage' | Cash / Mortgage / Bridging |
| `fixedRateEndDate` | string | — | e.g. "Dec 2027" |
| `reversionRate` | number | — | SVR after fixed period |
| `bridgingRateMonthly` | number | — | % per month |
| `bridgingTermMonths` | number | — | |
| `bridgingLTV` | number | 70 | % |
| `bridgingArrangementFeePercent` | number | 2 | % |
| `bridgingExitFeePercent` | number | 0 | % |
| `refurbFinanceMethod` | string | 'Cash' | Cash / Bridging |
| `refurbBridgingRate` | number | — | |
| `refurbBridgingTermMonths` | number | — | |
| `refurbBridgingLTV` | number | 70 | |
| `refurbBridgingArrangementFee` | number | 2 | |
| `ownershipStructure` | string | 'Personal name' | Personal / Ltd / LLP / JV |
| `incomeTaxBand` | string | '40%' | |
| `isJointOwnership` | string | 'No' | |
| `ownershipSplitPercent` | number | 50 | |
| `partnerTaxBand` | string | '20%' | |
| `jvInvestorSplitPercent` | number | 50 | |
| `flipPlanningRequired` | string | 'No' | |
| `flipPlanningCost` | number | — | |
| `flipPurchaseFinanceMethod` | string | 'Bridging' | |
| `flipBridgingRate` | number | — | |
| `flipBridgingTermMonths` | number | — | |
| `flipBridgingLTV` | number | 70 | |
| `flipBridgingArrangementFee` | number | 2 | |
| `flipBridgingExitFee` | number | 0 | |
