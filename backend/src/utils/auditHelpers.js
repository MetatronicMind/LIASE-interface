/**
 * Audit Helper Utilities
 * 
 * This module provides helper functions for capturing and logging changes
 * in audit trails, including before/after value tracking.
 */

/**
 * Compare two values and detect if they are different
 * @param {*} before - The value before the change
 * @param {*} after - The value after the change
 * @returns {boolean} - True if values are different
 */
function hasChanged(before, after) {
  // Handle null/undefined
  if (before === null || before === undefined) {
    return after !== null && after !== undefined;
  }
  if (after === null || after === undefined) {
    return before !== null && before !== undefined;
  }

  // Handle objects and arrays
  if (typeof before === 'object' && typeof after === 'object') {
    return JSON.stringify(before) !== JSON.stringify(after);
  }

  // Handle primitives
  return before !== after;
}

/**
 * Compare two objects and extract field-level changes
 * @param {Object} before - The object before changes
 * @param {Object} after - The object after changes
 * @param {Array<string>} fieldsToTrack - Optional array of specific fields to track
 * @returns {Array<{field: string, before: any, after: any}>} - Array of changes
 */
function extractChanges(before, after, fieldsToTrack = null) {
  const changes = [];

  // Check if both are null/undefined
  if (!before && !after) {
    console.log('extractChanges: Both before and after are null/undefined');
    return changes;
  }

  // Treat empty objects as null
  const isBeforeEmpty = !before || (typeof before === 'object' && Object.keys(before).length === 0);
  const isAfterEmpty = !after || (typeof after === 'object' && Object.keys(after).length === 0);

  // If no before object or empty before object, this is a creation
  if (isBeforeEmpty && !isAfterEmpty) {
    const afterObj = after || {};
    const keys = fieldsToTrack || Object.keys(afterObj);
    keys.forEach(key => {
      // Include fields even if they are empty string, but skip undefined/null
      const value = afterObj[key];
      if (value !== undefined && value !== null && value !== '') {
        changes.push({
          field: key,
          before: null,
          after: formatValue(value)
        });
      }
    });
    console.log('Extract Changes (creation):', changes.length, 'changes from', keys.length, 'keys');
    return changes;
  }

  // If no after object, this is a deletion
  if (!isBeforeEmpty && isAfterEmpty) {
    const beforeObj = before || {};
    const keys = fieldsToTrack || Object.keys(beforeObj);
    keys.forEach(key => {
      if (beforeObj[key] !== undefined && beforeObj[key] !== null) {
        changes.push({
          field: key,
          before: formatValue(beforeObj[key]),
          after: null
        });
      }
    });
    console.log('Extract Changes (deletion):', changes.length, 'changes');
    return changes;
  }

  // Compare both objects
  const beforeObj = before || {};
  const afterObj = after || {};
  const keys = fieldsToTrack || [...new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])];

  console.log('Extract Changes - Comparing:', {
    totalKeys: keys.length,
    beforeKeys: Object.keys(beforeObj).length,
    afterKeys: Object.keys(afterObj).length
  });

  keys.forEach(key => {
    if (hasChanged(beforeObj[key], afterObj[key])) {
      changes.push({
        field: key,
        before: formatValue(beforeObj[key]),
        after: formatValue(afterObj[key])
      });
    }
  });

  console.log('Extract Changes (update):', changes.length, 'changes detected from', keys.length, 'keys');
  return changes;
}

/**
 * Format a value for display in audit logs
 * @param {*} value - The value to format
 * @returns {string|null} - Formatted value
 */
function formatValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    // For arrays, show count
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      return JSON.stringify(value);
    }
    // For objects, stringify
    return JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

/**
 * Generate a human-readable description of changes
 * @param {Array<{field: string, before: any, after: any}>} changes - Array of changes
 * @returns {string} - Human-readable description
 */
function generateChangeDescription(changes) {
  if (!changes || changes.length === 0) {
    return 'No changes detected';
  }

  if (changes.length === 1) {
    const change = changes[0];
    const fieldName = formatFieldName(change.field);
    
    if (change.before === null) {
      return `Set ${fieldName} to "${change.after}"`;
    }
    if (change.after === null) {
      return `Cleared ${fieldName} (was "${change.before}")`;
    }
    return `Changed ${fieldName} from "${change.before}" to "${change.after}"`;
  }

  // Multiple changes
  const fieldNames = changes.map(c => formatFieldName(c.field)).join(', ');
  return `Updated ${changes.length} fields: ${fieldNames}`;
}

/**
 * Format a field name for display
 * @param {string} fieldName - The field name to format
 * @returns {string} - Formatted field name
 */
function formatFieldName(fieldName) {
  return fieldName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Create a detailed audit description with before/after values
 * @param {string} action - The action being performed
 * @param {string} resourceType - The type of resource
 * @param {string} resourceId - The ID of the resource
 * @param {Array<{field: string, before: any, after: any}>} changes - Array of changes
 * @returns {string} - Detailed description
 */
function createAuditDescription(action, resourceType, resourceId, changes = []) {
  const baseDescription = `${action} ${resourceType} ${resourceId}`;
  
  if (!changes || changes.length === 0) {
    return baseDescription;
  }

  const changeDescription = generateChangeDescription(changes);
  return `${baseDescription}: ${changeDescription}`;
}

/**
 * Sanitize sensitive data from values before logging
 * @param {*} value - The value to sanitize
 * @param {Array<string>} sensitiveFields - List of sensitive field names
 * @returns {*} - Sanitized value
 */
function sanitizeValue(value, sensitiveFields = ['password', 'token', 'secret', 'apiKey']) {
  if (typeof value === 'object' && value !== null) {
    const sanitized = Array.isArray(value) ? [] : {};
    
    for (const key in value) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value[key] === 'object') {
        sanitized[key] = sanitizeValue(value[key], sensitiveFields);
      } else {
        sanitized[key] = value[key];
      }
    }
    
    return sanitized;
  }
  
  return value;
}

module.exports = {
  hasChanged,
  extractChanges,
  formatValue,
  generateChangeDescription,
  formatFieldName,
  createAuditDescription,
  sanitizeValue
};
