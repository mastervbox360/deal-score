REPLIT PROMPT — Prompt 2 follow-up: page number styling
Branch: production-candidate

In DealScorePDF.tsx, there are two spots rendering page numbers as
`Page ${pageNumber} of ${totalPages}` (around lines 742 and 1427 as of
this branch — search to confirm current line numbers, they may have
shifted). Check DealScorePDFProPlus.tsx for the same pattern too.

Change the text to uppercase: `PAGE ${pageNumber} OF ${totalPages}`.

Also find the style object applied to this text (search just above each
`render={...}` call for the `<Text style={...}>` wrapper) and add
letter-spacing to match the reference pack's crisp small-caps metadata
look:

  letterSpacing: 0.8

Keep the existing fontSize and color as they are — only add
letterSpacing and change the string to uppercase. Do this consistently
across every occurrence in both files.

VERIFICATION:
1. npx tsc --noEmit — zero errors.
2. git status — confirm only the expected files changed.
3. Generate a PDF from both files and confirm the page number now reads
   "PAGE 1 OF 8" style (uppercase, visibly letter-spaced) rather than
   "Page 1 of 8".
4. Do NOT push. Report back tsc result, git status, and confirm how many
   occurrences were changed in each file.
