# REPLIT PROMPT D — Auto-fetch Sold Price Comps on Workings Tab Open

You are working on the DealScore app on branch `stage-6`. File: `artifacts/dealscore/src/components/AnalysisHub.tsx`

**Standing rule:** Only add the minimal code needed. Do NOT touch existing Supabase calls, auth, deal state, navigation, or routing.

---

## TASK: Auto-fetch sold price comparables when the Workings tab is opened

Currently the "Sold prices nearby" card requires the user to type a postcode and click Search. Update it so comps are fetched automatically when the tab opens, if the deal has a postcode.

### 1. Update `fetchComps` to accept an optional postcode override

Find the existing `fetchComps` function. Change its signature so it can receive a postcode directly (to avoid a timing issue where state may not have updated yet):

```typescript
// Before:
async function fetchComps() {
  const pc = compsPostcode.trim()
  ...
}

// After:
async function fetchComps(postcodeOverride?: string) {
  const pc = (postcodeOverride ?? compsPostcode).trim()
  ...
}
```

Make sure the Search button still calls `fetchComps()` (no argument) so it reads from the input field as before.

### 2. Update the useEffect that pre-populates `compsPostcode`

Find the existing `useEffect` that sets `compsPostcode` from `deal.postcode`. Update it to also auto-fetch:

```typescript
useEffect(() => {
  if (deal?.postcode) {
    setCompsPostcode(deal.postcode)
    fetchComps(deal.postcode)
  }
}, [deal?.postcode])
```

This means when the deal is opened (or the postcode changes), comps load automatically without any user action.

### 3. Hide the postcode input row when comps have already loaded

Optionally: if `compsData` is already populated (auto-fetched), collapse the postcode input into a small "Search a different postcode ▾" toggle so the card leads with results rather than an empty input. Only do this if it doesn't require significant restructuring — otherwise leave the input visible at all times.

---

After changes run `npx tsc --noEmit`. Zero errors before committing. Tell me:
1. Where you updated `fetchComps`
2. Which `useEffect` you modified
3. Whether you added the postcode input toggle
