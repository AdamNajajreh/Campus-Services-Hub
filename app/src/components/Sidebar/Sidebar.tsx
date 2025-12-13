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
      {/* User info with logout at top */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 px-2 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
              <FiUser className="text-stone-600" />
            </div>
            <p className="text-sm font-medium text-stone-950 truncate">{userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded hover:bg-red-50 text-red-600 transition flex-shrink-0"
            title="Logout"
          >
            <FiLogOut className="text-lg" />
          </button>
        </div>
        {/* Divider line */}
        <div className="border-b border-stone-200"></div>
      </div>

      {/* Navigation routes */}
      <div className="flex-1 overflow-y-auto">
        <RouteSelect />
      </div>
    </div>
  );
};

