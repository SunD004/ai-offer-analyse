import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { marketConfigSchema } from "@/lib/market-config";

const createChatbotSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  marketConfig: marketConfigSchema.optional().nullable(),
});

export async function GET() {
  const chatbots = await prisma.chatbot.findMany({
    include: {
      _count: { select: { documents: true, conversations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(chatbots);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createChatbotSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { marketConfig, ...rest } = parsed.data;
  const chatbot = await prisma.chatbot.create({
    data: {
      ...rest,
      ...(marketConfig && { marketConfig }),
    },
  });

  return NextResponse.json(chatbot, { status: 201 });
}
