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

// ── GET /api/public/inbox/[address]/[emailId] ─────────────────────────────
// Get a specific email from a public inbox
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string; emailId: string }> },
) {
  try {
    const { address, emailId } = await params;

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

    // Get mailbox
    const mailbox = await PublicMailboxService.getMailbox(address);
    if (!mailbox) {
      return apiError("Mailbox not found", 404);
    }

    // Get specific email
    const email = await EmailRepository.findById(emailId, "public");
    if (!email) {
      return apiError("Email not found", 404);
    }

    // Verify email belongs to the requested mailbox
    if (email.mailboxAddressId !== mailbox.id) {
      return apiError("Email not found in this mailbox", 404);
    }

    // Update mailbox access time
    await PublicMailboxService.updateAccessTime(address);

    return apiSuccess({
      email,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch email";
    return apiError(message, 500);
  }
}
