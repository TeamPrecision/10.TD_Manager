import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  const existing = await prisma.user.count();
  if (existing > 0) return Response.json({ message: "Already seeded" });

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  const users = [
    { name: "Leader",     email: "leader@td.local",     password: await hash("leader123"), role: "LEADER",  subRole: null },
    { name: "Debug 1",    email: "debug1@td.local",     password: await hash("member123"), role: "MEMBER",  subRole: "DEBUG" },
    { name: "Debug 2",    email: "debug2@td.local",     password: await hash("member123"), role: "MEMBER",  subRole: "DEBUG" },
    { name: "Fixture",    email: "fixture@td.local",    password: await hash("member123"), role: "MEMBER",  subRole: "FIXTURE" },
    { name: "Coding 1",   email: "coding1@td.local",    password: await hash("member123"), role: "MEMBER",  subRole: "CODING" },
    { name: "Coding 2",   email: "coding2@td.local",    password: await hash("member123"), role: "MEMBER",  subRole: "CODING" },
    { name: "Purchasing", email: "purchasing@td.local",  password: await hash("member123"), role: "MEMBER",  subRole: "PURCHASING" },
  ];
  for (const data of users) {
    await prisma.user.create({ data });
  }

  await prisma.project.create({
    data: {
      name: "DEMO-001",
      customer: "Acme Corp",
      stage: "SAMPLE_DEBUG",
    },
  });

  return Response.json({ message: "Seeded successfully" });
}
