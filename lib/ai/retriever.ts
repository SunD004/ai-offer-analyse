import { getVectorStore } from "./vectorstore";

export interface RetrievedChunk {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export async function retrieveRelevantChunks(
  query: string,
  documentIds: string[],
  topK = 5
): Promise<RetrievedChunk[]> {
  if (documentIds.length === 0) return [];

  const vectorStore = await getVectorStore();

  const results = await vectorStore.similaritySearchWithScore(query, topK, {
    documentId: { in: documentIds },
  });

  return results.map(([doc, score]) => ({
    content: doc.pageContent,
    metadata: doc.metadata as Record<string, unknown>,
    score,
  }));
}
