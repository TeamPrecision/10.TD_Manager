import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId, stageKey, text } = await req.json();

  const process = await prisma.projectProcess.upsert({
    where: { projectId_stageKey: { projectId, stageKey } },
    update: {},
    create: { projectId, stageKey, status: "PENDING" },
  });

  const comment = await prisma.processComment.create({
    data: {
      processId: process.id,
      text,
      userId: session.user!.id,
    },
    include: { user: true },
  });
  return Response.json(comment, { status: 201 });
}
