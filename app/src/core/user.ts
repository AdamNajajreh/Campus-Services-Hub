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
export async function changePassword(token: string, data: { old_password: string; new_password: string }) {
  return fetchWithAuth("/api/users/me/password", token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
