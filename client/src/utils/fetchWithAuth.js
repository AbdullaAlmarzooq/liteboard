// client/src/utils/fetchWithAuth.js

export default async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Access denied. No token provided.");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    console.error("Unauthorized request. Invalid or expired token.");
  }

  return response;
}
