"use client";

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  setDateTimeSettings,
  updateDateFormat,
  updateTimeFormat,
  updateTimezone,
  toggleShowTimezone,
  toggleShowSeconds,
} from '@/redux/slices/dateTimeSlice';
import {
  formatDateTime,
  getAvailableTimezones,
  saveDateTimeSettings,
  DateFormat,
  getDateTimeSettings,
} from '@/utils/dateTimeFormatter';

const DATE_FORMATS: DateFormat[] = ['DD-MMM-YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];

export default function DateTimeSettingsTab() {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.dateTime.settings);
  const [saved, setSaved] = useState(false);
  const [previewDate] = useState(new Date());

  const handleDateFormatChange = (format: DateFormat) => {
    dispatch(updateDateFormat(format));
  };

  const handleTimeFormatChange = (format: '24h' | '12h') => {
    dispatch(updateTimeFormat(format));
  };

  const handleTimezoneChange = (timezone: string) => {
    dispatch(updateTimezone(timezone));
  };

  const handleToggleTimezone = () => {
    dispatch(toggleShowTimezone());
  };

  const handleToggleSeconds = () => {
    dispatch(toggleShowSeconds());
  };

  const handleSaveSettings = async () => {
    try {
      // Save to localStorage
      saveDateTimeSettings(settings);

      // Optional: Save to backend for admin settings
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await fetch('/api/admin/settings/datetime', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          console.warn('Failed to save settings to server');
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Date & Time Format Settings</h2>
        <p className="text-gray-600">Configure how dates and times are displayed throughout the application</p>
      </div>

      {/* Preview Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Format Preview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded border border-blue-100">
            <p className="text-sm text-gray-600 mb-1">Sample Date Format</p>
            <p className="text-xl font-mono text-gray-900">
              {require('@/utils/dateTimeFormatter').formatDate(previewDate, settings)}
            </p>
          </div>
          <div className="bg-white p-4 rounded border border-blue-100">
            <p className="text-sm text-gray-600 mb-1">Sample Time Format</p>
            <p className="text-xl font-mono text-gray-900">
              {require('@/utils/dateTimeFormatter').formatTime(previewDate, settings)}
            </p>
          </div>
          <div className="bg-white p-4 rounded border border-blue-100">
            <p className="text-sm text-gray-600 mb-1">Sample DateTime Format</p>
            <p className="text-xl font-mono text-gray-900">
              {formatDateTime(previewDate, settings)}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Date Format Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Format</h3>
          <div className="space-y-3">
            {DATE_FORMATS.map((format) => (
              <label key={format} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="dateFormat"
                  value={format}
                  checked={settings.dateFormat === format}
                  onChange={() => handleDateFormatChange(format)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-3 flex-1">
                  <span className="block font-medium text-gray-900">{format}</span>
                  <span className="text-sm text-gray-500">
                    {require('@/utils/dateTimeFormatter').formatDate(previewDate, { ...settings, dateFormat: format })}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Format Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Format</h3>
          <div className="space-y-3 mb-4">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="timeFormat"
                value="24h"
                checked={settings.timeFormat === '24h'}
                onChange={() => handleTimeFormatChange('24h')}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-3 flex-1">
                <span className="block font-medium text-gray-900">24-Hour Format</span>
                <span className="text-sm text-gray-500">
                  {require('@/utils/dateTimeFormatter').formatTime(previewDate, { ...settings, timeFormat: '24h' })}
                </span>
              </span>
            </label>

            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="timeFormat"
                value="12h"
                checked={settings.timeFormat === '12h'}
                onChange={() => handleTimeFormatChange('12h')}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-3 flex-1">
                <span className="block font-medium text-gray-900">12-Hour Format (AM/PM)</span>
                <span className="text-sm text-gray-500">
                  {require('@/utils/dateTimeFormatter').formatTime(previewDate, { ...settings, timeFormat: '12h' })}
                </span>
              </span>
            </label>
          </div>

          {/* Additional Options */}
          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.showSeconds}
                onChange={handleToggleSeconds}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-3">
                <span className="block font-medium text-gray-900">Show Seconds</span>
                <span className="text-sm text-gray-500">Display seconds in time format</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Timezone Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Timezone Settings</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Timezone</label>
          <select
            value={settings.timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <optgroup label="System">
              <option value="Local">Local System Time</option>
            </optgroup>
            <optgroup label="GMT Offsets">
              {getAvailableTimezones()
                .filter((tz) => tz.startsWith('GMT'))
                .map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Major Cities">
              {getAvailableTimezones()
                .filter((tz) => tz.includes('/'))
                .map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace('_', ' ')}
                  </option>
                ))}
            </optgroup>
          </select>
          <p className="mt-2 text-sm text-gray-600">
            Currently set to: <span className="font-semibold">{settings.timezone}</span>
          </p>
        </div>

        {/* Timezone Display Options */}
        <div className="space-y-3 border-t pt-4">
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings.showTimezone}
              onChange={handleToggleTimezone}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="ml-3">
              <span className="block font-medium text-gray-900">Show Timezone in Time Display</span>
              <span className="text-sm text-gray-500">Adds timezone abbreviation (e.g., IST, PST) to times</span>
            </span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4">
        <button
          onClick={handleSaveSettings}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Save Settings
        </button>
        {saved && (
          <div className="flex items-center text-green-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Settings saved successfully
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Timezone Information</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Select "Local System Time" to use your browser's timezone</li>
          <li>• GMT offsets (e.g., GMT+05:30) are fixed UTC offsets</li>
          <li>• IANA timezone names (e.g., Asia/Kolkata) adjust automatically for daylight saving time</li>
          <li>• Your timezone preference is saved locally and applied across all timestamps</li>
        </ul>
      </div>
    </div>
  );
}
