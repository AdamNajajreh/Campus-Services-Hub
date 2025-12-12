import React from "react";
import { TopBar } from "../Common/TopBar";

/**
 * @component
 * @description Profile component
 * @returns The Profile page layout with top bar and content
 */
export const Profile = () => {
  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />
      {/* content will be later */}
    </div>
  );
};

