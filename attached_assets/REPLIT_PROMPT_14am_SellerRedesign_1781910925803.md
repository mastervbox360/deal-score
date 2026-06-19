# REPLIT PROMPT 14am — Seller section: intelligent CRM redesign + relocate

## What this does
Replaces the current flat Seller form with a smart 4-state component inspired by Attio/Pipedrive/Linear contact association. Also moves the section to immediately after "Property information" — the sourcer knows the property and seller at the same time, so they belong together at the top before strategy and financials.

**Dependency:** Prompt 14al merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14am: seller CRM redesign + relocation" && git push origin stage-6`

---

## PART A — Move Seller section

In the JSX render order, move the entire Seller section so it appears **immediately after the Property information `<Sec>` block** and **before Property photos**.

New order:
```
1. Property information   ← unchanged
2. Seller                 ← moved here (was near the bottom)
3. Property photos        ← unchanged
4. Strategy selection
5. Property & purchase
... (rest unchanged)
```

---

## PART B — Redesign Seller section as a 4-state smart component

Replace the current Seller section content with the following state machine. Use a local state variable `sellerUiState` with values: `'search'` | `'results'` | `'linked'` | `'create'`.

Initial state: `'search'` if no seller linked, `'linked'` if `deal.sellerName` already has a value.

---

### Wrapper — Sec component header (unchanged from 14al)

```tsx
<Sec title="Seller" badge="Optional">
  {/* Smart seller content below */}
</Sec>
```

---

### STATE 1 — `'search'`: just a search input

```tsx
{sellerUiState === 'search' && (
  <div style={{ padding: '14px 16px' }}>
    <div style={{ position: 'relative' }}>
      {/* Search icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-2,#6c757d)" strokeWidth="2"
        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="text"
        placeholder="Search by name, phone or email…"
        value={sellerSearch}
        onChange={e => { setSellerSearch(e.target.value); setSellerUiState('results') }}
        style={{
          width: '100%',
          padding: '9px 10px 9px 32px',
          border: '1px solid var(--ds-border,#e3e5e9)',
          borderRadius: 8,
          fontSize: 13,
          color: 'var(--text-1,#1a1a2e)',
          background: '#fff',
          outline: 'none',
        }}
      />
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-2,#6c757d)', marginTop: 8 }}>
      Find an existing seller or add a new one
    </div>
  </div>
)}
```

---

### STATE 2 — `'results'`: inline dropdown of matches + add new option

```tsx
{sellerUiState === 'results' && (
  <div style={{ padding: '14px 16px' }}>
    {/* Search input — same as above, stays editable */}
    <div style={{ position: 'relative' }}>
      <svg ... style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>...</svg>
      <input
        type="text"
        value={sellerSearch}
        onChange={e => setSellerSearch(e.target.value)}
        autoFocus
        style={{ width: '100%', padding: '9px 10px 9px 32px', border: '1px solid var(--navy,#1B3A6B)', borderRadius: 8, fontSize: 13, color: 'var(--text-1)', background: '#fff', outline: 'none' }}
      />
    </div>

    {/* Results dropdown */}
    <div style={{
      marginTop: 6,
      border: '1px solid var(--ds-border,#e3e5e9)',
      borderRadius: 8,
      background: '#fff',
      overflow: 'hidden',
    }}>
      {/* Map over filtered sellers from state/props — each row: */}
      {filteredSellers.map(seller => (
        <div
          key={seller.id}
          onClick={() => { setLinkedSeller(seller); setSellerUiState('linked') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderBottom: '1px solid var(--ds-border,#e3e5e9)', cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sec,#f5f6f8)'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          {/* Initials avatar */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#E1F5EE', color: '#0F6E56',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 500, flexShrink: 0,
          }}>
            {seller.name.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1,#1a1a2e)' }}>{seller.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2,#6c757d)' }}>{seller.phone}{seller.email ? ` · ${seller.email}` : ''}</div>
          </div>
          {seller.dealCount > 0 && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#E1F5EE', color: '#0F6E56', fontWeight: 500 }}>
              {seller.dealCount} deal{seller.dealCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      ))}

      {/* Add new option — always shown at bottom */}
      <div
        onClick={() => setSellerUiState('create')}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
          cursor: 'pointer', color: 'var(--text-2,#6c757d)', fontSize: 12,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sec,#f5f6f8)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1,#1a1a2e)' }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2,#6c757d)' }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: '1px solid var(--ds-border,#e3e5e9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, lineHeight: 1, flexShrink: 0,
        }}>+</div>
        Add {sellerSearch ? `"${sellerSearch}"` : 'new seller'}
      </div>
    </div>
  </div>
)}
```

---

### STATE 3 — `'linked'`: compact seller card

```tsx
{sellerUiState === 'linked' && linkedSeller && (
  <div style={{ padding: '14px 16px' }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: 12,
      background: 'var(--bg-sec,#f5f6f8)',
      border: '1px solid var(--ds-border,#e3e5e9)',
      borderRadius: 8,
    }}>
      {/* Initials avatar — larger */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#E1F5EE', color: '#0F6E56',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 500, flexShrink: 0,
      }}>
        {linkedSeller.name.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1,#1a1a2e)' }}>{linkedSeller.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2,#6c757d)', marginTop: 2 }}>
          {[linkedSeller.phone, linkedSeller.email].filter(Boolean).join(' · ')}
        </div>
        {linkedSeller.motivation && (
          <span style={{
            display: 'inline-block', marginTop: 5,
            fontSize: 11, padding: '2px 8px', borderRadius: 10,
            background: '#FEF3C7', color: '#92400E',
          }}>
            {linkedSeller.motivation}
          </span>
        )}
      </div>
      <button
        onClick={() => { setLinkedSeller(null); setSellerUiState('search'); setSellerSearch('') }}
        style={{
          fontSize: 11, padding: '4px 10px', borderRadius: 6,
          border: '1px solid var(--ds-border,#e3e5e9)',
          background: '#fff', color: 'var(--text-2,#6c757d)', cursor: 'pointer',
        }}
      >
        Change
      </button>
    </div>
  </div>
)}
```

---

### STATE 4 — `'create'`: minimal inline form

```tsx
{sellerUiState === 'create' && (
  <div style={{ padding: '14px 16px' }}>
    {/* 3-column: name / phone / email */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
      {[
        { label: 'FULL NAME', placeholder: 'e.g. James Thornton', field: 'name' },
        { label: 'PHONE', placeholder: '07700 900 123', field: 'phone' },
        { label: 'EMAIL', placeholder: 'e.g. james@...', field: 'email' },
      ].map(({ label, placeholder, field }) => (
        <div key={field}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2,#6c757d)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            {label}
          </div>
          <input
            type="text"
            placeholder={placeholder}
            value={newSeller[field] || ''}
            onChange={e => setNewSeller((prev:any) => ({ ...prev, [field]: e.target.value }))}
            style={{
              width: '100%', padding: '8px 10px',
              border: '1px solid var(--ds-border,#e3e5e9)', borderRadius: 6,
              fontSize: 13, color: 'var(--text-1,#1a1a2e)', background: '#fff', outline: 'none',
            }}
          />
        </div>
      ))}
    </div>

    {/* Motivation pills */}
    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2,#6c757d)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
      Motivation
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {['Motivated seller','Below market value','Probate / estate','Repossession','Divorce','Relocated abroad','Developer exit','Other'].map(m => (
        <button
          key={m}
          onClick={() => setNewSeller((prev:any) => ({ ...prev, motivation: prev.motivation === m ? '' : m }))}
          style={{
            fontSize: 12, padding: '5px 12px', borderRadius: 20,
            border: `1px solid ${newSeller.motivation === m ? 'var(--navy,#1B3A6B)' : 'var(--ds-border,#e3e5e9)'}`,
            background: newSeller.motivation === m ? 'var(--navy,#1B3A6B)' : '#fff',
            color: newSeller.motivation === m ? '#fff' : 'var(--text-2,#6c757d)',
            cursor: 'pointer',
          }}
        >
          {m}
        </button>
      ))}
    </div>

    {/* Actions */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--ds-border,#e3e5e9)' }}>
      <button
        onClick={() => setSellerUiState('search')}
        style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--ds-border,#e3e5e9)', background: '#fff', color: 'var(--text-2,#6c757d)', cursor: 'pointer' }}
      >
        Cancel
      </button>
      <button
        onClick={handleSaveNewSeller}
        style={{ fontSize: 12, padding: '7px 14px', borderRadius: 6, border: 'none', background: 'var(--navy,#1B3A6B)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
      >
        Save seller
      </button>
    </div>
  </div>
)}
```

---

## PART C — State variables needed

Add these to the component state:

```tsx
const [sellerUiState, setSellerUiState] = useState<'search'|'results'|'linked'|'create'>(
  deal.sellerName ? 'linked' : 'search'
);
const [sellerSearch, setSellerSearch] = useState('');
const [linkedSeller, setLinkedSeller] = useState<any>(
  deal.sellerName ? { name: deal.sellerName, phone: deal.sellerPhone, email: deal.sellerEmail, motivation: deal.sellerMotivation } : null
);
const [newSeller, setNewSeller] = useState<any>({ name: '', phone: '', email: '', motivation: '' });

// Filtered sellers — filter the sellers list prop/state by sellerSearch:
const filteredSellers = (sellers || []).filter((s:any) =>
  s.name?.toLowerCase().includes(sellerSearch.toLowerCase()) ||
  s.phone?.includes(sellerSearch) ||
  s.email?.toLowerCase().includes(sellerSearch.toLowerCase())
).slice(0, 5); // max 5 results

// Save new seller handler stub:
const handleSaveNewSeller = () => {
  if (!newSeller.name) return;
  setLinkedSeller(newSeller);
  // TODO Prompt 19: persist to sellers table
  setSellerUiState('linked');
};
```

---

## Summary checklist
- [ ] Seller section moved to immediately after Property information (before Property photos)
- [ ] State 1 (search): single search input, hint text
- [ ] State 2 (results): inline dropdown with initials avatars + deal count badge + "Add new" row
- [ ] State 3 (linked): compact card with initials, contact, motivation pill, Change button
- [ ] State 4 (create): 3-column name/phone/email + motivation pills + Cancel/Save
- [ ] All colours use DealScore tokens (--navy, --teal, --text-1, --text-2, --ds-border, --bg-sec)
- [ ] Avatar: teal (#E1F5EE / #0F6E56), motivation pill: amber (#FEF3C7 / #92400E)
- [ ] Save seller transitions to linked state
- [ ] Change button resets to search state
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
