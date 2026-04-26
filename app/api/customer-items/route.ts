import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

const INCLUDE = {
  project: { select: { id: true, name: true } },
  fixture: { select: { id: true, name: true } },
  fg: { select: { id: true, name: true, model: true } },
  comments: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uid(session: any) {
  return (session?.user as Record<string, unknown>)?.id as string | undefined;
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const fixtureId = req.nextUrl.searchParams.get("fixtureId");
  const fgId = req.nextUrl.searchParams.get("fgId");
  const where: Record<string, string> = {};
  if (projectId) where.projectId = projectId;
  if (fixtureId) where.fixtureId = fixtureId;
  if (fgId) where.fgId = fgId;
  const items = await prisma.customerItem.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = uid(session);
  const { name, quantity, unit, notes, status, projectId, fixtureId, fgId } = await req.json();
  const item = await prisma.customerItem.create({
    data: {
      name,
      quantity: quantity ?? 1,
      unit: unit || null,
      notes: notes || null,
      status: status ?? "PENDING",
      projectId: projectId || null,
      fixtureId: fixtureId || null,
      fgId: fgId || null,
    },
    include: INCLUDE,
  });
  await prisma.activityLog.create({
    data: {
      userId: userId ?? null,
      action: "CREATE",
      entityType: "CUSTOMER_ITEM",
      entityName: name,
      detail: `Qty: ${quantity ?? 1}${item.project ? `, Project: ${item.project.name}` : ""}`,
    },
  });
  return Response.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = uid(session);
  const { id, status, comment, ...rest } = await req.json();

  const existing = await prisma.customerItem.findUnique({ where: { id }, select: { status: true, name: true } });

  const updateData: Record<string, unknown> = { ...rest };
  if (status !== undefined) updateData.status = status;

  const item = await prisma.customerItem.update({ where: { id }, data: updateData, include: INCLUDE });

  let historyComment = null;
  if (status !== undefined && status !== existing?.status) {
    historyComment = await prisma.customerItemComment.create({
      data: {
        customerItemId: id,
        type: "STATUS_CHANGE",
        newStatus: status,
        text: comment ?? "",
        userId: userId ?? null,
      },
      include: { user: { select: { name: true } } },
    });
    await prisma.activityLog.create({
      data: {
        userId: userId ?? null,
        action: "STATUS_CHANGE",
        entityType: "CUSTOMER_ITEM",
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
  const userId = uid(session);
  const { id, comment } = await req.json();
  const existing = await prisma.customerItem.findUnique({ where: { id }, select: { name: true } });
  await prisma.customerItem.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: userId ?? null,
      action: "DELETE",
      entityType: "CUSTOMER_ITEM",
      entityName: existing?.name ?? id,
      comment: comment || null,
    },
  });
  return Response.json({ ok: true });
}
