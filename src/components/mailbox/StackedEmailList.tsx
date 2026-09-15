import type React from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import type { EmailWithState } from "@/types";

interface StackedEmailListProps {
  emails: EmailWithState[];
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailWithState) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function StackedEmailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  onRefresh,
  loading = false,
}: StackedEmailListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        <Icons.Spinner className="w-6 h-6 animate-spin mr-2" />
        <span>Loading emails...</span>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
        <Icons.Mail className="w-12 h-12 mb-4 text-text-muted" />
        <p className="text-sm">No emails in this inbox</p>
        <p className="text-xs mt-2">Send an email to this address to see it here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-hover/50">
        <span className="text-sm font-semibold text-text-secondary">
          {emails.length} {emails.length === 1 ? "email" : "emails"}
        </span>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRefresh}
            title="Refresh"
          >
            <Icons.Refresh className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Email List */}
      <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
        {emails.map((email) => (
          <div
            key={email.id}
            className={`px-4 py-3 cursor-pointer transition-colors hover:bg-surface-hover/30 ${
              selectedEmailId === email.id ? "bg-surface-hover/50" : ""
            } ${!email.isRead ? "bg-surface/30" : ""}`}
            onClick={() => onSelectEmail(email)}
          >
            <div className="flex items-start gap-3">
              {/* Read Status Indicator */}
              <div className="flex-shrink-0 mt-1">
                {!email.isRead && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>

              {/* Email Content */}
              <div className="flex-1 min-w-0">
                {/* From & Date */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {email.fromName || email.fromAddress}
                  </p>
                  <span className="text-xs text-text-secondary flex-shrink-0 ml-2">
                    {new Date(email.receivedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Subject */}
                <p className="text-sm text-text-primary font-medium mb-1 truncate">
                  {email.subject}
                </p>

                {/* Preview */}
                <p className="text-xs text-text-secondary truncate">
                  {email.bodyText.substring(0, 80)}...
                </p>

                {/* Attachments Indicator */}
                {email.attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Icons.Attachment className="w-3 h-3 text-text-muted" />
                    <span className="text-xs text-text-secondary">
                      {email.attachments.length}{" "}
                      {email.attachments.length === 1 ? "attachment" : "attachments"}
                    </span>
                  </div>
                )}
              </div>

              {/* Star Indicator */}
              {email.isSaved && (
                <Icons.Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
