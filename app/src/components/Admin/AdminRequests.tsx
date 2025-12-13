"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { getAllRequests, updateRequestStatus, updateRequestPriority, assignRequest } from "@/core";
import { getAllUsers } from "@/core";
import { FiTool, FiUser, FiMapPin, FiClock } from "react-icons/fi";

interface Request {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  priority: string;
  status: string;
  admin_notes?: string;
  assigned_to?: number;
  estimated_completion_date?: string;
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
 * @description AdminRequests component for managing service requests
 * @returns The Admin Requests page layout
 */
export const AdminRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Fetch all requests
      const requestsResponse = await getAllRequests(token);
      if (requestsResponse.data && requestsResponse.data.requests) {
        setRequests(requestsResponse.data.requests);
      }

      // Fetch all users to get staff list
      const usersResponse = await getAllUsers(token);
      if (usersResponse.data && usersResponse.data.users) {
        const staff = usersResponse.data.users.filter((u: User) => u.role === "staff" || u.role === "admin");
        setStaffUsers(staff);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (requestId: number, newStatus: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await updateRequestStatus(token, requestId, newStatus);
      if (response.success) {
        setMessage({ type: "success", text: "Status updated successfully!" });
        fetchData();
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update status" });
    }
  };

  const handlePriorityChange = async (requestId: number, newPriority: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await updateRequestPriority(token, requestId, newPriority);
      if (response.success) {
        setMessage({ type: "success", text: "Priority updated successfully!" });
        fetchData();
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update priority" });
    }
  };

  const handleAssign = async (requestId: number, staffId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await assignRequest(token, requestId, staffId);
      if (response.success) {
        setMessage({ type: "success", text: "Request assigned successfully!" });
        fetchData();
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to assign request" });
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-stone-100 text-stone-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  const getStaffName = (staffId?: number) => {
    if (!staffId) return "Unassigned";
    const staff = staffUsers.find((u) => u.id === staffId);
    return staff ? staff.name : "Unknown";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg pb-4 shadow">
        <TopBar />
        <div className="p-6 text-center">
          <p className="text-stone-600">Loading requests...</p>
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

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-purple-900">Manage Service Requests</h2>
          <p className="text-stone-600 mt-1">View and manage all service requests</p>
        </div>

        {/* Requests List */}
        <div>
          <h3 className="text-lg font-semibold text-stone-950 mb-3">Requests ({requests.length})</h3>

          {requests.length === 0 ? (
            <p className="text-stone-600">No requests match your filters.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 border-2 border-purple-200 rounded-lg hover:shadow-md transition bg-white"
                >
                  <div className="flex flex-col gap-4">
                    {/* Top Section: Title and Actions */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <FiTool className="mt-1 text-purple-600" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-stone-950">{request.title}</h4>
                            <p className="text-sm text-stone-600 mt-1">{request.description}</p>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status.replace("_", " ")}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                              request.priority
                            )}`}
                          >
                            {request.priority}
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            {request.category.replace("_", " ")}
                          </span>
                        </div>

                        <div className="flex gap-4 mt-2 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <FiMapPin /> {request.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock /> {formatDate(request.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiUser /> Assigned to: {getStaffName(request.assigned_to)}
                          </span>
                        </div>

                        {request.admin_notes && (
                          <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-sm">
                            <p className="text-xs font-medium text-purple-700 mb-1">Admin Notes:</p>
                            <p className="text-purple-900">{request.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Section: Admin Actions */}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-purple-100">
                      {/* Status Dropdown */}
                      <select
                        value={request.status}
                        onChange={(e) => handleStatusChange(request.id, e.target.value)}
                        className="px-3 py-1.5 text-xs border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      {/* Priority Dropdown */}
                      <select
                        value={request.priority}
                        onChange={(e) => handlePriorityChange(request.id, e.target.value)}
                        className="px-3 py-1.5 text-xs border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>

                      {/* Assign Staff Dropdown */}
                      <select
                        value={request.assigned_to || ""}
                        onChange={(e) => handleAssign(request.id, parseInt(e.target.value))}
                        className="px-3 py-1.5 text-xs border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                      >
                        <option value="">Assign to...</option>
                        {staffUsers.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name} ({staff.role})
                          </option>
                        ))}
                      </select>
                    </div>
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
