import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processDocument } from "@/lib/documents/process";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Clear existing chunks before reprocessing
  await prisma.documentChunk.deleteMany({ where: { documentId } });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "PENDING", errorMessage: null, ocrText: null },
  });

  processDocument(documentId).catch(console.error);

  return NextResponse.json({ success: true, status: "PENDING" });
}
