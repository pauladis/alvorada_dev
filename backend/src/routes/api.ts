import { Router, Request, Response } from 'express';
import { getConversations, getConversationById, getConversationMessages, getMessageById } from '../services/messageService';
import { db } from '../db';
import { dlqMessages, messages as messagesTable } from '../db/schema';

const router = Router();

/**
 * GET /api/conversations
 * List all conversations
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const conversations = await getConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/conversations/:id
 * Get a single conversation
 */
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await getConversationById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Get all messages for a conversation
 */
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const messages = await getConversationMessages(req.params.id);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/messages/:id
 * Get a single message
 */
router.get('/messages/:id', async (req: Request, res: Response) => {
  try {
    const message = await getMessageById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dlq
 * Get all messages in the dead letter queue
 */
router.get('/dlq', async (req: Request, res: Response) => {
  try {
    const dlq = db.select().from(dlqMessages).all();
    res.json(dlq);
  } catch (error) {
    console.error('Error fetching DLQ:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dlq/:id
 * Get a single DLQ message
 */
router.get('/dlq/:id', async (req: Request, res: Response) => {
  try {
    const dlqMessage = db.select().from(dlqMessages).all().find(m => m.id === req.params.id);
    if (!dlqMessage) {
      return res.status(404).json({ error: 'DLQ message not found' });
    }
    res.json(dlqMessage);
  } catch (error) {
    console.error('Error fetching DLQ message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

export default router;
