"use client";
import { useState, useEffect } from "react";
import { BuildingOfficeIcon, PencilIcon, UsersIcon, CalendarIcon } from "@heroicons/react/24/solid";
import { useDateTime } from '@/hooks/useDateTime';
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/components/PermissionProvider";
import { getApiBaseUrl } from '@/config/api';

interface Organization {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
}

export default function OrganizationManagementTab() {
  const { formatDate } = useDateTime();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  });

  const canWrite = hasPermission('organizations', 'write');

  useEffect(() => {
    if (user?.organizationId) {
      fetchOrganization();
    }
  }, [user]);

  const fetchOrganization = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/organizations/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
        setFormData({
          name: data.name || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          address: data.address || ''
        });
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Organization fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 401) {
          setError(`Authentication failed: ${errorData.error || 'Unauthorized'}. Please log in again.`);
        } else {
          setError(errorData.error || 'Failed to fetch organization');
        }
      }
    } catch (err: any) {
      console.error('Organization fetch error:', err);
      setError(err.message || 'Failed to fetch organization details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canWrite) {
      alert("You don't have permission to update organization details");
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getApiBaseUrl()}/organizations/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchOrganization();
        setEditMode(false);
        setError(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update organization');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading organization details...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BuildingOfficeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>No organization found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BuildingOfficeIcon className="w-7 h-7 text-blue-600" />
            Organization Management
          </h2>
          <p className="text-gray-600 mt-1">View and manage your organization details</p>
        </div>
        {!editMode && canWrite && (
          <button
            onClick={() => setEditMode(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg shadow transition flex items-center gap-2"
          >
            <PencilIcon className="w-5 h-5" />
            Edit Organization
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Organization Details */}
      {!editMode ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Organization Name */}
          <div>
            <label className="text-sm font-semibold text-gray-500 uppercase">Organization Name</label>
            <p className="text-lg font-bold text-gray-900 mt-1">{organization.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Email */}
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase">Contact Email</label>
              <p className="text-gray-900 mt-1">{organization.contactEmail || 'Not provided'}</p>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase">Contact Phone</label>
              <p className="text-gray-900 mt-1">{organization.contactPhone || 'Not provided'}</p>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-semibold text-gray-500 uppercase">Address</label>
            <p className="text-gray-900 mt-1">{organization.address || 'Not provided'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
            {/* Created Date */}
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <div>
                <label className="text-sm font-semibold text-gray-500">Created</label>
                <p className="text-gray-900">{formatDate(organization.createdAt)}</p>
              </div>
            </div>

            {/* User Count */}
            {organization.userCount !== undefined && (
              <div className="flex items-center gap-3">
                <UsersIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <label className="text-sm font-semibold text-gray-500">Total Users</label>
                  <p className="text-gray-900">{organization.userCount}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit Form */
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg shadow transition"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setFormData({
                  name: organization.name || '',
                  contactEmail: organization.contactEmail || '',
                  contactPhone: organization.contactPhone || '',
                  address: organization.address || ''
                });
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-6 py-2.5 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
