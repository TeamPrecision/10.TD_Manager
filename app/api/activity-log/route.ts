import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "200");
  const after = req.nextUrl.searchParams.get("after");
  const from  = req.nextUrl.searchParams.get("from");
  const to    = req.nextUrl.searchParams.get("to");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (after) {
    where.createdAt = { gt: new Date(after) };
  } else if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const logs = await prisma.activityLog.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 500),
  });
  return Response.json(logs);
}
