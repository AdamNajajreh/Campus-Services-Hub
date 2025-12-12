"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { getRooms, getBookings, createBooking, cancelBooking } from "@/core";
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiX } from "react-icons/fi";

interface Room {
  id: number;
  name: string;
  type: string;
  capacity: number;
  location: string;
  equipment: string;
}

interface Booking {
  id: number;
  room_id: number;
  room_name: string;
  room_type: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: string;
  created_at: string;
}

/**
 * @component
 * @description Bookings component
 * @returns The Bookings page layout with top bar and content
 */
export const Bookings = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    endTime: "",
    purpose: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const roomsResponse = await getRooms(token);
      if (roomsResponse.data && Array.isArray(roomsResponse.data)) {
        setRooms(roomsResponse.data);
      }

      const bookingsResponse = await getBookings(token);
      if (bookingsResponse.data && Array.isArray(bookingsResponse.data)) {
        setBookings(bookingsResponse.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!selectedRoom) {
      setMessage({ type: "error", text: "Please select a room" });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Combine date and time
      const startDateTime = `${formData.date}T${formData.startTime}:00`;
      const endDateTime = `${formData.date}T${formData.endTime}:00`;

      const response = await createBooking(token, {
        room_id: selectedRoom,
        start_time: startDateTime,
        end_time: endDateTime,
        purpose: formData.purpose,
      });

      if (response.success) {
        setMessage({ type: "success", text: "Booking created successfully!" });
        setFormData({ date: "", startTime: "", endTime: "", purpose: "" });
        setSelectedRoom(null);
        fetchData(); // Refresh bookings list
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create booking",
      });
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await cancelBooking(token, bookingId);
      if (response.success) {
        setMessage({ type: "success", text: "Booking cancelled successfully!" });
        fetchData(); // Refresh bookings list
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to cancel booking",
      });
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

        {/* Create New Booking */}
        <div>
          <h2 className="text-2xl font-bold text-stone-950 mb-4">Book a Room</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Room Selection */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Select Room</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedRoom === room.id
                        ? "border-stone-950 bg-stone-50"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <h3 className="font-semibold text-stone-950">{room.name}</h3>
                    <div className="text-sm text-stone-600 mt-1 space-y-1">
                      <p className="flex items-center gap-1">
                        <FiMapPin className="text-xs" /> {room.location}
                      </p>
                      <p className="flex items-center gap-1">
                        <FiUsers className="text-xs" /> Capacity: {room.capacity}
                      </p>
                      <p className="text-xs">{room.equipment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  <FiCalendar className="inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  <FiClock className="inline mr-1" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  <FiClock className="inline mr-1" />
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Purpose</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g., Team meeting, Study session, Lab work"
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-stone-950 text-white rounded-md hover:bg-stone-800 transition"
            >
              Create Booking
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-200"></div>

        {/* My Bookings */}
        <div>
          <h2 className="text-2xl font-bold text-stone-950 mb-4">My Bookings</h2>

          {bookings.length === 0 ? (
            <p className="text-stone-600">No bookings yet. Create your first booking above!</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-4 border border-stone-200 rounded-lg hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-950">{booking.room_name}</h3>
                      <p className="text-sm text-stone-600 mt-1">{booking.purpose}</p>
                      <div className="flex gap-4 mt-2 text-sm text-stone-500">
                        <span>
                          <FiCalendar className="inline mr-1" />
                          {formatDateTime(booking.start_time)} - {formatDateTime(booking.end_time)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            booking.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : booking.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    {booking.status === "confirmed" && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                        title="Cancel booking"
                      >
                        <FiX className="text-xl" />
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
