import { prisma } from "@/lib/prisma";
import FixtureClient from "./FixtureClient";

export const dynamic = "force-dynamic";

export default async function FixturePage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    where: {
      AND: [
        { processes: { some: {} } },
        // All non-auto-derived stages must be DONE in DB
        {
          NOT: {
            processes: {
              some: {
                stageKey: { notIn: ["EQUIPMENT_ORDERED", "CUSTOMER_EQUIPMENT", "SAMPLE_DEBUG"] },
                status: { not: "DONE" },
              },
            },
          },
        },
        // EQUIPMENT_ORDERED: no item issues with pending/ordered items
        { NOT: { itemIssues: { some: { item: { status: { in: ["PENDING", "ORDERED"] } } } } } },
        // CUSTOMER_EQUIPMENT: no unreceived non-FG customer items
        { NOT: { fixtures: { some: { customerItems: { some: { fgId: null, status: { not: "RECEIVED" } } } } } } },
        // SAMPLE_DEBUG: no unreceived FG customer items
        { NOT: { fixtures: { some: { customerItems: { some: { fgId: { not: null }, status: { not: "RECEIVED" } } } } } } },
      ],
    },
    select: {
      id: true,
      name: true,
      customer: true,
      fixtures: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          fgs: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, model: true } },
        },
      },
    },
  });

  return <FixtureClient projects={JSON.parse(JSON.stringify(projects))} />;
}
