"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-stone-950">Campus Services Hub</h1>
        <p className="text-xl text-stone-600 mb-8">Your one-stop platform for campus management</p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-8 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition shadow-lg"
          >
            Sign In
          </a>
          <a
            href="/register"
            className="inline-block px-8 py-3 bg-white text-stone-950 border-2 border-stone-950 rounded-lg hover:bg-stone-50 transition shadow-lg"
          >
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
