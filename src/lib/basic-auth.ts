/**
 * Basic Authentication Utilities
 *
 * Functions for handling Basic Authentication as an alternative to
 * session-based authentication. Supports optional Basic Auth for public access.
 */

/**
 * Extract Basic Auth credentials from Authorization header
 * @param authHeader - Authorization header value
 * @returns Object with username and password, or null if invalid
 */
export function extractBasicAuth(authHeader: string | null): {
  username: string;
  password: string;
} | null {
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Basic ")) {
    return null;
  }

  const base64Credentials = authHeader.slice(6);
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "utf-8",
  );

  const [username, password] = credentials.split(":");

  if (!username || !password) {
    return null;
  }

  return { username, password };
}

/**
 * Validate Basic Auth credentials against environment variables
 * @param username - Username to validate
 * @param password - Password to validate
 * @returns true if credentials match
 */
export function validateBasicAuthCredentials(
  username: string,
  password: string,
): boolean {
  const envUsername = process.env.BASIC_AUTH_USERNAME;
  const envPassword = process.env.BASIC_AUTH_PASSWORD;

  // If Basic Auth is not configured, reject
  if (!envUsername || !envPassword) {
    return false;
  }

  return username === envUsername && password === envPassword;
}

/**
 * Check if Basic Auth is required for public access
 * @returns true if Basic Auth is required for public endpoints
 */
export function isBasicAuthRequiredForPublic(): boolean {
  return process.env.BASIC_AUTH_PUBLIC_REQUIRED === "true";
}

/**
 * Validate Basic Auth from request headers
 * @param authHeader - Authorization header value
 * @param requireAuth - Whether authentication is required
 * @returns Object with validation result and error message if invalid
 */
export function validateBasicAuth(
  authHeader: string | null,
  requireAuth: boolean = true,
): {
  valid: boolean;
  error?: string;
} {
  // If auth is not required and not provided, that's okay
  if (!requireAuth && !authHeader) {
    return { valid: true };
  }

  // If auth is required but not provided
  if (requireAuth && !authHeader) {
    return {
      valid: false,
      error: "Authentication required",
    };
  }

  // Extract credentials
  const credentials = extractBasicAuth(authHeader);
  if (!credentials) {
    return {
      valid: false,
      error: "Invalid authentication format",
    };
  }

  // Validate credentials
  if (!validateBasicAuthCredentials(credentials.username, credentials.password)) {
    return {
      valid: false,
      error: "Invalid credentials",
    };
  }

  return { valid: true };
}

/**
 * Generate Basic Auth headers for a response
 * @returns Headers object with WWW-Authenticate header
 */
export function generateBasicAuthHeaders(): Headers {
  const headers = new Headers();
  headers.set(
    "WWW-Authenticate",
    'Basic realm="Mailbox", charset="UTF-8"',
  );
  return headers;
}

/**
 * Check if Basic Auth is configured
 * @returns true if Basic Auth credentials are set in environment
 */
export function isBasicAuthConfigured(): boolean {
  return !!(
    process.env.BASIC_AUTH_USERNAME && process.env.BASIC_AUTH_PASSWORD
  );
}
