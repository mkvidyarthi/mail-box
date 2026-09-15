/**
 * Abuse Protection and Security Utilities
 *
 * Centralized security functions for preventing abuse, including
 * reserved address validation, IP-based protections, and suspicious
 * activity detection.
 */

/**
 * Reserved system addresses that cannot be used for mailbox creation
 * These are commonly used for system administration and security purposes
 */
const RESERVED_ADDRESSES = [
  "admin",
  "administrator",
  "root",
  "support",
  "security",
  "abuse",
  "postmaster",
  "webmaster",
  "system",
  "api",
  "mail",
  "smtp",
  "info",
  "contact",
  "help",
  "sales",
  "billing",
  "noreply",
  "no-reply",
  "notifications",
  "alerts",
  "status",
  "dev",
  "development",
  "staging",
  "production",
  "test",
  "testing",
] as const;

/**
 * Extract the local part (username) from an email address
 * @param email - Full email address (e.g., "user@domain.com")
 * @returns Local part (e.g., "user")
 */
export function extractEmailLocalPart(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) {
    return email;
  }
  return parts[0].toLowerCase();
}

/**
 * Check if an email address uses a reserved local part
 * @param email - Full email address to check
 * @returns true if the address is reserved
 */
export function isReservedAddress(email: string): boolean {
  const localPart = extractEmailLocalPart(email);
  return RESERVED_ADDRESSES.includes(localPart as any);
}

/**
 * Get list of reserved addresses (for display purposes)
 * @returns Array of reserved address strings
 */
export function getReservedAddresses(): readonly string[] {
  return RESERVED_ADDRESSES;
}

/**
 * Validate email format and check for reserved addresses
 * @param email - Email address to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateEmailAddress(email: string): {
  valid: boolean;
  error?: string;
} {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: "Invalid email address format",
    };
  }

  // Check for reserved addresses
  if (isReservedAddress(email)) {
    const localPart = extractEmailLocalPart(email);
    return {
      valid: false,
      error: `"${localPart}" is a reserved system address and cannot be used`,
    };
  }

  return { valid: true };
}

/**
 * Validate username or email address format and check for reserved addresses
 * @param address - Username or full email address to validate
 * @param defaultDomain - Default domain to append if address doesn't contain one
 * @returns Object with validation result and error message if invalid
 */
export function validateUsernameOrEmail(address: string, defaultDomain?: string): {
  valid: boolean;
  error?: string;
  normalizedAddress?: string;
} {
  // Check if address contains @
  if (address.includes("@")) {
    // It's a full email address - validate it
    const emailValidation = validateEmailAddress(address);
    if (!emailValidation.valid) {
      return emailValidation;
    }
    return { valid: true, normalizedAddress: address.toLowerCase() };
  }

  // It's just a username - validate it and append default domain
  if (!defaultDomain) {
    return {
      valid: false,
      error: "Address must contain a domain or a default domain must be provided",
    };
  }

  // Validate username characters
  const usernameRegex = /^[a-zA-Z0-9._+-]+$/;
  if (!usernameRegex.test(address)) {
    return {
      valid: false,
      error: "Username contains invalid characters. Only letters, numbers, dots, underscores, hyphens, and plus signs are allowed.",
    };
  }

  // Check for reserved addresses
  if (isReservedAddress(address)) {
    return {
      valid: false,
      error: `"${address}" is a reserved system address and cannot be used`,
    };
  }

  const normalizedAddress = `${address.toLowerCase()}@${defaultDomain.toLowerCase()}`;
  return { valid: true, normalizedAddress };
}

/**
 * Sanitize IP address for logging (protect privacy)
 * @param ip - IP address to sanitize
 * @returns Sanitized IP (last octet masked for IPv4, last segment for IPv6)
 */
export function sanitizeIpAddress(ip: string): string {
  if (!ip) return "unknown";

  // IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  // IPv6
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 3) {
      return `${parts.slice(0, -1).join(":")}:xxxx`;
    }
  }

  return ip;
}

/**
 * Check if IP address is likely a proxy/VPN (basic detection)
 * This is a simple heuristic and not foolproof
 * @param ip - IP address to check
 * @returns true if IP appears to be a proxy/VPN
 */
export function isLikelyProxyOrVPN(ip: string): boolean {
  // This is a placeholder for more sophisticated detection
  // In production, you might integrate with services like:
  // - IPQualityScore
  // - MaxMind GeoIP
  // - AbuseIPDB

  // Basic heuristic: check for common data center IP ranges
  // This is intentionally conservative and may need adjustment
  const proxyRanges = [
    // AWS ranges (simplified example)
    /^54\./,
    /^52\./,
    // Add other ranges as needed
  ];

  return proxyRanges.some((range) => range.test(ip));
}
