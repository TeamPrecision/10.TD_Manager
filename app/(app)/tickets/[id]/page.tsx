import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import TicketDetail from "./TicketDetail";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session?.user as any)?.role ?? "MEMBER";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myId = (session?.user as any)?.id as string | undefined;
  const isLeader = role === "LEADER";

  const ticket = await prisma.issue.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true, subRole: true } },
      assignees: { include: { user: { select: { id: true, name: true, subRole: true } } } },
      comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      images: { select: { id: true, name: true, section: true, mimeType: true, size: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) notFound();

  // DEPT users can only view their own tickets
  if (role !== "LEADER" && role !== "MEMBER" && ticket.reporterId !== myId) notFound();

  return (
    <TicketDetail
      ticket={JSON.parse(JSON.stringify(ticket))}
      isLeader={isLeader}
      myId={myId ?? null}
    />
  );
}
