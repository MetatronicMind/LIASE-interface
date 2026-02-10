"use client";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedOrganizationId } from "@/redux/slices/filterSlice";
import { RootState } from "@/redux/store";
import { getApiBaseUrl } from "@/config/api";
import { useAuth } from "@/hooks/useAuth";

interface Organization {
  id: string;
  name: string;
}

export default function ClientSelector() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const selectedOrganizationId = useSelector(
    (state: RootState) => state.filter.selectedOrganizationId,
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is superadmin (either by role name or isSystemRole property if available)
    const isSuperAdmin =
      user?.role === "superadmin" || (user as any)?.isSystemRole;

    if (isSuperAdmin) {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const token =
        localStorage.getItem("auth_token") || localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${getApiBaseUrl()}/organizations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin =
    user?.role === "superadmin" || (user as any)?.isSystemRole;

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 bg-white p-2 rounded shadow-sm border border-gray-200 ml-4">
      <span className="text-sm font-medium text-gray-700">Client:</span>
      <select
        className="form-select text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 py-1"
        value={selectedOrganizationId || ""}
        onChange={(e) =>
          dispatch(setSelectedOrganizationId(e.target.value || null))
        }
        disabled={loading}
      >
        <option value="">Default (My Org)</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
