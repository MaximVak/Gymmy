export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function parseErrorMessage(data, fallback) {
  if (!data?.detail) {
    return fallback;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => item.msg || item.message || "Invalid value")
      .join(", ");
  }

  return data.detail;
}

export async function apiRequest(
  path,
  { method = "GET", token, body, headers = {} } = {},
) {
  const requestHeaders = { ...headers };
  const request = {
    method,
    headers: requestHeaders,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (body instanceof FormData) {
    request.body = body;
  } else if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    request.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, request);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(
      parseErrorMessage(data, "Something went wrong"),
      response.status,
      data,
    );
  }

  return data;
}

export function resolveMediaUrl(url) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}
