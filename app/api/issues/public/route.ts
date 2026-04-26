import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { title, description, type, priority, projectId, reporterName, reporterDept } = await req.json();

  if (!title?.trim() || !projectId) {
    return Response.json({ error: "Title and project are required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } });
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  const issue = await prisma.issue.create({
    data: {
      title: title.trim(),
      type: type ?? "BUG",
      description: description?.trim() || null,
      priority: priority ?? "MEDIUM",
      projectId,
      reporterName: reporterName?.trim() || null,
      reporterDept: reporterDept?.trim() || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "CREATE",
      entityType: "ISSUE",
      entityName: issue.title,
      detail: `${type ?? "BUG"} · ${priority ?? "MEDIUM"} · ${project.name}${reporterName ? ` · from ${reporterName}` : ""}`,
    },
  });

  return Response.json({ id: issue.id }, { status: 201 });
}
