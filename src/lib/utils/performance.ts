/**
 * Performance Metrics Collection and Monitoring
 * Comprehensive performance tracking for GNUS DAO application
 */

import * as Sentry from '@sentry/nextjs';
import { getCurrentSession, addUserActionBreadcrumb } from './sentry';

/**
 * Web Vitals metrics interface
 */
export interface WebVitalsMetric {
	name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
	value: number;
	rating: 'good' | 'needs-improvement' | 'poor';
	delta: number;
	id: string;
	navigationType: string;
}

/**
 * Custom performance metric interface
 */
export interface CustomMetric {
	name: string;
	value: number;
	unit: 'ms' | 'bytes' | 'count' | 'percentage';
	timestamp: number;
	context?: Record<string, any>;
}

/**
 * Performance thresholds for different metrics
 */
export const PERFORMANCE_THRESHOLDS = {
	// Web Vitals thresholds (Google recommendations)
	CLS: { good: 0.1, poor: 0.25 },
	FID: { good: 100, poor: 300 },
	FCP: { good: 1800, poor: 3000 },
	LCP: { good: 2500, poor: 4000 },
	TTFB: { good: 800, poor: 1800 },
	INP: { good: 200, poor: 500 },

	// Custom thresholds
	API_RESPONSE: { good: 500, poor: 2000 },
	COMPONENT_RENDER: { good: 16, poor: 100 },
	WALLET_CONNECTION: { good: 3000, poor: 10000 },
	IPFS_UPLOAD: { good: 5000, poor: 30000 },
	CONTRACT_INTERACTION: { good: 2000, poor: 10000 },
} as const;

/**
 * Performance metrics store
 */
class PerformanceMetricsStore {
	private metrics: Map<string, CustomMetric[]> = new Map();
	private webVitalsMetrics: Map<string, WebVitalsMetric> = new Map();
	private observers: Map<string, PerformanceObserver> = new Map();

	constructor() {
		this.initializeWebVitalsTracking();
		this.initializeResourceTracking();
		this.initializeNavigationTracking();
	}

	/**
	 * Initialize Web Vitals tracking using the web-vitals library approach
	 */
	private initializeWebVitalsTracking(): void {
		if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

		try {
			// Track Cumulative Layout Shift (CLS)
			this.trackCLS();

			// Track First Input Delay (FID) / Interaction to Next Paint (INP)
			this.trackFID();

			// Track First Contentful Paint (FCP)
			this.trackFCP();

			// Track Largest Contentful Paint (LCP)
			this.trackLCP();

			// Track Time to First Byte (TTFB)
			this.trackTTFB();
		} catch (error) {
			console.warn('Failed to initialize Web Vitals tracking:', error);
		}
	}

	/**
	 * Track Cumulative Layout Shift (CLS)
	 */
	private trackCLS(): void {
		try {
			if (!('LayoutShiftAttribution' in window) || typeof PerformanceObserver === 'undefined') return;

			let clsValue = 0;
			let clsEntries: any[] = [];

			const observer = new PerformanceObserver((list) => {
				try {
					for (const entry of list.getEntries() as any[]) {
						// Only count layout shifts without recent user input
						if (!entry.hadRecentInput) {
							clsValue += entry.value;
							clsEntries.push(entry);
						}
					}
				} catch (error) {
					console.warn('Error processing CLS entries:', error);
				}
			});

			observer.observe({ type: 'layout-shift', buffered: true });
			this.observers.set('cls', observer);

			// Report CLS on page hide
			const reportCLS = () => {
				const metric: WebVitalsMetric = {
					name: 'CLS',
					value: clsValue,
					rating: this.getRating('CLS', clsValue),
					delta: clsValue,
					id: this.generateMetricId(),
					navigationType: this.getNavigationType(),
				};

				this.recordWebVital(metric);
			};

			window.addEventListener('beforeunload', reportCLS);
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'hidden') {
					reportCLS();
				}
			});
		} catch (error) {
			console.warn('Failed to initialize CLS tracking:', error);
			return;
		}
	}

	/**
	 * Track First Input Delay (FID)
	 */
	private trackFID(): void {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const fidEntry = entry as any;
				const processingTime = fidEntry.processingStart ? fidEntry.processingStart - entry.startTime : 0;
				
				const metric: WebVitalsMetric = {
					name: 'FID',
					value: processingTime,
					rating: this.getRating('FID', processingTime),
					delta: processingTime,
					id: this.generateMetricId(),
					navigationType: this.getNavigationType(),
				};

				this.recordWebVital(metric);
			}
		});

		observer.observe({ type: 'first-input', buffered: true });
		this.observers.set('fid', observer);
	}

	/**
	 * Track First Contentful Paint (FCP)
	 */
	private trackFCP(): void {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.name === 'first-contentful-paint') {
					const metric: WebVitalsMetric = {
						name: 'FCP',
						value: entry.startTime,
						rating: this.getRating('FCP', entry.startTime),
						delta: entry.startTime,
						id: this.generateMetricId(),
						navigationType: this.getNavigationType(),
					};

					this.recordWebVital(metric);
				}
			}
		});

		observer.observe({ type: 'paint', buffered: true });
		this.observers.set('fcp', observer);
	}

	/**
	 * Track Largest Contentful Paint (LCP)
	 */
	private trackLCP(): void {
		let lcpValue = 0;

		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const lastEntry = entries[entries.length - 1];
			if (lastEntry) {
				lcpValue = lastEntry.startTime;
			}
		});

		observer.observe({ type: 'largest-contentful-paint', buffered: true });
		this.observers.set('lcp', observer);

		// Report LCP on page hide
		const reportLCP = () => {
			if (lcpValue > 0) {
				const metric: WebVitalsMetric = {
					name: 'LCP',
					value: lcpValue,
					rating: this.getRating('LCP', lcpValue),
					delta: lcpValue,
					id: this.generateMetricId(),
					navigationType: this.getNavigationType(),
				};

				this.recordWebVital(metric);
			}
		};

		window.addEventListener('beforeunload', reportLCP);
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				reportLCP();
			}
		});
	}

	/**
	 * Track Time to First Byte (TTFB)
	 */
	private trackTTFB(): void {
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.entryType === 'navigation') {
					const navEntry = entry as PerformanceNavigationTiming;
					const ttfb = navEntry.responseStart - navEntry.requestStart;

					const metric: WebVitalsMetric = {
						name: 'TTFB',
						value: ttfb,
						rating: this.getRating('TTFB', ttfb),
						delta: ttfb,
						id: this.generateMetricId(),
						navigationType: this.getNavigationType(),
					};

					this.recordWebVital(metric);
				}
			}
		});

		observer.observe({ type: 'navigation', buffered: true });
		this.observers.set('ttfb', observer);
	}

	/**
	 * Initialize resource loading tracking
	 */
	private initializeResourceTracking(): void {
		if (typeof window === 'undefined') return;

		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const resourceEntry = entry as PerformanceResourceTiming;
				
				// Track slow resources
				if (resourceEntry.duration > 1000) {
					this.recordCustomMetric({
						name: 'slow_resource_load',
						value: resourceEntry.duration,
						unit: 'ms',
						timestamp: Date.now(),
						context: {
							resourceName: resourceEntry.name,
							resourceType: resourceEntry.initiatorType,
							transferSize: resourceEntry.transferSize,
						},
					});
				}
			}
		});

		observer.observe({ type: 'resource', buffered: true });
		this.observers.set('resource', observer);
	}

	/**
	 * Initialize navigation tracking
	 */
	private initializeNavigationTracking(): void {
		if (typeof window === 'undefined') return;

		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const navEntry = entry as PerformanceNavigationTiming;
				
				// Track page load metrics
				this.recordCustomMetric({
					name: 'page_load_time',
					value: navEntry.loadEventEnd - navEntry.fetchStart,
					unit: 'ms',
					timestamp: Date.now(),
					context: {
						domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
						domInteractive: navEntry.domInteractive - navEntry.fetchStart,
						navigationType: navEntry.type,
					},
				});
			}
		});

		observer.observe({ type: 'navigation', buffered: true });
		this.observers.set('navigation', observer);
	}

	/**
	 * Record a Web Vital metric
	 */
	private recordWebVital(metric: WebVitalsMetric): void {
		this.webVitalsMetrics.set(metric.name, metric);

		// Send to Sentry
		Sentry.addBreadcrumb({
			message: `Web Vital: ${metric.name}`,
			category: 'performance',
			level: metric.rating === 'poor' ? 'warning' : 'info',
			data: {
				name: metric.name,
				value: metric.value,
				rating: metric.rating,
				navigationType: metric.navigationType,
			},
		});

		// Send as Sentry measurement
		Sentry.setMeasurement(metric.name, metric.value, 'millisecond');

		// Capture performance issue if poor
		if (metric.rating === 'poor') {
			Sentry.captureMessage(`Poor Web Vital: ${metric.name} = ${metric.value}ms`, 'warning');
		}

		// Add to user action breadcrumb for context
		addUserActionBreadcrumb('web_vital_recorded', {
			metric: metric.name,
			value: metric.value,
			rating: metric.rating,
		});

		// Report to performance reporter
		if (typeof window !== 'undefined') {
			import('./performanceReporter').then(({ reportWebVital }) => {
				reportWebVital(metric.name, metric.value, metric.rating);
			});
		}
	}

	/**
	 * Record a custom performance metric
	 */
	recordCustomMetric(metric: CustomMetric): void {
		const metricKey = metric.name;
		const existingMetrics = this.metrics.get(metricKey) || [];
		existingMetrics.push(metric);
		this.metrics.set(metricKey, existingMetrics);

		// Send to Sentry
		Sentry.addBreadcrumb({
			message: `Performance Metric: ${metric.name}`,
			category: 'performance',
			level: 'info',
			data: {
				name: metric.name,
				value: metric.value,
				unit: metric.unit,
				context: metric.context,
			},
		});

		// Send as Sentry measurement
		const unit = metric.unit === 'ms' ? 'millisecond' : 
					 metric.unit === 'bytes' ? 'byte' : 'none';
		Sentry.setMeasurement(metric.name, metric.value, unit);

		// Check if metric exceeds thresholds
		this.checkPerformanceThreshold(metric);

		// Report to performance reporter
		if (typeof window !== 'undefined') {
			import('./performanceReporter').then(({ reportCustomMetric }) => {
				reportCustomMetric(metric.name, metric.value, metric.unit, metric.context);
			});
		}
	}

	/**
	 * Check if a metric exceeds performance thresholds
	 */
	private checkPerformanceThreshold(metric: CustomMetric): void {
		const thresholdKey = metric.name.toUpperCase().replace(/_/g, '_') as keyof typeof PERFORMANCE_THRESHOLDS;
		const threshold = PERFORMANCE_THRESHOLDS[thresholdKey];

		if (threshold && metric.unit === 'ms') {
			if (metric.value > threshold.poor) {
				Sentry.captureMessage(
					`Performance threshold exceeded: ${metric.name} = ${metric.value}ms (threshold: ${threshold.poor}ms)`,
					'warning'
				);
			}
		}
	}

	/**
	 * Get performance rating based on thresholds
	 */
	private getRating(metricName: keyof typeof PERFORMANCE_THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
		const threshold = PERFORMANCE_THRESHOLDS[metricName];
		if (value <= threshold.good) return 'good';
		if (value <= threshold.poor) return 'needs-improvement';
		return 'poor';
	}

	/**
	 * Generate unique metric ID
	 */
	private generateMetricId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	/**
	 * Get navigation type
	 */
	private getNavigationType(): string {
		if (typeof window === 'undefined') return 'unknown';
		
		const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		return navEntry ? navEntry.type : 'unknown';
	}

	/**
	 * Get all recorded metrics
	 */
	getMetrics(): { webVitals: Map<string, WebVitalsMetric>; custom: Map<string, CustomMetric[]> } {
		return {
			webVitals: this.webVitalsMetrics,
			custom: this.metrics,
		};
	}

	/**
	 * Get performance summary
	 */
	getPerformanceSummary(): {
		webVitals: Record<string, { value: number; rating: string }>;
		customMetrics: Record<string, { count: number; average: number; latest: number }>;
	} {
		const webVitals: Record<string, { value: number; rating: string }> = {};
		this.webVitalsMetrics.forEach((metric, name) => {
			webVitals[name] = {
				value: metric.value,
				rating: metric.rating,
			};
		});

		const customMetrics: Record<string, { count: number; average: number; latest: number }> = {};
		this.metrics.forEach((metricList, name) => {
			const values = metricList.map(m => m.value);
			customMetrics[name] = {
				count: values.length,
				average: values.reduce((a, b) => a + b, 0) / values.length,
				latest: values[values.length - 1] || 0,
			};
		});

		return { webVitals, customMetrics };
	}

	/**
	 * Clean up observers
	 */
	cleanup(): void {
		this.observers.forEach(observer => observer.disconnect());
		this.observers.clear();
	}
}

// Global performance metrics store
let performanceStore: PerformanceMetricsStore | null = null;

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring(): PerformanceMetricsStore | null {
	return ensureInitialized();
}

/**
 * Get the performance store instance
 */
export function getPerformanceStore(): PerformanceMetricsStore | null {
	return ensureInitialized();
}

/**
 * Record a custom performance metric
 */
export function recordPerformanceMetric(
	name: string,
	value: number,
	unit: 'ms' | 'bytes' | 'count' | 'percentage' = 'ms',
	context?: Record<string, any>
): void {
	const store = ensureInitialized();
	if (!store) return;

	store.recordCustomMetric({
		name,
		value,
		unit,
		timestamp: Date.now(),
		context,
	});
}

/**
 * Measure function execution time
 */
export function measureExecutionTime<T>(
	name: string,
	fn: () => T,
	context?: Record<string, any>
): T {
	const startTime = performance.now();
	const result = fn();
	const endTime = performance.now();
	
	recordPerformanceMetric(name, endTime - startTime, 'ms', context);
	
	return result;
}

/**
 * Measure async function execution time
 */
export async function measureAsyncExecutionTime<T>(
	name: string,
	fn: () => Promise<T>,
	context?: Record<string, any>
): Promise<T> {
	const startTime = performance.now();
	const result = await fn();
	const endTime = performance.now();
	
	recordPerformanceMetric(name, endTime - startTime, 'ms', context);
	
	return result;
}

/**
 * Create a performance timer
 */
export class PerformanceTimer {
	private startTime: number;
	private name: string;
	private context?: Record<string, any>;

	constructor(name: string, context?: Record<string, any>) {
		this.name = name;
		this.context = context;
		this.startTime = performance.now();
	}

	/**
	 * End the timer and record the metric
	 */
	end(): number {
		const duration = performance.now() - this.startTime;
		recordPerformanceMetric(this.name, duration, 'ms', this.context);
		return duration;
	}
}

/**
 * Start a performance timer
 */
export function startPerformanceTimer(name: string, context?: Record<string, any>): PerformanceTimer {
	return new PerformanceTimer(name, context);
}

/**
 * Get current performance summary
 */
export function getPerformanceSummary(): {
	webVitals: Record<string, { value: number; rating: string }>;
	customMetrics: Record<string, { count: number; average: number; latest: number }>;
} | null {
	return performanceStore?.getPerformanceSummary() || null;
}

/**
 * Cleanup performance monitoring
 */
export function cleanupPerformanceMonitoring(): void {
	if (performanceStore) {
		performanceStore.cleanup();
		performanceStore = null;
	}
}

// Lazy initialization - only initialize when needed
let isInitialized = false;

/**
 * Ensure performance monitoring is initialized (lazy loading)
 */
function ensureInitialized(): PerformanceMetricsStore | null {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return null;
	}

	if (!isInitialized && !performanceStore) {
		try {
			performanceStore = new PerformanceMetricsStore();
			isInitialized = true;
		} catch (error) {
			console.warn('Failed to initialize performance monitoring:', error);
			return null;
		}
	}

	return performanceStore;
}