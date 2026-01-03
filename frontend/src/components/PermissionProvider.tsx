"use client";
import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PermissionContextType {
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user || !isAuthenticated || !user.permissions) return false;
    return user.permissions[resource]?.[action] === true;
  };

  const hasRole = (roleName: string): boolean => {
    if (!user || !isAuthenticated) return false;
    return user.role === roleName;
  };

  const isAdmin = (): boolean => {
    if (!user || !isAuthenticated) return false;
    return user.role === 'Admin' || user.role === 'Super Admin';
  };

  const isSuperAdmin = (): boolean => {
    if (!user || !isAuthenticated) return false;
    return user.role === 'Super Admin';
  };

  const value = {
    hasPermission,
    hasRole,
    isAdmin,
    isSuperAdmin
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// HOC for permission-based rendering
interface PermissionGateProps {
  children: ReactNode;
  resource?: string;
  action?: string;
  roles?: string[];
  fallback?: ReactNode;
  requireAll?: boolean; // If true, user must have ALL specified permissions/roles
}

export function PermissionGate({
  children,
  resource,
  action,
  roles,
  fallback = null,
  requireAll = false
}: PermissionGateProps) {
  try {
    const { hasPermission, hasRole } = usePermissions();

    const checkPermissions = (): boolean => {
      const checks: boolean[] = [];

      // Check resource permission
      if (resource && action) {
        checks.push(hasPermission(resource, action));
      }

      // Check roles
      if (roles && roles.length > 0) {
        if (requireAll) {
          // User must have ALL specified roles
          checks.push(roles.every(role => hasRole(role)));
        } else {
          // User must have AT LEAST ONE of the specified roles
          checks.push(roles.some(role => hasRole(role)));
        }
      }

      if (checks.length === 0) {
        // No permissions specified, allow access
        return true;
      }

      return requireAll 
        ? checks.every(check => check) 
        : checks.some(check => check);
    };

    if (!checkPermissions()) {
      return <>{fallback}</>;
    }

    return <>{children}</>;
  } catch (error) {
    // If permission checking fails, don't render the component
    console.warn('PermissionGate error:', error);
    return <>{fallback}</>;
  }
}

// Hook for conditional logic based on permissions
export function useConditionalPermissions() {
  const { hasPermission, hasRole, isAdmin, isSuperAdmin } = usePermissions();

  const canAccess = (resource: string, action: string): boolean => {
    return hasPermission(resource, action);
  };

  const canManageUsers = (): boolean => {
    return hasPermission('users', 'create') || hasPermission('users', 'update');
  };

  const canManageRoles = (): boolean => {
    return hasPermission('settings', 'viewRoleManagement');
  };

  const canDeleteUsers = (): boolean => {
    return false;
  };

  const canDeleteRoles = (): boolean => {
    return false;
  };

  const canViewAuditLogs = (): boolean => {
    return hasPermission('auditTrail', 'read');
  };

  const canManageOrganization = (): boolean => {
    return false;
  };

  return {
    hasPermission,
    hasRole,
    isAdmin,
    isSuperAdmin,
    canAccess,
    canManageUsers,
    canManageRoles,
    canDeleteUsers,
    canDeleteRoles,
    canViewAuditLogs,
    canManageOrganization
  };
}