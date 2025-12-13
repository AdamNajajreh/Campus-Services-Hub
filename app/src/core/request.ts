/**
 * Request Service API
 */

import { fetchWithAuth } from "./client";

/**
 * Get all service requests
 */
export async function getRequests(token: string) {
  return fetchWithAuth("/api/requests", token);
}

/**
 * Create a service request
 */
export async function createRequest(
  token: string,
  requestData: {
    title: string;
    description: string;
    category: string;
    location: string;
    priority: string;
  }
) {
  return fetchWithAuth("/api/requests", token, {
    method: "POST",
    body: JSON.stringify(requestData),
  });
}

/**
 * Get request by ID
 */
export async function getRequestById(token: string, id: number) {
  return fetchWithAuth(`/api/requests/${id}`, token);
}

/**
 * Update a request
 */
export async function updateRequest(
  token: string,
  id: number,
  data: {
    title?: string;
    description?: string;
    category?: string;
    location?: string;
    priority?: string;
    status?: string;
    admin_notes?: string;
    assigned_to?: number;
  }
) {
  return fetchWithAuth(`/api/requests/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a request
 */
export async function deleteRequest(token: string, id: number) {
  return fetchWithAuth(`/api/requests/${id}`, token, {
    method: "DELETE",
  });
}

/**
 * Get request statistics
 */
export async function getRequestStats(token: string) {
  return fetchWithAuth("/api/requests/stats", token);
}

/**
 * Get all requests (Admin only - with filters)
 */
export async function getAllRequests(token: string, filters?: {
  status?: string;
  category?: string;
  priority?: string;
}) {
  let url = "/api/requests";
  const params = new URLSearchParams();
  
  if (filters?.status) params.append("status", filters.status);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.priority) params.append("priority", filters.priority);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  return fetchWithAuth(url, token);
}
