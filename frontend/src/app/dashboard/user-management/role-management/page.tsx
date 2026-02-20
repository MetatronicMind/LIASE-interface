"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  CogIcon,
  TrashIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";
import {
  PermissionGate,
  useConditionalPermissions,
} from "@/components/PermissionProvider";
import { roleService } from "@/services/roleService";
import RoleDebugTab from "@/components/RoleDebugTab";

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

const countActiveResources = (permissions: Record<string, any> | undefined) => {
  if (!permissions) return 0;
  return Object.values(permissions).filter((resourcePermissions) => {
    // Check if the resource object has any action set to true
    if (
      typeof resourcePermissions === "object" &&
      resourcePermissions !== null
    ) {
      return Object.values(resourcePermissions).some((value) => value === true);
    }
    return false;
  }).length;
};

export default function RoleManagementPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStructure>({});
  const [activeTab, setActiveTab] = useState<"manage" | "debug">("manage");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<
    Record<string, any>
  >({});
  const { canManageRoles, canDeleteRoles } = useConditionalPermissions();

  // Template role form state
  const [templateRole, setTemplateRole] = useState({
    customName: "",
    displayName: "",
    description: "",
    selectedTemplate: "",
  });

  // Create role form state
  const [newRole, setNewRole] = useState({
    name: "",
    displayName: "",
    description: "",
    permissions: {} as Record<string, Record<string, boolean>>,
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissionStructure();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const templates = await roleService.getPermissionTemplates();
      setAvailableTemplates(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await roleService.getRoles();
      setRoles(data);
      setError(null);
    } catch (err: any) {
      console.error("Role fetch error:", err);
      if (
        err.message?.includes("Invalid token") ||
        err.message?.includes("TOKEN_INVALID")
      ) {
        setError("Your session has expired. Please log in again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        setError(err.message || "Failed to fetch roles");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionStructure = async () => {
    try {
      const structure = await roleService.getPermissionStructure();
      setPermissions(structure);

      // Initialize new role permissions with all false
      const initialPermissions: Record<string, Record<string, boolean>> = {};
      Object.keys(structure).forEach((resource) => {
        initialPermissions[resource] = {};
        Object.keys(structure[resource].actions).forEach((action) => {
          initialPermissions[resource][action] = false;
        });
      });
      setNewRole((prev) => ({ ...prev, permissions: initialPermissions }));
    } catch (err: any) {
      console.error("Permission structure fetch error:", err);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.displayName) {
      setError("Role name and display name are required");
      return;
    }

    try {
      await roleService.createRole({
        name: newRole.name,
        displayName: newRole.displayName,
        description: newRole.description,
        permissions: newRole.permissions,
      });

      setShowCreateModal(false);
      setNewRole({
        name: "",
        displayName: "",
        description: "",
        permissions: {},
      });
      await fetchRoles();
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to create role");
    }
  };

  const handleCreateTemplateRole = async () => {
    if (
      !templateRole.customName ||
      !templateRole.displayName ||
      !templateRole.selectedTemplate
    ) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      await roleService.createRoleFromTemplate({
        customName: templateRole.customName,
        customDisplayName: templateRole.displayName,
        permissionTemplate: templateRole.selectedTemplate,
        description: templateRole.description,
      });

      setShowTemplateModal(false);
      setTemplateRole({
        customName: "",
        displayName: "",
        description: "",
        selectedTemplate: "",
      });
      await fetchRoles();
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to create role");
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) {
      return;
    }

    try {
      await roleService.deleteRole(roleId);
      await fetchRoles();
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete role");
    }
  };

  const handlePermissionChange = (
    resource: string,
    action: string,
    value: boolean,
  ) => {
    setNewRole((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: {
          ...prev.permissions[resource],
          [action]: value,
        },
      },
    }));
  };

  const getRoleTypeIcon = (isSystemRole: boolean) => {
    return isSystemRole ? (
      <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <CogIcon className="w-4 h-4 text-gray-600" />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-6">
        <div className="max-w-6xl mx-auto">
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-1 tracking-wider drop-shadow-sm">
              Role Management
            </h1>
            <div className="text-gray-600 text-base font-medium">
              Create and manage user roles and permissions
            </div>
          </div>
          <PermissionGate resource="roles" action="write">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2 rounded-lg shadow transition flex items-center gap-2"
                onClick={() => setShowTemplateModal(true)}
              >
                <ShieldCheckIcon className="w-5 h-5" />
                Create from Template
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg shadow transition flex items-center gap-2"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon className="w-5 h-5" />
                Create Custom Role
              </button>
            </div>
          </PermissionGate>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("manage")}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === "manage"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CogIcon className="w-4 h-4" />
                  Manage Roles
                </div>
              </button>
              <button
                onClick={() => setActiveTab("debug")}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === "debug"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {/* <div className="flex items-center gap-2">
                  <WrenchScrewdriverIcon className="w-4 h-4" />
                  Debug & Tools
                </div> */}
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "manage" && (
          <div className="bg-white rounded-xl shadow border border-blue-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">
                      Role
                    </th>
                    <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">
                      Type
                    </th>
                    <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">
                      Description
                    </th>
                    <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">
                      Permissions
                    </th>
                    <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr
                      key={role.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4">
                        <div className="font-semibold text-gray-900">
                          {role.displayName}
                        </div>
                        <div className="text-sm text-gray-500">{role.name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getRoleTypeIcon(role.isSystemRole)}
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              role.isSystemRole
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {role.isSystemRole ? "System" : "Custom"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {role.description || "No description"}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs text-gray-500">
                          {countActiveResources(role.permissions)} resources
                          configured
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/user-management/role-management/edit-role?id=${role.id}`,
                              )
                            }
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit Role"
                          >
                            <CogIcon className="w-4 h-4" />
                          </button>
                          {!role.isSystemRole && (
                            <PermissionGate resource="roles" action="delete">
                              <button
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                onClick={() =>
                                  handleDeleteRole(role.id, role.displayName)
                                }
                                title="Delete Role"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </PermissionGate>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {roles.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-gray-500"
                      >
                        No roles found. Create your first role to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Debug Tab Content */}
        {activeTab === "debug" && (
          <RoleDebugTab
            roles={roles}
            onRolesChange={fetchRoles}
            onError={setError}
          />
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Create New Role
              </h2>
              <p className="text-gray-600 mt-1">
                Define a custom role with specific permissions
              </p>
            </div>

            <div className="p-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name (Internal) *
                  </label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) =>
                      setNewRole((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., custom_analyst"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={newRole.displayName}
                    onChange={(e) =>
                      setNewRole((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Data Analyst"
                  />
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) =>
                    setNewRole((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe what this role is for..."
                />
              </div>

              {/* Permissions Grid */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Permissions
                </h3>
                <div className="space-y-6">
                  {Object.entries(permissions).map(([resource, config]) => (
                    <div
                      key={resource}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {config.displayName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {config.description}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(config.actions).map(
                          ([action, label]) => (
                            <label
                              key={action}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  newRole.permissions[resource]?.[action] ||
                                  false
                                }
                                onChange={(e) =>
                                  handlePermissionChange(
                                    resource,
                                    action,
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {label}
                              </span>
                            </label>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRole({
                      name: "",
                      displayName: "",
                      description: "",
                      permissions: {},
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Role from Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Create Role from Template
              </h2>
              <p className="text-gray-600 mt-2">
                Choose a predefined template and customize the role name
              </p>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name *{" "}
                    <span className="text-xs text-gray-500">
                      (e.g., TRIAGE, QA_TEAM)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={templateRole.customName}
                    onChange={(e) =>
                      setTemplateRole((prev) => ({
                        ...prev,
                        customName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter custom role name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={templateRole.displayName}
                    onChange={(e) =>
                      setTemplateRole((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter display name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Template *
                </label>
                <select
                  value={templateRole.selectedTemplate}
                  onChange={(e) =>
                    setTemplateRole((prev) => ({
                      ...prev,
                      selectedTemplate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a template...</option>
                  {Object.entries(availableTemplates).map(
                    ([key, template]: [string, any]) => (
                      <option key={key} value={key}>
                        {template.displayName} - {template.description}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={templateRole.description}
                  onChange={(e) =>
                    setTemplateRole((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe the purpose of this role..."
                />
              </div>

              {/* Template Preview */}
              {templateRole.selectedTemplate &&
                availableTemplates[templateRole.selectedTemplate] && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 text-sm mb-2">
                      Template Preview:
                    </h4>
                    <p className="text-blue-700 text-sm mb-2">
                      {
                        availableTemplates[templateRole.selectedTemplate]
                          .description
                      }
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {availableTemplates[templateRole.selectedTemplate]
                        .permissions?.triage?.classify && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Can classify studies
                        </span>
                      )}
                      {availableTemplates[templateRole.selectedTemplate]
                        .permissions?.triage?.manual_drug_test && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Can run manual drug tests
                        </span>
                      )}
                      {availableTemplates[templateRole.selectedTemplate]
                        .permissions?.QC?.approve && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Can approve classifications
                        </span>
                      )}
                      {availableTemplates[templateRole.selectedTemplate]
                        .permissions?.QC?.reject && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Can reject classifications
                        </span>
                      )}
                      {availableTemplates[templateRole.selectedTemplate]
                        .permissions?.data_entry?.r3_form && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Can fill R3 forms
                        </span>
                      )}
                      {availableTemplates[templateRole.selectedTemplate]
                        .permissions?.medical_examiner?.comment_fields && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Can comment on fields
                        </span>
                      )}
                      {availableTemplates[templateRole.selectedTemplate]
                        .permissions?.medical_examiner?.revoke_studies && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Can revoke studies
                        </span>
                      )}
                    </div>
                  </div>
                )}

              {/* Quick Create Buttons */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Quick Create Common Roles:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setTemplateRole({
                        customName: "TRIAGE",
                        displayName: "Triage Team",
                        selectedTemplate: "triage_specialist",
                        description:
                          "Team responsible for classifying studies and running manual drug tests",
                      })
                    }
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm"
                  >
                    Create TRIAGE Role
                  </button>
                  <button
                    onClick={() =>
                      setTemplateRole({
                        customName: "QC",
                        displayName: "Quality Assurance",
                        selectedTemplate: "qa_reviewer",
                        description:
                          "Team responsible for reviewing and approving study classifications",
                      })
                    }
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm"
                  >
                    Create QC Role
                  </button>
                  <button
                    onClick={() =>
                      setTemplateRole({
                        customName: "DATA_ENTRY",
                        displayName: "Data Entry Team",
                        selectedTemplate: "data_entry_specialist",
                        description:
                          "Team responsible for filling R3 forms for approved ICSR studies",
                      })
                    }
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm"
                  >
                    Create DATA ENTRY Role
                  </button>
                  <button
                    onClick={() =>
                      setTemplateRole({
                        customName: "MEDICAL_EXAMINER",
                        displayName: "Medical Reviewer",
                        selectedTemplate: "medical_reviewer",
                        description:
                          "Team responsible for final review, commenting, and study revocation",
                      })
                    }
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm"
                  >
                    Create Medical Reviewer Role
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setTemplateRole({
                      customName: "",
                      displayName: "",
                      description: "",
                      selectedTemplate: "",
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTemplateRole}
                  disabled={
                    !templateRole.customName ||
                    !templateRole.displayName ||
                    !templateRole.selectedTemplate
                  }
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Role from Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
