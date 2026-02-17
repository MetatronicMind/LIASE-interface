"use client";

import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export default function ClientOverviewPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Client Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">System Status</h3>
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">Operational</p>
          <p className="text-xs text-green-600 mt-1">100% Uptime (30d)</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Active Users</h3>
            <UserGroupIcon className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">124</p>
          <p className="text-xs text-gray-500 mt-1">+12 this week</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Pending Tasks</h3>
            <ClockIcon className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">8</p>
          <p className="text-xs text-gray-500 mt-1">Requires attention</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Issues</h3>
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500 mt-1">No critical issues</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-start pb-4 border-b border-gray-50 last:border-0 last:pb-0"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold mr-3">
                  JD
                </div>
                <div>
                  <p className="text-sm text-gray-800 font-medium">
                    John Doe updated settings
                  </p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Resource Usage
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Storage</span>
                <span className="text-gray-900 font-medium">45%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: "45%" }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">API Calls</span>
                <span className="text-gray-900 font-medium">72%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: "72%" }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Database</span>
                <span className="text-gray-900 font-medium">28%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: "28%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
