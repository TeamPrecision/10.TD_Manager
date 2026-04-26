import { NextRequest } from "next/server";
import { validateTesterKey } from "@/lib/tester-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const tester = await validateTesterKey(req);
  if (!tester) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.tester.update({
    where: { id: tester.id },
    data: { lastSeen: new Date() },
  });
  return Response.json({ ok: true });
}
