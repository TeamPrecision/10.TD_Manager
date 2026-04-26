"use client";
import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROJECT_STAGES } from "@/lib/utils";
import { Search, Filter, Copy, Camera, Pencil, Trash2, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";

type ProcessRow = { stageKey: string; status: string; deadline: Date | string | null };
type FGRow = { id: string; name: string; model: string };
type FixtureRow = { id: string; name: string; fgs: FGRow[] };

type Project = {
  id: string;
  name: string;
  customer: string;
  targetDate: Date | string | null;
  createdAt: Date | string;
  processes: ProcessRow[];
  fixtures: FixtureRow[];
  _count: { issues: number };
  stageOverrides?: Record<string, string>;
};

const TOTAL = PROJECT_STAGES.length;

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function deliveryDate(processes: ProcessRow[]): Date | string | null {
  return processes.find((p) => p.stageKey === "TESTER_DELIVERED")?.deadline ?? null;
}

function firstUnfinished(processes: ProcessRow[], overrides?: Record<string, string>): string {
  const s = PROJECT_STAGES.find((s) => stageStatus(s.key, processes, overrides) !== "DONE");
  return s?.label ?? "Complete";
}

function stageStatus(s: string, processes: ProcessRow[], overrides?: Record<string, string>): string {
  if (overrides && s in overrides) return overrides[s];
  return processes.find((p) => p.stageKey === s)?.status ?? "PENDING";
}

function doneCount(processes: ProcessRow[], overrides?: Record<string, string>): number {
  return PROJECT_STAGES.filter((s) => stageStatus(s.key, processes, overrides) === "DONE").length;
}

type ColFilters = { project: string; customer: string; fixture: string; process: string; issues: string };
const emptyFilters: ColFilters = { project: "", customer: "", fixture: "", process: "", issues: "" };

type TicketPopup = { projectId: string; projectName: string; loading: boolean; tickets: { id: string; title: string; status: string; priority: string }[] };

// Edit project inline modal
function EditProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [customer, setCustomer] = useState(project.customer);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, customer }),
    });
    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="cyber-card cyber-card-red p-6 w-full max-w-md relative z-10">
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// EDIT PROJECT</span>
          <button onClick={onClose}><X size={16} className="text-gray-600 hover:text-red-400" /></button>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Project Name</label>
            <input className="cyber-input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Customer</label>
            <input className="cyber-input w-full" value={customer} onChange={(e) => setCustomer(e.target.value)} required />
          </div>
          <button type="submit" disabled={saving} className="cyber-btn w-full mt-2">
            {saving ? "SAVING..." : "SAVE"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Delete confirm modal
function DeleteConfirmModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setDeleting(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="cyber-card cyber-card-red p-6 w-full max-w-sm relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// DELETE PROJECT</span>
          <button onClick={onClose}><X size={14} className="text-gray-600 hover:text-red-400" /></button>
        </div>
        <p className="text-sm text-gray-300 mb-1">Delete <span className="font-mono text-red-400">{project.name}</span>?</p>
        <p className="text-xs text-gray-600 mb-5">This will permanently delete the project and all its data.</p>
        <div className="flex gap-3">
          <button onClick={confirm} disabled={deleting} className="cyber-btn flex-1 text-xs" style={{ borderColor: "#cc0000", color: "#ff4444" }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button onClick={onClose} className="flex-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Fixture cell with collapse/expand per project row
function FixtureCell({ fixtures }: { fixtures: FixtureRow[] }) {
  const [expanded, setExpanded] = useState(false);

  if (fixtures.length === 0) return <span className="text-gray-700 text-xs">—</span>;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors"
        style={{ color: "#cc5555" }}
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span>{fixtures.length} fixture{fixtures.length > 1 ? "s" : ""}</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {fixtures.map((fx) => (
            <div key={fx.id}>
              <div
                className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ background: "#1a0808", border: "1px solid #2a0a0a", color: "#ff5555", display: "inline-block" }}
              >
                {fx.name}
              </div>
              {fx.fgs.length > 0 && (
                <div className="ml-3 mt-0.5 space-y-0.5">
                  {fx.fgs.map((fg) => (
                    <div
                      key={fg.id}
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: "#130505", border: "1px solid #1e0808", color: "#aa4444", display: "inline-flex", gap: "4px", marginRight: "4px" }}
                    >
                      <span>{fg.name}</span>
                      <span style={{ color: "#555" }}>|</span>
                      <span style={{ color: "#777" }}>{fg.model}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsClient({
  projects,
  isLeader,
  NewProjectModal,
}: {
  projects: Project[];
  isLeader: boolean;
  NewProjectModal: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ColFilters>(emptyFilters);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [ticketPopup, setTicketPopup] = useState<TicketPopup | null>(null);
  const [copying, setCopying] = useState(false);

  async function openTicketPopup(projectId: string, projectName: string) {
    setTicketPopup({ projectId, projectName, loading: true, tickets: [] });
    const res = await fetch(`/api/issues?projectId=${projectId}`);
    const data = await res.json();
    setTicketPopup({ projectId, projectName, loading: false, tickets: data.filter((t: { status: string }) => t.status !== "RESOLVED") });
  }
  const [capturing, setCapturing] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const hasActiveFilter = Object.values(filters).some(Boolean);

  function setFilter(col: keyof ColFilters, val: string) {
    setFilters((f) => ({ ...f, [col]: val }));
  }

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let list = projects;

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.customer.toLowerCase().includes(q) ||
          p.fixtures.some((fx) => fx.name.toLowerCase().includes(q) || fx.fgs.some((fg) => fg.name.toLowerCase().includes(q)))
      );
    }

    if (filters.project) list = list.filter((p) => p.name.toLowerCase().includes(filters.project.toLowerCase()));
    if (filters.customer) list = list.filter((p) => p.customer.toLowerCase().includes(filters.customer.toLowerCase()));
    if (filters.fixture) list = list.filter((p) =>
      p.fixtures.some((fx) => fx.name.toLowerCase().includes(filters.fixture.toLowerCase()) ||
        fx.fgs.some((fg) => fg.name.toLowerCase().includes(filters.fixture.toLowerCase())))
    );
    if (filters.process) list = list.filter((p) => firstUnfinished(p.processes, p.stageOverrides).toLowerCase().includes(filters.process.toLowerCase()));
    if (filters.issues === "0") list = list.filter((p) => p._count.issues === 0);
    if (filters.issues === ">0") list = list.filter((p) => p._count.issues > 0);

    if (sortCol) {
      list = [...list].sort((a, b) => {
        let va: string | number = "", vb: string | number = "";
        if (sortCol === "project")  { va = a.name; vb = b.name; }
        if (sortCol === "customer") { va = a.customer; vb = b.customer; }
        if (sortCol === "process")  { va = firstUnfinished(a.processes, a.stageOverrides); vb = firstUnfinished(b.processes, b.stageOverrides); }
        if (sortCol === "progress") { va = doneCount(a.processes, a.stageOverrides); vb = doneCount(b.processes, b.stageOverrides); }
        if (sortCol === "delivery") {
          va = deliveryDate(a.processes) ? new Date(deliveryDate(a.processes)!).getTime() : Infinity;
          vb = deliveryDate(b.processes) ? new Date(deliveryDate(b.processes)!).getTime() : Infinity;
        }
        if (sortCol === "issues")   { va = a._count.issues; vb = b._count.issues; }
        if (sortCol === "created")  { va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime(); }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      list = [...list].sort((a, b) => {
        const aDone = doneCount(a.processes, a.stageOverrides) === TOTAL;
        const bDone = doneCount(b.processes, b.stageOverrides) === TOTAL;
        if (aDone !== bDone) return aDone ? 1 : -1;
        const da = deliveryDate(a.processes), db = deliveryDate(b.processes);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return new Date(da).getTime() - new Date(db).getTime();
      });
    }

    return list;
  }, [projects, query, filters, sortCol, sortDir]);

  // --- Copy table as text ---
  async function copyTable() {
    setCopying(true);
    const header = ["Project", "Customer", "Fixtures", "Current Process", "Progress", "Delivery", "Created", "Issues"].join("\t");
    const rows = filtered.map((p) => {
      const done = doneCount(p.processes, p.stageOverrides);
      const pct = Math.round((done / TOTAL) * 100);
      const fixtureStr = p.fixtures.map((fx) => `${fx.name}(${fx.fgs.map((fg) => fg.name).join(",")})`).join("; ");
      return [
        p.name,
        p.customer,
        fixtureStr || "—",
        firstUnfinished(p.processes, p.stageOverrides),
        `${pct}%`,
        formatDate(deliveryDate(p.processes)),
        formatDate(p.createdAt),
        String(p._count.issues),
      ].join("\t");
    });
    await navigator.clipboard.writeText([header, ...rows].join("\n"));
    setCopying(false);
  }

  // --- Capture table as image ---
  async function captureImage() {
    if (!tableRef.current) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: "#080808",
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: false,
      });
      canvas.toBlob((blob) => {
        try {
          if (!blob) return;
          // Always download (guaranteed to work)
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "projects-table.png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          // Also try clipboard
          navigator.clipboard
            .write([new ClipboardItem({ "image/png": Promise.resolve(blob) })])
            .catch(() => {});
        } finally {
          setCapturing(false);
        }
      }, "image/png");
    } catch {
      setCapturing(false);
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <span className="opacity-20 ml-1">↕</span>;
    return <span className="ml-1" style={{ color: "#cc0000" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function Th({ col, label, className }: { col: string; label: string; className?: string }) {
    return (
      <th className={className}>
        <button onClick={() => toggleSort(col)} className="flex items-center gap-0.5 hover:text-red-400 transition-colors text-left w-full">
          {label}<SortIcon col={col} />
        </button>
      </th>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {editProject && <EditProjectModal project={editProject} onClose={() => setEditProject(null)} />}
      {deleteProject && <DeleteConfirmModal project={deleteProject} onClose={() => setDeleteProject(null)} />}
      {ticketPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setTicketPopup(null)} />
          <div className="cyber-card cyber-card-red p-4 w-full max-w-sm relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// OPEN TICKETS — {ticketPopup.projectName}</span>
              <button onClick={() => setTicketPopup(null)}><X size={13} style={{ color: "#555" }} /></button>
            </div>
            {ticketPopup.loading ? (
              <p className="text-xs font-mono" style={{ color: "#444" }}>Loading…</p>
            ) : ticketPopup.tickets.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "#444" }}>No open tickets</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {ticketPopup.tickets.map((t) => (
                  <Link key={t.id} href={`/tickets/${t.id}`} onClick={() => setTicketPopup(null)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-950/40 transition-colors">
                    <span className="text-xs font-mono shrink-0" style={{ color: t.priority === "CRITICAL" ? "#ff2222" : t.priority === "HIGH" ? "#ff6600" : t.priority === "MEDIUM" ? "#ffaa00" : "#555" }}>
                      {t.priority}
                    </span>
                    <span className="text-sm text-gray-300 truncate flex-1">{t.title}</span>
                    <span className="text-xs font-mono shrink-0" style={{ color: t.status === "OPEN" ? "#ffaa00" : "#4488ff" }}>
                      {t.status.replace("_", " ")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-1 border-t" style={{ borderColor: "#1a0505" }}>
              <Link href={`/tickets?projectId=${ticketPopup.projectId}`} onClick={() => setTicketPopup(null)}
                className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
                See all tickets →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <SectionHeader label="All Projects">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="cyber-input pl-7 text-xs w-44"
            style={{ padding: "4px 8px 4px 24px" }}
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="cyber-btn flex items-center gap-1.5 text-xs"
          style={{
            padding: "4px 10px",
            borderColor: hasActiveFilter ? "#cc0000" : undefined,
            color: hasActiveFilter ? "#ff4444" : undefined,
          }}
        >
          <Filter size={11} />
          {hasActiveFilter ? "Filtered" : "Filter"}
        </button>
        {hasActiveFilter && (
          <button onClick={() => setFilters(emptyFilters)} className="text-xs text-gray-600 hover:text-red-400 font-mono transition-colors">
            clear
          </button>
        )}
        <Link
          href="/projects/analyze"
          className="cyber-btn flex items-center gap-1.5 text-xs"
          style={{ padding: "4px 10px", color: "#888" }}
        >
          Analyze →
        </Link>
        <button
          onClick={copyTable}
          disabled={copying}
          className="cyber-btn flex items-center gap-1.5 text-xs"
          style={{ padding: "4px 10px" }}
          title="Copy table to clipboard"
        >
          <Copy size={11} />
          {copying ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={captureImage}
          disabled={capturing}
          className="cyber-btn flex items-center gap-1.5 text-xs"
          style={{ padding: "4px 10px" }}
          title="Capture table as image"
        >
          <Camera size={11} />
          {capturing ? "..." : "Image"}
        </button>
        {isLeader && NewProjectModal}
      </SectionHeader>

      {/* Stage filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("process", "")}
          className="text-xs px-3 py-1 rounded"
          style={{
            background: !filters.process ? "#1a0000" : "#0f0f0f",
            border: `1px solid ${!filters.process ? "#cc0000" : "#1a0a0a"}`,
            color: !filters.process ? "#ff4444" : "#555",
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          All
        </button>
        {PROJECT_STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter("process", filters.process === s.label ? "" : s.label)}
            className="text-xs px-3 py-1 rounded"
            style={{
              background: filters.process === s.label ? "#1a0000" : "#0f0f0f",
              border: `1px solid ${filters.process === s.label ? "#cc0000" : "#1a0a0a"}`,
              color: filters.process === s.label ? "#ff4444" : "#555",
              fontFamily: "var(--font-geist-mono)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div ref={tableRef} className="cyber-card cyber-card-red overflow-hidden" style={{ background: "#080808" }}>
        <table className="cyber-table">
          <thead>
            <tr>
              <Th col="project"  label="Project" />
              <Th col="customer" label="Customer" />
              <th>Fixture</th>
              <Th col="process"  label="Current Process" />
              <Th col="progress" label="Progress" />
              <Th col="delivery" label="Delivery" />
              <Th col="created"  label="Created" />
              <Th col="issues"   label="Tickets" />
              {isLeader && <th style={{ width: "60px" }} />}
            </tr>
            {showFilters && (
              <tr style={{ background: "#0a0a0a" }}>
                <td className="py-1 px-3">
                  <input className="cyber-input w-full text-xs" style={{ padding: "2px 6px" }} placeholder="Filter..." value={filters.project} onChange={(e) => setFilter("project", e.target.value)} />
                </td>
                <td className="py-1 px-3">
                  <input className="cyber-input w-full text-xs" style={{ padding: "2px 6px" }} placeholder="Filter..." value={filters.customer} onChange={(e) => setFilter("customer", e.target.value)} />
                </td>
                <td className="py-1 px-3">
                  <input className="cyber-input w-full text-xs" style={{ padding: "2px 6px" }} placeholder="Filter..." value={filters.fixture} onChange={(e) => setFilter("fixture", e.target.value)} />
                </td>
                <td className="py-1 px-3">
                  <select className="cyber-input w-full text-xs" style={{ padding: "2px 6px" }} value={filters.process} onChange={(e) => setFilter("process", e.target.value)}>
                    <option value="">All</option>
                    {PROJECT_STAGES.map((s) => (<option key={s.key} value={s.label}>{s.label}</option>))}
                    <option value="Complete">Complete</option>
                  </select>
                </td>
                <td className="py-1 px-3" />
                <td className="py-1 px-3" />
                <td className="py-1 px-3">
                  <select className="cyber-input w-full text-xs" style={{ padding: "2px 6px" }} value={filters.issues} onChange={(e) => setFilter("issues", e.target.value)}>
                    <option value="">All</option>
                    <option value="0">None</option>
                    <option value=">0">Has tickets</option>
                  </select>
                </td>
                <td className="py-1 px-3" />
                {isLeader && <td />}
              </tr>
            )}
          </thead>
          <tbody>
            {filtered.map((p) => {
              const done = doneCount(p.processes, p.stageOverrides);
              const pct = Math.round((done / TOTAL) * 100);
              const delivery = deliveryDate(p.processes);
              const isOverdue = delivery && new Date(delivery) < now && done < TOTAL;
              const currentProcess = firstUnfinished(p.processes, p.stageOverrides);
              const isComplete = done === TOTAL;

              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/projects/${p.id}`} className="hover:text-red-400 transition-colors">
                      <span className="text-gray-100">{p.name}</span>
                    </Link>
                  </td>
                  <td className="text-gray-500">{p.customer}</td>
                  <td style={{ maxWidth: "180px" }}>
                    <FixtureCell fixtures={p.fixtures} />
                  </td>
                  <td>
                    <span
                      className="badge badge-gray font-mono"
                      style={isComplete ? { color: "#00cc66", borderColor: "#00cc6644", background: "#001a0d" } : undefined}
                    >
                      {currentProcess}
                    </span>
                  </td>
                  <td style={{ minWidth: "120px" }}>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5" style={{ minWidth: "80px" }}>
                        {PROJECT_STAGES.map((s) => {
                          const st = stageStatus(s.key, p.processes, p.stageOverrides);
                          return (
                            <div
                              key={s.key}
                              className="stage-pip"
                              style={{
                                background:
                                  st === "DONE" ? "#00cc66" :
                                  st === "IN_PROGRESS" ? "#ffaa00" :
                                  "#1a0a0a",
                              }}
                            />
                          );
                        })}
                      </div>
                      <span className="text-xs font-mono text-gray-600 w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="font-mono text-xs whitespace-nowrap" style={{ color: isOverdue ? "#ff4444" : "#888" }}>
                      {formatDate(delivery)}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-xs whitespace-nowrap" style={{ color: "#555" }}>
                      {formatDate(p.createdAt)}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => p._count.issues > 0 && openTicketPopup(p.id, p.name)}
                      className={`font-mono text-sm transition-colors ${p._count.issues > 0 ? "text-red-400 hover:text-red-300 cursor-pointer" : "text-gray-600 cursor-default"}`}
                    >
                      {p._count.issues}
                    </button>
                  </td>
                  {isLeader && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditProject(p)}
                          className="text-gray-700 hover:text-yellow-400 transition-colors"
                          title="Edit project"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteProject(p)}
                          className="text-gray-700 hover:text-red-400 transition-colors"
                          title="Delete project"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isLeader ? 9 : 8} className="text-center text-gray-700 py-8">No projects found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
