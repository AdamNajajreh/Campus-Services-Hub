"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getRecentAnnouncements,
} from "@/core";
import { FiBell, FiCheckCircle, FiAlertCircle, FiInfo } from "react-icons/fi";

interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  target_audience: string;
  created_at: string;
}

/**
 * @component
 * @description Simple Notifications component for students
 * @returns The Notifications page layout with notifications and announcements
 */
export const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) return;

    try {
      const user = JSON.parse(userStr);

      // Fetch notifications
      const notifResponse = await getUserNotifications(token, user.id);
      if (notifResponse.data && notifResponse.data.notifications && Array.isArray(notifResponse.data.notifications)) {
        setNotifications(notifResponse.data.notifications);
      }

      // Fetch all announcements
      const announceResponse = await getAnnouncements(token);
      if (announceResponse.data && Array.isArray(announceResponse.data)) {
        // Sort by created_at descending and take latest 10
        const sortedAnnouncements = announceResponse.data
          .sort((a: Announcement, b: Announcement) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 10);
        setAnnouncements(sortedAnnouncements);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await markNotificationAsRead(token, notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => (notif.id === notificationId ? { ...notif, is_read: true } : notif))
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await markAllNotificationsAsRead(token);
      setMessage({ type: "success", text: "All notifications marked as read!" });
      // Update local state
      setNotifications((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
    } catch (error) {
      setMessage({ type: "error", text: "Failed to mark all as read" });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-stone-600";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg pb-4 shadow">
        <TopBar />
        <div className="p-6 text-center">
          <p className="text-stone-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />

      <div className="p-6 space-y-6">
        {/* Message */}
        {message.text && (
          <div
            className={`px-4 py-3 rounded ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Announcements Section */}
        <div>
          <h2 className="text-2xl font-bold text-stone-950 mb-4">Announcements</h2>
          {announcements.length === 0 ? (
            <p className="text-stone-600">No recent announcements.</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded">
                  <div className="flex items-start gap-3">
                    <FiInfo className="text-blue-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-950">{announcement.title}</h3>
                      <p className="text-sm text-stone-700 mt-1">{announcement.content}</p>
                      <p className="text-xs text-stone-500 mt-2">{formatDate(announcement.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-stone-200"></div>

        {/* Notifications Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-stone-950">
              Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 text-sm bg-stone-100 text-stone-700 rounded-md hover:bg-stone-200 transition"
              >
                Mark All as Read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-stone-600">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 rounded-lg transition ${
                    notification.is_read
                      ? "bg-white border-stone-200 border-l-stone-200"
                      : "bg-blue-50 border-blue-500 border-l-blue-500 border border-blue-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator dot */}
                    {!notification.is_read && (
                      <div className="mt-1.5 flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                    <div className={`mt-1 flex-shrink-0 ${getPriorityColor(notification.priority)}`}>
                      {notification.priority === "high" ? <FiAlertCircle /> : <FiBell />}
                    </div>
                    <div className="flex-1">
                      <p className={`${notification.is_read ? "text-stone-700" : "text-stone-900 font-medium"}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-stone-500">{formatDate(notification.created_at)}</span>
                        <span className="text-xs text-stone-400">•</span>
                        <span className="text-xs text-stone-500 capitalize">{notification.type}</span>
                        {!notification.is_read && (
                          <>
                            <span className="text-xs text-stone-400">•</span>
                            <span className="text-xs text-blue-600 font-medium">New</span>
                          </>
                        )}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded transition flex-shrink-0"
                        title="Mark as read"
                      >
                        <FiCheckCircle />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
