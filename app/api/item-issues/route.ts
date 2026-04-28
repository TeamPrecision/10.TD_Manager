import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

const INCLUDE = {
  item: {
    select: { id: true, name: true, quantity: true, unit: true, price: true, nre: true, pr: true, status: true },
  },
  project: { select: { id: true, name: true } },
  fixture: { select: { id: true, name: true } },
  user: { select: { name: true } },
} as const;

function uid(session: Session | null) {
  return session?.user?.id;
}

export async function GET(req: NextRequest) {
  const fixtureId = req.nextUrl.searchParams.get("fixtureId");
  const itemId = req.nextUrl.searchParams.get("itemId");
  const projectId = req.nextUrl.searchParams.get("projectId");
  const where: Record<string, string> = {};
  if (fixtureId) where.fixtureId = fixtureId;
  if (itemId) where.itemId = itemId;
  if (projectId) where.projectId = projectId;
  const issues = await prisma.itemIssue.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return Response.json(issues);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = uid(session);
  const { itemId, projectId, fixtureId, quantity, notes } = await req.json();
  if (!itemId || !projectId || !fixtureId || !quantity) {
    return Response.json({ error: "itemId, projectId, fixtureId, quantity required" }, { status: 400 });
  }
  const issue = await prisma.itemIssue.create({
    data: { itemId, projectId, fixtureId, userId: userId ?? null, quantity: parseInt(quantity), notes: notes || null },
    include: INCLUDE,
  });
  await prisma.activityLog.create({
    data: {
      userId: userId ?? null,
      action: "WITHDRAW",
      entityType: "ITEM",
      entityName: issue.item.name,
      detail: `${quantity} → ${issue.project.name} / ${issue.fixture.name}`,
      comment: notes || null,
    },
  });
  return Response.json(issue, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const userId = uid(session);
  const existing = await prisma.itemIssue.findUnique({
    where: { id },
    include: {
      item: { select: { name: true } },
      fixture: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  await prisma.itemIssue.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      userId: userId ?? null,
      action: "DELETE",
      entityType: "ITEM_ISSUE",
      entityName: existing?.item?.name ?? id,
      detail: existing
        ? `${existing.quantity} from ${existing.project?.name} / ${existing.fixture?.name}`
        : null,
    },
  });
  return Response.json({ ok: true });
}
