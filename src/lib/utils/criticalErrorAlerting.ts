/**
 * Critical Error Alerting System
 * Implements immediate alerting for critical errors in the GNUS DAO application
 */

import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';
import { captureError, captureWeb3Error, captureApiError } from './sentry';

/**
 * Critical error types that require immediate alerting
 */
export enum CriticalErrorType {
  SECURITY_BREACH = 'security_breach',
  DATA_CORRUPTION = 'data_corruption',
  SYSTEM_FAILURE = 'system_failure',
  WEB3_CRITICAL = 'web3_critical',
  API_CRITICAL = 'api_critical',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  SMART_CONTRACT_ERROR = 'smart_contract_error',
  TREASURY_ERROR = 'treasury_error',
  GOVERNANCE_ERROR = 'governance_error',
  IPFS_CRITICAL = 'ipfs_critical'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Alert channels for notifications
 */
export enum AlertChannel {
  SLACK = 'slack',
  DISCORD = 'discord',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SENTRY = 'sentry'
}

/**
 * Critical error context interface
 */
export interface CriticalErrorContext {
  errorType: CriticalErrorType;
  severity: AlertSeverity;
  userId?: string;
  sessionId?: string;
  walletAddress?: string;
  chainId?: number;
  contractAddress?: string;
  transactionHash?: string;
  proposalId?: string;
  ipfsHash?: string;
  endpoint?: string;
  userAgent?: string;
  url?: string;
  timestamp: number;
  stackTrace?: string;
  additionalData?: Record<string, any>;
}

/**
 * Alert configuration interface
 */
export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  webhookUrl?: string;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  emailRecipients?: string[];
  retryAttempts: number;
  retryDelay: number;
  escalationDelay: number;
  rateLimitWindow: number;
  maxAlertsPerWindow: number;
}

/**
 * Alert payload interface
 */
export interface AlertPayload {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  errorType: CriticalErrorType;
  title: string;
  description: string;
  context: CriticalErrorContext;
  environment: string;
  version: string;
  fingerprint: string;
}

/**
 * Rate limiting tracker
 */
interface RateLimitTracker {
  [key: string]: {
    count: number;
    windowStart: number;
  };
}

/**
 * Critical Error Alerting System
 */
export class CriticalErrorAlerting {
  private config: AlertConfig;
  private rateLimitTracker: RateLimitTracker = {};
  private alertQueue: AlertPayload[] = [];
  private isProcessing = false;

  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_CRITICAL_ALERTS === 'true',
      channels: this.getEnabledChannels(),
      webhookUrl: process.env.CRITICAL_ALERT_WEBHOOK_URL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
      emailRecipients: process.env.CRITICAL_ALERT_EMAILS?.split(',') || [],
      retryAttempts: 3,
      retryDelay: 5000, // 5 seconds
      escalationDelay: 300000, // 5 minutes
      rateLimitWindow: 300000, // 5 minutes
      maxAlertsPerWindow: 10,
      ...config
    };

    // Start processing queue
    this.startQueueProcessor();
  }

  /**
   * Get enabled alert channels based on environment configuration
   */
  private getEnabledChannels(): AlertChannel[] {
    const channels: AlertChannel[] = [AlertChannel.SENTRY]; // Always include Sentry

    if (process.env.SLACK_WEBHOOK_URL) {
      channels.push(AlertChannel.SLACK);
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
      channels.push(AlertChannel.DISCORD);
    }

    if (process.env.CRITICAL_ALERT_EMAILS) {
      channels.push(AlertChannel.EMAIL);
    }

    if (process.env.CRITICAL_ALERT_WEBHOOK_URL) {
      channels.push(AlertChannel.WEBHOOK);
    }

    return channels;
  }

  /**
   * Trigger critical error alert
   */
  async triggerCriticalAlert(
    error: Error,
    errorType: CriticalErrorType,
    context: Partial<CriticalErrorContext> = {}
  ): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('Critical alerting disabled, skipping alert');
      return;
    }

    const severity = this.determineSeverity(errorType);
    const fullContext: CriticalErrorContext = {
      errorType,
      severity,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      stackTrace: error.stack,
      ...context
    };

    // Check rate limiting
    if (this.isRateLimited(errorType)) {
      logger.warn(`Rate limit exceeded for error type: ${errorType}`);
      return;
    }

    // Create alert payload
    const alertPayload: AlertPayload = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      severity,
      errorType,
      title: this.generateAlertTitle(errorType, error),
      description: this.generateAlertDescription(error, fullContext),
      context: fullContext,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      fingerprint: this.generateFingerprint(errorType, error)
    };

    // Add to queue for processing
    this.alertQueue.push(alertPayload);

    // Log the critical error
    logger.error(`Critical Error Alert: ${errorType}`, fullContext, error);

    // Capture in Sentry with critical level
    this.captureCriticalErrorInSentry(error, fullContext);

    // Update rate limiting
    this.updateRateLimit(errorType);
  }

  /**
   * Determine alert severity based on error type
   */
  private determineSeverity(errorType: CriticalErrorType): AlertSeverity {
    const criticalTypes = [
      CriticalErrorType.SECURITY_BREACH,
      CriticalErrorType.DATA_CORRUPTION,
      CriticalErrorType.SYSTEM_FAILURE,
      CriticalErrorType.TREASURY_ERROR
    ];

    const highTypes = [
      CriticalErrorType.WEB3_CRITICAL,
      CriticalErrorType.SMART_CONTRACT_ERROR,
      CriticalErrorType.GOVERNANCE_ERROR,
      CriticalErrorType.AUTHENTICATION_FAILURE
    ];

    if (criticalTypes.includes(errorType)) {
      return AlertSeverity.CRITICAL;
    } else if (highTypes.includes(errorType)) {
      return AlertSeverity.HIGH;
    } else {
      return AlertSeverity.MEDIUM;
    }
  }

  /**
   * Generate alert title based on error type and error
   */
  private generateAlertTitle(errorType: CriticalErrorType, error: Error): string {
    const typeLabels: Record<CriticalErrorType, string> = {
      [CriticalErrorType.SECURITY_BREACH]: '🚨 SECURITY BREACH DETECTED',
      [CriticalErrorType.DATA_CORRUPTION]: '💥 DATA CORRUPTION ERROR',
      [CriticalErrorType.SYSTEM_FAILURE]: '⚠️ SYSTEM FAILURE',
      [CriticalErrorType.WEB3_CRITICAL]: '🔗 CRITICAL WEB3 ERROR',
      [CriticalErrorType.API_CRITICAL]: '🌐 CRITICAL API ERROR',
      [CriticalErrorType.AUTHENTICATION_FAILURE]: '🔐 AUTHENTICATION FAILURE',
      [CriticalErrorType.SMART_CONTRACT_ERROR]: '📜 SMART CONTRACT ERROR',
      [CriticalErrorType.TREASURY_ERROR]: '💰 TREASURY ERROR',
      [CriticalErrorType.GOVERNANCE_ERROR]: '🏛️ GOVERNANCE ERROR',
      [CriticalErrorType.IPFS_CRITICAL]: '📁 CRITICAL IPFS ERROR'
    };

    return `${typeLabels[errorType]} - ${error.message.substring(0, 100)}`;
  }

  /**
   * Generate alert description
   */
  private generateAlertDescription(error: Error, context: CriticalErrorContext): string {
    let description = `Critical error occurred in GNUS DAO application:\n\n`;
    description += `Error: ${error.message}\n`;
    description += `Type: ${context.errorType}\n`;
    description += `Severity: ${context.severity}\n`;
    description += `Timestamp: ${new Date(context.timestamp).toISOString()}\n`;

    if (context.userId) {
      description += `User ID: ${context.userId}\n`;
    }

    if (context.walletAddress) {
      description += `Wallet: ${context.walletAddress}\n`;
    }

    if (context.chainId) {
      description += `Chain ID: ${context.chainId}\n`;
    }

    if (context.contractAddress) {
      description += `Contract: ${context.contractAddress}\n`;
    }

    if (context.transactionHash) {
      description += `Transaction: ${context.transactionHash}\n`;
    }

    if (context.url) {
      description += `URL: ${context.url}\n`;
    }

    return description;
  }

  /**
   * Generate unique fingerprint for error deduplication
   */
  private generateFingerprint(errorType: CriticalErrorType, error: Error): string {
    const components = [
      errorType,
      error.name,
      error.message.substring(0, 100),
      error.stack?.split('\n')[0] || ''
    ];

    return Buffer.from(components.join('|')).toString('base64').substring(0, 16);
  }

  /**
   * Capture critical error in Sentry with enhanced context
   */
  private captureCriticalErrorInSentry(error: Error, context: CriticalErrorContext): void {
    Sentry.withScope((scope) => {
      // Set critical level
      scope.setLevel('fatal');

      // Set tags
      scope.setTag('errorType', context.errorType);
      scope.setTag('severity', context.severity);
      scope.setTag('critical', true);

      // Set user context
      if (context.userId || context.walletAddress) {
        scope.setUser({
          id: context.userId,
          username: context.walletAddress
        });
      }

      // Set additional context
      scope.setContext('criticalError', {
        errorType: context.errorType,
        severity: context.severity,
        timestamp: context.timestamp,
        chainId: context.chainId,
        contractAddress: context.contractAddress,
        transactionHash: context.transactionHash,
        proposalId: context.proposalId,
        ipfsHash: context.ipfsHash,
        endpoint: context.endpoint
      });

      // Set fingerprint for deduplication
      scope.setFingerprint([
        context.errorType,
        error.name,
        error.message.substring(0, 50)
      ]);

      // Capture the exception
      Sentry.captureException(error);
    });
  }

  /**
   * Check if error type is rate limited
   */
  private isRateLimited(errorType: CriticalErrorType): boolean {
    const now = Date.now();
    const tracker = this.rateLimitTracker[errorType];

    if (!tracker) {
      return false;
    }

    // Reset window if expired
    if (now - tracker.windowStart > this.config.rateLimitWindow) {
      this.rateLimitTracker[errorType] = {
        count: 0,
        windowStart: now
      };
      return false;
    }

    return tracker.count >= this.config.maxAlertsPerWindow;
  }

  /**
   * Update rate limiting tracker
   */
  private updateRateLimit(errorType: CriticalErrorType): void {
    const now = Date.now();
    
    if (!this.rateLimitTracker[errorType]) {
      this.rateLimitTracker[errorType] = {
        count: 1,
        windowStart: now
      };
    } else {
      this.rateLimitTracker[errorType].count++;
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /**
   * Start queue processor for handling alerts
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.alertQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        const alert = this.alertQueue.shift();
        if (alert) {
          await this.processAlert(alert);
        }
      } catch (error) {
        logger.error('Failed to process alert from queue', {}, error as Error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  /**
   * Process individual alert through all configured channels
   */
  private async processAlert(alert: AlertPayload): Promise<void> {
    logger.info(`Processing critical alert: ${alert.id}`);

    const promises = this.config.channels.map(async (channel) => {
      try {
        await this.sendAlertToChannel(alert, channel);
        logger.info(`Alert ${alert.id} sent successfully to ${channel}`);
      } catch (error) {
        logger.error(`Failed to send alert ${alert.id} to ${channel}`, {}, error as Error);
        
        // Retry logic
        await this.retryAlert(alert, channel);
      }
    });

    await Promise.allSettled(promises);

    // Schedule escalation for critical alerts
    if (alert.severity === AlertSeverity.CRITICAL) {
      setTimeout(() => {
        this.escalateAlert(alert);
      }, this.config.escalationDelay);
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendAlertToChannel(alert: AlertPayload, channel: AlertChannel): Promise<void> {
    switch (channel) {
      case AlertChannel.SLACK:
        await this.sendSlackAlert(alert);
        break;
      case AlertChannel.DISCORD:
        await this.sendDiscordAlert(alert);
        break;
      case AlertChannel.EMAIL:
        await this.sendEmailAlert(alert);
        break;
      case AlertChannel.WEBHOOK:
        await this.sendWebhookAlert(alert);
        break;
      case AlertChannel.SENTRY:
        // Already handled in triggerCriticalAlert
        break;
      default:
        throw new Error(`Unknown alert channel: ${channel}`);
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: AlertPayload): Promise<void> {
    if (!this.config.slackWebhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const color = this.getSeverityColor(alert.severity);
    const payload = {
      text: `🚨 Critical Error Alert - ${alert.title}`,
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.description,
          fields: [
            {
              title: 'Error Type',
              value: alert.errorType,
              short: true
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Environment',
              value: alert.environment,
              short: true
            },
            {
              title: 'Alert ID',
              value: alert.id,
              short: true
            }
          ],
          footer: 'GNUS DAO Critical Alert System',
          ts: Math.floor(Date.parse(alert.timestamp) / 1000)
        }
      ]
    };

    const response = await fetch(this.config.slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Discord alert
   */
  private async sendDiscordAlert(alert: AlertPayload): Promise<void> {
    if (!this.config.discordWebhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const color = this.getSeverityColorHex(alert.severity);
    const payload = {
      embeds: [
        {
          title: alert.title,
          description: alert.description,
          color: parseInt(color.replace('#', ''), 16),
          fields: [
            {
              name: 'Error Type',
              value: alert.errorType,
              inline: true
            },
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Environment',
              value: alert.environment,
              inline: true
            }
          ],
          footer: {
            text: `GNUS DAO Critical Alert System | ID: ${alert.id}`
          },
          timestamp: alert.timestamp
        }
      ]
    };

    const response = await fetch(this.config.discordWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send email alert (placeholder - would integrate with email service)
   */
  private async sendEmailAlert(alert: AlertPayload): Promise<void> {
    // In production, this would integrate with an email service like SendGrid, SES, etc.
    logger.info(`Email alert would be sent to: ${this.config.emailRecipients?.join(', ')}`);
    logger.info(`Subject: ${alert.title}`);
    logger.info(`Body: ${alert.description}`);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: AlertPayload): Promise<void> {
    if (!this.config.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Alert-Source': 'gnus-dao-critical-alerts'
      },
      body: JSON.stringify(alert)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Retry failed alert
   */
  private async retryAlert(alert: AlertPayload, channel: AlertChannel): Promise<void> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        await this.sendAlertToChannel(alert, channel);
        logger.info(`Alert ${alert.id} retry ${attempt} successful for ${channel}`);
        return;
      } catch (error) {
        logger.warn(`Alert ${alert.id} retry ${attempt} failed for ${channel}`, { attempt, channel, error: (error as Error).message });
        
        if (attempt === this.config.retryAttempts) {
          logger.error(`Alert ${alert.id} failed all retries for ${channel}`);
        }
      }
    }
  }

  /**
   * Escalate critical alert
   */
  private async escalateAlert(alert: AlertPayload): Promise<void> {
    logger.warn(`Escalating critical alert: ${alert.id}`);
    
    // Create escalation alert
    const escalationAlert: AlertPayload = {
      ...alert,
      id: this.generateAlertId(),
      title: `🚨 ESCALATION: ${alert.title}`,
      description: `ESCALATED ALERT - Original alert ${alert.id} requires immediate attention.\n\n${alert.description}`,
      timestamp: new Date().toISOString()
    };

    // Send escalation through all channels
    await this.processAlert(escalationAlert);
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      [AlertSeverity.CRITICAL]: 'danger',
      [AlertSeverity.HIGH]: 'warning',
      [AlertSeverity.MEDIUM]: 'good',
      [AlertSeverity.LOW]: '#36a64f'
    };
    return colors[severity];
  }

  /**
   * Get severity color hex for Discord
   */
  private getSeverityColorHex(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      [AlertSeverity.CRITICAL]: '#FF0000',
      [AlertSeverity.HIGH]: '#FFA500',
      [AlertSeverity.MEDIUM]: '#FFFF00',
      [AlertSeverity.LOW]: '#00FF00'
    };
    return colors[severity];
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get alert queue status
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.alertQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Test alert system
   */
  async testAlert(): Promise<void> {
    const testError = new Error('Test critical error for alerting system validation');
    await this.triggerCriticalAlert(testError, CriticalErrorType.SYSTEM_FAILURE, {
      userId: 'test-user',
      additionalData: { test: true }
    });
  }
}

// Create singleton instance
export const criticalErrorAlerting = new CriticalErrorAlerting();

// Convenience functions for different error types
export const alertSecurityBreach = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.SECURITY_BREACH, context);

export const alertDataCorruption = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.DATA_CORRUPTION, context);

export const alertSystemFailure = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.SYSTEM_FAILURE, context);

export const alertWeb3Critical = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.WEB3_CRITICAL, context);

export const alertSmartContractError = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.SMART_CONTRACT_ERROR, context);

export const alertTreasuryError = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.TREASURY_ERROR, context);

export const alertGovernanceError = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.GOVERNANCE_ERROR, context);

export const alertAuthenticationFailure = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.AUTHENTICATION_FAILURE, context);

export const alertIPFSCritical = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.IPFS_CRITICAL, context);

export const alertAPICritical = (error: Error, context?: Partial<CriticalErrorContext>) =>
  criticalErrorAlerting.triggerCriticalAlert(error, CriticalErrorType.API_CRITICAL, context);