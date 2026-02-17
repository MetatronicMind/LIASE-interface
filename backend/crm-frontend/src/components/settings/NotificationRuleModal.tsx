"use client";
import { useState, useEffect } from "react";
import {
  XMarkIcon,
  ClockIcon,
  BellIcon,
  UsersIcon,
  DocumentTextIcon,
  CalendarIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  BeakerIcon
} from "@heroicons/react/24/solid";
import { getApiBaseUrl } from '@/config/api';

interface NotificationRule {
  id?: string;
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
}

interface NotificationRuleModalProps {
  rule: NotificationRule | null;
  onClose: () => void;
  onSave: () => void;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

const NOTIFICATION_TYPES = [
  { value: 'new_article', label: 'New Articles Available', icon: DocumentTextIcon, description: 'Notify when new articles match your criteria' },
  { value: 'study_creation', label: 'Automatic Study Creation', icon: BeakerIcon, description: 'Notify about automatically created studies' },
  { value: 'study_status', label: 'Study Status Updates', icon: CheckCircleIcon, description: 'Notify when study status changes' },
  { value: 'user_action', label: 'User Actions Required', icon: ExclamationTriangleIcon, description: 'Notify when user action is needed' },
  { value: 'system_alert', label: 'System Alerts', icon: InformationCircleIcon, description: 'Important system notifications' }
];

export default function NotificationRuleModal({ rule, onClose, onSave }: NotificationRuleModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<NotificationRule>({
    name: rule?.name || '',
    description: rule?.description || '',
    isActive: rule?.isActive ?? true,
    triggerType: rule?.triggerType || 'scheduled',
    eventType: rule?.eventType || 'new_article',
    scheduleType: rule?.scheduleType || 'daily',
    scheduledTime: rule?.scheduledTime || '09:00',
    scheduledDays: rule?.scheduledDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    notificationTemplate: {
      type: rule?.notificationTemplate?.type || 'info',
      title: rule?.notificationTemplate?.title || '',
      message: rule?.notificationTemplate?.message || '',
      channels: rule?.notificationTemplate?.channels || ['email']
    },
    recipientConfig: {
      type: rule?.recipientConfig?.type || 'roles',
      roles: rule?.recipientConfig?.roles || ['Admin'],
      users: rule?.recipientConfig?.users || [],
      customEmails: rule?.recipientConfig?.customEmails || []
    },
    priority: rule?.priority || 'normal'
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Rule name is required';
      }
      if (!formData.eventType) {
        newErrors.eventType = 'Notification type is required';
      }
    } else if (step === 2) {
      if (formData.triggerType === 'scheduled') {
        if (!formData.scheduledTime) {
          newErrors.scheduledTime = 'Time is required';
        }
        if (formData.scheduleType === 'weekly' && formData.scheduledDays.length === 0) {
          newErrors.scheduledDays = 'Select at least one day';
        }
      }
    } else if (step === 3) {
      if (!formData.notificationTemplate.title.trim()) {
        newErrors.title = 'Title is required';
      }
      if (!formData.notificationTemplate.message.trim()) {
        newErrors.message = 'Message is required';
      }
      if (formData.notificationTemplate.channels.length === 0) {
        newErrors.channels = 'Select at least one channel';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleSave = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = rule?.id 
        ? `${getApiBaseUrl()}/notifications/rules/${rule.id}`
        : `${getApiBaseUrl()}/notifications/rules`;
      
      const response = await fetch(url, {
        method: rule?.id ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert(`Notification rule ${rule?.id ? 'updated' : 'created'} successfully!`);
        onSave();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save rule');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save notification rule');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else {
        return {
          ...prev,
          [keys[0]]: {
            ...(prev as any)[keys[0]],
            [keys[1]]: value
          }
        };
      }
    });
  };

  const toggleDay = (day: string) => {
    const days = formData.scheduledDays.includes(day)
      ? formData.scheduledDays.filter(d => d !== day)
      : [...formData.scheduledDays, day];
    updateFormData('scheduledDays', days);
  };

  const toggleChannel = (channel: string) => {
    const channels = formData.notificationTemplate.channels.includes(channel)
      ? formData.notificationTemplate.channels.filter(c => c !== channel)
      : [...formData.notificationTemplate.channels, channel];
    updateFormData('notificationTemplate.channels', channels);
  };

  const getTemplateForEventType = (eventType: string) => {
    const templates: Record<string, { title: string; message: string }> = {
      new_article: {
        title: 'New Articles Available',
        message: '{{count}} new articles have been found matching your search criteria and are ready for review.'
      },
      study_creation: {
        title: 'Study Created Automatically',
        message: 'A new study "{{studyName}}" has been automatically created with {{articleCount}} articles.'
      },
      study_status: {
        title: 'Study Status Updated',
        message: 'Study "{{studyName}}" status has changed to {{status}}.'
      },
      user_action: {
        title: 'Action Required',
        message: 'Your attention is needed: {{actionDescription}}'
      },
      system_alert: {
        title: 'System Alert',
        message: 'System notification: {{alertMessage}}'
      }
    };
    return templates[eventType] || { title: '', message: '' };
  };

  const applyTemplate = () => {
    const template = getTemplateForEventType(formData.eventType);
    updateFormData('notificationTemplate.title', template.title);
    updateFormData('notificationTemplate.message', template.message);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BellIcon className="w-8 h-8" />
            <div>
              <h3 className="text-2xl font-bold">
                {rule?.id ? 'Edit' : 'Create'} Notification Rule
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                Step {currentStep} of 4: {
                  currentStep === 1 ? 'Basic Information' :
                  currentStep === 2 ? 'Timing & Schedule' :
                  currentStep === 3 ? 'Message Configuration' :
                  'Recipients & Priority'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-100 h-2">
          <div 
            className="bg-blue-600 h-2 transition-all duration-300"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <InformationCircleIcon className="w-6 h-6 text-blue-600" />
                  Basic Information
                </h4>
              </div>

              {/* Rule Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="e.g., Daily New Articles Alert"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe what this notification rule does..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Notification Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {NOTIFICATION_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          updateFormData('eventType', type.value);
                          setErrors(prev => ({ ...prev, eventType: '' }));
                        }}
                        className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                          formData.eventType === type.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-6 h-6 flex-shrink-0 ${
                            formData.eventType === type.value ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <div>
                            <div className="font-bold text-gray-900 mb-1">{type.label}</div>
                            <div className="text-sm text-gray-600">{type.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.eventType && <p className="text-red-500 text-sm mt-2">{errors.eventType}</p>}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => updateFormData('isActive', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                  Activate this rule immediately after creation
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Timing & Schedule */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="w-6 h-6 text-blue-600" />
                  Timing & Schedule
                </h4>
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  When should this notification be sent?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateFormData('triggerType', 'scheduled')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.triggerType === 'scheduled'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <ClockIcon className={`w-8 h-8 mb-2 ${
                      formData.triggerType === 'scheduled' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="font-bold text-gray-900 mb-1">On a Schedule</div>
                    <div className="text-sm text-gray-600">Send at specific times (daily, weekly, etc.)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData('triggerType', 'event')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.triggerType === 'event'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <SparklesIcon className={`w-8 h-8 mb-2 ${
                      formData.triggerType === 'event' ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="font-bold text-gray-900 mb-1">On Event</div>
                    <div className="text-sm text-gray-600">Send immediately when event occurs</div>
                  </button>
                </div>
              </div>

              {/* Scheduled Settings */}
              {formData.triggerType === 'scheduled' && (
                <>
                  {/* Schedule Frequency */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Schedule Frequency
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {['daily', 'weekly', 'monthly'].map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => updateFormData('scheduleType', freq)}
                          className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all ${
                            formData.scheduleType === freq
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-gray-200 text-gray-700 hover:border-blue-300'
                          }`}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time to Send *
                    </label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => updateFormData('scheduledTime', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                        errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.scheduledTime && <p className="text-red-500 text-sm mt-1">{errors.scheduledTime}</p>}
                    <p className="text-sm text-gray-500 mt-2">
                      Time is in your local timezone. Notifications will be sent at this time.
                    </p>
                  </div>

                  {/* Days Selection for Weekly */}
                  {formData.scheduleType === 'weekly' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Days of the Week *
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`px-4 py-2 border-2 rounded-lg font-semibold transition-all ${
                              formData.scheduledDays.includes(day.value)
                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                : 'border-gray-200 text-gray-700 hover:border-blue-300'
                            }`}
                          >
                            {day.label.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                      {errors.scheduledDays && <p className="text-red-500 text-sm mt-2">{errors.scheduledDays}</p>}
                    </div>
                  )}

                  {/* Preview */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <CalendarIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-blue-900 mb-1">Schedule Preview</div>
                        <div className="text-sm text-blue-700">
                          {formData.scheduleType === 'daily' && `Every day at ${formData.scheduledTime}`}
                          {formData.scheduleType === 'weekly' && (
                            <>
                              Every {formData.scheduledDays.map(d => 
                                DAYS_OF_WEEK.find(day => day.value === d)?.label
                              ).join(', ')} at {formData.scheduledTime}
                            </>
                          )}
                          {formData.scheduleType === 'monthly' && `First day of every month at ${formData.scheduledTime}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Event Settings */}
              {formData.triggerType === 'event' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <InformationCircleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-yellow-900 mb-1">Event-Based Notification</div>
                      <div className="text-sm text-yellow-700">
                        This notification will be sent immediately when the {formData.eventType.replace('_', ' ')} event occurs.
                        No schedule configuration needed.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Message Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                  Message Configuration
                </h4>
              </div>

              {/* Template Button */}
              <div>
                <button
                  type="button"
                  onClick={applyTemplate}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition flex items-center justify-center gap-2"
                >
                  <SparklesIcon className="w-5 h-5" />
                  Use Smart Template for {NOTIFICATION_TYPES.find(t => t.value === formData.eventType)?.label}
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notification Title *
                </label>
                <input
                  type="text"
                  value={formData.notificationTemplate.title}
                  onChange={(e) => updateFormData('notificationTemplate.title', e.target.value)}
                  placeholder="e.g., New Articles Available"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message Content *
                </label>
                <textarea
                  value={formData.notificationTemplate.message}
                  onChange={(e) => updateFormData('notificationTemplate.message', e.target.value)}
                  placeholder="Enter the notification message..."
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.message ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
                <p className="text-sm text-gray-500 mt-2">
                  💡 You can use variables like {'{'}{'{'} count {'}'}{'}'}, {'{'}{'{'} studyName {'}'}{'}'}, {'{'}{'{'} status {'}'}{'}'}
                </p>
              </div>

              {/* Channels */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Delivery Channels *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => toggleChannel('email')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.notificationTemplate.channels.includes('email')
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <EnvelopeIcon className={`w-8 h-8 mx-auto mb-2 ${
                      formData.notificationTemplate.channels.includes('email') ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="font-bold text-center text-gray-900">Email</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleChannel('in_app')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.notificationTemplate.channels.includes('in_app')
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <BellIcon className={`w-8 h-8 mx-auto mb-2 ${
                      formData.notificationTemplate.channels.includes('in_app') ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="font-bold text-center text-gray-900">In-App</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleChannel('sms')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.notificationTemplate.channels.includes('sms')
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <ChatBubbleLeftIcon className={`w-8 h-8 mx-auto mb-2 ${
                      formData.notificationTemplate.channels.includes('sms') ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="font-bold text-center text-gray-900">SMS</div>
                  </button>
                </div>
                {errors.channels && <p className="text-red-500 text-sm mt-2">{errors.channels}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Message Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  {['info', 'success', 'warning', 'error'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateFormData('notificationTemplate.type', type)}
                      className={`px-4 py-2 border-2 rounded-lg font-semibold transition-all ${
                        formData.notificationTemplate.type === type
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Recipients & Priority */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <UsersIcon className="w-6 h-6 text-blue-600" />
                  Recipients & Priority
                </h4>
              </div>

              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Who should receive this notification?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => updateFormData('recipientConfig.type', 'roles')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.recipientConfig.type === 'roles'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">By Role</div>
                    <div className="text-sm text-gray-600">Send to specific user roles</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData('recipientConfig.type', 'users')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.recipientConfig.type === 'users'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">Specific Users</div>
                    <div className="text-sm text-gray-600">Select individual users</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData('recipientConfig.type', 'custom')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.recipientConfig.type === 'custom'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-bold text-gray-900 mb-1">Custom Emails</div>
                    <div className="text-sm text-gray-600">Enter email addresses</div>
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              {formData.recipientConfig.type === 'roles' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Roles
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Admin', 'Medical Examiner', 'QA Reviewer', 'Data Curator', 'Viewer'].map((role) => (
                      <label key={role} className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.recipientConfig.roles.includes(role)}
                          onChange={(e) => {
                            const roles = e.target.checked
                              ? [...formData.recipientConfig.roles, role]
                              : formData.recipientConfig.roles.filter(r => r !== role);
                            updateFormData('recipientConfig.roles', roles);
                          }}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="font-semibold text-gray-700">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Emails */}
              {formData.recipientConfig.type === 'custom' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Addresses (one per line)
                  </label>
                  <textarea
                    value={formData.recipientConfig.customEmails.join('\n')}
                    onChange={(e) => updateFormData('recipientConfig.customEmails', 
                      e.target.value.split('\n').filter(email => email.trim())
                    )}
                    placeholder="email1@example.com&#10;email2@example.com"
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Priority Level
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'urgent', label: 'Urgent', color: 'red' },
                    { value: 'high', label: 'High', color: 'orange' },
                    { value: 'normal', label: 'Normal', color: 'blue' },
                    { value: 'low', label: 'Low', color: 'gray' }
                  ].map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => updateFormData('priority', priority.value)}
                      className={`px-4 py-3 border-2 rounded-lg font-semibold transition-all ${
                        formData.priority === priority.value
                          ? `border-${priority.color}-600 bg-${priority.color}-50 text-${priority.color}-700`
                          : 'border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-5">
                <div className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                  Configuration Summary
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rule Name:</span>
                    <span className="font-semibold text-gray-900">{formData.name || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-semibold text-gray-900">
                      {NOTIFICATION_TYPES.find(t => t.value === formData.eventType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timing:</span>
                    <span className="font-semibold text-gray-900">
                      {formData.triggerType === 'scheduled' 
                        ? `${formData.scheduleType} at ${formData.scheduledTime}`
                        : 'Event-based'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Channels:</span>
                    <span className="font-semibold text-gray-900">
                      {formData.notificationTemplate.channels.join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recipients:</span>
                    <span className="font-semibold text-gray-900">
                      {formData.recipientConfig.type === 'roles' 
                        ? formData.recipientConfig.roles.join(', ')
                        : formData.recipientConfig.type
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority:</span>
                    <span className="font-semibold text-gray-900 capitalize">{formData.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            className="px-5 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>
          <div className="text-sm text-gray-600">
            Step {currentStep} of 4
          </div>
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Save Rule
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
