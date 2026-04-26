"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

type FGRow = { id: string; name: string; model: string };
type FixtureRow = { id: string; name: string; fgs: FGRow[] };
type ProjectRow = {
  id: string;
  name: string;
  customer: string;
  fixtures: FixtureRow[];
};

function AddFGForm({
  fixtureId,
  onAdded,
  onCancel,
}: {
  fixtureId: string;
  onAdded: (fg: FGRow) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/fixture-fgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixtureId, name, model }),
      });
      if (res.ok) {
        const fg: FGRow = await res.json();
        onAdded(fg);
        setName("");
        setModel("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 mt-2 flex-wrap">
      <input
        className="cyber-input text-xs"
        style={{ width: "110px" }}
        placeholder="FG name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="cyber-input text-xs"
        style={{ width: "110px" }}
        placeholder="Model"
        required
        value={model}
        onChange={(e) => setModel(e.target.value)}
      />
      <button type="submit" disabled={submitting} className="cyber-btn text-xs" style={{ padding: "3px 10px" }}>
        {submitting ? "…" : "Add"}
      </button>
      <button type="button" onClick={onCancel} className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
        <X size={12} />
      </button>
    </form>
  );
}

function FixtureCard({ fixture }: { fixture: FixtureRow }) {
  const [fgs, setFgs] = useState<FGRow[]>(fixture.fgs);
  const [showAddFg, setShowAddFg] = useState(false);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border rounded" style={{ borderColor: "#1a0505", background: "#060404" }}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown size={11} style={{ color: "#555" }} /> : <ChevronRight size={11} style={{ color: "#555" }} />}
        <span className="text-xs font-mono text-gray-300">{fixture.name}</span>
        <span className="text-xs font-mono ml-1" style={{ color: "#555" }}>
          {fgs.length} FG{fgs.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setShowAddFg((v) => !v); setExpanded(true); }}
          className="ml-auto text-xs font-mono hover:text-red-400 transition-colors flex items-center gap-1"
          style={{ color: "#555" }}
        >
          <Plus size={10} /> FG
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-3">
          {fgs.length === 0 && !showAddFg && (
            <p className="text-xs" style={{ color: "#333" }}>No FGs yet</p>
          )}
          <div className="space-y-1">
            {fgs.map((fg) => (
              <div key={fg.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono" style={{ color: "#4488ff" }}>{fg.name}</span>
                <span style={{ color: "#555" }}>·</span>
                <span className="text-gray-600">{fg.model}</span>
              </div>
            ))}
          </div>
          {showAddFg && (
            <AddFGForm
              fixtureId={fixture.id}
              onAdded={(fg) => { setFgs((p) => [...p, fg]); setShowAddFg(false); }}
              onCancel={() => setShowAddFg(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function FixtureClient({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
          // FIXTURE
        </span>
        <div className="flex-1 red-divider" />
        <span className="text-xs font-mono" style={{ color: "#333" }}>{projects.length} projects</span>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs font-mono hover:text-red-400 transition-colors"
          style={{ color: "#555" }}
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "…" : "Refresh"}
        </button>
      </div>

      {projects.length === 0 && (
        <div className="cyber-card cyber-card-red p-12 text-center">
          <p className="text-gray-600 font-mono text-sm">NO COMPLETED PROJECTS</p>
        </div>
      )}

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="cyber-card cyber-card-red">
            <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
              <span className="text-sm font-semibold text-gray-100">{project.name}</span>
              <span className="text-xs text-gray-600 ml-3">{project.customer}</span>
              <span
                className="ml-3 text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ color: "#00cc66", background: "#001a0d", border: "1px solid #00cc6633" }}
              >
                Complete
              </span>
            </div>

            <div className="p-4 space-y-3">
              {project.fixtures.length === 0 && (
                <p className="text-xs" style={{ color: "#333" }}>No fixtures</p>
              )}
              {project.fixtures.map((fx) => (
                <FixtureCard key={fx.id} fixture={fx} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
