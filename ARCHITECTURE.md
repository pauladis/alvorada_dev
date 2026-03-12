# Conversational SMS System - Architecture & Design Document

## Executive Summary

This document outlines the architecture of a production-aware conversational SMS system that handles the Twilio 5-second webhook timeout constraint while performing 3-15 second message processing. The system ensures durability, prevents duplicate processing, and provides an admin interface for conversation history.

---

## System Architecture

### High-Level Overview

```
┌─────────────┐
│   Twilio    │
│  (Webhook)  │
└──────┬──────┘
       │
       │ POST /webhooks/sms
       │ (< 5 seconds)
       ▼
┌──────────────────────────┐
│  Webhook Handler         │
│  - Validate request      │
│  - Persist to DB         │
│  - Return 200 OK         │
│  - Queue for processing  │
└──────────────┬───────────┘
               │
               │ (Immediate return)
               │
       ┌───────▼──────────┐
       │ Message Queue    │
       │ (In-memory)      │
       └───────┬──────────┘
               │
               │ Background Processing
               │
       ┌───────▼──────────────┐
       │ Message Processor     │
       │ - Check idempotency   │
       │ - Simulate work (3-15s)
       │ - Generate response   │
       │ - Send SMS via Twilio │
       │ - Update status       │
       └───────┬──────────────┘
               │
       ┌───────▼──────────┐
       │   SQLite DB      │
       │ - Conversations  │
       │ - Messages       │
       │ - Message States │
       │ - DLQ            │
       └──────────────────┘
               ▲
               │
       ┌───────┴──────────┐
       │  Admin Frontend  │
       │  (React)         │
       └──────────────────┘
```

### Key Design Decisions

#### 1. **Webhook Timeout Handling (5-second constraint)**

**Problem**: Twilio webhook times out after 5 seconds, but message processing takes 3-15 seconds.

**Solution**: Asynchronous processing with immediate acknowledgment
- Webhook handler immediately validates and persists the message
- Returns 200 OK within milliseconds
- Queues message for background processing using `setImmediate()`
- Processing happens asynchronously without blocking the HTTP response

**Trade-off**: Messages are processed slightly out-of-order if multiple arrive concurrently, but this is acceptable for SMS conversations.

#### 2. **Idempotency & Duplicate Prevention**

**Problem**: Twilio may deliver the same webhook multiple times.

**Solution**: Twilio message ID (MessageSid) as idempotency key
- Each inbound SMS gets a unique `MessageSid` from Twilio
- `messageStates` table tracks processed messages by `twilioMessageId`
- Before processing, check if `MessageSid` was already processed
- If already processed, skip (prevents duplicate responses)

**Trade-off**: Uses an extra table for tracking; simple and effective.

#### 3. **Message Durability**

**Problem**: System must not lose messages, even if processing fails.

**Solution**: Database-first approach
- All inbound messages persisted immediately to `messages` table
- Message status state machine: `received → processing → sent/failed`
- Transactions ensure consistency

**Trade-off**: Slightly more database writes, but guarantees durability.

#### 4. **Retry & Dead Letter Queue (DLQ)**

**Problem**: Processing may fail due to network issues, rate limits, etc.

**Solution**: One automatic retry, then DLQ
- If processing fails, increment `retryCount`
- Max 1 retry attempt
- If still fails, move to `dlqMessages` table
- Admin can review DLQ entries

**Trade-off**: One retry may not be enough for transient failures, but keeps complexity low. In production, use exponential backoff.

#### 5. **Message Processing Logic**

**Problem**: Need to simulate real processing (3-15 seconds) and generate responses.

**Solution**: Simple echo-based response
- Simulate delay with `Math.random() * 12000 + 3000` ms
- Response format: `"Message received and processed: \"[original message]\""`
- Create outbound message record with status `sent`

---

## Data Model

### Tables

#### `conversations`
- `id` (TEXT, PK): UUID
- `phoneNumber` (TEXT, UNIQUE): E.164 format phone number
- `createdAt` (INTEGER): Unix timestamp
- `updatedAt` (INTEGER): Unix timestamp

#### `messages`
- `id` (TEXT, PK): UUID
- `conversationId` (TEXT, FK): References conversations.id
- `direction` (TEXT): 'inbound' or 'outbound'
- `content` (TEXT): SMS message body
- `status` (TEXT): 'received' | 'processing' | 'sent' | 'failed'
- `twilioMessageId` (TEXT, UNIQUE): Twilio message SID
- `retryCount` (INTEGER): Number of processing attempts
- `createdAt` (INTEGER): Unix timestamp
- `updatedAt` (INTEGER): Unix timestamp

#### `messageStates`
- `twilioMessageId` (TEXT, PK): Twilio message SID
- `processed` (INTEGER): 1 if processed, 0 if not (for idempotency)
- `messageId` (TEXT, FK): References messages.id
- `createdAt` (INTEGER): Unix timestamp

#### `dlqMessages`
- `id` (TEXT, PK): UUID
- `messageId` (TEXT, FK): References messages.id
- `reason` (TEXT): Why message failed
- `failedAttempts` (INTEGER): Number of failed attempts
- `lastError` (TEXT): Last error message
- `createdAt` (INTEGER): Unix timestamp

### Indexes
- `idx_messages_conversation_id`: Optimize conversation message queries
- `idx_messages_twilio_id`: Optimize idempotency checks
- `idx_messages_status`: Optimize status-based queries
- `idx_message_states_message_id`: Optimize state lookups
- `idx_dlq_messages_message_id`: Optimize DLQ lookups

---

## API Design

### Webhook Endpoints

#### `POST /webhooks/sms`
Receives incoming SMS from Twilio.

**Request Body**:
```json
{
  "MessageSid": "SM...",
  "From": "+1234567890",
  "Body": "User message"
}
```

**Response**: 
```json
{"status": "received"}
```

**Status Code**: 200 OK (< 5 seconds)

### Admin API Endpoints

#### `GET /api/conversations`
List all conversations.

#### `GET /api/conversations/:id`
Get a single conversation.

#### `GET /api/conversations/:id/messages`
Get all messages in a conversation, ordered by creation time.

#### `GET /api/messages/:id`
Get a single message.

#### `GET /api/dlq`
List all messages in the Dead Letter Queue.

#### `GET /api/dlq/:id`
Get a single DLQ message.

#### `GET /api/health`
Health check endpoint.

---

## Testing Strategy

### Backend Tests (Jest)

**Coverage Target**: 90%+

**Test Areas**:
1. **Webhook Handler**
   - Returns 200 OK within 5 seconds
   - Validates required fields
   - Creates conversation and message
   - Handles duplicate deliveries (idempotency)

2. **Message Processing**
   - Processes messages and sends responses
   - Marks messages as processed for idempotency
   - Retries on failure
   - Moves to DLQ after max retries

3. **Admin API**
   - Conversation list and detail
   - Message queries
   - DLQ viewing
   - 404 handling

4. **Database**
   - Conversation isolation
   - Message ordering
   - State consistency

### Frontend Tests (React Testing Library)

**Coverage Target**: Basic scenario coverage

**Test Areas**:
- Component rendering
- Fetch and display conversations
- Navigation between views
- DLQ display
- Empty states

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite with better-sqlite3
- **ORM**: Drizzle ORM
- **Queue**: In-memory (Event emitter)
- **Testing**: Jest + Supertest

### Frontend
- **Library**: React 18
- **Language**: TypeScript
- **HTTP Client**: Axios
- **Testing**: React Testing Library

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Database**: SQLite (file-based)

---

## Deployment & Production Considerations

### Current Limitations (MVP)

1. **In-memory queue**: Messages lost if process crashes
   - **Fix**: Use Redis Bull for persistent queue

2. **Single-process**: No horizontal scaling
   - **Fix**: Use Redis queue + multiple backend instances

3. **SQLite**: Limited concurrent writes
   - **Fix**: Migrate to PostgreSQL with connection pooling

4. **No monitoring**: No visibility into system health
   - **Fix**: Add structured logging + monitoring (ELK, Datadog, etc.)

5. **No authentication**: Admin interface accessible to anyone
   - **Fix**: Add JWT or OAuth2 authentication

6. **No rate limiting**: No protection against abuse
   - **Fix**: Add rate limiting on webhook endpoint

### Production Changes

#### Queue
```typescript
// MVP: In-memory queue
// Production: Redis + Bull
import Bull from 'bull';
const messageQueue = new Bull('sms-messages', {
  redis: { host: process.env.REDIS_HOST, port: 6379 }
});
```

#### Database
```typescript
// MVP: SQLite
// Production: PostgreSQL
import { migrate } from 'drizzle-orm/postgres-js/migrator';
```

#### Monitoring
```typescript
// Add structured logging
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Add metrics
import promClient from 'prom-client';
const processingDuration = new promClient.Histogram(...);
```

#### Webhook Security
```typescript
// Verify Twilio request signature
import twilio from 'twilio';
const twilioAuth = twilio.validateRequest(token, url, params);
```

---

## Trade-offs Made

| Decision | Pro | Con | Alternative |
|----------|-----|-----|-------------|
| In-memory queue | Simple, fast | Data loss on crash | Redis queue |
| SQLite | No setup, portable | Limited concurrency | PostgreSQL |
| Immediate webhook return | No timeout | Processing happens async | Queue before response |
| One retry | Simple logic | Transient failures may not resolve | Exponential backoff |
| Message ID as idempotency key | Unique, from Twilio | Requires DB lookup | Timestamp + phone (less reliable) |
| React frontend | Modern, type-safe | Overkill for simple UI | Plain HTML/JS |
| Drizzle ORM | Type-safe queries | Less flexible | Raw SQL |

---

## Running the System

### Development (Local)
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm start
```

### Docker
```bash
docker-compose up --build
# Backend: http://localhost:3000
# Frontend: http://localhost:3001
```

### Testing
```bash
# Backend tests
cd backend
npm test        # Run once
npm test:watch  # Watch mode
npm run test:coverage  # Coverage report

# Frontend tests
cd frontend
npm test
```

---

## Monitoring & Logging

### Backend Logging
```
[Twilio Mock] Sending SMS to +11234567890: Message received and processed: "Hello"
Message 550e8400-e29b-41d4-a716-446655440000 processed successfully
Message 550e8400-e29b-41d4-a716-446655440001 failed, moving to DLQ
```

### Metrics to Track (Production)
- Queue depth
- Processing latency (p50, p95, p99)
- Failure rate
- DLQ size
- Webhook delivery latency
- Database connection pool utilization

---

## Security Considerations

### Current (MVP)
- No webhook signature verification
- No authentication on admin API
- No rate limiting
- No HTTPS (development only)

### Production
- Verify Twilio request signatures
- JWT/OAuth2 on admin endpoints
- Rate limiting on webhook (10 req/s per IP)
- HTTPS only
- Database encryption
- Secrets in environment variables (not .env files)
- API key rotation strategy

---

## Scalability Roadmap

### Phase 1 (Current)
- Single backend instance
- SQLite database
- In-memory queue

### Phase 2
- Redis queue for durability
- PostgreSQL for scalability
- Horizontal backend scaling (load balanced)

### Phase 3
- Message routing (intelligent responses, not just echo)
- Real-time WebSocket updates for admin dashboard
- Conversation search and filtering
- Bulk message sending

### Phase 4
- Multi-tenant support
- Analytics dashboard
- SLA tracking
- A/B testing framework

---

## Conclusion

This system prioritizes clarity and simplicity while maintaining architectural awareness for production scaling. The key innovation is the **asynchronous webhook pattern** that elegantly solves the 5-second timeout constraint without complex infrastructure.

The idempotency design prevents duplicate processing, and the DLQ ensures visibility into failures. With the outlined production changes, this system can scale to handle millions of SMS messages daily.

---

**Author**: Raul Quinzani  
**Date**: 2026-03-11  
**Status**: MVP Complete
