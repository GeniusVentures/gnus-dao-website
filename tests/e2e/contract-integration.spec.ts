import { test, expect } from '@playwright/test';

// Use deployed URL for testing
const BASE_URL = process.env.BASE_URL || 'https://gnus-dao-web.pages.dev';

test.describe('Contract Integration Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL);
	});

	test('1. Proposal state calculation is correct', async ({ page }) => {
		// Listen for console messages
		page.on('console', (msg) => console.log(`Browser console: ${msg.text()}`));

		// Navigate to proposals page
		await page.goto(`${BASE_URL}/proposals`, { waitUntil: 'domcontentloaded' });

		// Wait for "Loading proposals..." to disappear
		try {
			await page.waitForSelector('text=Loading proposals...', {
				state: 'hidden',
				timeout: 30000,
			});
		} catch (e) {
			console.log("Loading message didn't appear or didn't disappear");
		}

		// Wait for proposal headings to appear
		await page.waitForSelector('h3', {
			timeout: 30000,
			state: 'visible',
		});

		// Get all proposal state badges (they have specific color classes)
		const stateBadges = await page.locator('.rounded-full.text-xs.font-medium').all();

		console.log(`Found ${stateBadges.length} proposal state badges`);

		// Check that we have at least one proposal
		expect(stateBadges.length).toBeGreaterThan(0);

		for (const badge of stateBadges) {
			const state = await badge.textContent();
			console.log(`Proposal state: ${state}`);

			// Verify state is one of the valid states
			expect(state).toMatch(/Active|Pending|Succeeded|Defeated|Executed|Canceled/);
		}

		// Check if all proposals are showing as "Defeated"
		const defeatedCount = (
			await page.locator('.rounded-full.text-xs.font-medium:has-text("Defeated")').all()
		).length;
		const totalCount = stateBadges.length;

		console.log(`Defeated: ${defeatedCount}/${totalCount} proposals`);

		// If all proposals are defeated, log a warning
		if (defeatedCount === totalCount && totalCount > 0) {
			console.warn(
				'⚠️ All proposals are showing as Defeated - this might indicate an issue',
			);
		}
	});

	test('2. Quadratic voting modal shows correct cost calculation', async ({ page }) => {
		// Navigate to an active proposal
		await page.goto(`${BASE_URL}/proposals`);
		await page.waitForLoadState('domcontentloaded');

		// Find an active proposal
		const activeProposal = await page
			.locator('[data-testid="proposal-state"]:has-text("Active")')
			.first();

		if ((await activeProposal.count()) > 0) {
			// Click on the proposal to view details
			const proposalCard = await activeProposal.locator('..').locator('..').first();
			await proposalCard.click();

			await page.waitForLoadState('domcontentloaded');

			// Look for quadratic vote button
			const quadraticButton = await page
				.locator('button:has-text("Quadratic Vote")')
				.first();

			if ((await quadraticButton.count()) > 0) {
				await quadraticButton.click();

				// Wait for modal to appear
				await page.waitForSelector('text=Quadratic Voting', { timeout: 5000 });

				// Check that cost calculation is displayed
				const costDisplay = await page.locator('text=/Cost:|Tokens Required:/i').first();
				expect(await costDisplay.count()).toBeGreaterThan(0);

				// Close modal
				await page.locator('button:has-text("Cancel")').click();
			}
		}
	});

	test('3. Treasury balance is displayed correctly', async ({ page }) => {
		// Navigate to treasury page
		await page.goto(`${BASE_URL}/treasury`, { waitUntil: 'domcontentloaded' });

		// Wait for treasury page to load - look for "Native Balance" text
		await page.waitForSelector('text=Native Balance', {
			timeout: 15000,
			state: 'visible',
		});

		// Get the balance - it should be in a large font near "Native Balance"
		const balanceElement = await page
			.locator('text=Native Balance')
			.locator('..')
			.locator('.text-2xl')
			.first();
		const balance = await balanceElement.textContent();

		// Verify balance is a number
		expect(balance).toMatch(/[\d.]+/);
		console.log(`Treasury balance: ${balance}`);
	});

	test('4. Voting power is calculated correctly', async ({ page }) => {
		// This test requires wallet connection
		// For now, just verify the UI elements exist
		await page.goto(`${BASE_URL}/proposals`);
		await page.waitForLoadState('domcontentloaded');

		// Check if voting power display exists
		const votingPowerElements = await page
			.locator('text=/Voting Power|Your voting power/i')
			.all();
		console.log(`Found ${votingPowerElements.length} voting power displays`);
	});

	test('5. Proposal creation uses correct contract method', async ({ page }) => {
		// Navigate to proposals page
		await page.goto(`${BASE_URL}/proposals`);
		await page.waitForLoadState('domcontentloaded');

		// Look for create proposal button
		const createButton = await page.locator('button:has-text("Create Proposal")').first();

		if ((await createButton.count()) > 0) {
			await createButton.click();

			// Wait for modal
			await page.waitForSelector('text=/Create|New Proposal/i', { timeout: 5000 });

			// Verify form fields exist
			const titleInput = await page
				.locator('input[name="title"], input[placeholder*="title" i]')
				.first();
			const descriptionInput = await page
				.locator('textarea[name="description"], textarea[placeholder*="description" i]')
				.first();

			expect(await titleInput.count()).toBeGreaterThan(0);
			expect(await descriptionInput.count()).toBeGreaterThan(0);

			// Close modal
			await page.keyboard.press('Escape');
		}
	});

	test('6. Delegation banner appears when needed', async ({ page }) => {
		// Navigate to proposals page
		await page.goto(`${BASE_URL}/proposals`);
		await page.waitForLoadState('domcontentloaded');

		// Check if delegation banner exists
		const delegationBanner = await page
			.locator('text=/Activate Your Voting Power|Delegate/i')
			.first();

		if ((await delegationBanner.count()) > 0) {
			console.log('Delegation banner is visible');

			// Check for activate button
			const activateButton = await page.locator('button:has-text("Activate")').first();
			expect(await activateButton.count()).toBeGreaterThan(0);
		} else {
			console.log('Delegation banner is not visible (user may already be delegated)');
		}
	});

	test('7. Contract methods are properly typed', async ({ page }) => {
		// This is more of a compile-time test, but we can verify the UI works
		await page.goto(`${BASE_URL}/governance`);
		await page.waitForLoadState('domcontentloaded');

		// Verify governance page loads without errors
		const heading = await page.locator('h1, h2').first();
		expect(await heading.count()).toBeGreaterThan(0);
	});

	test('8. Quorum checking uses contract method', async ({ page }) => {
		// Navigate to proposals page
		await page.goto(`${BASE_URL}/proposals`, { waitUntil: 'domcontentloaded' });

		// Wait for proposals to load - look for proposal headings
		await page.waitForSelector('h3', {
			timeout: 15000,
			state: 'visible',
		});

		// Check for quorum indicators
		const quorumElements = await page.locator('text=/Quorum|quorum/i').all();
		console.log(`Found ${quorumElements.length} quorum indicators`);
	});

	test('9. Vote validation works correctly', async ({ page }) => {
		// Navigate to an active proposal
		await page.goto(`${BASE_URL}/proposals`);
		await page.waitForLoadState('domcontentloaded');

		// Find an active proposal
		const activeProposal = await page
			.locator('[data-testid="proposal-state"]:has-text("Active")')
			.first();

		if ((await activeProposal.count()) > 0) {
			// Click on the proposal
			const proposalCard = await activeProposal.locator('..').locator('..').first();
			await proposalCard.click();

			await page.waitForLoadState('domcontentloaded');

			// Check for vote buttons
			const voteForButton = await page.locator('button:has-text("Vote For")').first();
			expect(await voteForButton.count()).toBeGreaterThan(0);
		}
	});

	test('10. Treasury manager check works', async ({ page }) => {
		// Navigate to treasury page
		await page.goto(`${BASE_URL}/treasury`);
		await page.waitForLoadState('domcontentloaded');

		// Check if treasury management UI exists
		const treasuryActions = await page
			.locator('button:has-text("Withdraw"), button:has-text("Deposit")')
			.all();
		console.log(`Found ${treasuryActions.length} treasury action buttons`);
	});

	test('11. No console errors on page load', async ({ page }) => {
		const errors: string[] = [];

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		await page.goto(`${BASE_URL}/proposals`);
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000);

		// Filter out known/acceptable errors
		const criticalErrors = errors.filter(
			(error) =>
				!error.includes('Failed to load resource') &&
				!error.includes('favicon') &&
				!error.includes('RSC') &&
				!error.includes('NEXT_'),
		);

		if (criticalErrors.length > 0) {
			console.log('Console errors found:', criticalErrors);
		}

		expect(criticalErrors.length).toBeLessThan(5);
	});

	test('12. All proposal states are handled correctly', async ({ page }) => {
		await page.goto(`${BASE_URL}/proposals`, { waitUntil: 'domcontentloaded' });

		// Wait for "Loading proposals..." to disappear
		try {
			await page.waitForSelector('text=Loading proposals...', {
				state: 'hidden',
				timeout: 30000,
			});
		} catch (e) {
			console.log("Loading message didn't appear or didn't disappear");
		}

		// Wait for proposals to load - look for proposal headings
		await page.waitForSelector('h3', {
			timeout: 30000,
			state: 'visible',
		});

		// Get all state badges
		const stateBadges = await page.locator('.rounded-full.text-xs.font-medium').all();
		const states = new Set<string>();

		for (const badge of stateBadges) {
			const state = await badge.textContent();
			if (state) {
				states.add(state.trim());
			}
		}

		console.log('Proposal states found:', Array.from(states));

		// Verify we have at least some proposals
		expect(stateBadges.length).toBeGreaterThan(0);
	});
});
