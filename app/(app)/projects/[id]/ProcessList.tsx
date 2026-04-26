"use client";
import { useState } from "react";
import Link from "next/link";
import ProcessCard, { type SubItemRow, type FixtureRow, type FGRow, type Process } from "./ProcessCard";
import { PROJECT_STAGES } from "@/lib/utils";

const FIXTURE_STAGES = new Set([
  "EQUIPMENT_ORDERED", "CUSTOMER_EQUIPMENT", "VENDOR_QUOTE", "VENDOR_APPROVED",
  "ITEMS_PREPPED", "WIRING_COMPLETE", "FIXTURE_DELIVERED", "DEBUG_FIXTURE",
  "CODING", "CYCLE_RUN", "TESTER_DELIVERED",
]);

const FG_STAGES = new Set(["SAMPLE_DEBUG", "DEBUG"]);

export default function ProcessList({
  projectId,
  processByStage,
  fixtures,
  allFGs,
  subItemsByStage,
  canEdit = true,
}: {
  projectId: string;
  processByStage: Record<string, Process>;
  fixtures: FixtureRow[];
  allFGs: FGRow[];
  subItemsByStage: Record<string, SubItemRow[]>;
  canEdit?: boolean;
}) {
  const [forceToken, setForceToken] = useState(0);
  const [forceSubExpanded, setForceSubExpanded] = useState(false);

  function expandAll() {
    setForceSubExpanded(true);
    setForceToken((t) => t + 1);
  }
  function collapseAll() {
    setForceSubExpanded(false);
    setForceToken((t) => t + 1);
  }

  return (
    <div>
      <div
        className="flex items-center gap-3 px-5 py-2 border-b"
        style={{ borderColor: "#1a0505" }}
      >
        <button
          onClick={collapseAll}
          className="text-xs font-mono hover:text-red-400 transition-colors"
          style={{ color: "#555" }}
        >
          Collapse All
        </button>
        <span style={{ color: "#2a0a0a" }}>|</span>
        <button
          onClick={expandAll}
          className="text-xs font-mono hover:text-red-400 transition-colors"
          style={{ color: "#555" }}
        >
          Expand All
        </button>
        <span className="flex-1" />
        <Link
          href={`/projects/${projectId}/timeline`}
          className="text-xs font-mono hover:text-red-400 transition-colors"
          style={{ color: "#555" }}
        >
          Timeline →
        </Link>
      </div>

      {PROJECT_STAGES.map((s) => (
        <ProcessCard
          key={s.key}
          stageLabel={s.label}
          stageKey={s.key}
          projectId={projectId}
          process={processByStage[s.key] ?? null}
          fixtures={FIXTURE_STAGES.has(s.key) ? fixtures : undefined}
          allFGs={FG_STAGES.has(s.key) ? allFGs : undefined}
          subItems={subItemsByStage[s.key]}
          forceSubExpanded={forceSubExpanded}
          forceToken={forceToken}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}
