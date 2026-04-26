import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name, model } = await req.json();
  const data: Record<string, string> = {};
  if (name !== undefined) data.name = name.toUpperCase();
  if (model !== undefined) data.model = model;
  const fg = await prisma.projectFG.update({ where: { id }, data });
  return Response.json(fg);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const uid = (session.user as Record<string, unknown>)?.id as string | undefined;
  const existing = await prisma.projectFG.findUnique({ where: { id }, select: { name: true, model: true } });
  await prisma.projectFG.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: uid ?? null,
      action: "DELETE",
      entityType: "FIXTURE_FG",
      entityName: existing?.name ?? id,
      detail: existing?.model ?? null,
    },
  });
  return Response.json({ ok: true });
}
