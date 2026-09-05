export function inboundEventKey(
  deliveryHash: string | undefined,
  messageId: string,
): string {
  if (deliveryHash) {
    return `sha256:${deliveryHash.toLowerCase()}`;
  }
  return `msgid:${messageId.trim()}`;
}

export function stableMessageId(
  messageId: string | undefined,
  deliveryHash: string | undefined,
): string {
  const trimmed = messageId?.trim();
  if (trimmed) return trimmed;
  if (deliveryHash)
    return `<sha256-${deliveryHash.toLowerCase()}@email.routing>`;
  throw new Error("Inbound payload is missing both messageId and deliveryHash");
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
