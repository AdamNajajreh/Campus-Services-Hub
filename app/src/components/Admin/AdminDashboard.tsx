"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { getAllUsers, getAllRequests, getBookings, createAnnouncement } from "@/core";
import { FiUsers, FiTool, FiCalendar, FiAlertCircle, FiCheckCircle, FiClock } from "react-icons/fi";
import { useRouter } from "next/navigation";

/**
 * @component
 * @description AdminDashboard component
 * @returns The Admin Dashboard page layout with statistics and quick actions
 */
export const AdminDashboard = () => {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRequests: 0,
    totalBookings: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    completedRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementData, setAnnouncementData] = useState({
    title: "",
    content: "",
    target_audience: "all",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Fetch users
      const usersResponse = await getAllUsers(token);
      const totalUsers = usersResponse.data?.users?.length || 0;

      // Fetch all requests (admin can see all)
      const requestsResponse = await getAllRequests(token);
      const requests = requestsResponse.data?.requests || [];
      const totalRequests = requests.length;
      const pendingRequests = requests.filter((r: any) => r.status === "pending").length;
      const inProgressRequests = requests.filter((r: any) => r.status === "in_progress").length;
      const completedRequests = requests.filter((r: any) => r.status === "completed").length;

      // Fetch bookings (use regular endpoint - admin sees all bookings)
      const bookingsResponse = await getBookings(token);
      const totalBookings = Array.isArray(bookingsResponse.data) ? bookingsResponse.data.length : 0;

      setStats({
        totalUsers,
        totalRequests,
        totalBookings,
        pendingRequests,
        inProgressRequests,
        completedRequests,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await createAnnouncement(token, announcementData);
      if (response.success) {
        setMessage({ type: "success", text: "Announcement created successfully!" });
        setAnnouncementData({ title: "", content: "", target_audience: "all" });
        setShowAnnouncementModal(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create announcement",
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg pb-4 shadow">
        <TopBar />
        <div className="p-6 text-center">
          <p className="text-stone-600">Loading dashboard...</p>
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

        {/* Welcome */}
        <div>
          <h2 className="text-3xl font-bold text-stone-950">Admin Dashboard</h2>
          <p className="text-stone-600 mt-1">Overview of campus services</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Users */}
          <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 uppercase">Total Users</p>
                <p className="text-4xl font-bold text-purple-900 mt-2">{stats.totalUsers}</p>
              </div>
              <div className="w-14 h-14 bg-purple-200 rounded-full flex items-center justify-center">
                <FiUsers className="text-3xl text-purple-600" />
              </div>
            </div>
          </div>

          {/* Total Service Requests */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 uppercase">Service Requests</p>
                <p className="text-4xl font-bold text-blue-900 mt-2">{stats.totalRequests}</p>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-yellow-600 flex items-center gap-1">
                    <FiClock /> {stats.pendingRequests} Pending
                  </span>
                  <span className="text-blue-600 flex items-center gap-1">
                    <FiAlertCircle /> {stats.inProgressRequests} Active
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-blue-200 rounded-full flex items-center justify-center">
                <FiTool className="text-3xl text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Bookings */}
          <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 uppercase">Total Bookings</p>
                <p className="text-4xl font-bold text-green-900 mt-2">{stats.totalBookings}</p>
              </div>
              <div className="w-14 h-14 bg-green-200 rounded-full flex items-center justify-center">
                <FiCalendar className="text-3xl text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-bold text-stone-950 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* View All Requests */}
            <button
              onClick={() => router.push("/admin/requests")}
              className="p-4 border-2 border-purple-300 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center group-hover:bg-purple-300 transition">
                  <FiTool className="text-2xl text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-950">View All Requests</h4>
                  <p className="text-sm text-stone-600">Manage and assign service requests</p>
                </div>
              </div>
            </button>

            {/* Create Announcement */}
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="p-4 border-2 border-purple-300 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center group-hover:bg-purple-300 transition">
                  <FiCheckCircle className="text-2xl text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-950">Create Announcement</h4>
                  <p className="text-sm text-stone-600">Post announcements to users</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Create Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-stone-950 mb-4">Create Announcement</h3>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Title</label>
                <input
                  type="text"
                  value={announcementData.title}
                  onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                  placeholder="Announcement title"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Content</label>
                <textarea
                  value={announcementData.content}
                  onChange={(e) => setAnnouncementData({ ...announcementData, content: e.target.value })}
                  placeholder="Announcement content"
                  rows={6}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Target Audience</label>
                <select
                  value={announcementData.target_audience}
                  onChange={(e) => setAnnouncementData({ ...announcementData, target_audience: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                >
                  <option value="all">All Users</option>
                  <option value="students">Students Only</option>
                  <option value="staff">Staff Only</option>
                  <option value="admin">Admin Only</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
                >
                  Create Announcement
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    setAnnouncementData({ title: "", content: "", target_audience: "all" });
                  }}
                  className="flex-1 px-6 py-2 bg-stone-200 text-stone-700 rounded-md hover:bg-stone-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
