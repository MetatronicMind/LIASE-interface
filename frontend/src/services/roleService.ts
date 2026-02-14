import { getApiBaseUrl } from '../config/api';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Record<string, any>;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface PermissionStructure {
  [key: string]: {
    displayName: string;
    description: string;
    actions: {
      [key: string]: string;
    };
  };
}

class RoleService {
  private API_BASE_URL = getApiBaseUrl();

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

  // Get permission templates for role creation
  async getPermissionTemplates(): Promise<Record<string, any>> {
    const response = await fetch(`${this.API_BASE_URL}/roles/templates`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch permission templates');
    }

    const data = await response.json();
    return data;
  }

  // Create role from template
  async createRoleFromTemplate(params: {
    customName: string;
    customDisplayName: string;
    permissionTemplate: string;
    description?: string;
  }): Promise<Role> {
    const response = await fetch(`${this.API_BASE_URL}/roles/custom`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create role from template');
    }

    const data = await response.json();
    return data.role || data;
  }

  // Get system role templates
  async getSystemRoleTemplates(): Promise<any[]> {
    const response = await fetch(`${this.API_BASE_URL}/roles/system/templates`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch system role templates');
    }

    const data = await response.json();
    return data;
  }

  async getAvailableRoles(): Promise<Role[]> {
    const response = await fetch(`${this.API_BASE_URL}/users/roles/available`, {
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

  // Debug function to force delete all roles (including system roles)
  async forceDeleteAllRoles(): Promise<{
    deleted: any[];
    errors: any[];
    summary: {
      totalFound: number;
      successfullyDeleted: number;
      failed: number;
    };
  }> {
    const response = await fetch(`${this.API_BASE_URL}/roles/debug/force-delete-all`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to force delete all roles');
    }

    const data = await response.json();
    return data;
  }

  // Debug function to inspect database
  async inspectDatabase(): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/roles/debug/inspect-database`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to inspect database');
    }

    const data = await response.json();
    return data;
  }

  // Debug function to test role creation
  async testCreateRole(): Promise<any> {
    const response = await fetch(`${this.API_BASE_URL}/roles/debug/test-create-role`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      await this.handleAuthError(response);
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to test role creation');
    }

    const data = await response.json();
    return data;
  }
}

export const roleService = new RoleService();