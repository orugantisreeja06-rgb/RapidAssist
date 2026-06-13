const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem("rapidassist_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredAuth = (auth) => {
  if (!auth) {
    localStorage.removeItem("rapidassist_auth");
    return;
  }
  localStorage.setItem("rapidassist_auth", JSON.stringify(auth));
};

export const getToken = () => getStoredAuth()?.token;

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = data?.message || data?.error || "Something went wrong.";
    throw new Error(message);
  }

  return data;
}
