/**
 * API client for Campus Services Hub
 * Communicates with the API Gateway
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: string;
}

interface ApiResponse<T = unknown> {
  success?: boolean;
  token?: string;
  user?: unknown;
  message?: string;
  data?: T;
}

/**
 * Make an API request
 */
async function fetchAPI<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }

  return data;
}

/**
 * Login user
 */
export async function login(credentials: LoginData) {
  return fetchAPI("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/**
 * Register new user
 */
export async function register(userData: RegisterData) {
  return fetchAPI("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

/**
 * Make authenticated request
 */
export async function fetchWithAuth<T = unknown>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  return fetchAPI<T>(endpoint, {
    ...options,
    headers,
  });
}

/**
 * Get current user profile
 */
export async function getProfile(token: string) {
  return fetchWithAuth("/api/users/me", token);
}

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
 * Get all service requests
 */
export async function getRequests(token: string) {
  return fetchWithAuth("/api/requests", token);
}
