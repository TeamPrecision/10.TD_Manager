import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { customerItemId, text } = await req.json();
  const userId = session.user?.id;
  const comment = await prisma.customerItemComment.create({
    data: { customerItemId, type: "COMMENT", text, userId: userId ?? null },
    include: { user: { select: { name: true } } },
  });
  return Response.json(comment, { status: 201 });
}
