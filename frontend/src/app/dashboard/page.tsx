"use client";
import { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
  CheckCircleIcon,
  CubeIcon
} from "@heroicons/react/24/outline";

interface Stats {
  total: number;
  pendingReview: number;
  underReview: number;
  approved: number;
  rejected: number;
  activeDrugs?: number;
}

interface AuditLog {
  id: string;
  userName: string;
  action: string;
  timestamp: string;
  resource?: string;
  details?: string;
}

export default function DashboardPage() {
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pendingReview: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    activeDrugs: 0
  });
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.error("No token found");
        setLoading(false);
        return;
      }

      // Get user info from token
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        setUserName(payload.name || payload.username || "User");
      } catch (e) {
        console.error("Error decoding token:", e);
      }

      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      // Fetch study statistics
      const statsResponse = await fetch("/api/studies/stats/summary", { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        
        // Fetch active drugs count
        const drugsResponse = await fetch("/api/drugs?limit=1000", { headers });
        let activeDrugsCount = 0;
        if (drugsResponse.ok) {
          const drugsData = await drugsResponse.json();
          activeDrugsCount = drugsData.drugs?.filter((d: any) => d.status === 'active').length || drugsData.drugs?.length || 0;
        }
        
        setStats({
          total: statsData.total || 0,
          pendingReview: statsData.pendingReview || 0,
          underReview: statsData.underReview || 0,
          approved: statsData.approved || 0,
          rejected: statsData.rejected || 0,
          activeDrugs: activeDrugsCount
        });
      }

      // Fetch recent audit logs
      const auditResponse = await fetch("/api/audit?limit=5&sortOrder=desc", { headers });
      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        setRecentActivity(auditData.auditLogs || []);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatAction = (log: AuditLog) => {
    if (log.details) {
      return log.details;
    }
    return `${log.action} on ${log.resource || 'resource'}`;
  };

  const statsArray = [
    { label: "Total Studies", value: stats.total, icon: <DocumentTextIcon className="w-8 h-8 text-blue-400" /> },
    { label: "Pending Review", value: stats.pendingReview, icon: <ClockIcon className="w-8 h-8 text-yellow-400" /> },
    { label: "Under Review", value: stats.underReview, icon: <EyeIcon className="w-8 h-8 text-blue-600" /> },
    { label: "Approved", value: stats.approved, icon: <CheckCircleIcon className="w-8 h-8 text-green-500" /> },
    { label: "Active Drugs", value: stats.activeDrugs || 0, icon: <CubeIcon className="w-8 h-8 text-pink-400" /> },
  ];

  const handleAIProcessing = () => {
    setProcessing(true);
    setTimeout(() => setProcessing(false), 2000); // Simulate async
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-white min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-blue-900 mb-1">Dashboard</h1>
        <div className="text-blue-700 mb-8 font-medium">Welcome back, {userName}</div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {statsArray.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`rounded-xl shadow-sm border flex items-center gap-4 p-4 bg-white/90 transition-transform duration-300 ease-out hover:scale-105 hover:-translate-y-1 active:scale-95 ${
                    i === 0 ? 'border-blue-300' :
                    i === 1 ? 'border-cyan-300' :
                    i === 2 ? 'border-sky-300' :
                    i === 3 ? 'border-emerald-300' :
                    'border-pink-200'
                  }`}
                  style={{ willChange: 'transform' }}
                >
                  <div>{stat.icon}</div>
                  <div>
                    <div className="text-2xl font-extrabold text-blue-900">{stat.value}</div>
                    <div className="text-blue-700 text-sm font-medium">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Processing Section */}
            <div className="bg-cyan-50 rounded-xl shadow border border-cyan-100 mb-8 p-6">
              <div className="font-bold text-lg mb-2 text-cyan-900">AI Processing</div>
              <div className="text-cyan-800 mb-2">Process new studies from PubMed databases for all active drugs.</div>
              <div className="bg-blue-100 border-l-4 border-blue-400 p-3 mb-4 text-sm text-blue-900">
                <span className="font-semibold">Note:</span> AI processing typically runs automatically at midnight. Use this button for manual processing or testing.
              </div>
              <button
                className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                onClick={handleAIProcessing}
                disabled={processing}
              >
                {processing ? "Processing..." : "Start AI Processing"}
              </button>
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white/90 rounded-xl shadow border border-blue-100 p-6">
              <div className="font-bold text-lg mb-4 text-blue-900">Recent Activity</div>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No recent activity</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <tbody>
                      {recentActivity.map((item, idx) => (
                        <tr key={item.id || idx} className="border-b last:border-b-0 border-blue-50">
                          <td className="py-2 px-2 whitespace-nowrap font-semibold text-blue-700 cursor-pointer hover:underline">{item.userName}</td>
                          <td className="py-2 px-2 whitespace-nowrap text-blue-900">{formatAction(item)}</td>
                          <td className="py-2 px-2 whitespace-nowrap text-right text-cyan-600">{formatDate(item.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
