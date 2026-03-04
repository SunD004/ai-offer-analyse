import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JsonNull } from "@/lib/generated/prisma/internal/prismaNamespaceBrowser";
import { z } from "zod";
import { marketConfigSchema } from "@/lib/market-config";

const updateChatbotSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  marketConfig: marketConfigSchema.optional().nullable(),
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

  const { marketConfig, ...rest } = parsed.data;
  const data = {
    ...rest,
    ...(marketConfig !== undefined && {
      marketConfig: marketConfig === null ? JsonNull : marketConfig,
    }),
  };

  const chatbot = await prisma.chatbot.update({
    where: { id: chatbotId },
    data,
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
