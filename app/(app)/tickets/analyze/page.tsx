import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

function Bar({ value, max, color = "#cc0000" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 h-2 rounded" style={{ background: "#1a0505" }}>
      <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: color, minWidth: value > 0 ? 4 : 0 }} />
    </div>
  );
}

export default async function TicketsAnalyzePage() {
  const tickets = await prisma.issue.findMany({
    include: {
      project: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true } } } },
      comments: { where: { type: "STATUS_CHANGE", newStatus: "RESOLVED" }, orderBy: { createdAt: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "OPEN").length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const resolved = tickets.filter((t) => t.status === "RESOLVED").length;

  // By type
  const byType: Record<string, number> = {};
  for (const t of tickets) { byType[t.type] = (byType[t.type] ?? 0) + 1; }
  const maxType = Math.max(...Object.values(byType), 1);

  // By priority
  const byPriority: Record<string, number> = {};
  for (const t of tickets) { byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1; }
  const PRIO_COLOR: Record<string, string> = { CRITICAL: "#ff2222", HIGH: "#ff6600", MEDIUM: "#ffaa00", LOW: "#555" };

  // By project
  const byProject: Record<string, { name: string; open: number; total: number }> = {};
  for (const t of tickets) {
    const k = t.projectId;
    if (!byProject[k]) byProject[k] = { name: t.project.name, open: 0, total: 0 };
    byProject[k].total++;
    if (t.status !== "RESOLVED") byProject[k].open++;
  }
  const topProjects = Object.values(byProject).sort((a, b) => b.total - a.total).slice(0, 10);
  const maxProjTotal = Math.max(...topProjects.map((p) => p.total), 1);

  // Workload per assignee
  const byAssignee: Record<string, { name: string; open: number; inProgress: number; resolved: number }> = {};
  for (const t of tickets) {
    for (const a of t.assignees) {
      const k = a.user.id;
      if (!byAssignee[k]) byAssignee[k] = { name: a.user.name, open: 0, inProgress: 0, resolved: 0 };
      if (t.status === "OPEN") byAssignee[k].open++;
      else if (t.status === "IN_PROGRESS") byAssignee[k].inProgress++;
      else byAssignee[k].resolved++;
    }
  }
  const assigneeList = Object.values(byAssignee).sort((a, b) => (b.open + b.inProgress) - (a.open + a.inProgress));
  const maxAssignee = Math.max(...assigneeList.map((a) => a.open + a.inProgress + a.resolved), 1);

  // Average time to resolve (ms)
  const resolveTimes: number[] = [];
  for (const t of tickets) {
    if (t.status === "RESOLVED" && t.comments.length > 0) {
      const resolvedAt = new Date(t.comments[0].createdAt).getTime();
      const createdAt = new Date(t.createdAt).getTime();
      resolveTimes.push(resolvedAt - createdAt);
    }
  }
  const avgMs = resolveTimes.length > 0 ? resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length : null;
  const avgDays = avgMs !== null ? (avgMs / 86400000).toFixed(1) : null;

  // Monthly ticket creation
  const byMonth: Record<string, { open: number; resolved: number }> = {};
  for (const t of tickets) {
    const month = new Date(t.createdAt).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    if (!byMonth[month]) byMonth[month] = { open: 0, resolved: 0 };
    if (t.status === "RESOLVED") byMonth[month].resolved++;
    else byMonth[month].open++;
  }
  const months = Object.entries(byMonth).slice(-12);
  const maxMonth = Math.max(...months.map(([, v]) => v.open + v.resolved), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tickets" className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
          <ChevronLeft size={12} /> Tickets
        </Link>
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>// TICKET ANALYSIS</span>
        <div className="flex-1 red-divider" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, color: "#888" },
          { label: "Open", value: open, color: "#ffaa00" },
          { label: "In Progress", value: inProgress, color: "#4488ff" },
          { label: "Resolved", value: resolved, color: "#00cc66" },
        ].map(({ label, value, color }) => (
          <div key={label} className="cyber-card cyber-card-red px-4 py-3 text-center">
            <p className="text-2xl font-mono font-bold" style={{ color }}>{value}</p>
            <p className="text-xs font-mono mt-1" style={{ color: "#555" }}>{label}</p>
          </div>
        ))}
      </div>
      {avgDays && (
        <div className="text-xs font-mono text-center" style={{ color: "#555" }}>
          Avg. time to resolve: <span style={{ color: "#888" }}>{avgDays} days</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By type */}
        <div className="cyber-card cyber-card-red p-4">
          <p className="text-xs font-mono mb-3" style={{ color: "#cc0000" }}>// BY TYPE</p>
          <div className="space-y-2">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-xs font-mono w-24 shrink-0" style={{ color: "#666" }}>{type}</span>
                <Bar value={count} max={maxType} color="#cc0000" />
                <span className="text-xs font-mono w-6 text-right shrink-0" style={{ color: "#888" }}>{count}</span>
              </div>
            ))}
            {Object.keys(byType).length === 0 && <p className="text-xs font-mono" style={{ color: "#333" }}>No data</p>}
          </div>
        </div>

        {/* By priority */}
        <div className="cyber-card cyber-card-red p-4">
          <p className="text-xs font-mono mb-3" style={{ color: "#cc0000" }}>// BY PRIORITY</p>
          <div className="space-y-2">
            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].filter((p) => byPriority[p]).map((p) => (
              <div key={p} className="flex items-center gap-3">
                <span className="text-xs font-mono w-20 shrink-0" style={{ color: PRIO_COLOR[p] }}>{p}</span>
                <Bar value={byPriority[p] ?? 0} max={Math.max(...Object.values(byPriority), 1)} color={PRIO_COLOR[p]} />
                <span className="text-xs font-mono w-6 text-right shrink-0" style={{ color: "#888" }}>{byPriority[p] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By project */}
        <div className="cyber-card cyber-card-red p-4">
          <p className="text-xs font-mono mb-3" style={{ color: "#cc0000" }}>// BY PROJECT</p>
          <div className="space-y-2">
            {topProjects.map(({ name, open: o, total: tot }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs font-mono truncate" style={{ color: "#666", width: 100, flexShrink: 0 }} title={name}>{name}</span>
                <Bar value={tot} max={maxProjTotal} color="#cc0000" />
                <span className="text-xs font-mono shrink-0" style={{ color: o > 0 ? "#ffaa00" : "#555" }}>{o}/{tot}</span>
              </div>
            ))}
            {topProjects.length === 0 && <p className="text-xs font-mono" style={{ color: "#333" }}>No data</p>}
          </div>
        </div>

        {/* Workload per person */}
        <div className="cyber-card cyber-card-red p-4">
          <p className="text-xs font-mono mb-3" style={{ color: "#cc0000" }}>// WORKLOAD</p>
          <div className="space-y-2">
            {assigneeList.map(({ name, open: o, inProgress: ip, resolved: r }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs font-mono w-24 shrink-0 truncate" style={{ color: "#666" }}>{name}</span>
                <div className="flex-1 flex gap-0.5 h-4">
                  {o > 0 && <div className="rounded-sm" style={{ flex: o, background: "#ffaa0060", border: "1px solid #ffaa0040" }} title={`${o} open`} />}
                  {ip > 0 && <div className="rounded-sm" style={{ flex: ip, background: "#4488ff60", border: "1px solid #4488ff40" }} title={`${ip} in progress`} />}
                  {r > 0 && <div className="rounded-sm" style={{ flex: r, background: "#00cc6660", border: "1px solid #00cc6640" }} title={`${r} resolved`} />}
                </div>
                <span className="text-xs font-mono w-12 text-right shrink-0" style={{ color: "#555" }}>{o + ip + r} total</span>
              </div>
            ))}
            {assigneeList.length === 0 && <p className="text-xs font-mono" style={{ color: "#333" }}>No assignees</p>}
          </div>
          <div className="flex gap-4 mt-3 text-xs font-mono" style={{ color: "#444" }}>
            <span style={{ color: "#ffaa00" }}>■ Open</span>
            <span style={{ color: "#4488ff" }}>■ In Progress</span>
            <span style={{ color: "#00cc66" }}>■ Resolved</span>
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      {months.length > 0 && (
        <div className="cyber-card cyber-card-red p-4">
          <p className="text-xs font-mono mb-3" style={{ color: "#cc0000" }}>// MONTHLY TREND</p>
          <div className="flex items-end gap-2 h-24">
            {months.map(([month, { open: o, resolved: r }]) => {
              const tot = o + r;
              const h = maxMonth > 0 ? Math.round((tot / maxMonth) * 88) : 0;
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: 88 }}>
                    <div style={{ height: maxMonth > 0 ? `${(r / maxMonth) * 88}px` : 0, background: "#00cc6660", border: "1px solid #00cc6640" }} />
                    <div style={{ height: maxMonth > 0 ? `${(o / maxMonth) * 88}px` : 0, background: "#cc000060", border: "1px solid #cc000040" }} />
                  </div>
                  <span className="text-xs font-mono" style={{ color: "#444", fontSize: "0.55rem" }}>{month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs font-mono" style={{ color: "#444" }}>
            <span style={{ color: "#cc0000" }}>■ Open/Active</span>
            <span style={{ color: "#00cc66" }}>■ Resolved</span>
          </div>
        </div>
      )}
    </div>
  );
}
