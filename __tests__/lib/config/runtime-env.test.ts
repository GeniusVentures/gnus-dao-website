/**
 * Tests for runtime environment configuration
 */
import {
  preloadRuntimeEnv,
  getCachedRuntimeEnv,
  isRuntimeEnvLoaded,
  resetRuntimeEnv,
} from '@/lib/config/runtime-env';

// Mock fetch
global.fetch = jest.fn();

describe('Runtime Environment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    resetRuntimeEnv(); // Reset cached environment before each test
  });

  describe('preloadRuntimeEnv', () => {
    it('should load runtime environment from API', async () => {
      const mockEnv = {
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: 'test-project-id',
        NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS: '0x1234567890123456789012345678901234567890',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnv,
      });

      const env = await preloadRuntimeEnv();

      expect(env).toEqual(mockEnv);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/config/runtime-env'),
        expect.any(Object)
      );
    });

    it('should cache loaded environment', async () => {
      const mockEnv = {
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: 'test-project-id',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnv,
      });

      await preloadRuntimeEnv();
      const cached = getCachedRuntimeEnv();

      expect(cached).toEqual(mockEnv);
    });

    it('should use fallback values if API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API failed'));

      const env = await preloadRuntimeEnv();

      expect(env).toBeDefined();
      expect(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID).toBeTruthy();
    });

    it('should not fetch again if already loaded', async () => {
      const mockEnv = {
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: 'test-project-id',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnv,
      });

      await preloadRuntimeEnv();
      await preloadRuntimeEnv(); // Second call

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCachedRuntimeEnv', () => {
    it('should return cached environment', async () => {
      const mockEnv = {
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: 'test-project-id',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnv,
      });

      await preloadRuntimeEnv();
      const cached = getCachedRuntimeEnv();

      expect(cached).toEqual(mockEnv);
    });

    it('should return null if not loaded', () => {
      const cached = getCachedRuntimeEnv();

      expect(cached).toBeNull();
    });
  });

  describe('isRuntimeEnvLoaded', () => {
    it('should return true when environment is loaded', async () => {
      const mockEnv = {
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: 'test-project-id',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnv,
      });

      await preloadRuntimeEnv();

      expect(isRuntimeEnvLoaded()).toBe(true);
    });

    it('should return false when environment is not loaded', () => {
      expect(isRuntimeEnvLoaded()).toBe(false);
    });
  });

  describe('environment validation', () => {
    it('should validate required environment variables', async () => {
      // Mock API failure to trigger fallback values
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API failed'));

      const env = await preloadRuntimeEnv();

      // Should have fallback values when API fails
      expect(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID).toBeTruthy();
    });
  });
});

