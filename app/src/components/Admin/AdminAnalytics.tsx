"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { getRequestStats, getAllRequests, getAllUsers, getBookings } from "@/core";
import { getNotificationStats } from "@/core";
import { FiBarChart2, FiTool, FiCalendar, FiBell, FiUsers, FiTrendingUp, FiClock } from "react-icons/fi";

/**
 * @component
 * @description AdminAnalytics component for viewing system statistics
 * @returns The Admin Analytics page layout with top bar and content
 */
export const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [requestStats, setRequestStats] = useState<any>(null);
  const [notificationStats, setNotificationStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [bookingStats, setBookingStats] = useState<any>(null);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Get current user role
      const userStr = localStorage.getItem("user");
      let userRole = "staff";
      if (userStr) {
        const userData = JSON.parse(userStr);
        setCurrentUser(userData);
        userRole = userData.role;
      }

      // Fetch request statistics
      try {
        const requestStatsResponse = await getRequestStats(token);
        if (requestStatsResponse.data) {
          setRequestStats(requestStatsResponse.data);
        }
      } catch (error) {
        console.error("Failed to fetch request stats:", error);
      }

      // Fetch notification statistics
      try {
        const notificationStatsResponse = await getNotificationStats(token);
        if (notificationStatsResponse.data) {
          setNotificationStats(notificationStatsResponse.data);
        }
      } catch (error) {
        console.error("Failed to fetch notification stats:", error);
      }

      // Fetch user statistics (admin only)
      if (userRole === "admin") {
        try {
          const usersResponse = await getAllUsers(token);
          if (usersResponse.data?.users) {
            const users = usersResponse.data.users;
            setUserStats({
              total: users.length,
              students: users.filter((u: any) => u.role === "student").length,
              staff: users.filter((u: any) => u.role === "staff").length,
              admins: users.filter((u: any) => u.role === "admin").length,
            });
          }
        } catch (error) {
          console.error("Failed to fetch user stats:", error);
        }
      }

      // Fetch booking statistics
      try {
        const bookingsResponse = await getBookings(token);
        if (bookingsResponse.data && Array.isArray(bookingsResponse.data)) {
          const bookings = bookingsResponse.data;
          setBookingStats({
            total: bookings.length,
            confirmed: bookings.filter((b: any) => b.status === "confirmed").length,
            pending: bookings.filter((b: any) => b.status === "pending").length,
            cancelled: bookings.filter((b: any) => b.status === "cancelled").length,
            completed: bookings.filter((b: any) => b.status === "completed").length,
          });
        }
      } catch (error) {
        console.error("Failed to fetch booking stats:", error);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString();
  };

  const formatHours = (hours: number | undefined) => {
    if (hours === undefined || hours === null) return "N/A";
    return `${hours.toFixed(1)} hours`;
  };

  const formatMinutes = (minutes: number | undefined) => {
    if (minutes === undefined || minutes === null) return "N/A";
    return `${Math.round(minutes)} min`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg pb-4 shadow">
        <TopBar />
        <div className="p-6 text-center">
          <p className="text-stone-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-stone-950">Analytics Dashboard</h1>
          <p className="text-stone-600 mt-1">
            {isAdmin ? "System-wide statistics and insights" : "Service statistics and insights"}
          </p>
        </div>

        {/* Request Statistics */}
        {requestStats && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FiTool className="text-purple-600 text-xl" />
              <h2 className="text-2xl font-bold text-stone-950">Service Requests</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <p className="text-sm text-stone-600 mb-1">Total Requests</p>
                <p className="text-2xl font-bold text-stone-950">
                  {formatNumber(requestStats.overall?.total_requests)}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{formatNumber(requestStats.overall?.pending)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">In Progress</p>
                <p className="text-2xl font-bold text-blue-700">{formatNumber(requestStats.overall?.in_progress)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-green-700">{formatNumber(requestStats.overall?.completed)}</p>
              </div>
            </div>

            {/* Requests by Category */}
            {requestStats.by_category && requestStats.by_category.length > 0 && (
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <h3 className="font-semibold text-stone-950 mb-3">Requests by Category</h3>
                <div className="space-y-2">
                  {requestStats.by_category.map((cat: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 capitalize">{cat.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-stone-950">{cat.count}</span>
                        {cat.avg_hours_to_complete && (
                          <span className="text-xs text-stone-500">Avg: {formatHours(cat.avg_hours_to_complete)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requests by Priority */}
            {requestStats.by_priority && requestStats.by_priority.length > 0 && (
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <h3 className="font-semibold text-stone-950 mb-3">Requests by Priority</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {requestStats.by_priority.map((pri: any, index: number) => (
                    <div key={index} className="text-center">
                      <p className="text-xs text-stone-600 capitalize mb-1">{pri.priority}</p>
                      <p className="text-lg font-bold text-stone-950">{pri.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Booking Statistics */}
        {bookingStats && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-purple-600 text-xl" />
              <h2 className="text-2xl font-bold text-stone-950">Room Bookings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <p className="text-sm text-stone-600 mb-1">Total Bookings</p>
                <p className="text-2xl font-bold text-stone-950">{formatNumber(bookingStats.total)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 mb-1">Confirmed</p>
                <p className="text-2xl font-bold text-green-700">{formatNumber(bookingStats.confirmed)}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{formatNumber(bookingStats.pending)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-red-700">{formatNumber(bookingStats.cancelled)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-blue-700">{formatNumber(bookingStats.completed)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notification Statistics */}
        {notificationStats && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FiBell className="text-purple-600 text-xl" />
              <h2 className="text-2xl font-bold text-stone-950">Notifications</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <p className="text-sm text-stone-600 mb-1">Total Notifications</p>
                <p className="text-2xl font-bold text-stone-950">
                  {formatNumber(notificationStats.notifications?.total_notifications)}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 mb-1">Read</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatNumber(notificationStats.notifications?.read_count)}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 mb-1">Unread</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatNumber(notificationStats.notifications?.unread_count)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Avg Read Time</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatMinutes(notificationStats.notifications?.avg_minutes_to_read)}
                </p>
              </div>
            </div>

            {/* Notifications by Type */}
            {notificationStats.by_type && notificationStats.by_type.length > 0 && (
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <h3 className="font-semibold text-stone-950 mb-3">Notifications by Type</h3>
                <div className="space-y-2">
                  {notificationStats.by_type.map((type: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 capitalize">{type.type.replace("_", " ")}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-stone-950">{type.count}</span>
                        <span className="text-xs text-stone-500">
                          Read: {type.read_count || 0} | Unread: {type.unread_count || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Announcements */}
            {notificationStats.announcements && notificationStats.announcements.length > 0 && (
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <h3 className="font-semibold text-stone-950 mb-3">Announcements by Audience</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {notificationStats.announcements.map((ann: any, index: number) => (
                    <div key={index} className="text-center">
                      <p className="text-xs text-stone-600 capitalize mb-1">{ann.target_audience}</p>
                      <p className="text-lg font-bold text-stone-950">{ann.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Statistics (Admin Only) */}
        {isAdmin && userStats && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FiUsers className="text-purple-600 text-xl" />
              <h2 className="text-2xl font-bold text-stone-950">User Statistics</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <p className="text-sm text-stone-600 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-stone-950">{formatNumber(userStats.total)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Students</p>
                <p className="text-2xl font-bold text-blue-700">{formatNumber(userStats.students)}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 mb-1">Staff</p>
                <p className="text-2xl font-bold text-purple-700">{formatNumber(userStats.staff)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 mb-1">Admins</p>
                <p className="text-2xl font-bold text-red-700">{formatNumber(userStats.admins)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
