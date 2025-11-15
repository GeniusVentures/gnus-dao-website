/**
 * Tests for centralized logging system
 */
import logger, { LogLevel } from '@/lib/utils/logger';

describe('Logger', () => {
	let consoleDebugSpy: jest.SpyInstance;
	let consoleInfoSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;
	let consoleErrorSpy: jest.SpyInstance;

	beforeEach(() => {
		consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
		consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
	});

	afterEach(() => {
		consoleDebugSpy.mockRestore();
		consoleInfoSpy.mockRestore();
		consoleWarnSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	describe('debug', () => {
		it('should log debug messages', () => {
			logger.debug('Test debug message', { key: 'value' });

			expect(consoleDebugSpy).toHaveBeenCalled();
		});
	});

	describe('info', () => {
		it('should log info messages', () => {
			logger.info('Test info message', { key: 'value' });

			expect(consoleInfoSpy).toHaveBeenCalled();
		});
	});

	describe('warn', () => {
		it('should log warning messages', () => {
			logger.warn('Test warning message', { key: 'value' });

			expect(consoleWarnSpy).toHaveBeenCalled();
		});
	});

	describe('error', () => {
		it('should log error messages', () => {
			const testError = new Error('Test error');
			logger.error('Test error message', { key: 'value' }, testError);

			expect(consoleErrorSpy).toHaveBeenCalled();
		});

		it('should handle errors without Error object', () => {
			logger.error('Test error message', { key: 'value' });

			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	describe('web3', () => {
		it('should log Web3 specific events', () => {
			logger.web3('Wallet Connected', { address: '0x123' });

			expect(consoleInfoSpy).toHaveBeenCalled();
			const logCall = consoleInfoSpy.mock.calls[0];
			expect(logCall[0]).toContain('Web3');
		});
	});

	describe('user', () => {
		it('should log user interactions', () => {
			logger.user('Button Clicked', { button: 'submit' });

			expect(consoleInfoSpy).toHaveBeenCalled();
			const logCall = consoleInfoSpy.mock.calls[0];
			expect(logCall[0]).toContain('User');
		});
	});

	describe('performance', () => {
		it('should log performance metrics', () => {
			logger.performance('Page Load', 1234, { page: '/proposals' });

			expect(consoleInfoSpy).toHaveBeenCalled();
			const logCall = consoleInfoSpy.mock.calls[0];
			expect(logCall[0]).toContain('Performance');
		});
	});

	describe('getEntries', () => {
		it('should return logged entries', () => {
			logger.info('Test message 1');
			logger.warn('Test message 2');

			const entries = logger.getEntries();

			expect(entries.length).toBeGreaterThan(0);
			expect(entries.some((e) => e.message === 'Test message 1')).toBe(true);
			expect(entries.some((e) => e.message === 'Test message 2')).toBe(true);
		});
	});

	describe('clear', () => {
		it('should clear all logged entries', () => {
			logger.info('Test message');
			logger.clear();

			const entries = logger.getEntries();

			expect(entries.length).toBe(0);
		});
	});

	describe('getEntries with level filter', () => {
		it('should filter entries by log level', () => {
			logger.clear(); // Clear previous entries
			logger.info('Info message');
			logger.warn('Warning message');
			logger.error('Error message');

			const errorEntries = logger.getEntries(LogLevel.ERROR);

			expect(errorEntries.length).toBeGreaterThan(0);
			expect(errorEntries.every((e) => e.level >= LogLevel.ERROR)).toBe(true);
		});
	});

	describe('export', () => {
		it('should export logs as JSON string', () => {
			logger.clear();
			logger.info('Test message', { key: 'value' });

			const exported = logger.export();

			expect(typeof exported).toBe('string');
			expect(() => JSON.parse(exported)).not.toThrow();
		});
	});

	describe('context handling', () => {
		it('should include context in log entries', () => {
			const context = { userId: '123', action: 'test' };
			logger.info('Test with context', context);

			const entries = logger.getEntries();
			const lastEntry = entries[entries.length - 1];

			expect(lastEntry?.context).toEqual(expect.objectContaining(context));
		});
	});
});
