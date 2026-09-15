import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function getPrismaAdapter() {
  let url = process.env.DATABASE_URL;
  if (!url || url === "undefined") {
    url = "file:./dev.db";
  }

  // For SQLite (file:), we don't need an adapter in Prisma 6
  if (url.startsWith("file:") || url.startsWith("sqlite:")) {
    return undefined;
  }

  // For libsql, use the adapter
  if (url.startsWith("libsql:")) {
    return new PrismaLibSql({ url });
  }

  // For PostgreSQL, use the adapter
  if (url.startsWith("postgres:") || url.startsWith("postgresql:")) {
    return new PrismaPg({ connectionString: url });
  }

  return undefined;
}

const globalForPrisma = globalThis as unknown as { __prisma: PrismaClient };

const adapter = getPrismaAdapter();

const prismaClientOptions = adapter ? { adapter } : undefined;

export const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient(prismaClientOptions as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
