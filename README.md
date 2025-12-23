# AI Support Agent - Live Chat Widget

A mini AI support agent for a live chat widget built for the Spur Founding Full-Stack Engineer take-home assignment.

## Live Demo

- **Frontend**: [https://ai-support-agent-steel.vercel.app](https://ai-support-agent-steel.vercel.app)
- **Backend**: [https://ai-support-agent-54el.onrender.com](https://ai-support-agent-54el.onrender.com)

## Features

- Real-time chat interface with AI-powered responses
- Conversation persistence across page reloads
- Auto-close mechanism for inactive conversations
- File attachment support (images, PDFs, text files)
- Markdown formatting in AI responses
- Mobile-responsive chat widget
- Conversation history and context awareness
- Domain-specific knowledge (ShopEase e-commerce store)

## Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **LLM**: Groq (Llama 3.3 70B)
- **File Storage**: Cloudinary
- **Validation**: Zod

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Markdown**: react-markdown

## Project Structure

```
ai-support-agent/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── config/            # Database, Cloudinary config
│   │   ├── controllers/       # Route handlers
│   │   ├── jobs/              # Background jobs (auto-close)
│   │   ├── middleware/        # Validation, error handling
│   │   ├── prompts/           # LLM system prompts
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic (chat, LLM, upload)
│   │   └── app.ts             # Express app entry point
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── constants/         # App configuration
│   │   ├── features/          # Feature modules (chat)
│   │   ├── lib/               # Utilities (axios, helpers)
│   │   ├── services/          # API service functions
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx            # Main app with widget
│   └── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use [Neon](https://neon.tech) for free)
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Cloudinary account (optional, for file uploads)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   GROQ_API_KEY=gsk_your_api_key
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```
   Backend runs at `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   Frontend runs at `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/message` | Send a message (with optional file) |
| GET | `/chat/history/:sessionId` | Get conversation history |
| GET | `/chat/status/:sessionId` | Get conversation status |
| PATCH | `/chat/read-all/:sessionId` | Mark all messages as read |
| PATCH | `/chat/reopen/:sessionId` | Reopen a closed conversation |
| POST | `/chat/close/:sessionId` | Manually close a conversation |
| GET | `/health` | Health check endpoint |

### Example Request

```bash
curl -X POST http://localhost:3000/chat/message \
  -F "message=What is your return policy?" \
  -F "sessionId=optional-uuid"
```

### Example Response

```json
{
  "success": true,
  "reply": "Our return policy allows returns within 30 days...",
  "sessionId": "uuid-here"
}
```

## Architecture Decisions

### 1. LLM Integration
- **Provider**: Groq with Llama 3.3 70B Versatile
- **Why**: Free tier, fast inference, good quality responses
- **Encapsulation**: `llm.service.ts` wraps all LLM calls with `generateReply(history, userMessage)` interface
- **Context**: Last 20 messages included for conversational context
- **Cost Control**: Max 1024 tokens per response, 8000 char message limit

### 2. Conversation Auto-Close
- Background job runs every 30 seconds
- After 2 minutes of unread AI messages → warning issued
- After 1 more minute → conversation auto-closes
- On reopen → generates summary of previous conversation

### 3. Domain Knowledge
Knowledge about "ShopEase" e-commerce store is hardcoded in the system prompt:
- Shipping policy (free over $50, 5-7 days standard)
- Return policy (30 days, 90 days for defects)
- Payment methods (cards, PayPal, Apple/Google Pay)
- Support hours (Mon-Fri 9-8, Sat 10-6)
- Warranty information

### 4. Guardrails
- Off-topic questions are politely redirected
- LLM errors return friendly messages
- Rate limits handled gracefully
- Input validation prevents empty/oversized messages

### 5. Data Model

```
Conversation
├── id (UUID)
├── status (open/closed)
├── lastActivityAt
├── closedAt
└── messages[]

Message
├── id (UUID)
├── conversationId (FK)
├── sender (user/ai)
├── text
├── isRead
├── attachments[]
└── createdAt
```

## Trade-offs & If I Had More Time...

### Current Trade-offs
1. **Polling vs WebSockets**: Using 10-second polling instead of WebSockets for simplicity. Works well for this use case but not ideal for high-frequency updates.

2. **No Redis caching**: All data fetched from PostgreSQL. Would add Redis for session caching in production.

3. **Simple file storage**: Using Cloudinary URLs directly. Would implement signed URLs with expiration for security.

### Future Improvements
- [ ] WebSocket support for real-time updates
- [ ] Redis caching for sessions and rate limiting
- [ ] Streaming responses (SSE) for better UX
- [ ] Multi-language support
- [ ] Analytics dashboard
- [ ] Admin panel for conversation management
- [ ] Rate limiting per IP/session
- [ ] Message search functionality
- [ ] Export conversation as PDF

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GROQ_API_KEY` | Yes | Groq API key |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `MAX_MESSAGE_LENGTH` | No | Max message chars (default: 8000) |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL |

## License

MIT
