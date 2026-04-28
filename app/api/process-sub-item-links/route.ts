import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, stageKey, refId, refType, label, url, revision } = await req.json();
  if (!projectId || !stageKey || !refId || !label || !url) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const addedById = session.user?.id;

  const subItem = await prisma.processSubItem.upsert({
    where: { projectId_stageKey_refId: { projectId, stageKey, refId } },
    update: {},
    create: { projectId, stageKey, refId, refType, status: "PENDING" },
  });

  const link = await prisma.processSubItemLink.create({
    data: { subItemId: subItem.id, label, url, revision: revision || null, addedById },
    include: { addedBy: true },
  });

  return Response.json(link, { status: 201 });
}
