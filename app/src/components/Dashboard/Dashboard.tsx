"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { FiCalendar, FiTool, FiBell } from "react-icons/fi";
import { getBookings, getRequests, getUnreadCount } from "@/core/api";

/**
 * @component
 * @description Dashboard component
 * @returns The Dashboard page layout with top bar and content
 */
export const Dashboard = () => {
  const [userName, setUserName] = useState<string>("");
  const [bookingsCount, setBookingsCount] = useState<number>(0);
  const [requestsCount, setRequestsCount] = useState<number>(0);
  const [notificationsCount, setNotificationsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      const userStr = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserName(user.name || "Student");

          if (token) {
            try {
              const bookingsResponse = await getBookings(token);
              if (bookingsResponse.data && Array.isArray(bookingsResponse.data)) {
                setBookingsCount(bookingsResponse.data.length);
              }
            } catch (error) {
              console.error("Failed to fetch bookings:", error);
            }

            try {
              const requestsResponse = await getRequests(token);
              if (requestsResponse.data?.requests && Array.isArray(requestsResponse.data.requests)) {
                setRequestsCount(requestsResponse.data.requests.length);
              }
            } catch (error) {
              console.error("Failed to fetch requests:", error);
            }

            // Fetch unread notifications count
            try {
              const notificationsResponse = await getUnreadCount(token, user.id);
              if (notificationsResponse.data?.unread_count !== undefined) {
                setNotificationsCount(notificationsResponse.data.unread_count);
              }
            } catch (error) {
              console.error("Failed to fetch notifications:", error);
            }
          }
        } catch (e) {
          setUserName("Student");
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />

      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-stone-950">Welcome back, {userName}!</h1>
          <p className="text-stone-600 mt-2">Here&apos;s what&apos;s happening with your campus services</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded">
                <FiCalendar className="text-blue-600 text-xl" />
              </div>
              <h3 className="text-sm font-medium text-stone-600">My Bookings</h3>
            </div>
            <p className="text-3xl font-bold text-stone-950">{loading ? "..." : bookingsCount}</p>
            <p className="text-xs text-stone-500 mt-1">Active bookings</p>
          </div>

          <div className="p-6 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded">
                <FiTool className="text-green-600 text-xl" />
              </div>
              <h3 className="text-sm font-medium text-stone-600">Service Requests</h3>
            </div>
            <p className="text-3xl font-bold text-stone-950">{loading ? "..." : requestsCount}</p>
            <p className="text-xs text-stone-500 mt-1">Open requests</p>
          </div>

          <div className="p-6 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded">
                <FiBell className="text-orange-600 text-xl" />
              </div>
              <h3 className="text-sm font-medium text-stone-600">Notifications</h3>
            </div>
            <p className="text-3xl font-bold text-stone-950">{loading ? "..." : notificationsCount}</p>
            <p className="text-xs text-stone-500 mt-1">Unread messages</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-stone-950 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard/bookings"
              className="p-4 border-2 border-stone-200 rounded-lg hover:border-stone-400 hover:shadow-md transition"
            >
              <h3 className="font-semibold text-stone-950 mb-1">Book a Room</h3>
              <p className="text-sm text-stone-600">Reserve a classroom or lab space</p>
            </a>

            <a
              href="/dashboard/requests"
              className="p-4 border-2 border-stone-200 rounded-lg hover:border-stone-400 hover:shadow-md transition"
            >
              <h3 className="font-semibold text-stone-950 mb-1">Submit Request</h3>
              <p className="text-sm text-stone-600">Report maintenance or IT issues</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
