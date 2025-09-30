"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { userService } from "@/services/userService";
import { roleService, type Role } from "@/services/roleService";

interface CreateUserData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

export default function AddUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [hasRolePermissions, setHasRolePermissions] = useState(true);
  
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: ''
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const roles = await roleService.getRoles();
      
      // Always ensure we have the basic system roles available
      const systemRoles: Role[] = [
        {
          id: 'admin',
          name: 'admin',
          displayName: 'Administrator',
          description: 'Organization administrator with user and role management access',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'pharmacovigilance',
          name: 'pharmacovigilance',
          displayName: 'Pharmacovigilance Specialist',
          description: 'Pharmacovigilance specialist with access to safety data',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'data_entry',
          name: 'data_entry',
          displayName: 'Data Entry',
          description: 'Data entry user with limited access to forms',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'medical_examiner',
          name: 'medical_examiner',
          displayName: 'Medical Examiner',
          description: 'Medical examiner with access to completed ICSR studies',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'sponsor_auditor',
          name: 'sponsor_auditor',
          displayName: 'Sponsor Auditor',
          description: 'Sponsor auditor with read-only access to audit data',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      
      // Merge API roles with system roles, removing duplicates
      const allRoles = [...roles];
      systemRoles.forEach(sysRole => {
        if (!allRoles.find(role => role.name === sysRole.name)) {
          allRoles.push(sysRole);
        }
      });
      
      setRoles(allRoles);
      setError(null);
    } catch (err: any) {
      console.error('Roles fetch error:', err);
      
      // If there's any error, provide basic system roles
      console.log('Error fetching roles, using fallback system roles');
      setHasRolePermissions(false);
      setRoles([
        {
          id: 'admin',
          name: 'admin',
          displayName: 'Administrator',
          description: 'Organization administrator with user and role management access',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'pharmacovigilance',
          name: 'pharmacovigilance',
          displayName: 'Pharmacovigilance Specialist',
          description: 'Pharmacovigilance specialist with access to safety data',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'data_entry',
          name: 'data_entry',
          displayName: 'Data Entry',
          description: 'Data entry user with limited access to forms',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'medical_examiner',
          name: 'medical_examiner',
          displayName: 'Medical Examiner',
          description: 'Medical examiner with access to completed ICSR studies',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'sponsor_auditor',
          name: 'sponsor_auditor',
          displayName: 'Sponsor Auditor',
          description: 'Sponsor auditor with read-only access to audit data',
          permissions: {},
          isSystemRole: true,
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ]);
      setError('Note: Using default system roles. Contact your administrator for custom roles.');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.username || !formData.firstName || !formData.lastName || 
          !formData.email || !formData.password || !formData.role) {
        throw new Error('All fields are required');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Create user
      const newUser = await userService.createUser(formData);
      console.log('User created successfully:', newUser);
      
      // Show success and redirect
      alert(`User "${formData.username}" created successfully!`);
      router.push('/dashboard/user-management');
    } catch (err: any) {
      console.error('User creation error:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/user-management');
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading roles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={handleCancel}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New User</h1>
            <p className="text-gray-600 mt-1">Create a new user account</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow border border-blue-100">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error/Warning Message */}
            {error && (
              <div className={`px-4 py-3 rounded ${
                error.includes('Note:') 
                  ? 'bg-yellow-100 border border-yellow-400 text-yellow-800' 
                  : 'bg-red-100 border border-red-400 text-red-700'
              }`}>
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter first name"
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter last name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email address"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter password (min 6 characters)"
                required
                minLength={6}
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.displayName || role.name}
                  </option>
                ))}
              </select>
              {!hasRolePermissions && (
                <p className="mt-1 text-sm text-gray-600">
                  Only system roles are available. Ask your administrator about custom roles.
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}