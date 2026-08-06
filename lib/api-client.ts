"use client";

import axios, { AxiosError } from "axios";

import type { ApiError } from "@/types";

export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

/** Normalises anything thrown by axios into a message a user can read. */
export function apiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.code === "ECONNABORTED") {
      return "That took too long. Please try again.";
    }
    if (!axiosError.response) {
      return "We couldn't reach the server. Check your connection.";
    }
    return axiosError.response.data?.error ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Field-level errors from a 422, keyed by form field name. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const details = (error as AxiosError<ApiError>).response?.data?.details;
  if (!details) return {};

  return Object.fromEntries(
    Object.entries(details).map(([field, messages]) => [field, messages[0] ?? ""]),
  );
}

type Unwrapped<T> = { data: T };

export async function getJson<T>(url: string, params?: Record<string, unknown>) {
  const response = await api.get<Unwrapped<T>>(url, { params });
  return response.data.data;
}

export async function postJson<T>(url: string, body?: unknown) {
  const response = await api.post<Unwrapped<T>>(url, body);
  return response.data.data;
}

export async function putJson<T>(url: string, body?: unknown) {
  const response = await api.put<Unwrapped<T>>(url, body);
  return response.data.data;
}

export async function patchJson<T>(url: string, body?: unknown) {
  const response = await api.patch<Unwrapped<T>>(url, body);
  return response.data.data;
}

export async function deleteJson<T>(url: string) {
  const response = await api.delete<Unwrapped<T>>(url);
  return response.data?.data;
}
