"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackBanner } from "@/components/ui/FeedbackBanner";
import { FormField } from "@/components/ui/FormField";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("info@scems.in");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // On successful login, redirect to mailboxes page
      router.push("/mailboxes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      <div className="text-center">
        <h2 className="text-[20px] font-semibold text-text-primary tracking-tight">
          Admin Login
        </h2>
        <p className="text-[13px] text-text-secondary mt-1">
          Login to manage mailboxes
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <FeedbackBanner type="error" message={error} />}

        <FormField
          id="email"
          name="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <FormField
          id="password"
          name="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />

        <Button
          type="submit"
          className="w-full mt-2 h-9 rounded-md font-semibold text-[13px]"
          disabled={loading}
        >
          {loading ? "Loading..." : "Login"}
        </Button>

        <div className="text-center mt-2">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-[12px] text-text-secondary hover:text-text-primary transition-colors"
          >
            Go Back to Disposable Mailbox
          </button>
        </div>
      </form>
    </div>
  );
}
