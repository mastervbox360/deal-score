# REPLIT PROMPT 3 — Wire Dead Nav Buttons in DealChrome
> Run AFTER Prompt 2 is complete and tsc passes. Quick change — 4 buttons in one file.

---

## Context

`DealChrome.tsx` already uses `useNavigate` and `navigate()` throughout. Every other button in the file is wired. There are exactly **4 dead nav buttons** that have no `onClick`. All four are in the `<header>` section.

**Do NOT touch any other button in DealChrome.** All other buttons are intentionally stubbed with toasts or already wired with navigate().

---

## The exact change — `DealChrome.tsx` only

Find these two `<nav>` blocks in the header. They are rendered exactly like this:

```tsx
{/* Left nav — around line 303 */}
<nav className="hdr-nav">
  <button className="hn on" onClick={() => navigate('/dashboard')}>Deals</button>
  <div className="hn-sep"></div>
  <button className="hn">Pipeline</button>
  <div className="hn-sep"></div>
  <button className="hn">Compare</button>
</nav>

{/* Right nav — around line 321 */}
<nav className="hdr-right-nav">
  <button className="hn">Sellers</button>
  <div className="hn-sep"></div>
  <button className="hn">Investors</button>
</nav>
```

Replace them with:

```tsx
{/* Left nav */}
<nav className="hdr-nav">
  <button className="hn on" onClick={() => navigate('/dashboard')}>Deals</button>
  <div className="hn-sep"></div>
  <button className="hn" onClick={() => navigate('/pipeline')}>Pipeline</button>
  <div className="hn-sep"></div>
  <button className="hn" onClick={() => navigate('/compare')}>Compare</button>
</nav>

{/* Right nav */}
<nav className="hdr-right-nav">
  <button className="hn" onClick={() => navigate('/sellers-crm')}>Sellers</button>
  <div className="hn-sep"></div>
  <button className="hn" onClick={() => navigate('/investors-crm')}>Investors</button>
</nav>
```

That is the entire change. No new imports, no new hooks — `useNavigate` and `navigate` are already declared at the top of the component.

---

## After making the change

1. Run `npx tsc --noEmit` — zero errors required before committing
2. Commit: `git add -A && git commit -m "fix: wire Pipeline, Compare, Sellers, Investors nav buttons in DealChrome" && git push origin stage-6`
3. Confirm: report back that exactly 4 `onClick` handlers were added and nothing else was changed
