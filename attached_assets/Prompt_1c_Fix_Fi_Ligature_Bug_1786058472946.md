REPLIT PROMPT — Prompt 1c: Fix "fi" text corruption bug
Branch: production-candidate

CONTEXT — do not skip this, it explains why the fix must be verified by
extracting text, not by looking at the page:

IMPORTANT CORRECTION: this bug is NOT visible on the rendered page. A
generated PDF from this branch displays correctly on screen and in
print — "Profit", "Confidential", "financial" all render with every
letter present and correctly formed. Do NOT try to reproduce this by
looking at a screenshot or the Preview pane; you will not see anything
wrong, because there isn't anything visually wrong.

The bug is in the PDF's underlying text layer — the invisible data used
for copy-paste, screen readers, search (Ctrl+F), and any tool that
extracts text programmatically rather than rendering it visually. When
that text layer is extracted, every instance where "f" and "i" are
adjacent in a word is missing the "i": "Profit" extracts as "Proft",
"Confidential" as "Confdential", "financial" as "fnancial". This is
confirmed by extracting text from an actual generated PDF, not assumed.

This is a known, long-standing @react-pdf/renderer issue — GitHub issue
#915 on diegomura/react-pdf, titled "Text copied from PDF is sometimes
incorrect": "When text in PDF contains string fi the resulting document
is bit broken - when text is copied, it is not matching text visible in
PDF... happens with different fonts, but not with those which are
built-in." That's exactly this. It's caused by how fontkit resolves the
font's "fi" ligature glyph (GSUB table) for embedded/custom fonts when
building the PDF's ToUnicode CMap (the mapping PDF readers use to know
what Unicode character a glyph represents) — built-in fonts like
Helvetica don't go through the same embedded-font glyph substitution
path, which is why the earlier Helvetica-based packs didn't have this
problem.

Severity note: this does NOT block the visual restyle work in Prompts 2
and 3 — the pack looks correct to every investor who reads it on screen.
It's worth fixing before this branch is considered fully production
ready (accessibility, copy-paste, and searchability all depend on a
correct text layer), but it is not an urgent blocker the way a visible
defect would be. Deprioritise this below Prompts 2/3 if time is tight.

There is no single universally-agreed fix. Try the steps below IN ORDER
and stop as soon as one actually works — confirmed by extracting text
from a generated PDF and checking the extracted string, not by assuming
a code change fixed it and not by eyeballing the rendered page.

---

STEP 1 — Check for a version fix first

Run `npm list @react-pdf/renderer @react-pdf/fontkit` (or check
package.json) to see the currently installed versions. Check the
diegomura/react-pdf GitHub releases/changelog for whether issue #915 or
any ligature-related bug has been fixed in a version newer than what's
currently installed.

If a newer version is available and its changelog mentions font/ligature/
glyph substitution fixes: upgrade @react-pdf/renderer (and @react-pdf/
fontkit if it's a separate dependency) to that version, run
`npx tsc --noEmit`, then go straight to STEP 4 (verification) before
trying anything else. An upstream fix is the cleanest outcome — don't
attempt STEP 2 or 3 if this works.

If no relevant newer version exists, or upgrading is not feasible without
breaking other things: move to STEP 2.

---

STEP 2 — Try disabling ligature substitution via style

For the base text style(s) used across both DealScorePDF.tsx and
DealScorePDFProPlus.tsx (wherever the DM Sans fontFamily is applied),
try adding:

  fontFeatureSettings: '"liga" 0'

Check react-pdf's documentation/type definitions first to confirm this
style property is actually supported by the version installed — do not
add it speculatively if react-pdf's Style type doesn't recognise it,
since that would just be dead code. If it's not a recognised style prop
in this version, skip to STEP 3.

If it is supported: apply it, run `npx tsc --noEmit`, then go to STEP 4.

---

STEP 3 — Report back without guessing further

If neither STEP 1 nor STEP 2 produces a working fix, do NOT attempt
further speculative workarounds (e.g. manually inserting zero-width
characters into every string — this doesn't scale, the corrupted text
comes from dozens of different dynamic sources: addresses, narrative
fields, disclaimers, formatted currency labels, etc., not a fixed list
of strings you could patch individually).

Instead, report back exactly what you tried, what you found in the
@react-pdf/renderer changelog and issue tracker, and stop there. This
needs a human decision (e.g. whether to swap fonts, pin an older/newer
dependency, or accept a temporary known limitation) rather than an
Agent-invented workaround.

---

STEP 4 — Verification (required regardless of which step fixed it)

Visual inspection will NOT catch this bug — the page looks correct
either way. You must extract the actual text layer from a generated PDF
and check the extracted string.

1. Generate an actual PDF for a Flip deal (any strategy is fine) from
   both DealScorePDF.tsx and DealScorePDFProPlus.tsx, and save the
   output files to disk.
2. Extract the text layer using a command-line tool — `pdftotext` if
   available in this environment, otherwise a short Python script using
   `pypdf` or `pdfplumber` (check what's already available before
   installing something new). Run it against both generated PDFs.
3. Search the extracted text output for "Profit", "Confidential", and
   "financial" — confirm each one is present with every letter intact
   in the extracted string, not just on the rendered page.
4. Separately, re-verify the italic rendering from Prompt 1b is still
   working — that one DOES need a visual check (open the PDF and look),
   since it's about how text displays, not the text layer.
5. Report back the exact extracted-text output for at least one sentence
   containing "Profit" or "Confidential" — paste the actual extracted
   string, not a summary of whether it looked right.

---

Do NOT push. Report back:
- Which step fixed it (1, 2, or neither)
- tsc result
- git status output
- The exact verification wording from STEP 4
