/**
 * Notification Service API
 */

import { fetchWithAuth } from "./client";

/**
 * Get user notifications
 */
export async function getUserNotifications(token: string, userId: number) {
  return fetchWithAuth(`/api/notifications/user/${userId}`, token);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(token: string, userId: number) {
  return fetchWithAuth(`/api/notifications/unread/count/${userId}`, token);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(token: string, notificationId: number) {
  return fetchWithAuth(`/api/notifications/${notificationId}/read`, token, {
    method: "PUT",
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(token: string) {
  return fetchWithAuth("/api/notifications/mark-all-read", token, {
    method: "PUT",
  });
}

/**
 * Get announcements
 */
export async function getAnnouncements(token: string) {
  return fetchWithAuth("/api/announcements", token);
}

/**
 * Get recent announcements
 */
export async function getRecentAnnouncements(token: string) {
  return fetchWithAuth("/api/announcements/recent", token);
}

/**
 * Create announcement (Admin/Staff only)
 */
export async function createAnnouncement(
  token: string,
  data: {
    title: string;
    content: string;
    target_audience?: string;
  }
) {
  return fetchWithAuth("/api/announcements", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Get notification statistics (Staff/Admin only)
 */
export async function getNotificationStats(token: string) {
  return fetchWithAuth("/api/notifications/stats", token);
}
