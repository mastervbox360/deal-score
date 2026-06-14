# REPLIT PROMPT 8 — Strategy-Specific Fields + Running Costs Expansion
> Run AFTER Prompt 7 is complete and tsc passes. Touches AnalysisHub.tsx only.

---

## Files to read in full before touching anything

```
artifacts/dealscore/src/components/AnalysisHub.tsx
```

Read it in full. Do not touch anything until you have read it.

---

## Context

This prompt expands the Monthly costs section and all strategy-specific input sections. All values stored in `deals.inputs` via `setField`. No Supabase schema changes needed.

**Standing rule:** Only modify JSX inside `return()` of ViewInputs and sub-components defined before it.

---

## STEP 1 — Expand Monthly costs section

Find `<Sec title="Monthly costs">`. Replace its IGrid contents with the expanded set below. This section is shown for Buy strategies that are not FLIP (`mode === 'buy' && activeTile !== 'flip'`).

```tsx
<Sec title="Monthly costs">
  <IGrid>
    {/* Existing fields */}
    <IField label="Management fee (%)" value={fp(Number(form.managementFeePercent ?? 10))} onChange={v => setField('managementFeePercent', parseFloat(v) || 10)} />
    <IField label="Void allowance (%)" value={fp(Number(form.voidAllowancePercent ?? 5))} onChange={v => setField('voidAllowancePercent', parseFloat(v) || 5)} />
    <IField label="Buildings insurance (£/mo)" value={fc(Number(form.buildingsInsurance ?? 30))} onChange={v => setField('buildingsInsurance', parseFloat(v.replace(/[£,]/g, '')) || 30)} />
    <IField label="Maintenance reserve (£/mo)" value={fc(Number(form.maintenanceReserve ?? 75))} onChange={v => setField('maintenanceReserve', parseFloat(v.replace(/[£,]/g, '')) || 75)} />

    {/* New fields */}
    <IField label="Landlord insurance (£/mo)" value={Number(form.landlordInsuranceMonthly) > 0 ? fc(Number(form.landlordInsuranceMonthly)) : ''} onChange={v => setField('landlordInsuranceMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    <IField label="Letting agent re-let fee (£)" value={Number(form.reletFee) > 0 ? fc(Number(form.reletFee)) : ''} onChange={v => setField('reletFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    <IField label="Annual compliance costs (£/yr)" value={Number(form.annualComplianceCosts) > 0 ? fc(Number(form.annualComplianceCosts)) : ''} onChange={v => setField('annualComplianceCosts', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    <IField label="Rent guarantee insurance (£/mo)" value={Number(form.rentGuaranteeInsurance) > 0 ? fc(Number(form.rentGuaranteeInsurance)) : ''} onChange={v => setField('rentGuaranteeInsurance', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    <IField label="Legal expenses insurance (£/yr)" value={Number(form.legalExpensesInsurance) > 0 ? fc(Number(form.legalExpensesInsurance)) : ''} onChange={v => setField('legalExpensesInsurance', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    <IField label="Council tax during voids (£/mo)" value={Number(form.councilTaxVoids) > 0 ? fc(Number(form.councilTaxVoids)) : ''} onChange={v => setField('councilTaxVoids', parseFloat(v.replace(/[£,]/g, '')) || 0)} />

    {/* Leasehold — shown when tenure = Leasehold */}
    {String(form.tenure ?? '').toLowerCase() === 'leasehold' && (
      <>
        <IField label="Service charge (£/mo)" value={Number(form.serviceChargeMonthly) > 0 ? fc(Number(form.serviceChargeMonthly)) : ''} onChange={v => setField('serviceChargeMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
        <IField label="Ground rent (£/yr)" value={Number(form.groundRentAnnual) > 0 ? fc(Number(form.groundRentAnnual)) : ''} onChange={v => setField('groundRentAnnual', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      </>
    )}
  </IGrid>

  {/* Compliance costs helper note */}
  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-2)', padding: '6px 10px', background: 'var(--bg-sec)', borderRadius: '6px' }}>
    Annual compliance costs — gas safety cert (~£80/yr), EICR (~£150 every 5yr), EPC renewal (~£60 every 10yr)
  </div>
</Sec>
```

---

## STEP 2 — Expand BTL section

Find `{activeTile === 'btl' && ...}`. Add these fields alongside the existing monthly rent:

```tsx
{activeTile === 'btl' && (
  <Sec title="BTL — income &amp; setup">
    <IGrid>
      <IField label="Monthly rent (£)" value={...} onChange={...} required /> {/* existing — keep as-is */}
      <IField label="Initial void period (weeks)" value={String((form.btlInputs as Record<string,unknown>)?.initialVoidWeeks ?? 4)} onChange={v => setField('btlInputs.initialVoidWeeks', parseInt(v) || 0)} />
      <IField label="Tenant find / inventory fee (£)" value={Number((form.btlInputs as Record<string,unknown>)?.tenantFindFee) > 0 ? fc(Number((form.btlInputs as Record<string,unknown>).tenantFindFee)) : ''} onChange={v => setField('btlInputs.tenantFindFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Furnished?" value={String((form.btlInputs as Record<string,unknown>)?.furnished ?? 'Unfurnished')} onChange={v => setField('btlInputs.furnished', v)} />
    </IGrid>
  </Sec>
)}
```

---

## STEP 3 — Expand HMO section

Find `{activeTile === 'hmo' && ...}`. Add to the existing IGrid:

```tsx
{activeTile === 'hmo' && (
  <Sec title="HMO — room breakdown &amp; compliance">
    <IGrid>
      {/* Existing fields — keep as-is */}
      <IField label="Rooms" ... />
      <IField label="Rent per room / mo" ... />
      <IField label="Occupancy rate" ... />
      <IField label="HMO licence cost (£)" ... />
      <IField label="Bills & utilities / mo (£)" ... />

      {/* New fields */}
      <IField label="HMO licence type" value={String((form.hmoInputs as Record<string,unknown>)?.licenceType ?? 'Mandatory')} onChange={v => setField('hmoInputs.licenceType', v)} />
      <IField label="Are rooms ensuite?" value={String((form.hmoInputs as Record<string,unknown>)?.roomsEnsuite ?? 'No')} onChange={v => setField('hmoInputs.roomsEnsuite', v)} />
      <IField label="Council tax / mo (£)" value={Number((form.hmoInputs as Record<string,unknown>)?.councilTaxMonthly) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).councilTaxMonthly)) : ''} onChange={v => setField('hmoInputs.councilTaxMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Fire compliance one-off (£)" value={Number((form.hmoInputs as Record<string,unknown>)?.fireComplianceCost) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).fireComplianceCost)) : ''} onChange={v => setField('hmoInputs.fireComplianceCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Room re-let fee (£/room)" value={Number((form.hmoInputs as Record<string,unknown>)?.roomReletFee) > 0 ? fc(Number((form.hmoInputs as Record<string,unknown>).roomReletFee)) : ''} onChange={v => setField('hmoInputs.roomReletFee', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    </IGrid>

    {/* Article 4 warning */}
    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-sec)', borderRadius: '8px', border: '.5px solid var(--ds-border)' }}>
      <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: 'var(--text-2)' }} />
      <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1 }}>Article 4 direction area?</span>
      <button
        onClick={() => isEditing && setField('hmoInputs.article4Area', !(form.hmoInputs as Record<string,unknown>)?.article4Area)}
        style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default', background: (form.hmoInputs as Record<string,unknown>)?.article4Area ? '#fee2e2' : 'var(--bg-sec)', color: (form.hmoInputs as Record<string,unknown>)?.article4Area ? '#991b1b' : 'var(--text-2)' }}
      >
        {(form.hmoInputs as Record<string,unknown>)?.article4Area ? '⚠️ Yes — planning required' : 'No'}
      </button>
    </div>
  </Sec>
)}
```

---

## STEP 4 — Expand SA section

Find `{activeTile === 'sa' && ...}`. Add to the existing IGrid:

```tsx
{activeTile === 'sa' && (
  <Sec title="SA — nightly rate, occupancy &amp; costs">
    <IGrid>
      {/* Existing fields — keep as-is */}
      <IField label="Avg nightly rate (£)" ... />
      <IField label="Target occupancy (%)" ... />
      <IField label="Platform fee (%)" ... />
      <IField label="Cleaning cost / stay (£)" ... />
      <IField label="Bills & utilities / mo (£)" ... />

      {/* New fields */}
      <IField label="Avg stay length (nights)" value={String((form.saInputs as Record<string,unknown>)?.avgStayLengthNights ?? 3)} onChange={v => setField('saInputs.avgStayLengthNights', parseInt(v) || 3)} />
      <IField label="Linen / laundry / stay (£)" value={Number((form.saInputs as Record<string,unknown>)?.linenCostPerStay) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).linenCostPerStay)) : ''} onChange={v => setField('saInputs.linenCostPerStay', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Welcome pack / consumables (£/mo)" value={Number((form.saInputs as Record<string,unknown>)?.consumablesMonthly) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).consumablesMonthly)) : ''} onChange={v => setField('saInputs.consumablesMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Council tax (£/mo)" value={Number((form.saInputs as Record<string,unknown>)?.councilTaxMonthly) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).councilTaxMonthly)) : ''} onChange={v => setField('saInputs.councilTaxMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="Channel manager (£/mo)" value={Number((form.saInputs as Record<string,unknown>)?.channelManagerMonthly) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).channelManagerMonthly)) : ''} onChange={v => setField('saInputs.channelManagerMonthly', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
      <IField label="SA furnishing / setup (£ one-off)" value={Number((form.saInputs as Record<string,unknown>)?.furnishingSetupCost) > 0 ? fc(Number((form.saInputs as Record<string,unknown>).furnishingSetupCost)) : ''} onChange={v => setField('saInputs.furnishingSetupCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    </IGrid>

    {/* SA licence warning */}
    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-sec)', borderRadius: '8px', border: '.5px solid var(--ds-border)' }}>
      <i className="ti ti-license" style={{ fontSize: '15px', color: 'var(--text-2)' }} />
      <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1 }}>Short-term let licence required by council?</span>
      <button
        onClick={() => isEditing && setField('saInputs.licenceRequired', !(form.saInputs as Record<string,unknown>)?.licenceRequired)}
        style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default', background: (form.saInputs as Record<string,unknown>)?.licenceRequired ? '#fef3c7' : 'var(--bg-sec)', color: (form.saInputs as Record<string,unknown>)?.licenceRequired ? '#92400e' : 'var(--text-2)' }}
      >
        {(form.saInputs as Record<string,unknown>)?.licenceRequired ? '⚠️ Yes — check local rules' : 'No / Unknown'}
      </button>
    </div>
  </Sec>
)}
```

---

## STEP 5 — Expand BRRR section

Find `{activeTile === 'brrr' && ...}`. Add refinance type/term/arrangement fee, and a BRRR bridging purchase section.

```tsx
{activeTile === 'brrr' && (
  <>
    <Sec title="BRRR — purchase &amp; refurb financing">
      {/* Bridging for purchase — standard for BRRR */}
      <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '10px' }}>BRRR purchases are typically bridged. Enter the bridging details for the purchase below.</div>
      <IGrid>
        <IField label="Bridging rate (% pm)" value={Number((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingRate) > 0 ? fp(Number((form.brrrInputs as Record<string,unknown>).purchaseBridgingRate)) : ''} onChange={v => setField('brrrInputs.purchaseBridgingRate', parseFloat(v) || 0)} />
        <IField label="Bridging term (months)" value={String((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingTermMonths ?? '')} onChange={v => setField('brrrInputs.purchaseBridgingTermMonths', parseInt(v) || 0)} />
        <IField label="Bridging LTV (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingLTV ?? 70))} onChange={v => setField('brrrInputs.purchaseBridgingLTV', parseFloat(v) || 70)} />
        <IField label="Arrangement fee (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingArrangementFee ?? 2))} onChange={v => setField('brrrInputs.purchaseBridgingArrangementFee', parseFloat(v) || 2)} />
        <IField label="Exit fee (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.purchaseBridgingExitFee ?? 0))} onChange={v => setField('brrrInputs.purchaseBridgingExitFee', parseFloat(v) || 0)} />
      </IGrid>
    </Sec>

    <Sec title="BRRR — refinance">
      <IGrid>
        <IField label="Post-refurb value (GDV)" value={...} onChange={...} required /> {/* existing — keep */}
        <IField label="Target refinance LTV (%)" value={...} onChange={...} /> {/* existing */}
        <IField label="Refinance rate (%)" value={...} onChange={...} /> {/* existing */}
        <IField label="Refinance type" value={String((form.brrrInputs as Record<string,unknown>)?.refinanceMortgageType ?? 'IO')} onChange={v => setField('brrrInputs.refinanceMortgageType', v)} />
        <IField label="Refinance term (years)" value={String((form.brrrInputs as Record<string,unknown>)?.refinanceMortgageTerm ?? 25)} onChange={v => setField('brrrInputs.refinanceMortgageTerm', parseInt(v) || 25)} />
        <IField label="Refinance arrangement fee (%)" value={fp(Number((form.brrrInputs as Record<string,unknown>)?.refinanceArrangementFeePercent ?? 1))} onChange={v => setField('brrrInputs.refinanceArrangementFeePercent', parseFloat(v) || 1)} />
      </IGrid>
    </Sec>

    <Sec title="BRRR — post-refurb income (hold phase)">
      <IGrid>
        <IField label="Monthly rent post-refurb (£)" value={...} onChange={...} required /> {/* existing */}
      </IGrid>
    </Sec>
  </>
)}
```

---

## STEP 6 — Expand Social Housing section

Find `{activeTile === 'social' && ...}`. Add fields:

```tsx
{activeTile === 'social' && (
  <Sec title="Social Housing — guaranteed lease">
    <IGrid>
      <IField label="Monthly lease income (£)" value={...} onChange={...} required /> {/* existing */}
      <IField label="Lease term (years)" value={...} onChange={...} /> {/* existing */}
      <IField label="Provider / council name" value={String((form.socialInputs as Record<string,unknown>)?.providerName ?? '')} onChange={v => setField('socialInputs.providerName', v)} />
      <IField label="Contract type" value={String((form.socialInputs as Record<string,unknown>)?.contractType ?? 'Direct lease')} onChange={v => setField('socialInputs.contractType', v)} />
      <IField label="Rent review mechanism" value={String((form.socialInputs as Record<string,unknown>)?.rentReviewMechanism ?? 'Fixed')} onChange={v => setField('socialInputs.rentReviewMechanism', v)} />
      <IField label="End-of-lease refurb obligation (£)" value={Number((form.socialInputs as Record<string,unknown>)?.endOfLeaseRefurbCost) > 0 ? fc(Number((form.socialInputs as Record<string,unknown>).endOfLeaseRefurbCost)) : ''} onChange={v => setField('socialInputs.endOfLeaseRefurbCost', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
    </IGrid>
    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-2)', padding: '6px 10px', background: 'var(--bg-sec)', borderRadius: '6px' }}>
      Social / guaranteed leases typically have 0% void risk and 0% management fee — adjust the Monthly costs section accordingly.
    </div>
  </Sec>
)}
```

---

## STEP 7 — Expand R2R section

Find `{activeTile === 'r2r' && ...}`. Add the bug-fix and new fields:

```tsx
{activeTile === 'r2r' && (
  <Sec title="R2R — lease &amp; sublet details">
    <IGrid>
      {/* Existing fields — keep as-is */}
      <IField label="Monthly rent paid to landlord" ... />
      <IField label="Rooms" ... />
      <IField label="Rent per room / mo" ... />
      <IField label="Occupancy rate" ... />
      <IField label="Management fee (%)" ... />
      <IField label="Monthly running costs" ... />
      <IField label="Setup costs" ... />
      <IField label="Landlord deposit (months)" ... />

      {/* BUG FIX — was in interface and calc but never captured */}
      <IField label="Lease length (months)" value={String((form.r2rInputs as Record<string,unknown>)?.leaseLengthMonths ?? '')} onChange={v => setField('r2rInputs.leaseLengthMonths', parseInt(v) || 0)} required />

      {/* New fields */}
      <IField label="R2R sublet type" value={String((form.r2rInputs as Record<string,unknown>)?.subletType ?? 'HMO')} onChange={v => setField('r2rInputs.subletType', v)} />
      <IField label="Break clause notice (months)" value={String((form.r2rInputs as Record<string,unknown>)?.breakClauseMonths ?? '')} onChange={v => setField('r2rInputs.breakClauseMonths', parseInt(v) || 0)} />
      <IField label="Annual rent increase in lease (%)" value={Number((form.r2rInputs as Record<string,unknown>)?.annualRentIncrease) >= 0 ? fp(Number((form.r2rInputs as Record<string,unknown>).annualRentIncrease)) : ''} onChange={v => setField('r2rInputs.annualRentIncrease', parseFloat(v) || 0)} />
    </IGrid>

    {/* Legal risk flags */}
    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[
        { key: 'rightToSubletConfirmed', label: 'Right to sublet confirmed in lease?', warn: false },
        { key: 'landlordMortgageConsentObtained', label: 'Landlord mortgage consent obtained?', warn: false },
      ].map(({ key, label }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'var(--bg-sec)', borderRadius: '8px', border: '.5px solid var(--ds-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-1)', flex: 1 }}>{label}</span>
          <button
            onClick={() => isEditing && setField(`r2rInputs.${key}`, !(form.r2rInputs as Record<string,unknown>)?.[key])}
            style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: '.5px solid var(--ds-border)', fontFamily: 'inherit', cursor: isEditing ? 'pointer' : 'default', background: (form.r2rInputs as Record<string,unknown>)?.[key] ? '#d1fae5' : '#fef2f2', color: (form.r2rInputs as Record<string,unknown>)?.[key] ? '#065f46' : '#991b1b' }}
          >
            {(form.r2rInputs as Record<string,unknown>)?.[key] ? '✓ Yes' : '✗ Not yet'}
          </button>
        </div>
      ))}
    </div>
  </Sec>
)}
```

---

## STEP 8 — After making all changes

1. Run `npx tsc --noEmit` — zero errors required
2. Commit: `git add -A && git commit -m "feat: strategy fields expansion — HMO Article4/fire/council tax, SA avg stay/linen/council tax, BRRR bridging+refinance, R2R lease length fix + legal flags, Social contract type, BTL void/furnished" && git push origin stage-6`
3. Report every section changed and confirm tsc passes
