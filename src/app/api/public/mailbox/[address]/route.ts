import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { AUTH_CONFIG } from "@/lib/auth";
import {
  generateBasicAuthHeaders,
  validateBasicAuth,
} from "@/lib/basic-auth";
import { extractClientIP, inboxAccessLimiter } from "@/lib/rate-limiter";
import { PublicMailboxService } from "@/services/public-mailbox.service";

// ── POST /api/public/mailbox/[address] ────────────────────────────────────
// Create a new public mailbox
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;

    // Extract client IP for rate limiting
    const clientIP = extractClientIP(req.headers);

    // Apply rate limiting for mailbox creation
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

    // Validate and create mailbox
    const validation = await PublicMailboxService.validateAddressForCreation(
      address,
    );
    if (!validation.valid) {
      return apiError(validation.error || "Invalid address", 400);
    }

    const mailbox = await PublicMailboxService.getOrCreateMailbox(
      address,
      clientIP,
    );

    return apiSuccess({
      mailbox: {
        address: mailbox.address,
        displayName: mailbox.displayName,
        isActive: mailbox.isActive,
        createdAt: mailbox.createdAt,
      },
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create mailbox";
    return apiError(message, 500);
  }
}

// ── GET /api/public/mailbox/[address] ───────────────────────────────────────
// Get mailbox information
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

    // Get mailbox
    const mailbox = await PublicMailboxService.getMailbox(address);
    if (!mailbox) {
      return apiError("Mailbox not found", 404);
    }

    return apiSuccess({
      mailbox: {
        address: mailbox.address,
        displayName: mailbox.displayName,
        isActive: mailbox.isActive,
        createdAt: mailbox.createdAt,
        accessedAt: mailbox.accessedAt,
      },
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch mailbox";
    return apiError(message, 500);
  }
}
