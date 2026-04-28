import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { fixtureId, name, model } = await req.json();
  if (!fixtureId || !name || !model) return Response.json({ error: "Missing fields" }, { status: 400 });
  const uid = session.user?.id;
  const fixture = await prisma.fixture.findUnique({ where: { id: fixtureId }, select: { name: true } });
  const fg = await prisma.projectFG.create({
    data: { fixtureId, name: name.toUpperCase(), model },
  });
  await prisma.activityLog.create({
    data: {
      userId: uid ?? null,
      action: "CREATE",
      entityType: "FIXTURE_FG",
      entityName: name.toUpperCase(),
      detail: `${model}${fixture ? ` · ${fixture.name}` : ""}`,
    },
  });
  return Response.json(fg, { status: 201 });
}
