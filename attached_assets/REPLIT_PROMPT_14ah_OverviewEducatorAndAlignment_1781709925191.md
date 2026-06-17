# REPLIT PROMPT 14ah — Overview educator order + indicator right alignment

## Two fixes
1. **DealOverview.tsx** — move the educator banner above the sticky sub-tab band (matches Analysis tab layout)
2. **AnalysisHub.tsx** — align "Viewing — read-only" right edge to the content column edge, not the viewport edge

**Dependency:** Prompt 14ag merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ah: educator order + indicator alignment" && git push origin stage-6`

---

## FIX 1 — DealOverview.tsx: educator banner before sticky band

Currently the render order in DealOverview is:
```
[sticky sub-tab band]
[educator banner]
[page content]
```

Change it to:
```
[educator banner]       ← move this above the sticky band
[sticky sub-tab band]   ← sticky band stays sticky, now below educator
[page content]
```

Find the educator banner JSX block (the dismissable card with the "Your deal command centre" heading) and move it to render BEFORE the sticky sub-tab band div. The sticky band keeps `position: sticky` — the educator banner is not sticky and scrolls away normally.

The educator banner should not be inside the sticky div. It should be a sibling element that renders just above it in the JSX.

---

## FIX 2 — AnalysisHub.tsx: right-align indicator to content column

The "Viewing — read-only" / "Editing" span currently sits at `justifyContent: 'space-between'` which pushes it to the full viewport/container right edge. The content cards and educator banner below have a right edge that sits inset from this (due to the page's horizontal padding or the content column's max-width constraint).

The indicator needs `marginRight` that matches the content column's right padding so it visually aligns with the right edge of the educator card.

### How to find the correct value
In the file, find the div or wrapper that contains the section cards (e.g. `Property information`, educator banner). Check its `paddingRight` or `marginRight`. Use the same value on the indicator span.

If the content wrapper has no explicit right padding (it uses a parent container's padding), check the outermost content wrapper div in `AnalysisHub.tsx` for `padding` or `paddingRight`. Common values: `16px`, `20px`, `24px`.

### Apply to both indicator spans

```tsx
// Viewing span:
<span style={{
  fontSize: 11,
  color: 'var(--text-2)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  marginRight: 4,          // ← already exists from 14af
  // Add paddingRight to match content column right edge:
  paddingRight: 16,        // ← adjust to match content column right padding
}}>

// Editing span — same paddingRight:
<span style={{
  fontSize: 11,
  fontWeight: 600,
  color: '#065f46',
  background: '#d1fae5',
  padding: '3px 10px',
  borderRadius: 20,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  marginRight: 4,
  paddingRight: 16,        // ← same value
}}>
```

**Note on Editing span:** the `paddingRight: 16` would conflict with the pill's internal `padding: '3px 10px'`. For the Editing pill, use `marginRight` instead of `paddingRight`:

```tsx
// Editing span — use marginRight only:
<span style={{
  ...,
  marginRight: 20,        // ← combine the 4px existing + ~16px alignment gap
}}>
```

### Visual check
After applying: the right edge of the "Viewing — read-only" text should visually align with the right edge of the educator card/section cards below it.

---

## Summary checklist
- [ ] DealOverview.tsx: educator banner renders BEFORE the sticky sub-tab band in JSX
- [ ] Educator banner is NOT inside the sticky div — it is a sibling above it
- [ ] AnalysisHub.tsx: check content column right padding value
- [ ] Viewing span: `paddingRight` set to match content column right edge
- [ ] Editing span: `marginRight` increased to match content column right edge
- [ ] Visual check: "Viewing — read-only" right edge aligns with educator card right edge
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
