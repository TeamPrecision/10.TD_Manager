import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function uid(s: any): string | undefined { return s?.user?.id; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urole(s: any): string { return s?.user?.role ?? "MEMBER"; }

const FULL_INCLUDE = {
  project: { select: { id: true, name: true } },
  reporter: { select: { id: true, name: true, subRole: true } },
  assignees: { include: { user: { select: { id: true, name: true, subRole: true } } } },
} as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  const projectId = req.nextUrl.searchParams.get("projectId");
  const role = urole(session);
  const userId = uid(session);

  // DEPT users can only see their own tickets
  const canSeeAll = role === "LEADER" || role === "MEMBER";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (projectId) where.projectId = projectId;
  if (!canSeeAll && userId) where.reporterId = userId;

  const issues = await prisma.issue.findMany({
    where,
    include: FULL_INCLUDE,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
  return Response.json(issues);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { title, description, solution, type, priority, projectId, deadline } = await req.json();
  const userId = uid(session);
  const issue = await prisma.issue.create({
    data: {
      title,
      type: type ?? "BUG",
      description: description || null,
      solution: solution || null,
      priority: priority ?? "MEDIUM",
      projectId,
      reporterId: userId ?? null,
      deadline: deadline ? new Date(deadline) : null,
    },
    include: FULL_INCLUDE,
  });
  await prisma.activityLog.create({
    data: {
      userId: userId ?? null,
      action: "CREATE",
      entityType: "ISSUE",
      entityName: title,
      detail: `${type ?? "BUG"} · ${priority ?? "MEDIUM"} · ${issue.project?.name ?? ""}`,
    },
  });
  return Response.json(issue, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = uid(session);
  const role = urole(session);
  const { id, comment, ...data } = await req.json();

  const existing = await prisma.issue.findUnique({ where: { id }, select: { status: true, title: true } });

  // Permission checks for status transitions
  if (data.status && data.status !== existing?.status) {
    const from = existing?.status ?? "OPEN";
    const to = data.status;
    if (from === "OPEN" && to === "IN_PROGRESS" && role !== "LEADER") {
      return Response.json({ error: "Only leaders can move tickets to In Progress" }, { status: 403 });
    }
    if (from === "OPEN" && to === "REJECTED" && role !== "LEADER") {
      return Response.json({ error: "Only leaders can reject tickets" }, { status: 403 });
    }
    if (from === "RESOLVED" && role !== "LEADER") {
      return Response.json({ error: "Only leaders can re-open resolved tickets" }, { status: 403 });
    }
    if (from === "REJECTED" && role !== "LEADER") {
      return Response.json({ error: "Only leaders can re-open rejected tickets" }, { status: 403 });
    }
  }

  // Handle deadline serialization
  if (data.deadline !== undefined) {
    data.deadline = data.deadline ? new Date(data.deadline) : null;
  }

  const issue = await prisma.issue.update({ where: { id }, data });

  if (data.status !== undefined && data.status !== existing?.status) {
    await prisma.issueComment.create({
      data: {
        issueId: id,
        userId: userId ?? null,
        type: "STATUS_CHANGE",
        text: comment || "",
        newStatus: data.status,
      },
    });
    await prisma.activityLog.create({
      data: {
        userId: userId ?? null,
        action: "STATUS_CHANGE",
        entityType: "ISSUE",
        entityName: existing?.title ?? id,
        detail: `${existing?.status} → ${data.status}`,
        comment: comment || null,
      },
    });
  }

  return Response.json(issue);
}
