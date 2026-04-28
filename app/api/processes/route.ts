import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { PROJECT_STAGES } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = Object.fromEntries(PROJECT_STAGES.map((s) => [s.key, s.label]));

const CASCADE: Record<string, string[]> = {
  PROJECT_WON:       ["EQUIPMENT_ORDERED", "CUSTOMER_EQUIPMENT"],
  VENDOR_QUOTE:      ["VENDOR_APPROVED"],
  VENDOR_APPROVED:   ["ITEMS_PREPPED", "WIRING_COMPLETE", "FIXTURE_DELIVERED"],
  SAMPLE_DEBUG:      ["DEBUG"],
  DEBUG:             ["CUSTOMER_MEETING"],
  FIXTURE_DELIVERED: ["DEBUG_FIXTURE"],
  DEBUG_FIXTURE:     ["CODING"],
  CODING:            ["CYCLE_RUN"],
  CYCLE_RUN:         ["TESTER_DELIVERED"],
};

// Fixture-stage targets that also need sub-item cascade when PROJECT_WON fires
const PROJECT_WON_FIXTURE_TARGETS = ["EQUIPMENT_ORDERED", "CUSTOMER_EQUIPMENT"];

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, stageKey, status, deadline, comment } = await req.json();
  const userId = session.user!.id;

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) updateData.status = status;
  if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;

  const existing = status !== undefined
    ? await prisma.projectProcess.findUnique({
        where: { projectId_stageKey: { projectId, stageKey } },
        select: { status: true },
      })
    : null;

  const process = await prisma.projectProcess.upsert({
    where: { projectId_stageKey: { projectId, stageKey } },
    update: updateData,
    create: {
      projectId,
      stageKey,
      status: status ?? "PENDING",
      deadline: deadline ? new Date(deadline) : null,
    },
  });

  if (status !== undefined) {
    await prisma.processComment.create({
      data: {
        processId: process.id,
        type: "STATUS_CHANGE",
        newStatus: status,
        text: comment ?? "",
        userId,
      },
    });
    const prevStatus = existing?.status ?? "PENDING";
    if (status !== prevStatus) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: "STATUS_CHANGE",
          entityType: "PROCESS",
          entityName: STAGE_LABEL[stageKey] ?? stageKey,
          detail: `${prevStatus} → ${status}`,
          comment: comment || null,
        },
      });
    }
  }

  // Auto-cascade: when a stage becomes DONE advance targets to IN_PROGRESS (once only)
  if (status === "DONE" && CASCADE[stageKey]) {
    for (const targetKey of CASCADE[stageKey]) {
      const existing = await prisma.projectProcess.findUnique({
        where: { projectId_stageKey: { projectId, stageKey: targetKey } },
        select: { id: true, status: true },
      });
      if (!existing || existing.status === "PENDING") {
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
            userId,
          },
        });
      }
    }

    // PROJECT_WON: also advance per-fixture sub-items for the fixture-stage targets
    if (stageKey === "PROJECT_WON") {
      const fixtures = await prisma.fixture.findMany({ where: { projectId } });
      for (const targetKey of PROJECT_WON_FIXTURE_TARGETS) {
        for (const fx of fixtures) {
          const subExisting = await prisma.processSubItem.findUnique({
            where: { projectId_stageKey_refId: { projectId, stageKey: targetKey, refId: fx.id } },
            select: { id: true, status: true },
          });
          if (!subExisting || subExisting.status === "PENDING") {
            const advancedSub = await prisma.processSubItem.upsert({
              where: { projectId_stageKey_refId: { projectId, stageKey: targetKey, refId: fx.id } },
              update: { status: "IN_PROGRESS" },
              create: { projectId, stageKey: targetKey, refId: fx.id, refType: "FIXTURE", status: "IN_PROGRESS" },
            });
            await prisma.processSubItemComment.create({
              data: {
                subItemId: advancedSub.id,
                type: "STATUS_CHANGE",
                newStatus: "IN_PROGRESS",
                text: "",
                userId,
              },
            });
          }
        }
        // Sync the parent process status from sub-items
        if (fixtures.length > 0) {
          await prisma.projectProcess.upsert({
            where: { projectId_stageKey: { projectId, stageKey: targetKey } },
            update: { status: "IN_PROGRESS" },
            create: { projectId, stageKey: targetKey, status: "IN_PROGRESS" },
          });
        }
      }
    }
  }

  return Response.json(process);
}
