import { useEffect, useState } from "react";

export const API_BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:8000").replace(/\/$/, "");

export function apiUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...extraHeaders,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

async function parseErrorMessage(response) {
  const errorBody = await response
    .clone()
    .json()
    .catch(() => null);

  return errorBody?.error || errorBody?.message || null;
}

export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Access denied. No token provided.");
  }

  const headers = getAuthHeaders(options.headers || {});
  const response = await fetch(apiUrl(url), { ...options, headers });

  if (response.status === 401) {
    console.error("Unauthorized request. Invalid or expired token.");
  }

  return response;
}

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      setIsPending(false);
      setError(null);
      return () => {};
    }

    const requestUrl = apiUrl(url);
    const abortCont = new AbortController();
    const token = localStorage.getItem("token");

    if (requestUrl.includes("/api/") && !token) {
      setIsPending(false);
      setError("Authorization token missing. Cannot fetch protected resource.");
      console.error("Attempted to fetch protected resource without token:", requestUrl);
      return () => {};
    }

    const timeoutId = setTimeout(() => {
      fetch(requestUrl, {
        signal: abortCont.signal,
        headers: getAuthHeaders(),
      })
        .then(async (res) => {
          if (!res.ok) {
            const serverMessage = await parseErrorMessage(res);

            if (res.status === 401) {
              throw Error(serverMessage || "Authentication failed. Please log in again.");
            }
            if (res.status === 403) {
              throw Error(serverMessage || "You don't have access to this resource.");
            }
            if (res.status === 404) {
              throw Error(serverMessage || "The requested resource could not be found.");
            }
            throw Error(serverMessage || `Could not fetch the data for that resource. Status: ${res.status}`);
          }

          return res.json();
        })
        .then((nextData) => {
          setIsPending(false);
          setData(nextData);
          setError(null);
        })
        .catch((err) => {
          if (err.name === "AbortError") {
            return;
          }

          setIsPending(false);
          setError(err.message);
        });
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      abortCont.abort();
    };
  }, [url]);

  return { data, isPending, error };
}
