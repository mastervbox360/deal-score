# Replit Agent Prompt — Small Addendum: Show Comparable Distance Visibly

**Branch: confirm you are on `production-candidate`, and confirm the geocoding work (Prompt 2) has already landed before starting this.**

This is a small, self-contained addition — not part of the scoring engine (that's a separate prompt still to come). Right now, once a comparable's postcode is geocoded, the distance from the subject property is only visible via a `console.log` — not shown anywhere in the actual UI. This prompt just makes it visible.

Read the comparable card section in `Home.tsx` (where the postcode `onBlur` geocoding and the dev console log currently live).

## What to do

1. After a comparable's postcode is successfully geocoded (its `lat`/`lng` are populated) **and** the subject property's own `lat`/`lng` are also available, calculate the distance using the existing `haversineMiles` function and display it as a small, unobtrusive label within that comparable's card — e.g. directly under or beside the Postcode field, styled consistently with other small helper/hint text already used elsewhere in the form (such as the floor area conversion hint added in an earlier session). Something like *"0.6 miles from subject property"*.
2. If the postcode hasn't been geocoded yet (still typing, or blank), show nothing — don't display a placeholder or a loading state, just omit the label until a real distance is available.
3. If the postcode failed to geocode (404 / invalid postcode, `lat`/`lng` stayed null), show a small neutral note instead — e.g. *"Distance unavailable — check postcode"* — so the user has a signal something didn't resolve, without it looking like an error.
4. If the **subject property's own** postcode hasn't been geocoded yet (e.g. it wasn't entered, or lookup hasn't completed), the comparable's distance can't be calculated — in that case just omit the label rather than showing an error, since the comparable's postcode is correctly resolved even though nothing can be compared yet.
5. You can leave or remove the existing dev `console.log` at your discretion — it's harmless either way, just no longer the only way to see the distance.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Re-test with the same real postcodes already verified (subject `SW1A 1AA`, comparable `SW1A 2AA`) and confirm the distance now shows visibly in the UI, matching the value already confirmed correct in the console (~0.6 miles).
4. Test an invalid postcode and confirm the "unavailable" note shows instead of a broken or blank state.
5. Do not push automatically — report back what changed, the `tsc` result, and a screenshot of the visible distance label, and I'll verify before you push to `production-candidate`.
