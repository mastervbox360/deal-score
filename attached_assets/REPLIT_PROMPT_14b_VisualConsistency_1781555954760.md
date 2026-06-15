# REPLIT PROMPT 14b — Inputs Visual Consistency Pass

## What this does
Fixes visual inconsistencies in `ViewInputs` against the confirmed mockup `ds_inputs_v8.html`. This is a CSS/JSX pass only — no logic changes, no new state, no new props. Every change maps to a specific delta from the mockup.

**Reference:** `04_Mockups/UI_Screens/_Confirmed/ds_inputs_v8.html`

---

## Target files
- `artifacts/dealscore/src/components/AnalysisHub.tsx` — ViewInputs only (inline styles + JSX structure)

## Standing rules
- Read the file in full before touching it
- npx tsc --noEmit must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14b: Inputs visual consistency pass" && git push origin stage-6`

---

## THE CANONICAL SECTION HEADING RULE

**Every section label across the entire inputs page must use exactly this style — no exceptions.**

From `ds_inputs_v8.html` `.seclbl`:

```css
font-size: 10px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.08em;
color: #999;
background: transparent;   /* sits on the white .sec card — never coloured */
margin-bottom: 12px;
display: flex;
align-items: center;
gap: 8px;
```

With a trailing horizontal rule extending to the right:
```css
/* ::after pseudo or a sibling <hr>-style element */
content: '';
flex: 1;
height: 0.5px;
background: var(--ds-border);   /* #e3e5e9 */
```

In React inline styles, implement this as:

```tsx
// Reusable section label — use EVERYWHERE a section has a heading
<div style={{
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#999',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}}>
  SECTION TITLE
  <span style={{ flex: 1, height: 0.5, background: 'var(--ds-border)', display: 'block' }} />
</div>
```

**Audit every section in ViewInputs and replace any heading that deviates from this spec.** Common deviations to fix:
- Wrong colour (e.g. `var(--navy)`, `var(--text-2)`, `#6c757d`, `#333`)
- Wrong size (e.g. `11px`, `12px`, `13px`)
- Missing `text-transform: uppercase`
- Missing `letter-spacing`
- Missing trailing rule
- Background set to anything other than transparent (e.g. navy, grey panel)
- Bold/heavier font-weight than 600

**Sub-group labels** (labels within a section, not section-level) should use:
```tsx
<div style={{
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--navy)',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  background: 'var(--navy-light, #eef3fb)',
  borderRadius: 6,
}}>
  Sub-group label
</div>
```
Only use the navy sub-group style for labelling groups of fields *inside* a section (e.g. the Bridging Loan sub-group inside Purchase Financing). The top-level section label always uses `color: #999`.

---

## FIX A — Toggle types: binary fields → Seg2 segmented controls

Fields that currently show as a single-option "No" pill or a basic toggle:
- **Auction purchase** (Yes / No)
- **MDR eligible** (Yes / No)
- **Planning permission** (Yes / No)
- **Uninhabitable** (Yes / No)
- **Currently tenanted** (Yes / No) — if not already done
- **Cash buyer** (Yes / No) — if not already done
- **Joint ownership** (Yes / No) — if not already done

Each must be a `Seg2` segmented control as defined in Prompt 14. If `Seg2` is already defined in the file, use it. If not, add it:

```tsx
function Seg2({
  value, onChange, opts,
}: {
  value: string
  onChange: (v: string) => void
  opts: [string, string]
}) {
  return (
    <div style={{ display: 'flex', gap: 0, border: '.5px solid var(--ds-border)', borderRadius: 20, overflow: 'hidden', width: 'fit-content' }}>
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all .15s',
            background: value === o ? 'var(--navy)' : 'var(--bg-sec)',
            color: value === o ? '#fff' : 'var(--text-2)',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
```

Usage (example for Auction purchase):
```tsx
<Seg2
  value={deal.auctionPurchase ? 'Yes' : 'No'}
  onChange={(v) => updateDeal({ auctionPurchase: v === 'Yes' })}
  opts={['Yes', 'No']}
/>
```

---

## FIX B — Currency placeholders: remove £ prefix boxes, use placeholder text

The mockup does NOT use boxed `£` prefix elements. Replace any `£` prefix box pattern with placeholder text only:

**Remove:**
```tsx
// Do NOT do this
<div style={{ display: 'flex' }}>
  <span style={{ background: '#f5f6f8', border: '.5px solid ...', padding: '7px 10px' }}>£</span>
  <input ... />
</div>
```

**Replace with:**
```tsx
<input
  type="number"
  placeholder="e.g. £250,000"
  value={deal.purchasePrice ?? ''}
  onChange={...}
  style={{
    padding: '7px 10px',
    borderRadius: 7,
    border: '.5px solid var(--ds-border)',
    fontSize: 13,
    background: '#fff',
    color: '#222',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  }}
/>
```

Apply this to: Purchase price, Market value, Expected sale price, Refurb cost, Refurb contingency (if boxed), all cost breakdown fields (solicitor, survey, sourcing fee, etc.), monthly cost fields (buildings insurance, maintenance reserve, service charge, ground rent).

For percentage fields: placeholder should be `e.g. 5.5` (no % symbol box either — the label already states the unit).

---

## FIX C — Country field → stacked list selector

Replace the current Country `<select>` or dropdown with a stacked list of three options matching the mockup:

```tsx
{/* Country — stacked list */}
<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
  {(['ENGLAND', 'SCOTLAND', 'WALES'] as const).map((c) => {
    const label = c === 'ENGLAND' ? 'England & N. Ireland' : c === 'SCOTLAND' ? 'Scotland' : 'Wales'
    const isActive = deal.country === c
    return (
      <button
        key={c}
        onClick={() => updateDeal({ country: c })}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 11px',
          borderRadius: 7,
          border: `.5px solid ${isActive ? 'var(--navy)' : 'var(--ds-border)'}`,
          background: isActive ? 'var(--navy-light, #eef3fb)' : '#fff',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? 'var(--navy)' : '#444',
          transition: 'all .15s',
          textAlign: 'left',
        }}
      >
        {label}
        {isActive && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7l3.5 3.5 5.5-7" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    )
  })}
</div>
```

The tax chip (SDLT / LTT / LBTT) renders **below** this stacked list, derived from `deal.country` — keep that logic as-is from Prompt 14.

---

## FIX D — "Optional details ↓" — remove inline field list from collapsed hint

When the optional details section is collapsed, the hint should only show:
```tsx
<button onClick={() => setShowOptional(v => !v)} style={{ ... }}>
  Optional details {showOptional ? '↑' : '↓'}
</button>
```

Do NOT show field names in the hint text (e.g. "EPC Rating, Flood Risk, Planning..."). The label alone is sufficient. Remove any inline enumeration of optional field names from the collapsed state.

---

## FIX E — Seller motivation → stacked list (3+ options)

Seller motivation has more than 2 options so it must use a stacked list (not pills or a segmented control). Each option is a full-width clickable row with a tick on the active state:

Options:
- Motivated seller
- Below market value
- Probate / estate
- Repossession
- Divorce
- Relocated abroad
- Developer exit
- Other

```tsx
{[
  'Motivated seller', 'Below market value', 'Probate / estate',
  'Repossession', 'Divorce', 'Relocated abroad', 'Developer exit', 'Other'
].map((opt) => {
  const isActive = deal.sellerMotivation === opt
  return (
    <button
      key={opt}
      onClick={() => updateDeal({ sellerMotivation: opt })}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 11px',
        borderRadius: 7,
        border: `.5px solid ${isActive ? 'var(--navy)' : 'var(--ds-border)'}`,
        background: isActive ? 'var(--navy-light, #eef3fb)' : '#fff',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        color: isActive ? 'var(--navy)' : '#444',
        fontWeight: isActive ? 500 : 400,
        transition: 'all .15s',
        marginBottom: 3,
        textAlign: 'left',
        width: '100%',
      }}
    >
      {opt}
      {isActive && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7l3.5 3.5 5.5-7" stroke="var(--navy)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
})}
```

---

## FIX F — Section card treatment: all sections must use `.sec` card style

Every major section in ViewInputs must be wrapped in a card with this treatment:

```tsx
<div style={{
  background: '#fff',
  borderRadius: 10,
  border: '.5px solid var(--ds-border)',
  padding: '16px 18px',
  marginBottom: 10,
}}>
  {/* section label + content */}
</div>
```

**Audit every section.** Common missing cases:
- Property photos card — ensure it has the card treatment
- Seller details section — ensure it has the card treatment
- Sold price comparables section — ensure it has the card treatment (Fix J)
- Any section that renders on a raw `var(--bg-sec)` background without a white card

---

## FIX G — Step 2 strategy section: remove nested inner card

Inside the Step 2 section card, strategy tiles must sit directly on the section's white background. Remove any inner card/panel wrapping the strategy tiles.

**Before (wrong):**
```tsx
<div style={{ background: '#fff', border: '.5px solid ...', borderRadius: 8, padding: 16 }}>
  {/* strategy tiles */}
</div>
```

**After (correct):**
```tsx
{/* strategy tiles sit directly on the Step 2 section background — no inner card */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
  {/* tile components */}
</div>
```

---

## FIX H — Section label style: universal audit and fix

Search ViewInputs for every section heading and confirm it matches the canonical spec in the **CANONICAL SECTION HEADING RULE** section above.

Headings that must be corrected:
- Property information
- Property photos
- Route & strategy (Step 1 label)
- Strategy selection (Step 2 label)
- Property & purchase
- Purchase financing
- Refurb
- Monthly costs
- Strategy-specific fields
- Seller details
- Deal terms
- Sold price comparables

All must use: `fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999'` + trailing `<span>` rule.

None should have:
- Coloured backgrounds on the heading itself
- `var(--navy)` or `var(--text-2)` text colour at section level
- `fontSize > 10` for the section label

---

## FIX I — Purchase costs breakdown: horizontal rule sub-group label

Inside the Property & purchase section, there is a costs breakdown sub-group (Stamp duty, Solicitor fees, Survey, Other costs). Add a thin sub-group label above this block:

```tsx
{/* Sub-group separator */}
<div style={{ height: 0.5, background: 'var(--ds-border)', margin: '10px 0 8px' }} />
<div style={{
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--navy)',
  marginBottom: 8,
  padding: '3px 8px',
  background: 'var(--navy-light, #eef3fb)',
  borderRadius: 6,
  display: 'inline-block',
}}>
  Purchase costs breakdown
</div>
```

This makes it visually clear that Stamp duty + Solicitor fees + Survey + Other costs are sub-fields of the purchase section, not top-level inputs.

---

## FIX J — Sold price comparables: add `.sec` card treatment

The sold price comparables block (if rendered in ViewInputs per Prompt 12) must be wrapped in a white card:

```tsx
<div style={{
  background: '#fff',
  borderRadius: 10,
  border: '.5px solid var(--ds-border)',
  padding: '16px 18px',
  marginBottom: 10,
}}>
  {/* section label */}
  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
    SOLD PRICE COMPARABLES
    <span style={{ flex: 1, height: 0.5, background: 'var(--ds-border)', display: 'block' }} />
  </div>
  {/* comparables table / rows */}
</div>
```

---

## FIX K — GOV.UK source badges on EPC Rating and Flood Risk

EPC Rating and Flood Risk are government-data fields. Add a small GOV.UK badge inline with the field label:

```tsx
{/* Field label with source badge */}
<div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#bbb', display: 'flex', alignItems: 'center', gap: 5 }}>
  EPC Rating
  <span style={{
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#fff',
    background: 'var(--navy)',
    padding: '1px 5px',
    borderRadius: 3,
    opacity: 0.7,
  }}>
    GOV.UK
  </span>
</div>
```

Apply the same badge to Flood Risk.

---

## FIX L — "Leasehold only" inline hint on service charge + ground rent

Instead of fully hiding/showing leasehold fields, show them always but add a grey `leasehold only` hint inline with the label. The field itself should be `disabled` when tenure is Freehold:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
  <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#bbb' }}>
    Service Charge
  </span>
  <span style={{ fontSize: 10, color: '#ccc', fontStyle: 'italic' }}>leasehold only</span>
</div>
<input
  disabled={deal.tenure !== 'Leasehold'}
  placeholder="e.g. £150 /mo"
  ...
  style={{
    ...,
    background: deal.tenure !== 'Leasehold' ? 'var(--bg-sec)' : '#fff',
    color: deal.tenure !== 'Leasehold' ? '#bbb' : '#222',
    cursor: deal.tenure !== 'Leasehold' ? 'not-allowed' : 'text',
  }}
/>
```

Apply to both Service charge /mo and Ground rent /yr.

---

## Summary checklist

Before finishing, verify each fix is in place:

- [ ] **Heading rule**: Every section label → `10px, 600, uppercase, #999` + trailing rule. None coloured navy or grey-bg.
- [ ] **A**: Auction / MDR / Planning → Seg2 segmented control
- [ ] **B**: All £-prefix boxes removed → placeholder text `e.g. £X`
- [ ] **C**: Country → stacked list (England & N.I. / Scotland / Wales)
- [ ] **D**: Optional details hint → label + chevron only, no field enumeration
- [ ] **E**: Seller motivation → stacked list with tick
- [ ] **F**: All sections have white card + `.5px var(--ds-border)` border + 10px radius
- [ ] **G**: Step 2 has no nested inner card around strategy tiles
- [ ] **H**: All section headings audited and uniform
- [ ] **I**: Purchase costs breakdown has sub-group rule label
- [ ] **J**: Sold price comparables has `.sec` card treatment
- [ ] **K**: EPC Rating + Flood Risk have GOV.UK badge
- [ ] **L**: Service charge + ground rent show `leasehold only` hint + disabled when Freehold

## After completing
1. Run `npx tsc --noEmit` — zero errors required
2. Screenshot the inputs page and confirm visual consistency across all sections
3. Push: `git add -A && git commit -m "Stage 10 — Prompt 14b: Inputs visual consistency pass" && git push origin stage-6`

## Tell me
1. Which of the 12 fixes required the most structural change
2. A screenshot of the inputs page after fixes — full scroll showing all sections
3. Any TypeScript errors encountered and how they were resolved
