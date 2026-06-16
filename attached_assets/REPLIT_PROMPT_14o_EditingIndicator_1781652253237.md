# REPLIT PROMPT 14o — Show "Editing" state in sub-tab strip

## What this does
The sticky sub-tab strip currently shows "Viewing — read-only" on the right when `!isEditing`, and nothing when `isEditing`. Replace the blank state with a green "Editing" indicator so the user always knows their current mode.

**Dependency:** Prompt 14n merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14o: editing indicator in sub-tab strip" && git push origin stage-6`

---

## THE CHANGE

In `AnalysisHub.tsx`, find the right-side slot of the sticky sub-nav band (inside the Analysis inputs sticky wrapper). Currently it renders the lock text when `!isEditing` and nothing when `isEditing`.

Replace the entire right-side block with this:

```tsx
{activeView === 'inputs' && (
  isEditing ? (
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
    }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M2 10l2.5-.5L10 4a1.414 1.414 0 00-2-2L2.5 7.5 2 10z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Editing
    </span>
  ) : (
    <span style={{
      fontSize: 11,
      color: 'var(--text-2)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      Viewing — read-only
    </span>
  )
)}
```

---

## Summary checklist
- [ ] When `isEditing`: green pill badge "Editing" (pencil icon + `#065f46` text + `#d1fae5` bg)
- [ ] When `!isEditing`: grey lock text "Viewing — read-only" (unchanged)
- [ ] Only shown when `activeView === 'inputs'`
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
