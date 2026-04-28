import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId, name } = await req.json();
  if (!projectId || !name) return Response.json({ error: "Missing fields" }, { status: 400 });
  const uid = session.user?.id;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
  const fixture = await prisma.fixture.create({ data: { projectId, name } });
  await prisma.activityLog.create({
    data: { userId: uid ?? null, action: "CREATE", entityType: "FIXTURE", entityName: name, detail: project?.name ?? null },
  });
  return Response.json(fixture, { status: 201 });
}
