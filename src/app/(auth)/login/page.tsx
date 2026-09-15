"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { FormField } from "@/components/ui/FormField";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;

    if (!username || username.trim() === "") {
      setError("Please enter a username");
      setLoading(false);
      return;
    }

    // Redirect to the inbox for this username
    // The inbox page will handle creating/accessing the mailbox
    router.push(`/inbox/${username.trim()}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      <div className="text-center">
        <h2 className="text-[20px] font-semibold text-text-primary tracking-tight">
          Disposable Mailbox
        </h2>
        <p className="text-[13px] text-text-secondary mt-1">Enter your username to access your inbox</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <FeedbackBanner type="error" message={error} />}

        <FormField
          id="username"
          name="username"
          type="text"
          label="Username"
          placeholder="Enter username (e.g., user1)"
          required
        />

        <Button
          type="submit"
          className="w-full mt-2 h-9 rounded-md font-semibold text-[13px]"
          disabled={loading}
        >
          {loading ? "Loading..." : "Open Inbox"}
        </Button>
      </form>
    </div>
  );
}
