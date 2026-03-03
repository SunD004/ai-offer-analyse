# CLAUDE.md — AI Offer Analyse

## Project Overview
RAG chatbot platform with document management. Users upload documents, create chatbots linked to those documents, and chat with them. Supports web search as fallback via Perplexity.

## Tech Stack
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **DB**: PostgreSQL (Supabase) + pgvector via Prisma 7 + @prisma/adapter-pg
- **AI / LLM**: Mistral Large (chat), Mistral Embed (vectors), Mistral OCR
- **Web search**: OpenRouter → perplexity/sonar
- **AI SDK**: `ai@6` (Vercel AI SDK v6) + `@ai-sdk/react@3` + `@ai-sdk/mistral@3`
- **Streaming**: `TextStreamChatTransport` + plain text `Response` (not `toUIMessageStreamResponse`)
- **UI**: Tailwind CSS v4, shadcn/ui, lucide-react

## Key Conventions

### Streaming Chat
- Server returns `new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`
- Client uses `TextStreamChatTransport` — NOT `DefaultChatTransport`
- `toUIMessageStreamResponse()` and `DefaultChatTransport` are NOT compatible with multi-step tool calls in this codebase — do not switch to them
- Tool call markers `<<<WEB_SEARCH_START>>>` / `<<<WEB_SEARCH_END>>>` are injected in the text stream for UI state

### AI SDK v6 API (ai@6)
- `streamText()` returns `StreamTextResult` — no `toDataStreamResponse()`, use `toTextStreamResponse()` or custom stream from `fullStream`
- `result.text` is `PromiseLike<string>` — wrap with `Promise.resolve()` to chain `.catch()`
- Tool part type in messages: `tool-${toolName}` (e.g. `tool-webSearch`), NOT `tool-invocation`
- Tool state: `input-streaming | input-available | output-available | output-error`

### Database
- Prisma client in `lib/prisma.ts` — singleton, exported as `prisma`
- Message roles: `USER` | `ASSISTANT` (uppercase enum)
- Sources stored as JSON in `Message.sources`

### File Uploads
- Files saved to `./uploads/` (UPLOAD_DIR env var)
- Processing pipeline: `lib/documents/process.ts`
- Status flow: `PENDING → PROCESSING → READY | ERROR`

## Environment Variables
```
DATABASE_URL        # Supabase pooler (pgbouncer port 6543)
DIRECT_URL          # Supabase direct (port 5432) — used by Prisma migrations
MISTRAL_API_KEY     # Mistral AI (LLM + embeddings + OCR)
OPENROUTER_API_KEY  # OpenRouter (Perplexity web search)
UPLOAD_DIR          # File storage path (default: ./uploads)
```

## Key File Paths
```
app/api/chat/route.ts              # Main chat endpoint (POST)
app/api/documents/route.ts         # Document upload/list
app/api/chatbots/[chatbotId]/      # Chatbot CRUD + document management
lib/ai/generate.ts                 # streamText + custom stream with search markers
lib/ai/web-search.ts               # searchWeb() via OpenRouter/Perplexity
lib/ai/retriever.ts                # Similarity search (pgvector)
lib/ai/embeddings.ts               # Mistral embeddings singleton
lib/ai/ocr.ts                      # Text extraction (Mistral OCR for non-text files)
lib/ai/splitter.ts                 # LangChain RecursiveCharacterTextSplitter
lib/ai/vectorstore.ts              # PGVectorStore singleton
lib/documents/process.ts           # Document processing pipeline
lib/documents/storage.ts           # File save/delete/path helpers
lib/prisma.ts                      # Prisma singleton
components/chat/chat-interface.tsx # Chat UI (streaming, search indicator)
components/chat/message-bubble.tsx # Message rendering (ReactMarkdown)
components/documents/file-manager.tsx # Document management UI
prisma/schema.prisma               # DB schema
```

## Development
```bash
npm run dev    # Start Next.js dev server
npm run build  # Build for production
npm run lint   # ESLint
```

## Prisma Models Summary
- `Folder` — hierarchical (self-referential), contains Documents
- `Document` — uploaded file, has chunks, linked to chatbots via ChatbotDocument
- `DocumentChunk` — text chunk with metadata (chunkIndex), indexed in pgvector
- `Chatbot` — has systemPrompt, linked to documents and conversations
- `ChatbotDocument` — join table (chatbotId + documentId)
- `Conversation` — belongs to Chatbot, has Messages
- `Message` — role (USER/ASSISTANT), content, optional sources JSON
