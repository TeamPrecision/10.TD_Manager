import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name } = await req.json();
  const fixture = await prisma.fixture.update({ where: { id }, data: { name } });
  return Response.json(fixture);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const uid = (session.user as Record<string, unknown>)?.id as string | undefined;
  const existing = await prisma.fixture.findUnique({
    where: { id },
    select: { name: true, project: { select: { name: true } } },
  });
  await prisma.fixture.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: uid ?? null,
      action: "DELETE",
      entityType: "FIXTURE",
      entityName: existing?.name ?? id,
      detail: existing?.project?.name ?? null,
    },
  });
  return Response.json({ ok: true });
}
