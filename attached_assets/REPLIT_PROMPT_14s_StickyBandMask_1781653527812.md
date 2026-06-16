# REPLIT PROMPT 14s — Sticky sub-tab band: mask content bleed + permanent gap below

## What this does
Two fixes for both the Overview and Analysis sticky sub-tab bands:
1. **Content bleed through rounded corners** — page content is visible peeking through the corner cutouts as you scroll. Fix by adding a rectangular page-background mask behind the visual card so nothing shows through.
2. **No gap below the strip** — content scrolls right up to the bottom edge of the strip. Fix by adding `paddingBottom` to the outer sticky div.

The visual appearance of the strip (white card, border, radius, shadow) must not change.

**Dependency:** Prompt 14r merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14s: sticky band corner mask + scroll gap" && git push origin stage-6`

---

## The problem

The outer sticky div currently has:
```tsx
<div style={{
  position: 'sticky',
  background: '#fff',
  border: '.5px solid var(--ds-border)',
  borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  marginBottom: 10,
  ...
}}>
```

Because `borderRadius` cuts the corners, the area *outside* the rounded corners but *inside* the sticky div's bounding box is transparent — content scrolling underneath shows through. Also, `marginBottom` on a sticky element only affects the initial layout position, it doesn't maintain a visual gap as content scrolls up from below.

---

## THE FIX — Both bands (DealOverview.tsx + AnalysisHub.tsx)

Convert each sticky band to a **two-layer** structure:

**Outer div** — sticky, rectangular, page background (masks corner bleed), adds scroll gap via `paddingBottom`:
```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: 'var(--bg-body, #f5f6f8)',   // page background — masks corner bleed
  paddingBottom: 10,                          // permanent gap between strip bottom and content below
  marginBottom: 0,                            // no longer needed on outer
}}>
  {/* Inner div — the visible white card */}
  <div style={{
    background: '#fff',
    border: '.5px solid var(--ds-border)',
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
    }}>
      {/* existing sub-tab buttons and right-side indicator — unchanged */}
    </div>
  </div>
</div>
```

**What this achieves:**
- The outer div's `background: var(--bg-body)` fills the full rectangular bounding box (including the corner areas outside the rounded inner card) with the same colour as the page — so nothing shows through the rounded corners
- `paddingBottom: 10` on the outer div creates a permanent coloured gap between the card bottom and whatever content is below — content can never scroll visually closer than 10px to the strip
- The inner div holds all the visual styling — white bg, border, radius, shadow — completely unchanged

**Apply this pattern to both:**
- `DealOverview.tsx` — the Overview / Deal Status sticky band
- `AnalysisHub.tsx` — the Inputs / Results / Sensitivity / Workings sticky band

Do not change the tab buttons, font sizes, padding, or any other styles inside the bands.

---

## Summary checklist
- [ ] Overview sticky band: outer = page-bg + paddingBottom:10, inner = white card with all visual styles
- [ ] Analysis sticky band: outer = page-bg + paddingBottom:10, inner = white card with all visual styles
- [ ] Both bands: `marginBottom` removed from outer div (replaced by `paddingBottom`)
- [ ] No change to tab button styles, sizes, or layout
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
