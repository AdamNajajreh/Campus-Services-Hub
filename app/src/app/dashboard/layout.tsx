"use client";

import { Sidebar } from "@/components/Sidebar/Sidebar";
import { AuthGuard } from "@/components/Common/AuthGuard";
import { Footer } from "@/components/Common/Footer";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <main className="grid gap-4 p-4 min-h-screen" style={{ gridTemplateColumns: "220px 1fr" }}>
        <div className="h-[calc(100vh-2rem)]">
          <Sidebar />
        </div>
        {children}
      </main>
      <Footer />
    </AuthGuard>
  );
}
