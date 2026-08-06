REPLIT PROMPT — Prompt 1b: Add DM Sans Italic (follow-up to Prompt 1)
Branch: production-candidate

A third font file has been added at:
  artifacts/dealscore/src/fonts/DMSans-Italic.ttf

This is a variable-format font (contains the full weight range within one
file) rather than a single static weight like the Regular/Bold files —
that's expected, it's how Google now distributes this specific file, but
it means the rendering result needs to be visually confirmed, not just
type-checked. Follow the steps in order and do not skip the visual check.

---

STEP 1 — Register the italic

In BOTH DealScorePDF.tsx and DealScorePDFProPlus.tsx, add a third entry
to the existing DM Sans Font.register call (do not create a second
Font.register block — add to the existing `fonts:` array):

  { src: new URL('../fonts/DMSans-Italic.ttf', import.meta.url).href, fontStyle: 'italic' },

Match whatever relative path pattern (`../fonts/...`) Prompt 1 already
used for the other two files in each file — confirm the exact working
pattern from the existing Regular/Bold entries rather than assuming.

---

STEP 2 — Replace Helvetica-Oblique

Find every remaining `fontFamily: 'Helvetica-Oblique'` in both files
(there were 49 in each after Prompt 1). Replace with:

  fontFamily: 'DM Sans', fontStyle: 'italic'

Grep both files for 'Helvetica-Oblique' afterward to confirm zero remain.

---

STEP 3 — Visual verification (required, do not skip)

tsc passing does NOT confirm the italic renders correctly — variable
fonts can silently fail to italicise in some PDF renderers even when the
type-checker and the build are both happy. Before reporting this done:

1. Generate an actual PDF from the Preview/dev environment for one deal
   (any strategy with populated data — Flip is fine) using both
   DealScorePDF.tsx and DealScorePDFProPlus.tsx.
2. Open the generated PDF and find a section that previously used
   Helvetica-Oblique — visually confirm the text is genuinely slanted/
   italic, not upright DM Sans, and not a missing-glyph or fallback-font
   rendering.
3. If it does NOT render as italic — report this back exactly as
   observed (e.g. "renders upright, not slanted" or "falls back to
   Helvetica") rather than reporting Step 1-2 as complete. Do not guess
   at a fix — stop and report the actual behaviour.

---

VERIFICATION

1. `npx tsc --noEmit` — zero errors.
2. `git status` — confirm only the two .tsx files and the new font file
   show as changed.
3. Do NOT push. Report back:
   - tsc result
   - git status output
   - Confirmation of what STEP 3's visual check actually showed (not just
     that a PDF was generated — what the italic text looked like)
