"use client";

import { RouteSelect } from "./RouteSelect";
import { useRouter } from "next/navigation";
import { FiLogOut, FiUser } from "react-icons/fi";
import { useEffect, useState } from "react";

export const Sidebar = () => {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    // Get user data from localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || user.email || "User");
      } catch (e) {
        setUserName("User");
      }
    }
  }, []);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Redirect to login page
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* User info at top */}
      <div className="mb-4">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center">
            <FiUser className="text-stone-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-950 truncate">{userName}</p>
          </div>
        </div>
        {/* Divider line */}
        <div className="border-b border-stone-200"></div>
      </div>

      {/* Navigation routes */}
      <div className="flex-1 overflow-y-auto">
        <RouteSelect />
      </div>

      {/* Logout button at bottom */}
      <div className="mt-4 pt-4 border-t border-stone-200">
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

