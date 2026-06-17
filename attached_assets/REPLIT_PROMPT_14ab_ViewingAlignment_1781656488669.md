# REPLIT PROMPT 14ab — Fix "Viewing — read-only" vertical alignment in Analysis sub-tab band

## What this does
The "Viewing — read-only" lock text on the right side of the Analysis sticky sub-tab band is vertically misaligned with the tab buttons. Fix by ensuring the inner flex container has `alignItems: 'center'`.

**Dependency:** Prompt 14aa merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ab: fix viewing label alignment" && git push origin stage-6`

---

## THE FIX — AnalysisHub.tsx only

Find the inner content div inside the Analysis sticky band. It should be the div directly inside the sticky outer div, containing the SubNav and the right-side lock/editing indicator. Ensure it has ALL of these:

```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',          // ← vertically centres both SubNav and right-side text
  justifyContent: 'space-between',
  padding: '8px 0',
}}>
  <SubNav ... />
  {activeView === 'inputs' && ( ... )}
</div>
```

If `alignItems: 'center'` is missing or has been removed, add it back. No other changes.

---

## Summary checklist
- [ ] Inner flex div in Analysis sticky band has `alignItems: 'center'`
- [ ] "Viewing — read-only" and tab buttons are vertically centred on the same line
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
