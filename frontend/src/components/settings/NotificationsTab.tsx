"use client";
import { useState, useEffect } from "react";
import { BellIcon, EnvelopeIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
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

interface NotificationStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
}

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, sent: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      await Promise.all([fetchNotifications(), fetchStats()]);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch notifications');
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
        setStats(data.stats || { total: 0, sent: 0, pending: 0, failed: 0 });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
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
        <p className="mt-4 text-gray-600">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BellIcon className="w-7 h-7 text-blue-600" />
            Notifications Management
          </h2>
          <p className="text-gray-600 mt-1">View and manage system notifications</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

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
    </div>
  );
}
