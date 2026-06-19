# REPLIT PROMPT 14ap — Section info icons with DealScore tooltips

## What this does
1. Adds an `info` prop to the `Sec` component — when provided, renders a small `ⓘ` icon in the grey header next to the title. Hovering shows a tooltip with context about what the section does and why it matters.
2. Removes the postcode format hint from under the address field (wrong place).
3. Wires up DealScore-accurate tooltip copy for all 11 sections.

**Dependency:** Prompt 14ao merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ap: section info icons + tooltips" && git push origin stage-6`

---

## PART A — Update Sec component to support `info` prop

### Add `info` to Sec props type
```tsx
interface SecProps {
  title: string;
  badge?: string;
  badgeVariant?: 'teal' | 'grey';
  info?: string;           // ← new: tooltip text
  children?: React.ReactNode;
}
```

### Add ⓘ icon + tooltip to Sec header

In the Sec component's header div, after the title text, add:

```tsx
{info && (
  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}
    onMouseEnter={e => {
      const tip = (e.currentTarget as HTMLElement).querySelector('.sec-tip') as HTMLElement;
      if (tip) tip.style.opacity = '1';
    }}
    onMouseLeave={e => {
      const tip = (e.currentTarget as HTMLElement).querySelector('.sec-tip') as HTMLElement;
      if (tip) tip.style.opacity = '0';
    }}
  >
    {/* ⓘ icon */}
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
      style={{ color: 'var(--text-2,#6c757d)', cursor: 'default', flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 7v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="4.5" r="0.8" fill="currentColor"/>
    </svg>

    {/* Tooltip */}
    <div className="sec-tip" style={{
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
      opacity: 0,
      transition: 'opacity 0.15s ease',
      zIndex: 200,
      boxShadow: '0 4px 12px rgba(0,0,0,.15)',
      whiteSpace: 'normal',
    }}>
      {info}
      {/* Tooltip arrow */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid var(--navy,#1B3A6B)',
      }} />
    </div>
  </div>
)}
```

---

## PART B — Remove postcode hint from address field

In the Property information section, find the hint text added in 14an:
```tsx
// DELETE this entirely:
<div style={{ fontSize: 11, ... }}>
  Include full postcode with a space (e.g. CF24 1RN) to enable sold price comparables
</div>
```

---

## PART C — Add info prop to every section

Use the exact copy below for each section. Copy must be verbatim.

### 1. Property information
```tsx
<Sec
  title="Property information"
  badge={...}
  info="Core details that identify the deal across DealScore. EPC rating and flood risk are factored into your DealScore penalty — a poor EPC or high flood risk will reduce your score even if the financials are strong."
/>
```

### 2. Seller
```tsx
<Sec
  title="Seller"
  badge="Optional"
  info="Optional CRM record. Linking a seller lets you track relationships across multiple deals. Seller motivation — for example below market value or probate — gives you and your investors important context on why this deal exists and how urgent the seller is."
/>
```

### 3. Property photos
```tsx
<Sec
  title="Property photos"
  badge="Optional"
  info="Photos are used in your investor deal pack. The hero image appears on the deal card in your pipeline and on any shared deal pages. Good photos significantly improve investor engagement."
/>
```

### 4. Property & purchase
```tsx
<Sec
  title="Property & purchase"
  badge={...}
  info="Your entry figures. Purchase price and costs determine total cash-in and your equity on entry. Market value sets your day-one equity gap. Land Transaction Tax (LTT/SDLT) is calculated automatically based on your country and purchase price."
/>
```

### 5. Leasehold details
```tsx
<Sec
  title="Leasehold details"
  info="Leasehold costs — service charge and ground rent — are added to your monthly outgoings and reduce net cash flow. Leases under 80 years attract a DealScore risk flag and can make mortgage financing difficult or impossible."
/>
```

### 6. Purchase financing
```tsx
<Sec
  title="Purchase financing"
  badge={...}
  info="How you're funding the purchase. Mortgage settings calculate your monthly payment and determine how much cash you need upfront. Cash deals show ungeared returns. Bridging finance is typically used for auction purchases or properties unmortgageable at entry."
/>
```

### 7. Refurb
```tsx
<Sec
  title="Refurb"
  badge={...}
  info="Estimated works cost is added to your total cash-in when calculating return on investment. If you're funding the refurb separately — for example via a bridging facility — select Bridging here so DealScore can model the financing cost accurately."
/>
```

### 8. Monthly costs
```tsx
<Sec
  title="Monthly costs"
  badge={...}
  info="Running costs that reduce your gross rent to net monthly cash flow. Management fee, void allowance and maintenance reserve are the biggest drivers. If left blank, DealScore substitutes sensible defaults and marks those figures with an 'est.' badge on your results."
/>
```

### 9. Ownership & tax
```tsx
<Sec
  title="Ownership & tax"
  info="Affects your post-tax cash flow calculation. Personal name landlords cannot deduct mortgage interest from rental profit under Section 24 — only a 20% tax credit applies, which significantly erodes returns for higher-rate taxpayers. A Ltd Co structure avoids Section 24 but has its own costs and tax implications."
/>
```

### 10. BTL project details (and equivalent for HMO / SA — use matching copy per strategy)
```tsx
// BTL:
<Sec
  title="BTL — project details"
  badge={...}
  info="Buy-to-Let income figures. Monthly rent is the primary driver of your gross yield, cash flow and DealScore. The initial void period accounts for the time to find your first tenant — typically 4–8 weeks for a standard BTL."
/>

// HMO:
<Sec
  title="HMO — project details"
  badge={...}
  info="HMO income figures. Enter individual room rents — DealScore totals these to calculate gross income. HMOs typically produce higher yields than standard BTL but carry higher management complexity and licensing requirements."
/>

// SA (Serviced Accommodation):
<Sec
  title="SA — project details"
  badge={...}
  info="Serviced accommodation income figures. Nightly rate and occupancy together determine your gross monthly income. SA returns are highly sensitive to occupancy — a drop from 80% to 60% can turn a cash-flowing deal into a loss."
/>
```

### 11. Deal terms
```tsx
<Sec
  title="Deal terms"
  info="Commercial terms for this deal. Your sourcing fee flows through to the invoice in the Fees & invoice tab. The cooling-off period is tracked in Deal Status — DealScore shows a countdown from reservation date. Target completion date is used for timeline planning."
/>
```

### 12. Sold price comparables
Update the compact comparables card (not a Sec component) to include an inline ⓘ tooltip next to its title:

```tsx
<div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
  Sold price comparables
  {/* Same ⓘ tooltip pattern as Sec, with this copy: */}
  {/* "Land Registry sold prices for nearby properties — useful for validating your purchase price against recent comparable sales. Postcode must include a space (e.g. CF24 1RN) to return results." */}
</div>
```

---

## Summary checklist
- [ ] Sec component: `info` prop added to type + renders ⓘ icon when provided
- [ ] Tooltip: navy background, 240px wide, appears above icon, arrow pointing down
- [ ] Tooltip visible on hover, hidden by default
- [ ] Postcode hint removed from under address field
- [ ] All 11 sections have `info` prop with verbatim copy from above
- [ ] Sold price comparables has inline ⓘ with postcode format note
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
