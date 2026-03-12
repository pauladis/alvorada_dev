import { Router, Request, Response } from 'express';
import { getOrCreateConversation, createInboundMessage, enqueueMessageProcessing } from '../services/messageService';
import { processMessage } from '../services/messageProcessor';
import { validateWebhookPayload } from '../validators';
import { logger } from '../services/logger';

const router = Router();

export interface TwilioWebhookPayload {
  MessageSid: string;
  From: string;
  Body: string;
}

/**
 * POST /webhooks/sms
 * Receives incoming SMS from Twilio
 * Must respond within 5 seconds
 */
router.post('/sms', async (req: Request, res: Response) => {
  try {
    const { MessageSid, From, Body } = req.body as TwilioWebhookPayload;

    // Validate webhook payload
    const validation = validateWebhookPayload(MessageSid, From, Body);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.errors 
      });
    }

    // Auto-generate MessageSid if not provided
    const finalMessageSid = MessageSid || `SM_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Return 200 OK immediately (within 5 seconds) to acknowledge webhook
    res.status(200).json({ status: 'received' });

    // Process asynchronously in background
    setImmediate(async () => {
      try {
        logger.logWebhookReceived(finalMessageSid, From);
        
        // Get or create conversation
        const conversation = await getOrCreateConversation(From);

        // Create inbound message record
        const message = await createInboundMessage(conversation.id, Body, finalMessageSid);

        // Enqueue for processing
        await enqueueMessageProcessing(message.id, conversation.id, From, Body, finalMessageSid);
        logger.logMessageEnqueued(message.id, conversation.id, 1);

        // Start processing
        await processMessage(message.id, conversation.id, From, Body, finalMessageSid, 0);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.logEvent('WEBHOOK_ERROR', { from: From, error: errorMsg }, 'error');
      }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.logEvent('WEBHOOK_PARSE_ERROR', { error: errorMsg }, 'error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
