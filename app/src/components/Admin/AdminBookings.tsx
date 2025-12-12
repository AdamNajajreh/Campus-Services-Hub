import React from "react";
import { TopBar } from "../Common/TopBar";

/**
 * @component
 * @description AdminBookings component
 * @returns The Admin Bookings page layout with top bar and content
 */
export const AdminBookings = () => {
  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />
      {/* Admin bookings management content will be later */}
    </div>
  );
};
