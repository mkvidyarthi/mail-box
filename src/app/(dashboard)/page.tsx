"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Username input form for YOPmail-style access
function UsernameInputForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || username.trim() === "") {
      setError("Please enter a username");
      return;
    }

    // Redirect to the inbox for this username
    // Use encodeURIComponent to handle special characters like @
    router.push(`/inbox/${encodeURIComponent(username.trim())}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background">
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Disposable Mailbox</h1>
          <p className="text-text-secondary">Enter your username to access your inbox</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-primary mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g., user1@scems.in)"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-accent text-white py-2 px-4 rounded-md hover:bg-accent/90 transition-colors"
          >
            Open Inbox
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  // Show username input form for YOPmail-style access
  // The actual mailbox content will be shown at /inbox/[username]
  return <UsernameInputForm />;
}
