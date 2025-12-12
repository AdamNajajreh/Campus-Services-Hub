import React from "react";
import { TopBar } from "../Common/TopBar";

/**
 * @component
 * @description Bookings component
 * @returns The Bookings page layout with top bar and content
 */
export const Bookings = () => {
  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />
      {/* content will be later */}
    </div>
  );
};

