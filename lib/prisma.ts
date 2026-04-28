import { PrismaClient } from "@prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Resolve relative file: URLs to absolute so the path is stable regardless
// of which directory the Next.js server process considers its CWD at runtime.
const dbUrl = (() => {
  const raw = process.env.DATABASE_URL ?? "";
  const PREFIX = "file:";
  if (raw.startsWith(PREFIX)) {
    const filePath = raw.slice(PREFIX.length);
    if (!path.isAbsolute(filePath)) {
      return PREFIX + path.resolve(/*turbopackIgnore: true*/ process.cwd(), filePath);
    }
  }
  return raw;
})();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: { db: { url: dbUrl } },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
