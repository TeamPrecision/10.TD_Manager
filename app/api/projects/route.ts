import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { issues: true, tasks: true, items: true } } },
  });
  return Response.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { name, customer } = await req.json();
  if (!name || !customer) return Response.json({ error: "Missing fields" }, { status: 400 });
  const uid = session.user?.id;
  const project = await prisma.project.create({ data: { name, customer } });
  await prisma.activityLog.create({
    data: { userId: uid ?? null, action: "CREATE", entityType: "PROJECT", entityName: name, detail: customer },
  });
  return Response.json(project, { status: 201 });
}
