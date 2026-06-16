# REPLIT PROMPT 14f — Sub-tab spacing fix

## What this does
Adds vertical breathing room between the deal tab bar (Analysis | Content | Seller…) and the inner sub-tab row (Inputs | Results | Sensitivity | Workings). Currently they are flush against each other with no gap.

**Dependency:** Prompt 14e merged.

## Standing rules
- npx tsc --noEmit zero errors
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14f: Sub-tab row spacing" && git push origin stage-6`

---

## THE CHANGE

Find the inner sub-tab row in `AnalysisHub.tsx` — the `position: sticky` div containing the Inputs | Results | Sensitivity | Workings buttons (added in Prompt 14d FIX 1).

Add `padding: '8px 20px 0'` (or equivalent) to that div so the sub-tabs have top padding inside the sticky bar, creating a visible gap below the deal tab bar:

```tsx
<div style={{
  position: 'sticky',
  top: ...,           // unchanged
  zIndex: 100,        // unchanged
  background: '#fff', // unchanged
  borderBottom: '.5px solid var(--ds-border)', // unchanged
  padding: '8px 20px 0',   // ← ADD THIS (was 0 or no padding)
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}}>
```

The `8px` top padding gives the sub-tab pills room to breathe below the deal tabs. The `0` bottom padding keeps the bottom border tight to the pills. Adjust the value slightly if it looks off — aim for roughly the same gap you see between the deal tabs and the top chrome bar.

---

## After completing
1. `npx tsc --noEmit` — zero errors
2. Screenshot of the tab area so I can verify the spacing
3. Commit and push
