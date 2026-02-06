"use client";
import { useState } from "react";

function Toggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="pr-4">
        <h3 className="text-sm font-medium text-gray-900">{label}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        className={`${
          enabled ? "bg-indigo-600" : "bg-gray-200"
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
        onClick={() => onChange(!enabled)}
      >
        <span
          aria-hidden="true"
          className={`${
            enabled ? "translate-x-5" : "translate-x-0"
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  );
}

export default function ClientSettingsPage() {
  const [settings, setSettings] = useState({
    mfa: true,
    sso: false,
    auditLog: true,
    ipRestriction: false,
    sessionTimeout: true,
    maintenanceMode: false,
  });

  const handleChange = (key: keyof typeof settings) => (val: boolean) => {
    setSettings({ ...settings, [key]: val });
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Client Settings
      </h2>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Security
          </h3>
          <Toggle
            label="Multi-Factor Authentication (MFA)"
            description="Enforce MFA for all users in this client organization."
            enabled={settings.mfa}
            onChange={handleChange("mfa")}
          />
          <Toggle
            label="Single Sign-On (SSO)"
            description="Enable SSO integration (SAML/OIDC)."
            enabled={settings.sso}
            onChange={handleChange("sso")}
          />
          <Toggle
            label="IP Restriction"
            description="Restrict access to specific IP ranges."
            enabled={settings.ipRestriction}
            onChange={handleChange("ipRestriction")}
          />
        </div>

        <div className="p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Compliance
          </h3>
          <Toggle
            label="Detailed Audit Logging"
            description="Log all user actions for compliance reporting."
            enabled={settings.auditLog}
            onChange={handleChange("auditLog")}
          />
          <Toggle
            label="Session Timeout"
            description="Automatically log out users after inactivity."
            enabled={settings.sessionTimeout}
            onChange={handleChange("sessionTimeout")}
          />
        </div>

        <div className="p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            System
          </h3>
          <Toggle
            label="Maintenance Mode"
            description="Prevent users from logging in during maintenance."
            enabled={settings.maintenanceMode}
            onChange={handleChange("maintenanceMode")}
          />
        </div>

        <div className="p-6 bg-gray-50 rounded-b-lg flex justify-end">
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
