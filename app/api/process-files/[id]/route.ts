import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pf = await prisma.processFile.findUnique({ where: { id } });
  if (!pf) return new Response(null, { status: 404 });
  const blob = new Blob([pf.data as unknown as ArrayBuffer], { type: pf.mimeType });
  return new Response(blob, {
    headers: {
      "Content-Type": pf.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(pf.name)}"`,
      "Content-Length": String(pf.size),
    },
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const uid = session.user?.id;
  const existing = await prisma.processFile.findUnique({ where: { id }, select: { name: true } });
  await prisma.processFile.delete({ where: { id } });
  await prisma.activityLog.create({
    data: { userId: uid ?? null, action: "DELETE", entityType: "PROCESS_FILE", entityName: existing?.name ?? id },
  });
  return Response.json({ ok: true });
}
