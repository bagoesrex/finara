const TOKEN_KEY = 'finara_token';

export const getToken = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(TOKEN_KEY);
  }
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface LogoutResponse {
  message: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const getApiUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '';
};

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${getApiUrl()}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let message = response.statusText || 'Terjadi kesalahan sistem';
    try {
      const data = await response.json();
      if (data?.error) {
        message = data.error;
      } else if (data?.message) {
        message = data.message;
      }
    } catch {
      // Body is not JSON
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  register: (data: RegisterInput): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginInput): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: (): Promise<MeResponse> =>
    apiFetch<MeResponse>('/api/auth/me', {
      method: 'GET',
    }),

  logout: (): Promise<LogoutResponse> =>
    apiFetch<LogoutResponse>('/api/auth/logout', {
      method: 'POST',
    }),
};
