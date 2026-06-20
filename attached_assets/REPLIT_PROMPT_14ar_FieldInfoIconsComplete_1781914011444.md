# REPLIT PROMPT 14ar — Field info icons: complete coverage across all input fields

## What this does
Adds ⓘ tooltip icons to every `IField` label that does not already have one. The following fields already have icons from Prompt 14aq and must NOT be changed:
- DEPOSIT %
- MORTGAGE RATE (%)
- TERM (YEARS)
- FIXED RATE ENDS
- REVERSION / SVR RATE (%)
- LBTT (AUTO-CALCULATED)

All other `IField` instances across the entire inputs page need an `info` prop added with accurate copy from the list below.

**Dependency:** Prompt 14aq merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Do NOT change any field that already has an `info` prop
- Copy must be used verbatim — do not paraphrase
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ar: field info icons complete coverage" && git push origin stage-6`

---

## PROPERTY INFORMATION section

**ADDRESS**
```
info="The full property address including postcode. DealScore uses the postcode to fetch Land Registry sold price comparables. Postcode must include a space (e.g. CF24 1RN) — without a space, comparables will not return results."
```

**PROPERTY TYPE**
```
info="Property type affects mortgage eligibility and valuation methodology. Some lenders restrict lending on ex-local authority flats, high-rise blocks, or non-standard construction. Studio flats and bedsits may also face lender restrictions."
```

**BEDROOMS**
```
info="Number of bedrooms in the property. For HMOs, this informs room count and licensing thresholds — most local authorities require mandatory HMO licensing for properties with 5 or more occupants forming 2 or more households."
```

**EPC RATING**
```
info="Energy Performance Certificate rating from A (most efficient) to G (least efficient). Properties rated F or G incur a DealScore penalty — lettings legislation requires a minimum EPC rating of E for most tenancies, with plans to raise this to C in future."
```

**FLOOD RISK**
```
info="Flood risk classification from the Environment Agency or equivalent. High flood risk properties incur a DealScore penalty and can face significantly higher insurance premiums, reduced mortgage lender appetite, and lower resale values."
```

**TENURE**
```
info="Freehold means you own the property and land outright. Leasehold means you own the property for a fixed term — additional costs (service charge, ground rent) and risks (short lease) apply. Selecting Leasehold will reveal additional fields."
```

---

## PROPERTY & PURCHASE section

**PURCHASE PRICE**
```
info="The price agreed with the seller. This is your entry point for calculating equity on entry, Land Transaction Tax, and total cash-in. If buying below market value, purchase price and market value will differ — DealScore captures both."
```

**MARKET VALUE / GDV**
```
info="The open market value of the property at completion — or the Gross Development Value (GDV) if this is a development project. Used to calculate your equity on entry (market value minus purchase price) and your day-one loan-to-value."
```

**COUNTRY**
```
info="Determines which land transaction tax applies: Stamp Duty Land Tax (England & N. Ireland), Land and Buildings Transaction Tax (Scotland), or Land Transaction Tax (Wales). Rates and thresholds differ — DealScore auto-calculates the correct tax for your selected country."
```

**SOLICITOR / CONVEYANCING (£)**
```
info="Legal fees for transferring ownership of the property. Typically £1,500–£3,000 for a standard residential purchase. Added to your total purchase costs and cash-in calculation."
```

**SURVEY COST (£)**
```
info="Cost of a structural or homebuyer's survey. A basic valuation is usually arranged by your mortgage lender. An independent homebuyer's report (£400–£700) or full structural survey (£600–£1,500) is recommended for older or unusual properties."
```

**BROKER FEE (£)**
```
info="Fee charged by your mortgage broker for arranging the mortgage. Typically £500–£2,000 depending on the complexity of the case. Some brokers charge a percentage of the loan. Added to total purchase costs."
```

**ARRANGEMENT FEE (£)**
```
info="A fee charged by the mortgage lender for setting up the mortgage — typically £999–£2,000. It can usually be added to the loan (increasing your mortgage balance) or paid upfront. Added to purchase costs in DealScore."
```

**AUCTION PURCHASE** *(checkbox — add small helper text or inline note instead of icon if IField pattern doesn't suit checkboxes)*
```
info="Auction purchases require a 10% deposit on the day and full completion within 28 days. This removes standard due diligence time — survey, searches, and legal work must be completed before or during the auction period."
```

---

## LEASEHOLD DETAILS section (conditional — only shown when tenure = leasehold)

**LEASE LENGTH (YEARS)**
```
info="Remaining years on the lease. Leases under 80 years make it difficult to obtain a mortgage and trigger a DealScore risk flag. Leases under 70 years are considered very short — lease extension costs rise significantly as the lease approaches 80 years."
```

**SERVICE CHARGE (£/YR)**
```
info="Annual charge paid to the freeholder or managing agent for maintenance of communal areas, buildings insurance, and management. Added to your monthly costs in DealScore. Review the last 3 years of service charge accounts before purchasing."
```

**GROUND RENT (£/YR)**
```
info="Annual payment to the freeholder for use of the land. Ground rents over £250/yr (£1,000 in London) can trigger the property to be classified as an assured tenancy, creating mortgage and sale complications. Ground rents that double every 10–25 years are considered onerous."
```

---

## REFURB section

**REFURB / WORKS COST (£)**
```
info="Your estimated total cost for all works — materials, labour, and a contingency allowance. Added to your total cash-in when calculating return on investment. A 10–15% contingency on top of your contractor quotes is standard practice."
```

**REFURB FINANCING**
```
info="How you're funding the works. Cash means the works cost comes from your own capital and is included in cash-in. Bridging means you're using a separate bridging facility — DealScore will ask for the bridging rate to model the financing cost accurately."
```

---

## MONTHLY COSTS section

**MANAGEMENT FEE (%)**
```
info="Letting agent fee as a percentage of gross monthly rent. Fully managed service typically costs 10–15%. Rent collection only (you handle maintenance) is typically 5–8%. Set to 0% if you self-manage. DealScore defaults to 10% if left blank."
```

**VOID ALLOWANCE (%)**
```
info="A provision for periods when the property is vacant and generating no rent. DealScore defaults to 8.3% (4 weeks per year) if left blank. Higher void rates are typical for HMOs, student lets, and serviced accommodation — allow 10–15% for these strategies."
```

**MAINTENANCE RESERVE (£/MO)**
```
info="A monthly provision set aside for repairs and routine upkeep. DealScore defaults to 5% of gross rent if left blank. Increase this for older properties, larger HMOs, or properties with communal areas or gardens. Does not cover planned refurbishment."
```

**INSURANCE (£/MO)**
```
info="Landlord buildings insurance for the property. Typically £20–£50/month for a standard BTL. HMOs and larger properties cost more. Your mortgage lender will require buildings insurance as a condition of the mortgage."
```

**COUNCIL TAX (£/MO)**
```
info="Annual council tax divided by 12. For BTL where the tenant pays council tax, set this to 0. For HMOs where the landlord pays (common in all-inclusive let arrangements), this is a significant cost — a 6-bed HMO in a Band D property could be £200+/month."
```

**UTILITIES (£/MO)**
```
info="Monthly utilities if you pay them as part of an all-inclusive let — common in HMOs and serviced accommodation. For standard BTL where the tenant pays utilities, set this to 0."
```

---

## OWNERSHIP & TAX section

**OWNERSHIP STRUCTURE**
```
info="Whether you're purchasing in your personal name or through a Limited Company. Personal ownership is simpler but subject to Section 24 — higher-rate taxpayers cannot deduct mortgage interest from rental profit. A Ltd Co avoids Section 24 but incurs set-up costs, accountancy fees, and corporation tax on profits."
```

**INCOME TAX BAND**
```
info="Your marginal income tax rate on personal income. Basic rate = 20%, Higher rate = 40%, Additional rate = 45%. Used to calculate your post-tax cash flow. Under Section 24, personal landlords only receive a 20% tax credit on mortgage interest — higher-rate taxpayers are taxed on profit they may not have actually received."
```

**JOINT OWNERSHIP**
```
info="If purchased with a partner or co-investor, rental income and tax liability are split between owners. By default this is 50/50, though a Declaration of Trust can specify a different split. Joint ownership with a lower-rate taxpayer can significantly reduce the total tax burden."
```

---

## BTL PROJECT DETAILS section

**MONTHLY RENT (£)**
```
info="Expected gross monthly rent from a single tenant or couple. Used to calculate gross yield, annual rental income, and cash flow. Use a realistic market rent — check Rightmove/Zoopla comparables for similar properties in the same postcode."
```

**INITIAL VOID PERIOD (WEEKS)**
```
info="The time between purchase completion and your first tenant moving in. Typically 4–8 weeks for a standard BTL. During this period you pay mortgage costs with no rental income — DealScore factors this into your first-year cash flow."
```

**TARGET RENT (£)**
```
info="The rent you're aiming to achieve after any refurbishment or repositioning. Used for post-works valuation in refinance scenarios. Leave blank if current rent equals target rent."
```

---

## HMO PROJECT DETAILS section

**ROOM RENT — ROOM 1, 2, 3… (£)**
```
info="Monthly rent per room. DealScore totals individual room rents to calculate gross HMO income. Room rates vary by room size, en-suite, and local demand — check SpareRoom comparables for your area."
```

**INITIAL VOID PERIOD (WEEKS)**
```
info="The time to fill all rooms from completion. Typically 4–8 weeks for an HMO. With multiple rooms, a rolling void per room is more realistic — use the void allowance % in Monthly costs to model ongoing vacancy risk."
```

---

## SA (SERVICED ACCOMMODATION) PROJECT DETAILS section

**NIGHTLY RATE (£)**
```
info="Your average nightly rate across the year. SA rates fluctuate significantly by season, local events, and platform — this is your blended annual average. Check AirDNA or similar for comparable rates in your postcode."
```

**OCCUPANCY (%)**
```
info="The percentage of nights occupied across the year. Typical SA occupancy runs 60–75% for a standard property. High-demand tourist or city-centre locations can achieve 80%+. SA returns are highly sensitive to occupancy — model at 60% as your downside scenario."
```

**PLATFORM FEE (%)**
```
info="Commission charged by platforms such as Airbnb (typically 3%) or Booking.com (typically 15%). If you use a co-hosting or management service, their fee is typically 15–25% on top of platform commission. Deducted from gross nightly revenue."
```

**CLEANING FEE (£)**
```
info="Turnover cleaning cost per stay. For direct bookings this can be charged to the guest. For managed properties it comes from your revenue. A 1-bed flat typically costs £50–£80 per clean; a larger property £100–£150."
```

---

## DEAL TERMS section

**SOURCING FEE (£)**
```
info="Your fee for finding and packaging this deal. Flows directly into the Fees & invoice tab where you can generate a client invoice. Sourcing fees are subject to VAT if you are VAT registered. Standard market rate is £3,000–£10,000 depending on deal complexity."
```

**COOLING-OFF PERIOD (DAYS)**
```
info="The number of days from reservation during which the buyer can withdraw without penalty. Tracked in Deal Status — DealScore shows a live countdown from the reservation date. Typically 14–30 days depending on your terms of business."
```

**TARGET COMPLETION DATE**
```
info="Your anticipated date for legal completion. Used for timeline planning in Deal Status. For auction purchases this is fixed at 28 days from the auction date."
```

**RESERVATION FEE (£)**
```
info="An upfront fee paid by the buyer to secure the deal during the cooling-off period. Typically £1,000–£3,000. This may be refundable or non-refundable depending on your terms — make sure this is clearly stated in your reservation agreement."
```

---

## Summary checklist
- [ ] Every `IField` across the inputs page has an `info` prop (except where already set in 14aq)
- [ ] No existing `info` props from 14aq have been modified
- [ ] Checkbox fields (auction purchase) handled appropriately — either via `info` on IField or inline note text if IField pattern doesn't suit checkboxes
- [ ] All copy used verbatim from above
- [ ] `InfoIcon` shared component used consistently (not duplicated inline)
- [ ] Tooltip z-index: 300 (above sticky bands)
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
