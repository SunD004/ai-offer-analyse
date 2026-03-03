import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/documents/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json(document);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;
  const body = await request.json();

  const document = await prisma.document.update({
    where: { id: documentId },
    data: {
      ...(body.folderId !== undefined && { folderId: body.folderId || null }),
    },
  });

  return NextResponse.json(document);
}

export async function DELETE(
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

  await deleteFile(document.filename);
  await prisma.document.delete({ where: { id: documentId } });

  return NextResponse.json({ success: true });
}
