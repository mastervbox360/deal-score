# REPLIT PROMPT 14af — Sticky band: make background transparent

## Why
The sticky outer div currently has `background: 'var(--bg-sec, #f5f6f8)'` which is slightly visibly different from the page's own background colour. Since the sticky outer is now **rectangular (no borderRadius)**, there are no transparent corner triangles — so we can safely set it to `transparent`. The segmented control pill floats directly on the page with no visible band.

**Dependency:** Prompt 14ae merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14af: sticky band background transparent" && git push origin stage-6`

---

## THE FIX — AnalysisHub.tsx AND DealOverview.tsx

In both files, find the sticky outer div. Change **only** the `background` property:

```tsx
// BEFORE
background: 'var(--bg-sec, #f5f6f8)',

// AFTER
background: 'transparent',
```

No other changes. The sticky div has no `borderRadius`, so transparent is safe — no corner bleed.

---

## Summary checklist
- [ ] AnalysisHub.tsx sticky outer: `background: 'transparent'`
- [ ] DealOverview.tsx sticky outer: `background: 'transparent'`
- [ ] No other changes
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
