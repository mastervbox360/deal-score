# REPLIT PROMPT 14ag — Sticky band: use background inherit

## Why
The sticky band is set to `background: '#f5f6f8'` but still appears as a visibly different shade from the surrounding page. This means the band's **direct parent element** has a different background than `body` — and `#f5f6f8` matches `body`, not the parent. Using `background: 'inherit'` forces the sticky band to take exactly the same background as its direct parent, guaranteed to match regardless of what that value is.

**Dependency:** Prompt 14af merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ag: sticky band background inherit" && git push origin stage-6`

---

## FIX — AnalysisHub.tsx AND DealOverview.tsx

In both files, find the sticky outer div. Change `background: '#f5f6f8'` to `background: 'inherit'`:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: 'inherit',   // ← inherits exact background from direct parent
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  marginBottom: 8,
}}>
```

That is the **only change** needed. No other modifications.

---

## Why inherit works here
The sticky band has no `borderRadius` so there are no transparent corner triangles — `inherit` is safe. The band picks up the parent's background at render time, so even if the parent's colour changes or uses a CSS variable, the band always matches perfectly.

---

## Summary checklist
- [ ] AnalysisHub.tsx sticky outer: `background: 'inherit'`
- [ ] DealOverview.tsx sticky outer: `background: 'inherit'`
- [ ] Scroll page — band completely invisible against the page background
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
