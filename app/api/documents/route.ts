import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/documents/storage";
import { processDocument } from "@/lib/documents/process";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");

  const documents = await prisma.document.findMany({
    where: folderId ? { folderId } : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folderId = formData.get("folderId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { filename } = await saveFile(buffer, file.name);

  const document = await prisma.document.create({
    data: {
      filename,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: buffer.length,
      status: "PENDING",
      folderId: folderId || null,
    },
  });

  // Fire-and-forget processing
  processDocument(document.id).catch(console.error);

  return NextResponse.json(document, { status: 201 });
}
