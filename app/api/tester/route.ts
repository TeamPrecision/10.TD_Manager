import { prisma } from "@/lib/prisma";

export async function GET() {
  const testers = await prisma.tester.findMany({
    include: { project: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(testers);
}
