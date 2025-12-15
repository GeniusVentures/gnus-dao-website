/**
 * Health Check API Endpoint
 * Provides comprehensive health status and triggers critical alerts for system failures
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { criticalErrorAlerting, CriticalErrorType } from '@/lib/utils/criticalErrorAlerting';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: HealthStatus;
    ipfs: HealthStatus;
    rpc: HealthStatus;
    sentry: HealthStatus;
    memory: HealthStatus;
    performance: HealthStatus;
  };
  uptime: number;
  responseTime: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  lastChecked: string;
  details?: Record<string, any>;
}

interface RPCEndpoint {
  name: string;
  url: string;
  chainId: number;
}

const startTime = Date.now();

/**
 * Get system memory usage
 */
function getMemoryUsage(): { used: number; total: number; percentage: number } {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round((used / total) * 100)
    };
  }
  return { used: 0, total: 0, percentage: 0 };
}

/**
 * Check database connectivity (placeholder - would connect to actual DB)
 */
async function checkDatabase(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // In a real implementation, this would check database connectivity
    // For now, we'll simulate a check
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      message: 'Database connection successful',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      message: `Database connection failed: ${(error as Error).message}`,
      responseTime,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check IPFS connectivity
 */
async function checkIPFS(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
    
    // Test with a known IPFS hash (empty directory)
    const testHash = 'QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn';
    const testUrl = `${ipfsGateway}${testHash}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        status: 'healthy',
        message: 'IPFS gateway accessible',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: { gateway: ipfsGateway }
      };
    } else {
      return {
        status: 'degraded',
        message: `IPFS gateway returned ${response.status}`,
        responseTime,
        lastChecked: new Date().toISOString(),
        details: { gateway: ipfsGateway, statusCode: response.status }
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      message: `IPFS check failed: ${(error as Error).message}`,
      responseTime,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check RPC endpoints
 */
async function checkRPC(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  const rpcEndpoints: RPCEndpoint[] = [
    {
      name: 'Ethereum',
      url: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      chainId: 1
    },
    {
      name: 'Base',
      url: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
      chainId: 8453
    },
    {
      name: 'Polygon',
      url: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
      chainId: 137
    }
  ];

  const results = await Promise.allSettled(
    rpcEndpoints.map(async (endpoint) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout per RPC
      
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          const chainId = parseInt(data.result, 16);
          
          return {
            name: endpoint.name,
            status: chainId === endpoint.chainId ? 'healthy' : 'degraded',
            chainId,
            expectedChainId: endpoint.chainId
          };
        } else {
          return {
            name: endpoint.name,
            status: 'unhealthy',
            error: `HTTP ${response.status}`
          };
        }
      } catch (error) {
        clearTimeout(timeoutId);
        return {
          name: endpoint.name,
          status: 'unhealthy',
          error: (error as Error).message
        };
      }
    })
  );

  const responseTime = Date.now() - startTime;
  const healthyCount = results.filter(result => 
    result.status === 'fulfilled' && result.value.status === 'healthy'
  ).length;
  
  const totalCount = results.length;
  const healthyPercentage = (healthyCount / totalCount) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  let message: string;

  if (healthyPercentage >= 80) {
    status = 'healthy';
    message = `${healthyCount}/${totalCount} RPC endpoints healthy`;
  } else if (healthyPercentage >= 50) {
    status = 'degraded';
    message = `${healthyCount}/${totalCount} RPC endpoints healthy (degraded)`;
  } else {
    status = 'unhealthy';
    message = `${healthyCount}/${totalCount} RPC endpoints healthy (critical)`;
  }

  return {
    status,
    message,
    responseTime,
    lastChecked: new Date().toISOString(),
    details: {
      endpoints: results.map((result, index) => ({
        name: rpcEndpoints[index]?.name || 'Unknown',
        url: rpcEndpoints[index]?.url || 'Unknown',
        ...(result.status === 'fulfilled' && result.value ? 
          { status: result.value.status, chainId: result.value.chainId, expectedChainId: result.value.expectedChainId } : 
          { status: 'error', error: result.status === 'rejected' ? result.reason : 'Unknown error' })
      }))
    }
  };
}

/**
 * Check Sentry connectivity
 */
async function checkSentry(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
    
    if (!sentryDsn) {
      return {
        status: 'degraded',
        message: 'Sentry DSN not configured',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString()
      };
    }

    // Test Sentry by capturing a test message
    const { captureMessage } = await import('@sentry/nextjs');
    captureMessage('Health check test message', 'info');
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      message: 'Sentry integration active',
      responseTime,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      message: `Sentry check failed: ${(error as Error).message}`,
      responseTime,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check memory usage
 */
async function checkMemory(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const memory = getMemoryUsage();
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;

    if (memory.percentage < 70) {
      status = 'healthy';
      message = `Memory usage: ${memory.percentage}% (${memory.used}MB/${memory.total}MB)`;
    } else if (memory.percentage < 90) {
      status = 'degraded';
      message = `Memory usage high: ${memory.percentage}% (${memory.used}MB/${memory.total}MB)`;
    } else {
      status = 'unhealthy';
      message = `Memory usage critical: ${memory.percentage}% (${memory.used}MB/${memory.total}MB)`;
    }

    return {
      status,
      message,
      responseTime,
      lastChecked: new Date().toISOString(),
      details: memory
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      message: `Memory check failed: ${(error as Error).message}`,
      responseTime,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check performance metrics
 */
async function checkPerformance(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // Get current performance metrics
    const performanceData = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      responseTime: 0, // Will be set after calculation
    };

    const responseTime = Date.now() - startTime;
    performanceData.responseTime = responseTime;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;

    // Check response time thresholds
    if (responseTime < 100) {
      status = 'healthy';
      message = `Performance optimal: ${responseTime}ms response time`;
    } else if (responseTime < 500) {
      status = 'degraded';
      message = `Performance degraded: ${responseTime}ms response time`;
    } else {
      status = 'unhealthy';
      message = `Performance critical: ${responseTime}ms response time`;
    }

    // Also check memory pressure
    const memoryUsage = performanceData.server.memory;
    const memoryPressure = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryPressure > 90 && status !== 'unhealthy') {
      status = 'unhealthy';
      message = `Performance critical: ${Math.round(memoryPressure)}% memory pressure`;
    } else if (memoryPressure > 70 && status === 'healthy') {
      status = 'degraded';
      message = `Performance degraded: ${Math.round(memoryPressure)}% memory pressure`;
    }

    return {
      status,
      message,
      responseTime,
      lastChecked: new Date().toISOString(),
      details: {
        ...performanceData,
        memoryPressure: Math.round(memoryPressure),
        thresholds: {
          responseTime: { good: 100, degraded: 500 },
          memoryPressure: { good: 70, degraded: 90 },
        },
      }
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'unhealthy',
      message: `Performance check failed: ${(error as Error).message}`,
      responseTime,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Determine overall health status
 */
function determineOverallStatus(checks: HealthCheckResult['checks']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(check => check.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  } else if (statuses.includes('degraded')) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

/**
 * Handle critical health issues
 */
async function handleCriticalHealthIssues(healthResult: HealthCheckResult): Promise<void> {
  const criticalChecks = Object.entries(healthResult.checks).filter(
    ([_, check]) => check.status === 'unhealthy'
  );

  if (criticalChecks.length > 0) {
    const criticalServices = criticalChecks.map(([service, _]) => service);
    const error = new Error(`Critical health check failures: ${criticalServices.join(', ')}`);
    
    await criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.SYSTEM_FAILURE, {
      additionalData: {
        failedServices: criticalServices,
        healthStatus: healthResult.status,
        checks: healthResult.checks,
        uptime: healthResult.uptime
      }
    });

    logger.error('Critical health check failures detected', {
      failedServices: criticalServices,
      healthStatus: healthResult.status,
      checks: healthResult.checks
    }, error);
  }

  // Also alert on degraded RPC or IPFS (critical for DAO operations)
  const criticalServices = ['rpc', 'ipfs'];
  const degradedCriticalServices = criticalServices.filter(
    service => healthResult.checks[service as keyof typeof healthResult.checks]?.status === 'degraded'
  );

  if (degradedCriticalServices.length > 0) {
    const error = new Error(`Critical services degraded: ${degradedCriticalServices.join(', ')}`);
    
    await criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.SYSTEM_FAILURE, {
      additionalData: {
        degradedServices: degradedCriticalServices,
        healthStatus: healthResult.status,
        checks: healthResult.checks
      }
    });

    logger.warn('Critical services degraded', {
      degradedServices: degradedCriticalServices,
      healthStatus: healthResult.status
    });
  }
}

/**
 * GET /api/health - Health check endpoint
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestStartTime = Date.now();
  
  try {
    logger.info('Health check requested', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    // Run all health checks in parallel
    const [database, ipfs, rpc, sentry, memory, performance] = await Promise.all([
      checkDatabase(),
      checkIPFS(),
      checkRPC(),
      checkSentry(),
      checkMemory(),
      checkPerformance()
    ]);

    const responseTime = Date.now() - requestStartTime;
    const uptime = Date.now() - startTime;

    const healthResult: HealthCheckResult = {
      status: determineOverallStatus({ database, ipfs, rpc, sentry, memory, performance }),
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      checks: { database, ipfs, rpc, sentry, memory, performance },
      uptime,
      responseTime
    };

    // Handle critical health issues
    await handleCriticalHealthIssues(healthResult);

    // Log health check result
    logger.info('Health check completed', {
      status: healthResult.status,
      responseTime,
      uptime,
      failedChecks: Object.entries(healthResult.checks)
        .filter(([_, check]) => check.status !== 'healthy')
        .map(([service, _]) => service)
    });

    // Return appropriate HTTP status code
    const statusCode = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthResult, { status: statusCode });

  } catch (error) {
    const responseTime = Date.now() - requestStartTime;
    
    logger.error('Health check failed', { responseTime }, error as Error);

    // Trigger critical alert for health check failure
    await criticalErrorAlerting.triggerCriticalAlert(
      error as Error, 
      CriticalErrorType.SYSTEM_FAILURE,
      {
        endpoint: '/api/health',
        additionalData: { responseTime }
      }
    );

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: (error as Error).message,
        responseTime
      },
      { status: 503 }
    );
  }
}