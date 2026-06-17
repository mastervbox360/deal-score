# REPLIT PROMPT 14ag — Sticky band: use background inherit

## Why
The sticky band is set to `background: '#f5f6f8'` but still appears as a visibly different shade from the surrounding page. This means the band's **direct parent element** has a different background than `body` — and `#f5f6f8` matches `body`, not the parent. Using `background: 'inherit'` forces the sticky band to take exactly the same background as its direct parent, guaranteed to match regardless of what that value is.

**Dependency:** Prompt 14af merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ag: sticky band background inherit" && git push origin stage-6`

---

## FIX — AnalysisHub.tsx AND DealOverview.tsx

`inherit` made the band transparent because the direct parent has no background set. `background: 'inherit'` is **not the right approach** here.

Instead, use `backgroundColor: 'var(--bg-body)'` — this resolves the CSS variable against `:root` at runtime, not the parent DOM element:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  backgroundColor: 'var(--bg-body)',  // ← reads from :root, always correct
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  marginBottom: 8,
}}>
```

**If `--bg-body` is not defined:** check `index.css` for the actual variable name for the page background (`--background`, `--bg-page`, `--bg-base`, etc.) and use that instead. The value must resolve to an opaque colour — not `transparent` or `inherit`.

**Verification step:** after applying, open devtools → select the sticky band div → Computed tab → confirm `background-color` is an opaque colour (not `rgba(0,0,0,0)`) that matches the grey surrounding the section cards.

---

## Summary checklist
- [ ] AnalysisHub.tsx sticky outer: `background: 'inherit'`
- [ ] DealOverview.tsx sticky outer: `background: 'inherit'`
- [ ] Scroll page — band completely invisible against the page background
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
