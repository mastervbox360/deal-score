# REPLIT PROMPT 14c — Inputs Structural Reorganisation

## What this does
Structural changes to `ViewInputs` that were deferred from Prompt 14b. These involve moving fields between sections, redesigning components, and reordering the entire section sequence. Run this after Prompt 14b is committed and TypeScript is clean.

**Dependency:** Prompt 14b must be merged and passing `tsc --noEmit` before starting this.

**Reference:** `04_Mockups/UI_Screens/_Confirmed/ds_inputs_v8.html`

---

## Target files
- `artifacts/dealscore/src/components/AnalysisHub.tsx` — ViewInputs only

## Standing rules
- Read the file in full before touching it
- npx tsc --noEmit must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14c: Inputs structural reorganisation" && git push origin stage-6`

---

## FIX R — Inner group labels: grey uppercase throughout

Every label that titles a group of fields *inside* a section card must use the grey label style. Examples: "MOTIVATION", "SITUATION NOTES", "FULL NAME / PHONE / EMAIL", "STANDARD HOLD", "BUY, REFURB, REFINANCE (BRRR & VARIANTS)", "TRADE", "OWNERSHIP STRUCTURE", "INCOME TAX BAND".

These must all use:
```tsx
<div style={{
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#999',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}}>
  LABEL TEXT
  <span style={{ flex: 1, height: 0.5, background: 'var(--ds-border)', display: 'block' }} />
</div>
```

Do NOT apply this style to card-level titles (e.g. "Property information", "Property photos") — those stay as dark 14px/600 headings from Prompt 14b.

---

## FIX S — Bathrooms: move into mandatory visible fields

Bathrooms is currently in the "Optional details" collapsible. Move it into the main mandatory grid of Property information.

New row 2 of the mandatory grid: **Bathrooms** | **Tenure** | **Source of deal**

Remove Bathrooms from the optional details group entirely. The mandatory grid after this change:

```
Row 1: Address (span 2 cols) | Property type | Bedrooms
Row 2: Bathrooms             | Tenure        | Source of deal
Row 3: EPC Rating (GOV.UK)   | Flood Risk (GOV.UK) | [empty]
```

---

## FIX T — "Complete" chip on ALL section cards

Prompt 14b added the Complete chip to Property information only. Extend the same logic to every section card:

- Property information *(already done in 14b — verify it's there)*
- Property & purchase
- Purchase financing
- Refurb
- Monthly costs
- Ownership & Tax
- Strategy-specific fields *(only count mandatory fields for the active strategy)*
- Seller
- Deal terms

Define a small helper to keep this DRY. Each section knows its own mandatory field keys:

```tsx
function isComplete(deal: Partial<ParsedInputs>, fields: (keyof ParsedInputs)[]): boolean {
  return fields.every(f => {
    const v = deal[f]
    return v !== undefined && v !== null && v !== ''
  })
}
```

Example usage in Property & purchase card header:
```tsx
const purchaseComplete = isComplete(deal, ['purchasePrice', 'marketValue', 'country'])

<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Property & purchase</span>
  {purchaseComplete && (
    <span style={{ fontSize: 11, fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '2px 9px', borderRadius: 20 }}>
      Complete
    </span>
  )}
</div>
```

Define the mandatory field list per section — be conservative (only fields the calculator genuinely needs, not optional enrichment fields):

| Section | Mandatory fields for Complete chip |
|---|---|
| Property & purchase | `purchasePrice`, `marketValue`, `country` |
| Purchase financing | `financeMethod` + (if mortgage: `depositPercent`, `mortgageRate`) |
| Refurb | `refurbCost` — or mark Complete if `refurbCost === 0` (no refurb) |
| Monthly costs | `managementFeePercent`, `voidAllowancePercent` |
| Ownership & Tax | `ownershipStructure`, `taxBand` |
| Strategy-specific | Strategy-dependent — BTL: `monthlyRent`; HMO: `hmoRooms` + `hmoRentPerRoom`; FLIP: `expectedSalePrice` |
| Seller | `sellerName` (just a name is enough — rest is optional enrichment) |
| Deal terms | `sourcingFee` (or 0 if no sourcing fee — field must have been touched) |

If a section has no mandatory fields (e.g. Property photos, Route & Strategy), do not show a Complete chip — those sections are always open/neutral.

---

## FIX U — Seller section: full redesign

### U1 — CRM search stub at top

Add a search input at the very top of the Seller card, above all manual fields. Full wiring is deferred to Prompt 19 — this is a UI stub only.

```tsx
{/* CRM search — stub, wiring in Prompt 19 */}
<div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '.5px solid var(--ds-border)' }}>
  <input
    type="text"
    placeholder="Search existing sellers by name, phone or email…"
    readOnly
    style={{
      width: '100%',
      padding: '8px 11px',
      borderRadius: 7,
      border: '.5px solid var(--ds-border)',
      fontSize: 13,
      background: 'var(--bg-sec)',
      color: '#444',
      outline: 'none',
      fontFamily: 'inherit',
      cursor: 'text',
    }}
  />
  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 5 }}>
    Or fill in manually below to create a new seller record
  </div>
</div>
```

### U2 — Contact fields: Full name · Phone · Email in a 3-column grid

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 9, marginBottom: 14 }}>
  {/* Full name */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999' }}>Full name</div>
    <input type="text" placeholder="Seller full name" value={deal.sellerName ?? ''}
      onChange={(e) => updateDeal({ sellerName: e.target.value })}
      style={{ padding: '7px 10px', borderRadius: 7, border: '.5px solid var(--ds-border)', fontSize: 13, background: '#fff', color: '#222', outline: 'none', width: '100%', fontFamily: 'inherit' }} />
  </div>
  {/* Phone */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999' }}>Phone</div>
    <input type="tel" placeholder="e.g. 07700 900 123" value={deal.sellerPhone ?? ''}
      onChange={(e) => updateDeal({ sellerPhone: e.target.value })}
      style={{ padding: '7px 10px', borderRadius: 7, border: '.5px solid var(--ds-border)', fontSize: 13, background: '#fff', color: '#222', outline: 'none', width: '100%', fontFamily: 'inherit' }} />
  </div>
  {/* Email */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999' }}>Email</div>
    <input type="email" placeholder="e.g. john@email.com" value={deal.sellerEmail ?? ''}
      onChange={(e) => updateDeal({ sellerEmail: e.target.value })}
      style={{ padding: '7px 10px', borderRadius: 7, border: '.5px solid var(--ds-border)', fontSize: 13, background: '#fff', color: '#222', outline: 'none', width: '100%', fontFamily: 'inherit' }} />
  </div>
</div>
```

If `sellerEmail` doesn't exist on the `Deal` type, add it as `sellerEmail?: string`.

### U3 — Motivation: compact wrapping pills

Replace the current stacked full-width rows with compact wrapping pill chips. 8 rows → 2–3 lines:

```tsx
{/* Motivation label */}
<div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
  MOTIVATION
  <span style={{ flex: 1, height: 0.5, background: 'var(--ds-border)', display: 'block' }} />
</div>

{/* Pills */}
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
  {[
    'Motivated seller', 'Below market value', 'Probate / estate',
    'Repossession', 'Divorce', 'Relocated abroad', 'Developer exit', 'Other'
  ].map((opt) => {
    const isActive = deal.sellerMotivation === opt
    return (
      <button
        key={opt}
        onClick={() => updateDeal({ sellerMotivation: isActive ? '' : opt })}
        style={{
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          borderRadius: 20,
          border: `.5px solid ${isActive ? 'var(--navy)' : 'var(--ds-border)'}`,
          background: isActive ? 'var(--navy)' : '#fff',
          color: isActive ? '#fff' : '#555',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all .15s',
        }}
      >
        {opt}
      </button>
    )
  })}
</div>
```

### U4 — Situation notes

Keep the situation notes textarea, with grey group label above it:

```tsx
<div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
  SITUATION NOTES
  <span style={{ flex: 1, height: 0.5, background: 'var(--ds-border)', display: 'block' }} />
</div>
<textarea
  placeholder="e.g. relocating to Scotland, needs to complete before end of month. Open to negotiation."
  value={deal.sellerNotes ?? ''}
  onChange={(e) => updateDeal({ sellerNotes: e.target.value })}
  rows={3}
  style={{ padding: '8px 10px', borderRadius: 7, border: '.5px solid var(--ds-border)', fontSize: 13, background: '#fff', color: '#222', outline: 'none', width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
/>
```

---

## FIX V — Auction purchase: absorb into Property & Purchase

Remove the standalone "Auction purchase?" card entirely. Inside the Property & Purchase section, add a checkbox row after the purchase price / market value fields:

```tsx
{/* Auction purchase checkbox — inside Property & Purchase, after purchase price row */}
<label style={{
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '8px 11px',
  background: deal.auctionPurchase ? 'var(--navy-light, #eef3fb)' : 'var(--bg-sec)',
  border: `.5px solid ${deal.auctionPurchase ? 'var(--navy)' : 'var(--ds-border)'}`,
  borderRadius: 7,
  cursor: 'pointer',
  fontSize: 13,
  color: deal.auctionPurchase ? 'var(--navy)' : '#555',
  fontWeight: deal.auctionPurchase ? 500 : 400,
  transition: 'all .15s',
  userSelect: 'none',
}}>
  <input
    type="checkbox"
    checked={deal.auctionPurchase ?? false}
    onChange={(e) => updateDeal({ auctionPurchase: e.target.checked })}
    style={{ accentColor: 'var(--navy)', width: 14, height: 14 }}
  />
  This is an auction purchase
</label>

{deal.auctionPurchase && (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9, marginTop: 8 }}>
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#bbb', marginBottom: 4 }}>Auction date</div>
      <input type="date" value={deal.auctionDate ?? ''} onChange={(e) => updateDeal({ auctionDate: e.target.value })}
        style={{ padding: '7px 10px', borderRadius: 7, border: '.5px solid var(--ds-border)', fontSize: 13, width: '100%', fontFamily: 'inherit', outline: 'none' }} />
    </div>
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#bbb', marginBottom: 4 }}>Reserve price</div>
      <input type="number" placeholder="e.g. £220,000" value={deal.auctionReserve ?? ''} onChange={(e) => updateDeal({ auctionReserve: Number(e.target.value) })}
        style={{ padding: '7px 10px', borderRadius: 7, border: '.5px solid var(--ds-border)', fontSize: 13, width: '100%', fontFamily: 'inherit', outline: 'none' }} />
    </div>
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#bbb', marginBottom: 4 }}>Completion deadline</div>
      <input type="date"
        value={deal.auctionDate
          ? new Date(new Date(deal.auctionDate).getTime() + 28 * 86400000).toISOString().split('T')[0]
          : ''}
        readOnly
        style={{ padding: '7px 10px', borderRadius: 7, border: '.5px solid var(--ds-border)', fontSize: 13, width: '100%', fontFamily: 'inherit', outline: 'none', background: 'var(--bg-sec)', color: 'var(--text-2)' }} />
    </div>
  </div>
)}
```

If `auctionDate`, `auctionReserve` don't exist on the Deal/ParsedInputs type, add them as optional fields.

---

## FIX W — MDR: absorb into Purchase costs breakdown

Remove MDR from any standalone position. Add it as a single checkbox row directly below the auto-calculated SDLT field inside the Purchase costs breakdown sub-group. Hidden when Country is SCOTLAND or WALES (MDR only applies to SDLT):

```tsx
{/* MDR — shown only for England/N.Ireland (SDLT) */}
{(deal.country === 'ENGLAND' || !deal.country) && (
  <label style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px',
    background: deal.mdrApplies ? 'var(--navy-light, #eef3fb)' : 'transparent',
    border: `.5px solid ${deal.mdrApplies ? 'var(--navy)' : 'transparent'}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    color: deal.mdrApplies ? 'var(--navy)' : 'var(--text-2)',
    transition: 'all .15s',
    userSelect: 'none',
    marginTop: 4,
  }}>
    <input
      type="checkbox"
      checked={deal.mdrApplies ?? false}
      onChange={(e) => updateDeal({ mdrApplies: e.target.checked })}
      style={{ accentColor: 'var(--navy)', width: 13, height: 13 }}
    />
    Multiple Dwellings Relief (MDR) applies
    <span style={{ fontSize: 10, color: 'var(--text-2)', marginLeft: 4 }}>— recalculates SDLT</span>
  </label>
)}
```

If `mdrApplies` doesn't exist on the Deal type, add it as `mdrApplies?: boolean`.

---

## FIX X — Section order: resequence all sections

Reorder the rendered sections in ViewInputs to this exact sequence. Do NOT change the internal content of any section — just move the JSX blocks into this order:

1. **Property information** (mandatory fields + optional strip)
2. **Property photos**
3. **Step 1 of 2 — Route** (Buy / Rent / Specialist)
4. **Step 2 of 2 — Strategy selection** (tiles + Manual/SC toggle)
5. **Property & Purchase** (purchase price · market value · country · auction checkbox [FIX V] · SDLT auto · purchase costs breakdown · MDR checkbox [FIX W])
6. **Purchase financing** (method tiles · mortgage/bridging/cash params)
7. **Refurb** (cost · contingency · post-refurb value · refurb financing)
8. **Monthly costs** (management fee · insurance · maintenance · void · service charge [leasehold] · ground rent [leasehold])
9. **Ownership & Tax** (ownership structure · tax band · joint ownership · Section 24 note)
10. **Strategy-specific fields** (only active strategy shown)
11. **Seller** (CRM search stub [FIX U1] · contact grid [FIX U2] · motivation pills [FIX U3] · situation notes [FIX U4])
12. **Deal terms** (sourcing fee · cooling-off period · payment terms · completion date)
13. **Sold price comparables**

Key moves from current order:
- Auction purchase standalone card → deleted, absorbed into #5
- MDR standalone position → deleted, absorbed into #5
- Ownership & Tax → moves before Strategy-specific fields (#9, was after Seller)
- Seller → moves after Strategy-specific (#11, was earlier)

---

## TypeScript notes

Fields being added that may need type declarations:

| Field | Type | Where to add |
|---|---|---|
| `sellerEmail` | `string \| undefined` | `ParsedInputs` or `Deal` type |
| `auctionDate` | `string \| undefined` | `ParsedInputs` or `Deal` type |
| `auctionReserve` | `number \| undefined` | `ParsedInputs` or `Deal` type |
| `mdrApplies` | `boolean \| undefined` | `ParsedInputs` or `Deal` type |

Find the existing type definition file (likely `types.ts` or inside `AnalysisHub.tsx`) and add these before editing the JSX.

---

## Summary checklist

- [ ] **R**: All inner group labels use grey (#999) + trailing rule — no exceptions
- [ ] **S**: Bathrooms in mandatory grid row 2 (Bathrooms · Tenure · Source of deal), removed from optional
- [ ] **T**: `isComplete()` helper defined; Complete chip on all 9 sections with correct mandatory field lists
- [ ] **U1**: CRM search stub at top of Seller card
- [ ] **U2**: Contact grid — Full name (2fr) · Phone (1fr) · Email (1fr)
- [ ] **U3**: Motivation pills — wrapping, compact, togglable
- [ ] **U4**: Situation notes textarea with grey group label
- [ ] **V**: Standalone Auction purchase card removed; checkbox inside Property & Purchase reveals auction date / reserve / completion deadline
- [ ] **W**: MDR standalone removed; checkbox below SDLT in purchase costs; hidden on SCOTLAND / WALES
- [ ] **X**: All 13 sections in the correct order
- [ ] **Type declarations**: `sellerEmail`, `auctionDate`, `auctionReserve`, `mdrApplies` added to types

## After completing
1. Run `npx tsc --noEmit` — zero errors required
2. Screenshot the full inputs page — confirm section order and all section headers
3. Push: `git add -A && git commit -m "Stage 10 — Prompt 14c: Inputs structural reorganisation" && git push origin stage-6`

## Tell me
1. Which of the 7 structural fixes was most complex
2. Full-scroll screenshot of the inputs page
3. Any TypeScript errors encountered and how they were resolved
