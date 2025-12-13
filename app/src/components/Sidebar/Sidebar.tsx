"use client";

import { RouteSelect } from "./RouteSelect";
import { useRouter } from "next/navigation";
import { FiLogOut, FiUser } from "react-icons/fi";
import { useEffect, useState } from "react";

export const Sidebar = () => {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("student");

  useEffect(() => {
    // Get user data from localStorage
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || user.email || "User");
        setUserRole(user.role || "student");
      } catch (e) {
        setUserName("User");
        setUserRole("student");
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

  // Determine colors based on role
  const isAdmin = userRole === "admin" || userRole === "staff";
  const bgColor = isAdmin ? "bg-purple-100" : "bg-stone-200";
  const textColor = isAdmin ? "text-purple-600" : "text-stone-600";
  const dividerColor = isAdmin ? "border-purple-200" : "border-stone-200";

  return (
    <div className="flex flex-col h-full">
      {/* User info with logout at top */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 px-2 py-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
              <FiUser className={textColor} />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium text-stone-950 truncate">{userName}</p>
              <p className={`text-xs ${isAdmin ? "text-purple-600" : "text-stone-500"} font-medium uppercase`}>
                {userRole}
              </p>
            </div>
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
        <div className={`border-b ${dividerColor}`}></div>
      </div>

      {/* Navigation routes */}
      <div className="flex-1 overflow-y-auto">
        <RouteSelect />
      </div>
    </div>
  );
};

