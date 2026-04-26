import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import TicketsClient from "./TicketsClient";

export const dynamic = "force-dynamic";

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId: initialProject } = await searchParams;
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session?.user as any)?.role ?? "MEMBER";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myId = (session?.user as any)?.id as string | undefined;
  const isLeader = role === "LEADER";
  const canSeeAll = role === "LEADER" || role === "MEMBER";

  const [issues, projects, users] = await Promise.all([
    prisma.issue.findMany({
      where: canSeeAll ? undefined : { reporterId: myId },
      include: {
        project: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, subRole: true } },
        assignees: { include: { user: { select: { id: true, name: true, subRole: true } } } },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    canSeeAll ? prisma.user.findMany({ select: { id: true, name: true, subRole: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <TicketsClient
      initialTickets={JSON.parse(JSON.stringify(issues))}
      projects={projects}
      users={users}
      isLeader={isLeader}
      canSeeAll={canSeeAll}
      myId={myId ?? null}
      initialProject={initialProject ?? null}
    />
  );
}
