# REPLIT PROMPT 14ai — Darken input field labels

## Why
The uppercase field labels on the inputs page ("ADDRESS *", "PROPERTY TYPE *", "BATHROOMS" etc.) use `var(--text-2)` = `#6c757d`. At small uppercase sizes this reads as faint. Darkening to `#52606d` gives noticeably better readability while keeping the visual hierarchy between label and input value intact. The "— select —" placeholder text is also likely too light and should be bumped slightly.

**Dependency:** Prompt 14ah merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ai: darker input field labels" && git push origin stage-6`

---

## FIX 1 — IField component: label colour

Find the `IField` component (likely `IField.tsx` or defined inside the inputs file). Find the label element — it will have a style using `color: 'var(--text-2)'` or `color: '#6c757d'`.

Change it to:

```tsx
// Label text (e.g. "ADDRESS *", "PROPERTY TYPE *"):
color: '#52606d',   // ← was var(--text-2) / #6c757d — one shade darker
```

Apply this to **all** label elements inside `IField` — both the main label and any sub-labels or hint text that used `var(--text-2)`.

**Exception:** secondary hint text, source badges (GOV.UK), and optional indicators should stay at `var(--text-2)` or lighter — only the primary field label name gets darkened.

---

## FIX 2 — Select/dropdown placeholder text

Find the "— select —" placeholder text in dropdown/select inputs. This is likely styled with a lighter grey (possibly `#adb5bd` or `var(--text-2)`).

Change placeholder colour to `#6c757d` (the old label colour — still muted but more readable than near-white):

```css
/* In any global select or dropdown placeholder styles: */
color: '#6c757d'   /* was lighter — bump to at least this */
```

In React inline styles, this would be on the placeholder option or via a CSS class on the select element.

---

## FIX 3 — Sec component section headers (if applicable)

If the `Sec` component section header labels (the grey group labels like "OPTIONAL DETAILS") also use `var(--text-2)`, update those too to `#52606d`.

---

## What NOT to change
- `var(--text-2)` used for secondary/hint text, source badges, optional pill text, read-only field values — leave these at current colour
- The global `--text-2` CSS variable itself — do NOT change the variable, only override at specific elements
- Input value text (the user-entered data) — already uses `var(--text-1)`, leave as-is

---

## Summary checklist
- [ ] `IField` label text: `color: '#52606d'`
- [ ] Select/dropdown placeholder: `color: '#6c757d'` or darker
- [ ] `Sec` group header labels: `color: '#52606d'` if previously using `var(--text-2)`
- [ ] Hint text, badges, optional indicators: unchanged at `var(--text-2)`
- [ ] Visual check: labels clearly readable, still subordinate to input values
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
