The three DM Sans font files at src/fonts/ have been replaced with versions
that have the 'liga' Standard Ligatures GSUB lookup stripped out (same
filenames, so no code changes needed — Font.register already points at
the right paths).

Please do the following now:

1. Generate an actual PDF for a Flip deal from both DealScorePDF.tsx and
   DealScorePDFProPlus.tsx, and save the output files to disk.

2. Extract the text layer using `pdftotext` if it's available in this
   environment, otherwise a short Python script using `pypdf` or
   `pdfplumber` (check what's already available before installing
   anything new — if nothing is available, install pdfplumber via pip
   or poppler-utils via apt for pdftotext).

3. Search the extracted text output for "Profit", "Confidential", and
   "financial" — confirm each one is present with every letter intact in
   the extracted string, not just on the rendered page.

4. Separately, open the generated PDF and visually check that text using
   fontStyle: 'italic' still displays as genuinely slanted, not upright —
   the italic font file changed (it's now a flattened static instance
   instead of a variable font), so this needs re-confirming even though
   it worked before.

5. Report back:
   - The exact extracted-text output for at least one sentence containing
     "Profit" or "Confidential" — paste the actual extracted string.
   - Confirmation of what the italic text looked like.
   - tsc result and git status (should show only the three font files as
     changed, no .tsx changes).

Do NOT push yet — report back first.
