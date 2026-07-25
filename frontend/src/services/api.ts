// const API_BASE = '/api/v1';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function setToken(token: string | null) {
  accessToken = token;
}

export function getToken(): string | null {
  return accessToken;
}

async function handleResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return Promise.reject({
      status: response.status,
      message: data.message || "Something went wrong",
      errors: data.errors,
    });
  }
  return data;
}

async function refreshToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to refresh session");
      }
      const token = data.data.accessToken;
      setToken(token);
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function request(url: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers || {});

  if (!options.skipAuth && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  // Access token expired, attempt refresh
  if (response.status === 401 && !options.skipAuth) {
    try {
      const newToken = await refreshToken();
      headers.set("Authorization", `Bearer ${newToken}`);
      const retryResponse = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
      });
      return handleResponse(retryResponse);
    } catch (err) {
      setToken(null);
      window.dispatchEvent(new Event("auth-expired"));
      return Promise.reject({ status: 401, message: "Session expired" });
    }
  }

  return handleResponse(response);
}

export const api = {
  get: (url: string, options?: RequestOptions) =>
    request(url, { ...options, method: "GET" }),
  post: (url: string, body: any, options?: RequestOptions) =>
    request(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (url: string, body: any, options?: RequestOptions) =>
    request(url, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (url: string, options?: RequestOptions) =>
    request(url, { ...options, method: "DELETE" }),
};
export default api;
