import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

export async function splitText(
  text: string,
  metadata: Record<string, unknown> = {}
) {
  const docs = await splitter.createDocuments(
    [text],
    [metadata],
  );
  return docs.map((doc, index) => ({
    content: doc.pageContent,
    metadata: { ...doc.metadata, chunkIndex: index },
  }));
}
