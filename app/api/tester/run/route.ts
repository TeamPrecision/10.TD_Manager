import { NextRequest } from "next/server";
import { validateTesterKey } from "@/lib/tester-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const tester = await validateTesterKey(req);
  if (!tester) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { fgName, projectName, mode } = await req.json();

  let projectId: string | null = tester.projectId;
  if (projectName) {
    const project = await prisma.project.findFirst({ where: { name: { contains: projectName } } });
    projectId = project?.id ?? null;
  }

  await prisma.tester.update({
    where: { id: tester.id },
    data: {
      isRunning: true,
      currentFg: fgName ?? null,
      mode: mode ?? null,
      projectId,
      passCount: 0,
      failCount: 0,
      lastSeen: new Date(),
    },
  });
  return Response.json({ ok: true });
}
