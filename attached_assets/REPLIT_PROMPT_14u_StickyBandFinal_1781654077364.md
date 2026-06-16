# REPLIT PROMPT 14u — Sticky band: final fix (remove shadow, keep mask + gap)

## What this does
Prompt 14t introduced `overflow: hidden` to fix the seam — but that broke the corner mask and removed the gap. This prompt reverts 14t's changes and applies the correct minimal fix: remove `boxShadow` from the inner card. The shadow was causing the seam; the border alone is sufficient visual definition for a sticky element.

**Dependency:** Prompt 14t merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14u: sticky band final — no shadow, mask + gap restored" && git push origin stage-6`

---

## THE FIX — Both bands (DealOverview.tsx + AnalysisHub.tsx)

For each sticky band, the structure should be exactly as 14s left it, with one change: remove `boxShadow` from the inner card div.

```tsx
{/* OUTER div — sticky, rectangular, page background, permanent gap below */}
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: 'var(--bg-body, #f5f6f8)',  // masks corner bleed
  paddingBottom: 10,                        // permanent gap below
  // NO overflow: hidden — 14t added this, remove it
}}>
  {/* INNER div — visible white card, NO boxShadow */}
  <div style={{
    background: '#fff',
    border: '.5px solid var(--ds-border)',
    borderRadius: 10,
    // boxShadow removed — it was bleeding into paddingBottom gap creating a seam
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
    }}>
      {/* tab buttons and right-side indicator — unchanged */}
    </div>
  </div>
</div>
```

Apply to:
- `DealOverview.tsx` — Overview / Deal Status band
- `AnalysisHub.tsx` — Inputs / Results / Sensitivity / Workings band

**Checklist of what must be true after this prompt:**
- Outer div: `background: 'var(--bg-body, #f5f6f8)'`, `paddingBottom: 10`, NO `overflow: hidden`
- Inner div: `background: '#fff'`, `border: '.5px solid var(--ds-border)'`, `borderRadius: 10`, NO `boxShadow`
- No content visible through rounded corners ✓
- Permanent 10px gap below the card before page content ✓
- No shadow seam in the gap ✓

---

## Summary checklist
- [ ] `overflow: hidden` removed from outer div on both bands
- [ ] `boxShadow` removed from inner card div on both bands
- [ ] Outer div retains `background: 'var(--bg-body, #f5f6f8)'` and `paddingBottom: 10`
- [ ] Inner div retains `border` and `borderRadius: 10`
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
