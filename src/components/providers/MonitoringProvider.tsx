"use client";

import { useEffect } from 'react';

/**
 * Monitoring Provider - Safely initializes monitoring systems after hydration
 */
export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize monitoring systems after component mount (client-side only)
    const initializeMonitoring = async () => {
      try {
        // Initialize performance monitoring
        const { initializePerformanceMonitoring } = await import('@/lib/utils/performance');
        initializePerformanceMonitoring();

        // Initialize error tracking
        const { initializeSession } = await import('@/lib/utils/sentry');
        initializeSession();

        console.log('✅ Monitoring systems initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize monitoring systems:', error);
      }
    };

    // Delay initialization to ensure DOM is ready
    const timer = setTimeout(initializeMonitoring, 100);

    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}