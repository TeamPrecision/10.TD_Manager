"use client";
import { useState } from "react";
import Image from "next/image";

const TYPE_OPTS = ["BUG", "HARDWARE", "SOFTWARE", "PROCESS", "REQUEST", "OTHER"];
const PRIORITY_OPTS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function ReportForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [type, setType] = useState("BUG");
  const [priority, setPriority] = useState("MEDIUM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/issues/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || null, type, priority, projectId, reporterName: name || null, reporterDept: dept || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubmitted(data.id.slice(-8).toUpperCase());
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to submit. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSubmitted(null);
    setName(""); setDept(""); setTitle(""); setDescription("");
    setType("BUG"); setPriority("MEDIUM");
    setProjectId(projects[0]?.id ?? "");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-16 h-16 mb-4">
            <Image src="/logo.png" alt="TD Manager" fill className="object-contain" style={{ filter: "drop-shadow(0 0 12px rgba(255,0,0,0.4))" }} />
          </div>
          <h1 className="text-xl font-bold tracking-widest uppercase" style={{ fontFamily: "var(--font-geist-mono)", color: "#ff3333" }}>
            TD MANAGER
          </h1>
          <p className="text-xs tracking-widest mt-1 uppercase" style={{ color: "#555" }}>Report a Ticket</p>
        </div>

        <div className="red-divider mb-8" />

        {submitted ? (
          <div className="cyber-card cyber-card-red p-8 text-center space-y-4">
            <div className="text-4xl font-mono" style={{ color: "#00cc66" }}>✓</div>
            <p className="text-sm font-mono" style={{ color: "#888" }}>Ticket submitted successfully.</p>
            <p className="text-xs font-mono" style={{ color: "#555" }}>
              Reference: <span className="font-bold" style={{ color: "#cc0000" }}>#{submitted}</span>
            </p>
            <p className="text-xs font-mono" style={{ color: "#444" }}>The team has been notified and will look into it shortly.</p>
            <button onClick={reset} className="cyber-btn text-xs mt-2" style={{ padding: "6px 20px" }}>Submit Another</button>
          </div>
        ) : (
          <div className="cyber-card cyber-card-red p-6">
            <p className="text-xs tracking-widest uppercase mb-6 font-mono" style={{ color: "#cc0000" }}>// SUBMIT TICKET</p>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#555" }}>Your Name</label>
                  <input className="cyber-input text-sm w-full" placeholder="Optional" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#555" }}>Department</label>
                  <input className="cyber-input text-sm w-full" placeholder="Optional" value={dept} onChange={(e) => setDept(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#555" }}>Project *</label>
                <select className="cyber-input text-sm w-full" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#555" }}>Type</label>
                  <select className="cyber-input text-sm w-full" value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPE_OPTS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#555" }}>Priority</label>
                  <select className="cyber-input text-sm w-full" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {PRIORITY_OPTS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#555" }}>Title *</label>
                <input className="cyber-input text-sm w-full" placeholder="Brief description of the issue" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "#555" }}>Description</label>
                <textarea className="cyber-input text-sm w-full resize-none" rows={5} placeholder="Describe the problem in detail…" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {error && <p className="text-xs font-mono" style={{ color: "#ff4444" }}>{error}</p>}

              <button type="submit" disabled={submitting} className="cyber-btn w-full mt-1">
                {submitting ? "SUBMITTING…" : "SUBMIT TICKET"}
              </button>
            </form>
          </div>
        )}

        <div className="red-divider mt-8" />
        <p className="text-center text-xs font-mono mt-4" style={{ color: "#2a0a0a" }}>INTERNAL USE ONLY</p>
      </div>
    </div>
  );
}
