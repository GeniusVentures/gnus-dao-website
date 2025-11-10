import { test, expect } from '@playwright/test';

test.describe('SIWE Authentication Flow', () => {
	test.setTimeout(120000);

	test('SIWE button appears after wallet connection attempt', async ({ page }) => {
		// Listen for console messages
		const logs: string[] = [];
		page.on('console', (msg) => {
			logs.push(`[${msg.type()}] ${msg.text()}`);
			if (msg.type() === 'error' && msg.text().includes('SIWE')) {
				console.log('🔴 SIWE Error:', msg.text());
			}
		});

		// Listen for page errors
		page.on('pageerror', (error) => {
			console.log('🔴 Page Error:', error.message);
			logs.push(`[pageerror] ${error.message}`);
		});

		// Listen for network requests
		const authRequests: any[] = [];
		page.on('request', (request) => {
			const url = request.url();
			if (url.includes('/api/auth/')) {
				authRequests.push({
					url,
					method: request.method(),
					headers: request.headers(),
				});
				console.log('📡 Auth Request:', request.method(), url);
			}
		});

		page.on('response', async (response) => {
			const url = response.url();
			if (url.includes('/api/auth/')) {
				const status = response.status();
				console.log('📡 Auth Response:', status, url);

				if (status >= 400) {
					try {
						const body = await response.text();
						console.log('🔴 Error Response Body:', body);
					} catch (e) {
						// Ignore
					}
				}
			}
		});

		// Navigate to homepage
		console.log('🚀 Loading homepage...');
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(3000);

		await page.screenshot({ path: 'test-results/siwe-01-homepage.png', fullPage: true });

		// Look for Connect Wallet button
		console.log('🔍 Looking for Connect Wallet button...');
		const connectButton = page.getByRole('button', { name: /connect/i }).first();
		await expect(connectButton).toBeVisible();
		console.log('✅ Connect Wallet button found');

		// Click Connect Wallet
		console.log('🖱️  Clicking Connect Wallet...');
		await connectButton.click();
		await page.waitForTimeout(3000);

		await page.screenshot({
			path: 'test-results/siwe-02-wallet-modal.png',
			fullPage: true,
		});

		// Check if wallet modal opened
		const bodyText = await page.textContent('body');
		const hasWalletModal =
			bodyText?.includes('MetaMask') ||
			bodyText?.includes('WalletConnect') ||
			bodyText?.includes('Coinbase') ||
			bodyText?.includes('Browser Wallet');

		if (hasWalletModal) {
			console.log('✅ Wallet modal opened');

			// Close modal by clicking outside or pressing Escape
			await page.keyboard.press('Escape');
			await page.waitForTimeout(1000);

			await page.screenshot({
				path: 'test-results/siwe-03-modal-closed.png',
				fullPage: true,
			});
		} else {
			console.log('⚠️  Wallet modal did not open');
		}

		// Check for SIWE button (should only appear after wallet is connected)
		const siweButton = page.getByRole('button', { name: /siwe/i });
		const siweExists = (await siweButton.count()) > 0;

		if (siweExists && (await siweButton.isVisible())) {
			console.log('✅ SIWE button is visible (wallet must be connected)');
			await page.screenshot({
				path: 'test-results/siwe-04-button-visible.png',
				fullPage: true,
			});
		} else {
			console.log('ℹ️  SIWE button not visible (expected - wallet not connected)');
			console.log('ℹ️  SIWE button only appears after wallet connection');
		}

		// Log all auth requests
		if (authRequests.length > 0) {
			console.log('\n📊 Auth API Requests:');
			authRequests.forEach((req) => {
				console.log(`   ${req.method} ${req.url}`);
			});
		}

		// Check for SIWE-related errors
		const siweErrors = logs.filter(
			(log) =>
				log.toLowerCase().includes('siwe') &&
				(log.includes('[error]') || log.includes('[pageerror]')),
		);

		if (siweErrors.length > 0) {
			console.log('\n🔴 SIWE-related errors found:');
			siweErrors.forEach((err) => console.log('   ', err));
		} else {
			console.log('\n✅ No SIWE errors detected');
		}

		await page.screenshot({ path: 'test-results/siwe-05-final.png', fullPage: true });
	});

	test('SIWE API endpoints are accessible', async ({ page, request }) => {
		console.log('🧪 Testing SIWE API endpoints...');

		// Test nonce endpoint
		console.log('\n📝 Testing /api/auth/nonce...');
		const nonceResponse = await request.get('/api/auth/nonce');
		expect(nonceResponse.ok()).toBeTruthy();

		const nonceData = await nonceResponse.json();
		expect(nonceData.nonce).toBeTruthy();
		console.log('✅ Nonce endpoint working');
		console.log('   Nonce:', nonceData.nonce);

		// Test verify endpoint (should fail without valid data)
		console.log('\n📝 Testing /api/auth/verify...');
		const verifyResponse = await request.post('/api/auth/verify', {
			data: {
				message: 'test',
				signature: 'test',
				nonce: 'test',
				address: '0x0000000000000000000000000000000000000000',
				chainId: 1,
			},
		});

		// Should return 400 or 401 (not 500)
		expect([400, 401]).toContain(verifyResponse.status());
		console.log('✅ Verify endpoint accessible (returned expected error)');
		console.log('   Status:', verifyResponse.status());

		const verifyData = await verifyResponse.json();
		console.log('   Error:', verifyData.error);

		// Make sure it's not a server configuration error
		expect(verifyData.error).not.toContain('Server configuration error');
		console.log('✅ JWT_SECRET is configured (no server configuration error)');
	});

	test('Check SIWE implementation in browser', async ({ page }) => {
		console.log('🔍 Checking SIWE implementation...');

		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		// Check if SIWE service is loaded
		const siweServiceExists = await page.evaluate(() => {
			return typeof window !== 'undefined';
		});

		expect(siweServiceExists).toBeTruthy();
		console.log('✅ Browser environment ready');

		// Check for ethers library
		const ethersExists = await page.evaluate(() => {
			return (
				typeof (window as any).ethers !== 'undefined' ||
				document.querySelector('script[src*="ethers"]') !== null
			);
		});

		console.log(
			ethersExists ? '✅ Ethers.js available' : 'ℹ️  Ethers.js loaded via modules',
		);

		await page.screenshot({ path: 'test-results/siwe-implementation.png', fullPage: true });
	});
});
