class NotificationService {
  constructor() {
    this.listeners = new Set();
  }

  // Add a listener for notifications
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback); // Return unsubscribe function
  }

  // Send notification to all listeners
  notify(notification) {
    this.listeners.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Convenience methods for different notification types
  notifyInfo(message, details = {}) {
    this.notify({
      type: 'info',
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  notifySuccess(message, details = {}) {
    this.notify({
      type: 'success',
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  notifyWarning(message, details = {}) {
    this.notify({
      type: 'warning',
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  notifyError(message, details = {}) {
    this.notify({
      type: 'error',
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  notifyProgress(message, progress, details = {}) {
    this.notify({
      type: 'progress',
      message,
      progress, // { current, total, percentage }
      details,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new NotificationService();