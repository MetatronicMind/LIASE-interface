"use client";
import {
  ArrowPathIcon,
  TrashIcon,
  KeyIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

export default function ClientToolsPage() {
  const tools = [
    {
      name: "Clear Application Cache",
      description: "Force clear server-side cache for this client instance.",
      action: "Clear Cache",
      icon: ArrowPathIcon,
      danger: false,
    },
    {
      name: "Export Audit Logs",
      description: "Download a full history of all actions performed.",
      action: "Export CSV",
      icon: ArrowDownTrayIcon,
      danger: false,
    },
    {
      name: "Reset All User Sessions",
      description: "Force logout for all currently active users.",
      action: "Reset Sessions",
      icon: KeyIcon,
      danger: true,
    },
    {
      name: "Delete Archived Data",
      description: "Permanently remove data marked as archived > 1 year.",
      action: "Delete Data",
      icon: TrashIcon,
      danger: true,
    },
  ];

  return (
    <div className="max-w-4xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Client Tools & Utilities
      </h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-md divide-y divide-gray-200">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="px-6 py-4 flex items-center justify-between"
          >
            <div className="flex items-center">
              <div
                className={`p-2 rounded-full mr-4 ${tool.danger ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"}`}
              >
                <tool.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {tool.name}
                </h3>
                <p className="text-sm text-gray-500">{tool.description}</p>
              </div>
            </div>
            <button
              className={`px-4 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                tool.danger
                  ? "border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500"
                  : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500"
              }`}
            >
              {tool.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
