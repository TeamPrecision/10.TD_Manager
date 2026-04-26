"use client";
import { useState, useMemo, useCallback } from "react";
import { Plus, X, Trash2, ArrowRight, History } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";

const STATUS_ORDER = ["PENDING", "IN_PROGRESS", "RECEIVED"];

const STATUS_COLOR: Record<string, string> = {
  PENDING:     "#666",
  IN_PROGRESS: "#ffaa00",
  RECEIVED:    "#00cc66",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type CommentEntry = {
  id: string;
  type: string;
  newStatus: string | null;
  text: string;
  createdAt: string;
  user: { name: string } | null;
};

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  status: string;
  projectId: string | null;
  fixtureId: string | null;
  fgId: string | null;
  updatedAt: string;
  project: { id: string; name: string } | null;
  fixture: { id: string; name: string } | null;
  fg: { id: string; name: string; model: string } | null;
  comments: CommentEntry[];
};

type FGOption = { id: string; name: string; model: string };

type ProjectOption = {
  id: string;
  name: string;
  stage: string;
  fixtures: { id: string; name: string; fgs: FGOption[] }[];
};

export default function CustomerItemsManager({
  initialItems,
  projects,
  role,
}: {
  initialItems: ItemRow[];
  projects: ProjectOption[];
  role?: string;
}) {
  const isLeader = role === "LEADER";
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [flashingRows, setFlashingRows] = useState<Set<string>>(new Set());
  const flashRow = useCallback((id: string) => {
    setFlashingRows((prev) => new Set(prev).add(id));
    setTimeout(() => setFlashingRows((prev) => { const n = new Set(prev); n.delete(id); return n; }), 900);
  }, []);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add form state (customer equipment)
  const [formName, setFormName] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formFixtureId, setFormFixtureId] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("PENDING");
  const [submitting, setSubmitting] = useState(false);

  // Sample board form state
  const [showSbForm, setShowSbForm] = useState(false);
  const [sbProjectId, setSbProjectId] = useState("");
  const [sbFgId, setSbFgId] = useState("");
  const [sbQty, setSbQty] = useState("1");
  const [sbStatus, setSbStatus] = useState("PENDING");
  const [sbNotes, setSbNotes] = useState("");
  const [sbSubmitting, setSbSubmitting] = useState(false);

  // Status change confirmation modal
  const [confirmItem, setConfirmItem] = useState<ItemRow | null>(null);
  const [confirmNext, setConfirmNext] = useState("");
  const [confirmComment, setConfirmComment] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ItemRow | null>(null);
  const [deleteComment, setDeleteComment] = useState("");

  const stats = useMemo(() => ({
    pending:    items.filter((i) => i.status === "PENDING").length,
    inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
    received:   items.filter((i) => i.status === "RECEIVED").length,
  }), [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => {
      if (q && !i.name.toLowerCase().includes(q) && !(i.project?.name ?? "").toLowerCase().includes(q)) return false;
      if (filterProject && i.projectId !== filterProject) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      return true;
    });
  }, [items, search, filterProject, filterStatus]);

  const formFixtures = useMemo(
    () => projects.find((p) => p.id === formProjectId)?.fixtures ?? [],
    [projects, formProjectId],
  );

  const sbFGs = useMemo(
    () => projects.find((p) => p.id === sbProjectId)?.fixtures.flatMap((fx) => fx.fgs) ?? [],
    [projects, sbProjectId],
  );

  async function addSampleBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!sbFgId || !sbProjectId) return;
    setSbSubmitting(true);
    try {
      const fg = sbFGs.find((f) => f.id === sbFgId);
      if (!fg) return;
      const res = await fetch("/api/customer-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fg.name,
          projectId: sbProjectId,
          fgId: sbFgId,
          quantity: parseInt(sbQty) || 1,
          notes: sbNotes || null,
          status: sbStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [data, ...prev]);
        setSbFgId(""); setSbQty("1"); setSbStatus("PENDING"); setSbNotes("");
      }
    } finally {
      setSbSubmitting(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          projectId: formProjectId || null,
          fixtureId: formFixtureId || null,
          quantity: parseInt(formQty) || 1,
          notes: formNotes || null,
          status: formStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [data, ...prev]);
        setFormName(""); setFormQty("1"); setFormNotes(""); setFormStatus("PENDING"); setFormFixtureId("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function openStatusConfirm(item: ItemRow, nextStatus: string) {
    setConfirmItem(item);
    setConfirmNext(nextStatus);
    setConfirmComment("");
  }

  async function doStatusChange() {
    if (!confirmItem) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/customer-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmItem.id, status: confirmNext, comment: confirmComment }),
      });
      if (res.ok) {
        const { item: updated, historyComment } = await res.json();
        const changedId = confirmItem.id;
        setItems((prev) => prev.map((i) => {
          if (i.id !== changedId) return i;
          const comments = historyComment ? [...i.comments, historyComment] : i.comments;
          return { ...updated, comments };
        }));
        flashRow(changedId);
      }
    } finally {
      setConfirming(false);
      setConfirmItem(null);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/customer-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, comment: deleteComment }),
    });
    setDeleteComment("");
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader label="Customer Items" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending",     value: stats.pending,    color: "#888" },
          { label: "In Progress", value: stats.inProgress, color: "#ffaa00" },
          { label: "Received",    value: stats.received,   color: "#00cc66" },
        ].map((s) => (
          <div key={s.label} className="cyber-card cyber-card-red p-4">
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className="cyber-input text-xs flex-1 min-w-32"
          placeholder="Search items or project…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="cyber-input text-xs" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="cyber-input text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={() => { setShowSbForm(false); setShowAddForm((v) => !v); }}
          className="cyber-btn text-xs flex items-center gap-1"
          style={{ padding: "4px 12px" }}
        >
          {showAddForm ? <><X size={12} /> Close</> : <><Plus size={12} /> Add Item</>}
        </button>
        <button
          onClick={() => { setShowAddForm(false); setShowSbForm((v) => !v); }}
          className="text-xs flex items-center gap-1 font-mono px-3 py-1 rounded border transition-colors hover:border-yellow-500 hover:text-yellow-400"
          style={{ color: "#888", borderColor: "#333" }}
        >
          {showSbForm ? <><X size={12} /> Close</> : <><Plus size={12} /> Sample Board</>}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="cyber-card cyber-card-red p-4">
          <span className="text-xs font-mono block mb-3" style={{ color: "#cc0000" }}>// NEW CUSTOMER ITEM</span>
          <form onSubmit={addItem} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-3">
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Name *</label>
              <input className="cyber-input text-xs w-full" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Item description" />
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Project *</label>
              <select className="cyber-input text-xs w-full" required value={formProjectId} onChange={(e) => { setFormProjectId(e.target.value); setFormFixtureId(""); }}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Fixture</label>
              <select className="cyber-input text-xs w-full" value={formFixtureId} onChange={(e) => setFormFixtureId(e.target.value)} disabled={!formProjectId || formFixtures.length === 0}>
                <option value="">None</option>
                {formFixtures.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Qty *</label>
              <input type="number" min="1" required className="cyber-input text-xs w-full" value={formQty} onChange={(e) => setFormQty(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Status</label>
              <select className="cyber-input text-xs w-full" value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Notes</label>
              <input className="cyber-input text-xs w-full" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Customer notes, serial number, etc." />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button type="submit" disabled={submitting} className="cyber-btn text-xs" style={{ padding: "4px 20px" }}>
                {submitting ? "Adding…" : "Add Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sample Board form */}
      {showSbForm && (
        <div className="cyber-card p-4" style={{ borderColor: "#332200", background: "#0a0800" }}>
          <span className="text-xs font-mono block mb-3" style={{ color: "#ffaa00" }}>// ADD SAMPLE BOARD ITEM</span>
          <form onSubmit={addSampleBoard} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Project *</label>
              <select className="cyber-input text-xs w-full" required value={sbProjectId} onChange={(e) => { setSbProjectId(e.target.value); setSbFgId(""); }}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>FG *</label>
              <select className="cyber-input text-xs w-full" required value={sbFgId} onChange={(e) => setSbFgId(e.target.value)} disabled={!sbProjectId || sbFGs.length === 0}>
                <option value="">Select FG</option>
                {sbFGs.map((fg) => <option key={fg.id} value={fg.id}>{fg.name} — {fg.model}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Qty *</label>
              <input type="number" min="1" required className="cyber-input text-xs w-full" value={sbQty} onChange={(e) => setSbQty(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Status</label>
              <select className="cyber-input text-xs w-full" value={sbStatus} onChange={(e) => setSbStatus(e.target.value)}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Notes</label>
              <input className="cyber-input text-xs w-full" value={sbNotes} onChange={(e) => setSbNotes(e.target.value)} placeholder="Serial, notes…" />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button type="submit" disabled={sbSubmitting || !sbFgId} className="cyber-btn text-xs" style={{ padding: "4px 20px", borderColor: "#664400" }}>
                {sbSubmitting ? "Adding…" : "Add Sample Board Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="cyber-card cyber-card-red overflow-x-auto">
        <table className="cyber-table w-full" style={{ tableLayout: "fixed", minWidth: "680px" }}>
          <thead>
            <tr>
              <th style={{ width: "8%" }}>Type</th>
              <th style={{ width: "20%" }}>Item</th>
              <th style={{ width: "13%" }}>Project</th>
              <th style={{ width: "10%" }}>Fixture/FG</th>
              <th style={{ width: "6%" }}>Qty</th>
              <th style={{ width: "17%" }}>Notes</th>
              <th style={{ width: "13%" }}>Status</th>
              <th style={{ width: "9%" }}>Updated</th>
              <th style={{ width: "4%" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <>
                  <tr key={item.id} className={flashingRows.has(item.id) ? "row-flash" : undefined}>
                    <td>
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded whitespace-nowrap"
                        style={item.fgId
                          ? { color: "#ffaa00", background: "#ffaa0015", border: "1px solid #ffaa0033" }
                          : { color: "#4488ff", background: "#4488ff15", border: "1px solid #4488ff33" }}
                      >
                        {item.fgId ? "SB" : "CE"}
                      </span>
                    </td>
                    <td style={{ maxWidth: 0 }}>
                      <span className="block truncate text-gray-200" title={item.name}>{item.name}</span>
                    </td>
                    <td className="text-gray-500 text-xs truncate" title={item.project?.name ?? ""}>{item.project?.name ?? "—"}</td>
                    <td className="text-gray-600 text-xs truncate" title={item.fg ? `${item.fg.name} (${item.fg.model})` : (item.fixture?.name ?? "")}>
                      {item.fg ? `${item.fg.name}` : (item.fixture?.name ?? "—")}
                    </td>
                    <td className="font-mono text-xs">{item.quantity}</td>
                    <td className="text-gray-600 text-xs truncate" title={item.notes ?? ""}>{item.notes ?? "—"}</td>
                    <td>
                      {(() => {
                        const canChange = isLeader && item.status !== "RECEIVED";
                        return (
                          <button
                            onClick={canChange ? () => {
                              const idx = STATUS_ORDER.indexOf(item.status);
                              const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
                              openStatusConfirm(item, next);
                            } : undefined}
                            className={`text-xs font-mono px-2 py-0.5 rounded ${canChange ? "hover:opacity-80 transition-opacity" : "cursor-default"}`}
                            style={{ color: STATUS_COLOR[item.status] ?? "#666", background: (STATUS_COLOR[item.status] ?? "#666") + "15", border: `1px solid ${STATUS_COLOR[item.status] ?? "#666"}44` }}
                          >
                            {item.status.replace("_", " ")}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="text-gray-600 text-xs font-mono">{new Date(item.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="text-gray-700 hover:text-blue-400 transition-colors"
                          title="History"
                        >
                          <History size={12} />
                        </button>
                        {isLeader && (
                          <button
                            onClick={() => { setDeleteTarget(item); setDeleteComment(""); }}
                            className="text-gray-700 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={`${item.id}-detail`}>
                      <td colSpan={9} style={{ background: "#080505", padding: "0" }}>

                        <div className="px-6 py-3">
                          <p className="text-xs font-mono mb-2" style={{ color: "#664444" }}>// HISTORY</p>
                          {item.comments.length === 0
                            ? <p className="text-xs" style={{ color: "#444" }}>No activity yet</p>
                            : item.comments.map((c) => (
                              c.type === "STATUS_CHANGE" ? (
                                <div key={c.id} className="flex items-center gap-2 mb-1 flex-wrap">
                                  <ArrowRight size={9} style={{ color: STATUS_COLOR[c.newStatus ?? ""] ?? "#666" }} />
                                  <span className="text-xs font-mono" style={{ color: STATUS_COLOR[c.newStatus ?? ""] ?? "#666" }}>{c.newStatus}</span>
                                  <span className="text-xs font-mono" style={{ color: "#cc0000" }}>{c.user?.name ?? "System"}</span>
                                  <span className="text-xs text-gray-700">{formatDate(c.createdAt)}</span>
                                  {c.text && <span className="text-xs text-gray-600">{c.text}</span>}
                                </div>
                              ) : (
                                <div key={c.id} className="mb-1">
                                  <span className="text-xs font-mono" style={{ color: "#cc0000" }}>{c.user?.name ?? "System"}</span>
                                  <span className="text-xs text-gray-700 ml-2">{formatDate(c.createdAt)}</span>
                                  <p className="text-xs text-gray-500">{c.text}</p>
                                </div>
                              )
                            ))
                          }
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center text-gray-700 py-8">No items found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Status change confirmation modal */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75" onClick={() => setConfirmItem(null)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-sm relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// CHANGE STATUS</span>
              <button onClick={() => setConfirmItem(null)}><X size={14} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <p className="text-sm text-gray-300 mb-3 truncate">{confirmItem.name}</p>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: STATUS_COLOR[confirmItem.status], background: STATUS_COLOR[confirmItem.status] + "15", border: `1px solid ${STATUS_COLOR[confirmItem.status]}44` }}>
                {confirmItem.status}
              </span>
              <ArrowRight size={12} style={{ color: "#555" }} />
              <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: STATUS_COLOR[confirmNext], background: STATUS_COLOR[confirmNext] + "15", border: `1px solid ${STATUS_COLOR[confirmNext]}44` }}>
                {confirmNext}
              </span>
            </div>
            <select className="cyber-input text-xs w-full mb-3" value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea
              className="cyber-input w-full text-xs mb-4 resize-none"
              rows={3}
              placeholder="Comment (optional)"
              value={confirmComment}
              onChange={(e) => setConfirmComment(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={doStatusChange} disabled={confirming} className="cyber-btn flex-1 text-xs">
                {confirming ? "Saving…" : "Confirm"}
              </button>
              <button onClick={() => setConfirmItem(null)} className="flex-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75" onClick={() => setDeleteTarget(null)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-sm relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// DELETE ITEM</span>
              <button onClick={() => setDeleteTarget(null)}><X size={14} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Delete <span className="font-mono" style={{ color: "#ff4444" }}>{deleteTarget.name}</span>? This cannot be undone.
            </p>
            <textarea
              className="cyber-input w-full text-xs mb-4 resize-none"
              rows={3} placeholder="Reason (optional)"
              value={deleteComment} onChange={(e) => setDeleteComment(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={doDelete} className="cyber-btn flex-1 text-xs">Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
