"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { getAllUsers, deleteUser, register } from "@/core";
import { FiUser, FiTrash2, FiMail, FiCalendar, FiShield, FiX, FiUserPlus } from "react-icons/fi";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * @component
 * @description AdminUsers component for managing users
 * @returns The Admin Users page layout with top bar and content
 */
export const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm]);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Get current user to check role
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setCurrentUser(userData);
      }

      // Fetch all users
      const response = await getAllUsers(token);
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setMessage({ type: "error", text: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Role-based filtering
    if (currentUser?.role === "staff") {
      // Staff can only see students
      filtered = filtered.filter((user) => user.role === "student");
    }
    // Admin sees all users (no filter)

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.role.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    // Prevent admin from deleting themselves
    if (currentUser?.id === userId) {
      setMessage({ type: "error", text: "You cannot delete your own account" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await deleteUser(token, userId);
      if (response.success) {
        setMessage({ type: "success", text: "User deleted successfully!" });
        fetchData();
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete user",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    // Validate passwords match
    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    // Validate password strength (min 8 chars, must contain digit and letter)
    if (registerForm.password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters long" });
      return;
    }

    if (!/\d/.test(registerForm.password) || !/[a-zA-Z]/.test(registerForm.password)) {
      setMessage({
        type: "error",
        text: "Password must contain at least one digit and one letter",
      });
      return;
    }

    setRegisterLoading(true);

    try {
      const response = await register({
        email: registerForm.email,
        password: registerForm.password,
        name: registerForm.name,
        role: registerForm.role,
      });

      if (response.success) {
        setMessage({ type: "success", text: "User registered successfully!" });
        setRegisterForm({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "student",
        });
        setShowRegisterModal(false);
        fetchData();
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to register user",
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700 border-red-200";
      case "staff":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "student":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg pb-4 shadow">
        <TopBar />
        <div className="p-6 text-center">
          <p className="text-stone-600">Loading users...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";
  const userCount = filteredUsers.length;
  const studentCount = filteredUsers.filter((u) => u.role === "student").length;
  const staffCount = filteredUsers.filter((u) => u.role === "staff").length;
  const adminCount = filteredUsers.filter((u) => u.role === "admin").length;

  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-950">User Management</h1>
            <p className="text-stone-600 mt-1">{isAdmin ? "Manage all users" : "View student accounts"}</p>
          </div>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <FiUserPlus className="text-lg" />
            Register User
          </button>
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
            <p className="text-sm text-stone-600 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-stone-950">{userCount}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 mb-1">Students</p>
            <p className="text-2xl font-bold text-blue-700">{studentCount}</p>
          </div>
          {isAdmin && (
            <>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 mb-1">Staff</p>
                <p className="text-2xl font-bold text-purple-700">{staffCount}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 mb-1">Admins</p>
                <p className="text-2xl font-bold text-red-700">{adminCount}</p>
              </div>
            </>
          )}
        </div>

        {/* Search Bar */}
        <div>
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-200">
                <th className="text-left p-3 text-sm font-semibold text-stone-700">User</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Email</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Role</th>
                <th className="text-left p-3 text-sm font-semibold text-stone-700">Created</th>
                {isAdmin && <th className="text-left p-3 text-sm font-semibold text-stone-700">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-stone-500">
                    {searchTerm ? "No users found matching your search" : "No users found"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-stone-100 hover:bg-stone-50 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <FiUser className="text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-stone-950">{user.name}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FiMail className="text-stone-400" />
                        <p className="text-sm text-stone-700">{user.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getRoleColor(
                          user.role
                        )} flex items-center gap-1 w-fit`}
                      >
                        <span className="capitalize">{user.role}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-xs text-stone-500">
                        <FiCalendar className="text-stone-400" />
                        {formatDate(user.created_at)}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="p-3">
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete User"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                        {user.id === currentUser?.id && <span className="text-xs text-stone-400">Current user</span>}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register User Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-stone-950">Register New User</h2>
              <button
                onClick={() => {
                  setShowRegisterModal(false);
                  setRegisterForm({
                    name: "",
                    email: "",
                    password: "",
                    confirmPassword: "",
                    role: "student",
                  });
                  setMessage({ type: "", text: "" });
                }}
                className="p-2 hover:bg-stone-100 rounded transition"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4">
              {message.text && (
                <div
                  className={`p-3 rounded-lg ${
                    message.type === "success"
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-2">
                  Full Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                  placeholder="user@campus.edu"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-stone-700 mb-2">
                  Role *
                </label>
                <select
                  id="role"
                  value={registerForm.role}
                  onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                  disabled={currentUser?.role === "staff"}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white disabled:bg-stone-100 disabled:cursor-not-allowed"
                >
                  <option value="student">Student</option>
                  {isAdmin && <option value="staff">Staff</option>}
                  {isAdmin && <option value="admin">Admin</option>}
                </select>
                {currentUser?.role === "staff" && (
                  <p className="text-xs text-stone-500 mt-1">Staff can only register students</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-2">
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                  placeholder="••••••••"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Min 8 characters, must contain at least one digit and one letter
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 bg-white"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setRegisterForm({
                      name: "",
                      email: "",
                      password: "",
                      confirmPassword: "",
                      role: "student",
                    });
                    setMessage({ type: "", text: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registerLoading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
