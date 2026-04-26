import { prisma } from "@/lib/prisma";
import { PROJECT_STAGES, stageIndex } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const AUTO_DERIVED = new Set(["EQUIPMENT_ORDERED", "CUSTOMER_EQUIPMENT", "SAMPLE_DEBUG"]);

export default async function ProjectsAnalyzePage() {
  const projects = await prisma.project.findMany({
    include: {
      processes: { select: { stageKey: true, status: true, deadline: true } },
      fixtures: {
        select: {
          id: true,
          fgs: { select: { id: true } },
          itemIssues: { include: { item: { select: { status: true } } } },
          customerItems: { select: { status: true, fgId: true } },
        },
      },
      cycleRuns: { select: { passCount: true, failCount: true } },
      tasks: { select: { status: true } },
      issues: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Per-project status computation ─────────────────────────────────────────
  function deriveStageStatus(proj: typeof projects[0], key: string): string {
    if (key === "EQUIPMENT_ORDERED") {
      const statuses = proj.fixtures.map((fx) => {
        const issues = fx.itemIssues;
        if (issues.length === 0) return "DONE";
        if (issues.every((i) => i.item.status !== "PENDING" && i.item.status !== "ORDERED")) return "DONE";
        return "IN_PROGRESS";
      });
      if (statuses.length === 0) return "PENDING";
      if (statuses.every((s) => s === "DONE")) return "DONE";
      if (statuses.some((s) => s === "IN_PROGRESS")) return "IN_PROGRESS";
      return "PENDING";
    }
    if (key === "CUSTOMER_EQUIPMENT") {
      const statuses = proj.fixtures.map((fx) => {
        const citems = fx.customerItems.filter((ci) => !ci.fgId);
        return citems.length === 0 || citems.every((ci) => ci.status === "RECEIVED") ? "DONE" : "IN_PROGRESS";
      });
      if (statuses.length === 0) return "PENDING";
      if (statuses.every((s) => s === "DONE")) return "DONE";
      if (statuses.some((s) => s === "IN_PROGRESS")) return "IN_PROGRESS";
      return "PENDING";
    }
    if (key === "SAMPLE_DEBUG") {
      const allFgIds = proj.fixtures.flatMap((fx) => fx.fgs.map((fg) => fg.id));
      const statuses = allFgIds.map((fgId) => {
        const citems = proj.fixtures.flatMap((fx) => fx.customerItems.filter((ci) => ci.fgId === fgId));
        return citems.length === 0 || citems.every((ci) => ci.status === "RECEIVED") ? "DONE" : "IN_PROGRESS";
      });
      if (statuses.length === 0) return "PENDING";
      if (statuses.every((s) => s === "DONE")) return "DONE";
      if (statuses.some((s) => s === "IN_PROGRESS")) return "IN_PROGRESS";
      return "PENDING";
    }
    const proc = proj.processes.find((p) => p.stageKey === key);
    return proc?.status ?? "PENDING";
  }

  const projectStats = projects.map((p) => {
    const stageSts = PROJECT_STAGES.map((s) => ({ key: s.key, label: s.label, status: deriveStageStatus(p, s.key) }));
    const done = stageSts.filter((s) => s.status === "DONE").length;
    const inProg = stageSts.filter((s) => s.status === "IN_PROGRESS").length;
    const pct = Math.round((done / PROJECT_STAGES.length) * 100);
    const openTasks = p.tasks.filter((t) => t.status !== "DONE").length;
    const openIssues = p.issues.filter((i) => i.status === "OPEN").length;
    const totalCycles = p.cycleRuns.reduce((s, r) => s + r.passCount + r.failCount, 0);
    const totalPass = p.cycleRuns.reduce((s, r) => s + r.passCount, 0);
    const yld = totalCycles > 0 ? Math.round((totalPass / totalCycles) * 100) : null;
    // Nearest deadline for in-progress or pending non-auto stages
    const deadlines = p.processes
      .filter((pr) => pr.deadline && pr.status !== "DONE" && !AUTO_DERIVED.has(pr.stageKey))
      .map((pr) => new Date(pr.deadline!));
    const nearestDl = deadlines.length > 0 ? new Date(Math.min(...deadlines.map((d) => d.getTime()))) : null;
    const daysLeft = nearestDl ? Math.ceil((nearestDl.getTime() - Date.now()) / 86400000) : null;
    return { ...p, pct, done, inProg, openTasks, openIssues, yld, daysLeft, stageSts };
  });

  // ── Aggregate stats ────────────────────────────────────────────────────────
  const totalProjects = projects.length;
  const fullyDone = projectStats.filter((p) => p.pct === 100).length;
  const inProgress = projectStats.filter((p) => p.pct > 0 && p.pct < 100).length;
  const notStarted = projectStats.filter((p) => p.pct === 0).length;
  const overdue = projectStats.filter((p) => p.daysLeft !== null && p.daysLeft < 0).length;

  // Stage completion across all projects
  const stageCompletion = PROJECT_STAGES.map((s) => {
    const done = projectStats.filter((p) => p.stageSts.find((st) => st.key === s.key)?.status === "DONE").length;
    const inProg = projectStats.filter((p) => p.stageSts.find((st) => st.key === s.key)?.status === "IN_PROGRESS").length;
    return { ...s, done, inProg, pct: totalProjects > 0 ? Math.round((done / totalProjects) * 100) : 0 };
  });

  function statusColor(s: string) {
    return s === "DONE" ? "#00cc66" : s === "IN_PROGRESS" ? "#ffaa00" : "#333";
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
          ← projects
        </Link>
        <div className="flex-1 red-divider" />
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
          // ALL PROJECTS ANALYZE
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Projects", value: totalProjects, color: "#555" },
          { label: "Completed", value: fullyDone, color: "#00cc66" },
          { label: "In Progress", value: inProgress, color: "#ffaa00" },
          { label: "Overdue", value: overdue, color: overdue > 0 ? "#ff4444" : "#555" },
        ].map((s) => (
          <div key={s.label} className="cyber-card cyber-card-red p-4">
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Stage completion heatmap */}
      <div className="cyber-card cyber-card-red">
        <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
            // STAGE COMPLETION ACROSS ALL PROJECTS
          </span>
        </div>
        <div className="p-4 space-y-1.5">
          {stageCompletion.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-600 w-36 shrink-0 truncate" title={s.label}>{s.label}</span>
              <div className="flex-1 flex gap-0.5">
                {projects.map((_, i) => {
                  const st = projectStats[i].stageSts.find((x) => x.key === s.key)?.status ?? "PENDING";
                  return (
                    <div
                      key={i}
                      className="flex-1 h-3 rounded-sm"
                      title={`${projectStats[i].name}: ${st}`}
                      style={{
                        background: statusColor(st),
                        opacity: st === "PENDING" ? 0.15 : 1,
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-mono w-8 text-right shrink-0" style={{ color: s.pct === 100 ? "#00cc66" : s.pct > 0 ? "#ffaa00" : "#444" }}>
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="px-5 pb-3 flex items-center gap-4 text-xs font-mono" style={{ color: "#444" }}>
          {projects.slice(0, 8).map((p, i) => (
            <span key={p.id} style={{ color: "#555" }}>{i + 1}={p.name.slice(0, 8)}</span>
          ))}
          {projects.length > 8 && <span>…</span>}
        </div>
      </div>

      {/* Per-project progress table */}
      <div className="cyber-card cyber-card-red">
        <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
            // PROJECT PROGRESS
          </span>
        </div>
        <table className="cyber-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Customer</th>
              <th>Progress</th>
              <th className="text-right">Done</th>
              <th className="text-right">In Prog</th>
              <th className="text-right">Yield</th>
              <th className="text-right">Tasks</th>
              <th className="text-right">Issues</th>
              <th className="text-right">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {projectStats.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/projects/${p.id}`} className="hover:text-red-400 transition-colors text-gray-100">
                    {p.name}
                  </Link>
                </td>
                <td className="text-gray-500 text-xs">{p.customer}</td>
                <td style={{ minWidth: "100px" }}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 flex-1">
                      {p.stageSts.map((s) => (
                        <div
                          key={s.key}
                          className="flex-1 h-1.5 rounded-sm"
                          style={{ background: statusColor(s.status), opacity: s.status === "PENDING" ? 0.12 : 1 }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-mono shrink-0" style={{ color: p.pct === 100 ? "#00cc66" : "#888", minWidth: "32px", textAlign: "right" }}>
                      {p.pct}%
                    </span>
                  </div>
                </td>
                <td className="font-mono text-right text-green-400">{p.done}</td>
                <td className="font-mono text-right" style={{ color: p.inProg > 0 ? "#ffaa00" : "#555" }}>{p.inProg}</td>
                <td className="font-mono text-right" style={{ color: p.yld === null ? "#555" : p.yld >= 95 ? "#00ff88" : p.yld >= 80 ? "#ffaa00" : "#ff4444" }}>
                  {p.yld !== null ? `${p.yld}%` : "—"}
                </td>
                <td className="font-mono text-right" style={{ color: p.openTasks > 0 ? "#ffaa00" : "#555" }}>{p.openTasks}</td>
                <td className="font-mono text-right" style={{ color: p.openIssues > 0 ? "#ff4444" : "#555" }}>{p.openIssues}</td>
                <td className="font-mono text-right text-xs" style={{ color: p.daysLeft === null ? "#555" : p.daysLeft < 0 ? "#ff4444" : p.daysLeft <= 7 ? "#ffaa00" : "#888" }}>
                  {p.daysLeft === null ? "—" : p.daysLeft < 0 ? `${Math.abs(p.daysLeft)}d over` : `${p.daysLeft}d`}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray-700 py-8">No projects found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stage bottlenecks — most-blocked stages */}
      <div className="cyber-card cyber-card-red">
        <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
            // STAGE BOTTLENECKS (most in-progress)
          </span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stageCompletion
              .filter((s) => s.inProg > 0)
              .sort((a, b) => b.inProg - a.inProg)
              .slice(0, 8)
              .map((s) => (
                <div key={s.key} className="cyber-card p-3" style={{ border: "1px solid #1a0505", background: "#060404" }}>
                  <p className="text-xs font-mono text-gray-400 truncate">{s.label}</p>
                  <p className="text-lg font-bold font-mono mt-1" style={{ color: "#ffaa00" }}>{s.inProg}</p>
                  <p className="text-xs font-mono" style={{ color: "#444" }}>projects</p>
                </div>
              ))}
            {stageCompletion.every((s) => s.inProg === 0) && (
              <p className="text-xs col-span-4" style={{ color: "#444" }}>No stages currently in progress</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
