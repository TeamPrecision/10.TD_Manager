"use client";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Plus, X, Trash2, ArrowRight, ChevronDown, ChevronRight, PackageMinus, Columns } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";

const STATUS_ORDER = ["ORDERED", "RECEIVED"] as const;
type ItemStatus = typeof STATUS_ORDER[number];

const STATUS_COLOR: Record<string, string> = {
  ORDERED:  "#4488ff",
  RECEIVED: "#00cc66",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type CommentEntry = {
  id: string; type: string; newStatus: string | null;
  text: string; createdAt: string; user: { name: string } | null;
};
type IssueEntry = {
  id: string; quantity: number; notes: string | null; createdAt: string;
  project: { id: string; name: string };
  fixture: { id: string; name: string };
  user: { name: string } | null;
};
type ItemRow = {
  id: string; name: string; quantity: number; unit: string | null;
  source: string | null; price: number | null; nre: string | null; pr: string | null;
  status: string; updatedAt: string;
  project: { id: string; name: string } | null;
  fixture: { id: string; name: string } | null;
  comments: CommentEntry[]; issues: IssueEntry[];
};
type ProjectOption = { id: string; name: string; stage: string; fixtures: { id: string; name: string }[] };

// ── Shared confirmation modal ──────────────────────────────────────────────
function ConfirmModal({
  title, body, confirmLabel = "Confirm", destructive = false,
  onConfirm, onCancel, withComment = false,
}: {
  title: string; body: React.ReactNode; confirmLabel?: string; destructive?: boolean;
  onConfirm: (comment: string) => void; onCancel: () => void; withComment?: boolean;
}) {
  const [comment, setComment] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/75" onClick={onCancel} />
      <div className="cyber-card cyber-card-red p-6 w-full max-w-sm relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>{title}</span>
          <button onClick={onCancel}><X size={14} className="text-gray-600 hover:text-red-400" /></button>
        </div>
        <div className="mb-4">{body}</div>
        {withComment && (
          <textarea
            className="cyber-input w-full text-xs mb-4 resize-none"
            rows={3} placeholder="Comment (optional)"
            value={comment} onChange={(e) => setComment(e.target.value)}
          />
        )}
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(comment)}
            className={`cyber-btn flex-1 text-xs ${destructive ? "border-red-600" : ""}`}
          >{confirmLabel}</button>
          <button onClick={onCancel} className="flex-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function PurchasingManager({
  initialItems, projects, role, subRole,
}: {
  initialItems: ItemRow[]; projects: ProjectOption[];
  role?: string; subRole?: string | null;
}) {
  const isFullAccess = role === "LEADER" || subRole === "PURCHASING";
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [flashingRows, setFlashingRows] = useState<Set<string>>(new Set());
  const flashRow = useCallback((id: string) => {
    setFlashingRows((prev) => new Set(prev).add(id));
    setTimeout(() => setFlashingRows((prev) => { const n = new Set(prev); n.delete(id); return n; }), 900);
  }, []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [prDefault, setPrDefault] = useState("");

  // Filters
  const [fName, setFName] = useState("");
  const [fPr, setFPr] = useState("");
  const [fSource, setFSource] = useState("");
  const [fNre, setFNre] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fProject, setFProject] = useState("");
  const [fFixture, setFFixture] = useState("");
  const [fInStock, setFInStock] = useState(false);

  // Column visibility — single toggle: all optional cols visible or all hidden
  const [colsExpanded, setColsExpanded] = useState(true);

  // Per-row project/fixture expand
  const [expandedProjRows, setExpandedProjRows] = useState<Set<string>>(new Set());
  const [expandedFixRows, setExpandedFixRows] = useState<Set<string>>(new Set());

  // Add form
  const [formName, setFormName] = useState("");
  const [formPr, setFormPr] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formPrice, setFormPrice] = useState("");
  const [formNre, setFormNre] = useState("");
  const [formStatus, setFormStatus] = useState<ItemStatus>("ORDERED");
  const [submitting, setSubmitting] = useState(false);

  // Status change modal
  const [statusTarget, setStatusTarget] = useState<{ item: ItemRow; next: ItemStatus } | null>(null);

  // Withdraw modal
  const [withdrawItem, setWithdrawItem] = useState<ItemRow | null>(null);
  const [wProject, setWProject] = useState("");
  const [wFixture, setWFixture] = useState("");
  const [wQty, setWQty] = useState("1");
  const [wNotes, setWNotes] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ItemRow | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    ordered:  items.filter((i) => i.status === "ORDERED").length,
    received: items.filter((i) => i.status === "RECEIVED").length,
    total:    items.length,
  }), [items]);

  const allPRs = useMemo(() => {
    const seen = new Set<string>();
    return items.flatMap((i) => (i.pr && !seen.has(i.pr) ? (seen.add(i.pr), [i.pr]) : [])).sort();
  }, [items]);

  const allSources = useMemo(() => {
    const seen = new Set<string>();
    return items.flatMap((i) => (i.source && !seen.has(i.source) ? (seen.add(i.source), [i.source]) : [])).sort();
  }, [items]);

  const allNREs = useMemo(() => {
    const seen = new Set<string>();
    return items.flatMap((i) => (i.nre && !seen.has(i.nre) ? (seen.add(i.nre), [i.nre]) : [])).sort();
  }, [items]);

  const allProjects = useMemo(() => {
    const seen = new Set<string>();
    return items
      .flatMap((i) => i.issues.map((iss) => iss.project))
      .filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  }, [items]);

  const allFixtures = useMemo(() => {
    const seen = new Set<string>();
    return items
      .flatMap((i) => i.issues.map((iss) => iss.fixture))
      .filter((f) => { if (seen.has(f.id)) return false; seen.add(f.id); return true; });
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (fName && !i.name.toLowerCase().includes(fName.toLowerCase())) return false;
      if (fPr && !(i.pr ?? "").toLowerCase().includes(fPr.toLowerCase())) return false;
      if (fSource && !(i.source ?? "").toLowerCase().includes(fSource.toLowerCase())) return false;
      if (fNre && !(i.nre ?? "").toLowerCase().includes(fNre.toLowerCase())) return false;
      if (fStatus && i.status !== fStatus) return false;
      if (fProject && !i.issues.some((iss) => iss.project.id === fProject)) return false;
      if (fFixture && !i.issues.some((iss) => iss.fixture.id === fFixture)) return false;
      if (fInStock && (i.quantity - i.issues.reduce((s, iss) => s + iss.quantity, 0)) <= 0) return false;
      return true;
    });
  }, [items, fName, fPr, fSource, fNre, fStatus, fProject, fFixture, fInStock]);

  const wFixtures = useMemo(() => projects.find((p) => p.id === wProject)?.fixtures ?? [], [projects, wProject]);

  function issuedQty(item: ItemRow) { return item.issues.reduce((s, iss) => s + iss.quantity, 0); }

  function openAddForm() { setFormPr(prDefault); setShowAddForm(true); }
  function closeAddForm() { setShowAddForm(false); setPrDefault(""); setFormPr(""); }

  function toggleProjExpand(id: string) {
    setExpandedProjRows((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleFixExpand(id: string) {
    setExpandedFixRows((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const visibleColCount = colsExpanded ? 6 : 0;
  const totalColCount = 7 + visibleColCount; // 7 always-visible cols

  // ── Actions ───────────────────────────────────────────────────────────────
  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName, pr: formPr, source: formSource,
          quantity: parseInt(formQty) || 1,
          price: parseFloat(formPrice),
          nre: formNre || null,
          status: formStatus,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((p) => [data, ...p]);
        if (formPr) setPrDefault(formPr);
        setFormName(""); setFormSource(""); setFormQty("1"); setFormPrice(""); setFormNre(""); setFormPr(formPr);
      }
    } finally { setSubmitting(false); }
  }

  async function doStatusChange(comment: string) {
    if (!statusTarget) return;
    const { item, next } = statusTarget;
    setStatusTarget(null);
    const res = await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status: next, comment }),
    });
    if (res.ok) {
      const { item: updated, historyComment } = await res.json();
      setItems((prev) => prev.map((i) => {
        if (i.id !== item.id) return i;
        return { ...updated, comments: historyComment ? [...i.comments, historyComment] : i.comments, issues: i.issues };
      }));
      flashRow(item.id);
    }
  }

  async function doWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!withdrawItem) return;
    setWithdrawing(true);
    try {
      const res = await fetch("/api/item-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: withdrawItem.id, projectId: wProject, fixtureId: wFixture, quantity: parseInt(wQty) || 1, notes: wNotes || null }),
      });
      if (res.ok) {
        const newIssue: IssueEntry = await res.json();
        setItems((prev) => prev.map((i) => i.id === withdrawItem.id ? { ...i, issues: [...i.issues, newIssue] } : i));
        setWithdrawItem(null);
      }
    } finally { setWithdrawing(false); }
  }

  async function doDelete(comment: string) {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, comment }),
    });
  }

  const anyFilter = !!(fName || fPr || fSource || fNre || fStatus || fProject || fFixture || fInStock);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-full mx-auto space-y-5 px-2">
      <SectionHeader label="Purchasing &amp; Inventory" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ordered",  value: stats.ordered,  color: "#4488ff" },
          { label: "Received", value: stats.received, color: "#00cc66" },
          { label: "Total",    value: stats.total,    color: "#555" },
        ].map((s) => (
          <div key={s.label} className="cyber-card cyber-card-red p-4">
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Multi-column filter bar */}
      <div className="cyber-card cyber-card-red p-3">
        <p className="text-xs font-mono mb-2" style={{ color: "#444" }}>// FILTER</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Name</label>
            <input className="cyber-input text-xs w-full" placeholder="Search…" value={fName} onChange={(e) => setFName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>PR</label>
            <input list="filter-pr-list" className="cyber-input text-xs w-full" placeholder="PR-…" value={fPr} onChange={(e) => setFPr(e.target.value)} />
            <datalist id="filter-pr-list">{allPRs.map((v) => <option key={v} value={v} />)}</datalist>
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Source</label>
            <input list="filter-source-list" className="cyber-input text-xs w-full" placeholder="Vendor…" value={fSource} onChange={(e) => setFSource(e.target.value)} />
            <datalist id="filter-source-list">{allSources.map((v) => <option key={v} value={v} />)}</datalist>
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>NRE</label>
            <input list="filter-nre-list" className="cyber-input text-xs w-full" placeholder="NRE…" value={fNre} onChange={(e) => setFNre(e.target.value)} />
            <datalist id="filter-nre-list">{allNREs.map((v) => <option key={v} value={v} />)}</datalist>
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Status</label>
            <select className="cyber-input text-xs w-full" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">All</option>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Project</label>
            <select className="cyber-input text-xs w-full" value={fProject} onChange={(e) => { setFProject(e.target.value); setFFixture(""); }}>
              <option value="">All</option>
              {allProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Fixture</label>
            <select className="cyber-input text-xs w-full" value={fFixture} onChange={(e) => setFFixture(e.target.value)}>
              <option value="">All</option>
              {(fProject ? (projects.find((p) => p.id === fProject)?.fixtures ?? []) : allFixtures).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fInStock}
                onChange={(e) => setFInStock(e.target.checked)}
                className="accent-red-600"
              />
              <span className="text-xs font-mono" style={{ color: "#888" }}>In Stock Only</span>
            </label>
          </div>
        </div>
        {anyFilter && (
          <button
            onClick={() => { setFName(""); setFPr(""); setFSource(""); setFNre(""); setFStatus(""); setFProject(""); setFFixture(""); setFInStock(false); }}
            className="mt-2 text-xs font-mono hover:text-red-400 transition-colors"
            style={{ color: "#555" }}
          >
            × Clear filters
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex justify-end gap-2">
        <Link
          href="/purchasing/analyze"
          className="cyber-btn text-xs flex items-center gap-1"
          style={{ padding: "5px 12px", color: "#888" }}
        >
          Analyze →
        </Link>
        {/* Column visibility toggle */}
        <button
          onClick={() => setColsExpanded((v) => !v)}
          className="cyber-btn text-xs flex items-center gap-1"
          style={{ padding: "5px 10px" }}
        >
          <Columns size={11} /> {colsExpanded ? "Collapse" : "Expand"}
        </button>
        {isFullAccess && (
          <button
            onClick={showAddForm ? closeAddForm : openAddForm}
            className="cyber-btn text-xs flex items-center gap-1"
            style={{ padding: "5px 14px" }}
          >
            {showAddForm ? <><X size={12} /> Close</> : <><Plus size={12} /> Add Item</>}
          </button>
        )}
      </div>

      {/* Add form */}
      {isFullAccess && showAddForm && (
        <div className="cyber-card cyber-card-red p-4">
          <span className="text-xs font-mono block mb-3" style={{ color: "#cc0000" }}>// NEW ITEM</span>
          <form onSubmit={addItem} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="col-span-2 lg:col-span-2">
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Name *</label>
              <input className="cyber-input text-xs w-full" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Component name" />
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>PR *</label>
              <input className="cyber-input text-xs w-full" required value={formPr} onChange={(e) => setFormPr(e.target.value)} placeholder="PR-001" />
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Source *</label>
              <input list="add-source-list" className="cyber-input text-xs w-full" required value={formSource} onChange={(e) => setFormSource(e.target.value)} placeholder="Vendor / supplier" />
              <datalist id="add-source-list">{allSources.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Qty *</label>
              <input type="number" min="1" required className="cyber-input text-xs w-full" value={formQty} onChange={(e) => setFormQty(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Unit Price *</label>
              <input type="number" step="0.01" min="0" required className="cyber-input text-xs w-full" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>NRE *</label>
              <input className="cyber-input text-xs w-full" required value={formNre} onChange={(e) => setFormNre(e.target.value)} placeholder="e.g. 5,000 THB" />
            </div>
            <div>
              <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Status</label>
              <select className="cyber-input text-xs w-full" value={formStatus} onChange={(e) => setFormStatus(e.target.value as ItemStatus)}>
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex justify-end">
              <button type="submit" disabled={submitting} className="cyber-btn text-xs" style={{ padding: "5px 20px" }}>
                {submitting ? "Adding…" : "Add Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="cyber-card cyber-card-red overflow-x-auto">
        <table className="cyber-table w-full" style={{ tableLayout: "auto" }}>
          <thead>
            <tr>
              <th style={{ minWidth: "140px" }}>Item</th>
              {colsExpanded && <th style={{ minWidth: "70px" }}>PR</th>}
              {colsExpanded && <th style={{ minWidth: "70px" }}>NRE</th>}
              {colsExpanded && <th style={{ minWidth: "80px" }}>Source</th>}
              <th style={{ minWidth: "40px" }}>Qty</th>
              <th style={{ minWidth: "40px" }}>Rem.</th>
              {colsExpanded && <th style={{ minWidth: "60px" }}>Price</th>}
              {colsExpanded && <th style={{ minWidth: "60px" }}>Total</th>}
              <th style={{ minWidth: "80px" }}>Status</th>
              <th style={{ minWidth: "100px" }}>Project</th>
              <th style={{ minWidth: "90px" }}>Fixture</th>
              {colsExpanded && <th style={{ minWidth: "80px" }}>Updated</th>}
              <th style={{ minWidth: "110px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const issued = issuedQty(item);
              const remaining = item.quantity - issued;
              const isExp = expandedId === item.id;

              const uniqueProjects = [...new Map(item.issues.map((iss) => [iss.project.id, iss.project])).values()];
              const uniqueFixtures = [...new Map(item.issues.map((iss) => [iss.fixture.id, iss.fixture])).values()];
              const projExp = expandedProjRows.has(item.id);
              const fixExp = expandedFixRows.has(item.id);

              return (
                <>
                  <tr key={item.id} className={flashingRows.has(item.id) ? "row-flash" : undefined}>
                    <td style={{ maxWidth: "160px" }}>
                      <span className="block truncate text-gray-200 text-sm" title={item.name}>{item.name}</span>
                    </td>
                    {colsExpanded && (
                      <td className="font-mono text-xs truncate" style={{ color: "#664444", maxWidth: "80px" }} title={item.pr ?? ""}>{item.pr ?? "—"}</td>
                    )}
                    {colsExpanded && (
                      <td className="font-mono text-xs truncate" style={{ color: "#888", maxWidth: "80px" }} title={item.nre ?? ""}>{item.nre ?? "—"}</td>
                    )}
                    {colsExpanded && (
                      <td className="text-gray-500 text-xs truncate" style={{ maxWidth: "90px" }} title={item.source ?? ""}>{item.source ?? "—"}</td>
                    )}
                    <td className="font-mono text-sm text-center">{item.quantity}</td>
                    <td className="font-mono text-sm text-center" style={{ color: remaining <= 0 ? "#ff4444" : remaining < item.quantity ? "#ffaa00" : "#00cc66" }}>
                      {remaining}
                    </td>
                    {colsExpanded && (
                      <td className="font-mono text-xs text-gray-400">{item.price != null ? `$${item.price.toFixed(2)}` : "—"}</td>
                    )}
                    {colsExpanded && (
                      <td className="font-mono text-xs text-gray-400">{item.price != null ? `$${(item.price * item.quantity).toFixed(2)}` : "—"}</td>
                    )}
                    <td>
                      <button
                        onClick={isFullAccess ? () => setStatusTarget({ item, next: item.status === "ORDERED" ? "RECEIVED" : "ORDERED" }) : undefined}
                        className={`text-xs font-mono px-2 py-0.5 rounded whitespace-nowrap ${isFullAccess ? "hover:opacity-80 transition-opacity" : "cursor-default"}`}
                        style={{ color: STATUS_COLOR[item.status] ?? "#666", background: (STATUS_COLOR[item.status] ?? "#666") + "15", border: `1px solid ${STATUS_COLOR[item.status] ?? "#666"}44` }}
                      >
                        {item.status}
                      </button>
                    </td>
                    <td style={{ maxWidth: "120px" }}>
                      {uniqueProjects.length === 0 ? (
                        <span className="text-gray-700 text-xs">—</span>
                      ) : (
                        <div>
                          {(projExp ? uniqueProjects : uniqueProjects.slice(0, 1)).map((p) => (
                            <div key={p.id} className="text-gray-500 text-xs truncate">{p.name}</div>
                          ))}
                          {uniqueProjects.length > 1 && (
                            <button
                              onClick={() => toggleProjExpand(item.id)}
                              className="text-xs font-mono hover:text-gray-400 transition-colors mt-0.5"
                              style={{ color: "#555" }}
                            >
                              {projExp ? "▲ less" : `+${uniqueProjects.length - 1} more`}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: "110px" }}>
                      {uniqueFixtures.length === 0 ? (
                        <span className="text-gray-700 text-xs">—</span>
                      ) : (
                        <div>
                          {(fixExp ? uniqueFixtures : uniqueFixtures.slice(0, 1)).map((f) => (
                            <div key={f.id} className="text-gray-600 text-xs truncate">{f.name}</div>
                          ))}
                          {uniqueFixtures.length > 1 && (
                            <button
                              onClick={() => toggleFixExpand(item.id)}
                              className="text-xs font-mono hover:text-gray-400 transition-colors mt-0.5"
                              style={{ color: "#555" }}
                            >
                              {fixExp ? "▲ less" : `+${uniqueFixtures.length - 1} more`}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    {colsExpanded && (
                      <td className="text-gray-600 text-xs font-mono whitespace-nowrap">{new Date(item.updatedAt).toLocaleDateString()}</td>
                    )}
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => { setWithdrawItem(item); setWProject(""); setWFixture(""); setWQty("1"); setWNotes(""); }}
                          className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border transition-colors hover:border-yellow-500 hover:text-yellow-400 whitespace-nowrap"
                          style={{ color: "#888", borderColor: "#333" }}
                          title="Withdraw to project"
                        >
                          <PackageMinus size={11} /> Out
                        </button>
                        <button
                          onClick={() => setExpandedId(isExp ? null : item.id)}
                          className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border transition-colors hover:border-blue-500 hover:text-blue-400"
                          style={{ color: "#888", borderColor: "#333" }}
                        >
                          {isExp ? <ChevronDown size={11} /> : <ChevronRight size={11} />} Log
                        </button>
                        {isFullAccess && (
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border transition-colors hover:border-red-600 hover:text-red-400"
                            style={{ color: "#666", borderColor: "#333" }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isExp && (
                    <tr key={`${item.id}-exp`}>
                      <td colSpan={totalColCount} style={{ background: "#060404", padding: "0" }}>
                        <div className="px-5 py-3 grid grid-cols-2 gap-6 border-b" style={{ borderColor: "#1a0505" }}>
                          <div>
                            <p className="text-xs font-mono mb-2" style={{ color: "#664444" }}>// WITHDRAWALS</p>
                            {item.issues.length === 0
                              ? <p className="text-xs" style={{ color: "#444" }}>No withdrawals yet</p>
                              : item.issues.map((iss) => (
                                <div key={iss.id} className="flex items-center gap-2 mb-1 text-xs flex-wrap">
                                  <span className="text-gray-500">{iss.project.name}</span>
                                  <span className="text-gray-700">›</span>
                                  <span className="text-gray-500">{iss.fixture.name}</span>
                                  <span className="font-mono" style={{ color: "#ffaa00" }}>{iss.quantity} pcs</span>
                                  {iss.user && <span style={{ color: "#cc0000" }}>{iss.user.name}</span>}
                                  {iss.notes && <span className="text-gray-700">{iss.notes}</span>}
                                  <span className="text-gray-700 ml-auto">{fmt(iss.createdAt)}</span>
                                </div>
                              ))
                            }
                          </div>
                          <div>
                            <p className="text-xs font-mono mb-2" style={{ color: "#664444" }}>// STATUS HISTORY</p>
                            {item.comments.length === 0
                              ? <p className="text-xs" style={{ color: "#444" }}>No history yet</p>
                              : item.comments.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 mb-1 text-xs flex-wrap">
                                  <ArrowRight size={9} style={{ color: STATUS_COLOR[c.newStatus ?? ""] ?? "#666" }} />
                                  <span className="font-mono" style={{ color: STATUS_COLOR[c.newStatus ?? ""] ?? "#666" }}>{c.newStatus}</span>
                                  <span style={{ color: "#cc0000" }}>{c.user?.name ?? "System"}</span>
                                  <span className="text-gray-700">{fmt(c.createdAt)}</span>
                                  {c.text && <span className="text-gray-600">{c.text}</span>}
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={totalColCount} className="text-center text-gray-700 py-8">No items found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Status change confirmation */}
      {statusTarget && (
        <ConfirmModal
          title="// CHANGE STATUS"
          withComment
          confirmLabel="Confirm"
          body={
            <div>
              <p className="text-sm text-gray-300 mb-3 truncate">{statusTarget.item.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: STATUS_COLOR[statusTarget.item.status], background: STATUS_COLOR[statusTarget.item.status] + "15", border: `1px solid ${STATUS_COLOR[statusTarget.item.status]}44` }}>
                  {statusTarget.item.status}
                </span>
                <ArrowRight size={12} style={{ color: "#555" }} />
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: STATUS_COLOR[statusTarget.next], background: STATUS_COLOR[statusTarget.next] + "15", border: `1px solid ${STATUS_COLOR[statusTarget.next]}44` }}>
                  {statusTarget.next}
                </span>
              </div>
            </div>
          }
          onConfirm={(c) => doStatusChange(c)}
          onCancel={() => setStatusTarget(null)}
        />
      )}

      {/* Withdraw modal */}
      {withdrawItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75" onClick={() => setWithdrawItem(null)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-sm relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// WITHDRAW</span>
              <button onClick={() => setWithdrawItem(null)}><X size={14} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <p className="text-sm text-gray-300 mb-1 truncate" title={withdrawItem.name}>{withdrawItem.name}</p>
            <p className="text-xs font-mono mb-4" style={{ color: "#555" }}>
              available: {withdrawItem.quantity - issuedQty(withdrawItem)} pcs
            </p>
            <form onSubmit={doWithdraw} className="space-y-3">
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Project *</label>
                <select className="cyber-input text-xs w-full" required value={wProject} onChange={(e) => { setWProject(e.target.value); setWFixture(""); }}>
                  <option value="">Select project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Fixture *</label>
                <select className="cyber-input text-xs w-full" required value={wFixture} onChange={(e) => setWFixture(e.target.value)} disabled={!wProject || wFixtures.length === 0}>
                  <option value="">Select fixture</option>
                  {wFixtures.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Quantity *</label>
                <input type="number" min="1" max={withdrawItem.quantity - issuedQty(withdrawItem)} className="cyber-input text-xs w-full" required value={wQty} onChange={(e) => setWQty(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: "#666" }}>Notes</label>
                <input className="cyber-input text-xs w-full" value={wNotes} onChange={(e) => setWNotes(e.target.value)} placeholder="Optional" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={withdrawing || !wProject || !wFixture} className="cyber-btn flex-1 text-xs">
                  {withdrawing ? "Processing…" : "Withdraw"}
                </button>
                <button type="button" onClick={() => setWithdrawItem(null)} className="flex-1 text-xs text-gray-600 hover:text-gray-300 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title="// DELETE ITEM"
          destructive
          withComment
          confirmLabel="Delete"
          body={
            <p className="text-sm text-gray-300">
              Delete <span className="font-mono" style={{ color: "#ff4444" }} title={deleteTarget.name}>
                {deleteTarget.name.length > 40 ? deleteTarget.name.slice(0, 40) + "…" : deleteTarget.name}
              </span>? This cannot be undone.
            </p>
          }
          onConfirm={(c) => doDelete(c)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
