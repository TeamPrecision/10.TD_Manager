import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CodingPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      cycleRuns: { orderBy: { createdAt: "desc" } },
      testers: true,
      svnLinks: { where: { category: "graph" } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
          // CODING &amp; CYCLE RUN PANEL
        </span>
        <div className="flex-1 red-divider" />
      </div>

      <div className="space-y-4">
        {projects.map((project) => {
          const activeTesters = project.testers.filter(t =>
            t.isRunning && t.lastSeen && Date.now() - new Date(t.lastSeen).getTime() < 60000
          );
          return (
            <div key={project.id} className="cyber-card cyber-card-red">
              <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
                <div>
                  <Link href={`/projects/${project.id}`} className="text-sm font-semibold text-gray-100 hover:text-red-400">
                    {project.name}
                  </Link>
                  <span className="text-xs text-gray-600 ml-3">{project.customer}</span>
                </div>
                <div className="flex items-center gap-3">
                  {activeTesters.length > 0 && (
                    <span className="badge badge-green">{activeTesters.length} TESTER ACTIVE</span>
                  )}
                  <span className="badge badge-gray font-mono text-xs">{project.stage.replace(/_/g, " ")}</span>
                </div>
              </div>

              {/* Cycle runs table */}
              {project.cycleRuns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="cyber-table">
                    <thead>
                      <tr>
                        <th>FG Type</th>
                        <th>Target</th>
                        <th>Pass</th>
                        <th>Fail</th>
                        <th>Yield</th>
                        <th>Status</th>
                        <th>Graph</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.cycleRuns.map((run) => {
                        const total = run.passCount + run.failCount;
                        const y = total > 0 ? Math.round((run.passCount / total) * 100) : null;
                        const graph = project.svnLinks.find(l => l.label.includes(run.fgType));
                        return (
                          <tr key={run.id}>
                            <td className="font-mono text-sm text-gray-200">{run.fgType}</td>
                            <td className="font-mono text-sm">{run.targetCount}</td>
                            <td className="font-mono text-sm text-green-400">{run.passCount}</td>
                            <td className="font-mono text-sm text-red-400">{run.failCount}</td>
                            <td className="font-mono text-sm" style={{ color: y !== null ? (y >= 95 ? "#00ff88" : y >= 80 ? "#ffaa00" : "#ff4444") : "#555" }}>
                              {y !== null ? `${y}%` : "—"}
                            </td>
                            <td><span className={`badge ${run.status === "DONE" ? "badge-green" : "badge-yellow"}`}>{run.status}</span></td>
                            <td>
                              {graph ? (
                                <a href={graph.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                  <ExternalLink size={12} />
                                </a>
                              ) : <span className="text-gray-700">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-700 px-5 py-4">No cycle runs recorded yet</p>
              )}
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="cyber-card cyber-card-red p-12 text-center">
            <p className="text-gray-600 font-mono text-sm">NO PROJECTS</p>
          </div>
        )}
      </div>
    </div>
  );
}
