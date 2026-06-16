# REPLIT PROMPT 14t — Fix seam/line below sticky sub-tab band

## What this does
Prompt 14s introduced a visible faint line/seam at the bottom of the sticky strip gap. This is caused by the inner card's `boxShadow` bleeding into the `paddingBottom` gap area, and/or the outer div background not matching the scroll container background exactly. This prompt removes the seam without changing the visual appearance of the card.

**Dependency:** Prompt 14s merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14t: fix sticky band seam" && git push origin stage-6`

---

## THE FIX — Both bands (DealOverview.tsx + AnalysisHub.tsx)

Two changes to each band:

### 1. Clip the shadow so it doesn't bleed into the gap

Add `overflow: 'hidden'` to the **outer** sticky div. This clips the inner card's box-shadow at the outer div boundary, preventing it from casting into the `paddingBottom` gap area:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(...)',
  zIndex: 100,
  background: 'var(--bg-body, #f5f6f8)',
  paddingBottom: 10,
  overflow: 'hidden',   // ← clips inner card shadow at the outer boundary
}}>
  <div style={{
    background: '#fff',
    border: '.5px solid var(--ds-border)',
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    // keep everything else unchanged
  }}>
    ...
  </div>
</div>
```

### 2. Match the outer div background to the scroll container

If a seam is still visible after adding `overflow: hidden`, it means the outer div's `var(--bg-body, #f5f6f8)` doesn't exactly match the background colour of the scroll container at that point. In that case, change the outer div background to `transparent` instead:

```tsx
background: 'transparent',
```

A transparent outer div means the page background shows through naturally — no colour mismatch possible.

**Try `overflow: hidden` first. If the seam is gone, stop. If it persists, also switch to `background: transparent`.**

Apply both changes to:
- `DealOverview.tsx` — the Overview / Deal Status sticky band outer div
- `AnalysisHub.tsx` — the Inputs / Results / Sensitivity / Workings sticky band outer div

---

## Summary checklist
- [ ] `overflow: 'hidden'` added to outer sticky div on both bands
- [ ] If seam persists: outer div `background` changed to `'transparent'` on both bands
- [ ] No change to inner card styles (white bg, border, radius, shadow)
- [ ] No change to tab button styles
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
