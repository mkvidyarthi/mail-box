import type { Prisma } from "@prisma/client";

export type DatabaseProvider = "sqlite" | "postgresql" | "mysql";

export const DATABASE_ENGINE_LABELS: Record<DatabaseProvider, string> = {
  sqlite: "SQLite",
  postgresql: "PostgreSQL",
  mysql: "MySQL",
};

// Mirrors the adapter selection in src/clients/prisma.ts: the active provider is
// derived from DATABASE_URL, and an unset or unrecognised URL falls back to the
// bundled SQLite file.
export function getDatabaseProvider(): DatabaseProvider {
  const url = process.env.DATABASE_URL;
  if (!url || url === "undefined") return "sqlite";

  if (url.startsWith("postgres:") || url.startsWith("postgresql:")) {
    return "postgresql";
  }

  if (url.startsWith("mysql:")) return "mysql";

  return "sqlite";
}

// Prisma accepts `mode: "insensitive"` on PostgreSQL only, and omits the field
// from the generated types of every other provider, so it can only be attached
// at runtime. Leaving it off elsewhere still matches case-insensitively: SQLite
// LIKE ignores ASCII case, and MySQL's default collations are case-insensitive.
export function containsInsensitive(value: string): Prisma.StringFilter {
  const filter: Prisma.StringFilter = { contains: value };

  if (getDatabaseProvider() === "postgresql") {
    return Object.assign(filter, { mode: "insensitive" });
  }

  return filter;
}
