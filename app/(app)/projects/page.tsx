import { prisma } from "@/lib/prisma";
import NewProjectModal from "./NewProjectModal";
import { auth } from "@/lib/auth";
import ProjectsClient from "./ProjectsClient";

export const dynamic = "force-dynamic";

function deriveOverall(statuses: string[]): string | null {
  if (statuses.length === 0) return null;
  if (statuses.every((s) => s === "DONE")) return "DONE";
  if (statuses.some((s) => s === "IN_PROGRESS")) return "IN_PROGRESS";
  return "PENDING";
}

export default async function ProjectsPage() {
  const session = await auth();
  const isLeader = (session?.user as Record<string, unknown>)?.role === "LEADER";

  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { issues: { where: { status: { notIn: ["RESOLVED", "REJECTED"] } } } } },
      processes: { select: { stageKey: true, status: true, deadline: true } },
      fixtures: {
        select: {
          id: true,
          name: true,
          fgs: { select: { id: true, name: true, model: true } },
          itemIssues: { include: { item: { select: { status: true } } } },
          customerItems: { select: { status: true, fgId: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Compute auto-derived stage overrides for EQUIPMENT_ORDERED, CUSTOMER_EQUIPMENT, SAMPLE_DEBUG
  const projectsWithOverrides = projects.map((p) => {
    const overrides: Record<string, string> = {};

    const eqSts = p.fixtures.map((fx) => {
      const issues = fx.itemIssues;
      if (issues.length === 0) return "DONE";
      if (issues.every((i) => i.item.status !== "PENDING" && i.item.status !== "ORDERED")) return "DONE";
      return "IN_PROGRESS";
    });
    const eqDerived = deriveOverall(eqSts);
    if (eqDerived) overrides["EQUIPMENT_ORDERED"] = eqDerived;

    const ceSts = p.fixtures.map((fx) => {
      const citems = fx.customerItems.filter((ci) => !ci.fgId);
      return citems.length === 0 || citems.every((ci) => ci.status === "RECEIVED") ? "DONE" : "IN_PROGRESS";
    });
    const ceDerived = deriveOverall(ceSts);
    if (ceDerived) overrides["CUSTOMER_EQUIPMENT"] = ceDerived;

    const sdSts = p.fixtures.flatMap((fx) =>
      fx.fgs.map((fg) => {
        const citems = fx.customerItems.filter((ci) => ci.fgId === fg.id);
        return citems.length === 0 || citems.every((ci) => ci.status === "RECEIVED") ? "DONE" : "IN_PROGRESS";
      })
    );
    const sdDerived = deriveOverall(sdSts);
    if (sdDerived) overrides["SAMPLE_DEBUG"] = sdDerived;

    // Strip itemIssues/customerItems from fixtures before passing to client
    const clientFixtures = p.fixtures.map(({ id, name, fgs }) => ({ id, name, fgs }));
    return { ...p, fixtures: clientFixtures, stageOverrides: overrides };
  });

  return (
    <ProjectsClient
      projects={JSON.parse(JSON.stringify(projectsWithOverrides))}
      isLeader={isLeader}
      NewProjectModal={isLeader ? <NewProjectModal /> : null}
    />
  );
}
