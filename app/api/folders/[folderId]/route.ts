import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/documents/storage";

/** Collect all folder IDs in the subtree (including the root). */
async function collectFolderIds(folderId: string): Promise<string[]> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });

  const descendantIds = await Promise.all(
    children.map((c) => collectFolderIds(c.id))
  );

  return [folderId, ...descendantIds.flat()];
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Collect all folders in the subtree
  const allFolderIds = await collectFolderIds(folderId);

  // Find all documents in those folders
  const documents = await prisma.document.findMany({
    where: { folderId: { in: allFolderIds } },
    select: { id: true, filename: true },
  });

  // Delete files from storage (local or Supabase)
  await Promise.all(documents.map((doc) => deleteFile(doc.filename)));

  // Delete documents from DB (chunks cascade-delete)
  await prisma.document.deleteMany({
    where: { id: { in: documents.map((d) => d.id) } },
  });

  // Delete the root folder (children cascade-delete via Prisma onDelete: Cascade)
  await prisma.folder.delete({ where: { id: folderId } });

  return NextResponse.json({ success: true });
}
