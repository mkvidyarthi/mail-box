/**
 * Public Mailbox Service
 *
 * Handles public mailbox access and creation without authentication.
 * This service enables disposable email functionality similar to YOPmail.
 */

import { validateUsernameOrEmail } from "@/lib/abuse-protection";
import { MailboxAddressRepository } from "@/repositories/mailbox-address.repository";
import type { MailboxAddress } from "@/types";

export const PublicMailboxService = {
  /**
   * Get an existing mailbox or create a new one if it doesn't exist
   * @param address - Email address to get or create
   * @param ipAddress - IP address of the requester for tracking
   * @returns The mailbox address
   */
  async getOrCreateMailbox(address: string, ipAddress?: string): Promise<MailboxAddress> {
    // Validate email format and check for reserved addresses
    // Accept both full emails and usernames (will be normalized)
    const validation = validateUsernameOrEmail(address, "scems.in");
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const normalizedAddress = validation.normalizedAddress || address;

    // Try to find existing mailbox
    const existing = await MailboxAddressRepository.findByAddress(normalizedAddress);
    if (existing) {
      // Update access time
      await MailboxAddressRepository.updateAccessedAt(existing.id);
      return existing;
    }

    // Create new mailbox
    return MailboxAddressRepository.create({
      address: normalizedAddress,
      displayName: undefined,
      isActive: true,
      createdFromIp: ipAddress,
    });
  },

  /**
   * Get mailbox information without authentication
   * @param address - Email address to look up
   * @returns The mailbox address or null if not found
   */
  async getMailbox(address: string): Promise<MailboxAddress | null> {
    // Normalize the address first
    const validation = validateUsernameOrEmail(address, "scems.in");
    const normalizedAddress = validation.normalizedAddress || address;

    const mailbox = await MailboxAddressRepository.findByAddress(normalizedAddress, true);
    if (!mailbox) {
      return null;
    }

    // Update access time
    await MailboxAddressRepository.updateAccessedAt(mailbox.id);

    return mailbox;
  },

  /**
   * Validate that an address can be used for public mailbox creation
   * @param address - Email address to validate
   * @returns Validation result
   */
  async validateAddressForCreation(address: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    // Check email format and reserved addresses
    const validation = validateUsernameOrEmail(address, "scems.in");
    if (!validation.valid) {
      return validation;
    }

    const normalizedAddress = validation.normalizedAddress || address;

    // Check if mailbox already exists
    const existing = await MailboxAddressRepository.findByAddress(normalizedAddress);
    if (existing) {
      return {
        valid: false,
        error: "Mailbox address already exists",
      };
    }

    return { valid: true };
  },

  /**
   * Update the last access time for a mailbox
   * @param address - Email address to update
   */
  async updateAccessTime(address: string): Promise<void> {
    const validation = validateUsernameOrEmail(address, "scems.in");
    const normalizedAddress = validation.normalizedAddress || address;

    const mailbox = await MailboxAddressRepository.findByAddress(normalizedAddress);
    if (mailbox) {
      await MailboxAddressRepository.updateAccessedAt(mailbox.id);
    }
  },
};
