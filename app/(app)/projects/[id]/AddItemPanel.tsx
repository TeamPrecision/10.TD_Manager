"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AddItemPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity: Number(quantity), unit, source, projectId }),
    });
    setLoading(false);
    setOpen(false);
    setName(""); setQuantity("1"); setUnit(""); setSource("");
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
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>// ADD ITEM</span>
              <button onClick={() => setOpen(false)}><X size={16} className="text-gray-600 hover:text-red-400" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Item Name</label>
                <input className="cyber-input w-full" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Qty</label>
                  <input type="number" className="cyber-input w-full" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Unit</label>
                  <input className="cyber-input w-full" value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs, set…" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Source / Vendor</label>
                <input className="cyber-input w-full" value={source} onChange={e => setSource(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="cyber-btn w-full">
                {loading ? "SAVING..." : "ADD ITEM"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
