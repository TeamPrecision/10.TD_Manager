"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type FG = { id: string; name: string };

export default function FGManager({ projectId, fgs }: { projectId: string; fgs: FG[] }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setAdding(true);
    await fetch("/api/project-fgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name: input.trim().toUpperCase() }),
    });
    setInput("");
    setAdding(false);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch("/api/project-fgs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      <span className="text-xs font-mono" style={{ color: "#555" }}>FG:</span>
      {fgs.map((fg) => (
        <span
          key={fg.id}
          className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded"
          style={{ background: "#1a0a0a", border: "1px solid #2a0a0a", color: "#cc6666" }}
        >
          {fg.name}
          <button onClick={() => remove(fg.id)} className="hover:text-red-400 transition-colors">
            <X size={10} />
          </button>
        </span>
      ))}
      <form onSubmit={add} className="flex items-center gap-1">
        <input
          className="cyber-input text-xs w-20"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add FG"
          style={{ padding: "2px 8px", fontSize: "0.7rem" }}
        />
        <button type="submit" disabled={adding} className="cyber-btn text-xs" style={{ padding: "2px 8px" }}>
          <Plus size={10} />
        </button>
      </form>
    </div>
  );
}
