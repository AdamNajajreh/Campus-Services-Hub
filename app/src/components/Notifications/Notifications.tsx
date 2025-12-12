import React from "react";
import { TopBar } from "../Common/TopBar";

/**
 * @component
 * @description Notifications component
 * @returns The Notifications page layout with top bar and content
 */
export const Notifications = () => {
  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />
      {/* content will be later */}
    </div>
  );
};

