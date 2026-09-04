import PostalMime from "postal-mime";

export interface Env {
  NEXTJS_APP_URL: string;
  WEBHOOK_SECRET: string;
}

export interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  readonly raw: ReadableStream;
  forward(to: string, headers?: Headers): Promise<void>;
  setReject(reason: string): void;
}

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 12 * 1024 * 1024;

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function stripContentId(contentId: string | undefined): string | undefined {
  if (!contentId) return undefined;
  return contentId.replace(/^<|>$/g, "").trim() || undefined;
}

export default {
  async email(
    message: EmailMessage,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    try {
      if (!env.NEXTJS_APP_URL || !env.WEBHOOK_SECRET) {
        throw new Error(
          "Missing required environment variables NEXTJS_APP_URL or WEBHOOK_SECRET",
        );
      }

      const rawEmail = await new Response(message.raw).arrayBuffer();
      const parser = new PostalMime();
      const parsed = await parser.parse(rawEmail);

      const messageId =
        parsed.messageId ||
        message.headers.get("message-id") ||
        `${Date.now()}-${crypto.randomUUID()}@email.routing`;

      let toAddresses =
        (parsed.to?.map((t) => t.address).filter(Boolean) as string[]) || [];
      if (toAddresses.length === 0) {
        toAddresses = [message.to];
      }

      const attachments: Array<{
        filename: string;
        contentType: string;
        content: string;
        contentId?: string;
        disposition?: string;
      }> = [];

      let totalBytes = 0;
      const parsedAttachments = parsed.attachments || [];
      for (let i = 0; i < parsedAttachments.length; i++) {
        const part = parsedAttachments[i];
        const raw = part.content;
        const bytes =
          raw instanceof ArrayBuffer
            ? new Uint8Array(raw)
            : raw instanceof Uint8Array
              ? raw
              : null;
        if (!bytes || bytes.byteLength === 0) continue;

        const size = bytes.byteLength;
        if (size > MAX_ATTACHMENT_BYTES) continue;
        if (totalBytes + size > MAX_TOTAL_ATTACHMENT_BYTES) continue;

        totalBytes += size;
        const contentId = stripContentId(part.contentId);
        attachments.push({
          filename: part.filename || `attachment-${i + 1}`,
          contentType: part.mimeType || "application/octet-stream",
          content: arrayBufferToBase64(bytes),
          ...(contentId ? { contentId } : {}),
          ...(part.disposition ? { disposition: part.disposition } : {}),
        });
      }

      const payload = {
        messageId,
        from: {
          address: parsed.from?.address || message.from,
          name: parsed.from?.name || undefined,
        },
        to: toAddresses.map((address) => ({ address })),
        subject: parsed.subject || "(no subject)",
        text: parsed.text || "",
        html: parsed.html || null,
        attachments,
      };

      const baseUrl = env.NEXTJS_APP_URL.replace(/\/$/, "");
      const webhookUrl = `${baseUrl}/api/emails`;

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": env.WEBHOOK_SECRET,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const rejectMsg = `Webhook forward failed (Status: ${response.status}): ${errorText}`;
        message.setReject(rejectMsg);
        throw new Error(rejectMsg);
      }
    } catch (error) {
      console.error("Error handling incoming email:", error);
      throw error;
    }
  },
};
