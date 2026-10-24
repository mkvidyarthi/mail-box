/**
 * Cron Job Configuration
 *
 * Configuration for scheduled cleanup jobs and maintenance tasks.
 */

export const CRON_CONFIG = {
  // Mailbox cleanup configuration
  mailboxCleanup: {
    // Hours after creation before cleanup (default: 48 hours)
    hoursBeforeCleanup: Number(process.env.MAILBOX_CLEANUP_HOURS) || 48,
    // Whether to run in dry-run mode (for testing)
    dryRun: process.env.CRON_DRY_RUN === "true",
    // Protected email addresses that should never be deleted (admin emails, etc.)
    // Can be extended via PROTECTED_EMAILS env var (comma-separated)
    protectedEmails: (() => {
      const defaultEmails = ["info@scems.in", "mahendra@scems.in"];
      const envEmails = process.env.PROTECTED_EMAILS?.split(",").map((e) => e.trim()) || [];
      // Combine and deduplicate
      return Array.from(new Set([...defaultEmails, ...envEmails]));
    })(),
  },
} as const;

/**
 * Get the cutoff date for mailbox cleanup
 * @returns Date object representing the cutoff time
 */
export function getCleanupCutoffDate(): Date {
  const cutoff = new Date();
  cutoff.setHours(
    cutoff.getHours() - CRON_CONFIG.mailboxCleanup.hoursBeforeCleanup,
  );
  return cutoff;
}
