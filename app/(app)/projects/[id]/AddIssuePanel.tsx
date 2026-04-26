"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AddIssuePanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, projectId }),
    });
    setLoading(false);
    setOpen(false);
    setTitle(""); setDescription(""); setPriority("MEDIUM");
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="cyber-btn flex items-center gap-1 text-xs" style={{ padding: "2px 10px" }}>
        <Plus size={11} /> Add
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-md relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// ADD TICKET</span>
              <button onClick={() => setOpen(false)}><X size={16} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Title</label>
                <input className="cyber-input w-full" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Description</label>
                <textarea className="cyber-input w-full" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Priority</label>
                <select className="cyber-input w-full" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="cyber-btn w-full">
                {loading ? "SAVING..." : "ADD TICKET"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
