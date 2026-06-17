# REPLIT PROMPT 14af — Sticky band: match exact page background colour

## Why
The sticky outer div has `background: 'var(--bg-sec, #f5f6f8)'` which resolves to a slightly different shade than the actual page background, making the band faintly visible. Transparent causes corner bleed (content scrolls behind the band). The fix: find the exact computed background colour of the page content wrapper and hardcode it on the sticky band so they are identical.

**Dependency:** Prompt 14ae merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14af: sticky band matches page bg" && git push origin stage-6`

---

## STEP 1 — Find the exact page background colour in the source

Do this in the codebase, not devtools — devtools returned the wrong element last time.

**Search the source files for where the content area background is set:**

```bash
# Run in the project root:
grep -r "bg-sec\|bgSec\|background.*#[ef][0-9a-f]\|backgroundColor.*#[ef][0-9a-f]" src/ --include="*.tsx" --include="*.ts" --include="*.css" -n
```

Look specifically at:
1. The **outermost content wrapper div** in `AnalysisHub.tsx` — the div that contains BOTH the sticky band AND all the section cards below. What is its `background` or `backgroundColor`?
2. The same wrapper div in `DealOverview.tsx`.
3. `index.css` — find `--bg-sec` definition if it exists.

**Important:** The sticky band is visually LIGHTER than the page — so the page background hex is DARKER than `#f5f6f8`. It will be something like `#eaecef`, `#e9ebee`, `#edf0f2`, or similar. Do not assume `#f5f6f8` is correct.

Once found, note the exact hex value.

---

## STEP 2 — Set the sticky band to that exact colour

In `AnalysisHub.tsx` AND `DealOverview.tsx`, find the sticky outer div. Replace the `background` with the **exact hex** found in Step 1:

```tsx
// Example — use whatever exact hex the content wrapper uses:
background: '#eaecef',   // ← replace with the confirmed value
```

The sticky band must use the **same literal hex** as its parent content wrapper. Do NOT use `var(--bg-sec)` — variables can resolve differently in different DOM contexts.

---

---

## FIX 2 — Right-side indicator: add right margin

The "Viewing — read-only" (and "Editing") spans sit flush against the right edge of the sticky band. Add `marginRight` to give breathing room.

In `AnalysisHub.tsx`, on **both** the editing and viewing indicator spans, add `marginRight: 4`:

```tsx
// Editing span:
<span style={{ ..., marginRight: 4 }}>
  Editing
</span>

// Viewing span:
<span style={{ ..., marginRight: 4 }}>
  Viewing — read-only
</span>
```

---

## Summary checklist
- [ ] Inspected actual page background colour (confirmed hex value)
- [ ] AnalysisHub.tsx sticky outer: `background` set to exact page background hex
- [ ] DealOverview.tsx sticky outer: `background` set to exact page background hex
- [ ] AnalysisHub.tsx editing + viewing spans: `marginRight: 4` added
- [ ] Scroll the page — band completely invisible, indicator has breathing room from edge
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
