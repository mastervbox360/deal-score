# REPLIT PROMPT 14i — Combine sub-nav + read-only notice into one sticky band

## What this does
The transparent sub-nav and the "Viewing — read-only / Edit inputs" row below it clash visually — neither has a background to separate them. Fix: merge both into a single sticky white band. Sub-tabs on the left, read-only/edit notice on the right. One clean contained strip.

**Dependency:** Prompt 14h merged and passing tsc.

## Standing rules
- Read `AnalysisHub.tsx` in full before touching it
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14i: sticky sub-nav band with inline read-only notice" && git push origin stage-6`

---

## THE CHANGE — one sticky band, two elements

### Step 1 — Remove the read-only notice from ViewInputs

In `ViewInputs`, find and **delete** the read-only notice div entirely (the `{!isEditing && (...)}` block that renders the lock icon + "Viewing — read-only" text + "Edit inputs" button at the top of ViewInputs). It will be moved into the sticky wrapper instead.

It looks roughly like:
```tsx
{/* 1. READ-ONLY NOTICE */}
{!isEditing && (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', marginBottom: 8 }}>
    <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
      ...  🔒 Viewing — read-only
    </span>
    <button onClick={...}>
      ✏ Edit inputs
    </button>
  </div>
)}
```

Delete this entire block.

### Step 2 — Update the sticky sub-nav wrapper

Find the sticky `div` that wraps `<SubNav>` (in the AnalysisHub render, the one with `position: 'sticky'` and `background: 'transparent'`). Replace the entire wrapper with this combined band:

```tsx
{/* ── Sub-nav band (sticky) ──────────────────────────────────────────── */}
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: '#fff',
  borderBottom: '.5px solid var(--ds-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 20px',
}}>
  {/* Left: sub-tabs */}
  <SubNav active={activeView} onChange={(v) => { setLocalView(v); onViewChange?.(v) }} />

  {/* Right: read-only / edit notice — only shown on inputs tab */}
  {activeView === 'inputs' && (
    !isEditing ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Viewing — read-only
        </span>
        <button
          onClick={() => navigate('?tab=analysis&view=inputs&editing=true')}
          style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: 'var(--navy)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <i className="ti ti-pencil" style={{ fontSize: 10 }} /> Edit inputs
        </button>
      </div>
    ) : (
      <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
        <i className="ti ti-pencil" style={{ fontSize: 10 }} /> Editing
      </span>
    )
  )}
</div>
```

> Note: `isEditing` and `navigate` are already in scope in the AnalysisHub component where this sticky wrapper lives. If they are not in scope at that level, pass them down from ViewInputs or derive them from `useSearchParams` directly.

---

## Summary checklist

- [ ] Read-only notice removed from inside `ViewInputs` scroll area
- [ ] Sticky sub-nav wrapper: white background + single bottom border, full width (`justifyContent: 'space-between'`)
- [ ] Sub-tabs on the left of the sticky band
- [ ] Read-only/edit notice on the right — only visible on the Inputs tab
- [ ] "Edit inputs" is a small navy button (not a text link)
- [ ] `npx tsc --noEmit` zero errors

## After completing
1. `npx tsc --noEmit` — zero errors
2. Screenshot: sticky band showing sub-tabs left + "Viewing — read-only · Edit inputs" right
3. Commit and push
