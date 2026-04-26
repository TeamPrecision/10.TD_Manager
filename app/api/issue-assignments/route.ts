import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

function uid(session: unknown) {
  return ((session as Record<string, unknown>)?.user as Record<string, unknown>)?.id as string | undefined;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { issueId, userId } = await req.json();
  if (!issueId || !userId) return Response.json({ error: "Missing fields" }, { status: 400 });
  const assignment = await prisma.issueAssignment.upsert({
    where: { issueId_userId: { issueId, userId } },
    update: {},
    create: { issueId, userId },
    include: { user: { select: { id: true, name: true, subRole: true } } },
  });
  return Response.json(assignment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { issueId, userId } = await req.json();
  await prisma.issueAssignment.deleteMany({ where: { issueId, userId } });
  return Response.json({ ok: true });
}
