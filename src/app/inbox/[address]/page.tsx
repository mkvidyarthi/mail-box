"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { EmailRichBody } from "@/components/mailbox/EmailRichBody";
import type { EmailWithState } from "@/types";

function stripHtmlAndEntities(html: string | null | undefined): string {
  if (!html) return '';
  
  // Create a temporary DOM element to decode HTML entities
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function getEmailPreview(email: EmailWithState): string {
  // First try bodyText, but strip any HTML that might be in it
  if (email.bodyText) {
    const plainText = stripHtmlAndEntities(email.bodyText);
    return plainText.substring(0, 50);
  }
  // Fall back to bodyHtml if bodyText is empty or unavailable
  if (email.bodyHtml) {
    const plainText = stripHtmlAndEntities(email.bodyHtml);
    return plainText.substring(0, 50);
  }
  return '';
}

interface PublicInboxData {
  mailbox: {
    address: string;
    displayName: string | null;
    isActive: boolean;
    createdAt: string;
    accessedAt: string;
  };
  emails: EmailWithState[];
  total: number;
  rateLimit: {
    remaining: number;
    resetTime: number;
  };
}

export default function PublicInboxPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const t = useTranslations("PublicInbox");
  const router = useRouter();
  const [data, setData] = useState<PublicInboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailWithState | null>(null);
  
  // Unwrap params promise and decode URL-encoded address
  const { address } = use(params);
  const decodedAddress = decodeURIComponent(address);

  useEffect(() => {
    fetchInbox();
  }, [decodedAddress]);

  // Auto-select the first (most recent) email when data loads
  useEffect(() => {
    if (data && data.emails.length > 0 && !selectedEmail) {
      setSelectedEmail(data.emails[0]);
    }
  }, [data, selectedEmail]);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/public/inbox/${decodedAddress}`);

      if (!response.ok) {
        if (response.status === 401) {
          // Basic Auth required
          setError("Authentication required. Please provide Basic Auth credentials.");
          return;
        }
        if (response.status === 429) {
          setError("Rate limit exceeded. Please try again later.");
          return;
        }
        if (response.status === 404) {
          setError("Mailbox not found.");
          return;
        }
        throw new Error("Failed to fetch inbox");
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch inbox");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchInbox();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-text-secondary">
        <div className="text-center">
          <Icons.Spinner className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading inbox...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full">
          <FeedbackBanner type="error" message={error} />
          <div className="mt-4 flex justify-center">
            <Button onClick={handleRefresh}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-text-secondary">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {data.mailbox.displayName || decodedAddress}
              </h1>
              <p className="text-sm text-text-secondary">{decodedAddress}</p>
            </div>
            <Button onClick={handleRefresh} variant="ghost" size="icon">
              <Icons.Refresh className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Rate Limit Warning */}
      {data.rateLimit.remaining < 10 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <FeedbackBanner
            type="warning"
            message={`Rate limit: ${data.rateLimit.remaining} requests remaining`}
          />
        </div>
      )}

      {/* Split View: Email List + Preview */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
        {data.emails.length === 0 ? (
          <div className="text-center py-12">
            <Icons.Mail className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No emails yet
            </h3>
            <p className="text-text-secondary">
              Send an email to {decodedAddress} to see it appear here.
            </p>
          </div>
        ) : (
          <div className="flex h-full gap-4 overflow-hidden">
            {/* Left Side: Email List */}
            <div className="w-full md:w-[400px] lg:w-[450px] bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 border-b border-border bg-surface shrink-0">
                <h2 className="text-sm font-semibold text-text-primary">Inbox ({data.emails.length})</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {data.emails.map((email) => (
                  <div
                    key={email.id}
                    className={`border-b border-border last:border-b-0 hover:bg-surface-hover cursor-pointer p-3 ${
                      selectedEmail?.id === email.id ? 'bg-surface-hover' : ''
                    }`}
                    onClick={() => setSelectedEmail(email)}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium text-text-primary truncate flex-1">
                        {email.subject}
                      </p>
                      <span className="text-xs text-text-secondary ml-2 flex-shrink-0">
                        {new Date(email.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary truncate">
                      {email.fromName || email.fromAddress}
                    </p>
                    <p className="text-xs text-text-secondary truncate mt-1">
                      {getEmailPreview(email)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Email Preview */}
            <div className="hidden md:flex flex-1 min-w-[500px] bg-surface border border-border rounded-lg overflow-hidden">
              {selectedEmail ? (
                <div className="flex flex-col h-full min-w-0 w-full">
                  <div className="p-4 border-b border-border shrink-0">
                    <h2 className="text-lg font-semibold text-text-primary mb-2">
                      {selectedEmail.subject}
                    </h2>
                    <div className="text-sm text-text-secondary space-y-1">
                      <p>
                        <strong>From:</strong> {selectedEmail.fromName || selectedEmail.fromAddress}
                      </p>
                      <p>
                        <strong>Date:</strong> {new Date(selectedEmail.receivedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 p-6 min-w-0 overflow-auto">
                    <EmailRichBody
                      html={selectedEmail.bodyHtml}
                      text={selectedEmail.bodyText}
                      attachments={selectedEmail.attachments}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary">
                  <div className="text-center">
                    <Icons.Mail className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                    <p>Select an email to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Email Detail Modal */}
      {selectedEmail && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border p-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-text-primary">
                {selectedEmail.subject}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEmail(null)}
              >
                <Icons.Close className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-sm text-text-secondary">
                  <strong>From:</strong> {selectedEmail.fromName || selectedEmail.fromAddress}
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Date:</strong> {new Date(selectedEmail.receivedAt).toLocaleString()}
                </p>
              </div>
              <div className="prose prose-sm max-w-none">
                <EmailRichBody
                  html={selectedEmail.bodyHtml}
                  text={selectedEmail.bodyText}
                  attachments={selectedEmail.attachments}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
