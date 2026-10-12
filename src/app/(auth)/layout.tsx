import type React from "react";
import { getTranslations } from "next-intl/server";
import { Icons } from "@/components/icons";

export async function generateMetadata() {
  const t = await getTranslations("Metadata.auth");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove session check for YOPmail-style public access
  // Users can now access their inbox with just a username

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-[340px] md:max-w-[360px] flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <div className="text-text-primary mb-3">
            <Icons.SponsorcloudLogo className="w-50 h-50" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
