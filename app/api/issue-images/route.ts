import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any)?.role ?? "MEMBER";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.id as string | undefined;

  const formData = await req.formData();
  const issueId = formData.get("issueId") as string;
  const section = (formData.get("section") as string) ?? "PROBLEM";
  const file = formData.get("file") as File | null;

  if (!issueId || !file) return Response.json({ error: "Missing fields" }, { status: 400 });

  if (role !== "LEADER") {
    const assigned = await prisma.issueAssignment.findFirst({ where: { issueId, userId } });
    if (!assigned) return Response.json({ error: "Not assigned to this ticket" }, { status: 403 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = await prisma.issueImage.create({
    data: {
      issueId,
      section,
      name: file.name || "image.png",
      data: buffer,
      mimeType: file.type || "image/png",
      size: file.size,
    },
  });

  return Response.json({ id: image.id, name: image.name, size: image.size, section: image.section, createdAt: image.createdAt }, { status: 201 });
}
