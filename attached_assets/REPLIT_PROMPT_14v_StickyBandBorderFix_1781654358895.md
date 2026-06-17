# REPLIT PROMPT 14v — Fix sticky band visible seam: remove bottom border from inner card

## What this does
The gap below the sticky band (from `paddingBottom: 10` on the outer div) is visible as a seam because the inner card's bottom border sits on the grey gap and reads as a deliberate separator line. Removing `borderBottom` from the inner card makes the gap blend invisibly into the page background.

**Dependency:** Prompt 14u merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14v: sticky band no bottom border — invisible gap" && git push origin stage-6`

---

## THE FIX — Both bands (DealOverview.tsx + AnalysisHub.tsx)

On each band's **inner card div**, replace the single `border` shorthand with individual side properties — keeping top, left, right but removing bottom:

**Before:**
```tsx
<div style={{
  background: '#fff',
  border: '.5px solid var(--ds-border)',
  borderRadius: 10,
}}>
```

**After:**
```tsx
<div style={{
  background: '#fff',
  borderTop: '.5px solid var(--ds-border)',
  borderLeft: '.5px solid var(--ds-border)',
  borderRight: '.5px solid var(--ds-border)',
  borderBottom: 'none',
  borderRadius: 10,
}}>
```

Apply to:
- `DealOverview.tsx` — inner card div of the Overview / Deal Status sticky band
- `AnalysisHub.tsx` — inner card div of the Inputs / Results / Sensitivity / Workings sticky band

Do not change anything else — outer div structure, `paddingBottom`, `background`, tab buttons, or right-side indicator are all unchanged.

---

## Summary checklist
- [ ] Overview inner card: `borderBottom: 'none'`, top/left/right borders kept
- [ ] Analysis inner card: `borderBottom: 'none'`, top/left/right borders kept  
- [ ] Outer div unchanged: `background: 'var(--bg-body, #f5f6f8)'`, `paddingBottom: 10`, no `overflow: hidden`
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
