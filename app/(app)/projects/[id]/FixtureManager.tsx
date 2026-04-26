"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil, Check, ChevronDown, ChevronRight } from "lucide-react";

type FG = { id: string; name: string; model: string };
type Fixture = { id: string; name: string; fgs: FG[] };

function FGRow({ fg, onDeleted, onEdited, canEdit }: { fg: FG; onDeleted: () => void; onEdited: () => void; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(fg.name);
  const [model, setModel] = useState(fg.model);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/fixture-fgs/${fg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, model }),
    });
    setSaving(false);
    setEditing(false);
    onEdited();
  }

  async function remove() {
    await fetch(`/api/fixture-fgs/${fg.id}`, { method: "DELETE" });
    onDeleted();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-1 ml-4">
        <input
          className="cyber-input text-xs w-20"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="FG"
          style={{ padding: "2px 6px", fontSize: "0.7rem" }}
        />
        <input
          className="cyber-input text-xs w-28"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Model"
          style={{ padding: "2px 6px", fontSize: "0.7rem" }}
        />
        <button onClick={save} disabled={saving} className="cyber-btn text-xs" style={{ padding: "2px 6px" }}>
          <Check size={10} />
        </button>
        <button onClick={() => { setEditing(false); setName(fg.name); setModel(fg.model); }} className="text-gray-600 hover:text-red-400">
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 mt-1 ml-4 text-xs font-mono px-2 py-0.5 rounded w-fit"
      style={{ background: "#130808", border: "1px solid #1e0a0a", color: "#cc6666" }}
    >
      <span>{fg.name}</span>
      <span style={{ color: "#555" }}>|</span>
      <span style={{ color: "#888" }}>{fg.model}</span>
      {canEdit && (
        <>
          <button onClick={() => setEditing(true)} className="ml-1 hover:text-yellow-400 transition-colors">
            <Pencil size={9} />
          </button>
          <button onClick={remove} className="hover:text-red-400 transition-colors">
            <X size={9} />
          </button>
        </>
      )}
    </div>
  );
}

function FixtureRow({
  fixture,
  onChanged,
  canEdit,
}: {
  fixture: Fixture;
  onChanged: () => void;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(fixture.name);
  const [saving, setSaving] = useState(false);
  const [addingFG, setAddingFG] = useState(false);
  const [fgName, setFgName] = useState("");
  const [fgModel, setFgModel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function saveName() {
    setSaving(true);
    await fetch(`/api/fixtures/${fixture.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setSaving(false);
    setEditingName(false);
    onChanged();
  }

  async function deleteFixture() {
    await fetch(`/api/fixtures/${fixture.id}`, { method: "DELETE" });
    onChanged();
  }

  async function addFG(e: React.FormEvent) {
    e.preventDefault();
    if (!fgName.trim() || !fgModel.trim()) return;
    setSubmitting(true);
    await fetch("/api/fixture-fgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixtureId: fixture.id, name: fgName.trim(), model: fgModel.trim() }),
    });
    setFgName("");
    setFgModel("");
    setAddingFG(false);
    setSubmitting(false);
    onChanged();
  }

  return (
    <div
      className="rounded mt-2 p-2"
      style={{ background: "#0d0505", border: "1px solid #1a0808" }}
    >
      {/* Fixture header */}
      <div className="flex items-center gap-1">
        <button onClick={() => setOpen(!open)} className="text-gray-700 hover:text-red-400 transition-colors">
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>

        {editingName ? (
          <>
            <input
              className="cyber-input text-xs"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ padding: "1px 6px", fontSize: "0.7rem", width: "120px" }}
            />
            <button onClick={saveName} disabled={saving} className="cyber-btn text-xs" style={{ padding: "1px 6px" }}>
              <Check size={10} />
            </button>
            <button onClick={() => { setEditingName(false); setNewName(fixture.name); }} className="text-gray-600 hover:text-red-400">
              <X size={10} />
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-mono font-bold" style={{ color: "#ff5555" }}>{fixture.name}</span>
            {canEdit && (
              <>
                <button onClick={() => setEditingName(true)} className="ml-1 text-gray-700 hover:text-yellow-400 transition-colors">
                  <Pencil size={9} />
                </button>
                <button onClick={deleteFixture} className="text-gray-700 hover:text-red-400 transition-colors">
                  <X size={10} />
                </button>
              </>
            )}
            <span className="text-xs text-gray-700 ml-1 font-mono">({fixture.fgs.length} FG)</span>
          </>
        )}
      </div>

      {/* FG list */}
      {open && (
        <div>
          {fixture.fgs.map((fg) => (
            <FGRow key={fg.id} fg={fg} onDeleted={onChanged} onEdited={onChanged} canEdit={canEdit} />
          ))}

          {canEdit && (addingFG ? (
            <form onSubmit={addFG} className="flex items-center gap-1 mt-1 ml-4">
              <input
                className="cyber-input text-xs w-20"
                value={fgName}
                onChange={(e) => setFgName(e.target.value)}
                placeholder="FG name"
                style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                autoFocus
              />
              <input
                className="cyber-input text-xs w-28"
                value={fgModel}
                onChange={(e) => setFgModel(e.target.value)}
                placeholder="Model"
                style={{ padding: "2px 6px", fontSize: "0.7rem" }}
              />
              <button type="submit" disabled={submitting} className="cyber-btn text-xs" style={{ padding: "2px 6px" }}>
                <Check size={10} />
              </button>
              <button type="button" onClick={() => setAddingFG(false)} className="text-gray-600 hover:text-red-400">
                <X size={10} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAddingFG(true)}
              className="flex items-center gap-1 mt-1 ml-4 text-xs font-mono hover:text-red-400 transition-colors"
              style={{ color: "#444" }}
            >
              <Plus size={9} /> Add FG
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FixtureManager({
  projectId,
  fixtures,
  canEdit = true,
}: {
  projectId: string;
  fixtures: Fixture[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [addingFixture, setAddingFixture] = useState(false);
  const [fixtureName, setFixtureName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function addFixture(e: React.FormEvent) {
    e.preventDefault();
    if (!fixtureName.trim()) return;
    setSubmitting(true);
    await fetch("/api/fixtures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, name: fixtureName.trim() }),
    });
    setFixtureName("");
    setAddingFixture(false);
    setSubmitting(false);
    refresh();
  }

  return (
    <div className="mt-3">
      <span className="text-xs font-mono" style={{ color: "#555" }}>FIXTURES</span>
      {fixtures.map((fx) => (
        <FixtureRow key={fx.id} fixture={fx} onChanged={refresh} canEdit={canEdit} />
      ))}

      {canEdit && (addingFixture ? (
        <form onSubmit={addFixture} className="flex items-center gap-1 mt-2">
          <input
            className="cyber-input text-xs"
            value={fixtureName}
            onChange={(e) => setFixtureName(e.target.value)}
            placeholder="Fixture name"
            style={{ padding: "2px 8px", fontSize: "0.7rem" }}
            autoFocus
          />
          <button type="submit" disabled={submitting} className="cyber-btn text-xs" style={{ padding: "2px 8px" }}>
            <Check size={10} />
          </button>
          <button type="button" onClick={() => setAddingFixture(false)} className="text-gray-600 hover:text-red-400">
            <X size={11} />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAddingFixture(true)}
          className="flex items-center gap-1 mt-2 text-xs font-mono hover:text-red-400 transition-colors"
          style={{ color: "#444" }}
        >
          <Plus size={10} /> Add Fixture
        </button>
      ))}
    </div>
  );
}
