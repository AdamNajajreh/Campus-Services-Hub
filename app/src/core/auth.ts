/**
 * Authentication API
 */

import { fetchAPI, ApiResponse } from "./client";

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

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthData {
  token: string;
  user: User;
}

/**
 * Login user
 */
export async function login(credentials: LoginData): Promise<ApiResponse<AuthData>> {
  return fetchAPI<AuthData>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/**
 * Register new user
 */
export async function register(userData: RegisterData): Promise<ApiResponse<AuthData>> {
  return fetchAPI<AuthData>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}
