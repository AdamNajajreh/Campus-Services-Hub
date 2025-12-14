"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { getBookings, cancelBooking, getAllUsers } from "@/core";
import { FiCalendar, FiClock, FiUser, FiX, FiTrash2, FiEye } from "react-icons/fi";

interface Booking {
  id: number;
  user_id: number;
  room_id: number;
  room_name: string;
  room_type: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * @component
 * @description AdminBookings component for managing all bookings
 * @returns The Admin Bookings page layout with top bar and content
 */
export const AdminBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<Map<number, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Fetch all bookings (admin/staff see all)
      const bookingsResponse = await getBookings(token);
      if (bookingsResponse.data && Array.isArray(bookingsResponse.data)) {
        setBookings(bookingsResponse.data);
      }

      // Fetch all users to map user_id to user info
      const usersResponse = await getAllUsers(token);
      if (usersResponse.data && usersResponse.data.users) {
        const userMap = new Map<number, User>();
        usersResponse.data.users.forEach((user: User) => {
          userMap.set(user.id, user);
        });
        setUsers(userMap);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setMessage({ type: "error", text: "Failed to load bookings" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await cancelBooking(token, bookingId);
      if (response.success) {
        setMessage({ type: "success", text: "Booking cancelled successfully!" });
        fetchData();
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to cancel booking",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      case "completed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case "lab":
        return "bg-purple-100 text-purple-700";
      case "meeting_room":
        return "bg-blue-100 text-blue-700";
      case "auditorium":
        return "bg-indigo-100 text-indigo-700";
      case "classroom":
        return "bg-green-100 text-green-700";
      default:
        return "bg-stone-100 text-stone-700";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg pb-4 shadow">
        <TopBar />
        <div className="p-6 text-center">
          <p className="text-stone-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-stone-950">Manage Bookings</h1>
          <p className="text-stone-600 mt-1">View and manage all room bookings</p>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
            <p className="text-sm text-stone-600 mb-1">Total Bookings</p>
            <p className="text-2xl font-bold text-stone-950">{bookings.length}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 mb-1">Confirmed</p>
            <p className="text-2xl font-bold text-green-700">
              {bookings.filter((b) => b.status === "confirmed").length}
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">
              {bookings.filter((b) => b.status === "pending").length}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-600 mb-1">Cancelled</p>
            <p className="text-2xl font-bold text-red-700">{bookings.filter((b) => b.status === "cancelled").length}</p>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-200">
                <th className="text-left p-3 text-sm font-semibold text-stone-700">User</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Room</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Date & Time</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Purpose</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Status</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Created</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const user = users.get(booking.user_id);
                  return (
                    <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FiUser className="text-stone-400" />
                          <div>
                            <p className="text-sm font-medium text-stone-950">
                              {user?.name || `User #${booking.user_id}`}
                            </p>
                            <p className="text-xs text-stone-500">{user?.email || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-stone-950">{booking.room_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded ${getRoomTypeColor(booking.room_type)}`}>
                            {booking.room_type.replace("_", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FiCalendar className="text-stone-400" />
                          <div>
                            <p className="text-stone-950">{formatDateOnly(booking.start_time)}</p>
                            <p className="text-stone-600 text-xs">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-stone-700">{booking.purpose || "N/A"}</p>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-xs text-stone-500">
                          <FiClock className="text-stone-400" />
                          {formatDate(booking.created_at)}
                        </div>
                        {booking.updated_at && booking.updated_at !== booking.created_at && (
                          <p className="text-xs text-stone-400 mt-1">Updated: {formatDate(booking.updated_at)}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(booking)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="View Details"
                          >
                            <FiEye />
                          </button>
                          {booking.status !== "cancelled" && (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                              title="Cancel Booking"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-stone-950">Booking Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedBooking(null);
                }}
                className="p-2 hover:bg-stone-100 rounded transition"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-stone-600 mb-1">User</p>
                  <p className="font-medium text-stone-950">
                    {users.get(selectedBooking.user_id)?.name || `User #${selectedBooking.user_id}`}
                  </p>
                  <p className="text-sm text-stone-500">{users.get(selectedBooking.user_id)?.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-600 mb-1">Status</p>
                  <span className={`text-sm px-3 py-1 rounded border ${getStatusColor(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-stone-600 mb-1">Room</p>
                  <p className="font-medium text-stone-950">{selectedBooking.room_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${getRoomTypeColor(selectedBooking.room_type)}`}>
                    {selectedBooking.room_type.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-stone-600 mb-1">Date</p>
                  <p className="font-medium text-stone-950">{formatDateOnly(selectedBooking.start_time)}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-600 mb-1">Start Time</p>
                  <p className="font-medium text-stone-950">{formatTime(selectedBooking.start_time)}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-600 mb-1">End Time</p>
                  <p className="font-medium text-stone-950">{formatTime(selectedBooking.end_time)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-stone-600 mb-1">Purpose</p>
                  <p className="text-stone-950">{selectedBooking.purpose || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-600 mb-1">Created</p>
                  <p className="text-stone-950">{formatDate(selectedBooking.created_at)}</p>
                </div>
                {selectedBooking.updated_at && (
                  <div>
                    <p className="text-sm text-stone-600 mb-1">Last Updated</p>
                    <p className="text-stone-950">{formatDate(selectedBooking.updated_at)}</p>
                  </div>
                )}
              </div>
              {selectedBooking.status !== "cancelled" && (
                <div className="pt-4 border-t border-stone-200">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleCancelBooking(selectedBooking.id);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Cancel Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
