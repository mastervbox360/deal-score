# REPLIT PROMPT 10 — Dropdown fields + ISelect component
> Run AFTER Prompt 9 is complete and tsc passes. Touches AnalysisHub.tsx only.

---

## Files to read in full before touching anything

```
artifacts/dealscore/src/components/AnalysisHub.tsx
```

Read it in full. Do not touch anything until you have read it.

---

## Context

Many input fields currently render as free-text `<input>` via `IField` but should be dropdowns with a fixed option set. This prompt:
1. Adds two new sub-components (`ISelect` and `ISelectOther`) styled to match the existing `IField` exactly
2. Replaces every identified free-text field with the appropriate component
3. Preserves full `setField` / `scheduleAutosave` compatibility — auto-population from scraping or API will still work because `setField` writes the value regardless of how the field renders

**Standing rule:** Only modify sub-component definitions and JSX inside `return()` of ViewInputs. Do NOT touch form state, setField, scheduleAutosave, selectStrategy, or anything else above return().

---

## STEP 1 — Add ISelect and ISelectOther sub-components

Find where `IField` is defined in AnalysisHub.tsx. Immediately after the closing of the `IField` component definition, add the following two components:

```tsx
// ── ISelect ─────────────────────────────────────────────────────────────────
// Dropdown equivalent of IField. value/onChange are identical so setField works
// the same way — auto-population from scraping or API sets value programmatically.
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 28px 7px 10px',
  fontSize: '12px',
  fontFamily: 'inherit',
  color: 'var(--text-1)',
  background: 'var(--bg-input, #fff)',
  border: '.5px solid var(--ds-border)',
  borderRadius: '7px',
  outline: 'none',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 9px center',
  backgroundSize: '11px',
  cursor: 'pointer',
  transition: 'border-color .15s',
  minHeight: '32px',
}

function ISelect({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  disabled?: boolean
  hint?: string
}) {
  const { isEditing } = useContext(InputsCtx)
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: 'var(--teal)', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={!isEditing || disabled}
          style={{
            ...selectStyle,
            opacity: (!isEditing || disabled) ? 0.6 : 1,
            cursor: (!isEditing || disabled) ? 'default' : 'pointer',
          }}
        >
          {!options.find(o => o.value === '') && <option value="">— select —</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {hint && <span style={{ fontSize: '10px', color: 'var(--text-3, #aaa)', marginTop: '2px' }}>{hint}</span>}
    </div>
  )
}

// ── ISelectOther ─────────────────────────────────────────────────────────────
// Dropdown that reveals a free-text input when "Other" is selected.
// Use for fields where the option set covers 90%+ of cases but edge cases exist.
function ISelectOther({
  label,
  value,
  onChange,
  options,
  required,
  otherPlaceholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  otherPlaceholder?: string
}) {
  // Detect if value is a known option or a custom "other" value
  const knownValues = options.map(o => o.value)
  const isOther = value !== '' && !knownValues.includes(value)
  const [selectVal, setSelectVal] = React.useState(isOther ? '__other__' : value)
  const [otherVal, setOtherVal] = React.useState(isOther ? value : '')
  const { isEditing } = useContext(InputsCtx)

  React.useEffect(() => {
    // Sync when value is set externally (e.g. from scraper)
    const isExtOther = value !== '' && !knownValues.includes(value)
    if (isExtOther) { setSelectVal('__other__'); setOtherVal(value) }
    else { setSelectVal(value); setOtherVal('') }
  }, [value])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {label}{required && <span style={{ color: 'var(--teal)', marginLeft: '2px' }}>*</span>}
      </label>
      <select
        value={selectVal}
        onChange={e => {
          setSelectVal(e.target.value)
          if (e.target.value !== '__other__') { setOtherVal(''); onChange(e.target.value) }
        }}
        disabled={!isEditing}
        style={{ ...selectStyle, opacity: !isEditing ? 0.6 : 1, cursor: !isEditing ? 'default' : 'pointer' }}
      >
        {<option value="">— select —</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value="__other__">Other (enter manually)</option>
      </select>
      {selectVal === '__other__' && (
        <input
          type="text"
          value={otherVal}
          onChange={e => { setOtherVal(e.target.value); onChange(e.target.value) }}
          placeholder={otherPlaceholder ?? 'Enter value...'}
          disabled={!isEditing}
          style={{
            padding: '7px 10px', fontSize: '12px', fontFamily: 'inherit',
            border: '.5px solid var(--teal)', borderRadius: '7px', outline: 'none',
            color: 'var(--text-1)', background: '#fff', marginTop: '4px',
          }}
        />
      )}
    </div>
  )
}
```

---

## STEP 2 — Replace fields in Property information section

Find the Property information `<IGrid>` and replace each field below. Keep all other fields (address, floor area, year built, asking price, source of deal) as `IField` — those remain free text.

### Property type (ISelectOther — robust list)
```tsx
<ISelectOther
  label="Property type"
  value={String(form.propertyType ?? '')}
  onChange={v => setField('propertyType', v)}
  options={[
    { value: 'Terraced house', label: 'Terraced house' },
    { value: 'End-of-terrace house', label: 'End-of-terrace house' },
    { value: 'Semi-detached house', label: 'Semi-detached house' },
    { value: 'Detached house', label: 'Detached house' },
    { value: 'Flat / Apartment', label: 'Flat / Apartment' },
    { value: 'Studio flat', label: 'Studio flat' },
    { value: 'Maisonette', label: 'Maisonette' },
    { value: 'Bungalow (detached)', label: 'Bungalow (detached)' },
    { value: 'Bungalow (semi-detached)', label: 'Bungalow (semi-detached)' },
    { value: 'Converted flat', label: 'Converted flat' },
    { value: 'Purpose-built flat', label: 'Purpose-built flat' },
    { value: 'HMO', label: 'HMO' },
    { value: 'Block of flats', label: 'Block of flats' },
    { value: 'Commercial / mixed use', label: 'Commercial / mixed use' },
    { value: 'Land', label: 'Land' },
  ]}
  otherPlaceholder="Describe property type..."
/>
```

### Bedrooms (ISelect)
```tsx
<ISelect
  label="Bedrooms"
  value={String(form.bedrooms ?? '')}
  onChange={v => setField('bedrooms', parseInt(v) || v)}
  options={[
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '10', label: '10+' },
  ]}
/>
```

### Bathrooms (ISelect)
```tsx
<ISelect
  label="Bathrooms"
  value={String(form.bathrooms ?? '')}
  onChange={v => setField('bathrooms', parseInt(v) || v)}
  options={[
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6+' },
  ]}
/>
```

### Tenure (ISelect)
```tsx
<ISelect
  label="Tenure"
  value={String(form.tenure ?? 'Freehold')}
  onChange={v => setField('tenure', v)}
  options={[
    { value: 'Freehold', label: 'Freehold' },
    { value: 'Leasehold', label: 'Leasehold' },
    { value: 'Share of freehold', label: 'Share of freehold' },
    { value: 'Commonhold', label: 'Commonhold' },
  ]}
/>
```

### EPC rating (ISelect)
```tsx
<ISelect
  label="EPC rating"
  value={String(form.epcRating ?? '')}
  onChange={v => setField('epcRating', v)}
  options={[
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: 'E', label: 'E' },
    { value: 'F', label: 'F' },
    { value: 'G', label: 'G' },
    { value: 'Unknown', label: 'Unknown' },
  ]}
/>
```

### Construction type (ISelectOther)
```tsx
<ISelectOther
  label="Construction type"
  value={String(form.constructionType ?? 'Standard (brick/block)')}
  onChange={v => setField('constructionType', v)}
  options={[
    { value: 'Standard (brick/block)', label: 'Standard (brick/block)' },
    { value: 'Steel frame', label: 'Steel frame' },
    { value: 'Timber frame', label: 'Timber frame' },
    { value: 'Concrete (prefab/BISF)', label: 'Concrete (prefab/BISF)' },
    { value: 'Stone', label: 'Stone' },
    { value: 'Wimpey no-fines', label: 'Wimpey no-fines' },
    { value: 'Airey / PRC', label: 'Airey / PRC' },
  ]}
  otherPlaceholder="Describe construction type..."
/>
```

### Buyer type (ISelect)
```tsx
<ISelect
  label="Buyer type"
  value={String(form.buyerType ?? 'Standard')}
  onChange={v => setField('buyerType', v)}
  options={[
    { value: 'Standard', label: 'Standard' },
    { value: 'First-time buyer', label: 'First-time buyer' },
    { value: 'Ltd company', label: 'Ltd company' },
    { value: 'Non-UK resident', label: 'Non-UK resident' },
  ]}
/>
```

### Flood risk (ISelect)
```tsx
<ISelect
  label="Flood risk"
  value={String(form.floodRisk ?? 'Low')}
  onChange={v => setField('floodRisk', v)}
  options={[
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Very high', label: 'Very high' },
    { value: 'Unknown', label: 'Unknown' },
  ]}
/>
```

### Gas supply (ISelect)
```tsx
<ISelect
  label="Gas supply"
  value={String(form.hasGasSupply ?? 'Yes')}
  onChange={v => setField('hasGasSupply', v)}
  options={[
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No — electric only' },
    { value: 'Unknown', label: 'Unknown' },
  ]}
/>
```

### Council tax band (ISelect)
```tsx
<ISelect
  label="Council tax band"
  value={String(form.councilTaxBand ?? '')}
  onChange={v => setField('councilTaxBand', v)}
  options={[
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: 'E', label: 'E' },
    { value: 'F', label: 'F' },
    { value: 'G', label: 'G' },
    { value: 'H', label: 'H' },
    { value: 'Unknown', label: 'Unknown' },
  ]}
/>
```

### Currently tenanted / Uninhabitable / Conservation area / Cash buyer (ISelect — Yes/No)

Replace all four with `ISelect` using the same Yes/No pattern:
```tsx
<ISelect
  label="Currently tenanted?"
  value={String(form.isCurrentlyTenanted ?? 'No')}
  onChange={v => setField('isCurrentlyTenanted', v)}
  options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
/>
<ISelect
  label="Uninhabitable?"
  value={String(form.isUninhabitable ?? 'No')}
  onChange={v => setField('isUninhabitable', v)}
  options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
/>
<ISelect
  label="Conservation area?"
  value={String(form.isConservationArea ?? 'No')}
  onChange={v => setField('isConservationArea', v)}
  options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }, { value: 'Unknown', label: 'Unknown' }]}
/>
<ISelect
  label="Cash buyer?"
  value={String(form.isCashBuyer ?? 'No')}
  onChange={v => setField('isCashBuyer', v)}
  options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
/>
```

### Listed building (ISelect)
```tsx
<ISelect
  label="Listed building"
  value={String(form.listedStatus ?? 'None')}
  onChange={v => setField('listedStatus', v)}
  options={[
    { value: 'None', label: 'None' },
    { value: 'Grade II', label: 'Grade II' },
    { value: 'Grade II*', label: 'Grade II*' },
    { value: 'Grade I', label: 'Grade I' },
    { value: 'Grade A (Scotland)', label: 'Grade A (Scotland)' },
    { value: 'Grade B (Scotland)', label: 'Grade B (Scotland)' },
    { value: 'Grade C (Scotland)', label: 'Grade C (Scotland)' },
  ]}
/>
```

### PD rights (ISelect)
```tsx
<ISelect
  label="PD rights available?"
  value={String(form.pdRightsAvailable ?? 'Unknown')}
  onChange={v => setField('pdRightsAvailable', v)}
  options={[
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No — Article 4 or restricted' },
    { value: 'Unknown', label: 'Unknown' },
  ]}
/>
```

### Ground rent review clause — Leasehold section (ISelect)
```tsx
<ISelect
  label="Ground rent review"
  value={String(form.groundRentReviewClause ?? 'None')}
  onChange={v => setField('groundRentReviewClause', v)}
  options={[
    { value: 'None', label: 'None / fixed' },
    { value: 'RPI', label: 'RPI linked' },
    { value: 'CPI', label: 'CPI linked' },
    { value: 'Doubling', label: 'Doubling (⚠️ unmortgageable risk)' },
    { value: 'Fixed amount', label: 'Fixed amount increase' },
    { value: 'Unknown', label: 'Unknown' },
  ]}
/>
```

### Share of freehold — Leasehold section (ISelect)
```tsx
<ISelect
  label="Share of freehold?"
  value={String(form.shareOfFreehold ?? 'No')}
  onChange={v => setField('shareOfFreehold', v)}
  options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
/>
```

---

## STEP 3 — Replace fields in Finance & tax section

### Ownership structure (ISelect)
```tsx
<ISelect
  label="Ownership structure"
  value={String(form.ownershipStructure ?? 'Personal name')}
  onChange={v => setField('ownershipStructure', v)}
  options={[
    { value: 'Personal name', label: 'Personal name' },
    { value: 'Ltd company', label: 'Ltd company (SPV)' },
    { value: 'LLP', label: 'LLP' },
    { value: 'Trust', label: 'Trust' },
  ]}
/>
```

### Income tax band (ISelect)
```tsx
<ISelect
  label="Income tax band"
  value={String(form.incomeTaxBand ?? '20%')}
  onChange={v => setField('incomeTaxBand', v)}
  options={[
    { value: '20%', label: '20% (Basic rate)' },
    { value: '40%', label: '40% (Higher rate)' },
    { value: '45%', label: '45% (Additional rate)' },
  ]}
/>
```

### Partner's tax band (ISelect) — inside the joint ownership conditional
```tsx
<ISelect
  label="Partner's tax band"
  value={String(form.partnerTaxBand ?? '20%')}
  onChange={v => setField('partnerTaxBand', v)}
  options={[
    { value: '20%', label: '20% (Basic rate)' },
    { value: '40%', label: '40% (Higher rate)' },
    { value: '45%', label: '45% (Additional rate)' },
  ]}
/>
```

### Joint ownership (ISelect)
```tsx
<ISelect
  label="Joint ownership?"
  value={String(form.isJointOwnership ?? 'No')}
  onChange={v => setField('isJointOwnership', v)}
  options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
/>
```

### Mortgage type — inside Mortgage conditional (ISelect)
```tsx
<ISelect
  label="Mortgage type"
  value={String(form.mortgageType ?? 'Interest only')}
  onChange={v => setField('mortgageType', v)}
  options={[
    { value: 'Interest only', label: 'Interest only' },
    { value: 'Repayment', label: 'Repayment' },
  ]}
/>
```

---

## STEP 4 — Replace fields in strategy sections

### BTL — Furnished (ISelect)
```tsx
<ISelect
  label="Furnished?"
  value={String(form.btlInputs?.furnished ?? 'Unfurnished')}
  onChange={v => setField('btlInputs.furnished', v)}
  options={[
    { value: 'Unfurnished', label: 'Unfurnished' },
    { value: 'Part-furnished', label: 'Part-furnished' },
    { value: 'Fully furnished', label: 'Fully furnished' },
  ]}
/>
```

### HMO — Licence type (ISelect)
```tsx
<ISelect
  label="HMO licence type"
  value={String(form.hmoInputs?.licenceType ?? '')}
  onChange={v => setField('hmoInputs.licenceType', v)}
  options={[
    { value: 'Mandatory', label: 'Mandatory (5+ people, 3+ storeys)' },
    { value: 'Additional', label: 'Additional (local authority scheme)' },
    { value: 'Selective', label: 'Selective (single tenancy)' },
    { value: 'None', label: 'No licence required' },
    { value: 'Unknown', label: 'Unknown — check with council' },
  ]}
/>
```

### HMO — Rooms ensuite (ISelect)
```tsx
<ISelect
  label="Rooms ensuite?"
  value={String(form.hmoInputs?.roomsEnsuite ?? 'No')}
  onChange={v => setField('hmoInputs.roomsEnsuite', v)}
  options={[
    { value: 'No', label: 'No — shared bathrooms' },
    { value: 'Some', label: 'Some rooms ensuite' },
    { value: 'All', label: 'All rooms ensuite' },
  ]}
/>
```

### Social — Contract type (ISelect)
```tsx
<ISelect
  label="Contract type"
  value={String(form.socialInputs?.contractType ?? '')}
  onChange={v => setField('socialInputs.contractType', v)}
  options={[
    { value: 'Guaranteed rent', label: 'Guaranteed rent' },
    { value: 'Management agreement', label: 'Management agreement' },
    { value: 'Nomination agreement', label: 'Nomination agreement' },
    { value: 'Lease agreement', label: 'Lease agreement' },
  ]}
/>
```

### Social — Rent review mechanism (ISelect)
```tsx
<ISelect
  label="Rent review mechanism"
  value={String(form.socialInputs?.rentReviewMechanism ?? 'Fixed')}
  onChange={v => setField('socialInputs.rentReviewMechanism', v)}
  options={[
    { value: 'Fixed', label: 'Fixed (no review)' },
    { value: 'RPI', label: 'RPI linked' },
    { value: 'CPI', label: 'CPI linked' },
    { value: 'Annual % increase', label: 'Annual % increase' },
    { value: 'Market rate review', label: 'Market rate review' },
  ]}
/>
```

### R2R — Sublet type (ISelect)
```tsx
<ISelect
  label="Sublet type"
  value={String(form.r2rInputs?.subletType ?? '')}
  onChange={v => setField('r2rInputs.subletType', v)}
  options={[
    { value: 'AST', label: 'AST (single tenancy)' },
    { value: 'HMO', label: 'HMO (multi-tenant)' },
    { value: 'SA', label: 'Short-term / serviced accommodation' },
    { value: 'Mixed', label: 'Mixed' },
  ]}
/>
```

### BRRR — Refinance mortgage type (ISelect)
Find the BRRR refinance section and replace the refinance type text field:
```tsx
<ISelect
  label="Refinance type"
  value={String(form.brrrInputs?.refinanceMortgageType ?? 'Interest only')}
  onChange={v => setField('brrrInputs.refinanceMortgageType', v)}
  options={[
    { value: 'Interest only', label: 'Interest only' },
    { value: 'Repayment', label: 'Repayment' },
  ]}
/>
```

---

## STEP 5 — After making all changes

1. Run `npx tsc --noEmit` — zero errors required
2. Verify `ISelectOther` correctly shows the free-text input when "Other (enter manually)" is selected, and that selecting a known option hides it
3. Verify that setting a value via `setField` programmatically (simulating what the scraper does) still updates the displayed selection correctly
4. Commit: `git add -A && git commit -m "feat: dropdown fields — ISelect + ISelectOther components, replace 25 text fields with typed selects across all input sections" && git push origin stage-6`
5. Report which fields were converted and confirm tsc passes

---

## Canonical value reference (for scraper alignment)

When the scraper or API auto-populates fields, it must set values that exactly match the option `value` strings below. Store these in a comment block in the scraper function for reference.

| Field | Canonical values |
|---|---|
| propertyType | `Terraced house`, `End-of-terrace house`, `Semi-detached house`, `Detached house`, `Flat / Apartment`, `Studio flat`, `Maisonette`, `Bungalow (detached)`, `Bungalow (semi-detached)`, `Converted flat`, `Purpose-built flat`, `HMO`, `Block of flats`, `Commercial / mixed use`, `Land` |
| tenure | `Freehold`, `Leasehold`, `Share of freehold`, `Commonhold` |
| epcRating | `A`, `B`, `C`, `D`, `E`, `F`, `G`, `Unknown` |
| floodRisk | `Low`, `Medium`, `High`, `Very high`, `Unknown` |
| buyerType | `Standard`, `First-time buyer`, `Ltd company`, `Non-UK resident` |
| constructionType | `Standard (brick/block)`, `Steel frame`, `Timber frame`, `Concrete (prefab/BISF)`, `Stone`, `Wimpey no-fines`, `Airey / PRC` |
| councilTaxBand | `A` – `H`, `Unknown` |
| listedStatus | `None`, `Grade II`, `Grade II*`, `Grade I`, `Grade A (Scotland)`, `Grade B (Scotland)`, `Grade C (Scotland)` |
| ownershipStructure | `Personal name`, `Ltd company`, `LLP`, `Trust` |
| incomeTaxBand | `20%`, `40%`, `45%` |
| mortgageType | `Interest only`, `Repayment` |
| groundRentReviewClause | `None`, `RPI`, `CPI`, `Doubling`, `Fixed amount`, `Unknown` |

Any value not in this list will be treated as an "Other" free-text value by `ISelectOther`, or will fall through to `— select —` in `ISelect`. Scrapers should map portal-specific strings to these canonical values before calling `setField`.
