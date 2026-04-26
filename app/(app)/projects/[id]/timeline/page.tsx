import { prisma } from "@/lib/prisma";
import { PROJECT_STAGES } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import TimelineView, { type StageBar, type SubBar } from "./TimelineView";

export const dynamic = "force-dynamic";

const FIXTURE_STAGES = new Set([
  "EQUIPMENT_ORDERED", "CUSTOMER_EQUIPMENT", "VENDOR_QUOTE", "VENDOR_APPROVED",
  "ITEMS_PREPPED", "WIRING_COMPLETE", "FIXTURE_DELIVERED", "DEBUG_FIXTURE",
  "CODING", "CYCLE_RUN", "TESTER_DELIVERED",
]);

const FG_STAGES = new Set(["SAMPLE_DEBUG", "DEBUG"]);

type HistoryEntry = { newStatus: string | null; createdAt: Date };

function resolveStart(status: string, history: HistoryEntry[], updatedAt: Date): string | null {
  if (status === "PENDING") return null;
  const ip = history.find((c) => c.newStatus === "IN_PROGRESS");
  if (ip) return ip.createdAt.toISOString();
  const done = history.find((c) => c.newStatus === "DONE");
  if (done) return done.createdAt.toISOString();
  return updatedAt.toISOString();
}

function resolveEnd(status: string, history: HistoryEntry[], updatedAt: Date): string | null {
  if (status !== "DONE") return null;
  const dones = history.filter((c) => c.newStatus === "DONE");
  if (dones.length > 0) return dones[dones.length - 1].createdAt.toISOString();
  return updatedAt.toISOString();
}

export default async function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      processes: {
        include: {
          comments: {
            where: { type: "STATUS_CHANGE" },
            orderBy: { createdAt: "asc" },
            select: { newStatus: true, createdAt: true },
          },
        },
      },
      fixtures: {
        include: { fgs: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
      subItems: {
        include: {
          comments: {
            where: { type: "STATUS_CHANGE" },
            orderBy: { createdAt: "asc" },
            select: { newStatus: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!project) notFound();

  const processByStage = Object.fromEntries(project.processes.map((p) => [p.stageKey, p]));
  const allFGs = project.fixtures.flatMap((fx) => fx.fgs);

  // Index sub-items: stageKey → refId → sub-item
  const subByStageRef: Record<string, Record<string, typeof project.subItems[0]>> = {};
  for (const si of project.subItems) {
    if (!subByStageRef[si.stageKey]) subByStageRef[si.stageKey] = {};
    subByStageRef[si.stageKey][si.refId] = si;
  }

  const stageBars: StageBar[] = PROJECT_STAGES.map((s) => {
    const proc = processByStage[s.key];
    const hasFixtures = FIXTURE_STAGES.has(s.key) && project.fixtures.length > 0;
    const hasFGs = FG_STAGES.has(s.key) && allFGs.length > 0;
    const stageSubRefs = subByStageRef[s.key] ?? {};

    // Build sub-bars
    const subBars: SubBar[] = [];
    if (hasFixtures) {
      for (const fx of project.fixtures) {
        const si = stageSubRefs[fx.id];
        const siStatus = si?.status ?? "PENDING";
        const siHistory = (si?.comments ?? []) as HistoryEntry[];
        const siUpdatedAt = si?.updatedAt ?? new Date();
        subBars.push({
          key: fx.id,
          label: fx.name,
          status: siStatus,
          startAt: resolveStart(siStatus, siHistory, siUpdatedAt),
          endAt: resolveEnd(siStatus, siHistory, siUpdatedAt),
        });
      }
    } else if (hasFGs) {
      for (const fg of allFGs) {
        const si = stageSubRefs[fg.id];
        const siStatus = si?.status ?? "PENDING";
        const siHistory = (si?.comments ?? []) as HistoryEntry[];
        const siUpdatedAt = si?.updatedAt ?? new Date();
        subBars.push({
          key: fg.id,
          label: `${fg.name} | ${fg.model}`,
          status: siStatus,
          startAt: resolveStart(siStatus, siHistory, siUpdatedAt),
          endAt: resolveEnd(siStatus, siHistory, siUpdatedAt),
        });
      }
    }

    // Derive main bar timing
    let startAt: string | null;
    let endAt: string | null;
    let status: string;

    if (hasFixtures || hasFGs) {
      status = proc?.status ?? "PENDING";
      const activeSubStarts = subBars.map((b) => b.startAt).filter(Boolean) as string[];
      const activeSubEnds = subBars.map((b) => b.endAt).filter(Boolean) as string[];
      const allSubsDone = subBars.length > 0 && subBars.every((b) => b.status === "DONE");
      startAt = activeSubStarts.length > 0
        ? activeSubStarts.reduce((min, d) => (d < min ? d : min))
        : null;
      endAt = allSubsDone && activeSubEnds.length > 0
        ? activeSubEnds.reduce((max, d) => (d > max ? d : max))
        : null;
    } else {
      status = proc?.status ?? "PENDING";
      const history = (proc?.comments ?? []) as HistoryEntry[];
      const updatedAt = proc?.updatedAt ?? new Date();
      startAt = resolveStart(status, history, updatedAt);
      endAt = resolveEnd(status, history, updatedAt);
    }

    return { key: s.key, label: s.label, status, startAt, endAt, subBars };
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/projects/${id}`} className="text-xs text-gray-600 hover:text-red-400 font-mono">
            ← {project.name}
          </Link>
        </div>
        <h1 className="text-xl font-bold text-gray-100">Project Timeline</h1>
        <p className="text-sm text-gray-500">{project.customer}</p>
      </div>
      <TimelineView stageBars={stageBars} />
    </div>
  );
}
