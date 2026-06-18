const API_BASE = "/api";

const request = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP error! status: ${res.status}`);
  }

  return res.json();
};

export { request, API_BASE };
