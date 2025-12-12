import React from "react";

/**
 * @component
 * @description Subtle footer component
 * @returns Footer with copyright and minimal styling
 */
export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto pt-6 pb-4 border-t border-gray-200">
      <div className="px-4 text-center">
        <p className="text-xs text-gray-500">
          © {currentYear} Campus Services Hub. Topics in Computer Science Final Project.
        </p>
      </div>
    </footer>
  );
};
