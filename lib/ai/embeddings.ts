import { MistralAIEmbeddings } from "@langchain/mistralai";

const globalForEmbeddings = globalThis as unknown as {
  embeddings: MistralAIEmbeddings | undefined;
};

export const embeddings =
  globalForEmbeddings.embeddings ??
  new MistralAIEmbeddings({
    model: "mistral-embed",
    apiKey: process.env.MISTRAL_API_KEY,
  });

if (process.env.NODE_ENV !== "production")
  globalForEmbeddings.embeddings = embeddings;
