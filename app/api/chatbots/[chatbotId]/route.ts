import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateChatbotSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const { chatbotId } = await params;
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
    include: {
      documents: { include: { document: true } },
      _count: { select: { conversations: true } },
    },
  });

  if (!chatbot) {
    return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
  }

  return NextResponse.json(chatbot);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const { chatbotId } = await params;
  const body = await request.json();
  const parsed = updateChatbotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const chatbot = await prisma.chatbot.update({
    where: { id: chatbotId },
    data: parsed.data,
  });

  return NextResponse.json(chatbot);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ chatbotId: string }> }
) {
  const { chatbotId } = await params;
  await prisma.chatbot.delete({ where: { id: chatbotId } });
  return NextResponse.json({ success: true });
}
