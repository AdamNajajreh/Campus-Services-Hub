"use client";

import { Sidebar } from "@/components/Sidebar/Sidebar";
import { AuthGuard } from "@/components/Common/AuthGuard";
import { Footer } from "@/components/Common/Footer";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  useEffect(() => {
    // Check if user is admin or staff
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role !== "admin" && user.role !== "staff") {
          // Not admin/staff, redirect to student dashboard
          router.push("/dashboard");
        }
      } catch (e) {
        router.push("/login");
      }
    }
  }, [router]);

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
