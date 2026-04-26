"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ChevronDown, Calendar, RefreshCw } from "lucide-react";

type UserRow = { id: string; name: string; subRole: string | null };
type Assignee = { id: string; user: UserRow };
type IssueRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  projectId: string;
  project: { id: string; name: string };
  reporter: UserRow | null;
  assignees: Assignee[];
  createdAt: string;
};

const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "#ff2222",
  HIGH: "#ff6600",
  MEDIUM: "#ffaa00",
  LOW: "#555",
};
const STATUS_COLS = [
  { key: "OPEN", label: "Open", color: "#ffaa00" },
  { key: "IN_PROGRESS", label: "In Progress", color: "#4488ff" },
  { key: "RESOLVED", label: "Resolved", color: "#00cc66" },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ user, size = 24, removable, onRemove }: {
  user: UserRow; size?: number; removable?: boolean; onRemove?: () => void;
}) {
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <div
        className="rounded-full flex items-center justify-center font-mono font-bold select-none"
        style={{
          width: size, height: size, fontSize: size * 0.35,
          background: "#1a0505", border: "1px solid #cc0000",
          color: "#cc0000",
        }}
        title={user.name + (user.subRole ? ` · ${user.subRole}` : "")}
      >
        {initials(user.name)}
      </div>
      {removable && (
        <button
          onClick={onRemove}
          className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
          style={{ width: 12, height: 12, background: "#ff2222", border: "none" }}
        >
          <X size={7} color="#fff" />
        </button>
      )}
    </div>
  );
}

function NewIssueForm({
  projects,
  isLeader,
  onCreated,
  onCancel,
}: {
  projects: { id: string; name: string }[];
  isLeader: boolean;
  onCreated: (issue: IssueRow) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { title, description: description || null, priority, projectId };
      if (isLeader && deadline) body.deadline = deadline;
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const issue = await res.json();
        onCreated(issue);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="cyber-card cyber-card-red p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// NEW ISSUE</span>
        <button type="button" onClick={onCancel}><X size={14} style={{ color: "#555" }} /></button>
      </div>
      <input
        className="cyber-input text-sm w-full"
        placeholder="Title *"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="cyber-input text-xs w-full resize-none"
        placeholder="Description"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex gap-2 flex-wrap">
        <select className="cyber-input text-xs flex-1" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="cyber-input text-xs" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {isLeader && (
          <input
            type="date"
            className="cyber-input text-xs"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="Deadline"
          />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="cyber-btn text-xs" style={{ padding: "4px 14px" }}>
          {submitting ? "…" : "Create"}
        </button>
      </div>
    </form>
  );
}

function IssueCard({
  issue,
  isLeader,
  onAssign,
  onUnassign,
  onStatusChange,
  onDeadlineChange,
  dragOverId,
  setDragOverId,
}: {
  issue: IssueRow;
  isLeader: boolean;
  onAssign: (issueId: string, userId: string) => void;
  onUnassign: (issueId: string, userId: string) => void;
  onStatusChange: (issueId: string, status: string) => void;
  onDeadlineChange: (issueId: string, deadline: string) => void;
  dragOverId: string | null;
  setDragOverId: (id: string | null) => void;
}) {
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineVal, setDeadlineVal] = useState(issue.deadline ? issue.deadline.split("T")[0] : "");
  const isOver = dragOverId === issue.id;

  const deadlineDate = issue.deadline ? new Date(issue.deadline) : null;
  const isOverdue = deadlineDate && deadlineDate < new Date() && issue.status !== "RESOLVED";

  const nextStatus: Record<string, string> = { OPEN: "IN_PROGRESS", IN_PROGRESS: "RESOLVED", RESOLVED: "OPEN" };

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOverId(issue.id);
  }
  function handleDragLeave() {
    setDragOverId(null);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOverId(null);
    const userId = e.dataTransfer.getData("userId");
    if (userId) onAssign(issue.id, userId);
  }

  function saveDeadline() {
    setEditingDeadline(false);
    onDeadlineChange(issue.id, deadlineVal);
  }

  return (
    <div
      className="rounded border p-3 space-y-2 transition-colors"
      style={{
        borderColor: isOver ? "#cc0000" : "#1a0505",
        background: isOver ? "#120202" : "#080202",
        borderLeft: `3px solid ${PRIORITY_COLOR[issue.priority] ?? "#555"}`,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Title + status toggle */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 leading-tight">{issue.title}</p>
          {issue.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "#555" }}>{issue.description}</p>
          )}
        </div>
        <button
          onClick={() => onStatusChange(issue.id, nextStatus[issue.status] ?? "OPEN")}
          className="shrink-0 text-xs font-mono px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
          style={{
            color: STATUS_COLS.find((c) => c.key === issue.status)?.color ?? "#555",
            background: (STATUS_COLS.find((c) => c.key === issue.status)?.color ?? "#555") + "15",
            border: `1px solid ${(STATUS_COLS.find((c) => c.key === issue.status)?.color ?? "#555")}33`,
            fontSize: "0.65rem",
          }}
          title="Click to advance status"
        >
          {issue.status.replace("_", " ")}
        </button>
      </div>

      {/* Project + priority */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono px-1 rounded" style={{ color: "#555", background: "#111" }}>
          {issue.project.name}
        </span>
        <span className="text-xs font-mono" style={{ color: PRIORITY_COLOR[issue.priority] ?? "#555" }}>
          {issue.priority}
        </span>
      </div>

      {/* Deadline */}
      {isLeader ? (
        editingDeadline ? (
          <div className="flex items-center gap-1">
            <input
              type="date"
              autoFocus
              className="cyber-input text-xs"
              style={{ flex: 1 }}
              value={deadlineVal}
              onChange={(e) => setDeadlineVal(e.target.value)}
              onBlur={saveDeadline}
              onKeyDown={(e) => { if (e.key === "Enter") saveDeadline(); if (e.key === "Escape") setEditingDeadline(false); }}
            />
          </div>
        ) : (
          <button
            onClick={() => setEditingDeadline(true)}
            className="flex items-center gap-1 text-xs font-mono hover:opacity-70 transition-opacity"
            style={{ color: isOverdue ? "#ff2222" : deadlineDate ? "#888" : "#333" }}
          >
            <Calendar size={10} />
            {deadlineDate
              ? deadlineDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
              : "Set deadline"}
          </button>
        )
      ) : deadlineDate ? (
        <div className="flex items-center gap-1 text-xs font-mono" style={{ color: isOverdue ? "#ff2222" : "#666" }}>
          <Calendar size={10} />
          {deadlineDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      ) : null}

      {/* Footer: reporter + assignees */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {issue.reporter && (
          <div className="flex items-center gap-1" title={`Reporter: ${issue.reporter.name}`}>
            <span className="text-xs font-mono" style={{ color: "#333" }}>by</span>
            <Avatar user={issue.reporter} size={20} />
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {issue.assignees.map((a) => (
            <Avatar
              key={a.user.id}
              user={a.user}
              size={22}
              removable={isLeader}
              onRemove={() => onUnassign(issue.id, a.user.id)}
            />
          ))}
          {isOver && (
            <div
              className="rounded-full border-dashed border flex items-center justify-center"
              style={{ width: 22, height: 22, borderColor: "#cc0000", color: "#cc0000" }}
            >
              <Plus size={10} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IssuesClient({
  initialIssues,
  projects,
  users,
  isLeader,
}: {
  initialIssues: IssueRow[];
  projects: { id: string; name: string }[];
  users: UserRow[];
  isLeader: boolean;
}) {
  const router = useRouter();
  const [issues, setIssues] = useState<IssueRow[]>(initialIssues);
  const [showNew, setShowNew] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  function handleCreated(issue: IssueRow) {
    setIssues((prev) => [issue, ...prev]);
    setShowNew(false);
  }

  async function handleAssign(issueId: string, userId: string) {
    const alreadyAssigned = issues.find((i) => i.id === issueId)?.assignees.some((a) => a.user.id === userId);
    if (alreadyAssigned) return;
    const res = await fetch("/api/issue-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId, userId }),
    });
    if (res.ok) {
      const assignment = await res.json();
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId ? { ...i, assignees: [...i.assignees, assignment] } : i
        )
      );
    }
  }

  async function handleUnassign(issueId: string, userId: string) {
    await fetch("/api/issue-assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId, userId }),
    });
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, assignees: i.assignees.filter((a) => a.user.id !== userId) } : i
      )
    );
  }

  async function handleStatusChange(issueId: string, status: string) {
    await fetch("/api/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: issueId, status }),
    });
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status } : i)));
  }

  async function handleDeadlineChange(issueId: string, deadline: string) {
    const val = deadline || null;
    await fetch("/api/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: issueId, deadline: val }),
    });
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, deadline: val } : i)));
  }

  const byStatus = (status: string) =>
    issues
      .filter((i) => i.status === status)
      .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));

  const openCount = issues.filter((i) => i.status !== "RESOLVED").length;
  const resolvedCount = issues.filter((i) => i.status === "RESOLVED").length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
          // ISSUES
        </span>
        <div className="flex-1 red-divider" />
        <span className="text-xs font-mono" style={{ color: "#333" }}>
          {openCount} open · {resolvedCount} resolved
        </span>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors"
          style={{ color: "#555" }}
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors"
          style={{ color: "#555" }}
        >
          <Plus size={12} />
          New Issue
        </button>
      </div>

      {/* New issue form */}
      {showNew && (
        <NewIssueForm
          projects={projects}
          isLeader={isLeader}
          onCreated={handleCreated}
          onCancel={() => setShowNew(false)}
        />
      )}

      {/* Leader: draggable member strip */}
      {isLeader && users.length > 0 && (
        <div className="cyber-card cyber-card-red px-4 py-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono shrink-0" style={{ color: "#444" }}>
              // DRAG TO ASSIGN
            </span>
            {users.map((u) => (
              <div
                key={u.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("userId", u.id)}
                className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing select-none rounded px-2 py-1 transition-colors hover:bg-red-950"
                style={{ border: "1px solid #1a0505" }}
              >
                <Avatar user={u} size={22} />
                <span className="text-xs font-mono" style={{ color: "#888" }}>{u.name}</span>
                {u.subRole && (
                  <span className="text-xs font-mono" style={{ color: "#444" }}>· {u.subRole}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STATUS_COLS.map((col) => {
          const colIssues = byStatus(col.key);
          return (
            <div key={col.key} className="space-y-2">
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: col.color }}
                >
                  {col.label}
                </span>
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ color: col.color, background: col.color + "15", border: `1px solid ${col.color}33` }}
                >
                  {colIssues.length}
                </span>
                <div className="flex-1 h-px" style={{ background: col.color + "33" }} />
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {colIssues.length === 0 && (
                  <div
                    className="rounded border border-dashed p-4 text-center text-xs font-mono"
                    style={{ borderColor: "#1a0505", color: "#333" }}
                  >
                    empty
                  </div>
                )}
                {colIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isLeader={isLeader}
                    onAssign={handleAssign}
                    onUnassign={handleUnassign}
                    onStatusChange={handleStatusChange}
                    onDeadlineChange={handleDeadlineChange}
                    dragOverId={dragOverId}
                    setDragOverId={setDragOverId}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
