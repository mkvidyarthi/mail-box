/**
 * Local Cron Job Runner
 *
 * This script runs scheduled tasks locally during development.
 * It mimics the Vercel cron jobs defined in vercel.json.
 *
 * Usage:
 *   npm run cron:dev    # Run cron jobs with logging
 *   npm run dev         # Start Next.js (cron runs separately)
 */

import cron from "node-cron";
import { cleanupInactiveMailboxes } from "@/jobs/cleanup-mailboxes";
import { CRON_CONFIG } from "@/lib/cron-config";

// ── Schedule Mailbox Cleanup ───────────────────────────────────────────────
// Runs daily at midnight (matches vercel.json: "0 0 * * *")
console.log("🕐 Starting local cron job runner...");
console.log(`⚙️  Mailbox cleanup config: ${CRON_CONFIG.mailboxCleanup.hoursBeforeCleanup} hours, dryRun=${CRON_CONFIG.mailboxCleanup.dryRun}`);

const cleanupTask = cron.schedule("0 0 * * *", async () => {
  console.log("\n🧹 Running mailbox cleanup job...");
  try {
    const result = await cleanupInactiveMailboxes();
    console.log("✅ Cleanup completed:", {
      mailboxesDeleted: result.mailboxesDeleted,
      emailsDeleted: result.emailsDeleted,
      errors: result.errors.length,
    });
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
});

// ── Manual Trigger for Testing ───────────────────────────────────────────
// Run cleanup immediately on startup for testing (comment out if not needed)
// console.log("\n🧹 Running initial cleanup on startup...");
// cleanupInactiveMailboxes()
//   .then((result) => {
//     console.log("✅ Initial cleanup completed:", {
//       mailboxesDeleted: result.mailboxesDeleted,
//       emailsDeleted: result.emailsDeleted,
//     });
//   })
//   .catch((error) => {
//     console.error("❌ Initial cleanup failed:", error);
//   });

// ── Graceful Shutdown ───────────────────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping cron job runner...");
  cleanupTask.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Stopping cron job runner...");
  cleanupTask.stop();
  process.exit(0);
});

console.log("✅ Cron job runner is running. Press Ctrl+C to stop.");
