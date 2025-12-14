/**
 * User Service API
 */

import { fetchWithAuth } from "./client";

/**
 * Get current user profile
 */
export async function getProfile(token: string) {
  return fetchWithAuth("/api/users/me", token);
}

/**
 * Update user profile
 */
export async function updateProfile(token: string, data: { name?: string; email?: string }) {
  return fetchWithAuth("/api/users/me", token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Change password
 */
export async function changePassword(token: string, data: { current_password: string; new_password: string }) {
  return fetchWithAuth("/api/users/me/password", token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Get all users (Admin only)
 */
export async function getAllUsers(token: string) {
  return fetchWithAuth("/api/users", token);
}

/**
 * Get user by ID
 */
export async function getUserById(token: string, userId: number) {
  return fetchWithAuth(`/api/users/${userId}`, token);
}

/**
 * Update user role (Admin only)
 */
export async function updateUserRole(token: string, userId: number, role: string) {
  return fetchWithAuth(`/api/users/${userId}/role`, token, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

/**
 * Delete user (Admin only)
 */
export async function deleteUser(token: string, userId: number) {
  return fetchWithAuth(`/api/users/${userId}`, token, {
    method: "DELETE",
  });
}
