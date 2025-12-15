/**
 * Performance Reporter
 * Sends client-side performance metrics to the server
 */

import { getPerformanceSummary } from './performance';

/**
 * Performance reporter configuration
 */
interface ReporterConfig {
	endpoint: string;
	batchSize: number;
	flushInterval: number;
	enabled: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ReporterConfig = {
	endpoint: '/api/performance',
	batchSize: 10,
	flushInterval: 30000, // 30 seconds
	enabled: typeof window !== 'undefined' && process.env.NODE_ENV === 'production',
};

/**
 * Performance Reporter class
 */
class PerformanceReporter {
	private config: ReporterConfig;
	private metricsQueue: any[] = [];
	private flushTimer: NodeJS.Timeout | null = null;
	private isReporting = false;

	constructor(config: Partial<ReporterConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		
		if (this.config.enabled) {
			this.startReporting();
		}
	}

	/**
	 * Start automatic reporting
	 */
	private startReporting(): void {
		if (typeof window === 'undefined') return;

		// Set up periodic reporting
		this.flushTimer = setInterval(() => {
			this.flushMetrics();
		}, this.config.flushInterval);

		// Report on page unload
		window.addEventListener('beforeunload', () => {
			this.flushMetrics(true);
		});

		// Report on visibility change (when page becomes hidden)
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				this.flushMetrics();
			}
		});
	}

	/**
	 * Add metric to queue
	 */
	queueMetric(metric: any): void {
		if (!this.config.enabled) return;

		this.metricsQueue.push({
			...metric,
			timestamp: Date.now(),
			url: window.location.href,
			userAgent: navigator.userAgent,
		});

		// Flush if batch size reached
		if (this.metricsQueue.length >= this.config.batchSize) {
			this.flushMetrics();
		}
	}

	/**
	 * Flush metrics to server
	 */
	async flushMetrics(isSync = false): Promise<void> {
		if (this.metricsQueue.length === 0 || this.isReporting) return;

		this.isReporting = true;
		const metricsToSend = [...this.metricsQueue];
		this.metricsQueue = [];

		try {
			const performanceSummary = getPerformanceSummary();
			
			const payload = {
				metrics: metricsToSend,
				summary: performanceSummary,
				sessionInfo: {
					timestamp: new Date().toISOString(),
					url: window.location.href,
					referrer: document.referrer,
					userAgent: navigator.userAgent,
				},
			};

			if (isSync && navigator.sendBeacon) {
				// Use sendBeacon for synchronous sending (on page unload)
				navigator.sendBeacon(
					this.config.endpoint,
					JSON.stringify(payload)
				);
			} else {
				// Use fetch for normal reporting
				const response = await fetch(this.config.endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					console.warn('Failed to send performance metrics:', response.statusText);
				}
			}
		} catch (error) {
			console.warn('Error sending performance metrics:', error);
			// Re-queue metrics on error (but limit to prevent memory issues)
			if (this.metricsQueue.length < 100) {
				this.metricsQueue.unshift(...metricsToSend);
			}
		} finally {
			this.isReporting = false;
		}
	}

	/**
	 * Report Web Vital
	 */
	reportWebVital(name: string, value: number, rating: string): void {
		this.queueMetric({
			type: 'web-vital',
			name,
			value,
			rating,
		});
	}

	/**
	 * Report custom metric
	 */
	reportCustomMetric(name: string, value: number, unit: string, context?: Record<string, any>): void {
		this.queueMetric({
			type: 'custom-metric',
			name,
			value,
			unit,
			context,
		});
	}

	/**
	 * Report user interaction
	 */
	reportInteraction(name: string, duration: number, context?: Record<string, any>): void {
		this.queueMetric({
			type: 'interaction',
			name,
			duration,
			context,
		});
	}

	/**
	 * Report API call performance
	 */
	reportApiCall(endpoint: string, duration: number, status: number, context?: Record<string, any>): void {
		this.queueMetric({
			type: 'api-call',
			endpoint,
			duration,
			status,
			context,
		});
	}

	/**
	 * Report error with performance context
	 */
	reportError(error: Error, context?: Record<string, any>): void {
		this.queueMetric({
			type: 'error',
			message: error.message,
			stack: error.stack,
			context,
		});
	}

	/**
	 * Enable/disable reporting
	 */
	setEnabled(enabled: boolean): void {
		this.config.enabled = enabled;
		
		if (enabled && !this.flushTimer) {
			this.startReporting();
		} else if (!enabled && this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
	}

	/**
	 * Get current configuration
	 */
	getConfig(): ReporterConfig {
		return { ...this.config };
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<ReporterConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Cleanup
	 */
	destroy(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
		
		// Flush remaining metrics
		this.flushMetrics(true);
	}
}

// Global reporter instance
let globalReporter: PerformanceReporter | null = null;

/**
 * Get or create global performance reporter
 */
export function getPerformanceReporter(): PerformanceReporter {
	if (!globalReporter) {
		globalReporter = new PerformanceReporter();
	}
	return globalReporter;
}

/**
 * Initialize performance reporter with custom config
 */
export function initializePerformanceReporter(config?: Partial<ReporterConfig>): PerformanceReporter {
	if (globalReporter) {
		globalReporter.destroy();
	}
	
	globalReporter = new PerformanceReporter(config);
	return globalReporter;
}

/**
 * Report Web Vital (convenience function)
 */
export function reportWebVital(name: string, value: number, rating: string): void {
	getPerformanceReporter().reportWebVital(name, value, rating);
}

/**
 * Report custom metric (convenience function)
 */
export function reportCustomMetric(name: string, value: number, unit: string, context?: Record<string, any>): void {
	getPerformanceReporter().reportCustomMetric(name, value, unit, context);
}

/**
 * Report user interaction (convenience function)
 */
export function reportInteraction(name: string, duration: number, context?: Record<string, any>): void {
	getPerformanceReporter().reportInteraction(name, duration, context);
}

/**
 * Report API call performance (convenience function)
 */
export function reportApiCall(endpoint: string, duration: number, status: number, context?: Record<string, any>): void {
	getPerformanceReporter().reportApiCall(endpoint, duration, status, context);
}

/**
 * Report error with performance context (convenience function)
 */
export function reportError(error: Error, context?: Record<string, any>): void {
	getPerformanceReporter().reportError(error, context);
}

// Lazy initialization - no auto-initialization
// The reporter will be created when first accessed