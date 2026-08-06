The three font files at src/fonts/ have been replaced again with a new
build (same filenames, no code changes needed). This time:

- Regular and Bold were fixed with a direct fonttools edit instead of a
  FontForge round-trip (FontForge was silently corrupting device tables
  in the kerning data last time).
- Italic was properly re-instantiated from the original variable font
  using fonttools' instancer, instead of FontForge's flatten step, which
  is what produced the GPOS Extension Positioning lookups fontkit
  couldn't parse.

Please re-run the same verification as before:

1. Generate an actual PDF for a Flip deal from both DealScorePDF.tsx and
   DealScorePDFProPlus.tsx.

2. Most important this time: confirm the italic font no longer crashes
   PDF generation at all. Last time DMSans-Italic.ttf caused a fontkit
   parse failure ("Unknown version 11814") as soon as italic text was
   rendered. Try rendering a section that actually uses italic text
   (formula annotations, area average yield captions, or any
   fontStyle: 'italic' text) and confirm it completes without error.

3. Extract the text layer with pdftotext (or pypdf/pdfplumber) and
   confirm "Profit", "Confidential", and "financial" all extract with
   every letter intact, same check as before.

4. Visually confirm the italic text actually displays as slanted, not
   upright.

5. Report back:
   - Whether PDF generation completed without error for both files
   - The exact extracted-text output proving the fi-fix still holds
   - What the italic text looked like
   - tsc result and git status (should show only the 3 font files
     changed)

Do NOT push yet — report back first.
