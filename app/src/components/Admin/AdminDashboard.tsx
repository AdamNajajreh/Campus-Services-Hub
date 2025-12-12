import React from "react";
import { TopBar } from "../Common/TopBar";

/**
 * @component
 * @description AdminDashboard component
 * @returns The Admin Dashboard page layout with top bar and content
 */
export const AdminDashboard = () => {
  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />
      {/* Admin dashboard content will be later */}
    </div>
  );
};
