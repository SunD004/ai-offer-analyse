import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatbotId = searchParams.get("chatbotId");

  if (!chatbotId) {
    return NextResponse.json({ error: "chatbotId required" }, { status: 400 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { chatbotId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json(conversations);
}

export async function POST(request: NextRequest) {
  const { chatbotId, title } = await request.json();

  if (!chatbotId) {
    return NextResponse.json({ error: "chatbotId required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.create({
    data: { chatbotId, title },
  });

  return NextResponse.json(conversation, { status: 201 });
}
