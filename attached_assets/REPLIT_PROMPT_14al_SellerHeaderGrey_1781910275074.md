# REPLIT PROMPT 14al — Seller section: match grey header band

## What's wrong
The Seller section header shows "Seller" on a **white** background. Every other section (Property information, Property & purchase, Purchase financing, Refurb, Monthly costs, Ownership & tax, BTL project details, Deal terms) uses the `Sec` component which renders a **grey header band** at the top of the card — a distinct grey background strip containing the section title and badge.

The Seller section is either not using the `Sec` component, or is using it incorrectly.

**Dependency:** Prompt 14ak merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14al: seller header grey band" && git push origin stage-6`

---

## THE FIX

### Step 1 — Find how another section uses Sec

Look at how "Deal terms" or "Property information" is wrapped in the JSX. It will look something like:

```tsx
<Sec title="Deal terms">
  {/* fields */}
</Sec>
```

or with a badge:

```tsx
<Sec title="Property information" badge="Complete" badgeVariant="teal">
  {/* fields */}
</Sec>
```

### Step 2 — Wrap Seller content in the same Sec component

The Seller section content (search box, full name, phone, email, motivation pills, situation notes) must be wrapped inside `<Sec title="Seller" badge="Optional">`:

```tsx
<Sec title="Seller" badge="Optional">
  {/* Search existing sellers */}
  <div style={{ marginBottom: 12 }}>
    <input
      type="text"
      placeholder="Search existing sellers by name, phone or email..."
      style={{ width: '100%', ... }}
    />
    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>
      Or fill in manually below to create a new seller record
    </div>
  </div>

  {/* Full name / Phone / Email row */}
  {/* Motivation pills */}
  {/* Situation notes */}
</Sec>
```

### Step 3 — Verify visually

After the change, the Seller section card should look identical in structure to the Deal terms card directly below it:
- Grey header band at the top
- "Seller" title in same font/weight as other section titles
- "Optional" badge on the right of the header band
- White body area with the form fields below

---

## Summary checklist
- [ ] Seller section wrapped in `<Sec title="Seller" badge="Optional">` (or equivalent)
- [ ] Grey header band visible — matches Property information, Deal terms, etc.
- [ ] No custom header div remaining in Seller section
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
