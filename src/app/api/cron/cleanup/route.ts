import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { cleanupInactiveMailboxes, getInactiveMailboxStats } from "@/jobs/cleanup-mailboxes";

// ── POST /api/cron/cleanup ─────────────────────────────────────────────────
// Cron job endpoint to clean up inactive mailboxes
// Should be secured with WEBHOOK_SECRET or similar
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return apiError("Unauthorized", 401);
    }

    // Check if this is a dry run
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";

    if (dryRun) {
      // Return statistics without actually deleting
      const stats = await getInactiveMailboxStats();
      return apiSuccess({
        dryRun: true,
        ...stats,
        message: "Dry run - no mailboxes were deleted",
      });
    }

    // Perform actual cleanup
    const result = await cleanupInactiveMailboxes();

    return apiSuccess(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cleanup failed";
    return apiError(message, 500);
  }
}

// ── GET /api/cron/cleanup ──────────────────────────────────────────────────
// Get statistics about inactive mailboxes
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = req.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return apiError("Unauthorized", 401);
    }

    const stats = await getInactiveMailboxStats();
    return apiSuccess(stats);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get stats";
    return apiError(message, 500);
  }
}
