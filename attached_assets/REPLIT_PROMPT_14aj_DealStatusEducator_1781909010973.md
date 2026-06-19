# REPLIT PROMPT 14aj — Deal Status educator banner above sticky band

## Why
After prompt 14ah, the Overview sub-tab has an educator banner above the sticky band. When the user switches to Deal Status, that banner correctly disappears — but no Deal Status educator replaces it. The Deal Status sub-tab needs its own educator banner in the same position (above the sticky band), matching the same visual style as the Overview educator.

**Dependency:** Prompt 14ah merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14aj: Deal Status educator banner" && git push origin stage-6`

---

## Context — current structure in DealOverview.tsx

After 14ah, the render order is:

```tsx
{/* Educator — shows only on Overview sub-tab */}
{overviewSubTab === 'overview' && showEducator && (
  <EducatorBanner ... />
)}

{/* Sticky sub-tab band — always present */}
<div style={{ position: 'sticky', ... }}>
  {/* Overview | Deal Status buttons */}
</div>

{/* Content — switches based on overviewSubTab */}
{overviewSubTab === 'overview' ? <OverviewContent /> : <DealStatusContent />}
```

---

## THE FIX — add Deal Status educator banner in the same slot

Add a second conditional educator banner for Deal Status, immediately alongside the existing Overview one:

```tsx
{/* Educator — Overview sub-tab */}
{overviewSubTab === 'overview' && showOverviewEducator && (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    background: '#fff',
    border: '1px solid var(--ds-border, #e3e5e9)',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 0,
    position: 'relative',
  }}>
    {/* existing Overview educator content — unchanged */}
  </div>
)}

{/* Educator — Deal Status sub-tab */}
{overviewSubTab === 'deal-status' && showDealStatusEducator && (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    background: '#fff',
    border: '1px solid var(--ds-border, #e3e5e9)',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 0,
    position: 'relative',
  }}>
    {/* Icon */}
    <div style={{ fontSize: 20, marginTop: 1 }}>📋</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1, #1a1a2e)', marginBottom: 4 }}>
        Track your deal's progress
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2, #6c757d)', lineHeight: 1.5 }}>
        Deal Status tracks reservation countdown, key dates, and sourcing fees. Use <strong>Close deal</strong> when the deal completes or falls through.
      </div>
    </div>
    {/* Dismiss button */}
    <button
      onClick={() => setShowDealStatusEducator(false)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 16, lineHeight: 1, padding: 2 }}
      aria-label="Dismiss"
    >
      ×
    </button>
  </div>
)}
```

### State variable
Add a new state variable for the Deal Status educator dismiss:

```tsx
const [showDealStatusEducator, setShowDealStatusEducator] = useState(true);
```

### Remove duplicate card from Deal Status content
The Deal Status content section currently has a "Track your deal's progress" card at the top of its content area (below the sticky band). Now that this message lives in the educator slot above the band, **remove that duplicate card** from the Deal Status content to avoid repetition.

---

## Summary checklist
- [ ] `showDealStatusEducator` state added (defaults `true`)
- [ ] Deal Status educator banner renders above the sticky band when `overviewSubTab === 'deal-status'`
- [ ] Educator matches visual style of Overview educator (white card, border, icon, dismiss ×)
- [ ] Duplicate "Track your deal's progress" card removed from Deal Status content area
- [ ] Overview educator is unchanged
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
