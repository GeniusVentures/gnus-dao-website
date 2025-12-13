import { isDevelopment, isProduction } from '@/lib/config/env';
import * as Sentry from '@sentry/nextjs';

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

/**
 * Log entry interface
 */
interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: Date;
	context?: Record<string, any> | undefined;
	error?: Error | undefined;
	userId?: string | undefined;
	sessionId?: string | undefined;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
	minLevel: LogLevel;
	enableConsole: boolean;
	enableRemote: boolean;
	remoteEndpoint?: string;
	maxEntries: number;
}

/**
 * Centralized logging system for GNUS DAO
 */
class Logger {
	private config: LoggerConfig;
	private entries: LogEntry[] = [];
	private sessionId: string;

	constructor(config: Partial<LoggerConfig> = {}) {
		this.config = {
			minLevel: isDevelopment() ? LogLevel.DEBUG : LogLevel.INFO,
			enableConsole: true,
			enableRemote: isProduction(),
			maxEntries: 1000,
			...config,
		};

		this.sessionId = this.generateSessionId();

		// Set up global error handlers
		this.setupGlobalErrorHandlers();
	}

	private generateSessionId(): string {
		// Use crypto.randomUUID() for secure random ID generation
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		// Fallback for older environments
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private setupGlobalErrorHandlers() {
		if (typeof window !== 'undefined') {
			// Handle unhandled promise rejections
			window.addEventListener('unhandledrejection', (event) => {
				const error = new Error(`Unhandled Promise Rejection: ${event.reason}`);
				const context = {
					reason: event.reason,
					promise: event.promise,
				};

				this.error('Unhandled Promise Rejection', context);

				// Send to Sentry
				Sentry.captureException(error, {
					contexts: {
						promise: context,
					},
					tags: {
						errorType: 'unhandledRejection',
					},
				});
			});

			// Handle global errors
			window.addEventListener('error', (event) => {
				const context = {
					message: event.message,
					filename: event.filename,
					lineno: event.lineno,
					colno: event.colno,
					error: event.error,
				};

				this.error('Global Error', context, event.error);

				// Send to Sentry (if not already captured)
				if (event.error && !event.error._sentryProcessed) {
					Sentry.captureException(event.error, {
						contexts: {
							errorEvent: context,
						},
						tags: {
							errorType: 'globalError',
						},
					});
					event.error._sentryProcessed = true;
				}
			});
		}
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.config.minLevel;
	}

	private formatMessage(level: LogLevel, message: string): string {
		const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
		const timestamp = new Date().toISOString();
		return `[${timestamp}] [${levelNames[level]}] ${message}`;
	}

	private addEntry(entry: LogEntry) {
		this.entries.push(entry);

		// Maintain max entries limit
		if (this.entries.length > this.config.maxEntries) {
			this.entries = this.entries.slice(-this.config.maxEntries);
		}
	}

	private logToConsole(entry: LogEntry) {
		if (!this.config.enableConsole) return;

		const formattedMessage = this.formatMessage(entry.level, entry.message);
		const args = [formattedMessage];

		if (entry.context) {
			args.push(JSON.stringify(entry.context));
		}

		if (entry.error) {
			args.push(entry.error.message);
		}

		switch (entry.level) {
			case LogLevel.DEBUG:
				console.debug(...args);
				break;
			case LogLevel.INFO:
				console.info(...args);
				break;
			case LogLevel.WARN:
				console.warn(...args);
				break;
			case LogLevel.ERROR:
				console.error(...args);
				break;
		}
	}

	private async logToRemote(entry: LogEntry) {
		if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

		try {
			await fetch(this.config.remoteEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...entry,
					sessionId: this.sessionId,
					userAgent: navigator.userAgent,
					url: window.location.href,
				}),
			});
		} catch (error) {
			// Fallback to console if remote logging fails
			console.error('Failed to send log to remote endpoint:', error);
		}
	}

	private log(
		level: LogLevel,
		message: string,
		context?: Record<string, any>,
		error?: Error,
	) {
		if (!this.shouldLog(level)) return;

		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date(),
			context,
			error,
			sessionId: this.sessionId,
		};

		this.addEntry(entry);
		this.logToConsole(entry);

		if (this.config.enableRemote) {
			this.logToRemote(entry).catch(() => {
				// Silent fail for remote logging
			});
		}
	}

	debug(message: string, context?: Record<string, any>) {
		this.log(LogLevel.DEBUG, message, context);
	}

	info(message: string, context?: Record<string, any>) {
		this.log(LogLevel.INFO, message, context);
	}

	warn(message: string, context?: Record<string, any>) {
		this.log(LogLevel.WARN, message, context);

		// Send warnings to Sentry in production
		if (isProduction()) {
			Sentry.captureMessage(message, 'warning');
			Sentry.setContext('warning', context || {});
		}
	}

	error(message: string, context?: Record<string, any>, error?: Error) {
		this.log(LogLevel.ERROR, message, context, error);

		// Send to Sentry for all errors
		if (error) {
			Sentry.captureException(error, {
				contexts: {
					logger: context || {},
				},
				tags: {
					loggerMessage: message,
					errorType: 'loggedError',
				},
			});
		} else {
			// Create an error from the message if no error object provided
			const syntheticError = new Error(message);
			Sentry.captureException(syntheticError, {
				contexts: {
					logger: context || {},
				},
				tags: {
					errorType: 'loggedMessage',
				},
			});
		}
	}

	/**
	 * Log Web3 specific events
	 */
	web3(action: string, context?: Record<string, any>) {
		this.info(`Web3: ${action}`, { ...context, category: 'web3' });
	}

	/**
	 * Log user interactions
	 */
	user(action: string, context?: Record<string, any>) {
		this.info(`User: ${action}`, { ...context, category: 'user' });
	}

	/**
	 * Log performance metrics
	 */
	performance(metric: string, value: number, context?: Record<string, any>) {
		this.info(`Performance: ${metric}`, {
			...context,
			category: 'performance',
			value,
			unit: context?.unit || 'ms',
		});
	}

	/**
	 * Get recent log entries
	 */
	getEntries(level?: LogLevel, limit?: number): LogEntry[] {
		let entries = this.entries;

		if (level !== undefined) {
			entries = entries.filter((entry) => entry.level >= level);
		}

		if (limit) {
			entries = entries.slice(-limit);
		}

		return entries;
	}

	/**
	 * Clear log entries
	 */
	clear() {
		this.entries = [];
	}

	/**
	 * Export logs for debugging
	 */
	export(): string {
		return JSON.stringify(this.entries, null, 2);
	}

	/**
	 * Set user context for Sentry
	 */
	setUser(user: { id?: string; email?: string; username?: string; address?: string }) {
		Sentry.setUser(user);
	}

	/**
	 * Set additional context for Sentry
	 */
	setContext(key: string, context: Record<string, any>) {
		Sentry.setContext(key, context);
	}

	/**
	 * Add breadcrumb for Sentry
	 */
	addBreadcrumb(
		message: string,
		category?: string,
		level?: 'debug' | 'info' | 'warning' | 'error',
	) {
		Sentry.addBreadcrumb({
			message,
			category: category || 'custom',
			level: level || 'info',
			timestamp: Date.now() / 1000,
		});
	}

	/**
	 * Capture Web3 specific errors with enhanced context
	 */
	captureWeb3Error(
		error: Error,
		context: {
			action?: string;
			chainId?: number;
			contractAddress?: string;
			method?: string;
			walletType?: string;
			transactionHash?: string;
		},
	) {
		this.error(`Web3 Error: ${context.action || 'Unknown'}`, context, error);

		Sentry.captureException(error, {
			contexts: {
				web3: context,
			},
			tags: {
				errorType: 'web3Error',
				chainId: context.chainId?.toString(),
				walletType: context.walletType,
			},
		});
	}
}

// Create singleton logger instance
export const logger = new Logger();

// Convenience functions
export const log = {
	debug: (message: string, context?: Record<string, any>) => logger.debug(message, context),
	info: (message: string, context?: Record<string, any>) => logger.info(message, context),
	warn: (message: string, context?: Record<string, any>) => logger.warn(message, context),
	error: (message: string, context?: Record<string, any>, error?: Error) =>
		logger.error(message, context, error),
	web3: (action: string, context?: Record<string, any>) => logger.web3(action, context),
	user: (action: string, context?: Record<string, any>) => logger.user(action, context),
	performance: (metric: string, value: number, context?: Record<string, any>) =>
		logger.performance(metric, value, context),
};

export default logger;
