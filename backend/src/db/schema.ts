import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  phoneNumber: text('phone_number').notNull().unique(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
  content: text('content').notNull(),
  status: text('status', { enum: ['received', 'processing', 'sent', 'failed'] }).notNull(),
  twilioMessageId: text('twilio_message_id').unique(),
  retryCount: integer('retry_count').default(0).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const messageStates = sqliteTable('message_states', {
  twilioMessageId: text('twilio_message_id').primaryKey(),
  processed: integer('processed').default(0).notNull(), // 0 = false, 1 = true
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').notNull(),
});

export const dlqMessages = sqliteTable('dlq_messages', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  failedAttempts: integer('failed_attempts').notNull(),
  lastError: text('last_error'),
  createdAt: integer('created_at').notNull(),
});

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  dlq: many(dlqMessages),
}));
