import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("Metadata.login");
  return {
    title: "Admin Login",
    description: "Admin login for mailbox management",
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
