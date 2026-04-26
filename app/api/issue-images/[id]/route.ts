import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await prisma.issueImage.findUnique({ where: { id } });
  if (!image) return new Response(null, { status: 404 });
  return new Response(image.data as unknown as ArrayBuffer, {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(image.name)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.issueImage.delete({ where: { id } });
  return Response.json({ ok: true });
}
