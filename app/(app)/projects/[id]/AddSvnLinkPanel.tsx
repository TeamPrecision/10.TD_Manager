"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["debug_result", "wiring_diagram", "test_spec", "graph", "other"];

export default function AddSvnLinkPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [revision, setRevision] = useState("");
  const [category, setCategory] = useState("debug_result");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/svn-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, url, revision, category, projectId }),
    });
    setLoading(false);
    setOpen(false);
    setLabel(""); setUrl(""); setRevision(""); setCategory("debug_result");
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="cyber-btn flex items-center gap-1 text-xs" style={{ padding: "2px 10px" }}>
        <Plus size={11} /> Add Link
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-md relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// ADD SVN LINK</span>
              <button onClick={() => setOpen(false)}><X size={16} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Category</label>
                <select className="cyber-input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Label</label>
                <input className="cyber-input w-full" value={label} onChange={e => setLabel(e.target.value)} required placeholder="Debug Result - Board Rev A" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">SVN URL</label>
                <input className="cyber-input w-full" value={url} onChange={e => setUrl(e.target.value)} required placeholder="svn://server/project/..." />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Revision (optional)</label>
                <input className="cyber-input w-full" value={revision} onChange={e => setRevision(e.target.value)} placeholder="r142" />
              </div>
              <button type="submit" disabled={loading} className="cyber-btn w-full">
                {loading ? "SAVING..." : "ADD LINK"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
