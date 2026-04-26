"use client";
import { useEffect, useState, useCallback } from "react";
import { Monitor, RefreshCw, Wifi, WifiOff, Activity } from "lucide-react";

type Tester = {
  id: string;
  pcName: string;
  anyDeskId: string | null;
  currentFg: string | null;
  mode: string | null;
  isRunning: boolean;
  passCount: number;
  failCount: number;
  lastSeen: string | null;
  project: { name: string } | null;
};

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 60000;
}

function yield_(t: Tester) {
  const total = t.passCount + t.failCount;
  if (total === 0) return null;
  return Math.round((t.passCount / total) * 100);
}

export default function TesterStatusPage() {
  const [testers, setTesters] = useState<Tester[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTesters = useCallback(async () => {
    try {
      const res = await fetch("/api/tester");
      if (res.ok) {
        const data = await res.json();
        setTesters(data);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTesters();
    const interval = setInterval(fetchTesters, 10000);
    return () => clearInterval(interval);
  }, [fetchTesters]);

  const online = testers.filter((t) => isOnline(t.lastSeen));
  const offline = testers.filter((t) => !isOnline(t.lastSeen));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
            // TESTER STATUS MONITOR
          </span>
          <div className="w-32 red-divider" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-gray-600">
            {lastRefresh ? `last refresh: ${lastRefresh.toLocaleTimeString()}` : "loading..."}
          </span>
          <button onClick={fetchTesters} className="cyber-btn-ghost cyber-btn flex items-center gap-2">
            <RefreshCw size={12} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="cyber-card cyber-card-red p-4 flex items-center gap-4">
          <div className="pulse-dot" style={{ background: "#00ff88", color: "#00ff88" }} />
          <div>
            <p className="text-2xl font-bold font-mono" style={{ color: "#00ff88" }}>{online.length}</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Online</p>
          </div>
        </div>
        <div className="cyber-card p-4 flex items-center gap-4" style={{ borderColor: "#1a1a1a" }}>
          <div className="pulse-dot" style={{ background: "#cc0000", color: "#cc0000" }} />
          <div>
            <p className="text-2xl font-bold font-mono" style={{ color: "#cc0000" }}>
              {online.filter(t => t.isRunning).length}
            </p>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Running Test</p>
          </div>
        </div>
        <div className="cyber-card p-4 flex items-center gap-4" style={{ borderColor: "#1a1a1a", opacity: 0.7 }}>
          <WifiOff size={18} style={{ color: "#444" }} />
          <div>
            <p className="text-2xl font-bold font-mono text-gray-600">{offline.length}</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Offline</p>
          </div>
        </div>
      </div>

      {/* Tester grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-700 font-mono text-sm">SCANNING NETWORK...</div>
      ) : testers.length === 0 ? (
        <div className="cyber-card cyber-card-red p-12 text-center">
          <Monitor size={40} className="mx-auto mb-4 opacity-20" style={{ color: "#cc0000" }} />
          <p className="text-gray-600 font-mono text-sm">NO TESTERS REGISTERED</p>
          <p className="text-xs text-gray-700 mt-2">Testers will appear here once they call TD_Register()</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {[...online, ...offline].map((tester) => {
            const online_ = isOnline(tester.lastSeen);
            const y = yield_(tester);
            return (
              <div
                key={tester.id}
                className={`cyber-card p-5 transition-all ${online_ ? "tester-running" : "tester-offline"}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="pulse-dot"
                      style={{ background: online_ ? "#00ff88" : "#330000", color: online_ ? "#00ff88" : "#330000" }}
                    />
                    <span
                      className="text-sm font-bold font-mono"
                      style={{ color: online_ ? "#e8e8e8" : "#555" }}
                    >
                      {tester.pcName}
                    </span>
                  </div>
                  <span className={`badge ${online_ ? (tester.isRunning ? "badge-red" : "badge-green") : "badge-gray"}`}>
                    {online_ ? (tester.isRunning ? "RUNNING" : "IDLE") : "OFFLINE"}
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <InfoRow label="Project" value={tester.project?.name ?? "—"} />
                  <InfoRow label="FG" value={tester.currentFg ?? "—"} highlight />
                  <InfoRow label="AnyDesk" value={tester.anyDeskId ?? "—"} mono />
                  <InfoRow label="Mode" value={tester.mode ?? "—"} />
                </div>

                {/* Yield bar */}
                {y !== null && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span style={{ color: "#555" }}>YIELD</span>
                      <span style={{ color: y >= 95 ? "#00ff88" : y >= 80 ? "#ffaa00" : "#ff4444" }}>
                        {y}% ({tester.passCount}P / {tester.failCount}F)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "#1a0a0a" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${y}%`,
                          background: y >= 95 ? "#00ff88" : y >= 80 ? "#ffaa00" : "#ff4444",
                          boxShadow: `0 0 6px ${y >= 95 ? "#00ff88" : y >= 80 ? "#ffaa00" : "#ff4444"}88`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Last seen */}
                {tester.lastSeen && (
                  <p className="text-xs text-gray-700 font-mono mt-3">
                    {online_
                      ? `↑ ${Math.round((Date.now() - new Date(tester.lastSeen).getTime()) / 1000)}s ago`
                      : `last seen: ${new Date(tester.lastSeen).toLocaleString()}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DLL API reference */}
      <div className="cyber-card p-5" style={{ borderColor: "#1a1a1a" }}>
        <p className="text-xs font-mono mb-3" style={{ color: "#cc0000" }}>// DLL API REFERENCE</p>
        <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-600">
          <div>
            <p className="text-gray-500 mb-1">POST /api/tester/register</p>
            <p className="text-gray-500 mb-1">POST /api/tester/run</p>
            <p className="text-gray-500 mb-1">POST /api/tester/yield</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">POST /api/tester/stop</p>
            <p className="text-gray-500 mb-1">POST /api/tester/heartbeat</p>
            <p className="text-gray-500 mb-1">Header: X-Api-Key: &lt;key&gt;</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div>
      <span className="text-gray-700 uppercase tracking-wider">{label}: </span>
      <span
        className={mono ? "font-mono" : ""}
        style={{ color: highlight ? "#ff4444" : "#aaa" }}
      >
        {value}
      </span>
    </div>
  );
}
