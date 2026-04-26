import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

const INCLUDE = {
  project: { select: { id: true, name: true } },
  fixture: { select: { id: true, name: true } },
  comments: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  issues: {
    include: {
      project: { select: { id: true, name: true } },
      fixture: { select: { id: true, name: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function userId(session: any) {
  return (session?.user as Record<string, unknown>)?.id as string | undefined;
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const fixtureId = req.nextUrl.searchParams.get("fixtureId");
  const where: Record<string, string> = {};
  if (projectId) where.projectId = projectId;
  if (fixtureId) where.fixtureId = fixtureId;
  const items = await prisma.item.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = userId(session);
  const { name, quantity, unit, source, price, nre, pr, projectId, status, fixtureId } = await req.json();
  const item = await prisma.item.create({
    data: {
      name,
      quantity: quantity ?? 1,
      unit: unit || null,
      source: source || null,
      price: price ?? null,
      nre: nre ?? null,
      pr: pr || null,
      projectId: projectId || null,
      status: status ?? "ORDERED",
      fixtureId: fixtureId || null,
    },
    include: INCLUDE,
  });
  await prisma.activityLog.create({
    data: {
      userId: uid ?? null,
      action: "CREATE",
      entityType: "ITEM",
      entityName: name,
      detail: `PR: ${pr || "—"}, Qty: ${quantity ?? 1}, Source: ${source || "—"}`,
    },
  });
  return Response.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = userId(session);
  const { id, status, comment, ...rest } = await req.json();

  const existing = await prisma.item.findUnique({ where: { id }, select: { status: true, name: true } });

  const updateData: Record<string, unknown> = { ...rest };
  if (status !== undefined) updateData.status = status;

  const item = await prisma.item.update({ where: { id }, data: updateData, include: INCLUDE });

  let historyComment = null;
  if (status !== undefined && status !== existing?.status) {
    historyComment = await prisma.itemComment.create({
      data: {
        itemId: id,
        type: "STATUS_CHANGE",
        newStatus: status,
        text: comment ?? "",
        userId: uid ?? null,
      },
      include: { user: { select: { name: true } } },
    });
    await prisma.activityLog.create({
      data: {
        userId: uid ?? null,
        action: "STATUS_CHANGE",
        entityType: "ITEM",
        entityName: existing?.name ?? id,
        detail: `${existing?.status} → ${status}`,
        comment: comment || null,
      },
    });
  }

  return Response.json({ item, historyComment });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const uid = userId(session);
  const { id, comment } = await req.json();
  const existing = await prisma.item.findUnique({ where: { id }, select: { name: true } });
  await prisma.item.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: uid ?? null,
      action: "DELETE",
      entityType: "ITEM",
      entityName: existing?.name ?? id,
      comment: comment || null,
    },
  });
  return Response.json({ ok: true });
}
