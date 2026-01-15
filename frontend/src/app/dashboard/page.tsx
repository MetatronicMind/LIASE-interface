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
  ClipboardDocumentCheckIcon,
  InboxIcon,
  QueueListIcon,
  PencilSquareIcon,
  DocumentCheckIcon,
  CheckBadgeIcon
} from "@heroicons/react/24/outline";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { API_CONFIG } from "@/config/api";
import { useDateTime } from '@/hooks/useDateTime';
import { useAuth } from "@/hooks/useAuth";
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import { PermissionGate } from "@/components/PermissionProvider";

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
  tagStats?: {
    icsr: number;
    aoi: number;
    noCase: number;
  };
  processedToday?: number;
  dateStats?: {
    selectedDate: string;
    totalCreated: number;
    aiClassification: {
      icsr: number;
      aoi: number;
      noCase: number;
      other: number;
    };
    triageClassification: {
      icsr: number;
      aoi: number;
      noCase: number;
      unclassified: number;
    };
  };
  workflowStats?: {
    triage: number;
    qcAllocation: number;
    qcTriage: number;
    dataEntry: number;
    qcDataEntry: number;
    medicalReview: number;
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

const COLORS = ['#3b82f6', '#8b5cf6', '#6b7280', '#e5e7eb']; // Blue, Purple, Gray, LightGray

export default function DashboardPage() {
  const { user } = useAuth();
  const selectedOrganizationId = useSelector((state: RootState) => state.filter.selectedOrganizationId);
  const { formatDate: formatDateGlobal } = useDateTime();
  const [processing, setProcessing] = useState(false);
  // Default to today in YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
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
  }, [selectedOrganizationId, selectedDate]);

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

      const dateQuery = selectedDate ? `&date=${selectedDate}` : '';
      const queryParams = selectedOrganizationId ? `?organizationId=${selectedOrganizationId}${dateQuery}` : `?${dateQuery.substring(1)}`;
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
          tagStats: statsData.tagStats,
          processedToday: statsData.processedToday,
          dateStats: statsData.dateStats,
          workflowStats: statsData.workflowStats,
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

  const aiData = [
    { name: 'ICSR', value: stats.dateStats?.aiClassification.icsr || 0 },
    { name: 'AOI', value: stats.dateStats?.aiClassification.aoi || 0 },
    { name: 'No Case', value: stats.dateStats?.aiClassification.noCase || 0 },
    { name: 'Other', value: stats.dateStats?.aiClassification.other || 0 },
  ].filter(d => d.value > 0);

  const triageData = [
    { name: 'ICSR', value: stats.dateStats?.triageClassification.icsr || 0 },
    { name: 'AOI', value: stats.dateStats?.triageClassification.aoi || 0 },
    { name: 'No Case', value: stats.dateStats?.triageClassification.noCase || 0 },
    { name: 'Uncl.', value: stats.dateStats?.triageClassification.unclassified || 0 },
  ].filter(d => d.value > 0);

  const workflowBoxes = [
    { label: "Triage", value: stats.workflowStats?.triage || 0, icon: InboxIcon, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "QC Allocation", value: stats.workflowStats?.qcAllocation || 0, icon: QueueListIcon, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "QC Triage", value: stats.workflowStats?.qcTriage || 0, icon: ClipboardDocumentCheckIcon, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Data Entry", value: stats.workflowStats?.dataEntry || 0, icon: PencilSquareIcon, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "QC Data Entry", value: stats.workflowStats?.qcDataEntry || 0, icon: DocumentCheckIcon, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Medical Review", value: stats.workflowStats?.medicalReview || 0, icon: UserGroupIcon, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Completed", value: stats.workflowStats?.completed || 0, icon: CheckBadgeIcon, color: "text-green-600", bg: "bg-green-50" }
  ];

  return (
    <PermissionGate 
      resource="dashboard" 
      action="read"
        fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-500">Access Denied</div>
        </div>
      }
    >
      <div className="bg-gray-50 h-screen flex flex-col overflow-hidden">
        {/* Header Section */}
        <div className="flex-none p-4 sm:p-6 bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">Overview for {user?.firstName || "User"}</p>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-sm font-medium text-gray-700">Select Date:</span>
                 <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                 />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* DATE SPECIFIC STATS */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Statistics for {new Date(selectedDate).toLocaleDateString()}</h2>
                    <span className="text-sm text-gray-500">
                        {stats.dateStats?.totalCreated === 0 ? "No articles created on this date" : ""}
                    </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Created Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                        <div className="p-4 bg-blue-100 rounded-full mb-4">
                            <ClockIcon className="w-10 h-10 text-blue-700" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700">Articles Created</h3>
                        <p className="text-4xl font-bold text-gray-900 mt-2">{stats.dateStats?.totalCreated || 0}</p>
                    </div>

                    {/* AI Classification Graph */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-h-[300px] flex flex-col">
                        <h3 className="text-md font-medium text-gray-700 mb-4 text-center">AI Classification</h3>
                        <div className="flex-1 w-full h-full min-h-[220px]">
                           {aiData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                 <Pie
                                   data={aiData}
                                   cx="50%"
                                   cy="50%"
                                   innerRadius={60}
                                   outerRadius={80}
                                   fill="#8884d8"
                                   paddingAngle={5}
                                   dataKey="value"
                                   label={({name, percent}: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                 >
                                   {aiData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                   ))}
                                 </Pie>
                                 <Tooltip />
                                 <Legend />
                               </PieChart>
                             </ResponsiveContainer>
                           ) : (
                               <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data available</div>
                           )}
                        </div>
                    </div>

                    {/* Triage Classification Graph */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-h-[300px] flex flex-col">
                        <h3 className="text-md font-medium text-gray-700 mb-4 text-center">Triage Classification</h3>
                        <div className="flex-1 w-full h-full min-h-[220px]">
                           {triageData.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                 <Pie
                                   data={triageData}
                                   cx="50%"
                                   cy="50%"
                                   innerRadius={60}
                                   outerRadius={80}
                                   fill="#8884d8"
                                   paddingAngle={5}
                                   dataKey="value"
                                   label={({name, percent}: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                 >
                                   {triageData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                   ))}
                                 </Pie>
                                 <Tooltip />
                                 <Legend />
                               </PieChart>
                             </ResponsiveContainer>
                           ) : (
                               <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data available</div>
                           )}
                        </div>
                    </div>
                </div>
            </section>

            {/* WORKFLOW STATUS BOXES */}
            <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Workflow Status</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {workflowBoxes.map((box) => (
                        <div key={box.label} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center hover:shadow-md transition-shadow">
                            <div className={`p-2 rounded-full mb-3 ${box.bg}`}>
                                <box.icon className={`w-6 h-6 ${box.color}`} />
                            </div>
                            <span className="text-xs font-medium text-gray-500 text-center mb-1 h-8 flex items-center">{box.label}</span>
                            <span className={`text-2xl font-bold ${box.color}`}>{box.value}</span>
                        </div>
                    ))}
                </div>
            </section>

          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
