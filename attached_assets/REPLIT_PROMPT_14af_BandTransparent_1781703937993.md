# REPLIT PROMPT 14af — Sticky band: match exact page background colour

## Why
The sticky outer div has `background: 'var(--bg-sec, #f5f6f8)'` which resolves to a slightly different shade than the actual page background, making the band faintly visible. Transparent causes corner bleed (content scrolls behind the band). The fix: find the exact computed background colour of the page content wrapper and hardcode it on the sticky band so they are identical.

**Dependency:** Prompt 14ae merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14af: sticky band matches page bg" && git push origin stage-6`

---

## STEP 1 — Find the exact page background colour via devtools

Open the browser. Right-click on the **grey page area** (not a white card — the grey gap between section cards). Click "Inspect". In the Computed tab, find `background-color`. Copy the exact hex or rgb value.

Then right-click on the **sticky band area** (the strip the sub-tabs sit on). Inspect it. Find its computed `background-color`.

Compare the two values — they will be different. The sticky band needs to match the grey page area exactly.

Alternatively, search the codebase for where the page content wrapper background is set. Check these files in order:
1. `index.css` or `globals.css` — look for `--bg-sec`, `--bg-body`, `--bg-page`, or `body { background`
2. `DealChrome.tsx` or the main layout wrapper — look for the div that wraps tab content
3. Any Tailwind config for `bg-gray-*` or `bg-slate-*` classes

The value will be one of: `#f0f2f5`, `#f1f3f6`, `#f4f5f7`, `#f5f6f8`, `#eef0f3` — confirm the exact one.

---

## STEP 2 — Set the sticky band to that exact colour

In `AnalysisHub.tsx` AND `DealOverview.tsx`, find the sticky outer div. Set `background` to the **literal hex** confirmed in Step 1. Do NOT use a CSS variable:

```tsx
// Use whichever exact hex matches the page background:
background: '#f0f2f5',   // ← replace with confirmed value
```

Do NOT use `var(--bg-sec)` — CSS variables can resolve differently depending on DOM context, which is why the mismatch exists. A hardcoded hex guarantees an exact match.

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
