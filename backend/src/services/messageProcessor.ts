import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { messages, dlqMessages, messageStates } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { twilioService } from './twilio';
import { generateSmartResponse, analyzeSentiment } from './responseGenerator';
import { logger } from './logger';

const MAX_RETRIES = 1;

export async function processMessage(
  messageId: string,
  conversationId: string,
  phoneNumber: string,
  content: string,
  twilioMessageId: string,
  retryCount: number = 0
): Promise<void> {
  const startTime = Date.now();

  try {
    // Check if already processed (idempotency)
    const existingState = db.select().from(messageStates).where(eq(messageStates.twilioMessageId, twilioMessageId)).all()[0];
    if (existingState && existingState.processed) {
      logger.logIdempotencySkip(twilioMessageId, messageId);
      return;
    }

    // Analyze sentiment
    const sentiment = analyzeSentiment(content);

    // Update message status to processing
    await db
      .update(messages)
      .set({ status: 'processing', updatedAt: Date.now() })
      .where(eq(messages.id, messageId))
      .run();

    // Simulate processing delay (3-15 seconds)
    const delay = Math.random() * 12000 + 3000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Generate smart response
    const smartResponse = generateSmartResponse(content);
    const responseContent = smartResponse.content;

    // Send outbound SMS
    const twilioResult = await twilioService.sendSMS({
      to: phoneNumber,
      body: responseContent,
    });

    logger.logSMSSent(messageId, phoneNumber, responseContent.length, twilioResult.sid);

    // Create outbound message record
    const outboundMessageId = uuid();
    await db
      .insert(messages)
      .values({
        id: outboundMessageId,
        conversationId,
        direction: 'outbound',
        content: responseContent,
        status: 'sent',
        twilioMessageId: twilioResult.sid,
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .run();

    // Mark inbound message as sent
    await db
      .update(messages)
      .set({ status: 'sent', updatedAt: Date.now() })
      .where(eq(messages.id, messageId))
      .run();

    // Mark as processed for idempotency
    await db
      .insert(messageStates)
      .values({
        twilioMessageId,
        processed: 1,
        messageId,
        createdAt: Date.now(),
      })
      .run();

    const processingTime = Date.now() - startTime;
    logger.logProcessingMetrics({
      messageId,
      conversationId,
      processingTime,
      status: 'success',
      category: smartResponse.category,
      sentiment,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const processingTime = Date.now() - startTime;

    if (retryCount < MAX_RETRIES) {
      // Retry
      logger.logRetry(messageId, conversationId, retryCount + 1, MAX_RETRIES, errorMessage);
      
      await db
        .update(messages)
        .set({ retryCount: retryCount + 1, updatedAt: Date.now() })
        .where(eq(messages.id, messageId))
        .run();

      // Re-queue for processing
      await processMessage(messageId, conversationId, phoneNumber, content, twilioMessageId, retryCount + 1);
    } else {
      // Move to DLQ
      logger.logDLQMove(messageId, conversationId, 'Max retries exceeded', retryCount + 1, errorMessage);
      
      logger.logProcessingMetrics({
        messageId,
        conversationId,
        processingTime,
        status: 'dlq',
        retryCount: retryCount + 1,
        error: errorMessage,
      });

      await db
        .update(messages)
        .set({ status: 'failed', updatedAt: Date.now() })
        .where(eq(messages.id, messageId))
        .run();

      await db
        .insert(dlqMessages)
        .values({
          id: uuid(),
          messageId,
          reason: 'Max retries exceeded',
          failedAttempts: retryCount + 1,
          lastError: errorMessage,
          createdAt: Date.now(),
        })
        .run();
    }
  }
}
