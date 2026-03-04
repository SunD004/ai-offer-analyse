import { streamText, tool, stepCountIs } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { z } from "zod/v4";
import { RetrievedChunk } from "./retriever";
import { searchWeb } from "./web-search";

const mistral = createMistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

export const WEB_SEARCH_START = "<<<WEB_SEARCH_START>>>";

function formatStreamError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Rate limit") || msg.includes("rate_limited") || msg.includes("429")) {
    return "\n\n> **Erreur : limite de requêtes Mistral atteinte (429).** Attends quelques secondes et réessaie.";
  }
  if (msg.includes("RetryError") || msg.includes("maxRetries")) {
    return "\n\n> **Erreur : l'API Mistral n'a pas répondu après plusieurs tentatives.** Vérifie ta clé API et réessaie.";
  }
  return `\n\n> **Erreur** : ${msg}`;
}
export const WEB_SEARCH_END = "<<<WEB_SEARCH_END>>>";

export function buildContextPrompt(
  chunks: RetrievedChunk[],
  systemPrompt: string
): string {
  const webSearchInstruction = `
You also have access to a \`webSearch\` tool. Use it when:
- The document context doesn't contain the information needed
- The user asks about current events, prices, news, or real-time data
- The user explicitly asks to search the web

Always format your responses in Markdown:
- Use **bold** for important terms
- Use bullet lists or numbered lists for enumerations
- Use \`code\` for technical terms, commands, or values
- Use headers (##, ###) to structure long answers
- Use tables when comparing multiple items
- Keep paragraphs short and readable`;

  if (chunks.length === 0) {
    return `${systemPrompt}${webSearchInstruction}

No relevant document context was found. Use webSearch if needed, or let the user know you don't have enough context.`;
  }

  const context = chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1}] (Document: ${chunk.metadata.documentId})\n${chunk.content}`
    )
    .join("\n\n");

  return `${systemPrompt}${webSearchInstruction}

Use the following document context to answer the user's question. Reference sources using [Source N] notation when citing information.

<context>
${context}
</context>

Instructions:
- Prefer the document context when it contains the answer
- Use webSearch for information not found in the context or that requires up-to-date data
- Cite document sources using [Source N] notation`;
}

export function generateChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  chunks: RetrievedChunk[],
  systemPrompt: string
): { stream: ReadableStream<Uint8Array>; text: Promise<string> } {
  const system = buildContextPrompt(chunks, systemPrompt);

  // Fallback: use the last user message content if the model fails to provide a query
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const result = streamText({
    model: mistral("mistral-large-latest"),
    system,
    messages,
    tools: {
      webSearch: tool({
        description:
          "Search the web for current or real-time information. You MUST provide the 'query' parameter with the exact search terms to look up.",
        inputSchema: z.object({
          query: z
            .string()
            .min(1)
            .describe(
              "The search query string to submit to the search engine. Example: 'current bitcoin price' or 'latest AI news 2025'. This field is required."
            ),
        }),
        execute: async ({ query }) => {
          const effectiveQuery = query?.trim() || lastUserMessage;
          console.log(
            `[generate] webSearch args: query="${query}" → effective="${effectiveQuery}"`
          );
          return searchWeb(effectiveQuery);
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  let resolveText!: (text: string) => void;
  let rejectText!: (err: unknown) => void;
  const textPromise = new Promise<string>((res, rej) => {
    resolveText = res;
    rejectText = rej;
  });

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.fullStream) {
          console.log(`[generate] chunk: ${chunk.type}`);
          if (chunk.type === "text-delta") {
            fullText += chunk.text;
            controller.enqueue(encoder.encode(chunk.text));
          } else if (
            chunk.type === "tool-call" &&
            chunk.toolName === "webSearch"
          ) {
            controller.enqueue(encoder.encode(WEB_SEARCH_START));
          } else if (chunk.type === "tool-result") {
            controller.enqueue(encoder.encode(WEB_SEARCH_END));
          } else if (chunk.type === "error") {
            console.error(`[generate] stream error chunk:`, chunk);
            const errMsg = formatStreamError(chunk.error);
            fullText += errMsg;
            controller.enqueue(encoder.encode(errMsg));
          }
        }
        resolveText(fullText);
      } catch (err) {
        console.error(`[generate] stream catch:`, err);
        const errMsg = formatStreamError(err);
        fullText += errMsg;
        controller.enqueue(encoder.encode(errMsg));
        resolveText(fullText);
      } finally {
        controller.close();
      }
    },
  });

  return { stream, text: textPromise };
}
