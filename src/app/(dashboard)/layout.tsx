import type React from "react";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/mailbox/Navbar";
import { Sidebar } from "@/components/mailbox/Sidebar";

export async function generateMetadata() {
  const t = await getTranslations("Metadata.inbox");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove session-based authentication for YOPmail-style public access
  // The dashboard is now accessible without login for disposable mailbox functionality
  // Admin features can still be protected via separate routes if needed

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        <Suspense
          fallback={
            <div className="h-14 border-b border-border bg-background shrink-0" />
          }
        >
          <Navbar />
        </Suspense>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </main>
  );
}
