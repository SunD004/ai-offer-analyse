import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addDocumentsSchema = z.object({
  documentIds: z.array(z.string()).min(1),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const { chatbotId } = await params;
  const associations = await prisma.chatbotDocument.findMany({
    where: { chatbotId },
    include: { document: true },
  });

  return NextResponse.json(associations.map((a) => a.document));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const { chatbotId } = await params;
  const body = await request.json();
  const parsed = addDocumentsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data.documentIds.map((documentId) => ({
    chatbotId,
    documentId,
  }));

  await prisma.chatbotDocument.createMany({
    data,
    skipDuplicates: true,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const { chatbotId } = await params;
  const body = await request.json();
  const parsed = addDocumentsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.chatbotDocument.deleteMany({
    where: {
      chatbotId,
      documentId: { in: parsed.data.documentIds },
    },
  });

  return NextResponse.json({ success: true });
}
