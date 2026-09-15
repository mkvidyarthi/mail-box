/**
 * Cron Job Configuration
 *
 * Configuration for scheduled cleanup jobs and maintenance tasks.
 */

export const CRON_CONFIG = {
  // Mailbox cleanup configuration
  mailboxCleanup: {
    // Hours of inactivity before cleanup (default: 48 hours)
    hoursBeforeCleanup: Number(process.env.MAILBOX_CLEANUP_HOURS) || 48,
    // Whether to run in dry-run mode (for testing)
    dryRun: process.env.CRON_DRY_RUN === "true",
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
