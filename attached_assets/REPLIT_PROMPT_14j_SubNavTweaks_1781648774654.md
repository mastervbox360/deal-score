# REPLIT PROMPT 14j — Sub-nav band tweaks + Overview sticky band

## What this does
1. Remove the "Edit inputs" button from the sticky sub-nav strip — keep only "Viewing — read-only" text on the right. The "Edit inputs" button in the top chrome bar is sufficient.
2. Apply the same sticky white-band treatment to the Overview sub-tabs (Overview / Deal Status) that was applied to the Analysis sub-nav in Prompt 14i.

**Dependency:** Prompt 14i merged and passing tsc.

## Standing rules
- Read `AnalysisHub.tsx` and the Overview component file in full before touching them
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14j: sub-nav strip edit button removed, overview sticky band" && git push origin stage-6`

---

## FIX 1 — Remove "Edit inputs" button from sticky strip

In `AnalysisHub.tsx`, find the sticky sub-nav wrapper added in Prompt 14i. On the right side of the band, the current code renders a navy "Edit inputs" button when `!isEditing`. Replace that entire right-side block with just the muted "Viewing — read-only" text (no button):

```tsx
{/* Right: read-only notice — only on inputs tab, only when not editing */}
{activeView === 'inputs' && !isEditing && (
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
)}
```

Remove the `isEditing` "Editing" green text too — the right side should be empty when in edit mode.

---

## FIX 2 — Apply same sticky band to Overview sub-tabs

Find the component that renders the Overview / Deal Status sub-tabs (search for `"Deal Status"` — likely `DealOverview.tsx` or similar).

Find the container element that wraps those two tab buttons. Wrap it (or convert it) into a sticky white band using the same pattern as the Analysis sub-nav:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: '#fff',
  borderBottom: '.5px solid var(--ds-border)',
  display: 'flex',
  alignItems: 'center',
  padding: '8px 20px',
}}>
  {/* existing Overview / Deal Status tab buttons — unchanged */}
</div>
```

Do not change the style or shape of the Overview / Deal Status buttons themselves — only wrap their existing container in this sticky div. If a sticky wrapper already exists from a previous prompt, just update `background` to `#fff` and add `borderBottom`.

---

## Summary checklist

- [ ] "Edit inputs" button removed from sticky sub-nav strip
- [ ] Right side of strip: only "🔒 Viewing — read-only" text when `!isEditing`, nothing when editing
- [ ] Overview sub-tabs wrapper: sticky, `background: '#fff'`, `borderBottom: '.5px solid var(--ds-border)'`
- [ ] Overview sub-tab button styles unchanged
- [ ] `npx tsc --noEmit` zero errors

## After completing
1. `npx tsc --noEmit` — zero errors
2. Screenshot: Analysis strip (sub-tabs + lock text only) + Overview sub-tabs sticky on scroll
3. Commit and push
