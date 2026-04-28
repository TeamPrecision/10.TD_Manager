import { prisma } from "@/lib/prisma";
import { stageIndex } from "@/lib/utils";
import { auth } from "@/lib/auth";
import PurchasingManager from "./PurchasingManager";

export const dynamic = "force-dynamic";

export default async function PurchasingPage() {
  const session = await auth();
  const role = session?.user?.role ?? "MEMBER";
  const subRole = session?.user?.subRole ?? null;

  const [items, projects] = await Promise.all([
    prisma.item.findMany({
      include: {
        project: { select: { id: true, name: true } },
        fixture: { select: { id: true, name: true } },
        comments: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
        issues: {
          include: {
            project: { select: { id: true, name: true } },
            fixture: { select: { id: true, name: true } },
            user: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        stage: true,
        fixtures: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sortedProjects = [...projects].sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage));

  return (
    <PurchasingManager
      initialItems={JSON.parse(JSON.stringify(items))}
      projects={JSON.parse(JSON.stringify(sortedProjects))}
      role={role}
      subRole={subRole}
    />
  );
}
