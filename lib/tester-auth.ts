import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export async function validateTesterKey(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  if (!key) return null;
  return prisma.tester.findUnique({ where: { apiKey: key } });
}
