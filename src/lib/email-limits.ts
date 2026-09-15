/**
 * Email Size and Attachment Limits Configuration
 *
 * Centralized configuration for email size limits, attachment size limits,
 * and attachment count limits. All values are configurable via environment
 * variables with sensible defaults.
 */

export const EMAIL_LIMITS = {
  // Maximum total email size in bytes (default: 10MB)
  maxEmailSize:
    (Number(process.env.MAX_EMAIL_SIZE_MB) || 10) * 1024 * 1024,

  // Maximum individual attachment size in bytes (default: 4MB)
  maxAttachmentSize:
    (Number(process.env.MAX_ATTACHMENT_SIZE_MB) || 4) * 1024 * 1024,

  // Maximum number of attachments per email (default: 5)
  maxAttachments: Number(process.env.MAX_ATTACHMENTS) || 5,
} as const;

/**
 * Calculate approximate email size from text content
 * This is an estimation since we can't know the exact MIME-encoded size
 */
export function estimateEmailSize(
  text: string,
  html: string | null | undefined,
  attachments: Array<{ content: string }>,
): number {
  const textSize = new Blob([text]).size;
  const htmlSize = html ? new Blob([html]).size : 0;
  const attachmentsSize = attachments.reduce(
    (total, attachment) => total + attachment.content.length,
    0,
  );

  // Add overhead for MIME encoding (approximately 33% increase)
  const overhead = (textSize + htmlSize + attachmentsSize) * 0.33;

  return textSize + htmlSize + attachmentsSize + overhead;
}

/**
 * Validate attachment size
 */
export function validateAttachmentSize(
  attachment: { content: string },
): boolean {
  return attachment.content.length <= EMAIL_LIMITS.maxAttachmentSize;
}

/**
 * Validate attachment count
 */
export function validateAttachmentCount(count: number): boolean {
  return count <= EMAIL_LIMITS.maxAttachments;
}

/**
 * Validate total email size
 */
export function validateEmailSize(
  text: string,
  html: string | null | undefined,
  attachments: Array<{ content: string }>,
): boolean {
  const estimatedSize = estimateEmailSize(text, html, attachments);
  return estimatedSize <= EMAIL_LIMITS.maxEmailSize;
}
