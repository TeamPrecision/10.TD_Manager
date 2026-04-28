import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { PROJECT_STAGES } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = Object.fromEntries(PROJECT_STAGES.map((s) => [s.key, s.label]));

// Per-ref cascades (same fixture/FG advances in next stage)
const CASCADE: Record<string, string[]> = {
  VENDOR_QUOTE:      ["VENDOR_APPROVED"],
  VENDOR_APPROVED:   ["ITEMS_PREPPED", "WIRING_COMPLETE", "FIXTURE_DELIVERED"],
  SAMPLE_DEBUG:      ["DEBUG"],
  FIXTURE_DELIVERED: ["DEBUG_FIXTURE"],
  DEBUG_FIXTURE:     ["CODING"],
  CODING:            ["CYCLE_RUN"],
  CYCLE_RUN:         ["TESTER_DELIVERED"],
};

// Stage-level cascades: fire when ALL sub-items for a stage are DONE (parent becomes DONE)
const PARENT_DONE_CASCADE: Record<string, string[]> = {
  DEBUG: ["CUSTOMER_MEETING"],
};

async function syncParentProcess(projectId: string, stageKey: string) {
  const allSubs = await prisma.processSubItem.findMany({ where: { projectId, stageKey } });
  if (allSubs.length === 0) return;

  let parentStatus: string;
  if (allSubs.every((s) => s.status === "DONE")) {
    parentStatus = "DONE";
  } else if (allSubs.some((s) => s.status !== "PENDING")) {
    parentStatus = "IN_PROGRESS";
  } else {
    parentStatus = "PENDING";
  }

  const nonDoneWithDl = allSubs.filter((s) => s.status !== "DONE" && s.deadline);
  const allWithDl = allSubs.filter((s) => s.deadline);
  let parentDeadline: Date | null = null;
  if (nonDoneWithDl.length > 0) {
    parentDeadline = nonDoneWithDl.reduce<Date>((min, s) =>
      s.deadline! < min ? s.deadline! : min, nonDoneWithDl[0].deadline!);
  } else if (allWithDl.length > 0) {
    parentDeadline = allWithDl.reduce<Date>((max, s) =>
      s.deadline! > max ? s.deadline! : max, allWithDl[0].deadline!);
  }

  await prisma.projectProcess.upsert({
    where: { projectId_stageKey: { projectId, stageKey } },
    update: { status: parentStatus, deadline: parentDeadline },
    create: { projectId, stageKey, status: parentStatus, deadline: parentDeadline },
  });

  return parentStatus;
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, stageKey, refId, refType, status, deadline, comment } = await req.json();
  const userId = session.user?.id;

  const existing = await prisma.processSubItem.findUnique({
    where: { projectId_stageKey_refId: { projectId, stageKey, refId } },
    select: { id: true, status: true },
  });

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;

  const item = await prisma.processSubItem.upsert({
    where: { projectId_stageKey_refId: { projectId, stageKey, refId } },
    update: updateData,
    create: {
      projectId,
      stageKey,
      refId,
      refType,
      status: status ?? "PENDING",
      deadline: deadline ? new Date(deadline) : null,
    },
  });

  let historyComment = null;
  const prevStatus = existing?.status ?? "PENDING";
  if (status !== undefined && status !== prevStatus) {
    historyComment = await prisma.processSubItemComment.create({
      data: {
        subItemId: item.id,
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
        entityType: "PROCESS_SUB_ITEM",
        entityName: STAGE_LABEL[stageKey] ?? stageKey,
        detail: `${prevStatus} → ${status}`,
        comment: comment || null,
      },
    });
  }

  const newParentStatus = await syncParentProcess(projectId, stageKey);

  // Per-ref cascade: when sub-item becomes DONE, advance same ref in next stages
  if (status === "DONE" && prevStatus !== "DONE" && CASCADE[stageKey]) {
    for (const targetKey of CASCADE[stageKey]) {
      const targetSub = await prisma.processSubItem.findUnique({
        where: { projectId_stageKey_refId: { projectId, stageKey: targetKey, refId } },
        select: { id: true, status: true },
      });
      if (!targetSub || targetSub.status === "PENDING") {
        const advanced = await prisma.processSubItem.upsert({
          where: { projectId_stageKey_refId: { projectId, stageKey: targetKey, refId } },
          update: { status: "IN_PROGRESS" },
          create: { projectId, stageKey: targetKey, refId, refType, status: "IN_PROGRESS" },
        });
        await prisma.processSubItemComment.create({
          data: {
            subItemId: advanced.id,
            type: "STATUS_CHANGE",
            newStatus: "IN_PROGRESS",
            text: "",
            userId: userId ?? null,
          },
        });
        await syncParentProcess(projectId, targetKey);
      }
    }
  }

  // Stage-level cascade: when ALL sub-items in this stage are DONE, advance target main processes
  if (status === "DONE" && newParentStatus === "DONE" && PARENT_DONE_CASCADE[stageKey]) {
    for (const targetKey of PARENT_DONE_CASCADE[stageKey]) {
      const existingParent = await prisma.projectProcess.findUnique({
        where: { projectId_stageKey: { projectId, stageKey: targetKey } },
        select: { id: true, status: true },
      });
      if (!existingParent || existingParent.status === "PENDING") {
        const advanced = await prisma.projectProcess.upsert({
          where: { projectId_stageKey: { projectId, stageKey: targetKey } },
          update: { status: "IN_PROGRESS" },
          create: { projectId, stageKey: targetKey, status: "IN_PROGRESS" },
        });
        await prisma.processComment.create({
          data: {
            processId: advanced.id,
            type: "STATUS_CHANGE",
            newStatus: "IN_PROGRESS",
            text: "",
            userId: userId ?? null,
          },
        });
      }
    }
  }

  return Response.json({ item, historyComment });
}
