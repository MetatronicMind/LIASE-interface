"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  DocumentTextIcon,
  ClockIcon,
  EyeIcon,
  CheckCircleIcon,
  CubeIcon,
  UserGroupIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon
} from "@heroicons/react/24/outline";
import { API_CONFIG } from "@/config/api";
import { useDateTime } from '@/hooks/useDateTime';
import { useAuth } from "@/hooks/useAuth";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";

interface Stats {
  total: number;
  pendingReview: number;
  underReview: number;
  approved: number;
  rejected: number;
  activeDrugs?: number;
  counts?: {
    users: number;
    medicalReviewers: number;
    drugs: number;
    qaReviewed: number;
  };
  qaStats?: {
    pending: number;
    approvedManual: number;
    approvedAuto: number;
    rejected: number;
    manualQc: number;
  };
  medicalReviewStats?: {
    notStarted: number;
    inProgress: number;
    completed: number;
  };
  r3Stats?: {
    notStarted: number;
    inProgress: number;
    completed: number;
  };
  byDrug?: Record<string, number>;
  byMonth?: Record<string, number>;
  byUser?: Record<string, number>;
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
  const { user } = useAuth();
  const selectedOrganizationId = useSelector((state: RootState) => state.filter.selectedOrganizationId);
  const { formatDate: formatDateGlobal } = useDateTime();
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

  useEffect(() => {
    fetchDashboardData();
  }, [selectedOrganizationId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      
      if (!token) {
        console.error("No token found");
        setLoading(false);
        return;
      }

      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      const queryParams = selectedOrganizationId ? `?organizationId=${selectedOrganizationId}` : '';
      const queryParamsAmp = selectedOrganizationId ? `&organizationId=${selectedOrganizationId}` : '';

      // Fetch study statistics
      const statsResponse = await fetch(`${API_CONFIG.BASE_URL}/studies/stats/summary${queryParams}`, { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        
        // Fetch active drugs count
        const drugsResponse = await fetch(`${API_CONFIG.BASE_URL}/drugs?limit=1000${queryParamsAmp}`, { headers });
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
          activeDrugs: activeDrugsCount,
          counts: statsData.counts,
          qaStats: statsData.qaStats,
          medicalReviewStats: statsData.medicalReviewStats,
          r3Stats: statsData.r3Stats,
          byDrug: statsData.byDrug,
          byMonth: statsData.byMonth,
          byUser: statsData.byUser
        });
      }

      // Fetch recent audit logs
      const auditResponse = await fetch(`${API_CONFIG.BASE_URL}/audit?limit=5&sortOrder=desc${queryParamsAmp}`, { headers });
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
    // Use global formatter for consistency
    return formatDateGlobal(isoString);
  };

  const formatAction = (log: AuditLog) => {
    if (log.details) {
      return log.details;
    }
    return `${log.action} on ${log.resource || 'resource'}`;
  };

  const statsArray = [
    { label: "Total Users", value: stats.counts?.users || 0, icon: <UserGroupIcon className="w-8 h-8 text-blue-500" /> },
    { label: "Medical Reviewers", value: stats.counts?.medicalReviewers || 0, icon: <EyeIcon className="w-8 h-8 text-purple-500" /> },
    { label: "Total Drugs", value: stats.counts?.drugs || 0, icon: <BeakerIcon className="w-8 h-8 text-green-500" /> },
    { label: "QA Reviewed Cases", value: stats.counts?.qaReviewed || 0, icon: <ClipboardDocumentCheckIcon className="w-8 h-8 text-orange-500" /> },
  ];

  const handleAIProcessing = () => {
    setProcessing(true);
    setTimeout(() => setProcessing(false), 2000); // Simulate async
  };

  return (
    <div className="bg-gray-50 h-screen flex flex-col overflow-hidden">
      <div className="flex-none p-4 sm:p-6 bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Overview for {user?.firstName || "User"}</p>
            </div>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-60 shadow-sm"
              onClick={handleAIProcessing}
              disabled={processing}
            >
              {processing ? "Processing..." : "Start AI Processing"}
            </button>
          </div>

          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsArray.map((stat, i) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-2 bg-gray-50 rounded-lg">{stat.icon}</div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="max-w-7xl mx-auto h-full">
          {!loading && <AnalyticsCharts stats={stats} />}
        </div>
      </div>
    </div>
  );
}
