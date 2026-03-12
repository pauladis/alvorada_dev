import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { conversations, messages } from '../db/schema';
import { eq } from 'drizzle-orm';
import { messageQueue } from './queue';

export async function getOrCreateConversation(phoneNumber: string) {
  const existing = db.select().from(conversations).where(eq(conversations.phoneNumber, phoneNumber)).all()[0];

  if (existing) {
    return existing;
  }

  const id = uuid();
  const now = Date.now();

  await db
    .insert(conversations)
    .values({
      id,
      phoneNumber,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id, phoneNumber, createdAt: now, updatedAt: now };
}

export async function createInboundMessage(
  conversationId: string,
  content: string,
  twilioMessageId: string
) {
  const id = uuid();
  const now = Date.now();

  await db
    .insert(messages)
    .values({
      id,
      conversationId,
      direction: 'inbound',
      content,
      status: 'received',
      twilioMessageId,
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id, conversationId, direction: 'inbound', content, status: 'received', twilioMessageId, createdAt: now, updatedAt: now };
}

export async function enqueueMessageProcessing(
  messageId: string,
  conversationId: string,
  phoneNumber: string,
  content: string,
  twilioMessageId: string
) {
  await messageQueue.enqueue({
    messageId,
    conversationId,
    phoneNumber,
    content,
    twilioMessageId,
    retryCount: 0,
  });
}

export async function getConversations() {
  return db.select().from(conversations).all();
}

export async function getConversationById(id: string) {
  return db.select().from(conversations).where(eq(conversations.id, id)).all()[0];
}

export async function getConversationMessages(conversationId: string) {
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).all();
}

export async function getMessageById(id: string) {
  return db.select().from(messages).where(eq(messages.id, id)).all()[0];
}
