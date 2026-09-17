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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
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

  const toggleGroup = (label: string) => {
  setCollapsedGroups((prev) => ({
    ...prev,
    [label]: !prev[label],
  }));
};

  const groupedEmails = data.emails.reduce<Record<string, typeof data.emails>>((groups, email) => {
  const date = new Date(email.receivedAt);
  const today = new Date();
  const yesterday = new Date();

  today.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const emailDate = new Date(date);
  emailDate.setHours(0, 0, 0, 0);

  let label: string;

  if (emailDate.getTime() === today.getTime()) {
    label = 'Today';
  } else if (emailDate.getTime() === yesterday.getTime()) {
    label = 'Yesterday';
  } else {
    label = date.toLocaleDateString([], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  if (!groups[label]) {
    groups[label] = [];
  }

  groups[label].push(email);

  return groups;
}, {});

const groupedEmailEntries = Object.entries(groupedEmails).sort(([, emailsA], [, emailsB]) => {
  return (
    new Date(emailsB[0].receivedAt).getTime() -
    new Date(emailsA[0].receivedAt).getTime()
  );
});

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {decodedAddress.split("@")[0]}
              </h1>
              <p className="text-sm text-text-secondary">{decodedAddress}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => router.push("/login")} variant="ghost" size="icon" title="Home">
                <Icons.Home className="w-5 h-5" />
              </Button>
              <Button onClick={handleRefresh} variant="ghost" size="icon">
                <Icons.Refresh className="w-5 h-5" />
              </Button>
            </div>
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

      {/* Split View */}
  <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-1 overflow-hidden">
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
      <>
        {/* ============================= */}
        {/* Desktop */}
        {/* ============================= */}
        <div className="hidden md:flex h-full gap-4 overflow-hidden">
          {/* Left Email List */}
          <div className="w-[400px] lg:w-[450px] bg-surface border border-border rounded-lg overflow-hidden flex flex-col shrink-0">
            <div className="p-3 border-b border-border bg-surface shrink-0">
              <h2 className="text-sm font-semibold text-text-primary">
                Inbox ({data.emails.length})
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {groupedEmailEntries.map(([dateLabel, emails]) => {
                const isCollapsed =
                  collapsedGroups[dateLabel] ?? dateLabel !== "Today";

                return (
                  <div key={dateLabel}>
                    {/* Date Group Header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(dateLabel)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-surface hover:bg-surface-hover border-b border-border text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Icons.ChevronRight
                          className={`w-4 h-4 text-text-secondary transition-transform ${
                            !isCollapsed ? "rotate-90" : ""
                          }`}
                        />

                        <span className="text-xs font-semibold text-text-primary">
                          {dateLabel}
                        </span>

                        <span className="text-xs text-text-secondary">
                          {emails.length}
                        </span>
                      </div>
                    </button>

                    {!isCollapsed &&
                      emails.map((email) => (
                        <div
                          key={email.id}
                          className={`border-b border-border hover:bg-surface-hover cursor-pointer p-3 ${
                            selectedEmail?.id === email.id
                              ? "bg-surface-hover"
                              : ""
                          }`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium text-text-primary truncate flex-1">
                              {email.subject}
                            </p>

                            <span className="text-xs text-text-secondary ml-2 flex-shrink-0">
                              {new Date(
                                email.receivedAt
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
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
                );
              })}
            </div>
          </div>

          {/* Desktop Email Preview */}
          <div className="flex-1 min-w-0 bg-surface border border-border rounded-lg overflow-hidden">
            {selectedEmail ? (
              <div className="flex flex-col h-full min-w-0">
                <div className="p-4 border-b border-border shrink-0">
                  <h2 className="text-lg font-semibold text-text-primary mb-2">
                    {selectedEmail.subject}
                  </h2>

                  <div className="text-sm text-text-secondary space-y-1">
                    <p>
                      <strong>From:</strong>{" "}
                      {selectedEmail.fromName} [
                      {selectedEmail.fromAddress}]
                    </p>

                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(
                        selectedEmail.receivedAt
                      ).toLocaleString()}
                    </p>

                    <p>
                      <strong>Sent to:</strong> {decodedAddress}
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

        {/* ============================= */}
        {/* Mobile */}
        {/* ============================= */}
        <div className="md:hidden h-full flex flex-col overflow-hidden">
          {/* Open Inbox Drawer */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileDrawerOpen(true)}
            title="Open inbox"
            className="shrink-0"
          >
            <Icons.Menu className="w-5 h-5" />
          </Button>
          {/* Mobile Email Preview */}
          <div className="flex-1 min-h-0 bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
            {selectedEmail ? (
              <>                    
              
                {/* Mobile Preview Header */}
                <div className="p-4 border-b border-border shrink-0">
                  <div className="flex items-start gap-3">


                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-text-primary mb-2">
                        {selectedEmail.subject}
                      </h2>

                      <div className="text-sm text-text-secondary space-y-1">
                        <p className="truncate">
                          <strong>From:</strong>{" "}
                          {selectedEmail.fromName ||
                            selectedEmail.fromAddress}
                        </p>

                        <p>
                          <strong>Date:</strong>{" "}
                          {new Date(
                            selectedEmail.receivedAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="flex-1 overflow-y-auto p-4">
                  <EmailRichBody
                    html={selectedEmail.bodyHtml}
                    text={selectedEmail.bodyText}
                    attachments={selectedEmail.attachments}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <Button
                  variant="ghost"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="mb-3"
                >
                  <Icons.Mail className="w-5 h-5 mr-2" />
                  Open Inbox
                </Button>

                <p>Select an email to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* ============================= */}
        {/* Mobile Inbox Drawer */}
        {/* ============================= */}
        {isMobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Drawer */}
            <div className="absolute left-0 top-0 bottom-0 w-[88%] max-w-[420px] bg-surface shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              {/* Drawer Header */}
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">
                    Inbox
                  </h2>

                  <p className="text-xs text-text-secondary">
                    {data.emails.length} emails
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  title="Close inbox"
                >
                  <Icons.Close className="w-5 h-5" />
                </Button>
              </div>

              {/* Email List */}
              <div className="flex-1 overflow-y-auto">
                {groupedEmailEntries.map(([dateLabel, emails]) => {
                  const isCollapsed =
                    collapsedGroups[dateLabel] ??
                    dateLabel !== "Today";

                  return (
                    <div key={dateLabel}>
                      {/* Date Group */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(dateLabel)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-hover border-b border-border text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Icons.ChevronRight
                            className={`w-4 h-4 text-text-secondary transition-transform ${
                              !isCollapsed ? "rotate-90" : ""
                            }`}
                          />

                          <span className="text-xs font-semibold text-text-primary">
                            {dateLabel}
                          </span>

                          <span className="text-xs text-text-secondary">
                            {emails.length}
                          </span>
                        </div>
                      </button>

                      {/* Emails */}
                      {!isCollapsed &&
                        emails.map((email) => (
                          <div
                            key={email.id}
                            className={`border-b border-border hover:bg-surface-hover cursor-pointer p-4 ${
                              selectedEmail?.id === email.id
                                ? "bg-surface-hover"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedEmail(email);
                              setIsMobileDrawerOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-sm font-medium text-text-primary truncate flex-1">
                                {email.subject}
                              </p>

                              <span className="text-xs text-text-secondary ml-2 flex-shrink-0">
                                {new Date(
                                  email.receivedAt
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <p className="text-xs text-text-secondary truncate">
                              {email.fromName ||
                                email.fromAddress}
                            </p>

                            <p className="text-xs text-text-secondary truncate mt-1">
                              {getEmailPreview(email)}...
                            </p>
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </div>
  </div>
);
}
