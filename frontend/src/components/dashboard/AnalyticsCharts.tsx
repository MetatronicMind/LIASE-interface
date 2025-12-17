import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AnalyticsChartsProps {
  stats: {
    total: number;
    pendingReview: number;
    underReview: number;
    approved: number;
    rejected: number;
    byDrug?: Record<string, number>;
    byMonth?: Record<string, number>;
    byUser?: Record<string, number>;
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
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const QA_COLORS = ['#FFBB28', '#00C49F', '#82ca9d', '#FF8042', '#8884d8'];

export default function AnalyticsCharts({ stats }: AnalyticsChartsProps) {
  // Prepare data for charts
  const statusData = [
    { name: 'Pending Review', value: stats.pendingReview },
    { name: 'Under Review', value: stats.underReview },
    { name: 'Approved', value: stats.approved },
    { name: 'Rejected', value: stats.rejected },
  ].filter(item => item.value > 0);

  const qaData = stats.qaStats ? [
    { name: 'Pending QC', value: stats.qaStats.pending },
    { name: 'Manual Approved', value: stats.qaStats.approvedManual },
    { name: 'Auto Approved', value: stats.qaStats.approvedAuto },
    { name: 'QC Rejected', value: stats.qaStats.rejected },
    { name: 'Manual QC', value: stats.qaStats.manualQc },
  ].filter(item => item.value > 0) : [];

  const workflowData = [
    {
      name: 'Medical Review',
      Pending: stats.medicalReviewStats?.notStarted || 0,
      InProgress: stats.medicalReviewStats?.inProgress || 0,
      Completed: stats.medicalReviewStats?.completed || 0,
    },
    {
      name: 'R3 Form',
      Pending: stats.r3Stats?.notStarted || 0,
      InProgress: stats.r3Stats?.inProgress || 0,
      Completed: stats.r3Stats?.completed || 0,
    }
  ];

  const drugData = Object.entries(stats.byDrug || {}).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value).slice(0, 10); // Top 10 drugs

  const monthData = Object.entries(stats.byMonth || {}).map(([month, value]) => ({
    name: month,
    value
  })).sort((a, b) => a.name.localeCompare(b.name));

  const userData = Object.entries(stats.byUser || {}).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value).slice(0, 10);

  if (statusData.length === 0 && drugData.length === 0 && monthData.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
      {/* Status Distribution */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Study Status</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius="80%"
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* QA Performance */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">QC Performance</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={qaData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius="80%"
                fill="#8884d8"
                dataKey="value"
              >
                {qaData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={QA_COLORS[index % QA_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Workflow Progress</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workflowData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="name" type="category" width={100} fontSize={12} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Pending" stackId="a" fill="#FFBB28" />
              <Bar dataKey="InProgress" stackId="a" fill="#0088FE" />
              <Bar dataKey="Completed" stackId="a" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Studies Over Time */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Studies Trend</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Drugs */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Top Drugs</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={drugData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={130} 
                fontSize={11} 
                interval={0}
                tick={{ fill: '#374151' }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Studies by User */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">User Activity</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={userData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={12} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={130} 
                fontSize={11} 
                interval={0}
                tick={{ fill: '#374151' }}
              />
              <Tooltip />
              <Bar dataKey="value" fill="#ffc658" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
