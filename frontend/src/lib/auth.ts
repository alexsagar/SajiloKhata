import { ApiResponse } from "../types/api";
import type { User } from "../types/user";

export async function login(email: string, password: string): Promise<ApiResponse<{ user: Pick<User, "id" | "email"> & { name: string } }>> {
  void password
  // Replace with real API call
  return { success: true, data: { user: { id: "1", name: "Demo", email } } };
}

export async function logout(): Promise<ApiResponse<null>> {
  // Replace with real API call
  return { success: true, data: null };
}

export async function resetPassword(email: string): Promise<ApiResponse<null>> {
  void email
  // Replace with real API call
  return { success: true, data: null };
}
