import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './tests/e2e',
	/* Run tests in files in parallel */
	fullyParallel: false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: 0,
	/* Opt out of parallel tests on CI. */
	workers: 1,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: [['html'], ['list']],
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: process.env.TEST_URL || 'https://gnus-dao-web.pages.dev',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on',

		/* Take screenshot on failure */
		screenshot: 'on',

		/* Record video on failure */
		video: 'on',

		launchOptions: {
			slowMo: 500,
		},
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'Microsoft Edge',
			use: {
				...devices['Desktop Edge'],
				channel: 'msedge',
				headless: false,
				viewport: { width: 1920, height: 1080 },
			},
		},
	],
});
