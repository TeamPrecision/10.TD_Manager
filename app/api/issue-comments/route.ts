import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uid(s: any): string | undefined { return s?.user?.id; }

export async function GET(req: NextRequest) {
  const issueId = req.nextUrl.searchParams.get("issueId");
  if (!issueId) return Response.json({ error: "issueId required" }, { status: 400 });
  const comments = await prisma.issueComment.findMany({
    where: { issueId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(comments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { issueId, text, type, newStatus } = await req.json();
  if (!issueId || !text) return Response.json({ error: "Missing fields" }, { status: 400 });
  const comment = await prisma.issueComment.create({
    data: {
      issueId,
      userId: uid(session) ?? null,
      type: type ?? "COMMENT",
      text,
      newStatus: newStatus ?? null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return Response.json(comment, { status: 201 });
}
