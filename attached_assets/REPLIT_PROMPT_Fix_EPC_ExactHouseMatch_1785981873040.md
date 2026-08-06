# Replit Agent Prompt — Fix: EPC House Number Matching False Positive

**Branch: confirm you are on `production-candidate`.**

## The bug

`netlify/functions/epc-lookup.js` currently matches using `a1.startsWith(houseToken) || a2.startsWith(houseToken)`. This is a prefix match, not an exact house-number match — so a search for house number "65" would incorrectly match "65A Horwood Close", "65B Horwood Close", and "650 Some Other Road" too, since all of them start with "65". This could cause the wrong property's EPC data (including floor area) to be confidently matched and presented as correct, which is the exact failure mode this whole fix was built to prevent.

## What to do

Read the current matching logic in `netlify/functions/epc-lookup.js` in full before editing.

Replace the prefix-based `startsWith` check with an **exact house-number-and-suffix comparison**:

1. Extract the leading numeric portion and any immediately-following letter suffix from both `houseToken` (the entered address's house number) and each EPC result's address line — e.g. using a regex like `/^(\d+)([a-z]?)/` against the normalised (lowercased, non-alphanumeric-stripped) string.
2. Compare the numeric part and letter-suffix part **exactly** between the two — "65" should match only "65" (no suffix) or a result that's genuinely just "65", never "65a" or "65b" or "650". "65a" should match only "65a", not "65" or "65ab".
3. Handle the case where the entered address has no letter suffix but the EPC record does, and vice versa — these should NOT match (e.g. entering "65" should not match an EPC record for "65a", since they're different properties in reality).
4. Keep the rest of the matching flow the same — this only changes the comparison itself, not the overall matched/no_match/no_certificate state logic, which is already correct.
5. Apply the same exact-match logic to both `addressLine1` and `addressLine2` checks (houses and flats), consistent with how the current code checks both.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required (this is a `.js` Netlify function, so this may not apply directly — just confirm no TypeScript errors were introduced elsewhere).
2. Confirm `git status` shows only intended files.
3. Test with the address that surfaced this bug (65a Horwood Close, Cardiff CF24 2LY) on the deployed branch preview — confirm it still matches correctly.
4. If possible, construct a quick test case (either via the diagnostic logging already in place, or a temporary test call) confirming that a plain "65" query does NOT match a "65a" or "65b" record on a postcode where both exist, and that "65a" does NOT match a plain "65" record.
5. Do not push automatically — report back what changed and the test results, and I'll verify before you push to `production-candidate`.
