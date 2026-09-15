/**
 * Mailbox Cleanup Job
 *
 * Scheduled job to clean up inactive mailboxes and their associated emails.
 * This affects ALL mailboxes that haven't been accessed within the configured time period.
 */

import { prisma } from "@/clients/prisma";
import { getCleanupCutoffDate, CRON_CONFIG } from "@/lib/cron-config";

export interface CleanupResult {
  success: boolean;
  mailboxesDeleted: number;
  emailsDeleted: number;
  errors: string[];
  dryRun: boolean;
  cutoffDate: Date;
}

/**
 * Main cleanup function to remove inactive mailboxes
 * @returns Cleanup statistics
 */
export async function cleanupInactiveMailboxes(): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: true,
    mailboxesDeleted: 0,
    emailsDeleted: 0,
    errors: [],
    dryRun: CRON_CONFIG.mailboxCleanup.dryRun,
    cutoffDate: getCleanupCutoffDate(),
  };

  try {
    console.log(`Starting mailbox cleanup...`);
    console.log(`Cutoff date: ${result.cutoffDate.toISOString()}`);
    console.log(`Dry run mode: ${result.dryRun}`);

    // Find all mailboxes that haven't been accessed since the cutoff date
    const inactiveMailboxes = await prisma.mailboxAddress.findMany({
      where: {
        accessedAt: {
          lt: result.cutoffDate,
        },
      },
      select: {
        id: true,
        address: true,
        accessedAt: true,
        _count: {
          select: {
            emails: true,
          },
        },
      },
    });

    console.log(`Found ${inactiveMailboxes.length} inactive mailboxes`);

    for (const mailbox of inactiveMailboxes) {
      try {
        const emailCount = mailbox._count.emails;
        console.log(
          `Processing mailbox: ${mailbox.address} (${emailCount} emails, last accessed: ${mailbox.accessedAt.toISOString()})`,
        );

        if (result.dryRun) {
          console.log(`[DRY RUN] Would delete mailbox: ${mailbox.address}`);
          result.mailboxesDeleted++;
          result.emailsDeleted += emailCount;
        } else {
          // Delete the mailbox (this will cascade delete emails due to Prisma relations)
          await prisma.mailboxAddress.delete({
            where: { id: mailbox.id },
          });

          result.mailboxesDeleted++;
          result.emailsDeleted += emailCount;
          console.log(`Deleted mailbox: ${mailbox.address}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to delete mailbox ${mailbox.address}: ${errorMsg}`);
        result.errors.push(`Failed to delete ${mailbox.address}: ${errorMsg}`);
        result.success = false;
      }
    }

    console.log(`Cleanup completed:`);
    console.log(`- Mailboxes deleted: ${result.mailboxesDeleted}`);
    console.log(`- Emails deleted: ${result.emailsDeleted}`);
    console.log(`- Errors: ${result.errors.length}`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Cleanup failed: ${errorMsg}`);
    result.success = false;
    result.errors.push(`Cleanup failed: ${errorMsg}`);
    return result;
  }
}

/**
 * Get statistics about inactive mailboxes without deleting them
 * @returns Statistics about inactive mailboxes
 */
export async function getInactiveMailboxStats(): Promise<{
  totalMailboxes: number;
  inactiveMailboxes: number;
  totalEmailsToBeDeleted: number;
  cutoffDate: Date;
}> {
  const cutoffDate = getCleanupCutoffDate();

  const [totalMailboxes, inactiveMailboxes] = await Promise.all([
    prisma.mailboxAddress.count(),
    prisma.mailboxAddress.count({
      where: {
        accessedAt: {
          lt: cutoffDate,
        },
      },
    }),
  ]);

  // Get total email count for inactive mailboxes
  const inactiveMailboxesWithEmails = await prisma.mailboxAddress.findMany({
    where: {
      accessedAt: {
        lt: cutoffDate,
      },
    },
    select: {
      _count: {
        select: {
          emails: true,
        },
      },
    },
  });

  const totalEmailsToBeDeleted = inactiveMailboxesWithEmails.reduce(
    (sum, mailbox) => sum + mailbox._count.emails,
    0,
  );

  return {
    totalMailboxes,
    inactiveMailboxes,
    totalEmailsToBeDeleted,
    cutoffDate,
  };
}
