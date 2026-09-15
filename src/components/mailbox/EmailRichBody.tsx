"use client";

import { useCallback, useRef } from "react";
import { Icons } from "@/components/icons";
import {
  isDownloadableAttachment,
  rewriteCidHtml,
  wrapEmailHtmlDocument,
} from "@/lib/email-content";
import type { InboundEmailAttachment } from "@/types";

function formatBytes(base64: string): string {
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EmailAttachmentList({
  attachments,
}: Readonly<{
  attachments: InboundEmailAttachment[];
}>) {
  const files = attachments.filter(isDownloadableAttachment);
  if (files.length === 0) return null;

  return (
    <ul className="email-attachment-list">
      {files.map((file) => (
        <li key={`${file.filename}-${file.content.slice(0, 12)}`}>
          <a
            className="email-attachment-link"
            href={`data:${file.contentType};base64,${file.content}`}
            download={file.filename}
          >
            <Icons.Attachment className="email-attachment-icon" />
            <span className="email-attachment-name">{file.filename}</span>
            <span className="email-attachment-size">
              {formatBytes(file.content)}
            </span>
            <Icons.Download className="email-attachment-icon" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function EmailRichBody({
  html,
  text,
  attachments,
}: Readonly<{
  html: string | null;
  text: string;
  attachments: InboundEmailAttachment[];
}>) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const handleLoad = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc?.documentElement) return;
    frame.style.height = 'auto';
    frame.style.height = `${doc.documentElement.scrollHeight}px`;
  }, []);

  if (html) {
    const srcDoc = wrapEmailHtmlDocument(rewriteCidHtml(html, attachments));
    return (
      <div className="email-rich-body">
        <iframe
          ref={frameRef}
          className="email-html-frame"
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          title="Email content"
          srcDoc={srcDoc}
          onLoad={handleLoad}
        />
        <EmailAttachmentList attachments={attachments} />
      </div>
    );
  }

  return (
    <div className="email-rich-body">
      <div className="email-plain-body">{text}</div>
      <EmailAttachmentList attachments={attachments} />
    </div>
  );
}
