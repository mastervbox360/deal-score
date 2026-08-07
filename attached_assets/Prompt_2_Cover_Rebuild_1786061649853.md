REPLIT PROMPT — Prompt 2: Cover page rebuild
Branch: production-candidate

Read artifacts/dealscore/src/components/DealScorePDF.tsx and
artifacts/dealscore/src/components/DealScorePDFProPlus.tsx IN FULL before
making any changes. Both files have an identical structure for this —
three cover variants gated on `props.coverStyle === 'classic' | 'clean' |
'bold'`, each in its own conditional block. Find these blocks by
searching for `props.coverStyle ===` in each file.

GOAL: Replace all three existing cover variants with ONE new variant —
a light, editorial-style cover matching the reference pack's approach
(logo top-left, breadcrumb, heading in brand colour, key stats line,
Overview-style section with accent-underlined heading). No dark
full-bleed background, no bordered stat boxes, no pill-shaped verdict
badge. This replaces `classic`/`clean`/`bold` entirely — do not keep
them as additional options alongside the new one.

Do NOT touch the `props.tierOverride === 'pro'` block (the DealScore
white-label default cover) — that's a separate, unrelated cover path.
Leave it exactly as it is.

---

WHAT TO BUILD

A single cover layout, replacing the three `coverStyle` conditionals with
one unconditional block. Structure, top to bottom:

1. HEADER — thin row: logo top-left (reuse `props.logoBase64`,
   `logoHeight`, `logoMaxWidth` exactly as the existing code does), plain
   text page indicator top-right ("PAGE 1 OF {totalPages}" or whatever
   the existing page-count variable is called elsewhere in the file —
   search for how page numbers are rendered on other pages and match
   that pattern). Thin 1px bottom border in a light grey, full width.

2. BREADCRUMB — small muted text: `{DEAL_LABELS[props.dealType]} · {area
   or city}` (check what location data is already available as a prop —
   do not invent a new field if a suitable one exists; if nothing
   suitable exists, use just `DEAL_LABELS[props.dealType]` alone).

3. HEADING — the property address (`addressLine1` / `addressLine2`,
   reuse exactly as the existing covers do), large, bold, coloured with
   `brand` (or `readableBrand` if `brand` isn't sufficiently readable on
   white — check which variable the existing "Clean" cover uses for its
   heading-adjacent text and follow that precedent).

4. KEY STATS LINE — one line of plain text (not boxes): purchase price,
   refurb cost or GDV, project length or similar — reuse whatever
   strategy-specific summary values are already computed and available
   in this component (check `coverKeyMetric` and any other pre-computed
   summary variables near the top of the file before inventing new ones).

5. A short section styled like "Overview" — heading text with a 2px
   bottom border in `accent` colour under it (reuse the accent-underline
   pattern from the "Clean" cover's `borderBottom` usage), followed by
   the verdict sentence that's already generated elsewhere in the file
   for this deal (search for where `VERDICT_LABELS` / the existing
   verdict/summary sentence is built and reuse it — do not write new
   copy).

6. FOOTER AREA — `Prepared by {props.preparedBy.name}`, email, phone
   (reuse exactly as existing covers render this), and "Confidential —
   Prepared for investor review only", all in muted grey.

COLOUR: use `props.brandColour` (via whatever variable already resolves
it, e.g. `brand`/`readableBrand`) for the heading and any structural
elements, and `accent` for the underline rule and any highlight
elements — same dynamic-colour approach already used throughout the rest
of the file. Do not hardcode a specific brand colour.

TYPOGRAPHY: use `'DM Sans'` (already registered as of Prompt 1) for
everything on this page, `fontWeight: 'bold'` for the heading, regular
weight for everything else. No Helvetica references should remain on
this page after your edit — grep the block you're replacing to confirm.

---

WHAT TO REMOVE

- The `coverStyle === 'classic'` block
- The `coverStyle === 'clean'` block
- The `coverStyle === 'bold'` block
- Any styles/variables that were ONLY used by those three blocks and
  nothing else in the file (e.g. `coverBg`, `coverBgText`, `coverMuted`,
  `boldLine1`/`boldLine2`/`boldLine3` — check each is genuinely unused
  elsewhere before deleting; if any are still referenced later in the
  file, e.g. in a Pro Plus-specific section, leave them and note it in
  your report)
- The pill-shaped verdict badge View (the `backgroundColor: scoreColor +
  '25'` block) — replace with plain coloured text instead, no
  background/border pill shape
- Do NOT remove `coverStyle` from the props interface — the app's cover
  style selector UI may still reference it elsewhere; leave the prop
  itself in place even though this component no longer branches on it
  (flag this in your report so a follow-up can clean up the now-unused
  prop and its UI selector separately)

---

VERIFICATION

1. Run `npx tsc --noEmit` — zero errors required.
2. Run `git status` — confirm only DealScorePDF.tsx and
   DealScorePDFProPlus.tsx show as changed.
3. Generate an actual PDF for a Flip deal from both files and extract
   the text with pdftotext to confirm "Profit"/"Confidential" still
   extract correctly (regression check — this must still hold after
   today's font work).
4. Do NOT push. Report back:
   - tsc result
   - git status output
   - Any styles/variables you found still in use elsewhere and left in
     place (per the note above)
   - Confirmation of what the extracted cover-page text looks like
   - Any spot where a value you needed (e.g. area/city, key stats) didn't
     exist as a clean existing variable and what you used instead
