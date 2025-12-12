import React from "react";

/**
 * @component
 * @description Topbar component that quick info about time and day, displayed in almost every page
 * @returns Topbar with quick info
 */
export const TopBar = () => {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour12: true,
  });

  return (
    <div className="border-b px-4 mb-4 mt-2 pb-4 border-stone-200">
      <div className="flex items-center justify-between p-0.5">
        <div>
          <span className="text-sm font-bold block">Hello!</span>
          <span className="text-xs block text-stone-500">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
};
