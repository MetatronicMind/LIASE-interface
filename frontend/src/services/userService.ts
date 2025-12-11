import { authService } from './authService';

import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roleDisplayName?: string;
  lastLogin: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
}

class UserService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token'); // Use the correct token key
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async handleAuthError(response: Response) {
    if (response.status === 401) {
      // Token is invalid or expired - logout the user
      console.warn('Authentication failed, logging out user');
      await authService.logout();
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  async getUsers(): Promise<{ users: User[] }> {
    console.log('Fetching users from:', `${API_BASE_URL}/users`);
    console.log('Auth token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: this.getAuthHeaders()
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData);
      throw new Error(errorData.error || `Failed to fetch users: ${response.status}`);
    }

    return response.json();
  }

  async getUserById(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch user: ${response.status}`);
    }

    return response.json();
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create user: ${response.status}`);
    }

    return response.json();
  }

  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update user: ${response.status}`);
    }

    return response.json();
  }

  async deleteUser(userId: string, hardDelete: boolean = false): Promise<void> {
    const url = hardDelete 
      ? `${API_BASE_URL}/users/${userId}?hardDelete=true`
      : `${API_BASE_URL}/users/${userId}`;
      
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete user: ${response.status}`);
    }
  }
}

export const userService = new UserService();