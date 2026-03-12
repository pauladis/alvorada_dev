import { Router, Request, Response } from 'express';
import { getOrCreateConversation, createInboundMessage, enqueueMessageProcessing } from '../services/messageService';
import { processMessage } from '../services/messageProcessor';
import { validateWebhookPayload } from '../validators';

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
        // Get or create conversation
        const conversation = await getOrCreateConversation(From);

        // Create inbound message record
        const message = await createInboundMessage(conversation.id, Body, finalMessageSid);

        // Enqueue for processing
        await enqueueMessageProcessing(message.id, conversation.id, From, Body, finalMessageSid);

        // Start processing
        await processMessage(message.id, conversation.id, From, Body, finalMessageSid, 0);
      } catch (error) {
        console.error('Error processing webhook:', error);
      }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
