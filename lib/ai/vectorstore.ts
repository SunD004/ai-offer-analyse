import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { embeddings } from "./embeddings";

let vectorStoreInstance: PGVectorStore | null = null;

export async function getVectorStore(): Promise<PGVectorStore> {
  if (vectorStoreInstance) return vectorStoreInstance;

  vectorStoreInstance = await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: {
      connectionString: process.env.DATABASE_URL,
    },
    tableName: "langchain_pg_embedding",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
    distanceStrategy: "cosine",
  });

  return vectorStoreInstance;
}
