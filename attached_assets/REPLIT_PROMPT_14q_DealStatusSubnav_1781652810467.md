# REPLIT PROMPT 14q — Deal Status: sticky sub-tab strip + educator banner

## What this does
The Deal Status sub-view currently has no sticky sub-tab strip and no educator banner — the user loses all navigation context when they switch to it. This prompt adds both, matching the Overview sub-view exactly.

**Dependency:** Prompt 14p merged and passing tsc.

## Standing rules
- Read `DealOverview.tsx` in full before making changes
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14q: deal status sub-tab strip + educator banner" && git push origin stage-6`

---

## Context

In `DealOverview.tsx` there are two sub-views controlled by a local state (something like `overviewTab === 'overview' | 'dealStatus'`).

The Overview sub-view currently renders:
1. A sticky sub-tab band (Overview / Deal Status buttons)
2. An educator banner ("Your deal command centre" dismissible card)
3. The main content below

The Deal Status sub-view currently renders its content directly, with no sticky band and no educator.

---

## FIX 1 — Add the sticky sub-tab strip to Deal Status

The sticky sub-tab strip is likely rendered conditionally only when `overviewTab === 'overview'`. Find that condition and change it so the sticky band renders for **both** sub-views — i.e., always show it regardless of which sub-tab is active.

The active button should reflect whichever tab is currently selected (`overviewTab`), and clicking either button switches the active tab as before. No structural change needed — just remove the condition that hides the band on Deal Status.

---

## FIX 2 — Add educator banner to Deal Status

Directly below the sticky sub-tab band (but inside the scrollable content area, not sticky), add an educator banner when `overviewTab === 'dealStatus'`. Match the exact same component/style used for the Overview educator ("Your deal command centre"):

```tsx
{overviewTab === 'dealStatus' && !dealStatusEducatorDismissed && (
  <div style={{
    background: '#fff',
    border: '.5px solid var(--ds-border)',
    borderRadius: 10,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  }}>
    <span style={{ fontSize: 20 }}>📋</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
        Track your deal's progress
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
        Deal Status tracks reservation countdown, key dates, and fees. Use <strong>Close deal</strong> when the deal completes or falls through.
      </div>
    </div>
    <button
      onClick={() => setDealStatusEducatorDismissed(true)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 16, lineHeight: 1, padding: 0 }}
      aria-label="Dismiss"
    >
      ×
    </button>
  </div>
)}
```

Add the `dealStatusEducatorDismissed` boolean to local state: `const [dealStatusEducatorDismissed, setDealStatusEducatorDismissed] = useState(false)`.

Use whatever icon/emoji approach the Overview educator uses — if it uses a Tabler icon (`ti ti-*`), match that instead of an emoji.

---

## Summary checklist
- [ ] Sticky sub-tab band renders on both Overview and Deal Status sub-views
- [ ] Active tab button highlights correctly for each sub-view
- [ ] Educator banner renders at top of Deal Status content (dismissible)
- [ ] Educator banner matches Overview banner style (same border, radius, shadow, padding)
- [ ] `dealStatusEducatorDismissed` state added
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
