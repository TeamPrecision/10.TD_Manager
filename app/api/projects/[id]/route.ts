import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: { include: { assignee: true }, orderBy: { createdAt: "desc" } },
      issues: { include: { reporter: true }, orderBy: [{ priority: "asc" }, { createdAt: "desc" }] },
      items: { orderBy: { createdAt: "desc" } },
      svnLinks: { include: { addedBy: true }, orderBy: { createdAt: "desc" } },
      testers: true,
      cycleRuns: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const project = await prisma.project.update({ where: { id }, data: body });
  return Response.json(project);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const uid = session.user?.id;
  const existing = await prisma.project.findUnique({ where: { id }, select: { name: true } });
  await prisma.project.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { userId: uid ?? null, action: "DELETE", entityType: "PROJECT", entityName: existing?.name ?? id },
  });
  return Response.json({ ok: true });
}
