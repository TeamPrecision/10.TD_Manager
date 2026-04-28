import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const uid = session.user?.id;
  const existing = await prisma.processSubItemLink.findUnique({ where: { id }, select: { label: true } });
  await prisma.processSubItemLink.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { userId: uid ?? null, action: "DELETE", entityType: "SUB_ITEM_LINK", entityName: existing?.label ?? id },
  });
  return Response.json({ ok: true });
}
