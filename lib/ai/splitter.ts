import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const defaultSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

// Larger chunks for tabular data so rows stay together
const tabularSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 2000,
  chunkOverlap: 200,
  separators: ["\n\n---\n\n", "\n\n## ", "\n\n", "\n"],
});

export async function splitText(
  text: string,
  metadata: Record<string, unknown> = {},
  options?: { tabular?: boolean }
) {
  const splitter = options?.tabular ? tabularSplitter : defaultSplitter;
  const docs = await splitter.createDocuments(
    [text],
    [metadata],
  );
  return docs.map((doc, index) => ({
    content: doc.pageContent,
    metadata: { ...doc.metadata, chunkIndex: index },
  }));
}
