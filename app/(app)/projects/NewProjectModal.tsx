"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewProjectModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, customer }),
    });
    setLoading(false);
    setOpen(false);
    setName("");
    setCustomer("");
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="cyber-btn flex items-center gap-2">
        <Plus size={13} /> NEW PROJECT
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="cyber-card cyber-card-red p-6 w-full max-w-md relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
                // NEW PROJECT
              </span>
              <button onClick={() => setOpen(false)}>
                <X size={16} className="text-gray-600 hover:text-red-400" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Project Name</label>
                <input
                  className="cyber-input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Customer</label>
                <input
                  className="cyber-input w-full"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="cyber-btn w-full mt-2">
                {loading ? "CREATING..." : "CREATE PROJECT"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
