interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Record<string, any>;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PermissionStructure {
  [key: string]: {
    displayName: string;
    description: string;
    actions: {
      [key: string]: string;
    };
  };
}

class RoleService {
  private API_BASE_URL = this.getApiBaseUrl();

  private getApiBaseUrl() {
    return typeof window !== 'undefined' 
      ? (window as any).ENV?.NEXT_PUBLIC_API_URL || 'https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api'
      : 'https://liase-backend-fpc8gsbrghgacdgx.centralindia-01.azurewebsites.net/api';
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token'); // Fixed token key
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private async handleAuthError(response: Response) {
    if (response.status === 401) {
      console.warn('Authentication failed, redirecting to login');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } else if (response.status === 403) {
      console.warn('Access forbidden - user lacks required permissions');
      // Don't redirect on 403, let the calling code handle it
    }
  }

  async getRoles(): Promise<Role[]> {
    const response = await fetch(`${this.API_BASE_URL}/roles`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch roles');
    }

    const data = await response.json();
    return data.roles || data; // Handle both {roles: [...]} and [...] formats
  }

  async getRole(roleId: string): Promise<Role> {
    const response = await fetch(`${this.API_BASE_URL}/roles/${roleId}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch role');
    }

    const data = await response.json();
    return data.role;
  }

  async createRole(roleData: Partial<Role>): Promise<Role> {
    const response = await fetch(`${this.API_BASE_URL}/roles`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(roleData)
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create role');
    }

    const data = await response.json();
    return data.role || data;
  }

  async updateRole(roleId: string, roleData: Partial<Role>): Promise<Role> {
    const response = await fetch(`${this.API_BASE_URL}/roles/${roleId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(roleData)
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update role');
    }

    const data = await response.json();
    return data.role || data;
  }

  async deleteRole(roleId: string): Promise<void> {
    const response = await fetch(`${this.API_BASE_URL}/roles/${roleId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete role');
    }
  }

  async getPermissionStructure(): Promise<PermissionStructure> {
    const response = await fetch(`${this.API_BASE_URL}/roles/system/permissions`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch permission structure');
    }

    const data = await response.json();
    return data.permissions || data;
  }

  async getAvailableRoles(): Promise<Role[]> {
    const response = await fetch(`${this.API_BASE_URL}/roles`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch available roles');
    }

    const data = await response.json();
    return data.roles || data;
  }
}

export const roleService = new RoleService();
export type { Role, PermissionStructure };