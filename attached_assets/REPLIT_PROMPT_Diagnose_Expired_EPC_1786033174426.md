# Replit Agent Prompt — Diagnose & Fix: Flag Expired EPC Certificates Instead of Silently Excluding Them

**Branch: confirm you are on `production-candidate`.**

## Background

A real address (26 Church Crescent, Ebbw Vale, NP23 6UG) shows a `no_match` result in the app, but the public gov.uk certificate lookup confirms it genuinely has a certificate — just an **expired** one (23 July 2025, past its 10-year validity). The theory is that the search API may exclude expired certificates from results entirely, which would explain why our search-then-match logic never found anything to match against. This needs confirming before deciding what to do about it.

## Step 1 — Diagnose (mandatory, do not write a fix until this is confirmed)

1. Call `GET /api/domestic/search?postcode=NP23+6UG` directly and log the **full raw results array**.
2. Check specifically whether **"26 Church Crescent" / "26, Church Crescent"** appears anywhere in that array at all.
   - **If it's present**: check what fields are available on that record — is there a `registrationDate` (confirmed to exist from earlier diagnostics), and/or any explicit expiry-related field we haven't seen before (e.g. `expiryDate`, `lodgementDate`, `validUntil`)? Note that UK EPCs are valid for exactly 10 years from registration, so expiry may need to be **calculated** (`registrationDate + 10 years`) rather than being an explicit field — check both possibilities.
   - **If it's absent entirely**: this confirms the search API itself excludes expired certificates from results, meaning there's genuinely nothing for our matching logic to find — this is an external API limitation, not something fixable in our matching code. Report this clearly and stop — do not attempt a workaround that isn't possible given the API's actual behaviour.
3. Also check the `/api/certificate?certificate_number=...` response for this specific certificate (if you can find its certificate number from the gov.uk public site or any other means) to see if the fuller certificate record includes an explicit expiry field even if the search endpoint doesn't.

## Step 2 — Only if the certificate IS retrievable (from search or from a known certificate number)

If it turns out expired certificates genuinely are accessible via the API (just perhaps requiring a slightly different search approach, or being present in results but simply not surfaced by our current matching), then:

1. Calculate whether a matched certificate is expired: `registrationDate + 10 years < today`.
2. If expired, still return the match (don't discard it), but include a new `expired: true` flag alongside the existing `matched` status, rather than a fourth confusing status category.
3. In `Home.tsx`, when `expired: true` comes back, still populate Floor Area/Property Type/etc. as normal (expired data is still real historical data about the property, better than nothing), but show a distinct warning alongside it — e.g. "⚠️ This EPC certificate expired on [date] — data may be outdated, please verify" — styled similarly to the existing amber "couldn't confirm match" warning, but with different wording so the two cases aren't confused with each other.

## If Step 1 confirms expired certificates are NOT retrievable via this API at all

Do not attempt Step 2. Instead, report back clearly that this is a genuine limitation of the free gov.uk API (search appears to only return currently-valid certificates), and that surfacing expired certificates would require either: paying for a different data source, or scraping the public gov.uk certificate lookup site directly (which has its own risks — no official API, could break if their site changes, may not be an approved use of that public service). Don't implement a scraping workaround without discussing it first — just report the finding.

## Verification before pushing (only applicable if Step 2 was reached)

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Test with 26 Church Crescent, NP23 6UG (or the equivalent) on the deployed branch preview and confirm the expired warning shows correctly alongside the (still populated) data.
4. Confirm a genuinely non-existent/no-certificate address still shows the correct "no certificate found" message, not confused with the new expired-warning path.
5. Do not push automatically — report back Step 1's findings first regardless of outcome, and if Step 2 was reached, report what changed and the test results, before you push to `production-candidate`.
