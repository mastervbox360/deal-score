# REPLIT PROMPT 14y — Sticky band outer div: background white not grey

## Root cause (final diagnosis)
The outer sticky div uses `background: '#f5f6f8'` (grey) to fill the transparent corner triangles outside the inner card's borderRadius. But the content that scrolls underneath is white section cards — so the grey corner fill doesn't match, creating faint grey arcs at the top corners.

The fix: change the outer div background to `'#fff'` (white). White corners over white section cards = invisible. The paddingBottom gap area also sits over white section card content = also invisible.

**Dependency:** Prompt 14x merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14y: sticky band outer bg white" && git push origin stage-6`

---

## THE FIX — Both bands

In `AnalysisHub.tsx` and `DealOverview.tsx`, find the outer sticky div. Change its background from `'#f5f6f8'` to `'#fff'`:

**Before:**
```tsx
<div style={{ position: 'sticky', ..., background: '#f5f6f8', paddingBottom: 10 }}>
```

**After:**
```tsx
<div style={{ position: 'sticky', ..., background: '#fff', paddingBottom: 10 }}>
```

No other changes. One property swap on each file.

---

## Summary checklist
- [ ] Outer sticky div in `AnalysisHub.tsx`: `background: '#fff'`
- [ ] Outer sticky div in `DealOverview.tsx`: `background: '#fff'`
- [ ] Nothing else changed
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
