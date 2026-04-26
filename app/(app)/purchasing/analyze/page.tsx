import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PurchasingAnalyzePage() {
  const items = await prisma.item.findMany({
    include: {
      issues: {
        include: {
          project: { select: { id: true, name: true } },
          fixture: { select: { id: true, name: true } },
        },
      },
    },
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalItems = items.length;
  const orderedItems = items.filter((i) => i.status === "ORDERED").length;
  const receivedItems = items.filter((i) => i.status === "RECEIVED").length;
  const totalSpend = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
  const receivedSpend = items
    .filter((i) => i.status === "RECEIVED")
    .reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);

  // Low stock: received items with remaining qty ≤ 0
  const lowStock = items.filter((i) => {
    const issued = i.issues.reduce((s, iss) => s + iss.quantity, 0);
    return i.status === "RECEIVED" && i.quantity - issued <= 0;
  });

  // ── Spend by project ───────────────────────────────────────────────────────
  const spendByProject: Record<string, { name: string; qty: number; spend: number }> = {};
  for (const item of items) {
    for (const iss of item.issues) {
      const key = iss.project.id;
      if (!spendByProject[key]) spendByProject[key] = { name: iss.project.name, qty: 0, spend: 0 };
      spendByProject[key].qty += iss.quantity;
      spendByProject[key].spend += (item.price ?? 0) * iss.quantity;
    }
  }
  const topProjects = Object.values(spendByProject).sort((a, b) => b.spend - a.spend).slice(0, 10);

  // ── Spend by vendor ────────────────────────────────────────────────────────
  const spendByVendor: Record<string, { spend: number; count: number }> = {};
  for (const item of items) {
    if (!item.source) continue;
    if (!spendByVendor[item.source]) spendByVendor[item.source] = { spend: 0, count: 0 };
    spendByVendor[item.source].spend += (item.price ?? 0) * item.quantity;
    spendByVendor[item.source].count += 1;
  }
  const topVendors = Object.entries(spendByVendor).sort((a, b) => b[1].spend - a[1].spend).slice(0, 10);

  // ── Items by PR ────────────────────────────────────────────────────────────
  const byPR: Record<string, { count: number; spend: number }> = {};
  for (const item of items) {
    if (!item.pr) continue;
    if (!byPR[item.pr]) byPR[item.pr] = { count: 0, spend: 0 };
    byPR[item.pr].count += 1;
    byPR[item.pr].spend += (item.price ?? 0) * item.quantity;
  }
  const topPRs = Object.entries(byPR).sort((a, b) => b[1].spend - a[1].spend).slice(0, 8);

  const maxProjSpend = topProjects[0]?.spend ?? 1;
  const maxVendSpend = topVendors[0]?.[1].spend ?? 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/purchasing" className="text-xs font-mono hover:text-red-400 transition-colors" style={{ color: "#555" }}>
          ← purchasing
        </Link>
        <div className="flex-1 red-divider" />
        <span style={{ color: "#cc0000", fontFamily: "var(--font-geist-mono)", fontSize: "0.7rem" }}>
          // PURCHASING ANALYZE
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Items", value: totalItems, color: "#555" },
          { label: "Ordered", value: orderedItems, color: "#4488ff" },
          { label: "Received", value: receivedItems, color: "#00cc66" },
          { label: "Low Stock", value: lowStock.length, color: lowStock.length > 0 ? "#ff4444" : "#555" },
        ].map((s) => (
          <div key={s.label} className="cyber-card cyber-card-red p-4">
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="cyber-card cyber-card-red p-4">
          <p className="text-2xl font-bold font-mono" style={{ color: "#ffaa00" }}>${totalSpend.toFixed(2)}</p>
          <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">Total Committed</p>
        </div>
        <div className="cyber-card cyber-card-red p-4">
          <p className="text-2xl font-bold font-mono" style={{ color: "#00cc66" }}>${receivedSpend.toFixed(2)}</p>
          <p className="text-xs text-gray-600 uppercase tracking-wider mt-1">Received Value</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Spend by project */}
        <div className="cyber-card cyber-card-red">
          <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
              // SPEND BY PROJECT
            </span>
          </div>
          <div className="p-4 space-y-2">
            {topProjects.length === 0 && <p className="text-xs" style={{ color: "#444" }}>No withdrawals yet</p>}
            {topProjects.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-400 truncate max-w-48" title={p.name}>{p.name}</span>
                  <span className="text-xs font-mono" style={{ color: "#ffaa00" }}>${p.spend.toFixed(2)}</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: "#1a0505" }}>
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${(p.spend / maxProjSpend) * 100}%`, background: "#cc0000" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spend by vendor */}
        <div className="cyber-card cyber-card-red">
          <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
              // TOP VENDORS
            </span>
          </div>
          <div className="p-4 space-y-2">
            {topVendors.length === 0 && <p className="text-xs" style={{ color: "#444" }}>No data</p>}
            {topVendors.map(([vendor, v]) => (
              <div key={vendor}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-gray-400 truncate max-w-44" title={vendor}>{vendor}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: "#555" }}>{v.count} items</span>
                    <span className="text-xs font-mono" style={{ color: "#ffaa00" }}>${v.spend.toFixed(2)}</span>
                  </div>
                </div>
                <div className="h-1 rounded-full" style={{ background: "#1a0505" }}>
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${(v.spend / maxVendSpend) * 100}%`, background: "#4488ff" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top PRs */}
      {topPRs.length > 0 && (
        <div className="cyber-card cyber-card-red">
          <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#cc0000" }}>
              // TOP PURCHASE REQUESTS
            </span>
          </div>
          <table className="cyber-table">
            <thead>
              <tr>
                <th>PR</th>
                <th className="text-right">Items</th>
                <th className="text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {topPRs.map(([pr, v]) => (
                <tr key={pr}>
                  <td className="font-mono" style={{ color: "#664444" }}>{pr}</td>
                  <td className="font-mono text-right text-gray-500">{v.count}</td>
                  <td className="font-mono text-right" style={{ color: "#ffaa00" }}>${v.spend.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Low stock items */}
      {lowStock.length > 0 && (
        <div className="cyber-card cyber-card-red">
          <div className="px-5 py-3 border-b" style={{ borderColor: "#1a0505" }}>
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#ff4444" }}>
              // LOW STOCK (depleted)
            </span>
          </div>
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th className="text-right">Qty</th>
                <th>PR</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item) => (
                <tr key={item.id}>
                  <td className="text-gray-300 truncate max-w-xs" title={item.name}>{item.name}</td>
                  <td className="text-gray-500 text-xs">{item.source ?? "—"}</td>
                  <td className="font-mono text-right text-red-400">{item.quantity}</td>
                  <td className="font-mono text-xs" style={{ color: "#664444" }}>{item.pr ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
