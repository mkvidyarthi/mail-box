import type { NextRequest } from "next/server";
import { prisma } from "@/clients/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { AUTH_CONFIG } from "@/lib/auth";
import { DATABASE_ENGINE_LABELS, getDatabaseProvider } from "@/lib/db";
import { SessionService } from "@/services/session.service";

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return "undefined";
  try {
    if (url.startsWith("file:")) {
      return url;
    }
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    // DATABASE_URL is not always parseable as a URL — unexpanded ${VAR}
    // placeholders from .env are common — so mask the password positionally.
    return url.replace(/:([^:@]+)@/, ":****@");
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(AUTH_CONFIG.session.cookieName)?.value;
    if (!sessionToken) {
      return apiError("Not authenticated", 401);
    }

    const sessionData = await SessionService.getSessionAndUser(sessionToken);
    if (!sessionData) {
      return apiError("Session expired", 401);
    }

    // Role-based gate: only OWNER can see database info
    if (sessionData.user.role !== "OWNER") {
      return apiError("Forbidden: Admin access required", 403);
    }

    const rawUrl = process.env.DATABASE_URL;
    const schemaPath =
      process.env.PRISMA_SCHEMA_PATH || "./prisma/sqlite/schema.prisma";

    const dbEngine = DATABASE_ENGINE_LABELS[getDatabaseProvider()];

    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();

    return apiSuccess(
      {
        engine: dbEngine,
        schemaPath,
        url: maskDatabaseUrl(rawUrl),
        metrics: {
          users: userCount,
          sessions: sessionCount,
        },
      },
      200,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to retrieve database info";
    return apiError(message, 500);
  }
}
