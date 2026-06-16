# REPLIT PROMPT 14r — Sec component + IField visual alignment to mockup

## What this does
Aligns the `Sec` (section card) component and `IField` (input field) component in `AnalysisHub.tsx` to match `ds_analysis_hub.html` mockup exactly.

**Dependency:** Prompt 14q merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14r: Sec + IField aligned to mockup" && git push origin stage-6`

---

## FIX 1 — `Sec` component

Find the `Sec` function component in `AnalysisHub.tsx`. Apply all of the following changes:

### Header band
- `padding`: `'10px 18px'` → `'12px 16px'`
- `fontSize` of title span: `14` → `12`
- Add `boxShadow: '0 1px 3px rgba(0,0,0,.06)'` to the **outer** card div (same shadow as other section cards)

### Badge (the "Complete" / count indicator)
- Background: `'#d1fae5'` → `'var(--navy-light, #e8edf5)'`
- Text colour: `'#065f46'` → `'var(--navy)'`

### Body area
- `padding`: `'16px 18px'` → `'14px 16px'`

The updated `Sec` component should look like:

```tsx
function Sec({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      border: `.5px solid ${DS_BORDER}`,
      marginBottom: 10,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    }}>
      <div style={{
        background: 'var(--bg-sec)',
        borderBottom: `.5px solid ${DS_BORDER}`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--navy)',
            background: 'var(--navy-light, #e8edf5)',
            padding: '2px 9px',
            borderRadius: 20,
          }}>{badge}</span>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}
```

---

## FIX 2 — `IField` component

Find the `IField` function component in `AnalysisHub.tsx`. Apply:

### Input element
- Text colour: currently `TEXT_2` (grey `#6c757d`) → `'var(--text-1)'` (dark)
- Border: `.5px solid #c8cbd2` → `'1px solid #c8cbd2'`

Only change those two properties — leave all other input styles (borderRadius, padding, fontSize, etc.) unchanged.

---

## Summary checklist
- [ ] `Sec` header padding: `12px 16px`
- [ ] `Sec` title font-size: `12px`
- [ ] `Sec` outer div: `boxShadow: '0 1px 3px rgba(0,0,0,.06)'`
- [ ] `Sec` badge: navy background + navy text
- [ ] `Sec` body padding: `14px 16px`
- [ ] `IField` input text colour: `var(--text-1)`
- [ ] `IField` input border: `1px solid #c8cbd2`
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
