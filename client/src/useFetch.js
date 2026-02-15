import { useState, useEffect } from 'react';

const useFetch = (url) => {
  const [data, setData] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const abortCont = new AbortController();

    // --- CRITICAL FIX: Include JWT in Authorization Header ---
    const token = localStorage.getItem('token'); 
    // Ensure the token exists before attempting to fetch protected data
    if (url.includes('/api/') && !token) {
        setIsPending(false);
        setError("Authorization token missing. Cannot fetch protected resource.");
        console.error("Attempted to fetch protected resource without token:", url);
        return () => {}; // Abort and stop if protected and no token
    }

    const headers = {
        'Content-Type': 'application/json',
        // Conditionally add the Authorization header if a token exists
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
    // --------------------------------------------------------

    setTimeout(() => {
      fetch(url, { 
        signal: abortCont.signal,
        headers: headers // Pass the constructed headers
      })
      .then(res => {
        // Handle 401/403 responses gracefully
        if (!res.ok) { 
          // If the status is 401 or 403, specifically log the auth failure
          if (res.status === 401) {
             throw Error('Authentication failed (401). Please log in again.');
          }
          if (res.status === 403) {
             throw Error('Permission denied (403). Insufficient role.');
          }
          throw Error(`Could not fetch the data for that resource. Status: ${res.status}`);
        } 
        return res.json();
      })
      .then(data => {
        setIsPending(false);
        setData(data);
        setError(null);
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          // Request was canceled during unmount/re-render.
        } else {
          setIsPending(false);
          setError(err.message);
        }
      })
    }, 10);


    return () => abortCont.abort();
  }, [url])

  return { data, isPending, error };
}
 
export default useFetch;
