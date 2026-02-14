"use client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/components/PermissionProvider";

export default function DebugPermissionsPage() {
  const { user } = useAuth();
  const { hasPermission, isAdmin, isSuperAdmin } = usePermissions();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Permission Debug Page</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        <div className="space-y-2">
          <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
          <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
          <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
          <p><strong>Is Admin:</strong> {isAdmin() ? 'Yes' : 'No'}</p>
          <p><strong>Is SuperAdmin:</strong> {isSuperAdmin() ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Permissions Object (Raw)</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(user?.permissions, null, 2)}
        </pre>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Triage Permissions Check</h2>
        <div className="space-y-2">
          <p><strong>triage.read:</strong> {hasPermission('triage', 'read') ? '✅ Yes' : '❌ No'}</p>
          <p><strong>triage.write:</strong> {hasPermission('triage', 'write') ? '✅ Yes' : '❌ No'}</p>
          <p><strong>triage.classify:</strong> {hasPermission('triage', 'classify') ? '✅ Yes' : '❌ No'}</p>
          <p><strong>triage.manual_drug_test:</strong> {hasPermission('triage', 'manual_drug_test') ? '✅ Yes' : '❌ No'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">All Permission Checks</h2>
        <div className="grid grid-cols-2 gap-4">
          {user?.permissions && Object.keys(user.permissions).map((resource) => (
            <div key={resource} className="border rounded p-3">
              <h3 className="font-semibold text-lg mb-2">{resource}</h3>
              <div className="space-y-1 text-sm">
                {user?.permissions?.[resource] && Object.keys(user.permissions[resource]).map((action) => (
                  <p key={action}>
                    <span className="text-gray-600">{action}:</span>{' '}
                    <span className={user.permissions?.[resource]?.[action] ? 'text-green-600' : 'text-red-600'}>
                      {user.permissions?.[resource]?.[action] ? '✅' : '❌'}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Troubleshooting</h3>
        <p className="text-sm text-yellow-700">
          If you don't see <strong>triage.write = ✅</strong> above, your admin role doesn't have the triage permissions assigned. 
          You may need to:
        </p>
        <ol className="list-decimal ml-6 mt-2 text-sm text-yellow-700">
          <li>Log out and log back in to refresh permissions</li>
          <li>Check that your role in the database has triage permissions</li>
          <li>Ask a superadmin to update your role's permissions</li>
        </ol>
      </div>
    </div>
  );
}
