import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId, stageKey, label, url, revision } = await req.json();

  const process = await prisma.projectProcess.upsert({
    where: { projectId_stageKey: { projectId, stageKey } },
    update: {},
    create: { projectId, stageKey, status: "PENDING" },
  });

  const link = await prisma.processLink.create({
    data: {
      processId: process.id,
      label,
      url,
      revision: revision || null,
      addedById: session.user!.id,
    },
    include: { addedBy: true },
  });
  return Response.json(link, { status: 201 });
}
