"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    
    if (!token) {
      // No token found, redirect to login
      router.push("/login");
    }
  }, [router]);

  // Check token on client side
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Don't render children if not authenticated
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center">
          <p className="text-stone-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

