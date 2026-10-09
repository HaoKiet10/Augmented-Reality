import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

export interface User {
  id: string;
  email: string;
  role?: string;
  name?: string;
  avatarUrl?: string | null;
  hasPassword?: boolean;
  hasGoogle?: boolean;
}

/** Backend giới hạn 5 lần/phút cho các route auth — trả 429 với message kỹ thuật,
 * nên đổi thành câu người dùng đọc được. */
export const RATE_LIMIT_MESSAGE = 'Too many attempts. Please wait a minute and try again.';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  /** Hoàn tất đăng nhập Google: nhận access token từ URL callback, lấy profile rồi lưu phiên. */
  loginWithToken: (token: string) => Promise<void>;
  updateUser: (user: User) => void;
  logout: () => void;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // The refresh token now lives only in a backend-set HttpOnly cookie — it is never
  // readable from JS, so it can't be exfiltrated via XSS the way a localStorage value can.
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {
      // best-effort — cookie is cleared client-side by the response regardless
    });
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // let the browser store the HttpOnly refresh_token cookie
      body: JSON.stringify({ email, password }),
    });

    if (response.status === 429) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });

    if (response.status === 429) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  const loginWithToken = async (newToken: string) => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
    } catch {
      // fetch chỉ reject khi không tới được server hoặc bị CORS chặn.
      throw new Error(`Could not reach the API at ${API_URL}. Check VITE_API_URL and the backend CORS_ORIGIN.`);
    }

    if (!response.ok) {
      throw new Error(`Google sign-in failed: loading your profile returned HTTP ${response.status}.`);
    }

    const profile: User = await response.json();

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(profile));

    setToken(newToken);
    setUser(profile);
  };

  const updateUser = (updated: User) => {
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let currentToken = token || localStorage.getItem('token');
    const headers = new Headers(init?.headers || {});

    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    const modifiedInit = {
      ...init,
      headers,
    };

    let response = await fetch(input, modifiedInit);

    if (response.status === 401) {
      try {
        // No token in the request body/headers — the browser sends the HttpOnly
        // refresh_token cookie automatically.
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();

          localStorage.setItem('token', refreshData.token);
          setToken(refreshData.token);

          const retryHeaders = new Headers(init?.headers || {});
          retryHeaders.set('Authorization', `Bearer ${refreshData.token}`);

          response = await fetch(input, {
            ...init,
            headers: retryHeaders,
          });
        } else {
          logout();
        }
      } catch (err) {
        console.error('Silent token refresh failed:', err);
        logout();
      }
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        signup,
        loginWithToken,
        updateUser,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};