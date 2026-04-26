"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, X, Upload, Send, Calendar } from "lucide-react";

type UserRow = { id: string; name: string; subRole: string | null };
type Assignee = { id: string; user: UserRow };
type CommentRow = { id: string; type: string; text: string; newStatus: string | null; user: { id: string; name: string } | null; createdAt: string };
type ImageRow = { id: string; name: string; section: string; mimeType: string; size: number; createdAt: string };
type TicketFull = {
  id: string; title: string; type: string; description: string | null; solution: string | null;
  status: string; priority: string; deadline: string | null;
  project: { id: string; name: string };
  reporter: UserRow | null;
  reporterName: string | null;
  reporterDept: string | null;
  assignees: Assignee[];
  comments: CommentRow[];
  images: ImageRow[];
  createdAt: string;
};

const PRIORITY_COLOR: Record<string, string> = { CRITICAL: "#ff2222", HIGH: "#ff6600", MEDIUM: "#ffaa00", LOW: "#555" };
const STATUS_COLOR: Record<string, string> = { OPEN: "#ffaa00", IN_PROGRESS: "#4488ff", RESOLVED: "#00cc66", REJECTED: "#cc3333" };
const TYPE_OPTS = ["BUG", "HARDWARE", "SOFTWARE", "PROCESS", "REQUEST", "OTHER"];
const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function initials(name: string) { return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2); }
function Avatar({ user, size = 24 }: { user: UserRow; size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center font-mono font-bold select-none shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35, background: "#1a0505", border: "1px solid #cc0000", color: "#cc0000" }}
      title={user.name}>{initials(user.name)}</div>
  );
}
function fmt(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function OpenActionModal({ title, isLeader, onConfirm, onCancel }: {
  title: string; isLeader: boolean;
  onConfirm: (newStatus: string, comment: string) => void; onCancel: () => void;
}) {
  const [action, setAction] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function confirm() {
    if (!action) return;
    setSubmitting(true);
    onConfirm(action, comment);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="cyber-card cyber-card-red p-5 w-full max-w-sm relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// MOVE TICKET</span>
          <button onClick={onCancel}><X size={14} style={{ color: "#555" }} /></button>
        </div>
        <p className="text-xs font-mono truncate" style={{ color: "#555" }}>{title}</p>
        {!action ? (
          <div className={`grid gap-2 ${isLeader ? "grid-cols-2" : "grid-cols-1"}`}>
            <button onClick={() => setAction("IN_PROGRESS")} className="cyber-btn text-xs py-2" style={{ borderColor: "#4488ff44", color: "#4488ff" }}>
              Start — In Progress
            </button>
            {isLeader && (
              <button onClick={() => setAction("REJECTED")} className="cyber-btn text-xs py-2" style={{ borderColor: "#cc333344", color: "#cc3333" }}>
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
            <textarea className="cyber-input text-xs w-full resize-none" rows={3} placeholder="Optional comment…" value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
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

function ConfirmStatusModal({ from, to, isLeader, onConfirm, onCancel }: {
  from: string; to: string; isLeader: boolean;
  onConfirm: (comment: string) => void; onCancel: () => void;
}) {
  const [comment, setComment] = useState("");
  const blocked = (from === "RESOLVED" && !isLeader) || (from === "REJECTED" && !isLeader);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="cyber-card cyber-card-red p-5 w-full max-w-sm relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// STATUS CHANGE</span>
          <button onClick={onCancel}><X size={14} style={{ color: "#555" }} /></button>
        </div>
        <p className="text-sm text-gray-300">
          <span className="font-mono text-xs" style={{ color: STATUS_COLOR[from] ?? "#888" }}>{from.replace("_", " ")}</span>
          {" → "}
          <span className="font-mono text-xs" style={{ color: STATUS_COLOR[to] ?? "#888" }}>{to.replace("_", " ")}</span>
        </p>
        {blocked ? (
          <>
            <p className="text-xs font-mono" style={{ color: "#ff4444" }}>Only leaders can perform this action.</p>
            <div className="flex justify-end"><button onClick={onCancel} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>Close</button></div>
          </>
        ) : (
          <>
            <textarea className="cyber-input text-xs w-full resize-none" rows={3} placeholder="Comment…" value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <button onClick={onCancel} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>Cancel</button>
              <button onClick={() => onConfirm(comment)} className="cyber-btn text-xs" style={{ padding: "4px 14px" }}>Confirm</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ImageDropZone({ issueId, section, onUploaded }: {
  issueId: string; section: "PROBLEM" | "SOLUTION"; onUploaded: (img: ImageRow) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("issueId", issueId);
      fd.append("section", section);
      fd.append("file", file);
      const res = await fetch("/api/issue-images", { method: "POST", body: fd });
      if (res.ok) onUploaded(await res.json());
    } finally { setUploading(false); }
  }, [issueId, section, onUploaded]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }
  function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
    if (item) { const file = item.getAsFile(); if (file) upload(file); }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      onClick={() => fileRef.current?.click()}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") fileRef.current?.click(); }}
      className="rounded border-dashed border flex items-center justify-center gap-2 cursor-pointer transition-colors"
      style={{ borderColor: dragging ? "#cc0000" : "#2a0a0a", background: dragging ? "#120202" : "#060101", padding: "10px", minHeight: 48 }}
    >
      <Upload size={13} style={{ color: "#555" }} />
      <span className="text-xs font-mono" style={{ color: "#444" }}>
        {uploading ? "Uploading…" : "Drop / paste image or click to upload"}
      </span>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}

function ImageGrid({ images, onDelete, canDelete }: { images: ImageRow[]; onDelete: (id: string) => void; canDelete: boolean }) {
  const [enlarged, setEnlarged] = useState<string | null>(null);
  if (images.length === 0) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((img) => (
          <div key={img.id} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/issue-images/${img.id}`}
              alt={img.name}
              className="rounded cursor-pointer object-cover hover:opacity-80 transition-opacity"
              style={{ width: 96, height: 72, border: "1px solid #1a0505" }}
              onClick={() => setEnlarged(img.id)}
            />
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
                className="absolute -top-1 -right-1 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ width: 16, height: 16, background: "#ff2222" }}
              >
                <X size={9} color="#fff" />
              </button>
            )}
          </div>
        ))}
      </div>
      {enlarged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={() => setEnlarged(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/issue-images/${enlarged}`} alt="enlarged" className="max-w-[90vw] max-h-[90vh] rounded" style={{ border: "1px solid #1a0505" }} />
        </div>
      )}
    </>
  );
}

export default function TicketDetail({ ticket: initialTicket, isLeader, myId }: {
  ticket: TicketFull; isLeader: boolean; myId: string | null;
}) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initialTicket);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [showOpenAction, setShowOpenAction] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description ?? "");
  const [solution, setSolution] = useState(ticket.solution ?? "");
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineVal, setDeadlineVal] = useState(ticket.deadline ? ticket.deadline.split("T")[0] : "");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [images, setImages] = useState<ImageRow[]>(ticket.images);
  const [comments, setComments] = useState<CommentRow[]>(ticket.comments);
  const [savingDesc, setSavingDesc] = useState(false);

  // OPEN handled by OpenActionModal; others cycle: IN_PROGRESS→RESOLVED, RESOLVED→IN_PROGRESS, REJECTED→OPEN
  function onStatusClick() {
    if (!canEdit) return;
    if (ticket.status === "OPEN") { if (isLeader) setShowOpenAction(true); }
    else if (ticket.status === "IN_PROGRESS") setConfirmStatus("RESOLVED");
    else if (ticket.status === "RESOLVED") { if (isLeader) setConfirmStatus("IN_PROGRESS"); }
    else if (ticket.status === "REJECTED") { if (isLeader) setConfirmStatus("OPEN"); }
  }

  async function patch(data: Record<string, unknown>) {
    const res = await fetch("/api/issues", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ticket.id, ...data }) });
    if (res.ok) setTicket((p) => ({ ...p, ...data }));
    return res;
  }

  async function saveTitle() {
    setEditingTitle(false);
    if (titleVal !== ticket.title) await patch({ title: titleVal });
  }

  async function saveDescription() {
    setSavingDesc(true);
    await patch({ description: description || null });
    setSavingDesc(false);
  }
  async function saveSolution() {
    setSavingDesc(true);
    await patch({ solution: solution || null });
    setSavingDesc(false);
  }

  async function applyStatusChange(newStatus: string, comment: string) {
    const res = await fetch("/api/issues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticket.id, status: newStatus, comment }),
    });
    if (res.ok) {
      setTicket((p) => ({ ...p, status: newStatus }));
      setComments((p) => [...p, {
        id: Date.now().toString(),
        type: "STATUS_CHANGE",
        text: comment,
        newStatus,
        user: myId ? { id: myId, name: "You" } : null,
        createdAt: new Date().toISOString(),
      }]);
    } else {
      const err = await res.json();
      alert(err.error ?? "Failed");
    }
  }

  async function handleStatusConfirm(comment: string) {
    if (!confirmStatus) return;
    await applyStatusChange(confirmStatus, comment);
    setConfirmStatus(null);
  }

  async function handleOpenActionConfirm(newStatus: string, comment: string) {
    await applyStatusChange(newStatus, comment);
    setShowOpenAction(false);
  }

  async function removeAssignee(userId: string) {
    const res = await fetch("/api/issue-assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId: ticket.id, userId }),
    });
    if (res.ok) setTicket((p) => ({ ...p, assignees: p.assignees.filter((a) => a.user.id !== userId) }));
  }

  async function saveDeadline() {
    setEditingDeadline(false);
    await patch({ deadline: deadlineVal || null });
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch("/api/issue-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: ticket.id, text: commentText.trim(), type: "COMMENT" }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((p) => [...p, newComment]);
        setCommentText("");
      }
    } finally { setSubmittingComment(false); }
  }

  async function deleteImage(id: string) {
    await fetch(`/api/issue-images/${id}`, { method: "DELETE" });
    setImages((p) => p.filter((i) => i.id !== id));
  }

  const deadline = ticket.deadline ? new Date(ticket.deadline) : null;
  const isOverdue = deadline && deadline < new Date() && ticket.status !== "RESOLVED" && ticket.status !== "REJECTED";
  const isAssigned = !!myId && ticket.assignees.some((a) => a.user.id === myId);
  const canEdit = isLeader || isAssigned;
  const probImages = images.filter((i) => i.section === "PROBLEM");
  const solImages = images.filter((i) => i.section === "SOLUTION");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back + title */}
      <div className="flex items-start gap-3">
        <Link href="/tickets" className="mt-1 flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors shrink-0" style={{ color: "#555" }}>
          <ChevronLeft size={12} /> Tickets
        </Link>
        <div className="flex-1 min-w-0">
          {editingTitle && canEdit ? (
            <input
              autoFocus
              className="cyber-input text-lg font-semibold w-full"
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleVal(ticket.title); setEditingTitle(false); } }}
            />
          ) : (
            <h1
              className={`text-lg font-semibold text-gray-100 leading-tight ${canEdit ? "cursor-pointer hover:text-red-400 transition-colors" : ""}`}
              onClick={() => canEdit && setEditingTitle(true)}
            >
              {ticket.title}
            </h1>
          )}
        </div>
      </div>

      {/* Metadata row */}
      <div className="cyber-card cyber-card-red px-4 py-3">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Status */}
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#444" }}>Status</p>
            <button
              onClick={onStatusClick}
              className={`text-xs font-mono px-2 py-1 rounded transition-opacity ${canEdit ? "hover:opacity-70" : "cursor-default"}`}
              style={{ color: STATUS_COLOR[ticket.status] ?? "#888", background: (STATUS_COLOR[ticket.status] ?? "#888") + "18", border: `1px solid ${(STATUS_COLOR[ticket.status] ?? "#888")}40` }}
            >
              {ticket.status.replace("_", " ")}
            </button>
          </div>
          {/* Priority */}
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#444" }}>Priority</p>
            {isLeader ? (
              <select
                className="cyber-input text-xs"
                value={ticket.priority}
                onChange={(e) => patch({ priority: e.target.value })}
              >
                {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <span className="text-xs font-mono" style={{ color: PRIORITY_COLOR[ticket.priority] ?? "#555" }}>{ticket.priority}</span>
            )}
          </div>
          {/* Type */}
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#444" }}>Type</p>
            {canEdit ? (
              <select className="cyber-input text-xs" value={ticket.type} onChange={(e) => patch({ type: e.target.value })}>
                {TYPE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: "#888", background: "#111", border: "1px solid #222" }}>{ticket.type}</span>
            )}
          </div>
          {/* Project */}
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#444" }}>Project</p>
            <span className="text-xs font-mono" style={{ color: "#666" }}>{ticket.project.name}</span>
          </div>
          {/* Deadline */}
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#444" }}>Deadline</p>
            {isLeader ? (
              editingDeadline ? (
                <input type="date" autoFocus className="cyber-input text-xs" value={deadlineVal}
                  onChange={(e) => setDeadlineVal(e.target.value)}
                  onBlur={saveDeadline}
                  onKeyDown={(e) => { if (e.key === "Enter") saveDeadline(); if (e.key === "Escape") setEditingDeadline(false); }}
                />
              ) : (
                <button onClick={() => setEditingDeadline(true)} className="flex items-center gap-1 text-xs font-mono hover:opacity-70 transition-opacity" style={{ color: isOverdue ? "#ff2222" : deadline ? "#888" : "#444" }}>
                  <Calendar size={11} />
                  {deadline ? deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Set deadline"}
                </button>
              )
            ) : (
              <span className="text-xs font-mono" style={{ color: isOverdue ? "#ff2222" : "#666" }}>
                {deadline ? deadline.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              </span>
            )}
          </div>
          {/* Reporter */}
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#444" }}>Reporter</p>
            <div className="flex items-center gap-1.5">
              {ticket.reporter ? (
                <><Avatar user={ticket.reporter} size={20} /><span className="text-xs font-mono" style={{ color: "#666" }}>{ticket.reporter.name}</span></>
              ) : ticket.reporterName ? (
                <span className="text-xs font-mono" style={{ color: "#666" }}>
                  {ticket.reporterName}{ticket.reporterDept ? <span style={{ color: "#444" }}> · {ticket.reporterDept}</span> : null}
                </span>
              ) : (
                <span className="text-xs font-mono" style={{ color: "#444" }}>—</span>
              )}
            </div>
          </div>
          {/* Assignees */}
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#444" }}>Assignees</p>
            <div className="flex items-center gap-1 flex-wrap">
              {ticket.assignees.length === 0
                ? <span className="text-xs font-mono" style={{ color: "#444" }}>—</span>
                : ticket.assignees.map((a) => (
                    <div key={a.user.id} className="relative group inline-flex">
                      <Avatar user={a.user} size={22} />
                      {isLeader && (
                        <button
                          onClick={() => removeAssignee(a.user.id)}
                          className="absolute -top-0.5 -right-0.5 rounded-full hidden group-hover:flex items-center justify-center z-10"
                          style={{ width: 14, height: 14, background: "#ff2222" }}
                        >
                          <X size={8} color="#fff" />
                        </button>
                      )}
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* PROBLEM section */}
      <div className="cyber-card cyber-card-red overflow-hidden">
        <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: "#1a0505" }}>
          <span className="text-xs font-mono font-semibold" style={{ color: "#ff4444" }}>PROBLEM</span>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            className="cyber-input text-sm w-full resize-none"
            rows={5}
            placeholder="Describe the problem…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            disabled={!canEdit}
          />
          {savingDesc && <span className="text-xs font-mono" style={{ color: "#444" }}>Saving…</span>}
          {canEdit && <ImageDropZone issueId={ticket.id} section="PROBLEM" onUploaded={(img) => setImages((p) => [...p, img])} />}
          <ImageGrid images={probImages} onDelete={deleteImage} canDelete={canEdit} />
        </div>
      </div>

      {/* SOLUTION section */}
      <div className="cyber-card cyber-card-red overflow-hidden">
        <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: "#1a0505" }}>
          <span className="text-xs font-mono font-semibold" style={{ color: "#00cc66" }}>SOLUTION</span>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            className="cyber-input text-sm w-full resize-none"
            rows={5}
            placeholder="Describe the solution…"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            onBlur={saveSolution}
            disabled={!canEdit}
          />
          {canEdit && <ImageDropZone issueId={ticket.id} section="SOLUTION" onUploaded={(img) => setImages((p) => [...p, img])} />}
          <ImageGrid images={solImages} onDelete={deleteImage} canDelete={canEdit} />
        </div>
      </div>

      {/* Activity log */}
      <div className="cyber-card cyber-card-red overflow-hidden">
        <div className="px-4 py-2 border-b" style={{ borderColor: "#1a0505" }}>
          <span className="text-xs font-mono" style={{ color: "#cc0000" }}>// ACTIVITY</span>
        </div>
        <div className="divide-y" style={{ borderColor: "#100202" }}>
          {comments.length === 0 && (
            <p className="px-4 py-6 text-center text-xs font-mono" style={{ color: "#333" }}>No activity yet</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="px-4 py-3 flex gap-3">
              <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5"
                style={{ background: "#1a0505", border: "1px solid #cc0000", color: "#cc0000" }}>
                {c.user ? initials(c.user.name) : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono" style={{ color: "#888" }}>{c.user?.name ?? "Unknown"}</span>
                  {c.type === "STATUS_CHANGE" && c.newStatus && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: STATUS_COLOR[c.newStatus] ?? "#666", background: (STATUS_COLOR[c.newStatus] ?? "#666") + "18", border: `1px solid ${(STATUS_COLOR[c.newStatus] ?? "#666")}40` }}>
                      → {c.newStatus.replace("_", " ")}
                    </span>
                  )}
                  <span className="text-xs font-mono ml-auto" style={{ color: "#333" }}>{fmt(c.createdAt)}</span>
                </div>
                {c.text && <p className="text-sm text-gray-400">{c.text}</p>}
              </div>
            </div>
          ))}
        </div>
        {/* Add comment */}
        <form onSubmit={submitComment} className="px-4 py-3 border-t flex gap-2" style={{ borderColor: "#1a0505" }}>
          <input
            className="cyber-input text-xs flex-1"
            placeholder="Add a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="submit" disabled={submittingComment || !commentText.trim()} className="cyber-btn text-xs flex items-center gap-1" style={{ padding: "4px 12px" }}>
            <Send size={11} /> {submittingComment ? "…" : "Send"}
          </button>
        </form>
      </div>

      {/* Meta footer */}
      <p className="text-xs font-mono text-center" style={{ color: "#333" }}>
        Created {fmt(ticket.createdAt)}
      </p>

      {showOpenAction && (
        <OpenActionModal
          title={ticket.title}
          isLeader={isLeader}
          onConfirm={handleOpenActionConfirm}
          onCancel={() => setShowOpenAction(false)}
        />
      )}
      {confirmStatus && (
        <ConfirmStatusModal
          from={ticket.status}
          to={confirmStatus}
          isLeader={isLeader}
          onConfirm={handleStatusConfirm}
          onCancel={() => setConfirmStatus(null)}
        />
      )}
    </div>
  );
}
