"use client";
import { PROJECT_STAGES, stageIndex } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

export default function StageAdvancer({ projectId, currentStage }: { projectId: string; currentStage: string }) {
  const router = useRouter();
  const idx = stageIndex(currentStage);
  const next = PROJECT_STAGES[idx + 1];

  async function advance() {
    if (!next) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next.key }),
    });
    router.refresh();
  }

  return (
    <button onClick={advance} disabled={!next} className="cyber-btn flex items-center gap-2">
      ADVANCE STAGE <ChevronRight size={13} />
    </button>
  );
}
