# REPLIT PROMPT 14ao — Full inputs page section style audit

## Why
A visual audit of the inputs page reveals that some sections don't match the standard `Sec` component header style. Every section card must use identical header treatment: grey background band, consistent title font/weight/colour, badge aligned right, white body below. No section should deviate from this pattern.

**Dependency:** Prompt 14an merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ao: inputs section style audit" && git push origin stage-6`

---

## The standard Sec component spec (reference)

Every section card must match this exactly:

```
┌─────────────────────────────────────────────────┐
│  Section title (13px, 500, var(--text-1))  Badge │  ← grey bg (var(--bg-sec))
│                                                   │  ← border-bottom: 1px solid var(--ds-border)
│  [white body: fields, inputs, content]            │
└─────────────────────────────────────────────────┘
border: 1px solid var(--ds-border, #e3e5e9)
border-radius: 10px
```

Badge variants:
- `Complete` → teal pill
- `Optional` → grey pill  
- `3/4` → progress count
- No badge → blank right side

---

## AUDIT — check each section and fix any that deviate

Go through every section in the inputs page JSX in order. For each one, verify the header has the grey background band. Fix any that don't match.

### 1. Property information
Expected: `<Sec title="Property information" badge="Complete/pending" />`
Action: Verify — likely already correct.

### 2. Seller
Expected: `<Sec title="Seller" badge="Optional" />`
Action: Verify — fixed in 14am. Confirm the new smart component still uses Sec wrapper.

### 3. Property photos ⚠️ KNOWN ISSUE
Currently shows header on white background, not grey. Also has non-standard right side ("★ Hero image = deal card" dropdown).

Fix:
- Wrap in `<Sec title="Property photos" badge="Optional">` 
- Move the "★ Hero image = deal card" control inside the Sec header using the Sec component's `rightContent` prop if it supports it, or render it as a secondary element inside the white body area at the top — NOT in the grey header band
- The grey header should only contain: "Property photos" title + "Optional" badge

```tsx
<Sec title="Property photos" badge="Optional">
  {/* Hero image selector at top of body */}
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 }}>
    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>★ Hero image = deal card</span>
    {/* dropdown/selector unchanged */}
  </div>
  {/* Photo upload grid — unchanged */}
</Sec>
```

### 4. Your route into this deal / Select your strategy (Step 1 & 2)
These are intentionally styled differently — they are step-based selection UI, not data entry sections. They sit inside a single section card with a grey background step number. 

Action: Verify the outer card wrapper has `border: 1px solid var(--ds-border)` and `border-radius: 10px`. The step cards do NOT need a Sec header — their current styling is intentional. If the outer wrapper card is missing its border/radius, add it.

### 5. Property & purchase
Expected: `<Sec title="Property & purchase" badge="Complete/pending" />`
Action: Verify — likely correct.

### 6. Leasehold details
Expected: `<Sec title="Leasehold details" />` (no badge needed — it only shows when leasehold is selected)
Action: Verify conditional rendering from 14ak still works. Check header style matches.

### 7. Purchase financing
Expected: `<Sec title="Purchase financing" badge="Complete/pending" />`
Action: Verify.

### 8. Refurb
Expected: `<Sec title="Refurb" badge="Complete/pending" />`
Action: Verify.

### 9. Monthly costs
Expected: `<Sec title="Monthly costs" badge="Complete/pending" />`
Action: Verify.

### 10. Ownership & tax
Expected: `<Sec title="Ownership & tax" />`
Action: Verify.

### 11. BTL / HMO / SA project details (strategy-specific section)
Expected: `<Sec title="BTL — project details" badge="Complete/pending" />` (title varies by strategy)
Action: Verify the title updates correctly per strategy and header matches standard style.

### 12. Deal terms
Expected: `<Sec title="Deal terms" />`
Action: Verify.

### 13. Sold price comparables
This was recently updated (14an) to a compact single-row format, not a Sec card.
Action: Verify it's styled consistently — white card, same border/radius as other sections, no standalone header band needed since it's a single-row utility card.

---

## Fix pattern for any non-conforming section

For any section not using `<Sec>`, replace its custom header div with `<Sec title="..." badge="...">` and move all body content inside it. The Sec component provides the grey band, border, border-radius, and badge alignment automatically.

If Sec doesn't accept children in the current implementation, check how `Property information` passes its fields to Sec and replicate that exact pattern.

---

## Summary checklist
- [ ] Property photos: grey header band + "Optional" badge, "Hero image" control moved to body
- [ ] All other sections verified against Sec component spec
- [ ] No section has a white header background (except Sold price comparables single-row)
- [ ] Badge style consistent across all sections (teal = complete, grey = optional)
- [ ] Border + border-radius consistent across all section cards
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
