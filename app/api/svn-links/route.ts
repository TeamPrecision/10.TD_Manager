import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { label, url, revision, category, projectId } = await req.json();
  const uid = session.user!.id;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
  const link = await prisma.svnLink.create({
    data: { label, url, revision: revision || null, category, projectId, addedById: uid },
    include: { addedBy: true },
  });
  await prisma.activityLog.create({
    data: { userId: uid, action: "CREATE", entityType: "SVN_LINK", entityName: label, detail: project?.name ?? null },
  });
  return Response.json(link, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const uid = session.user?.id;
  const existing = await prisma.svnLink.findUnique({
    where: { id },
    select: { label: true, project: { select: { name: true } } },
  });
  await prisma.svnLink.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: uid ?? null,
      action: "DELETE",
      entityType: "SVN_LINK",
      entityName: existing?.label ?? id,
      detail: existing?.project?.name ?? null,
    },
  });
  return Response.json({ ok: true });
}
