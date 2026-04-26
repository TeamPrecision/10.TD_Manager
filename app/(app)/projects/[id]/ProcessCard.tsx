"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, ExternalLink, MessageSquare, Link2,
  Plus, X, ArrowRight, Paperclip, Download, Trash2,
} from "lucide-react";

// ---------- Types ----------

type Comment      = { id: string; text: string; createdAt: Date | string; user: { name: string } | null; type: string; newStatus: string | null };
type PLink        = { id: string; label: string; url: string; revision: string | null; addedBy: { name: string } | null };
type PFile        = { id: string; name: string; size: number; createdAt: Date | string };
type SIComment    = { id: string; text: string; createdAt: Date | string; user: { name: string } | null; type: string; newStatus: string | null };
type SILink       = { id: string; label: string; url: string; revision: string | null; addedBy: { name: string } | null };

export type SubItemRow = {
  id?: string;
  refId: string;
  status: string;
  deadline: Date | string | null;
  comments: SIComment[];
  links: SILink[];
};
export type FGRow      = { id: string; name: string; model: string };
export type FixtureRow = { id: string; name: string; fgs: FGRow[] };

export type Process = {
  id: string;
  stageKey: string;
  status: string;
  deadline: Date | string | null;
  comments: Comment[];
  links: PLink[];
  files: PFile[];
} | null;

// ---------- Constants ----------

const STATUS_CYCLE: Record<string, string> = { PENDING: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "IN_PROGRESS" };

export const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:     { label: "Pending",     color: "#555",    bg: "#111" },
  IN_PROGRESS: { label: "In Progress", color: "#ffaa00", bg: "#1a1200" },
  DONE:        { label: "Done",        color: "#00cc66", bg: "#001a0d" },
};

// ---------- Helpers ----------

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function toDateInputValue(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function calcDaysLeft(deadline: Date | string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}
function daysLeftColor(d: number | null): string {
  if (d === null) return "#555";
  if (d < 0)  return "#ff4444";
  if (d < 5)  return "#ff4444";
  if (d < 14) return "#ffaa00";
  return "#555";
}

// Derive main status from sub-items (all DONE → DONE; any IN_PROGRESS → IN_PROGRESS; else PENDING)
function deriveStatus(subItems: SubItemRow[] | undefined): string {
  const items = subItems ?? [];
  if (items.length === 0) return "PENDING";
  if (items.every((s) => s.status === "DONE")) return "DONE";
  if (items.some((s) => s.status === "IN_PROGRESS")) return "IN_PROGRESS";
  return "PENDING";
}

// Derive deadline = nearest non-done sub-item deadline
function deriveDeadline(subItems: SubItemRow[] | undefined): Date | null {
  const items = (subItems ?? []).filter((s) => s.status !== "DONE" && s.deadline);
  if (items.length === 0) return null;
  return new Date(Math.min(...items.map((s) => new Date(s.deadline!).getTime())));
}

// ---------- RFQ File section ----------

function RFQFiles({ projectId, stageKey, initialFiles, canEdit }: { projectId: string; stageKey: string; initialFiles: PFile[]; canEdit: boolean }) {
  const router = useRouter();
  const [files, setFiles] = useState<PFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("stageKey", stageKey);
      fd.append("file", file);
      const res = await fetch("/api/process-files", { method: "POST", body: fd });
      if (!res.ok) { setError("Upload failed"); return; }
      const data = await res.json();
      setFiles((f) => [...f, data]);
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeFile(id: string) {
    await fetch(`/api/process-files/${id}`, { method: "DELETE" });
    setFiles((f) => f.filter((x) => x.id !== id));
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono" style={{ color: "#444" }}>// EXCEL FILES</span>
        {canEdit && (
          <label className="flex items-center gap-1 text-xs font-mono cursor-pointer hover:text-red-400 transition-colors" style={{ color: "#666" }}>
            <Paperclip size={10} />
            {uploading ? "Uploading..." : "Attach"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mb-1">{error}</p>}
      {files.length === 0 && <p className="text-xs" style={{ color: "#666" }}>No files attached</p>}
      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-2 py-1">
          <Paperclip size={10} style={{ color: "#440000", flexShrink: 0 }} />
          <a href={`/api/process-files/${f.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 truncate flex-1">
            {f.name}
          </a>
          <span className="text-xs font-mono text-gray-700">{formatBytes(f.size)}</span>
          <a href={`/api/process-files/${f.id}`} download={f.name} className="text-gray-700 hover:text-blue-400"><Download size={11} /></a>
          {canEdit && <button onClick={() => removeFile(f.id)} className="text-gray-700 hover:text-red-400"><Trash2 size={11} /></button>}
        </div>
      ))}
    </div>
  );
}

// ---------- Item status color helper ----------

function itemStatusColor(s: string) {
  if (s === "RECEIVED" || s === "AVAILABLE") return "#00cc66";
  if (s === "ORDERED") return "#4488ff";
  if (s === "IN_USE") return "#ff8800";
  if (s === "SENT_TO_VENDOR") return "#aa88ff";
  return "#555";
}

// ---------- Issued items panel (EQUIPMENT_ORDERED) ----------

type IssueEntry = {
  id: string;
  quantity: number;
  notes: string | null;
  item: { id: string; name: string; quantity: number; unit: string | null; price: number | null; pr: string | null; status: string };
  project: { id: string; name: string };
  fixture: { id: string; name: string };
};

function IssuedItemsPanel({ fixtureId, onStatusDerived }: { fixtureId: string; onStatusDerived?: (s: string) => void }) {
  const [issues, setIssues] = useState<IssueEntry[] | null>(null);

  useEffect(() => {
    fetch(`/api/item-issues?fixtureId=${fixtureId}`)
      .then((r) => r.json())
      .then((data: IssueEntry[]) => {
        setIssues(data);
        if (onStatusDerived) {
          const derived =
            data.length === 0 ? "DONE" :
            data.every((i) => i.item.status !== "PENDING" && i.item.status !== "ORDERED") ? "DONE" : "IN_PROGRESS";
          onStatusDerived(derived);
        }
      });
  }, [fixtureId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (issues === null) return <p style={{ color: "#444", fontSize: "0.65rem", fontFamily: "monospace" }}>Loading…</p>;
  if (issues.length === 0) return <p style={{ color: "#555", fontSize: "0.65rem", fontFamily: "monospace" }}>No items issued</p>;

  return (
    <div className="space-y-0.5">
      {issues.map((iss) => (
        <div key={iss.id} className="flex items-center gap-2 py-0.5">
          <span className="flex-1 font-mono text-gray-400" style={{ fontSize: "0.65rem" }}>{iss.item.name}</span>
          {iss.item.pr && <span className="font-mono" style={{ fontSize: "0.6rem", color: "#664444" }}>{iss.item.pr}</span>}
          <span className="font-mono text-gray-600" style={{ fontSize: "0.65rem" }}>
            {iss.quantity}{iss.item.unit ? ` ${iss.item.unit}` : ""}
          </span>
          {iss.item.price != null && (
            <span className="font-mono text-gray-600" style={{ fontSize: "0.65rem" }}>
              ${(iss.item.price * iss.quantity).toFixed(2)}
            </span>
          )}
          <span className="font-mono" style={{ fontSize: "0.6rem", color: itemStatusColor(iss.item.status) }}>
            {iss.item.status.replace(/_/g, " ")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- Customer items panel (CUSTOMER_EQUIPMENT) ----------

type CustomerItemEntry = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  status: string;
};

function CustomerItemsPanel({ fixtureId, fgId, onStatusDerived }: { fixtureId?: string; fgId?: string; onStatusDerived?: (s: string) => void }) {
  const [items, setItems] = useState<CustomerItemEntry[] | null>(null);

  useEffect(() => {
    const param = fixtureId ? `fixtureId=${fixtureId}` : `fgId=${fgId}`;
    fetch(`/api/customer-items?${param}`)
      .then((r) => r.json())
      .then((data: CustomerItemEntry[]) => {
        setItems(data);
        if (onStatusDerived) {
          const derived =
            data.length === 0 || data.every((i) => i.status === "RECEIVED") ? "DONE" : "IN_PROGRESS";
          onStatusDerived(derived);
        }
      });
  }, [fixtureId, fgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusColor = (s: string) =>
    s === "RECEIVED" ? "#00cc66" : s === "IN_PROGRESS" ? "#ffaa00" : "#555";

  if (items === null) return <p style={{ color: "#444", fontSize: "0.65rem", fontFamily: "monospace" }}>Loading…</p>;
  if (items.length === 0) return <p style={{ color: "#555", fontSize: "0.65rem", fontFamily: "monospace" }}>No customer items</p>;

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 py-0.5">
          <span className="flex-1 font-mono text-gray-400" style={{ fontSize: "0.65rem" }}>{item.name}</span>
          <span className="font-mono text-gray-600" style={{ fontSize: "0.65rem" }}>
            {item.quantity}{item.unit ? ` ${item.unit}` : ""}
          </span>
          {item.notes && <span className="text-gray-700 truncate max-w-20" style={{ fontSize: "0.6rem" }}>{item.notes}</span>}
          <span className="font-mono" style={{ fontSize: "0.6rem", color: statusColor(item.status) }}>
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- Sub-item row (expandable) ----------

function SubItemExpandedRow({
  label, refId, projectId, stageKey, refType, initial, canEdit,
}: {
  label: string;
  refId: string;
  projectId: string;
  stageKey: string;
  refType: string;
  initial: SubItemRow | undefined;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(initial?.status ?? "PENDING");
  const [deadline, setDeadline] = useState(toDateInputValue(initial?.deadline ?? null));
  const [comments, setComments] = useState<SIComment[]>(initial?.comments ?? []);
  const [links, setLinks] = useState<SILink[]>(initial?.links ?? []);

  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkRev, setLinkRev] = useState("");
  const [postingLink, setPostingLink] = useState(false);
  const [linkError, setLinkError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [confirmComment, setConfirmComment] = useState("");
  const [confirming, setConfirming] = useState(false);

  const isAutoStatus = stageKey === "EQUIPMENT_ORDERED" || stageKey === "CUSTOMER_EQUIPMENT" || stageKey === "SAMPLE_DEBUG";
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  const days = calcDaysLeft(deadline || null);

  function openStatusConfirm() {
    setNextStatus(STATUS_CYCLE[status] ?? "PENDING");
    setConfirmComment("");
    setConfirmOpen(true);
  }

  async function doStatusChange() {
    setConfirming(true);
    const res = await fetch("/api/process-sub-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, stageKey, refId, refType, status: nextStatus, deadline: deadline || null, comment: confirmComment }),
    });
    if (res.ok) {
      const data = await res.json();
      setStatus(nextStatus);
      if (data.historyComment) setComments((c) => [...c, data.historyComment]);
      router.refresh();
    }
    setConfirming(false);
    setConfirmOpen(false);
  }


  async function updateDeadline(val: string) {
    setDeadline(val);
    await fetch("/api/process-sub-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, stageKey, refId, refType, status, deadline: val || null }),
    });
    router.refresh();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    setCommentError("");
    try {
      const res = await fetch("/api/process-sub-item-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, stageKey, refId, refType, text: commentText }),
      });
      if (!res.ok) { setCommentError("Failed to post"); return; }
      const data = await res.json();
      setComments((c) => [...c, data]);
      setCommentText("");
      router.refresh();
    } finally {
      setPostingComment(false);
    }
  }

  async function postLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    setPostingLink(true);
    setLinkError("");
    try {
      const res = await fetch("/api/process-sub-item-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, stageKey, refId, refType, label: linkLabel, url: linkUrl, revision: linkRev }),
      });
      if (!res.ok) { setLinkError("Failed to add"); return; }
      const data = await res.json();
      setLinks((l) => [...l, data]);
      setLinkLabel(""); setLinkUrl(""); setLinkRev("");
      setShowLinkForm(false);
      router.refresh();
    } finally {
      setPostingLink(false);
    }
  }

  async function deleteLink(id: string) {
    await fetch(`/api/process-sub-item-links/${id}`, { method: "DELETE" });
    setLinks((l) => l.filter((x) => x.id !== id));
    router.refresh();
  }

  const nextStyle = STATUS_STYLE[nextStatus] ?? STATUS_STYLE.PENDING;

  return (
    <>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75" onClick={() => setConfirmOpen(false)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-sm relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// CHANGE STATUS</span>
              <button onClick={() => setConfirmOpen(false)}><X size={14} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <p className="text-sm text-gray-300 mb-1 truncate"><span className="font-mono" style={{ color: "#ff4444" }}>{label}</span></p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}44` }}>{style.label}</span>
              <ArrowRight size={12} style={{ color: "#555" }} />
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: nextStyle.color, background: nextStyle.bg, border: `1px solid ${nextStyle.color}44` }}>{nextStyle.label}</span>
            </div>
            <textarea
              className="cyber-input w-full text-xs mb-4 resize-none"
              rows={3}
              placeholder="Comment (optional)"
              value={confirmComment}
              onChange={(e) => setConfirmComment(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={doStatusChange} disabled={confirming} className="cyber-btn flex-1 text-xs">{confirming ? "Saving..." : "Confirm"}</button>
              <button onClick={() => setConfirmOpen(false)} className="flex-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="border-b" style={{ borderColor: "#110505" }}>
        <div className="flex items-center gap-3 py-1.5 pl-6 pr-4">
          <button
            onClick={isAutoStatus || !canEdit ? undefined : openStatusConfirm}
            disabled={isAutoStatus || !canEdit}
          className={`shrink-0 w-2 h-2 rounded-full border transition-all ${isAutoStatus || !canEdit ? "" : "hover:scale-125"}`}
          style={{ background: style.bg, borderColor: style.color, boxShadow: status !== "PENDING" ? `0 0 4px ${style.color}66` : "none", cursor: isAutoStatus || !canEdit ? "default" : "pointer" }}
          title={isAutoStatus ? `${style.label} (auto-derived from items)` : `${style.label}${canEdit ? " — click to change" : ""}`}
        />
        <span className="text-xs font-mono text-gray-400 flex-1">{label}</span>
        <span
          className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
          style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}44`, fontSize: "0.65rem" }}
        >
          {style.label}
        </span>
        {!isAutoStatus && (canEdit ? (
          <input
            type="date"
            value={deadline}
            onChange={(e) => updateDeadline(e.target.value)}
            className="cyber-input text-xs shrink-0"
            style={{ padding: "1px 4px", fontSize: "0.65rem", width: "108px", colorScheme: "dark" }}
          />
        ) : (
          <span className="text-xs font-mono shrink-0" style={{ width: "108px", color: deadline ? "#888" : "#333", fontSize: "0.65rem" }}>
            {deadline || "—"}
          </span>
        ))}
        <span className="text-xs font-mono shrink-0 w-10 text-right" style={{ color: daysLeftColor(days), fontSize: "0.65rem" }}>
          {days !== null ? `${days}d` : "—"}
        </span>
        <div className="flex items-center gap-1 text-gray-700 font-mono" style={{ fontSize: "0.65rem" }}>
          {links.length > 0 && <span className="flex items-center gap-0.5"><Link2 size={9} />{links.length}</span>}
          {comments.length > 0 && <span className="flex items-center gap-0.5 ml-1"><MessageSquare size={9} />{comments.length}</span>}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-700 hover:text-red-400 transition-colors shrink-0">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      </div>

      {expanded && (
        <div className="pl-10 pr-4 pb-3 pt-1 space-y-3" style={{ background: "#090505" }}>

          {stageKey === "EQUIPMENT_ORDERED" && (
            <div>
              <span className="font-mono block mb-1" style={{ color: "#666", fontSize: "0.65rem" }}>// ISSUED ITEMS</span>
              <IssuedItemsPanel fixtureId={refId} onStatusDerived={(s) => { setStatus(s); if (s !== (initial?.status ?? "PENDING")) router.refresh(); }} />
            </div>
          )}

          {stageKey === "CUSTOMER_EQUIPMENT" && (
            <div>
              <span className="font-mono block mb-1" style={{ color: "#666", fontSize: "0.65rem" }}>// CUSTOMER ITEMS</span>
              <CustomerItemsPanel fixtureId={refId} onStatusDerived={(s) => { setStatus(s); if (s !== (initial?.status ?? "PENDING")) router.refresh(); }} />
            </div>
          )}

          {stageKey === "SAMPLE_DEBUG" && (
            <div>
              <span className="font-mono block mb-1" style={{ color: "#666", fontSize: "0.65rem" }}>// SAMPLE BOARD ITEMS</span>
              <CustomerItemsPanel fgId={refId} onStatusDerived={(s) => { setStatus(s); if (s !== (initial?.status ?? "PENDING")) router.refresh(); }} />
            </div>
          )}

          {!isAutoStatus && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono" style={{ color: "#666", fontSize: "0.65rem" }}>// LINKS</span>
                  {canEdit && (
                    <button
                      onClick={() => setShowLinkForm(!showLinkForm)}
                      className="flex items-center gap-1 hover:text-red-400 transition-colors"
                      style={{ color: "#444", fontSize: "0.65rem", fontFamily: "var(--font-geist-mono)" }}
                    >
                      <Plus size={9} /> Add Link
                    </button>
                  )}
                </div>
                {links.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 py-0.5">
                    <ExternalLink size={9} style={{ color: "#440000", flexShrink: 0 }} />
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 truncate flex-1" style={{ fontSize: "0.7rem" }}>
                      {l.label}
                    </a>
                    {l.revision && <span className="font-mono text-gray-700" style={{ fontSize: "0.65rem" }}>r{l.revision}</span>}
                    {l.addedBy && <span className="text-gray-700" style={{ fontSize: "0.65rem" }}>{l.addedBy.name}</span>}
                    {canEdit && <button onClick={() => deleteLink(l.id)} className="text-gray-700 hover:text-red-400"><X size={9} /></button>}
                  </div>
                ))}
                {linkError && <p className="text-xs text-red-400">{linkError}</p>}
                {showLinkForm && (
                  <form onSubmit={postLink} className="mt-1 space-y-1">
                    <div className="flex gap-1">
                      <input className="cyber-input flex-1 text-xs" placeholder="Label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} required style={{ fontSize: "0.7rem", padding: "2px 6px" }} />
                      <input className="cyber-input text-xs w-14" placeholder="Rev" value={linkRev} onChange={(e) => setLinkRev(e.target.value)} style={{ fontSize: "0.7rem", padding: "2px 4px" }} />
                    </div>
                    <div className="flex gap-1">
                      <input className="cyber-input flex-1 text-xs" placeholder="URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required style={{ fontSize: "0.7rem", padding: "2px 6px" }} />
                      <button type="submit" disabled={postingLink} className="cyber-btn text-xs shrink-0" style={{ padding: "2px 8px", fontSize: "0.7rem" }}>Add</button>
                      <button type="button" onClick={() => setShowLinkForm(false)} className="text-gray-600 hover:text-red-400"><X size={11} /></button>
                    </div>
                  </form>
                )}
              </div>

              <div>
                <span className="font-mono mb-1 block" style={{ color: "#666", fontSize: "0.65rem" }}>// HISTORY</span>
                {comments.length === 0 && <p style={{ color: "#665555", fontSize: "0.65rem", fontFamily: "monospace" }}>No activity yet</p>}
                {comments.map((c) =>
                  c.type === "STATUS_CHANGE" ? (
                    <div key={c.id} className="mb-1 py-1 pl-2 border-l-2" style={{ borderColor: (STATUS_STYLE[c.newStatus ?? "PENDING"]?.color ?? "#333") + "88" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <ArrowRight size={9} style={{ color: STATUS_STYLE[c.newStatus ?? "PENDING"]?.color }} />
                        <span className="font-mono" style={{ color: STATUS_STYLE[c.newStatus ?? "PENDING"]?.color, fontSize: "0.65rem" }}>
                          {STATUS_STYLE[c.newStatus ?? "PENDING"]?.label ?? c.newStatus}
                        </span>
                        <span className="font-mono" style={{ color: "#cc0000", fontSize: "0.65rem" }}>{c.user?.name ?? "Unknown"}</span>
                        <span style={{ color: "#444", fontSize: "0.6rem" }}>{formatDate(c.createdAt)}</span>
                      </div>
                      {c.text && <p className="pl-3" style={{ color: "#666", fontSize: "0.65rem" }}>{c.text}</p>}
                    </div>
                  ) : (
                    <div key={c.id} className="mb-1 py-1 pl-2 border-l-2" style={{ borderColor: "#440a0a" }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono" style={{ color: "#cc0000", fontSize: "0.65rem" }}>{c.user?.name ?? "Unknown"}</span>
                        <span style={{ color: "#777", fontSize: "0.6rem" }}>{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-gray-400" style={{ fontSize: "0.7rem" }}>{c.text}</p>
                    </div>
                  )
                )}
                {commentError && <p className="text-xs text-red-400">{commentError}</p>}
                {canEdit && (
                  <form onSubmit={postComment} className="flex gap-1 mt-1">
                    <input
                      className="cyber-input flex-1 text-xs"
                      placeholder="Add comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      required
                      style={{ fontSize: "0.7rem", padding: "2px 6px" }}
                    />
                    <button type="submit" disabled={postingComment} className="cyber-btn text-xs shrink-0" style={{ padding: "2px 8px", fontSize: "0.7rem" }}>
                      Post
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </>
  );
}

// ---------- Project Won row (with confirmation popup) ----------

function ProjectWonRow({ projectId, process, canEdit }: { projectId: string; process: Process; canEdit: boolean }) {
  const router = useRouter();
  const status = process?.status ?? "PENDING";
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  const pendingStatus = status === "DONE" ? "PENDING" : "DONE";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmComment, setConfirmComment] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function doConfirm() {
    setConfirming(true);
    await fetch("/api/processes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, stageKey: "PROJECT_WON", status: pendingStatus, comment: confirmComment }),
    });
    setConfirming(false);
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75" onClick={() => setConfirmOpen(false)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-sm relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// PROJECT WON</span>
              <button onClick={() => setConfirmOpen(false)}><X size={14} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <p className="text-sm text-gray-300 mb-3">
              Mark project as <span className="font-mono" style={{ color: STATUS_STYLE[pendingStatus]?.color }}>{STATUS_STYLE[pendingStatus]?.label}</span>?
            </p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}44` }}>{style.label}</span>
              <ArrowRight size={12} style={{ color: "#555" }} />
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: STATUS_STYLE[pendingStatus]?.color, background: STATUS_STYLE[pendingStatus]?.bg, border: `1px solid ${STATUS_STYLE[pendingStatus]?.color}44` }}>
                {STATUS_STYLE[pendingStatus]?.label}
              </span>
            </div>
            <textarea
              className="cyber-input w-full text-xs mb-4 resize-none"
              rows={3}
              placeholder="Comment (optional)"
              value={confirmComment}
              onChange={(e) => setConfirmComment(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={doConfirm} disabled={confirming} className="cyber-btn flex-1 text-xs">
                {confirming ? "Saving..." : "Confirm"}
              </button>
              <button onClick={() => setConfirmOpen(false)} className="flex-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
        <button
          onClick={canEdit ? () => { setConfirmComment(""); setConfirmOpen(true); } : undefined}
          disabled={!canEdit}
          className={`shrink-0 w-2.5 h-2.5 rounded-full border transition-all ${canEdit ? "hover:scale-125" : ""}`}
          style={{ background: style.bg, borderColor: style.color, boxShadow: status !== "PENDING" ? `0 0 5px ${style.color}66` : "none", cursor: canEdit ? "pointer" : "default" }}
          title={`${style.label}${canEdit ? " — click to change" : ""}`}
        />
        <div className="w-44 shrink-0 flex items-center gap-1">
          <span className="w-3 shrink-0" />
          <span className="text-sm text-gray-200 font-mono">Project Won</span>
        </div>
        <span
          className="text-xs font-mono px-2 py-0.5 rounded shrink-0 w-24 text-center"
          style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}44` }}
        >
          {style.label}
        </span>
        <span className="text-xs font-mono text-gray-800 w-28 shrink-0">—</span>
        <span className="text-xs font-mono text-gray-800 w-16 shrink-0">—</span>
        <span className="flex-1" />
      </div>
    </>
  );
}

// ---------- Main ProcessCard ----------

export default function ProcessCard({
  stageLabel, stageKey, projectId, process,
  fixtures, allFGs, subItems,
  forceSubExpanded, forceToken, canEdit = true,
}: {
  stageLabel: string;
  stageKey: string;
  projectId: string;
  process: Process;
  fixtures?: FixtureRow[];
  allFGs?: FGRow[];
  subItems?: SubItemRow[];
  forceSubExpanded?: boolean;
  forceToken?: number;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [subExpanded, setSubExpanded] = useState(false);
  useEffect(() => {
    if (forceToken) setSubExpanded(forceSubExpanded ?? false);
  }, [forceToken]); // eslint-disable-line react-hooks/exhaustive-deps
  const [expanded, setExpanded] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [confirmComment, setConfirmComment] = useState("");
  const [confirming, setConfirming] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkRev, setLinkRev] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [submittingLink, setSubmittingLink] = useState(false);
  const [linkError, setLinkError] = useState("");

  if (stageKey === "PROJECT_WON") {
    return <ProjectWonRow projectId={projectId} process={process} canEdit={canEdit} />;
  }

  const isRFQ = stageKey === "RFQ";
  const hasFixtures = (fixtures?.length ?? 0) > 0;
  const hasFGs = (allFGs?.length ?? 0) > 0;
  const hasSubs = hasFixtures || hasFGs;

  // Derive status and deadline from sub-items when this stage has sub-processes
  const status = hasSubs
    ? deriveStatus(subItems)
    : (process?.status ?? (isRFQ ? "IN_PROGRESS" : "PENDING"));

  const displayDeadline: Date | string | null = hasSubs
    ? deriveDeadline(subItems)
    : (process?.deadline ?? null);

  const style = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
  const comments = process?.comments ?? [];
  const links = process?.links ?? [];
  const files = process?.files ?? [];
  const commentOnlyCount = comments.filter((c) => c.type === "COMMENT").length;
  const subItemMap = Object.fromEntries((subItems ?? []).map((s) => [s.refId, s]));
  const days = isRFQ ? null : calcDaysLeft(displayDeadline);

  // Build label map for sub-items so we can annotate their history entries
  const subLabelMap: Record<string, string> = {};
  for (const fx of fixtures ?? []) subLabelMap[fx.id] = fx.name;
  for (const fg of allFGs ?? []) subLabelMap[fg.id] = `${fg.name} | ${fg.model}`;

  type MergedEntry = {
    id: string; text: string; createdAt: Date | string;
    user: { name: string } | null; type: string; newStatus: string | null;
    subLabel?: string;
  };
  const mergedHistory: MergedEntry[] = [
    ...comments.map((c): MergedEntry => ({ ...c, subLabel: undefined })),
    ...(subItems ?? []).flatMap((si): MergedEntry[] =>
      (si.comments ?? [])
        .filter((c) => c.type === "STATUS_CHANGE")
        .map((c): MergedEntry => ({ ...c, subLabel: subLabelMap[si.refId] ?? si.refId }))
    ),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  function openConfirm() {
    setPendingStatus(STATUS_CYCLE[status] ?? "PENDING");
    setConfirmComment("");
    setConfirmOpen(true);
  }

  async function confirmStatusChange() {
    setConfirming(true);
    await fetch("/api/processes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, stageKey, status: pendingStatus, comment: confirmComment }),
    });
    setConfirming(false);
    setConfirmOpen(false);
    router.refresh();
  }

  async function updateDeadline(value: string) {
    await fetch("/api/processes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, stageKey, deadline: value || null }),
    });
    router.refresh();
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    setCommentError("");
    try {
      const res = await fetch("/api/process-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, stageKey, text: commentText }),
      });
      if (!res.ok) { setCommentError("Failed — try re-logging in"); return; }
      setCommentText("");
      router.refresh();
    } finally {
      setSubmittingComment(false);
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    setSubmittingLink(true);
    setLinkError("");
    try {
      const res = await fetch("/api/process-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, stageKey, label: linkLabel, url: linkUrl, revision: linkRev }),
      });
      if (!res.ok) { setLinkError("Failed — try re-logging in"); return; }
      setLinkLabel(""); setLinkUrl(""); setLinkRev("");
      setShowLinkForm(false);
      router.refresh();
    } finally {
      setSubmittingLink(false);
    }
  }

  return (
    <>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75" onClick={() => setConfirmOpen(false)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-sm relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// CHANGE STATUS</span>
              <button onClick={() => setConfirmOpen(false)}><X size={14} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <p className="text-sm text-gray-300 mb-1"><span className="font-mono" style={{ color: "#ff4444" }}>{stageLabel}</span></p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}44` }}>{style.label}</span>
              <ArrowRight size={12} style={{ color: "#555" }} />
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: STATUS_STYLE[pendingStatus]?.color, background: STATUS_STYLE[pendingStatus]?.bg, border: `1px solid ${STATUS_STYLE[pendingStatus]?.color}44` }}>
                {STATUS_STYLE[pendingStatus]?.label}
              </span>
            </div>
            <textarea className="cyber-input w-full text-xs mb-4 resize-none" rows={3} placeholder="Comment (optional)" value={confirmComment} onChange={(e) => setConfirmComment(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={confirmStatusChange} disabled={confirming} className="cyber-btn flex-1 text-xs">{confirming ? "Saving..." : "Confirm"}</button>
              <button onClick={() => setConfirmOpen(false)} className="flex-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b" style={{ borderColor: "#1a0505" }}>
        {/* Main row */}
        <div className="flex items-center gap-3 px-5 py-3">

          {/* Status dot — disabled when sub-processes drive the status or canEdit=false */}
          <button
            onClick={hasSubs || !canEdit ? undefined : openConfirm}
            disabled={hasSubs || !canEdit}
            className="shrink-0 w-2.5 h-2.5 rounded-full border transition-all"
            style={{
              background: style.bg,
              borderColor: style.color,
              boxShadow: status !== "PENDING" ? `0 0 5px ${style.color}66` : "none",
              cursor: hasSubs || !canEdit ? "default" : "pointer",
              transform: hasSubs ? "none" : undefined,
            }}
            title={hasSubs ? `${style.label} (auto-derived from sub-processes)` : `${style.label}${canEdit ? " — click to change" : ""}`}
          />

          {/* Stage name with sub-expand toggle */}
          <div className="w-44 shrink-0 flex items-center gap-1 min-w-0">
            {hasSubs ? (
              <button
                onClick={() => setSubExpanded((v) => !v)}
                className="shrink-0 text-gray-700 hover:text-red-400 transition-colors"
                title={subExpanded ? "Collapse sub-processes" : "Expand sub-processes"}
              >
                {subExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            ) : (
              <span className="w-3 shrink-0" />
            )}
            <span className="text-sm text-gray-200 font-mono truncate">{stageLabel}</span>
          </div>

          {/* Status badge */}
          <span
            className="text-xs font-mono px-2 py-0.5 rounded shrink-0 w-24 text-center"
            style={{ color: style.color, background: style.bg, border: `1px solid ${style.color}44` }}
          >
            {style.label}
          </span>

          {/* Deadline */}
          {isRFQ ? (
            <span className="w-28 shrink-0 text-xs font-mono text-gray-800">—</span>
          ) : hasSubs ? (
            // Derived from sub-processes — read-only
            <span
              className="shrink-0 text-xs font-mono"
              style={{ width: "120px", color: displayDeadline ? "#888" : "#333", fontSize: "0.7rem" }}
            >
              {displayDeadline ? formatDate(displayDeadline) : "—"}
            </span>
          ) : canEdit ? (
            <input
              type="date"
              defaultValue={toDateInputValue(process?.deadline ?? null)}
              onChange={(e) => updateDeadline(e.target.value)}
              className="cyber-input text-xs shrink-0"
              style={{ padding: "2px 6px", fontSize: "0.7rem", width: "120px", colorScheme: "dark" }}
            />
          ) : (
            <span
              className="shrink-0 text-xs font-mono"
              style={{ width: "120px", color: process?.deadline ? "#888" : "#333", fontSize: "0.7rem" }}
            >
              {process?.deadline ? formatDate(process.deadline) : "—"}
            </span>
          )}

          {/* Days left */}
          <span className="text-xs font-mono shrink-0 w-16 text-right" style={{ color: daysLeftColor(days) }}>
            {days !== null ? `${days}d` : "—"}
          </span>

          {/* Counts */}
          <div className="flex items-center gap-2 text-xs text-gray-700 font-mono flex-1">
            {isRFQ && files.length > 0 && <span className="flex items-center gap-1"><Paperclip size={10} />{files.length}</span>}
            {commentOnlyCount > 0 && <span className="flex items-center gap-1"><MessageSquare size={10} />{commentOnlyCount}</span>}
            {links.length > 0 && <span className="flex items-center gap-1"><Link2 size={10} />{links.length}</span>}
            {hasSubs && (
              <span className="text-gray-800" style={{ fontSize: "0.65rem" }}>
                {(subItems ?? []).filter((s) => s.status === "DONE").length}/{(fixtures?.length ?? 0) + (allFGs?.length ?? 0)}
              </span>
            )}
          </div>

          {/* Detail expand (links + comments) */}
          <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-gray-700 hover:text-red-400 transition-colors">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        {/* Sub-process rows — only when subExpanded */}
        {subExpanded && hasFixtures && fixtures!.map((fx) => (
          <SubItemExpandedRow
            key={fx.id}
            label={fx.name}
            refId={fx.id}
            projectId={projectId}
            stageKey={stageKey}
            refType="FIXTURE"
            initial={subItemMap[fx.id]}
            canEdit={canEdit}
          />
        ))}
        {subExpanded && hasFGs && allFGs!.map((fg) => (
          <SubItemExpandedRow
            key={fg.id}
            label={`${fg.name} | ${fg.model}`}
            refId={fg.id}
            projectId={projectId}
            stageKey={stageKey}
            refType="FG"
            initial={subItemMap[fg.id]}
            canEdit={canEdit}
          />
        ))}

        {/* Expanded detail (links + comments) */}
        {expanded && (
          <div className="px-5 pb-4 space-y-4 pt-1" style={{ background: "#0a0a0a" }}>

            {isRFQ && (
              <RFQFiles projectId={projectId} stageKey={stageKey} initialFiles={files} canEdit={canEdit} />
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono" style={{ color: "#666" }}>// LINKS</span>
                {canEdit && (
                  <button onClick={() => setShowLinkForm(!showLinkForm)} className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#777" }}>
                    <Plus size={10} /> Add Link
                  </button>
                )}
              </div>
              {links.length === 0 && !showLinkForm && <p className="text-xs" style={{ color: "#666" }}>No links yet</p>}
              {links.map((l) => (
                <div key={l.id} className="flex items-center gap-2 py-1">
                  <ExternalLink size={11} style={{ color: "#440000", flexShrink: 0 }} />
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 truncate flex-1">{l.label}</a>
                  {l.revision && <span className="text-xs font-mono text-gray-700">r{l.revision}</span>}
                  {l.addedBy && <span className="text-xs text-gray-700">{l.addedBy.name}</span>}
                </div>
              ))}
              {linkError && <p className="text-xs text-red-400">{linkError}</p>}
              {showLinkForm && (
                <form onSubmit={addLink} className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <input className="cyber-input flex-1 text-xs" placeholder="Label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} required />
                    <input className="cyber-input text-xs w-20" placeholder="Rev" value={linkRev} onChange={(e) => setLinkRev(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <input className="cyber-input flex-1 text-xs" placeholder="URL / SVN path" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required />
                    <button type="submit" disabled={submittingLink} className="cyber-btn text-xs shrink-0" style={{ padding: "4px 12px" }}>Add</button>
                    <button type="button" onClick={() => setShowLinkForm(false)} className="text-gray-600 hover:text-red-400"><X size={13} /></button>
                  </div>
                </form>
              )}
            </div>

            <div>
              <span className="text-xs font-mono mb-2 block" style={{ color: "#666" }}>// HISTORY</span>
              {mergedHistory.length === 0 && <p className="text-xs mb-2" style={{ color: "#666" }}>No activity yet</p>}
              {mergedHistory.map((c) =>
                c.type === "STATUS_CHANGE" ? (
                  <div key={c.id} className="mb-2 py-1.5 pl-3 border-l-2" style={{ borderColor: (STATUS_STYLE[c.newStatus ?? "PENDING"]?.color ?? "#666") + "88" }}>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {c.subLabel && (
                        <span className="text-xs font-mono" style={{ color: "#885555", fontSize: "0.65rem" }}>[{c.subLabel}]</span>
                      )}
                      <ArrowRight size={10} style={{ color: STATUS_STYLE[c.newStatus ?? "PENDING"]?.color }} />
                      <span className="text-xs font-mono" style={{ color: STATUS_STYLE[c.newStatus ?? "PENDING"]?.color }}>{STATUS_STYLE[c.newStatus ?? "PENDING"]?.label ?? c.newStatus}</span>
                      <span className="text-xs font-mono" style={{ color: "#cc0000" }}>{c.user?.name ?? "Unknown"}</span>
                      <span className="text-xs" style={{ color: "#777" }}>{formatDate(c.createdAt)}</span>
                    </div>
                    {c.text && <p className="text-xs text-gray-500 pl-3">{c.text}</p>}
                  </div>
                ) : (
                  <div key={c.id} className="mb-2 py-1.5 pl-3 border-l-2" style={{ borderColor: "#440a0a" }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono" style={{ color: "#cc0000" }}>{c.user?.name ?? "Unknown"}</span>
                      <span className="text-xs" style={{ color: "#777" }}>{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-400">{c.text}</p>
                  </div>
                )
              )}
              {commentError && <p className="text-xs text-red-400 mb-1">{commentError}</p>}
              {canEdit && (
                <form onSubmit={addComment} className="flex gap-2 mt-2">
                  <input className="cyber-input flex-1 text-xs" placeholder="Add a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} required />
                  <button type="submit" disabled={submittingComment} className="cyber-btn text-xs shrink-0" style={{ padding: "4px 12px" }}>Post</button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
