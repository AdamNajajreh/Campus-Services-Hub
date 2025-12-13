"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconType } from "react-icons";
import { FiHome, FiTool, FiCalendar, FiBell, FiUser, FiBarChart2, FiUsers } from "react-icons/fi";
import { useEffect, useState } from "react";

// Student routes
const studentRoutes = [
  { title: "Dashboard", href: "/dashboard", icon: FiHome },
  { title: "Service Requests", href: "/dashboard/requests", icon: FiTool },
  { title: "Room Bookings", href: "/dashboard/bookings", icon: FiCalendar },
  { title: "Notifications", href: "/dashboard/notifications", icon: FiBell },
  { title: "Profile", href: "/dashboard/profile", icon: FiUser },
];

// Admin/Staff routes
const adminRoutes = [
  { title: "Dashboard", href: "/admin", icon: FiHome },
  { title: "Manage Requests", href: "/admin/requests", icon: FiTool },
  { title: "Manage Bookings", href: "/admin/bookings", icon: FiCalendar },
  { title: "Notifications", href: "/admin/notifications", icon: FiBell },
  { title: "User Management", href: "/admin/users", icon: FiUsers },
  { title: "Analytics", href: "/admin/analytics", icon: FiBarChart2 },
];

export const RouteSelect = () => {
  const pathname = usePathname();
  const [routes, setRoutes] = useState(studentRoutes);
  const [userRole, setUserRole] = useState<string>("student");

  useEffect(() => {
    // Check user role and set appropriate routes
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || "student");
        if (user.role === "admin" || user.role === "staff") {
          setRoutes(adminRoutes);
        } else {
          setRoutes(studentRoutes);
        }
      } catch (e) {
        setRoutes(studentRoutes);
        setUserRole("student");
      }
    }
  }, []);

  const isAdmin = userRole === "admin" || userRole === "staff";

  return (
    <div className="space-y-1">
      {routes.map(({ title, href, icon: Icon }) => (
        <Link key={href} href={href}>
          <Route Icon={Icon} title={title} selected={pathname === href} isAdmin={isAdmin} />
        </Link>
      ))}
    </div>
  );
};

const Route = ({ selected, Icon, title, isAdmin }: { selected: boolean; Icon: IconType; title: string; isAdmin: boolean }) => {
  // Student colors (stone/gray)
  const studentColors = selected
    ? "bg-white text-stone-950 shadow"
    : "hover:bg-stone-200 bg-transparent text-stone-500 shadow-none";
  
  // Admin colors (purple)
  const adminColors = selected
    ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
    : "hover:bg-purple-100 bg-transparent text-purple-600 shadow-none";

  return (
    <div
      className={`flex items-center justify-start gap-2 w-full rounded px-2 py-1.5 text-sm transition-[box-shadow,background-color,color] ${
        isAdmin ? adminColors : studentColors
      }`}
    >
      <Icon />
      <span>{title}</span>
    </div>
  );
};
