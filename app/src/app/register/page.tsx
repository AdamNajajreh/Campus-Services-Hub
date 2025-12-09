"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/core/api";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "student",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
      });

      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        router.push("/dashboard");
      } else {
        setError("Registration failed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-950">Create Account</h1>
          <p className="text-stone-600 mt-2">Join Campus Services Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-2">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
              placeholder="student@campus.edu"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-stone-700 mb-2">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 text-stone-900 bg-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-950 text-white py-2 px-4 rounded-md hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-stone-600">
            Already have an account?{" "}
            <a href="/login" className="text-stone-950 hover:text-stone-700 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
