# REPLIT PROMPT 14aq — Field-level info icons on complex/specialist fields

## What this does
Adds a small ⓘ tooltip to specific field labels where the term is non-obvious, the correct value is non-intuitive, or where DealScore's calculation logic is worth explaining. Not every field — only the ones where a new or intermediate investor would genuinely benefit from context.

**Dependency:** Prompt 14ap merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14aq: field-level info icons" && git push origin stage-6`

---

## PART A — Add `info` prop to IField component

The `IField` component renders individual field labels. Add an optional `info` prop that renders the same ⓘ tooltip pattern used in the Sec component (from 14ap):

```tsx
interface IFieldProps {
  label: string;
  info?: string;    // ← new
  // ... existing props
}
```

In the label row of IField, add the icon immediately after the label text — same tooltip implementation as Sec:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
  <label style={{ fontSize: 11, fontWeight: 500, color: '#52606d', textTransform: 'uppercase', letterSpacing: '.04em' }}>
    {label}{required && <span style={{ color: 'var(--teal,#1D9E75)', marginLeft: 2 }}>*</span>}
  </label>
  {info && <InfoIcon text={info} />}
</div>
```

Extract the tooltip into a shared `<InfoIcon text={string} />` component so both Sec and IField reuse the same implementation:

```tsx
// Shared component — create InfoIcon.tsx or define inline:
const InfoIcon = ({ text }: { text: string }) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
        style={{ color: 'var(--text-2,#6c757d)', cursor: 'default', flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M8 7v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="8" cy="4.5" r="0.8" fill="currentColor"/>
      </svg>
      {visible && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          background: 'var(--navy,#1B3A6B)',
          color: '#fff',
          fontSize: 12,
          lineHeight: 1.5,
          padding: '8px 12px',
          borderRadius: 8,
          width: 240,
          pointerEvents: 'none',
          zIndex: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          whiteSpace: 'normal',
        }}>
          {text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid var(--navy,#1B3A6B)',
          }} />
        </div>
      )}
    </div>
  );
};
```

Also update the Sec component from 14ap to use this shared `<InfoIcon>` instead of its inline implementation — keeps the codebase DRY.

---

## PART B — Apply info prop to these specific fields (verbatim copy)

### Purchase financing section

**DEPOSIT %**
```
info="Your cash contribution as a percentage of the purchase price. Most buy-to-let lenders require a minimum 25% deposit. A higher deposit reduces your monthly mortgage payment but increases your upfront cash-in."
```

**MORTGAGE RATE (%)**
```
info="The annual interest rate on your mortgage. DealScore defaults to 5.5% if left blank — shown with an 'est.' badge on your results. Use your lender's actual rate for an accurate cash flow calculation."
```

**TERM (YEARS)**
```
info="The mortgage term affects your monthly repayment amount. Interest-only mortgages ignore this field — your monthly payment is interest only. Repayment mortgages use this to calculate capital repayment on top of interest."
```

**REVERSION / SVR RATE (%)**
```
info="The Standard Variable Rate your mortgage reverts to when your fixed term ends. Important for stress-testing — if your deal only works at the initial rate but not the SVR, it may not be viable long-term."
```

**FIXED RATE ENDS**
```
info="When your fixed rate period expires and the mortgage reverts to the SVR. DealScore uses this for timeline awareness — deals where the fixed rate ends soon carry more refinancing risk."
```

---

### Monthly costs section

**VOID ALLOWANCE (%)**
```
info="An allowance for periods when the property is unoccupied and generating no rent. DealScore defaults to 8.3% (equivalent to 4 weeks per year) if left blank. A higher void rate — common in student lets or SA — will reduce your net cash flow significantly."
```

**MANAGEMENT FEE (%)**
```
info="Letting agent fee as a percentage of gross monthly rent — typically 8–12% for a managed service. If you self-manage, set this to 0%. DealScore defaults to 10% if left blank."
```

**MAINTENANCE RESERVE (£/MO)**
```
info="A monthly provision for repairs and upkeep. DealScore defaults to 5% of gross rent if left blank. Older properties, HMOs and properties with communal areas typically require a higher reserve."
```

---

### Property & purchase section

**LTT (AUTO-CALCULATED)**
```
info="Land Transaction Tax (Wales) / Stamp Duty Land Tax (England & N. Ireland) / Land and Buildings Transaction Tax (Scotland). Calculated automatically from your purchase price and country. Includes the 3% surcharge for additional dwellings. Check current bands via the link below."
```

**MDR checkbox (if present)**
```
info="Multiple Dwellings Relief reduces the SDLT/LTT rate by calculating tax on the average price per dwelling rather than the total. Applicable if purchasing 2+ self-contained units in a single transaction — for example a house with an annex. Always verify with your solicitor."
```

---

### Purchase financing section

**LTV (AUTO-CALCULATED)**
```
info="Loan to Value — the mortgage amount as a percentage of the purchase price. Calculated automatically from your deposit percentage. Most buy-to-let lenders cap LTV at 75% (25% deposit). Some specialist lenders go to 80% but at higher rates."
```

---

### BTL / HMO project details section

**INITIAL VOID PERIOD (WEEKS)**
```
info="The time between purchase completion and your first paying tenant moving in. Typically 4–8 weeks for a standard BTL. This period costs you mortgage payments with no rental income — it's factored into your first-year cash flow."
```

**VOID ALLOWANCE within HMO (if separate field)**
```
info="HMO voids are typically calculated per room. A room vacant for 4 weeks in a 5-room HMO represents a 20% void that month — significantly more impact than a single BTL void. Allow for 10–15% vacancy in your HMO projections."
```

---

### Ownership & tax section

**INCOME TAX BAND**
```
info="Your marginal income tax rate. Used to calculate post-tax cash flow. Basic rate (20%) and higher rate (40%) produce very different after-tax returns, especially under Section 24 where mortgage interest is not fully deductible for personal landlords."
```

**JOINT OWNERSHIP**
```
info="If owned jointly, rental income and tax liability are split between owners — typically 50/50 unless a Declaration of Trust specifies otherwise. Joint ownership with a lower-rate taxpayer can significantly reduce the overall tax burden."
```

---

## Summary checklist
- [ ] `InfoIcon` extracted as a shared component reused by both Sec and IField
- [ ] Sec component updated to use shared InfoIcon (removes duplicate implementation from 14ap)
- [ ] IField component accepts `info` prop and renders InfoIcon after label
- [ ] All 13 fields above have verbatim info copy applied
- [ ] Tooltip z-index: 300 (above sticky bands and other elements)
- [ ] Tooltip does not cause layout shift — positioned absolute
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
