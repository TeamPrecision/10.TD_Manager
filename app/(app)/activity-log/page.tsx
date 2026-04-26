"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type LogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityName: string | null;
  detail: string | null;
  comment: string | null;
  createdAt: string;
  user: { name: string } | null;
};

const ACTION_COLOR: Record<string, string> = {
  CREATE:        "#00cc66",
  STATUS_CHANGE: "#4488ff",
  WITHDRAW:      "#ffaa00",
  DELETE:        "#ff4444",
};

const ENTITY_LABEL: Record<string, string> = {
  ITEM:             "Item",
  CUSTOMER_ITEM:    "Customer Item",
  PROCESS_SUB_ITEM: "Process",
  PROJECT:          "Project",
  FIXTURE:          "Fixture",
  FIXTURE_FG:       "Fixture FG",
  ITEM_ISSUE:       "Item Issue",
  SVN_LINK:         "SVN Link",
  PROCESS_FILE:     "File",
  SUB_ITEM_LINK:    "Sub-Item Link",
  ISSUE:            "Issue",
  PROCESS:          "Stage",
};

function fmt(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const latestRef = useRef<string | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const isDateRange = !!(dateFrom || dateTo);

  const load = useCallback(async (initial = false) => {
    try {
      let url: string;
      if (isDateRange) {
        const params = new URLSearchParams({ limit: "500" });
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        url = `/api/activity-log?${params}`;
      } else if (initial) {
        url = "/api/activity-log?limit=200";
      } else {
        url = latestRef.current
          ? `/api/activity-log?after=${encodeURIComponent(latestRef.current)}`
          : "/api/activity-log?limit=200";
      }

      const res = await fetch(url);
      if (!res.ok) return;
      const data: LogEntry[] = await res.json();

      if (isDateRange) {
        setLogs(data);
      } else if (data.length > 0) {
        if (initial) {
          setLogs(data);
        } else {
          setLogs((prev) => [...data, ...prev]);
        }
        latestRef.current = data[0].createdAt;
      }
    } finally {
      if (initial) setLoading(false);
    }
  }, [isDateRange, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    load(true);
  }, [isDateRange, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isDateRange) return;
    load(true);
    const timer = setInterval(() => load(false), 10000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allUsers = [...new Set(logs.map((l) => l.user?.name).filter(Boolean))] as string[];

  const filtered = logs.filter((l) => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterEntity && l.entityType !== filterEntity) return false;
    if (filterUser && (l.user?.name ?? "") !== filterUser) return false;
    return true;
  });

  const anyFilter = !!(filterAction || filterEntity || filterUser || dateFrom || dateTo);

  function clearFilters() {
    setFilterAction("");
    setFilterEntity("");
    setFilterUser("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>// ACTIVITY LOG</span>
        <div className="flex-1 red-divider" />
        {!isDateRange && <span className="text-xs font-mono" style={{ color: "#333" }}>live · 10s</span>}
      </div>

      {/* Filters */}
      <div className="cyber-card cyber-card-red p-3">
        <p className="text-xs font-mono mb-2" style={{ color: "#444" }}>// FILTER</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Action</label>
            <select className="cyber-input text-xs w-full" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              <option value="">All</option>
              <option value="CREATE">Create</option>
              <option value="STATUS_CHANGE">Status Change</option>
              <option value="WITHDRAW">Withdraw</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>Type</label>
            <select className="cyber-input text-xs w-full" value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
              <option value="">All</option>
              <option value="ITEM">Item</option>
              <option value="CUSTOMER_ITEM">Customer Item</option>
              <option value="PROCESS_SUB_ITEM">Process</option>
              <option value="PROJECT">Project</option>
              <option value="FIXTURE">Fixture</option>
              <option value="FIXTURE_FG">Fixture FG</option>
              <option value="ITEM_ISSUE">Item Issue</option>
              <option value="SVN_LINK">SVN Link</option>
              <option value="PROCESS_FILE">File</option>
              <option value="SUB_ITEM_LINK">Sub-Item Link</option>
              <option value="ISSUE">Issue</option>
              <option value="PROCESS">Stage</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>User</label>
            <select className="cyber-input text-xs w-full" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              <option value="">All</option>
              {allUsers.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>From</label>
            <input
              type="date"
              className="cyber-input text-xs w-full"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-mono block mb-1" style={{ color: "#555" }}>To</label>
            <input
              type="date"
              className="cyber-input text-xs w-full"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          {anyFilter ? (
            <button
              onClick={clearFilters}
              className="text-xs font-mono hover:text-red-400 transition-colors"
              style={{ color: "#555" }}
            >× Clear filters</button>
          ) : <span />}
          <span className="text-xs font-mono" style={{ color: "#333" }}>{filtered.length} entries</span>
        </div>
      </div>

      {loading && <p className="text-xs font-mono" style={{ color: "#444" }}>Loading…</p>}

      {/* Log list */}
      <div className="cyber-card cyber-card-red divide-y" style={{ borderColor: "#1a0505" }}>
        {filtered.length === 0 && !loading && (
          <p className="text-center text-gray-700 py-8 text-xs font-mono">No activity found</p>
        )}
        {filtered.map((entry) => (
          <div key={entry.id} className="flex items-start gap-4 px-4 py-2.5">
            <span
              className="shrink-0 text-xs font-mono px-2 py-0.5 rounded mt-0.5"
              style={{
                color: ACTION_COLOR[entry.action] ?? "#666",
                background: (ACTION_COLOR[entry.action] ?? "#666") + "15",
                border: `1px solid ${ACTION_COLOR[entry.action] ?? "#666"}33`,
                minWidth: "96px",
                textAlign: "center",
              }}
            >
              {entry.action.replace("_", " ")}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: "#888", background: "#1a1a1a", border: "1px solid #222" }}>
                  {ENTITY_LABEL[entry.entityType] ?? entry.entityType}
                </span>
                {entry.entityName && (
                  <span className="text-sm text-gray-300 truncate max-w-56" title={entry.entityName}>
                    {entry.entityName}
                  </span>
                )}
                {entry.detail && (
                  <span className="text-xs font-mono" style={{ color: "#666" }}>— {entry.detail}</span>
                )}
              </div>
              {entry.comment && (
                <p className="text-xs mt-0.5" style={{ color: "#555" }}>{entry.comment}</p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs font-mono" style={{ color: "#cc0000" }}>{entry.user?.name ?? "System"}</p>
              <p className="text-xs font-mono" style={{ color: "#333" }}>{fmt(entry.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
