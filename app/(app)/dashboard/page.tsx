import { prisma } from "@/lib/prisma";
import { PROJECT_STAGES, stageIndex } from "@/lib/utils";
import Link from "next/link";
import { AlertTriangle, FolderKanban, Monitor, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [projects, issues, testers] = await Promise.all([
    prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.issue.findMany({
      where: { status: { not: "RESOLVED" } },
      include: { project: true },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.tester.findMany(),
  ]);

  const running = testers.filter(
    (t) => t.isRunning && t.lastSeen && Date.now() - new Date(t.lastSeen).getTime() < 60000
  ).length;

  const stageCounts: Record<string, number> = {};
  for (const p of projects) {
    stageCounts[p.stage] = (stageCounts[p.stage] ?? 0) + 1;
  }

  const priorityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const sortedIssues = issues.sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
          // LEADER OVERVIEW
        </span>
        <div className="flex-1 red-divider" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Projects", value: projects.length, icon: <FolderKanban size={18} />, color: "#ff4444" },
          { label: "Open Issues",     value: issues.length,   icon: <AlertTriangle size={18} />, color: "#ffaa00" },
          { label: "Testers Online",  value: running,         icon: <Monitor size={18} />,       color: "#00ff88" },
          { label: "Delivered",       value: projects.filter(p => p.stage === "TESTER_DELIVERED" || p.stage === "PRODUCTION_FOLLOWUP").length, icon: <TrendingUp size={18} />, color: "#4488ff" },
        ].map((s) => (
          <div key={s.label} className="cyber-card cyber-card-red p-4">
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: s.color, opacity: 0.7 }}>{s.icon}</span>
              <span
                className="text-3xl font-bold"
                style={{ color: s.color, fontFamily: "var(--font-geist-mono)", textShadow: `0 0 12px ${s.color}66` }}
              >
                {s.value}
              </span>
            </div>
            <p className="text-xs uppercase tracking-widest text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Projects */}
        <div className="cyber-card cyber-card-red">
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <span className="text-xs uppercase tracking-widest" style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)" }}>
              Projects
            </span>
            <Link href="/projects" className="text-xs text-gray-600 hover:text-red-500">view all →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: "#111" }}>
            {projects.slice(0, 6).map((p) => {
              const idx = stageIndex(p.stage);
              const pct = Math.round(((idx + 1) / PROJECT_STAGES.length) * 100);
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-red-950/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{p.name}</p>
                    <p className="text-xs text-gray-600 truncate">{p.customer}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono" style={{ color: "#cc0000" }}>
                      {PROJECT_STAGES[idx]?.label ?? p.stage}
                    </p>
                    <div className="flex gap-0.5 mt-1">
                      {PROJECT_STAGES.map((_, i) => (
                        <div
                          key={i}
                          className="stage-pip"
                          style={{
                            background: i < idx ? "#440000" : i === idx ? "#cc0000" : "#1a0a0a",
                            boxShadow: i === idx ? "0 0 4px #cc0000" : "none",
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5 font-mono">{pct}%</p>
                  </div>
                </Link>
              );
            })}
            {projects.length === 0 && (
              <p className="text-xs text-gray-700 px-5 py-6 text-center">No projects yet</p>
            )}
          </div>
        </div>

        {/* Issues */}
        <div className="cyber-card cyber-card-red">
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <span className="text-xs uppercase tracking-widest" style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)" }}>
              Open Issues
            </span>
            <Link href="/issues" className="text-xs text-gray-600 hover:text-red-500">view all →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: "#111" }}>
            {sortedIssues.slice(0, 7).map((issue) => (
              <div key={issue.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`badge mt-0.5 shrink-0 ${
                  issue.priority === "CRITICAL" || issue.priority === "HIGH" ? "badge-red" :
                  issue.priority === "MEDIUM" ? "badge-yellow" : "badge-gray"
                }`}>
                  {issue.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{issue.title}</p>
                  <p className="text-xs text-gray-600 truncate">{issue.project.name}</p>
                </div>
              </div>
            ))}
            {sortedIssues.length === 0 && (
              <p className="text-xs text-gray-700 px-5 py-6 text-center">No open issues</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
