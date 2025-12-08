import { Sidebar } from "@/components/Sidebar/Sidebar";

export const metadata = {
  title: "Dashboard",
  description: "Dashboard overview",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="grid gap-4 p-4" style={{ gridTemplateColumns: "220px 1fr" }}>
      <Sidebar />
      {children}
    </main>
  );
}

