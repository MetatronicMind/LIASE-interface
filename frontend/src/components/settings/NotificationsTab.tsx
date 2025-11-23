"use client";
import { useState, useEffect } from "react";
import { 
  BellIcon, 
  EnvelopeIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon
} from "@heroicons/react/24/solid";
import { getApiBaseUrl } from '@/config/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  priority: string;
  channels: string[];
  createdAt: string;
  scheduledFor?: string;
}

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: string;
  eventType: string;
  scheduleType: string;
  scheduledTime: string;
  scheduledDays: string[];
  notificationTemplate: {
    type: string;
    title: string;
    message: string;
    channels: string[];
  };
  recipientConfig: {
    type: string;
    roles: string[];
    users: string[];
    customEmails: string[];
  };
  priority: string;
  lastTriggeredAt?: string;
  nextScheduledAt?: string;
}

interface NotificationStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
}

export default function NotificationsTab() {
  const [activeView, setActiveView] = useState<'notifications' | 'rules' | 'reports'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, sent: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  useEffect(() => {
    fetchData();
  }, [filter, activeView]);

  const fetchData = async () => {
    try {
      if (activeView === 'notifications') {
        await Promise.all([fetchNotifications(), fetchStats()]);
      } else if (activeView === 'rules') {
        await fetchRules();
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${getApiBaseUrl()}/notifications`;
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/notifications/stats/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Process stats data
        const processedStats = {
          total: 0,
          sent: 0,
          pending: 0,
          failed: 0
        };
        
        if (data.stats && Array.isArray(data.stats)) {
          data.stats.forEach((stat: any) => {
            processedStats.total += stat.count || 0;
            if (stat.status === 'delivered' || stat.status === 'sent') {
              processedStats.sent += stat.count || 0;
            } else if (stat.status === 'pending' || stat.status === 'queued') {
              processedStats.pending += stat.count || 0;
            } else if (stat.status === 'failed') {
              processedStats.failed += stat.count || 0;
            }
          });
        }
        
        setStats(processedStats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/notifications/rules/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRules(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching rules:', err);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowRuleModal(true);
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this notification rule?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/notifications/rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Notification rule deleted successfully');
        fetchRules();
      } else {
        throw new Error('Failed to delete rule');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete notification rule');
    }
  };

  const handleTriggerRule = async (ruleId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/notifications/rules/${ruleId}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ context: {} })
      });

      if (response.ok) {
        alert('Notification rule triggered successfully');
      } else {
        throw new Error('Failed to trigger rule');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to trigger notification rule');
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/notifications/reports/daily`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reportType })
      });

      if (response.ok) {
        alert(`${reportType} report generated successfully`);
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'queued':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'normal':
        return 'bg-blue-100 text-blue-700';
      case 'low':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BellIcon className="w-7 h-7 text-blue-600" />
            Notifications Module
          </h2>
          <p className="text-gray-600 mt-1">Configure notifications, rules, and daily reports</p>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('notifications')}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              activeView === 'notifications'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BellIcon className="w-5 h-5 inline mr-1" />
            Notifications
          </button>
          <button
            onClick={() => setActiveView('rules')}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              activeView === 'rules'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClockIcon className="w-5 h-5 inline mr-1" />
            Rules
          </button>
          <button
            onClick={() => setActiveView('reports')}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              activeView === 'reports'
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ChartBarIcon className="w-5 h-5 inline mr-1" />
            Reports
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Notifications View */}
      {activeView === 'notifications' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-500 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-green-600 mb-1">Sent</div>
              <div className="text-2xl font-bold text-green-700">{stats.sent}</div>
            </div>
            <div className="bg-white border border-yellow-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-yellow-600 mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
            </div>
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-red-600 mb-1">Failed</div>
              <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'sent', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BellIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No notifications found</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900">{notification.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Type: {notification.type}</span>
                        <span>Channels: {notification.channels.join(', ')}</span>
                        <span>Created: {new Date(notification.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Rules View */}
      {activeView === 'rules' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Notification Rules</h3>
            <button
              onClick={handleCreateRule}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create Rule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-gray-500">
                <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No notification rules configured</p>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">{rule.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    <div><strong>Trigger:</strong> {rule.triggerType} {rule.eventType && `(${rule.eventType})`}</div>
                    <div><strong>Schedule:</strong> {rule.scheduleType} {rule.scheduledTime && `at ${rule.scheduledTime}`}</div>
                    <div><strong>Channels:</strong> {rule.notificationTemplate.channels.join(', ')}</div>
                    {rule.lastTriggeredAt && (
                      <div><strong>Last Triggered:</strong> {new Date(rule.lastTriggeredAt).toLocaleString()}</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTriggerRule(rule.id)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-1"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Trigger
                    </button>
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded-md text-sm font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm font-semibold hover:bg-red-100 transition"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Reports View */}
      {activeView === 'reports' && (
        <>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Daily Reports</h3>
            <p className="text-gray-600 mb-6">Generate and send automated reports to administrators</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <ChartBarIcon className="w-12 h-12 text-blue-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Daily Summary Report</h4>
              <p className="text-sm text-gray-600 mb-4">
                Comprehensive daily overview of studies, user activity, and system health
              </p>
              <button
                onClick={() => handleGenerateReport('daily_summary')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Generate Now
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <ChartBarIcon className="w-12 h-12 text-purple-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Weekly Summary Report</h4>
              <p className="text-sm text-gray-600 mb-4">
                Weekly aggregated metrics and trends across all activities
              </p>
              <button
                onClick={() => handleGenerateReport('weekly_summary')}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                Generate Now
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <ClockIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Automated Reports</h4>
                <p className="text-sm text-blue-700">
                  Daily reports are automatically generated and sent to administrators at 9:00 AM UTC every day.
                  Weekly reports are sent every Monday at the same time.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rule Modal would go here - simplified for now */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {editingRule ? 'Edit' : 'Create'} Notification Rule
              </h3>
              <p className="text-gray-600 mb-4">
                Configure notification rules to automate alerts based on schedules or events.
              </p>
              <div className="text-center py-8 text-gray-500">
                Rule configuration form would be implemented here
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
