# REPLIT PROMPT 17g — Scraper Clean Fix (Complete File Replacement)

## Branch: stage-6 | File: supabase/functions/scrape-property/index.ts

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

The `scrape-property` edge function was broken when Prompt 17f debug code was pasted directly into the Supabase dashboard. That broken version was deployed but was never committed to the repo — so **the Replit repo file is still the original clean version** without any of the 17c/17d/17e/17f improvements.

The file has now been updated at `supabase/functions/scrape-property/index.ts` in the repo with all changes applied cleanly. Your task is to commit this updated file and ensure it matches what is deployed to Supabase.

---

## WHAT CHANGED (all correctly inside try blocks)

The updated file adds to the original:

1. **`PropertyData` interface** — added `bathrooms?: string` and `country?: string`

2. **`normaliseCountry()` helper** — new function (placed with other helpers at bottom)

3. **`parseRightmove` try block** — all inside `try { ... }`:
   - Multi-path postcode: replaces single outcode/incode check with if/else including 5 fallback paths
   - Country: reads `prop.address.ukCountry` directly (no postcode inference needed for Rightmove)
   - Bathrooms: tries `prop.bathrooms`, `prop.bathroomCount`, `prop.numberOfBathrooms`, `prop.internalDetails?.bathrooms`, `prop.summary?.bathrooms`

4. **`parseZoopla` try block** — adds bathrooms and country extraction

5. **`parseOTM` try block** — adds bathrooms and country extraction

---

## TASK

### Step 1 — Verify the file looks correct

Read `supabase/functions/scrape-property/index.ts`. Confirm:
- `PropertyData` interface has `bathrooms?: string` and `country?: string`
- `normaliseCountry` function exists at the bottom
- Inside `parseRightmove`'s first `try` block: postcode if/else, ukCountry check, bathroomValue block — all present and all before `if (data.address || data.price) return data`
- No debug lines (`data.description = ... [DEBUG`)
- Zero structural issues (all braces balanced)

### Step 2 — Commit to repo

```bash
npx tsc --noEmit
git add supabase/functions/scrape-property/index.ts
git commit -m "fix: Prompt 17g — scraper clean fix (bathrooms, country, postcode fallbacks)" && git push origin stage-6
```

### Step 3 — Deploy to Supabase

The recommended deploy method (avoids Replit DNS issues with Supabase CLI):

1. Go to Supabase dashboard → Edge Functions → scrape-property → **Code** tab
2. Select all existing code (Ctrl+A / Cmd+A) and delete it
3. Paste the complete content of `supabase/functions/scrape-property/index.ts`
4. Click **Deploy updates**

Alternatively if Supabase CLI works in this shell session:
```bash
supabase functions deploy scrape-property
```

---

## TEST

After deploy, test with: `https://www.rightmove.co.uk/properties/89477043` (Elm Street, Cardiff)

Expected success banner: "Filled in: address, price, beds, **1 bath**, property type, **Wales**, tenure"

Expected in Inputs tab after creating deal:
- Property Type: Semi-detached house ✅
- Beds: 3 ✅
- Bathrooms: 1 ✅
- Country/Tax Region: Wales ✅
- Tenure: Freehold ✅

---

## REPORT BACK

1. Did the scraper return data successfully (no "Could not read that listing" error)?
2. What fields populated in the success banner?
3. Did country show Wales correctly?
4. Did bathrooms show 1?
