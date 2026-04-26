"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, Search, BarChart2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";

type UserRow = { id: string; name: string; subRole: string | null };
type Assignee = { id: string; user: UserRow };
type Ticket = {
  id: string; title: string; type: string; description: string | null;
  status: string; priority: string; deadline: string | null;
  project: { id: string; name: string };
  reporter: UserRow | null;
  assignees: Assignee[];
  createdAt: string;
};

const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PRIORITY_COLOR: Record<string, string> = { CRITICAL: "#ff2222", HIGH: "#ff6600", MEDIUM: "#ffaa00", LOW: "#555" };
const STATUS_COLOR: Record<string, string> = { OPEN: "#ffaa00", IN_PROGRESS: "#4488ff", RESOLVED: "#00cc66", REJECTED: "#cc3333" };
const STATUS_PRIORITY: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, REJECTED: 3 };
const TYPE_OPTS = ["BUG", "HARDWARE", "SOFTWARE", "PROCESS", "REQUEST", "OTHER"];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ user, size = 22, onRemove }: { user: UserRow; size?: number; onRemove?: () => void }) {
  return (
    <div className="relative group inline-flex shrink-0">
      <div
        className="rounded-full flex items-center justify-center font-mono font-bold select-none"
        style={{ width: size, height: size, fontSize: size * 0.35, background: "#1a0505", border: "1px solid #cc0000", color: "#cc0000" }}
        title={user.name}
      >
        {initials(user.name)}
      </div>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-0.5 -right-0.5 rounded-full hidden group-hover:flex items-center justify-center z-10"
          style={{ width: 13, height: 13, background: "#ff2222" }}
        >
          <X size={7} color="#fff" />
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status, onClick }: { status: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-mono px-2 py-0.5 rounded ${onClick ? "hover:opacity-70 transition-opacity" : "cursor-default"}`}
      style={{
        color: STATUS_COLOR[status] ?? "#666",
        background: (STATUS_COLOR[status] ?? "#666") + "18",
        border: `1px solid ${(STATUS_COLOR[status] ?? "#666")}40`,
        fontSize: "0.65rem",
      }}
    >
      {status.replace("_", " ")}
    </button>
  );
}

function OpenActionModal({ ticket, isLeader, onConfirm, onCancel }: {
  ticket: Ticket; isLeader: boolean;
  onConfirm: (newStatus: string, comment: string) => Promise<void>; onCancel: () => void;
}) {
  const [action, setAction] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function confirm() {
    if (!action) return;
    setSubmitting(true);
    try { await onConfirm(action, comment); } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="cyber-card cyber-card-red p-5 w-full max-w-sm relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// MOVE TICKET</span>
          <button onClick={onCancel}><X size={14} style={{ color: "#555" }} /></button>
        </div>
        <p className="text-xs font-mono truncate" style={{ color: "#555" }}>{ticket.title}</p>
        {!action ? (
          <div className={`grid gap-2 ${isLeader ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              onClick={() => setAction("IN_PROGRESS")}
              className="cyber-btn text-xs py-2"
              style={{ borderColor: "#4488ff44", color: "#4488ff" }}
            >
              Start — In Progress
            </button>
            {isLeader && (
              <button
                onClick={() => setAction("REJECTED")}
                className="cyber-btn text-xs py-2"
                style={{ borderColor: "#cc333344", color: "#cc3333" }}
              >
                Reject
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: "#555" }}>Action:</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: STATUS_COLOR[action], background: STATUS_COLOR[action] + "18", border: `1px solid ${STATUS_COLOR[action]}40` }}>
                {action.replace("_", " ")}
              </span>
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Comment</label>
              <textarea className="cyber-input text-xs w-full resize-none" rows={3} placeholder="Optional comment…" value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAction(null)} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>Back</button>
              <button onClick={confirm} disabled={submitting} className="cyber-btn text-xs" style={{ padding: "4px 14px" }}>{submitting ? "…" : "Confirm"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConfirmStatusModal({ ticket, newStatus, isLeader, onConfirm, onCancel }: {
  ticket: Ticket; newStatus: string; isLeader: boolean;
  onConfirm: (comment: string) => void; onCancel: () => void;
}) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const from = ticket.status;
  const blocked = (from === "RESOLVED" && !isLeader) || (from === "REJECTED" && !isLeader);

  async function confirm() {
    setSubmitting(true);
    try { await onConfirm(comment); } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="cyber-card cyber-card-red p-5 w-full max-w-sm relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// STATUS CHANGE</span>
          <button onClick={onCancel}><X size={14} style={{ color: "#555" }} /></button>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-300">
            <span className="font-mono text-xs" style={{ color: STATUS_COLOR[from] ?? "#888" }}>{from.replace("_", " ")}</span>
            {" → "}
            <span className="font-mono text-xs" style={{ color: STATUS_COLOR[newStatus] ?? "#888" }}>{newStatus.replace("_", " ")}</span>
          </p>
          <p className="text-xs text-gray-600 truncate">{ticket.title}</p>
        </div>
        {blocked ? (
          <>
            <p className="text-xs font-mono" style={{ color: "#ff4444" }}>Only leaders can perform this action.</p>
            <div className="flex justify-end">
              <button onClick={onCancel} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>Close</button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Comment</label>
              <textarea className="cyber-input text-xs w-full resize-none" rows={3} placeholder="Describe the reason for this change…" value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onCancel} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>Cancel</button>
              <button onClick={confirm} disabled={submitting} className="cyber-btn text-xs" style={{ padding: "4px 14px" }}>{submitting ? "…" : "Confirm"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NewTicketForm({ projects, isLeader, onCreated, onCancel }: {
  projects: { id: string; name: string }[];
  isLeader: boolean;
  onCreated: (t: Ticket) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("BUG");
  const [priority, setPriority] = useState("MEDIUM");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || null, type, priority, projectId, deadline: deadline || null }),
      });
      if (res.ok) { onCreated(await res.json()); }
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="cyber-card cyber-card-red p-5 w-full max-w-lg relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// NEW TICKET</span>
          <button onClick={onCancel}><X size={14} style={{ color: "#555" }} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className="cyber-input text-sm w-full" placeholder="Title *" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="cyber-input text-xs w-full resize-none" placeholder="Problem description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Project</label>
              <select className="cyber-input text-xs w-full" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Type</label>
              <select className="cyber-input text-xs w-full" value={type} onChange={(e) => setType(e.target.value)}>
                {TYPE_OPTS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Priority</label>
              <select className="cyber-input text-xs w-full" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITY_ORDER.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            {isLeader && (
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Deadline</label>
                <input type="date" className="cyber-input text-xs w-full" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onCancel} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>Cancel</button>
            <button type="submit" disabled={submitting} className="cyber-btn text-xs" style={{ padding: "4px 14px" }}>{submitting ? "…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TicketsClient({
  initialTickets, projects, users, isLeader, canSeeAll, myId, initialProject,
}: {
  initialTickets: Ticket[];
  projects: { id: string; name: string }[];
  users: UserRow[];
  isLeader: boolean;
  canSeeAll: boolean;
  myId: string | null;
  initialProject?: string | null;
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  useEffect(() => { setTickets(initialTickets); }, [initialTickets]);
  const [flashingRows, setFlashingRows] = useState<Set<string>>(new Set());

  const flashRow = useCallback((id: string) => {
    setFlashingRows((prev) => new Set(prev).add(id));
    setTimeout(() => setFlashingRows((prev) => { const n = new Set(prev); n.delete(id); return n; }), 900);
  }, []);
  const [showNew, setShowNew] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ ticket: Ticket; newStatus: string } | null>(null);
  const [openActionTicket, setOpenActionTicket] = useState<Ticket | null>(null);

  const [search, setSearch] = useState("");
  const [fProject, setFProject] = useState(initialProject ?? "");
  const [fStatus, setFStatus] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fType, setFType] = useState("");
  const [fAssignee, setFAssignee] = useState("");

  function refresh() { setRefreshing(true); router.refresh(); setTimeout(() => setRefreshing(false), 800); }

  const filtered = useMemo(() => {
    let list = tickets;
    if (search) { const q = search.toLowerCase(); list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.project.name.toLowerCase().includes(q)); }
    if (fProject) list = list.filter((t) => t.project.id === fProject);
    if (fStatus) list = list.filter((t) => t.status === fStatus);
    if (fPriority) list = list.filter((t) => t.priority === fPriority);
    if (fType) list = list.filter((t) => t.type === fType);
    if (fAssignee) list = list.filter((t) => t.assignees.some((a) => a.user.id === fAssignee));
    return [...list].sort((a, b) => {
      const sd = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
      if (sd !== 0) return sd;
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    });
  }, [tickets, search, fProject, fStatus, fPriority, fType, fAssignee]);

  const activeCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const closedCount = tickets.filter((t) => t.status === "RESOLVED" || t.status === "REJECTED").length;

  const perAssignee = useMemo(() => {
    const map: Record<string, { user: UserRow; open: number; total: number }> = {};
    for (const t of tickets) {
      for (const a of t.assignees) {
        if (!map[a.user.id]) map[a.user.id] = { user: a.user, open: 0, total: 0 };
        map[a.user.id].total++;
        if (t.status === "OPEN" || t.status === "IN_PROGRESS") map[a.user.id].open++;
      }
    }
    return Object.values(map).sort((a, b) => b.open - a.open);
  }, [tickets]);

  async function handleAssign(ticketId: string, userId: string) {
    if (tickets.find((t) => t.id === ticketId)?.assignees.some((a) => a.user.id === userId)) return;
    const res = await fetch("/api/issue-assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issueId: ticketId, userId }) });
    if (res.ok) {
      const assignment = await res.json();
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, assignees: [...t.assignees, assignment] } : t));
    }
  }

  async function handleUnassign(ticketId: string, userId: string) {
    const res = await fetch("/api/issue-assignments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issueId: ticketId, userId }) });
    if (res.ok) {
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, assignees: t.assignees.filter((a) => a.user.id !== userId) } : t));
    }
  }

  async function changeStatus(ticketId: string, newStatus: string, comment: string) {
    const res = await fetch("/api/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticketId, status: newStatus, comment }),
    });
    if (res.ok) {
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
      flashRow(ticketId);
      return true;
    }
    const err = await res.json();
    alert(err.error ?? "Failed to update status");
    return false;
  }

  async function handleOpenActionConfirm(newStatus: string, comment: string) {
    if (!openActionTicket) return;
    const ok = await changeStatus(openActionTicket.id, newStatus, comment);
    if (ok) setOpenActionTicket(null);
  }

  async function handleConfirmModal(comment: string) {
    if (!confirmModal) return;
    const ok = await changeStatus(confirmModal.ticket.id, confirmModal.newStatus, comment);
    if (ok) setConfirmModal(null);
  }

  function onStatusClick(ticket: Ticket) {
    const isAssigned = !!myId && ticket.assignees.some((a) => a.user.id === myId);
    const canChange = isLeader || isAssigned;
    if (!canChange) return;
    if (ticket.status === "OPEN") {
      if (!isLeader) return;
      setOpenActionTicket(ticket);
    } else if (ticket.status === "IN_PROGRESS") {
      setConfirmModal({ ticket, newStatus: "RESOLVED" });
    } else if (ticket.status === "RESOLVED") {
      if (!isLeader) return;
      setConfirmModal({ ticket, newStatus: "IN_PROGRESS" });
    } else if (ticket.status === "REJECTED") {
      if (!isLeader) return;
      setConfirmModal({ ticket, newStatus: "OPEN" });
    }
  }

  const anyFilter = !!(search || fProject || fStatus || fPriority || fType || fAssignee);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <SectionHeader label="Tickets">
        <span className="text-xs font-mono" style={{ color: "#333" }}>{activeCount} active · {closedCount} closed</span>
        <button onClick={refresh} disabled={refreshing} className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
        </button>
        <Link href="/tickets/analyze" className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
          <BarChart2 size={12} /> Analyze
        </Link>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
          <Plus size={12} /> New Ticket
        </button>
      </SectionHeader>

      {/* Leader: drag-to-assign strip */}
      {isLeader && users.length > 0 && (
        <div className="cyber-card cyber-card-red px-4 py-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono shrink-0" style={{ color: "#444" }}>// DRAG TO ASSIGN</span>
            {users.map((u) => (
              <div key={u.id} draggable onDragStart={(e) => e.dataTransfer.setData("userId", u.id)}
                className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none rounded px-2 py-1 hover:bg-red-950 transition-colors"
                style={{ border: "1px solid #1a0505" }}>
                <Avatar user={u} size={20} />
                <span className="text-xs font-mono" style={{ color: "#888" }}>{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Search */}
      <div className="cyber-card cyber-card-red p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "#555" }} />
            <input className="cyber-input text-xs w-full pl-6" placeholder="Search title, description, project…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="cyber-input text-xs" value={fProject} onChange={(e) => setFProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="cyber-input text-xs" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select className="cyber-input text-xs" value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
            <option value="">All Priority</option>
            {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="cyber-input text-xs" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">All Types</option>
            {TYPE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {canSeeAll && users.length > 0 && (
            <select className="cyber-input text-xs" value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
              <option value="">All Assignees</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          {anyFilter && (
            <button onClick={() => { setSearch(""); setFProject(""); setFStatus(""); setFPriority(""); setFType(""); setFAssignee(""); }}
              className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
              × Clear
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: "#333" }}>{filtered.length} tickets</span>
          {canSeeAll && (
            <button onClick={() => setShowSummary((v) => !v)} className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
              {showSummary ? <ChevronDown size={11} /> : <ChevronRight size={11} />} Summary
            </button>
          )}
        </div>
        {showSummary && canSeeAll && (
          <div className="border-t pt-3 mt-1 space-y-2" style={{ borderColor: "#1a0505" }}>
            <p className="text-xs font-mono" style={{ color: "#444" }}>
              {activeCount} active ticket{activeCount !== 1 ? "s" : ""} · {perAssignee.length} assignee{perAssignee.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {perAssignee.length === 0 && <p className="text-xs font-mono col-span-4" style={{ color: "#333" }}>No assignees yet</p>}
              {perAssignee.map(({ user, open, total }) => (
                <div key={user.id} className="flex items-center gap-2">
                  <Avatar user={user} size={24} />
                  <div>
                    <p className="text-xs font-mono leading-none" style={{ color: "#888" }}>{user.name}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: open > 0 ? "#ffaa00" : "#555" }}>
                      {open} active · {total} assigned
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ticket table */}
      <div className="cyber-card cyber-card-red overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #1a0505" }}>
              {["Priority", "Title", "Type", "Project", "Assignees", "Status", "Deadline"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-mono uppercase tracking-wider" style={{ color: "#333" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-xs font-mono" style={{ color: "#333" }}>No tickets found</td></tr>
            )}
            {filtered.map((ticket) => {
              const isOver = dragOverId === ticket.id;
              const deadline = ticket.deadline ? new Date(ticket.deadline) : null;
              const isOverdue = deadline && deadline < new Date() && ticket.status !== "RESOLVED" && ticket.status !== "REJECTED";
              const isAssigned = !!myId && ticket.assignees.some((a) => a.user.id === myId);
              const canClickStatus = isLeader || isAssigned;
              return (
                <tr
                  key={ticket.id}
                  style={{ borderBottom: "1px solid #100202", background: isOver ? "#120202" : undefined }}
                  className={`hover:bg-red-950/20 transition-colors${flashingRows.has(ticket.id) ? " row-flash" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(ticket.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => { e.preventDefault(); setDragOverId(null); const u = e.dataTransfer.getData("userId"); if (u) handleAssign(ticket.id, u); }}
                >
                  <td className="px-3 py-2">
                    <span className="text-xs font-mono" style={{ color: PRIORITY_COLOR[ticket.priority] ?? "#555" }}>{ticket.priority}</span>
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    <Link href={`/tickets/${ticket.id}`} className="text-sm text-gray-200 hover:text-red-400 transition-colors line-clamp-1">
                      {ticket.title}
                    </Link>
                    {ticket.description && <p className="text-xs truncate mt-0.5" style={{ color: "#555" }}>{ticket.description}</p>}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: "#888", background: "#111", border: "1px solid #222" }}>{ticket.type}</span>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: "#666" }}>{ticket.project.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      {ticket.assignees.map((a) => (
                        <Avatar
                          key={a.user.id}
                          user={a.user}
                          size={20}
                          onRemove={isLeader ? () => handleUnassign(ticket.id, a.user.id) : undefined}
                        />
                      ))}
                      {isOver && <div className="rounded-full border-dashed border flex items-center justify-center" style={{ width: 20, height: 20, borderColor: "#cc0000", color: "#cc0000" }}><Plus size={9} /></div>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={ticket.status} onClick={canClickStatus ? () => onStatusClick(ticket) : undefined} />
                  </td>
                  <td className="px-3 py-2 text-xs font-mono" style={{ color: isOverdue ? "#ff2222" : "#555" }}>
                    {deadline ? deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNew && <NewTicketForm projects={projects} isLeader={isLeader} onCreated={(t) => { setTickets((p) => [t, ...p]); setShowNew(false); }} onCancel={() => setShowNew(false)} />}
      {openActionTicket && (
        <OpenActionModal
          ticket={openActionTicket}
          isLeader={isLeader}
          onConfirm={handleOpenActionConfirm}
          onCancel={() => setOpenActionTicket(null)}
        />
      )}
      {confirmModal && (
        <ConfirmStatusModal
          ticket={confirmModal.ticket}
          newStatus={confirmModal.newStatus}
          isLeader={isLeader}
          onConfirm={handleConfirmModal}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
