import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// perplexity/sonar has native web search built-in
const searchModel = openrouter("perplexity/sonar");

export async function searchWeb(query: string): Promise<string> {
  if (!query?.trim()) {
    console.warn(`[webSearch] Empty query received, skipping search`);
    return "No search query provided. Please answer based on available document context.";
  }
  console.log(`[webSearch] Query: "${query}"`);
  try {
    const { text } = await generateText({
      model: searchModel,
      prompt: query,
    });
    console.log(`[webSearch] Done (${text.length} chars): ${text.slice(0, 120)}...`);
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[webSearch] Error for query "${query}":`, message);
    return `Web search failed: ${message}. Please answer based on available document context instead.`;
  }
}
