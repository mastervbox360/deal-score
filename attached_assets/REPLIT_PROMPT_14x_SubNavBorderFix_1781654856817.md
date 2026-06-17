# REPLIT PROMPT 14x — Remove border from SubNav container (the actual faint line cause)

## Root cause
The faint rounded-rectangle lines visible inside the sticky sub-tab bands are NOT from the outer/inner band divs — those are already clean. The cause is the **tab button group container** which still has `border: '.5px solid var(--ds-border)'` and `borderRadius: '10px'`. That draws a visible rounded outline inside the white card.

**Dependency:** Prompt 14w merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14x: remove SubNav container border" && git push origin stage-6`

---

## FIX 1 — AnalysisHub.tsx: SubNav component

Find the `SubNav` function component. Its container div currently looks like:

```tsx
<div style={{ display: 'flex', gap: '4px', background: '#fff', border: `.5px solid var(--ds-border)`, borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
```

Remove `border` and `background` from this div — they're not needed since the button group sits inside the white card:

```tsx
<div style={{ display: 'flex', gap: '4px', padding: '4px', width: 'fit-content' }}>
```

## FIX 2 — DealOverview.tsx: tab container div

Find the div that wraps the Overview / Deal Status tab buttons inside the sticky band. It currently looks like:

```tsx
<div style={{ display: 'flex', gap: '4px', background: 'transparent', border: '.5px solid var(--ds-border)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
```

Remove `border`, `borderRadius`, and `background` from this div:

```tsx
<div style={{ display: 'flex', gap: '4px', padding: '4px', width: 'fit-content' }}>
```

---

## Summary checklist
- [ ] SubNav container in `AnalysisHub.tsx`: `border` removed, `background` removed, `borderRadius` removed
- [ ] Tab container in `DealOverview.tsx`: `border` removed, `borderRadius` removed, `background` removed
- [ ] Tab button styles inside both containers unchanged
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
