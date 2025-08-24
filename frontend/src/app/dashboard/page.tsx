"use client";
import { useState } from "react";
import {
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
  CheckCircleIcon,
  CubeIcon
} from "@heroicons/react/24/outline";

const stats = [
  { label: "Total Studies", value: 3, icon: <DocumentTextIcon className="w-8 h-8 text-blue-400" /> },
  { label: "Pending Review", value: 1, icon: <ClockIcon className="w-8 h-8 text-yellow-400" /> },
  { label: "Under Review", value: 1, icon: <EyeIcon className="w-8 h-8 text-blue-600" /> },
  { label: "Approved", value: 1, icon: <CheckCircleIcon className="w-8 h-8 text-green-500" /> },
  { label: "Active Drugs", value: 3, icon: <CubeIcon className="w-8 h-8 text-pink-400" /> },
];

const recentActivity = [
  { user: "System Administrator", action: "User admin logged in with role Admin", date: "17-Aug-2025" },
  { user: "System Administrator", action: "User admin logged in with role Admin", date: "01-Dec-2024" },
  { user: "John Smith", action: "User pv_user1 logged in with role Pharmacovigilance", date: "01-Dec-2024" },
  { user: "John Smith", action: "Added comment to study PMID: 38901235", date: "01-Dec-2024" },
  { user: "Sarah Johnson", action: "Approved study PMID: 38901236 for AOI reporting", date: "30-Nov-2024" },
];

export default function DashboardPage() {
  const [processing, setProcessing] = useState(false);

  const handleAIProcessing = () => {
    setProcessing(true);
    setTimeout(() => setProcessing(false), 2000); // Simulate async
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-white dark:from-[#101624] dark:via-[#18213a] dark:to-[#232b3e] min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-blue-900 dark:text-blue-100 mb-1">Dashboard</h1>
        <div className="text-blue-700 dark:text-blue-300 mb-8 font-medium">Welcome back, System Administrator</div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`rounded-xl shadow-sm border flex items-center gap-4 p-4 bg-white/90 dark:bg-[#232b3e] transition-transform duration-300 ease-out hover:scale-105 hover:-translate-y-1 active:scale-95 ${
                i === 0 ? 'border-blue-300 dark:border-blue-900' :
                i === 1 ? 'border-cyan-300 dark:border-cyan-900' :
                i === 2 ? 'border-sky-300 dark:border-sky-900' :
                i === 3 ? 'border-emerald-300 dark:border-emerald-900' :
                'border-pink-200 dark:border-pink-900'
              }`}
              style={{ willChange: 'transform' }}
            >
              <div>{stat.icon}</div>
              <div>
                <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-100">{stat.value}</div>
                <div className="text-blue-700 dark:text-blue-300 text-sm font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Processing Section */}
        <div className="bg-cyan-50 dark:bg-[#18213a] rounded-xl shadow border border-cyan-100 dark:border-cyan-900 mb-8 p-6">
          <div className="font-bold text-lg mb-2 text-cyan-900 dark:text-cyan-200">AI Processing</div>
          <div className="text-cyan-800 dark:text-cyan-100 mb-2">Process new studies from PubMed databases for all active drugs.</div>
          <div className="bg-blue-100 dark:bg-yellow-900/70 border-l-4 border-blue-400 dark:border-yellow-500 p-3 mb-4 text-sm text-blue-900 dark:text-yellow-100">
            <span className="font-semibold">Note:</span> AI processing typically runs automatically at midnight. Use this button for manual processing or testing.
          </div>
          <button
            className="bg-blue-600 dark:bg-green-700 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 dark:hover:bg-green-800 transition disabled:opacity-60"
            onClick={handleAIProcessing}
            disabled={processing}
          >
            {processing ? "Processing..." : "Start AI Processing"}
          </button>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white/90 dark:bg-[#232b3e] rounded-xl shadow border border-blue-100 dark:border-blue-900 p-6">
          <div className="font-bold text-lg mb-4 text-blue-900 dark:text-blue-100">Recent Activity</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <tbody>
                {recentActivity.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-b-0 border-blue-50 dark:border-blue-900">
                    <td className="py-2 px-2 whitespace-nowrap font-semibold text-blue-700 dark:text-blue-300 cursor-pointer hover:underline">{item.user}</td>
                    <td className="py-2 px-2 whitespace-nowrap text-blue-900 dark:text-blue-100">{item.action}</td>
                    <td className="py-2 px-2 whitespace-nowrap text-right text-cyan-600 dark:text-cyan-300">{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
