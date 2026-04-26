"use client";
import { Fragment } from "react";

export type SubBar = {
  key: string;
  label: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
};

export type StageBar = {
  key: string;
  label: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  subBars: SubBar[];
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:     { label: "Pending",     color: "#888",    bg: "#111" },
  IN_PROGRESS: { label: "In Progress", color: "#ffaa00", bg: "#1a1200" },
  DONE:        { label: "Done",        color: "#00cc66", bg: "#001a0d" },
};

const LABEL_W = 200;
const ROW_H = 34;
const SUB_ROW_H = 26;
const MONTH_H = 26;
const DAY_H = 22;
const HEADER_H = MONTH_H + DAY_H;
const PX_PER_DAY = 14;

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export default function TimelineView({ stageBars }: { stageBars: StageBar[] }) {
  const today = new Date();

  const anchorDates: Date[] = [today];
  for (const s of stageBars) {
    if (s.startAt) anchorDates.push(new Date(s.startAt));
    if (s.endAt) anchorDates.push(new Date(s.endAt));
    for (const sub of s.subBars) {
      if (sub.startAt) anchorDates.push(new Date(sub.startAt));
      if (sub.endAt) anchorDates.push(new Date(sub.endAt));
    }
  }

  const hasActivity = stageBars.some((s) => s.startAt || s.subBars.some((b) => b.startAt));
  if (!hasActivity) {
    return (
      <div className="cyber-card cyber-card-red p-10 text-center">
        <p className="text-sm font-mono" style={{ color: "#444" }}>
          No activity yet — processes will appear here once they are started.
        </p>
      </div>
    );
  }

  const minD = new Date(Math.min(...anchorDates.map((d) => d.getTime())));
  const maxD = new Date(Math.max(...anchorDates.map((d) => d.getTime())));
  const rangeStart = addDays(minD, -7);
  const rangeEnd = addDays(maxD, 14);
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd));
  const chartW = Math.max(600, totalDays * PX_PER_DAY);

  function px(d: Date): number {
    return Math.round(daysBetween(rangeStart, d) * PX_PER_DAY);
  }

  const todayX = px(today);

  // Month spans for header row
  const months: { label: string; x: number; width: number }[] = [];
  const mc = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (mc <= rangeEnd) {
    const x = Math.max(0, px(mc));
    const nextM = new Date(mc.getFullYear(), mc.getMonth() + 1, 1);
    const x2 = Math.min(chartW, px(nextM));
    if (x2 > x) months.push({ label: mc.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), x, width: x2 - x });
    mc.setMonth(mc.getMonth() + 1);
  }

  // 7-day tick labels for day-number header row
  const dayTicks: { label: string; x: number }[] = [];
  const tc = new Date(rangeStart);
  while (tc <= rangeEnd) {
    dayTicks.push({ label: tc.getDate().toString(), x: px(new Date(tc)) });
    tc.setDate(tc.getDate() + 7);
  }

  // Week grid lines (every Monday)
  const weekLines: number[] = [];
  const wc = new Date(rangeStart);
  const dow = wc.getDay();
  wc.setDate(wc.getDate() + ((8 - dow) % 7 || 7));
  while (wc <= rangeEnd) {
    weekLines.push(px(new Date(wc)));
    wc.setDate(wc.getDate() + 7);
  }

  // Month boundary lines
  const monthBoundaryXs = months.slice(1).map((m) => m.x);

  // Day grid via CSS — no DOM nodes
  const dayGridBg = `repeating-linear-gradient(to right, #0f0404 0px, #0f0404 1px, transparent 1px, transparent ${PX_PER_DAY}px)`;

  function rowOverlays() {
    return (
      <>
        {weekLines.map((wx, i) => (
          <div key={`w${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: wx, borderLeft: "1px solid #1a0808", pointerEvents: "none" }} />
        ))}
        {monthBoundaryXs.map((mx, i) => (
          <div key={`m${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: mx, borderLeft: "1px solid #280a0a", pointerEvents: "none" }} />
        ))}
        {todayX >= 0 && todayX <= chartW && (
          <div style={{ position: "absolute", top: 0, bottom: 0, left: todayX, borderLeft: "1px dashed #cc000055", pointerEvents: "none", zIndex: 3 }} />
        )}
      </>
    );
  }

  function renderBar(startAt: string | null, endAt: string | null, status: string, rowH: number) {
    if (!startAt) return null;
    const st = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
    const startX = px(new Date(startAt));
    const endX = endAt ? px(new Date(endAt)) : todayX;
    const barW = Math.max(4, endX - startX);
    const barH = rowH === ROW_H ? 14 : 10;
    const isOngoing = !endAt && status !== "PENDING" && status !== "DONE";

    return (
      <div
        style={{
          position: "absolute",
          left: startX,
          width: barW,
          top: "50%",
          transform: "translateY(-50%)",
          height: barH,
          background: isOngoing
            ? `linear-gradient(to right, ${st.color}66, ${st.color}bb, ${st.color}66)`
            : st.bg,
          border: `1px solid ${st.color}55`,
          borderRadius: 2,
          boxShadow: status !== "PENDING" ? `0 0 6px ${st.color}22` : "none",
          zIndex: 2,
        }}
      />
    );
  }

  return (
    <div className="cyber-card cyber-card-red overflow-hidden">
      <div style={{ display: "flex" }}>

        {/* Fixed label column */}
        <div style={{ width: LABEL_W, flexShrink: 0, borderRight: "1px solid #1a0505" }}>
          <div style={{ height: HEADER_H, borderBottom: "1px solid #1a0505" }} />
          {stageBars.map((s) => {
            const st = STATUS_STYLE[s.status] ?? STATUS_STYLE.PENDING;
            return (
              <Fragment key={s.key}>
                <div
                  style={{
                    height: ROW_H,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 12px",
                    borderBottom: "1px solid #1a0505",
                  }}
                >
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: st.bg,
                      border: `1px solid ${st.color}`,
                      boxShadow: s.status !== "PENDING" ? `0 0 4px ${st.color}66` : "none",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "0.68rem",
                      color: s.status === "DONE" ? st.color : "#777",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {s.subBars.map((sub) => {
                  const subSt = STATUS_STYLE[sub.status] ?? STATUS_STYLE.PENDING;
                  return (
                    <div
                      key={sub.key}
                      style={{
                        height: SUB_ROW_H,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        paddingLeft: 22,
                        paddingRight: 8,
                        borderBottom: "1px solid #110505",
                      }}
                    >
                      <span style={{ color: "#331010", fontSize: "0.6rem", flexShrink: 0, fontFamily: "monospace" }}>↳</span>
                      <div
                        style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: subSt.bg,
                          border: `1px solid ${subSt.color}`,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-geist-mono, monospace)",
                          fontSize: "0.6rem",
                          color: sub.status === "DONE" ? subSt.color : "#555",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sub.label}
                      </span>
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>

        {/* Scrollable chart area */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div style={{ width: chartW, position: "relative" }}>

            {/* Header */}
            <div style={{ height: HEADER_H, borderBottom: "1px solid #1a0505", position: "relative" }}>
              {/* Month label row */}
              <div style={{ height: MONTH_H, borderBottom: "1px solid #150505", position: "relative" }}>
                {months.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: m.x,
                      width: m.width,
                      top: 0, bottom: 0,
                      borderLeft: i > 0 ? "1px solid #280a0a" : "none",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 5,
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "0.62rem", color: "#666", whiteSpace: "nowrap" }}>
                      {m.label}
                    </span>
                  </div>
                ))}
                {todayX >= 0 && todayX <= chartW && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: todayX, borderLeft: "1px dashed #cc000066", zIndex: 2 }} />
                )}
              </div>

              {/* Day tick row */}
              <div style={{ height: DAY_H, position: "relative" }}>
                {weekLines.map((wx, i) => (
                  <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: wx, borderLeft: "1px solid #1a0808" }} />
                ))}
                {dayTicks.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: t.x + 2,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontFamily: "var(--font-geist-mono, monospace)",
                      fontSize: "0.55rem",
                      color: "#666",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.label}
                  </div>
                ))}
                {todayX >= 0 && todayX <= chartW && (
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: todayX, borderLeft: "1px dashed #cc000066", zIndex: 2 }} />
                )}
              </div>
            </div>

            {/* Stage and sub rows */}
            {stageBars.map((s) => (
              <Fragment key={s.key}>
                <div
                  style={{
                    height: ROW_H,
                    position: "relative",
                    borderBottom: "1px solid #1a0505",
                    backgroundImage: dayGridBg,
                  }}
                >
                  {rowOverlays()}
                  {renderBar(s.startAt, s.endAt, s.status, ROW_H)}
                </div>
                {s.subBars.map((sub) => (
                  <div
                    key={sub.key}
                    style={{
                      height: SUB_ROW_H,
                      position: "relative",
                      borderBottom: "1px solid #110505",
                      backgroundImage: dayGridBg,
                    }}
                  >
                    {rowOverlays()}
                    {renderBar(sub.startAt, sub.endAt, sub.status, SUB_ROW_H)}
                  </div>
                ))}
              </Fragment>
            ))}

          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-2 border-t flex-wrap" style={{ borderColor: "#1a0505" }}>
        {Object.entries(STATUS_STYLE).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            <span className="text-xs font-mono" style={{ color: "#888", fontSize: "0.62rem" }}>{s.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <div style={{ width: 14, height: 1, borderTop: "1px dashed #cc000066" }} />
          <span className="text-xs font-mono" style={{ color: "#888", fontSize: "0.62rem" }}>today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 24, height: 8, background: "linear-gradient(to right, #ffaa0033, #ffaa00bb, #ffaa0033)", border: "1px solid #ffaa0044", borderRadius: 2 }} />
          <span className="text-xs font-mono" style={{ color: "#888", fontSize: "0.62rem" }}>in progress (ends at today)</span>
        </div>
      </div>
    </div>
  );
}
