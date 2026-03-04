import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { retrieveRelevantChunks } from "@/lib/ai/retriever";
import { generateChatResponse } from "@/lib/ai/generate";

export async function POST(request: NextRequest) {
  const { messages, chatbotId, conversationId } = await request.json();

  if (!chatbotId || !messages?.length) {
    return new Response("Missing chatbotId or messages", { status: 400 });
  }

  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: { documents: { select: { documentId: true } } },
  });

  if (!chatbot) {
    return new Response("Chatbot not found", { status: 404 });
  }

  const documentIds = chatbot.documents.map((d) => d.documentId);
  const lastRaw = messages[messages.length - 1];
  const lastUserMessage =
    lastRaw?.content ||
    lastRaw?.parts
      ?.filter((p: { type: string }) => p.type === "text")
      .map((p: { type: string; text?: string }) => p.text ?? "")
      .join("") ||
    "";

  // Retrieve relevant chunks
  const chunks = await retrieveRelevantChunks(lastUserMessage, documentIds);

  // Build sources info for storage
  const sources = chunks.map((chunk, i) => ({
    sourceIndex: i + 1,
    documentId: chunk.metadata.documentId,
    chunkIndex: chunk.metadata.chunkIndex,
    score: chunk.score,
    preview: chunk.content.slice(0, 200),
  }));

  // Save user message if we have a conversation
  let activeConversationId = conversationId;
  if (activeConversationId) {
    await prisma.message.create({
      data: {
        role: "USER",
        content: lastUserMessage,
        conversationId: activeConversationId,
      },
    });
  } else {
    // Create a new conversation
    const conversation = await prisma.conversation.create({
      data: {
        chatbotId,
        title: lastUserMessage.slice(0, 100),
      },
    });
    activeConversationId = conversation.id;
    await prisma.message.create({
      data: {
        role: "USER",
        content: lastUserMessage,
        conversationId: activeConversationId,
      },
    });
  }

  type RawMessage = {
    role: string;
    content?: string;
    parts?: Array<{ type: string; text?: string }>;
  };
  const chatMessages = messages
    .map((m: RawMessage) => ({
      role: m.role as "user" | "assistant",
      content:
        m.content ||
        m.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text ?? "")
          .join("") ||
        "",
    }))
    .filter((m: { role: "user" | "assistant"; content: string }) => m.content.length > 0)
    .slice(-10); // Keep last 10 messages to stay within token limits

  const { stream, text } = generateChatResponse(
    chatMessages,
    chunks,
    chatbot.systemPrompt
  );

  // Save assistant response on stream completion
  const conversationIdForSave = activeConversationId;
  text
    .then(async (fullText) => {
      await prisma.message.create({
        data: {
          role: "ASSISTANT",
          content: fullText,
          sources: sources.length > 0 ? JSON.parse(JSON.stringify(sources)) : undefined,
          conversationId: conversationIdForSave,
        },
      });
    })
    .catch((err: unknown) => {
      console.error("Failed to save assistant message:", err);
    });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Conversation-Id": activeConversationId,
    },
  });
}
