"use client";

import { RouteSelect } from "./RouteSelect";
import { useRouter } from "next/navigation";
import { FiLogOut } from "react-icons/fi";

export const Sidebar = () => {
  const router = useRouter();

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Redirect to login page
    router.push("/login");
  };

  return (
    <div>
      <div className="overflow-y-scroll sticky top-4 h-[calc(100vh-32px-48px)]">
        <RouteSelect />
      </div>
      <div className="sticky top-[calc(100vh-48px-16px)]">
        <button
          onClick={handleLogout}
          className="flex items-center justify-start gap-2 w-full rounded px-2 py-1.5 text-sm transition-[box-shadow,background-color,color] hover:bg-red-100 bg-transparent text-red-600 shadow-none"
        >
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

