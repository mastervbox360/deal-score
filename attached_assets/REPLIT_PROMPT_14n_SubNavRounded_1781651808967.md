# REPLIT PROMPT 14n — Sub-tab bands: rounded corners + Analysis gap

## What this does
1. Add rounded corners to both the Overview and Analysis sticky sub-tab bands so they match the other section cards on the page
2. Add a gap below the Analysis sub-tab band (same breathing room as Overview)

**Dependency:** Prompt 14m merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14n: sub-tab bands rounded corners + analysis gap" && git push origin stage-6`

---

## FIX 1 — Both bands: rounded corners + full border

For **both** the Overview band (in `DealOverview.tsx`) and the Analysis band (in `AnalysisHub.tsx`), update the outer sticky div:

Change `borderBottom: '.5px solid var(--ds-border)'` → `border: '.5px solid var(--ds-border)'` (all four sides)

Add `borderRadius: 10` and `boxShadow: '0 1px 3px rgba(0,0,0,.06)'` to match the other section cards.

The outer sticky div for each band should end up like:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: '#fff',
  border: '.5px solid var(--ds-border)',
  borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  marginBottom: 10,   // ← gap below (applies to both)
}}>
  {/* inner div with padding and content */}
</div>
```

---

## FIX 2 — Analysis band: gap below

The `marginBottom: 10` on the outer div (above) handles this for both bands. No additional change needed — just confirm the Analysis band has the same `marginBottom: 10` applied.

---

## Summary checklist
- [ ] Overview band: `border` (all sides), `borderRadius: 10`, `boxShadow`, `marginBottom: 10`
- [ ] Analysis band: `border` (all sides), `borderRadius: 10`, `boxShadow`, `marginBottom: 10`
- [ ] Both bands: `borderBottom` replaced with `border`
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
