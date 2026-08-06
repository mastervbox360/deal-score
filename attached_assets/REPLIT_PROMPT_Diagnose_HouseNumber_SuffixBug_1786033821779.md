# Replit Agent Prompt — Diagnose: House Number Matching May Be Consuming the Street Name's First Letter as a Suffix

**Branch: confirm you are on `production-candidate`, and confirm this branch's latest deploy on Netlify is genuinely built from the current HEAD commit before doing anything else — check the deploy's commit hash matches, since testing against a stale deploy has caused false alarms earlier in this session.**

## The suspected bug

"26 Church Crescent, Ebbw Vale NP23 6UG" is showing `no_match` even though the certificate is confirmed present in search results (address `"26, Church Crescent"`, confirmed in an earlier diagnostic). The suspected cause: the `parseHouseNum` regex (`/^(\d+)([a-z]?)/`) doesn't require a boundary between the house number and whatever follows, so when applied to a fully-normalised string like `"26churchcrescent"` (spaces/punctuation stripped, lowercased), it may be capturing **"c" from "Church"** as if it were a house-number suffix (as though the property were "26c"), rather than correctly identifying there's no real suffix on "26".

## Step 1 — Confirm with real values (mandatory, do not fix blind)

1. Log the exact output of `parseHouseNum` for both sides of this specific real case:
   - The entered house token (from "26 Church Cres, Ebbw Vale NP23 6UG") — whatever `houseToken` extraction currently produces.
   - The candidate's normalised address string for `"26, Church Crescent"` (or however it's currently normalised) as it goes into `parseHouseNum`.
2. Report the actual `{ num, suffix }` result for both sides. If the candidate side comes back as `{ num: "26", suffix: "c" }` while the entered side is `{ num: "26", suffix: "" }`, that confirms the bug exactly as suspected — a false mismatch caused by consuming part of the street name.
3. **Also check whether this affected the earlier "65 vs 65a Horwood Close" test that was used to verify the fix** — re-check what `parseHouseNum` actually produced for `"65horwoodclose"` in that earlier test. If it also incorrectly produced a suffix there (e.g. `"h"` from "Horwood"), the earlier test may have passed for the wrong reason (both numbers happened to differ, masking this bug) rather than proving the suffix logic was correct.

## Step 2 — Fix, only once Step 1 confirms the real cause

The fix should ensure the house-number-and-suffix extraction only captures a genuine suffix letter — one immediately followed by a non-letter (space, comma, end of string, or a digit), not one that's actually the start of the next word. A safer approach: **extract the house number and suffix from the original (non-fully-stripped) string**, where spaces/commas are still intact, before doing the full alphanumeric-only normalisation for the rest of the comparison — e.g. match against `/^(\d+)([a-zA-Z])?(?=[\s,]|$)/` on the address with spacing preserved, which requires the suffix letter (if any) to be followed by a space, comma, or end of string, not another letter.

Apply this fix consistently to both sides of the comparison (the entered house token and every candidate address line), and to both `addressLine1`/`addressLine2` checks.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Re-run the diagnostic from Step 1 with the fix applied — confirm "26" now correctly parses with no suffix on both sides, and the match succeeds.
4. Re-verify the original false-positive prevention case still works correctly: "65" should still NOT match "65a" or "65b", and "65a" should still only match "65a" — confirm this explicitly with the corrected parsing logic, don't assume the earlier test still holds.
5. Do not push automatically — report Step 1's findings first (this is important even if Step 2 isn't reached), then what changed in Step 2 if applicable, the `tsc` result, and I'll verify before you push to `production-candidate`.
