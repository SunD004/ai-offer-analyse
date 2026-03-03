import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().nullable().optional(),
});

export async function GET() {
  const folders = await prisma.folder.findMany({
    include: {
      _count: { select: { documents: true, children: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(folders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createFolderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: {
      name: parsed.data.name,
      parentId: parsed.data.parentId ?? null,
    },
  });

  return NextResponse.json(folder, { status: 201 });
}
