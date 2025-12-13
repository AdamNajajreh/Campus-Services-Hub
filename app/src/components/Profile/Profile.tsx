"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "../Common/TopBar";
import { updateProfile, changePassword } from "@/core";
import { FiUser, FiMail, FiLock, FiSave } from "react-icons/fi";

/**
 * @component
 * @description Profile component
 * @returns The Profile page layout with top bar and content
 */
export const Profile = () => {
  const [user, setUser] = useState({ name: "", email: "", role: "" });
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(true);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchUserData = async () => {
      const userStr = localStorage.getItem("user");

      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
          setProfileForm({ name: userData.name, email: userData.email });
        } catch (e) {
          console.error("Failed to parse user data:", e);
        }
      }

      setLoading(false);
    };

    fetchUserData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: "", text: "" });

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await updateProfile(token, {
        name: profileForm.name,
        email: profileForm.email,
      });

      if (response.success) {
        const updatedUser = { ...user, name: profileForm.name, email: profileForm.email };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        setProfileMessage({ type: "success", text: "Profile updated successfully!" });
      }
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ type: "", text: "" });

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await changePassword(token, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      if (response.success) {
        setPasswordMessage({ type: "success", text: "Password changed successfully!" });
        setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      }
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to change password",
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg pb-4 shadow">
        <TopBar />
        <div className="p-6 text-center">
          <p className="text-stone-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg pb-4 shadow">
      <TopBar />

      <div className="p-6 space-y-8">
        {/* Profile Information Section */}
        <div>
          <h2 className="text-2xl font-bold text-stone-950 mb-6">Profile Information</h2>

          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-2xl">
            {profileMessage.text && (
              <div
                className={`px-4 py-3 rounded ${
                  profileMessage.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {profileMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  <FiUser className="inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  <FiMail className="inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-stone-950 text-white rounded-md hover:bg-stone-800 transition"
            >
              <FiSave />
              Save Changes
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-200"></div>

        {/* Change Password Section */}
        <div>
          <h2 className="text-2xl font-bold text-stone-950 mb-6">Change Password</h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-2xl">
            {passwordMessage.text && (
              <div
                className={`px-4 py-3 rounded ${
                  passwordMessage.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                <FiLock className="inline mr-2" />
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-stone-950 text-white rounded-md hover:bg-stone-800 transition"
            >
              <FiLock />
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
