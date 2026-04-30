import { test, expect } from '@playwright/test';

test.describe('DealScore App Tests', () => {
  test('TEST 1 — BTL STRONG DEAL', async ({ page }) => {
    await page.goto('http://localhost:80/dealscore');

    // BTL tab should be active by default, but let's make sure
    await page.click('button:has-text("BTL")');

    // Address line
    await page.fill('[data-testid="input-property-address"]', '14 Maple Street, Manchester, M14 5QR');

    // Property Type dropdown: select "Terraced"
    await page.click('[data-testid="select-property-type"]');
    await page.click('div[role="option"]:has-text("Terraced")');

    // Tenure dropdown: select "Freehold"
    await page.click('[data-testid="select-tenure"]');
    await page.click('div[role="option"]:has-text("Freehold")');

    // Purchase Price: clear and type "180000"
    await page.fill('[data-testid="input-btl-purchase-price"]', '180000');

    // Country dropdown: select "England"
    await page.click('[data-testid="select-country"]');
    await page.click('div[role="option"]:has-text("England")');

    // Buyer Type dropdown: select "Additional Property"
    await page.click('[data-testid="select-buyer-type"]');
    await page.click('div[role="option"]:has-text("Additional Property")');

    // Refurb Cost: clear and type "8000"
    await page.fill('label:has-text("Refurb Cost") + input', '8000');

    // Other Costs: clear and type "2000"
    await page.fill('label:has-text("Other Costs") + input', '2000');

    // Deposit %: clear and type "25"
    await page.fill('[data-testid="input-btl-deposit-pct"]', '25');

    // Mortgage Rate: clear and type "5.5"
    await page.fill('[data-testid="input-btl-mortgage-rate"]', '5.5');

    // Monthly Rent: clear and type "1100"
    await page.fill('[data-testid="input-btl-monthly-rent"]', '1100');

    // Monthly Expenses: clear and type "150"
    await page.fill('label:has-text("Monthly Expenses") + input', '150');

    // Market Value: clear and type "210000"
    await page.fill('[data-testid="input-market-value"]', '210000');

    // Sourcing Fee: clear and type "3500"
    await page.fill('[data-testid="input-sourcing-fee"]', '3500');

    // Deal Notes / Why This Strategy: type "Strong rental demand in M14 postcode with 7%+ yield"
    await page.click('[data-testid="toggle-strategy"]');
    await page.fill('[data-testid="input-strategy-notes"]', 'Strong rental demand in M14 postcode with 7%+ yield');

    // Property Description: type "3 bed mid-terrace"
    await page.click('[data-testid="toggle-deal-notes"]');
    await page.fill('[data-testid="input-property-description"]', '3 bed mid-terrace');

    // Verify calculated results
    // SDLT / Property Tax should display £10,100
    await expect(page.locator('div:has-text("Stamp Duty") + div')).toContainText('£10,100');

    // Cash Invested should show £65,100
    await expect(page.locator('div:has-text("Cash Invested") >> .. >> div.text-2xl')).toHaveText('£65,100');

    // Monthly Cash Flow should show £331.25 (approximately)
    // The UI uses formatCurrency which might round or format differently. Let's check for the value.
    await expect(page.locator('div:has-text("Monthly Flow") >> .. >> div.text-2xl')).toContainText('331');

    // Net Yield should show 6.3%
    await expect(page.locator('div:has-text("Net Yield") >> .. >> div:nth-child(2)')).toHaveText('6.3%');

    // Cash-on-Cash ROI should show 6.1%
    await expect(page.locator('div:has-text("Cash-on-Cash ROI") >> .. >> div:nth-child(2)')).toHaveText('6.1%');

    // Deal Score badge should say "Strong" with GREEN colour
    const scoreBadge = page.locator('[data-testid="score-badge"]');
    await expect(scoreBadge).toHaveText('Strong');
    await expect(scoreBadge).toHaveCSS('background-color', 'rgb(22, 163, 74)'); // Green

    // BMV should show £30,000
    await expect(page.locator('[data-testid="bmv-banner"]')).toContainText('£30,000');
  });

  test('TEST 2 — BTL AVERAGE DEAL', async ({ page }) => {
    await page.goto('http://localhost:80/dealscore');

    // Clear and Update fields for Test 2
    await page.fill('[data-testid="input-property-address"]', '8 Park Lane, London, SW1A 1AA');

    // Property Type: select "Flat/Apartment"
    await page.click('[data-testid="select-property-type"]');
    await page.click('div[role="option"]:has-text("Flat/Apartment")');

    // Tenure: select "Leasehold"
    await page.click('[data-testid="select-tenure"]');
    await page.click('div[role="option"]:has-text("Leasehold")');

    // Lease Length field: type "150"
    await page.fill('[data-testid="input-lease-length"]', '150');

    // Purchase Price: clear and type "350000"
    await page.fill('[data-testid="input-btl-purchase-price"]', '350000');

    // Refurb Cost: clear and type "5000"
    await page.fill('label:has-text("Refurb Cost") + input', '5000');

    // Other Costs: clear and type "3000"
    await page.fill('label:has-text("Other Costs") + input', '3000');

    // Monthly Rent: clear and type "1800"
    await page.fill('[data-testid="input-btl-monthly-rent"]', '1800');

    // Monthly Expenses: clear and type "400"
    await page.fill('label:has-text("Monthly Expenses") + input', '400');

    // Market Value: clear and type "375000"
    await page.fill('[data-testid="input-market-value"]', '375000');

    // Sourcing Fee: clear and type "0"
    await page.fill('[data-testid="input-sourcing-fee"]', '0');

    // Verify results for Test 2
    // SDLT should show £25,000
    await expect(page.locator('div:has-text("Stamp Duty") + div')).toContainText('£25,000');

    // Cash Invested should show £120,500
    await expect(page.locator('div:has-text("Cash Invested") >> .. >> div.text-2xl')).toHaveText('£120,500');

    // Monthly Cash Flow should show approximately £196.87
    await expect(page.locator('div:has-text("Monthly Flow") >> .. >> div.text-2xl')).toContainText('197');

    // Net Yield should show 4.8%
    await expect(page.locator('div:has-text("Net Yield") >> .. >> div:nth-child(2)')).toHaveText('4.8%');

    // Cash-on-Cash ROI should show approximately 2.0%
    await expect(page.locator('div:has-text("Cash-on-Cash ROI") >> .. >> div:nth-child(2)')).toHaveText('2.0%');

    // Deal Score badge should say "Average" with AMBER/YELLOW colour
    const scoreBadge = page.locator('[data-testid="score-badge"]');
    await expect(scoreBadge).toHaveText('Average');
    await expect(scoreBadge).toHaveCSS('background-color', 'rgb(217, 119, 6)'); // Amber

    // Sourcing Fee should NOT appear in the results if it is £0
    // Based on the code, Sourcing Fee only appears in PDF or maybe not at all in the results panel?
    // Let's check if it's visible in the results section.
    await expect(page.locator('div:has-text("Sourcing Fee")')).not.toBeVisible();
  });
});
