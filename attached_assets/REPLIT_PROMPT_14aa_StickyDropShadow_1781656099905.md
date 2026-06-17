# REPLIT PROMPT 14aa — Sticky band: single div + drop-shadow (no border, no outer wrapper)

## What this does
Collapses the two-layer sticky band back to a single div. Uses `filter: drop-shadow` instead of `border` or `boxShadow` — `drop-shadow` respects `borderRadius` so the shadow follows the rounded card shape exactly, giving soft visual definition without any hard rectangular line or visible boxy outline.

**Dependency:** Prompt 14z merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14aa: sticky band single div + drop-shadow" && git push origin stage-6`

---

## THE FIX — Both bands (DealOverview.tsx + AnalysisHub.tsx)

Replace the entire two-div sticky band structure with a single div:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: '#fff',
  borderRadius: 10,
  filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.10))',  // follows borderRadius — no hard boxy line
  marginBottom: 10,   // gap below in normal flow
  // NO border, NO boxShadow, NO paddingBottom, NO outer wrapper
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
  }}>
    {/* tab buttons and right-side indicator — unchanged */}
  </div>
</div>
```

**Why this works:**
- `filter: drop-shadow` renders the shadow only around the actual visible pixels of the element (respects the rounded shape) — no hard border line, no rectangular box
- Single div = no outer rectangle visible at all
- `marginBottom: 10` creates the gap in normal flow between the sticky band and the next section
- No `paddingBottom` = no inner gap area that needs a background color = no colour mismatch seam

Apply to both `AnalysisHub.tsx` and `DealOverview.tsx`. Remove the outer wrapper div entirely — there should be only ONE div for the sticky band now.

---

## Summary checklist
- [ ] Single sticky div on both bands (no inner/outer structure)
- [ ] `background: '#fff'`, `borderRadius: 10`, `filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.10))'`
- [ ] `marginBottom: 10`, NO `paddingBottom`, NO `border`, NO `boxShadow`
- [ ] Existing inner content div (`padding: '8px 0'`, flex layout) kept as-is
- [ ] Both `AnalysisHub.tsx` and `DealOverview.tsx` updated
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
