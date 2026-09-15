import type { InboundEmailAttachment } from "@/types";
import { InboundEmailAttachmentSchema } from "@/types";

export function parseAttachmentsJson(
  json: string | null | undefined,
): InboundEmailAttachment[] {
  if (!json) return [];
  try {
    const parsed = InboundEmailAttachmentSchema.array().safeParse(
      JSON.parse(json),
    );
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function rewriteCidHtml(
  html: string,
  attachments: InboundEmailAttachment[],
): string {
  let rewritten = html.replace(/<base\b[^>]*>/gi, "");

  for (const attachment of attachments) {
    if (!attachment.contentId) continue;
    const dataUrl = `data:${attachment.contentType};base64,${attachment.content}`;
    const escapedId = attachment.contentId.replaceAll(
      /[.*+?^${}()|[\]\\]/g,
      (ch) => `\\${ch}`,
    );
    rewritten = rewritten.replace(
      new RegExp(`cid:${escapedId}`, "gi"),
      dataUrl,
    );
  }

  return rewritten;
}

export function wrapEmailHtmlDocument(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><base target="_blank"><style>
    html,body{margin:0;padding:0;background:transparent;color:inherit;font:14px/1.55 system-ui,sans-serif;overflow-x:hidden;}
    *{box-sizing:border-box;max-width:100%;}
    img,video{max-width:100%;height:auto;display:block;}
    table{width:100%;max-width:100%;table-layout:fixed;}
    td{word-wrap:break-word;overflow-wrap:break-word;}
    a{color:inherit;}
    div,p{max-width:100%;overflow-wrap:break-word;}
    body{width:100%;}
  </style></head><body>${html}</body></html>`;
}

export function isDownloadableAttachment(
  attachment: InboundEmailAttachment,
): boolean {
  const disposition = (attachment.disposition || "attachment").toLowerCase();
  return disposition !== "inline";
}
