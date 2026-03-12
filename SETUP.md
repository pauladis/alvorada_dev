# SMS System - Setup & Running Guide

## Quick Start with Docker

The simplest way to run the entire system:

```bash
docker-compose up --build
```

This will:
- Build and start the backend (port 3000)
- Build and start the frontend (port 3001)
- Automatically initialize the database
- Wait for health checks before starting frontend

Once running:
- **Backend API**: http://localhost:3000/api
- **Admin Frontend**: http://localhost:3001
- **Health Check**: http://localhost:3000/api/health

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend will start on port 3000 and automatically initialize the SQLite database.

#### Available Commands
```bash
npm run dev              # Start in development mode (ts-node)
npm run build           # Build TypeScript to JavaScript
npm start               # Run compiled JavaScript
npm test                # Run tests once
npm test:watch         # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

### Frontend

In a new terminal:

```bash
cd frontend
npm install
npm start
```

The frontend will start on port 3001 and automatically open in your browser.

#### Available Commands
```bash
npm start       # Start development server
npm test        # Run tests
npm test:watch  # Run tests in watch mode
npm run build   # Build for production
```

---

## Testing

### Backend Tests
```bash
cd backend
npm test

# With coverage report
npm run test:coverage

# Watch mode for development
npm test:watch
```

**Test Coverage Target**: 90%+  
**Current Coverage**: Check coverage report after running tests

**Test Suites**:
- Webhook handler (receives SMS, validates, queues)
- Message processing (3-15s delay, sends response)
- Idempotency (prevents duplicate processing)
- Admin API (list/detail endpoints)
- DLQ (dead letter queue functionality)

### Frontend Tests
```bash
cd frontend
npm test

# Watch mode
npm test:watch
```

**Test Areas**:
- Component rendering
- Conversation list and detail views
- DLQ view
- Navigation between views
- Empty states

---

## API Endpoints

### Webhook

**POST** `/webhooks/sms`
- Receives SMS from Twilio
- Returns immediately (< 5 seconds)
- Processes asynchronously

```bash
curl -X POST http://localhost:3000/webhooks/sms \
  -H "Content-Type: application/json" \
  -d '{
    "MessageSid": "SM123456789",
    "From": "+1234567890",
    "Body": "Hello world"
  }'
```

### Admin API

**GET** `/api/conversations`
- List all conversations
- Returns: Array of conversations with phone numbers and timestamps

**GET** `/api/conversations/:id`
- Get a single conversation
- Returns: Conversation details

**GET** `/api/conversations/:id/messages`
- Get all messages in a conversation
- Returns: Array of messages with status, direction, content

**GET** `/api/messages/:id`
- Get a single message
- Returns: Message details

**GET** `/api/dlq`
- Get all dead letter queue messages
- Returns: Array of failed messages with retry info

**GET** `/api/dlq/:id`
- Get a single DLQ message
- Returns: DLQ message details

**GET** `/api/health`
- Health check endpoint
- Returns: `{"status": "ok"}`

---

## Database

### Location
- **Local**: `./backend/data/sms.db` (created automatically)
- **Docker**: `/app/data/sms.db` (persistent volume)

### Tables

**conversations**
- Stores user phone numbers and conversation metadata
- One per unique phone number

**messages**
- Stores inbound and outbound SMS messages
- Tracks processing status (received, processing, sent, failed)
- Includes Twilio message IDs for idempotency

**messageStates**
- Tracks which messages have been processed
- Prevents duplicate processing if Twilio redelivers webhook

**dlqMessages**
- Dead letter queue for failed messages
- Stores failed attempts and error details

---

## System Flow Example

1. **Inbound SMS arrives**
   ```
   Twilio → POST /webhooks/sms
   ```

2. **Webhook handler**
   ```
   - Validate request
   - Create/get conversation
   - Persist inbound message (status: "received")
   - Return 200 OK immediately
   - Queue for processing (async)
   ```

3. **Background processing**
   ```
   - Check if already processed (idempotency)
   - Update status to "processing"
   - Wait 3-15 seconds (simulated work)
   - Generate response: "Message received and processed: [content]"
   - Send outbound SMS via Twilio mock
   - Create outbound message record (status: "sent")
   - Mark as processed
   ```

4. **Admin views**
   ```
   - Conversations list: All phone numbers with recent activity
   - Conversation detail: All inbound/outbound messages
   - DLQ view: Failed messages for manual review
   ```

---

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
NODE_ENV=development
DATABASE_PATH=./data/sms.db
PORT=3000
TWILIO_ACCOUNT_SID=mock_account_sid
TWILIO_AUTH_TOKEN=mock_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Note**: In Docker, these are set in `docker-compose.yml`

### Frontend Configuration

Frontend automatically connects to `http://localhost:3000/api` in development.

For production, set:
```env
REACT_APP_API_URL=https://api.example.com/api
```

---

## Troubleshooting

### Backend won't start
```bash
# Clear node_modules and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database errors
```bash
# Delete old database and restart (creates new one)
rm backend/data/sms.db
npm run dev
```

### Tests failing
```bash
# Ensure test database doesn't exist
rm -rf backend/test_data/

# Run tests
npm test
```

### Frontend can't connect to backend
- Ensure backend is running on port 3000
- Check CORS is not being blocked
- Verify `http://localhost:3000/api/health` returns `{"status":"ok"}`

---

## Performance Tips

### Processing Speed
- Messages are processed in series (one at a time)
- Simulated processing delay: 3-15 seconds
- For testing, you can modify the delay in `src/services/messageProcessor.ts`

### Database Performance
- SQLite is optimized for single-process read-heavy workloads
- Current indexes support rapid lookups by conversation and message ID
- For production, migrate to PostgreSQL

### Frontend Performance
- React frontend is minimal with no heavy dependencies
- All API calls use axios with error handling
- No real-time updates (polling-based)

---

## Production Deployment

See `ARCHITECTURE.md` section "Deployment & Production Considerations" for:
- Switching from in-memory queue to Redis
- Migrating from SQLite to PostgreSQL
- Adding monitoring and logging
- Security hardening
- Rate limiting and authentication

---

## File Structure

```
alvorada_dev/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.ts         # Database setup
│   │   │   └── schema.ts        # Drizzle ORM schema
│   │   ├── services/
│   │   │   ├── messageProcessor.ts  # Core processing logic
│   │   │   ├── messageService.ts    # Business logic
│   │   │   ├── queue.ts            # Message queue
│   │   │   └── twilio.ts           # Twilio mock
│   │   ├── routes/
│   │   │   ├── webhooks.ts     # Webhook handler
│   │   │   └── api.ts          # Admin API endpoints
│   │   ├── test/
│   │   │   └── setup.ts        # Jest setup
│   │   ├── __tests__/
│   │   │   └── integration.test.ts  # Comprehensive tests
│   │   └── index.ts            # Express app entry point
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main React component
│   │   ├── App.css             # Styling
│   │   ├── index.tsx           # React entry point
│   │   └── __tests__/
│   │       └── App.test.tsx    # Frontend tests
│   ├── index.html
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml
├── ARCHITECTURE.md
├── SETUP.md
└── README.md
```

---

## Next Steps

1. Start the system: `docker-compose up --build`
2. Open http://localhost:3001 in your browser
3. Send a test SMS via: `curl -X POST http://localhost:3000/webhooks/sms ...`
4. View conversations and messages in the admin dashboard
5. Check `ARCHITECTURE.md` for design details and production roadmap

---

## Support & Questions

Refer to:
- `ARCHITECTURE.md` - System design and decisions
- Test files - Usage examples
- Code comments - Implementation details

Enjoy!
