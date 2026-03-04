import { getVectorStore } from "./vectorstore";

export interface RetrievedChunk {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export async function retrieveRelevantChunks(
  query: string,
  documentIds: string[],
  topK?: number
): Promise<RetrievedChunk[]> {
  if (documentIds.length === 0) return [];

  // Scale with document count: 2 chunks per document, capped at 12
  const k = topK ?? Math.min(12, Math.max(4, documentIds.length * 2));

  const vectorStore = await getVectorStore();

  const results = await vectorStore.similaritySearchWithScore(query, k, {
    documentId: { in: documentIds },
  });

  return results.map(([doc, score]) => ({
    content: doc.pageContent,
    metadata: doc.metadata as Record<string, unknown>,
    score,
  }));
}
