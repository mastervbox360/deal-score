# REPLIT PROMPT 14w — Sticky band: remove all borders + hardcode outer bg

## What this does
Two nested rounded outlines are visible around the sticky sub-tab bands:
1. The inner card's `.5px` border creates visible arcs at the rounded corners
2. The outer div's `var(--bg-body)` may not resolve to exactly the same colour as the page background, making its rectangular edge faintly visible

Fix: remove all `border` and `boxShadow` from the inner card (white on grey is already visually distinct), and hardcode the outer div background to `#f5f6f8` to guarantee an exact match with the page.

**Dependency:** Prompt 14v merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14w: sticky band clean — no border, hardcoded bg" && git push origin stage-6`

---

## THE FIX — Both bands (DealOverview.tsx + AnalysisHub.tsx)

For each band, the final structure should be:

```tsx
{/* OUTER div — sticky, rectangular, hardcoded page bg, permanent gap below */}
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: '#f5f6f8',   // hardcoded — guarantees exact match with page bg, no CSS var resolution mismatch
  paddingBottom: 10,        // permanent gap below
}}>
  {/* INNER div — white card, rounded, NO border, NO shadow */}
  <div style={{
    background: '#fff',
    borderRadius: 10,
    // no border — white card on #f5f6f8 is already visually distinct
    // no boxShadow — shadow bleeds into paddingBottom gap
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
</div>
```

Apply to:
- `DealOverview.tsx` — Overview / Deal Status band
- `AnalysisHub.tsx` — Inputs / Results / Sensitivity / Workings band

Remove any remaining `border`, `borderTop`, `borderLeft`, `borderRight`, `borderBottom`, or `boxShadow` from the inner card div on both bands.

---

## Summary checklist
- [ ] Outer div: `background: '#f5f6f8'` (hardcoded), `paddingBottom: 10`, no border, no radius, no shadow, no `overflow: hidden`
- [ ] Inner div: `background: '#fff'`, `borderRadius: 10`, NO border (any side), NO boxShadow
- [ ] Tab buttons and layout inside bands unchanged
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
