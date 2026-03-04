import { prisma } from "@/lib/prisma";
import { extractTextFromBuffer } from "@/lib/ai/ocr";
import { splitText } from "@/lib/ai/splitter";
import { getVectorStore } from "@/lib/ai/vectorstore";
import { getFileBuffer } from "./storage";
import { Document as LCDocument } from "@langchain/core/documents";

export async function processDocument(documentId: string): Promise<void> {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    const document = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });

    const buffer = await getFileBuffer(document.filename);

    // Step 1: OCR / text extraction
    const text = await extractTextFromBuffer(buffer, document.filename);

    await prisma.document.update({
      where: { id: documentId },
      data: { ocrText: text },
    });

    // Step 2: Split text into chunks
    const ext = document.filename.split(".").pop()?.toLowerCase();
    const tabular = ext === "xlsx" || ext === "csv";
    const chunks = await splitText(text, { documentId }, { tabular });

    // Step 3: Save chunks to Prisma
    await prisma.documentChunk.createMany({
      data: chunks.map((chunk, index) => ({
        documentId,
        content: chunk.content,
        chunkIndex: index,
        metadata: chunk.metadata,
      })),
    });

    // Step 4: Store embeddings in vector store
    const vectorStore = await getVectorStore();
    const lcDocs = chunks.map(
      (chunk, index) =>
        new LCDocument({
          pageContent: chunk.content,
          metadata: { documentId, chunkIndex: index },
        })
    );
    await vectorStore.addDocuments(lcDocs);

    // Step 5: Mark as ready
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during processing";
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "ERROR", errorMessage: message },
    });
  }
}
