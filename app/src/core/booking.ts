/**
 * Booking Service API
 */

import { fetchAPI, fetchWithAuth } from "./client";

/**
 * Get all rooms
 */
export async function getRooms(token?: string) {
  if (token) {
    return fetchWithAuth("/api/rooms", token);
  }
  return fetchAPI("/api/rooms");
}

/**
 * Check room availability
 */
export async function checkRoomAvailability(roomId: number, date: string, token?: string) {
  const endpoint = `/api/rooms/${roomId}/availability?date=${date}`;
  if (token) {
    return fetchWithAuth(endpoint, token);
  }
  return fetchAPI(endpoint);
}

/**
 * Create a booking
 */
export async function createBooking(
  token: string,
  bookingData: {
    room_id: number;
    start_time: string;
    end_time: string;
    purpose: string;
  }
) {
  return fetchWithAuth("/api/bookings", token, {
    method: "POST",
    body: JSON.stringify(bookingData),
  });
}

/**
 * Get user bookings
 */
export async function getBookings(token: string) {
  return fetchWithAuth("/api/bookings", token);
}

/**
 * Cancel a booking
 */
export async function cancelBooking(token: string, bookingId: number) {
  return fetchWithAuth(`/api/bookings/${bookingId}`, token, {
    method: "DELETE",
  });
}

