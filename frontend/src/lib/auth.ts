import { ApiResponse } from "../types/api";

export async function login(email: string, password: string): Promise<ApiResponse<{ user: any }>> {
  // Replace with real API call
  return { success: true, data: { user: { id: "1", name: "Demo", email } } };
}

export async function logout(): Promise<ApiResponse<null>> {
  // Replace with real API call
  return { success: true, data: null };
}

export async function resetPassword(email: string): Promise<ApiResponse<null>> {
  // Replace with real API call
  return { success: true, data: null };
}