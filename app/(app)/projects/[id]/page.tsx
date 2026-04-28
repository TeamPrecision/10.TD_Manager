import { prisma } from "@/lib/prisma";
import { PROJECT_STAGES } from "@/lib/utils";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import ProcessList from "./ProcessList";
import FixtureManager from "./FixtureManager";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const role = session?.user?.role ?? "MEMBER";
  const subRole = session?.user?.subRole ?? null;
  const canEdit = role === "LEADER" || subRole !== "PURCHASING";
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      processes: {
        include: {
          comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
          links: { include: { addedBy: true }, orderBy: { createdAt: "asc" } },
          files: { orderBy: { createdAt: "asc" } },
        },
      },
      fixtures: {
        include: { fgs: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
      subItems: {
        include: {
          comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
          links: { include: { addedBy: true }, orderBy: { createdAt: "asc" } },
        },
      },
      cycleRuns: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) notFound();

  // Fetch item issues to derive EQUIPMENT_ORDERED status per fixture
  const itemIssues = await prisma.itemIssue.findMany({
    where: { projectId: id },
    include: { item: { select: { status: true } } },
  });
  const issuesByFixture: Record<string, typeof itemIssues> = {};
  for (const iss of itemIssues) {
    if (!issuesByFixture[iss.fixtureId]) issuesByFixture[iss.fixtureId] = [];
    issuesByFixture[iss.fixtureId].push(iss);
  }

  const processByStage = Object.fromEntries(project.processes.map((p) => [p.stageKey, p]));

  const allFGs = project.fixtures.flatMap((fx) => fx.fgs);

  type SubItemEntry = {
    id: string;
    refId: string;
    status: string;
    deadline: Date | null;
    comments: { id: string; text: string; createdAt: Date; user: { name: string } | null; type: string; newStatus: string | null }[];
    links: { id: string; label: string; url: string; revision: string | null; addedBy: { name: string } | null }[];
  };

  const subItemsByStage: Record<string, SubItemEntry[]> = {};

  for (const si of project.subItems) {
    if (!subItemsByStage[si.stageKey]) subItemsByStage[si.stageKey] = [];
    subItemsByStage[si.stageKey].push({
      id: si.id,
      refId: si.refId,
      status: si.status,
      deadline: si.deadline,
      comments: si.comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        user: c.user ? { name: c.user.name } : null,
        type: c.type ?? "COMMENT",
        newStatus: c.newStatus ?? null,
      })),
      links: si.links.map((l) => ({
        id: l.id,
        label: l.label,
        url: l.url,
        revision: l.revision,
        addedBy: l.addedBy ? { name: l.addedBy.name } : null,
      })),
    });
  }

  // Override EQUIPMENT_ORDERED sub-items with status derived from item issues
  subItemsByStage["EQUIPMENT_ORDERED"] = project.fixtures.map((fx) => {
    const issues = issuesByFixture[fx.id] ?? [];
    let status: string;
    if (issues.length === 0) {
      status = "DONE";
    } else if (issues.every((iss) => iss.item.status !== "PENDING" && iss.item.status !== "ORDERED")) {
      status = "DONE";
    } else {
      status = "IN_PROGRESS";
    }
    return { id: `eq-${fx.id}`, refId: fx.id, status, deadline: null, comments: [], links: [] };
  });

  // Fetch customer items — derive CUSTOMER_EQUIPMENT (by fixture) and SAMPLE_DEBUG (by fg)
  const customerItems = await prisma.customerItem.findMany({
    where: { projectId: id },
    select: { fixtureId: true, fgId: true, status: true },
  });
  const customerItemsByFixture: Record<string, { status: string }[]> = {};
  const sampleItemsByFg: Record<string, { status: string }[]> = {};
  for (const ci of customerItems) {
    if (ci.fixtureId) {
      if (!customerItemsByFixture[ci.fixtureId]) customerItemsByFixture[ci.fixtureId] = [];
      customerItemsByFixture[ci.fixtureId].push({ status: ci.status });
    }
    if (ci.fgId) {
      if (!sampleItemsByFg[ci.fgId]) sampleItemsByFg[ci.fgId] = [];
      sampleItemsByFg[ci.fgId].push({ status: ci.status });
    }
  }
  subItemsByStage["CUSTOMER_EQUIPMENT"] = project.fixtures.map((fx) => {
    const citems = customerItemsByFixture[fx.id] ?? [];
    const status =
      citems.length === 0 || citems.every((ci) => ci.status === "RECEIVED") ? "DONE" : "IN_PROGRESS";
    return { id: `ce-${fx.id}`, refId: fx.id, status, deadline: null, comments: [], links: [] };
  });
  subItemsByStage["SAMPLE_DEBUG"] = allFGs.map((fg) => {
    const citems = sampleItemsByFg[fg.id] ?? [];
    const status =
      citems.length === 0 || citems.every((ci) => ci.status === "RECEIVED") ? "DONE" : "IN_PROGRESS";
    return { id: `sb-${fg.id}`, refId: fg.id, status, deadline: null, comments: [], links: [] };
  });

  // Compute a single derived status for auto-derived stages (mirrors ProcessCard's deriveStatus)
  function deriveOverall(subs: SubItemEntry[]): string {
    if (subs.length === 0) return "PENDING";
    if (subs.every((s) => s.status === "DONE")) return "DONE";
    if (subs.some((s) => s.status === "IN_PROGRESS")) return "IN_PROGRESS";
    return "PENDING";
  }
  const overriddenStages: Record<string, string> = {
    EQUIPMENT_ORDERED: deriveOverall(subItemsByStage["EQUIPMENT_ORDERED"] ?? []),
    CUSTOMER_EQUIPMENT: deriveOverall(subItemsByStage["CUSTOMER_EQUIPMENT"] ?? []),
    SAMPLE_DEBUG: deriveOverall(subItemsByStage["SAMPLE_DEBUG"] ?? []),
  };
  function stageStatus(key: string): string {
    return overriddenStages[key] ?? processByStage[key]?.status ?? "PENDING";
  }

  const totalStages = PROJECT_STAGES.length;
  const doneCount = PROJECT_STAGES.filter((s) => stageStatus(s.key) === "DONE").length;
  const inProgressCount = PROJECT_STAGES.filter((s) => stageStatus(s.key) === "IN_PROGRESS").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/projects" className="text-xs text-gray-600 hover:text-red-400 font-mono">← projects</Link>
          <span className="flex-1" />
          <Link
            href={`/projects/${project.id}/analyze`}
            className="text-xs font-mono px-3 py-1 rounded border transition-colors hover:border-red-600 hover:text-red-400"
            style={{ color: "#555", borderColor: "#333" }}
          >
            Analyze
          </Link>
        </div>
        <h1 className="text-xl font-bold text-gray-100">{project.name}</h1>
        <p className="text-sm text-gray-500">{project.customer}</p>
        <FixtureManager projectId={project.id} fixtures={project.fixtures} canEdit={canEdit} />
      </div>

      {/* Processes */}
      <div className="cyber-card cyber-card-red">
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// PROCESSES</span>
          <div className="flex items-center gap-3 text-xs font-mono">
            {inProgressCount > 0 && <span style={{ color: "#ffaa00" }}>{inProgressCount} in progress</span>}
            <span style={{ color: "#00cc66" }}>{doneCount}/{totalStages} done</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
          <div className="flex gap-0.5">
            {PROJECT_STAGES.map((s) => {
              const status = stageStatus(s.key);
              return (
                <div
                  key={s.key}
                  className="flex-1 h-1.5 rounded-sm"
                  title={`${s.label}: ${status}`}
                  style={{
                    background: status === "DONE" ? "#00cc66" : status === "IN_PROGRESS" ? "#ffaa00" : "#1a0a0a",
                    boxShadow: status === "IN_PROGRESS" ? "0 0 4px #ffaa0066" : "none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Column header */}
        <div
          className="flex items-center gap-3 px-5 py-2 border-b text-xs font-mono uppercase tracking-wider"
          style={{ borderColor: "#1a0505", color: "#444" }}
        >
          <span className="w-2.5 shrink-0" />
          <span className="w-44 shrink-0">Process</span>
          <span className="w-24 shrink-0">Status</span>
          <span className="w-28 shrink-0">Deadline</span>
          <span className="w-16 shrink-0 text-right">Days Left</span>
          <span className="flex-1" />
        </div>

        <ProcessList
          projectId={project.id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          processByStage={processByStage as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fixtures={project.fixtures as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allFGs={allFGs as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subItemsByStage={subItemsByStage as any}
          canEdit={canEdit}
        />
      </div>

      {/* Cycle Runs */}
      {project.cycleRuns.length > 0 && (
        <div className="cyber-card cyber-card-red">
          <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>Cycle Runs</span>
          </div>
          <table className="cyber-table">
            <thead>
              <tr><th>FG Type</th><th>Target</th><th>Pass</th><th>Fail</th><th>Yield</th><th>Status</th></tr>
            </thead>
            <tbody>
              {project.cycleRuns.map((run) => {
                const total = run.passCount + run.failCount;
                const y = total > 0 ? Math.round((run.passCount / total) * 100) : null;
                return (
                  <tr key={run.id}>
                    <td className="font-mono">{run.fgType}</td>
                    <td className="font-mono">{run.targetCount}</td>
                    <td className="text-green-400 font-mono">{run.passCount}</td>
                    <td className="text-red-400 font-mono">{run.failCount}</td>
                    <td className="font-mono" style={{ color: y !== null ? (y >= 95 ? "#00ff88" : y >= 80 ? "#ffaa00" : "#ff4444") : "#555" }}>
                      {y !== null ? `${y}%` : "—"}
                    </td>
                    <td><span className={`badge ${run.status === "DONE" ? "badge-green" : "badge-yellow"}`}>{run.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
