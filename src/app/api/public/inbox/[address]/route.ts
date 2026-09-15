import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { AUTH_CONFIG } from "@/lib/auth";
import {
  generateBasicAuthHeaders,
  validateBasicAuth,
} from "@/lib/basic-auth";
import { extractClientIP, inboxAccessLimiter } from "@/lib/rate-limiter";
import { EmailRepository } from "@/repositories/email.repository";
import { PublicMailboxService } from "@/services/public-mailbox.service";
import { toEmailWithState } from "@/services/email.service";

// ── GET /api/public/inbox/[address] ───────────────────────────────────────
// Public endpoint to access inbox without authentication
// Supports optional Basic Auth if configured
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;

    // Extract client IP for rate limiting
    const clientIP = extractClientIP(req.headers);

    // Apply rate limiting
    const rateLimitResult = inboxAccessLimiter(clientIP);
    if (!rateLimitResult.allowed) {
      return apiError(
        "Rate limit exceeded. Please try again later.",
        429,
      );
    }

    // Check Basic Auth if required
    if (AUTH_CONFIG.basicAuth.requiredForPublic) {
      const authHeader = req.headers.get("authorization");
      const basicAuthResult = validateBasicAuth(authHeader, true);

      if (!basicAuthResult.valid) {
        const response = apiError(
          basicAuthResult.error || "Unauthorized",
          401,
        );
        const headers = generateBasicAuthHeaders();
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }
    }

    // Get or create mailbox
    const mailbox = await PublicMailboxService.getOrCreateMailbox(
      address,
      clientIP,
    );

    if (!mailbox) {
      return apiError("Mailbox not found", 404);
    }

    // Get emails for this mailbox (without user-specific filtering)
    const emails = await EmailRepository.findManyByMailboxAddress(mailbox.id, {
      limit: 50,
      offset: 0,
    });

    // Format emails with attachment content for public display
    const formattedEmails = emails.emails.map(email =>
      toEmailWithState({
        ...email,
        readBy: [],
        savedBy: [],
        trashedBy: [],
      }, true)
    );

    return apiSuccess({
      mailbox: {
        address: mailbox.address,
        displayName: mailbox.displayName,
        isActive: mailbox.isActive,
        createdAt: mailbox.createdAt,
        accessedAt: mailbox.accessedAt,
      },
      emails: formattedEmails,
      total: emails.total,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch inbox";
    return apiError(message, 500);
  }
}
