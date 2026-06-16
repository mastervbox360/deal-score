# REPLIT PROMPT 14k — Overview sub-tab band: constrain width + fix spacing

## What this does
Two small fixes to the Overview sticky sub-tab band:
1. The white band stretches full viewport width — constrain its inner content to match the page column max-width (1280px) so the tabs align with the content below
2. Add even spacing between the band and the first section card below it

**Dependency:** Prompt 14j merged and passing tsc.

## Standing rules
- Read the Overview component file in full before touching it
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14k: overview sub-tab band width + spacing" && git push origin stage-6`

---

## THE CHANGE

Find the sticky wrapper added to the Overview sub-tabs in Prompt 14j. It currently looks like:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(...)',
  zIndex: 100,
  background: '#fff',
  borderBottom: '.5px solid var(--ds-border)',
  display: 'flex',
  alignItems: 'center',
  padding: '8px 20px',
}}>
  {/* Overview / Deal Status buttons */}
</div>
```

Replace with a two-layer approach — outer div handles sticky/background/border, inner div constrains to content width:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: '#fff',
  borderBottom: '.5px solid var(--ds-border)',
}}>
  <div style={{
    maxWidth: 1280,
    margin: '0 auto',
    padding: '8px 24px',
    display: 'flex',
    alignItems: 'center',
  }}>
    {/* Overview / Deal Status buttons — unchanged */}
  </div>
</div>
```

Then find the content area that renders below the sticky band (the scrollable section with the deal card, next actions etc.) and ensure it has `paddingTop: 16` (or whatever consistent gap makes it align with the existing page padding). If the content already has top padding, check it matches `20px` — the same as the rest of the page's `ds-content` padding.

Apply the same two-layer fix to the Analysis sticky sub-nav band in `AnalysisHub.tsx` if it also stretches full width (same pattern: outer div for sticky/bg/border, inner div with `maxWidth: 1280, margin: '0 auto', padding: '8px 24px'`).

---

## Summary checklist

- [ ] Overview sticky band: outer full-width, inner `maxWidth: 1280` + `margin: 0 auto`
- [ ] Overview sticky band: `padding: '8px 24px'` on inner div (tabs align with page content)
- [ ] Content below sub-tab band has `paddingTop: 20` matching page rhythm
- [ ] Same two-layer fix applied to Analysis sticky sub-nav if it also stretches full width
- [ ] `npx tsc --noEmit` zero errors

## After completing
1. `npx tsc --noEmit` — zero errors
2. Screenshot: sub-tab band ending at content column edge, even gap to first section card
3. Commit and push
