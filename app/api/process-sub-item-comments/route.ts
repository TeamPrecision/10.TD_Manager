import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, stageKey, refId, refType, text } = await req.json();
  if (!projectId || !stageKey || !refId || !text) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const userId = session.user?.id;

  const subItem = await prisma.processSubItem.upsert({
    where: { projectId_stageKey_refId: { projectId, stageKey, refId } },
    update: {},
    create: { projectId, stageKey, refId, refType, status: "PENDING" },
  });

  const comment = await prisma.processSubItemComment.create({
    data: { subItemId: subItem.id, text, userId, type: "COMMENT" },
    include: { user: { select: { name: true } } },
  });

  return Response.json(comment, { status: 201 });
}
