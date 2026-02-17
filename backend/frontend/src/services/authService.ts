import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterRequest {
  organizationName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  plan?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
  };
  organization: {
    id: string;
    name: string;
    plan: string;
    settings?: any;
  } | null;
  passwordWarning?: boolean;
}

export interface ApiError {
  error: string;
  details?: any[];
  message?: string;
}

class AuthService {
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token in localStorage
    if (data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
      this.setOrganization(data.organization);
    }

    return data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }

    return result;
  }

  async forgotPassword(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send password reset email');
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }
  }

  async refreshToken(): Promise<string> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token available for refresh');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Token refresh failed');
    }

    this.setToken(data.token);
    return data.token;
  }

  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint to create audit log
      const token = this.getToken();
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
      }
    } catch (error) {
      // Don't throw error if logout API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage regardless of API call success
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_organization');
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getUser(): any | null {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('auth_user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  setUser(user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
  }

  getOrganization(): any | null {
    if (typeof window !== 'undefined') {
      const org = localStorage.getItem('auth_organization');
      return org ? JSON.parse(org) : null;
    }
    return null;
  }

  setOrganization(organization: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_organization', JSON.stringify(organization));
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Check if token is expired (basic check)
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  // Auto refresh token if needed
  async ensureValidToken(): Promise<string | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    if (this.isTokenExpired()) {
      try {
        return await this.refreshToken();
      } catch (error) {
        // Clear local storage without calling logout API
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_organization');
        return null;
      }
    }

    return this.getToken();
  }
}

export const authService = new AuthService();
export default authService;