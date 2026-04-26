import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { pcName, anyDeskId } = await req.json();
  if (!pcName) return Response.json({ error: "pcName required" }, { status: 400 });

  const existing = await prisma.tester.findUnique({ where: { pcName } });
  if (existing) {
    const updated = await prisma.tester.update({
      where: { pcName },
      data: { anyDeskId: anyDeskId ?? existing.anyDeskId, lastSeen: new Date() },
    });
    return Response.json({ apiKey: updated.apiKey, id: updated.id });
  }

  const apiKey = randomUUID();
  const tester = await prisma.tester.create({
    data: { pcName, anyDeskId: anyDeskId ?? null, apiKey, lastSeen: new Date() },
  });
  return Response.json({ apiKey: tester.apiKey, id: tester.id }, { status: 201 });
}
