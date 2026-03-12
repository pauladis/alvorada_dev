/**
 * Structured logging service
 * Logs events in JSON format for monitoring and debugging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  type: string;
  messageId?: string;
  conversationId?: string;
  [key: string]: any;
}

export interface ProcessingMetrics {
  messageId: string;
  conversationId: string;
  processingTime: number; // milliseconds
  status: 'success' | 'retry' | 'dlq' | 'skipped';
  category?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  retryCount?: number;
  error?: string;
}

export interface WebhookMetrics {
  twilioMessageId: string;
  from: string;
  contentLength: number;
  validationTime: number; // milliseconds
  isValid: boolean;
  errors?: string[];
}

class StructuredLogger {
  /**
   * Log message processing metrics
   */
  logProcessingMetrics(metrics: ProcessingMetrics): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: metrics.status === 'dlq' ? 'error' : metrics.status === 'retry' ? 'warn' : 'info',
      type: 'MESSAGE_PROCESSED',
      messageId: metrics.messageId,
      conversationId: metrics.conversationId,
      processingTime: metrics.processingTime,
      status: metrics.status,
      category: metrics.category,
      sentiment: metrics.sentiment,
      retryCount: metrics.retryCount,
      error: metrics.error,
    };
    this.output(entry);
  }

  /**
   * Log webhook reception
   */
  logWebhookReceived(twilioMessageId: string, from: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'WEBHOOK_RECEIVED',
      twilioMessageId,
      from,
    };
    this.output(entry);
  }

  /**
   * Log webhook validation
   */
  logWebhookValidation(metrics: WebhookMetrics): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: metrics.isValid ? 'info' : 'warn',
      type: 'WEBHOOK_VALIDATED',
      twilioMessageId: metrics.twilioMessageId,
      from: metrics.from,
      contentLength: metrics.contentLength,
      validationTime: metrics.validationTime,
      isValid: metrics.isValid,
      errors: metrics.errors,
    };
    this.output(entry);
  }

  /**
   * Log message enqueued
   */
  logMessageEnqueued(messageId: string, conversationId: string, queueSize: number): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'MESSAGE_ENQUEUED',
      messageId,
      conversationId,
      queueSize,
    };
    this.output(entry);
  }

  /**
   * Log retry attempt
   */
  logRetry(messageId: string, conversationId: string, attempt: number, maxRetries: number, error: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      type: 'MESSAGE_RETRY',
      messageId,
      conversationId,
      attempt,
      maxRetries,
      error,
    };
    this.output(entry);
  }

  /**
   * Log DLQ move
   */
  logDLQMove(messageId: string, conversationId: string, reason: string, attempts: number, error: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'MESSAGE_TO_DLQ',
      messageId,
      conversationId,
      reason,
      attempts,
      error,
    };
    this.output(entry);
  }

  /**
   * Log idempotency skip
   */
  logIdempotencySkip(twilioMessageId: string, messageId: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'IDEMPOTENCY_SKIP',
      twilioMessageId,
      messageId,
    };
    this.output(entry);
  }

  /**
   * Log SMS sent
   */
  logSMSSent(messageId: string, to: string, contentLength: number, twilioSid: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'SMS_SENT',
      messageId,
      to,
      contentLength,
      twilioSid,
    };
    this.output(entry);
  }

  /**
   * Log custom event
   */
  logEvent(type: string, data: Record<string, any>, level: LogLevel = 'info'): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      type,
      ...data,
    };
    this.output(entry);
  }

  /**
   * Output log entry as JSON
   */
  private output(entry: LogEntry): void {
    // In development, pretty print; in production, single line JSON
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      console.log(`[${entry.timestamp}] ${entry.level.toUpperCase()} - ${entry.type}`);
      console.log(JSON.stringify(entry, null, 2));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log performance summary (call periodically)
   */
  logPerformanceSummary(stats: {
    totalProcessed: number;
    totalFailed: number;
    averageProcessingTime: number;
    queueSize: number;
    dlqSize: number;
  }): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'PERFORMANCE_SUMMARY',
      ...stats,
    };
    this.output(entry);
  }
}

export const logger = new StructuredLogger();
