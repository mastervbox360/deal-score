# REPLIT PROMPT 14ak — Seller section header fix + page improvements

## Scope
Three fixes based on a full inputs page audit:
1. Seller section header — remove icon + sub-description, match standard Sec style
2. Leasehold details — only render when Leasehold tenure is selected
3. Sold price comparables — improve empty state

**Dependency:** Prompt 14aj merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ak: seller header fix + page improvements" && git push origin stage-6`

---

## FIX 1 — Seller section: match standard Sec header style

The Seller section currently renders a blue circle icon + "Seller" heading + "Add seller contact details" sub-description. Every other section uses the standard `Sec` component which has just the section title + an optional badge (Complete/Optional) — no icon, no sub-description.

### What to change in the Seller section JSX:

Remove the icon circle and sub-description entirely. Replace with the standard `Sec` component (or match its exact inline style pattern):

```tsx
{/* BEFORE — remove this custom header: */}
<div style={{ display: 'flex', alignItems: 'center', gap: 12, ... }}>
  <div style={{ /* blue circle icon */ }}>
    <PersonIcon />
  </div>
  <div>
    <div>Seller</div>
    <div style={{ fontSize: 12, color: ... }}>Add seller contact details</div>
  </div>
  <span>Optional</span>
</div>

{/* AFTER — use standard Sec component: */}
<Sec title="Seller" badge="Optional" />
```

If `Sec` is not importable here, replicate the exact same header style used by "Property information", "Property & purchase", etc. — the section title at the same font size/weight/colour, with the Optional badge on the right. No icon, no sub-description line.

### Seller location
Keep the Seller section in its current position (before Deal terms). Both are optional CRM/commercial fields — grouping them at the end of the financial sections is correct and intuitive.

---

## FIX 2 — Leasehold details: conditional rendering

The "Leasehold details" section should only render when the user has selected **Leasehold** tenure. When Freehold is selected, the section should not appear at all.

Find the Leasehold details section in the JSX. Wrap it in a conditional:

```tsx
{/* Only show when leasehold is selected */}
{deal.tenure === 'leasehold' && (
  <Sec title="Leasehold details">
    {/* existing leasehold fields */}
  </Sec>
)}
```

The tenure field is likely stored as `deal.tenure` or similar — check the actual field name used elsewhere in the file and use the same value check. The condition should match whatever value is set when the user clicks the "Leasehold" toggle button.

---

## FIX 3 — Sold price comparables: improve empty state

The sold price comparables section at the bottom shows a large empty area with only "No sold price data yet — click Refresh to fetch comparables for this postcode." This reads as dead space.

Replace with a more compact, helpful empty state:

```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px',
  background: '#fff',
  border: '1px solid var(--ds-border, #e3e5e9)',
  borderRadius: 10,
}}>
  <div>
    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1, #1a1a2e)', marginBottom: 2 }}>
      Sold price comparables
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-2, #6c757d)' }}>
      No data yet — fetch sold prices for this postcode
    </div>
  </div>
  <button
    onClick={handleRefreshComps}
    style={{
      fontSize: 12,
      padding: '6px 14px',
      borderRadius: 6,
      border: '1px solid var(--ds-border)',
      background: '#fff',
      color: 'var(--navy, #1B3A6B)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontWeight: 500,
    }}
  >
    ↻ Refresh
  </button>
</div>
```

This is compact (single row with action on the right) rather than a large empty card.

---

## Summary checklist
- [ ] Seller section: no icon circle, no sub-description, uses standard Sec header style
- [ ] Seller section: `badge="Optional"` visible on right
- [ ] Leasehold details section: only renders when `tenure === 'leasehold'` (or equivalent)
- [ ] Sold price comparables: compact single-row empty state with inline Refresh button
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
