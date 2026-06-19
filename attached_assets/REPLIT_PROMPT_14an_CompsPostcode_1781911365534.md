# REPLIT PROMPT 14an — Sold price comparables: auto-extract postcode from address

## What this does
The "Sold price comparables" Refresh button currently fetches data but doesn't know which postcode to use. The postcode should be extracted automatically from `deal.address` so the user never has to type it manually.

**Dependency:** Prompt 14am merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14an: comps postcode from address" && git push origin stage-6`

---

## FIX 1 — Extract postcode from deal.address

Add a utility function (or inline const) that parses the UK postcode from the address string:

```tsx
// UK postcode regex — matches e.g. "CF24 1RN", "SW1A 2AA", "M1 1AE"
const extractPostcode = (address: string): string | null => {
  const match = address?.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
  return match ? match[0].toUpperCase().replace(/\s+/, ' ') : null;
};

const postcode = extractPostcode(deal.address || '');
```

---

## FIX 2 — Pass postcode to Refresh handler

Find the `handleRefreshComps` function (or wherever the comparables fetch is triggered). Pass the extracted postcode:

```tsx
const handleRefreshComps = async () => {
  if (!postcode) {
    // Show inline error if no postcode found
    setCompsError('No postcode found in address — add a full address including postcode first.');
    return;
  }
  setCompsLoading(true);
  setCompsError(null);
  try {
    // Pass postcode to the fetch — adjust the actual call to match existing implementation:
    const data = await fetchComparables(postcode);  // or supabase edge function call
    setCompsData(data);
  } catch (e) {
    setCompsError('Could not fetch comparables. Try again.');
  } finally {
    setCompsLoading(false);
  }
};
```

---

## FIX 3 — Show postcode in the empty state UI

Update the empty state text to show which postcode will be used, so the user can confirm before clicking:

```tsx
{/* Empty state */}
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px',
  background: '#fff',
  border: '1px solid var(--ds-border,#e3e5e9)',
  borderRadius: 10,
}}>
  <div>
    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1,#1a1a2e)', marginBottom: 2 }}>
      Sold price comparables
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-2,#6c757d)' }}>
      {postcode
        ? `Fetch sold prices for ${postcode}`
        : 'Add a full address including postcode to fetch comparables'}
    </div>
  </div>
  <button
    onClick={handleRefreshComps}
    disabled={!postcode}
    style={{
      fontSize: 12,
      padding: '6px 14px',
      borderRadius: 6,
      border: '1px solid var(--ds-border,#e3e5e9)',
      background: postcode ? '#fff' : 'var(--bg-sec,#f5f6f8)',
      color: postcode ? 'var(--navy,#1B3A6B)' : 'var(--text-2,#6c757d)',
      cursor: postcode ? 'pointer' : 'not-allowed',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontWeight: 500,
      opacity: postcode ? 1 : 0.6,
    }}
  >
    ↻ Refresh
  </button>
</div>
```

---

## Summary checklist
- [ ] `extractPostcode()` utility parses UK postcode from `deal.address`
- [ ] `handleRefreshComps` uses extracted postcode — shows error if none found
- [ ] Empty state shows `"Fetch sold prices for CF24 1RN"` (or whichever postcode)
- [ ] Refresh button disabled + greyed out when no postcode detected
- [ ] No change to comparables fetch logic itself — only the postcode source changes
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
