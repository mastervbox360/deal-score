# REPLIT PROMPT 17f — Postcode Fallback Paths + Debug

## Branch: stage-6 | File: supabase/functions/scrape-property/index.ts + DashboardPage.tsx

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## PROBLEM

After 17e, the address field still shows `"Elm Street, Cardiff"` with no postcode. This means `d.postcode` is empty — `prop.address.outcode` and `prop.address.incode` are undefined for this listing in Rightmove's `__NEXT_DATA__`. The postcode is stored under a different field path.

---

## FIX 1 — Add postcode fallback paths in `scrape-property` edge function

Open `supabase/functions/scrape-property/index.ts`. Find `parseRightmove`.

**Replace the current postcode extraction block:**

```typescript
// CURRENT (remove this):
if (prop.address?.outcode || prop.address?.incode) {
  data.postcode = [prop.address.outcode, prop.address.incode].filter(Boolean).join(' ')
}
```

**With this multi-path version:**

```typescript
// Try every known field path Rightmove has used for postcode across schema versions
const outcode = prop.address?.outcode || prop.address?.outCode || ''
const incode  = prop.address?.incode  || prop.address?.inCode  || ''

if (outcode || incode) {
  data.postcode = [outcode, incode].filter(Boolean).join(' ').trim()
} else {
  // Fallback paths used in some Rightmove __NEXT_DATA__ versions
  const altPostcode =
    prop.address?.postcode          ||
    prop.address?.ukPostcode        ||
    prop.address?.fullPostcode      ||
    prop.location?.postcode         ||
    prop.location?.postalCode       ||
    prop.contactInfo?.address?.postcode ||
    prop.staticMapImgUrls?.postcode ||  // sometimes embedded in map url params
    ''
  if (altPostcode) data.postcode = String(altPostcode).trim()
}

// DEBUG — include the raw address object in the response so we can see
// what fields Rightmove is actually returning. REMOVE after confirming.
data.description = (data.description || '') +
  ` [DEBUG addr keys: ${Object.keys(prop.address || {}).join(',')}]`
```

Redeploy:
```
supabase functions deploy scrape-property
```

---

## FIX 2 — Ensure postcode appended correctly in DashboardPage.tsx

Open `DashboardPage.tsx`. Find the address setter in `handleScrapeUrl` (added in 17e):

```tsx
const fullAddress = (d.postcode && !d.address.includes(d.postcode.split(' ')[0]))
  ? `${d.address}, ${d.postcode}`
  : d.address
```

Update to also trim and guard against empty strings:

```tsx
const pc = (d.postcode || '').trim()
const fullAddress = (pc && !d.address.toUpperCase().includes(pc.split(' ')[0]))
  ? `${d.address}, ${pc}`
  : d.address
```

---

## AFTER TESTING — WHAT TO REPORT

Test with `https://www.rightmove.co.uk/properties/89477043` (Elm Street, Cardiff).

After the Fill in button fires, the success message should appear. Then check the deal description field (or have Replit log to console) — the DEBUG line will show `[DEBUG addr keys: displayAddress,outcode,incode,ukCountry,...]` or similar.

**Report back:**
1. What keys are listed in `[DEBUG addr keys: ...]`?
2. Is there a postcode-looking key in that list?
3. What does the address field show — does it now include a postcode?

Once we confirm the right key, we'll remove the debug line and lock in the correct field path.

---

Commit:
```
git add -A && git commit -m "debug: Prompt 17f — postcode fallback paths + address key debug" && git push origin stage-6
```
