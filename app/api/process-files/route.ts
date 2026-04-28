import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const projectId = formData.get("projectId") as string;
  const stageKey = formData.get("stageKey") as string;
  const file = formData.get("file") as File | null;

  if (!projectId || !stageKey || !file) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const uid = session.user?.id;

  const process = await prisma.projectProcess.upsert({
    where: { projectId_stageKey: { projectId, stageKey } },
    update: {},
    create: { projectId, stageKey, status: "PENDING" },
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  const pf = await prisma.processFile.create({
    data: {
      processId: process.id,
      name: file.name,
      data: buffer,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    },
  });

  await prisma.activityLog.create({
    data: { userId: uid ?? null, action: "CREATE", entityType: "PROCESS_FILE", entityName: file.name },
  });

  return Response.json({ id: pf.id, name: pf.name, size: pf.size, createdAt: pf.createdAt }, { status: 201 });
}
