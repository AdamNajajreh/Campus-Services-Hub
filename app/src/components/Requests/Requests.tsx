"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { getRequests, createRequest, updateRequest, deleteRequest } from "@/core";
import { FiAlertCircle, FiEdit2, FiTrash2, FiTool, FiMapPin, FiClock } from "react-icons/fi";

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
  created_at: string;
  updated_at?: string;
}

/**
 * @component
 * @description Service Requests component for students
 * @returns The Requests page layout with top bar and content
 */
export const Requests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "maintenance",
    location: "",
    priority: "medium",
  });
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    priority: "all",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, filters]);

  const fetchRequests = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await getRequests(token);
      if (response.data && response.data.requests && Array.isArray(response.data.requests)) {
        setRequests(response.data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    if (filters.status !== "all") {
      filtered = filtered.filter((req) => req.status === filters.status);
    }

    if (filters.category !== "all") {
      filtered = filtered.filter((req) => req.category === filters.category);
    }

    if (filters.priority !== "all") {
      filtered = filtered.filter((req) => req.priority === filters.priority);
    }

    setFilteredRequests(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      if (editingRequest) {
        // Update existing request (only if pending)
        if (editingRequest.status !== "pending") {
          setMessage({ type: "error", text: "You can only edit pending requests" });
          return;
        }

        const response = await updateRequest(token, editingRequest.id, formData);
        if (response.success) {
          setMessage({ type: "success", text: "Request updated successfully!" });
          resetForm();
          fetchRequests();
        }
      } else {
        // Create new request
        const response = await createRequest(token, formData);
        if (response.success) {
          setMessage({ type: "success", text: "Request created successfully!" });
          resetForm();
          fetchRequests();
        }
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Operation failed",
      });
    }
  };

  const handleDelete = async (requestId: number, status: string) => {
    if (status !== "pending") {
      setMessage({ type: "error", text: "You can only delete pending requests" });
      return;
    }

    if (!confirm("Are you sure you want to delete this request?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await deleteRequest(token, requestId);
      if (response.success) {
        setMessage({ type: "success", text: "Request deleted successfully!" });
        fetchRequests();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete request",
      });
    }
  };

  const handleEdit = (request: Request) => {
    if (request.status !== "pending") {
      setMessage({ type: "error", text: "You can only edit pending requests" });
      return;
    }

    setEditingRequest(request);
    setFormData({
      title: request.title,
      description: request.description,
      category: request.category,
      location: request.location,
      priority: request.priority,
    });
    setShowCreateForm(true);
    setMessage({ type: "", text: "" });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "maintenance",
      location: "",
      priority: "medium",
    });
    setEditingRequest(null);
    setShowCreateForm(false);
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "maintenance":
        return <FiTool />;
      case "cleaning":
        return <FiAlertCircle />;
      case "it_support":
        return <FiAlertCircle />;
      case "facilities":
        return <FiMapPin />;
      default:
        return <FiAlertCircle />;
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

        {/* Header with Create Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-stone-950">Service Requests</h2>
          <button
            onClick={() => {
              if (showCreateForm && !editingRequest) {
                resetForm();
              } else {
                setShowCreateForm(!showCreateForm);
                setEditingRequest(null);
              }
            }}
            className="px-4 py-2 bg-stone-950 text-white rounded-md hover:bg-stone-800 transition"
          >
            {showCreateForm ? "Cancel" : "New Request"}
          </button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="p-4 border border-stone-200 rounded-lg bg-stone-50">
            <h3 className="text-lg font-semibold text-stone-950 mb-4">
              {editingRequest ? "Edit Request" : "Create New Request"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the issue"
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="it_support">IT Support</option>
                    <option value="facilities">Facilities</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Building A, Room 101"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-stone-950 text-white rounded-md hover:bg-stone-800 transition"
                >
                  {editingRequest ? "Update Request" : "Submit Request"}
                </button>
                {editingRequest && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-stone-200 text-stone-700 rounded-md hover:bg-stone-300 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
            >
              <option value="all">All</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
              <option value="it_support">IT Support</option>
              <option value="facilities">Facilities</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div>
          <h3 className="text-lg font-semibold text-stone-950 mb-3">My Requests ({filteredRequests.length})</h3>

          {filteredRequests.length === 0 ? (
            <p className="text-stone-600">
              {requests.length === 0
                ? "No requests yet. Create your first request above!"
                : "No requests match your filters."}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div key={request.id} className="p-4 border border-stone-200 rounded-lg hover:shadow-md transition">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-stone-600">{getCategoryIcon(request.category)}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-stone-950">{request.title}</h4>
                          <p className="text-sm text-stone-600 mt-1">{request.description}</p>

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
                            <span className="px-2 py-1 rounded text-xs font-medium bg-stone-100 text-stone-700">
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
                          </div>

                          {request.admin_notes && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                              <p className="text-xs font-medium text-blue-700 mb-1">Admin Notes:</p>
                              <p className="text-blue-900">{request.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(request)}
                          className="p-2 text-stone-600 hover:bg-stone-100 rounded transition"
                          title="Edit request"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDelete(request.id, request.status)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete request"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
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

