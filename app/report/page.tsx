import { prisma } from "@/lib/prisma";
import ReportForm from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ReportForm projects={projects} />;
}
