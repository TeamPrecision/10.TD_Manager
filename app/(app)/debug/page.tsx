import { prisma } from "@/lib/prisma";
import { priorityColor, statusColor } from "@/lib/utils";
import Link from "next/link";
import { GitBranch, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      issues: { where: { status: { not: "RESOLVED" } }, orderBy: [{ priority: "asc" }] },
      svnLinks: { where: { category: { in: ["debug_result", "wiring_diagram", "test_spec"] } }, orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
          // DEBUG PANEL
        </span>
        <div className="flex-1 red-divider" />
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="cyber-card cyber-card-red">
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
              <div>
                <Link href={`/projects/${project.id}`} className="text-sm font-semibold text-gray-100 hover:text-red-400">
                  {project.name}
                </Link>
                <span className="text-xs text-gray-600 ml-3">{project.customer}</span>
              </div>
              <span className="badge badge-gray font-mono text-xs">{project.stage.replace(/_/g, " ")}</span>
            </div>

            <div className="grid grid-cols-2 gap-0 divide-x" style={{ borderColor: "#111" }}>
              {/* Issues */}
              <div className="p-4">
                <p className="text-xs font-mono mb-3" style={{ color: "#cc0000" }}>
                  OPEN ISSUES ({project.issues.length})
                </p>
                <div className="space-y-2">
                  {project.issues.slice(0, 4).map((issue) => (
                    <div key={issue.id} className="flex items-center gap-2">
                      <span className={`badge ${priorityColor(issue.priority)}`}>{issue.priority[0]}</span>
                      <span className="text-xs text-gray-300 truncate">{issue.title}</span>
                    </div>
                  ))}
                  {project.issues.length === 0 && <p className="text-xs text-gray-700">No open issues</p>}
                </div>
              </div>

              {/* SVN Links */}
              <div className="p-4">
                <p className="text-xs font-mono mb-3" style={{ color: "#cc0000" }}>
                  <GitBranch size={11} className="inline mr-1" />
                  SVN RESULTS
                </p>
                <div className="space-y-2">
                  {project.svnLinks.slice(0, 4).map((link) => (
                    <div key={link.id} className="flex items-center gap-2">
                      <ExternalLink size={11} style={{ color: "#440000", flexShrink: 0 }} />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 truncate"
                      >
                        {link.label}
                      </a>
                      {link.revision && (
                        <span className="text-xs font-mono text-gray-700 shrink-0">r{link.revision}</span>
                      )}
                    </div>
                  ))}
                  {project.svnLinks.length === 0 && (
                    <p className="text-xs text-gray-700">No SVN links — add via project detail</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="cyber-card cyber-card-red p-12 text-center">
            <p className="text-gray-600 font-mono text-sm">NO PROJECTS ASSIGNED</p>
          </div>
        )}
      </div>
    </div>
  );
}
