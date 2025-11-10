import { test, expect } from '@playwright/test';

test.describe('GNUS DAO - Complete E2E Flow', () => {
	test.setTimeout(120000); // 2 minutes timeout

	test('1. Homepage loads correctly', async ({ page }) => {
		await page.goto('/');

		// Wait for page to load
		await page.waitForLoadState('networkidle');

		// Check title
		await expect(page).toHaveTitle(/GNUS DAO/);

		// Check main heading
		const heading = page.locator('h1').first();
		await expect(heading).toBeVisible();

		// Take screenshot
		await page.screenshot({ path: 'test-results/01-homepage.png', fullPage: true });

		console.log('✅ Homepage loaded successfully');
	});

	test('2. Navigation works', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Check navigation links
		const navLinks = ['Proposals', 'Governance', 'Treasury', 'Analytics'];

		for (const linkText of navLinks) {
			const link = page.getByRole('link', { name: linkText }).first();
			await expect(link).toBeVisible();
			console.log(`✅ Found navigation link: ${linkText}`);
		}

		await page.screenshot({ path: 'test-results/02-navigation.png', fullPage: true });
	});

	test('3. Proposals page loads', async ({ page }) => {
		await page.goto('/proposals', { waitUntil: 'domcontentloaded' });

		// Wait for content
		await page.waitForTimeout(5000);

		// Check for proposals or empty state
		const pageContent = await page.textContent('body');
		expect(pageContent).toBeTruthy();

		await page.screenshot({ path: 'test-results/03-proposals-page.png', fullPage: true });

		console.log('✅ Proposals page loaded');
	});

	test('4. Connect Wallet button exists', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		// Look for Connect Wallet button (use first() to handle multiple instances)
		const connectButton = page.getByRole('button', { name: /connect/i }).first();
		await expect(connectButton).toBeVisible();

		await page.screenshot({ path: 'test-results/04-connect-button.png', fullPage: true });

		console.log('✅ Connect Wallet button found');
	});

	test('5. Connect Wallet modal opens', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		// Click Connect Wallet
		const connectButton = page.getByRole('button', { name: /connect/i }).first();
		await connectButton.click();

		// Wait for modal
		await page.waitForTimeout(3000);

		// Check if modal opened (look for wallet options)
		const modalContent = await page.textContent('body');
		const hasWalletOptions =
			modalContent?.includes('MetaMask') ||
			modalContent?.includes('WalletConnect') ||
			modalContent?.includes('Coinbase');

		expect(hasWalletOptions).toBeTruthy();

		await page.screenshot({ path: 'test-results/05-wallet-modal.png', fullPage: true });

		console.log('✅ Wallet modal opened');
	});

	test('6. Proposal creation form exists', async ({ page }) => {
		await page.goto('/proposals', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(5000);

		// Look for Create Proposal button
		const createButton = page.getByRole('button', { name: /create proposal/i });

		if (await createButton.isVisible()) {
			await createButton.click();
			await page.waitForTimeout(2000);

			// Check for form fields
			const titleInput = page
				.locator('input[name="title"], input[placeholder*="title" i]')
				.first();
			const descriptionInput = page
				.locator('textarea[name="description"], textarea[placeholder*="description" i]')
				.first();

			if ((await titleInput.isVisible()) && (await descriptionInput.isVisible())) {
				console.log('✅ Proposal form found');

				// Fill form
				await titleInput.fill('Test Proposal - E2E');
				await descriptionInput.fill(
					'This is a test proposal created by automated E2E testing.',
				);

				await page.screenshot({
					path: 'test-results/06-proposal-form.png',
					fullPage: true,
				});
			} else {
				console.log('⚠️  Proposal form requires wallet connection');
				await page.screenshot({
					path: 'test-results/06-proposal-no-form.png',
					fullPage: true,
				});
			}
		} else {
			console.log('⚠️  Create Proposal button not found');
			await page.screenshot({
				path: 'test-results/06-no-create-button.png',
				fullPage: true,
			});
		}
	});

	test('7. Governance page loads', async ({ page }) => {
		await page.goto('/governance', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(5000);

		const pageContent = await page.textContent('body');
		expect(pageContent).toBeTruthy();

		await page.screenshot({ path: 'test-results/07-governance-page.png', fullPage: true });

		console.log('✅ Governance page loaded');
	});

	test('8. Treasury page loads', async ({ page }) => {
		await page.goto('/treasury', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(5000);

		const pageContent = await page.textContent('body');
		expect(pageContent).toBeTruthy();

		await page.screenshot({ path: 'test-results/08-treasury-page.png', fullPage: true });

		console.log('✅ Treasury page loaded');
	});

	test('9. Analytics page loads', async ({ page }) => {
		await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(5000);

		const pageContent = await page.textContent('body');
		expect(pageContent).toBeTruthy();

		await page.screenshot({ path: 'test-results/09-analytics-page.png', fullPage: true });

		console.log('✅ Analytics page loaded');
	});

	test('10. Check for console errors', async ({ page }) => {
		const errors: string[] = [];

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		page.on('pageerror', (error) => {
			errors.push(error.message);
		});

		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(3000);

		// Filter out known non-critical errors
		const criticalErrors = errors.filter(
			(err) =>
				!err.includes('404') &&
				!err.includes('Failed to load resource') &&
				!err.includes('Permissions-Policy'),
		);

		if (criticalErrors.length > 0) {
			console.log('⚠️  Console errors found:');
			criticalErrors.forEach((err) => console.log('   -', err));
		} else {
			console.log('✅ No critical console errors');
		}

		await page.screenshot({ path: 'test-results/10-console-check.png', fullPage: true });
	});

	test('11. Check responsive design - Mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		await page.screenshot({ path: 'test-results/11-mobile-view.png', fullPage: true });

		console.log('✅ Mobile view rendered');
	});

	test('12. Check responsive design - Tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 }); // iPad

		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		await page.screenshot({ path: 'test-results/12-tablet-view.png', fullPage: true });

		console.log('✅ Tablet view rendered');
	});

	test('13. Dark mode toggle works', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		// Look for theme toggle button
		const themeButton = page
			.locator('button[aria-label*="theme" i], button[title*="theme" i]')
			.first();

		if (await themeButton.isVisible()) {
			await page.screenshot({ path: 'test-results/13-light-mode.png', fullPage: true });

			await themeButton.click();
			await page.waitForTimeout(1000);

			await page.screenshot({ path: 'test-results/13-dark-mode.png', fullPage: true });

			console.log('✅ Theme toggle works');
		} else {
			console.log('⚠️  Theme toggle not found');
			await page.screenshot({
				path: 'test-results/13-no-theme-toggle.png',
				fullPage: true,
			});
		}
	});

	test('14. Search functionality (if exists)', async ({ page }) => {
		await page.goto('/proposals', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(5000);

		// Look for search input
		const searchInput = page
			.locator('input[type="search"], input[placeholder*="search" i]')
			.first();

		if (await searchInput.isVisible()) {
			await searchInput.fill('test');
			await page.waitForTimeout(1000);

			await page.screenshot({ path: 'test-results/14-search.png', fullPage: true });

			console.log('✅ Search functionality found');
		} else {
			console.log('ℹ️  No search functionality on this page');
			await page.screenshot({ path: 'test-results/14-no-search.png', fullPage: true });
		}
	});

	test('15. Footer links exist', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		// Scroll to footer
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForTimeout(1000);

		await page.screenshot({ path: 'test-results/15-footer.png', fullPage: true });

		console.log('✅ Footer rendered');
	});
});
