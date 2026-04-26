import { prisma } from "@/lib/prisma";
import { PROJECT_STAGES, stageIndex } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const AUTO_DERIVED = new Set(["EQUIPMENT_ORDERED", "CUSTOMER_EQUIPMENT", "SAMPLE_DEBUG"]);

export default async function ProjectAnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      processes: { orderBy: { createdAt: "asc" } },
      subItems: true,
      fixtures: {
        include: { fgs: true },
        orderBy: { createdAt: "asc" },
      },
      cycleRuns: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
      issues: { orderBy: { createdAt: "desc" } },
      itemIssues: { include: { item: { select: { status: true } } } },
      customerItems: { select: { fixtureId: true, fgId: true, status: true } },
    },
  });
  if (!project) notFound();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const proj = project!;

  // ── Derive statuses (mirrors page.tsx logic) ───────────────────────────────
  const processByStage = Object.fromEntries(proj.processes.map((p) => [p.stageKey, p]));
  const allFGs = proj.fixtures.flatMap((fx) => fx.fgs);

  const issuesByFixture: Record<string, typeof proj.itemIssues> = {};
  for (const iss of proj.itemIssues) {
    if (!issuesByFixture[iss.fixtureId]) issuesByFixture[iss.fixtureId] = [];
    issuesByFixture[iss.fixtureId].push(iss);
  }

  const customerItemsByFixture: Record<string, string[]> = {};
  const sampleItemsByFg: Record<string, string[]> = {};
  for (const ci of proj.customerItems) {
    if (ci.fixtureId) {
      if (!customerItemsByFixture[ci.fixtureId]) customerItemsByFixture[ci.fixtureId] = [];
      customerItemsByFixture[ci.fixtureId].push(ci.status);
    }
    if (ci.fgId) {
      if (!sampleItemsByFg[ci.fgId]) sampleItemsByFg[ci.fgId] = [];
      sampleItemsByFg[ci.fgId].push(ci.status);
    }
  }

  function deriveFixtureEqStatus(fxId: string): string {
    const issues = issuesByFixture[fxId] ?? [];
    if (issues.length === 0) return "DONE";
    if (issues.every((i) => i.item.status !== "PENDING" && i.item.status !== "ORDERED")) return "DONE";
    return "IN_PROGRESS";
  }
  function deriveCustomerEquipStatus(fxId: string): string {
    const statuses = customerItemsByFixture[fxId] ?? [];
    return statuses.length === 0 || statuses.every((s) => s === "RECEIVED") ? "DONE" : "IN_PROGRESS";
  }
  function deriveSampleStatus(fgId: string): string {
    const statuses = sampleItemsByFg[fgId] ?? [];
    return statuses.length === 0 || statuses.every((s) => s === "RECEIVED") ? "DONE" : "IN_PROGRESS";
  }

  function deriveOverall(statuses: string[]): string {
    if (statuses.length === 0) return "PENDING";
    if (statuses.every((s) => s === "DONE")) return "DONE";
    if (statuses.some((s) => s === "IN_PROGRESS")) return "IN_PROGRESS";
    return "PENDING";
  }

  function stageStatus(key: string): string {
    if (key === "EQUIPMENT_ORDERED") {
      return deriveOverall(proj.fixtures.map((fx) => deriveFixtureEqStatus(fx.id)));
    }
    if (key === "CUSTOMER_EQUIPMENT") {
      return deriveOverall(proj.fixtures.map((fx) => deriveCustomerEquipStatus(fx.id)));
    }
    if (key === "SAMPLE_DEBUG") {
      return deriveOverall(allFGs.map((fg) => deriveSampleStatus(fg.id)));
    }
    return processByStage[key]?.status ?? "PENDING";
  }

  // ── Stage summary ───────────────────────────────────────────────────────────
  const stageStatuses = PROJECT_STAGES.map((s) => ({ ...s, status: stageStatus(s.key) }));
  const doneStages = stageStatuses.filter((s) => s.status === "DONE");
  const inProgressStages = stageStatuses.filter((s) => s.status === "IN_PROGRESS");
  const pendingStages = stageStatuses.filter((s) => s.status === "PENDING");
  const completionPct = Math.round((doneStages.length / PROJECT_STAGES.length) * 100);

  // Current stage index in PROJECT_STAGES
  const currentStageIdx = stageIndex(proj.stage);

  // ── Deadlines / bottlenecks ─────────────────────────────────────────────────
  const now = new Date();
  type StageWithDeadline = { key: string; label: string; status: string; deadline: Date; daysLeft: number };
  const withDeadlines: StageWithDeadline[] = [];
  for (const s of PROJECT_STAGES) {
    if (AUTO_DERIVED.has(s.key)) continue;
    const proc = processByStage[s.key];
    if (!proc?.deadline) continue;
    const dl = new Date(proc.deadline);
    const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / 86400000);
    withDeadlines.push({ key: s.key, label: s.label, status: stageStatus(s.key), deadline: dl, daysLeft });
  }
  const overdueStages = withDeadlines.filter((s) => s.daysLeft < 0 && s.status !== "DONE");
  const upcomingStages = withDeadlines
    .filter((s) => s.daysLeft >= 0 && s.status !== "DONE")
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  // ── Tasks & issues ──────────────────────────────────────────────────────────
  const openTasks = proj.tasks.filter((t) => t.status !== "DONE");
  const openIssues = proj.issues.filter((i) => i.status === "OPEN");

  // ── Cycle runs ──────────────────────────────────────────────────────────────
  const totalCycles = proj.cycleRuns.reduce((s, r) => s + r.passCount + r.failCount, 0);
  const totalPass = proj.cycleRuns.reduce((s, r) => s + r.passCount, 0);
  const overallYield = totalCycles > 0 ? Math.round((totalPass / totalCycles) * 100) : null;

  function statusColor(s: string) {
    return s === "DONE" ? "#00cc66" : s === "IN_PROGRESS" ? "#ffaa00" : "#333";
  }
  function dayColor(d: number) {
    return d < 0 ? "#ff4444" : d <= 3 ? "#ffaa00" : "#00cc66";
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
          ← {proj.name}
        </Link>
        <div className="flex-1 red-divider" />
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
          // ANALYZE
        </span>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Complete", value: `${completionPct}%`, color: completionPct === 100 ? "#00cc66" : "#ffaa00" },
          { label: "Done", value: doneStages.length, color: "#00cc66" },
          { label: "In Progress", value: inProgressStages.length, color: "#ffaa00" },
          { label: "Pending", value: pendingStages.length, color: "#444" },
        ].map((s) => (
          <div key={s.label} className="cyber-card cyber-card-red p-4">
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="cyber-card cyber-card-red p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// STAGE PROGRESS</span>
          <span className="text-xs font-mono" style={{ color: "#555" }}>
            {doneStages.length}/{PROJECT_STAGES.length} stages
          </span>
        </div>
        <div className="flex gap-0.5 mb-3">
          {stageStatuses.map((s) => (
            <div
              key={s.key}
              title={`${s.label}: ${s.status}`}
              className="flex-1 h-2 rounded-sm"
              style={{
                background: statusColor(s.status),
                boxShadow: s.status === "IN_PROGRESS" ? "0 0 4px #ffaa0066" : "none",
                opacity: stageIndex(s.key) <= currentStageIdx ? 1 : 0.35,
              }}
            />
          ))}
        </div>

        {/* Stage list */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {stageStatuses.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: statusColor(s.status) }}
              />
              <span
                className="text-xs font-mono truncate"
                style={{ color: s.status === "DONE" ? "#555" : s.status === "IN_PROGRESS" ? "#ffaa00" : "#333" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overdue / bottlenecks */}
        {overdueStages.length > 0 && (
          <div className="cyber-card cyber-card-red">
            <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#ff4444" }}>
                // OVERDUE ({overdueStages.length})
              </span>
            </div>
            <div className="p-4 space-y-2">
              {overdueStages.map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{s.label}</span>
                  <span className="text-xs font-mono" style={{ color: "#ff4444" }}>
                    {Math.abs(s.daysLeft)}d overdue
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming deadlines */}
        {upcomingStages.length > 0 && (
          <div className="cyber-card cyber-card-red">
            <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
                // UPCOMING DEADLINES
              </span>
            </div>
            <div className="p-4 space-y-2">
              {upcomingStages.map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400">{s.label}</span>
                    <span className="text-xs font-mono ml-2" style={{ color: "#555" }}>
                      {s.deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: dayColor(s.daysLeft) }}>
                    {s.daysLeft === 0 ? "today" : `${s.daysLeft}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In-progress stages */}
        {inProgressStages.length > 0 && (
          <div className="cyber-card cyber-card-red">
            <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#ffaa00" }}>
                // IN PROGRESS ({inProgressStages.length})
              </span>
            </div>
            <div className="p-4 space-y-1.5">
              {inProgressStages.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#ffaa00", boxShadow: "0 0 4px #ffaa0066" }} />
                  <span className="text-xs text-gray-300">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixtures & FGs */}
        <div className="cyber-card cyber-card-red">
          <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
              // FIXTURES & FGs
            </span>
          </div>
          <div className="p-4 space-y-3">
            {proj.fixtures.length === 0 && (
              <p className="text-xs" style={{ color: "#444" }}>No fixtures</p>
            )}
            {proj.fixtures.map((fx) => (
              <div key={fx.id}>
                <p className="text-xs font-mono text-gray-300 mb-1">{fx.name}</p>
                {fx.fgs.length === 0 ? (
                  <p className="text-xs ml-3" style={{ color: "#333" }}>No FGs</p>
                ) : (
                  <div className="ml-3 space-y-0.5">
                    {fx.fgs.map((fg) => (
                      <div key={fg.id} className="flex items-center gap-2 text-xs">
                        <span className="font-mono" style={{ color: "#4488ff" }}>{fg.name}</span>
                        <span style={{ color: "#555" }}>·</span>
                        <span className="text-gray-600">{fg.model}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cycle runs */}
      {proj.cycleRuns.length > 0 && (
        <div className="cyber-card cyber-card-red">
          <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
                // CYCLE RUNS
              </span>
              {overallYield !== null && (
                <span
                  className="text-xs font-mono"
                  style={{ color: overallYield >= 95 ? "#00ff88" : overallYield >= 80 ? "#ffaa00" : "#ff4444" }}
                >
                  Overall yield: {overallYield}%
                </span>
              )}
            </div>
          </div>
          <table className="cyber-table">
            <thead>
              <tr><th>FG Type</th><th>Target</th><th>Pass</th><th>Fail</th><th>Yield</th><th>Status</th></tr>
            </thead>
            <tbody>
              {proj.cycleRuns.map((run) => {
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

      {/* Tasks & issues summary */}
      {(openTasks.length > 0 || openIssues.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {openTasks.length > 0 && (
            <div className="cyber-card cyber-card-red">
              <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
                  // OPEN TASKS ({openTasks.length})
                </span>
              </div>
              <div className="p-4 space-y-1">
                {openTasks.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.priority === "CRITICAL" || t.priority === "HIGH" ? "#ff4444" : t.priority === "MEDIUM" ? "#ffaa00" : "#555" }} />
                    <span className="text-xs text-gray-400 truncate">{t.title}</span>
                  </div>
                ))}
                {openTasks.length > 6 && (
                  <p className="text-xs" style={{ color: "#444" }}>+{openTasks.length - 6} more</p>
                )}
              </div>
            </div>
          )}
          {openIssues.length > 0 && (
            <div className="cyber-card cyber-card-red">
              <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
                <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
                  // OPEN ISSUES ({openIssues.length})
                </span>
              </div>
              <div className="p-4 space-y-1">
                {openIssues.slice(0, 6).map((i) => (
                  <div key={i.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: i.priority === "CRITICAL" || i.priority === "HIGH" ? "#ff4444" : i.priority === "MEDIUM" ? "#ffaa00" : "#555" }} />
                    <span className="text-xs text-gray-400 truncate">{i.title}</span>
                  </div>
                ))}
                {openIssues.length > 6 && (
                  <p className="text-xs" style={{ color: "#444" }}>+{openIssues.length - 6} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
