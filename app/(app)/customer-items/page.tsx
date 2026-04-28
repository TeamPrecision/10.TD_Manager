import { prisma } from "@/lib/prisma";
import { stageIndex } from "@/lib/utils";
import { auth } from "@/lib/auth";
import CustomerItemsManager from "./CustomerItemsManager";

export const dynamic = "force-dynamic";

export default async function CustomerItemsPage() {
  const session = await auth();
  const role = session?.user?.role ?? "MEMBER";
  const [items, projects] = await Promise.all([
    prisma.customerItem.findMany({
      include: {
        project: { select: { id: true, name: true } },
        fixture: { select: { id: true, name: true } },
        fg: { select: { id: true, name: true, model: true } },
        comments: {
          include: { user: { select: { name: true } } },
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
        fixtures: {
          select: {
            id: true,
            name: true,
            fgs: { select: { id: true, name: true, model: true }, orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sortedProjects = [...projects].sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage));

  return (
    <CustomerItemsManager
      initialItems={JSON.parse(JSON.stringify(items))}
      projects={JSON.parse(JSON.stringify(sortedProjects))}
      role={role}
    />
  );
}
