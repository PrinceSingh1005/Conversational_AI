# Astra - Conversational AI System

A persona-driven conversational system with memory and emotional intelligence. This system remembers users across sessions, adapts tone emotionally, never breaks character, and never hallucinates fake memories.

## 🚀 Features

- **Persona-driven conversations**: Maintains consistent identity and personality
- **Memory system**: Short-term, long-term, and episodic memory capabilities
- **Emotional intelligence**: Adapts tone based on emotional context
- **Anti-hallucination**: Strict memory write rules prevent false memories
- **Identity consistency**: Never breaks character under pressure
- **Scalable architecture**: Designed to scale cheaply and efficiently

## 🛠 Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: React with Vite, Tailwind CSS, Framer Motion
- **Database**: PostgreSQL for long-term memory
- **Cache**: Redis for short-term memory
- **LLM**: Google Gemini (Flash for cost efficiency)
- **Deployment**: Docker, Docker Compose

## 📋 Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Google Gemini API Key

## 🔧 Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd conversational-ai
```

### 2. Install Dependencies
```bash
# Backend
npm install

# Frontend
cd frontend
npm install
```

### 3. Environment Configuration

Copy the example environment file and add your Gemini API key:

```bash
cp .env.example .env
```

Edit `.env` and set your Gemini API key:
```
LLM_API_KEY=your_gemini_api_key_here
```

### 4. Database Schema

The PostgreSQL database schema is located at `src/memory/schema.sql`. It will be automatically applied when the container starts.

### 5. Running with Docker Compose (Recommended)

```bash
docker-compose up -d
```

The services will be available at:
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 6. Running Locally (Development)

Start Redis and PostgreSQL separately, then:

```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Start frontend (from frontend directory)
cd frontend
npm run dev
```

## 🌐 API Endpoints

### POST `/api/conversation`
Process a conversation with the AI

Request body:
```json
{
  "userId": "unique-user-id",
  "message": "Hello, how are you?",
  "sessionId": "optional-session-id"
}
```

Response:
```json
{
  "success": true,
  "response": {
    "text": "Response from AI",
    "emotionalContext": "neutral",
    "timestamp": "2024-01-10T10:30:00.000Z"
  },
  "memory": {
    "shortTerm": [...],
    "longTerm": {...}
  },
  "sessionId": "session-id"
}
```

### GET `/health`
Health check endpoint

### GET `/`
API information endpoint

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Or run tests in watch mode:

```bash
npm run test:watch
```

## 🚢 Deployment

### Docker Compose
The provided `docker-compose.yml` file sets up the complete infrastructure:
- Backend service
- PostgreSQL database
- Redis cache

### Environment Variables
Ensure all required environment variables are set in production:
- `LLM_API_KEY`: Your Gemini API key
- `NODE_ENV`: Set to `production`
- Database and Redis connection details

## 🏗 Architecture

```
┌───────────────┬───────────────────┬────────────────────┐
│ Persona Engine│ Memory System      │ LLM Execution Layer│
└───────────────┴───────────────────┴────────────────────┘
        ↓
Conversation Orchestrator (The Brain)
        ↓
┌─────────────────────────────────────────────────────────┐
│                   Persistence Layer                     │
│                PostgreSQL + Redis + Vector Store        │
└─────────────────────────────────────────────────────────┘
```

### Key Components:

1. **Persona Engine**: Enforces character consistency and identity
2. **Memory System**: Manages short-term, long-term, and episodic memory
3. **LLM Execution Layer**: Handles communication with Gemini API
4. **Conversation Orchestrator**: The central "brain" coordinating all components
5. **Persistence Layer**: PostgreSQL for structured data, Redis for session caching

## 🎯 Core Principles

- **Reliability**: Built with extensive error handling and validation
- **Persona Consistency**: Identity validation prevents character breaks
- **Correctness**: Memory write rules prevent hallucinations
- **Scalability**: Stateless design with externalized state in databases

## 📊 Testing Matrix

The system includes comprehensive tests covering:
- Long-term recall accuracy
- Tone adaptation
- Identity consistency under pressure
- Hallucination prevention
- Repetition stability

## 💡 Development

For development, run the backend and frontend separately:

```bash
# Backend
npm run dev

# Frontend (in separate terminal)
cd frontend
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see the LICENSE file for details.

---

Made with ❤️ for better conversational AI experiences