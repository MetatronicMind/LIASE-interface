const { v4: uuidv4 } = require('uuid');

class Drug {
  constructor({
    id = uuidv4(),
    organizationId,
    name,
    manufacturer,
    query,
    rsi,
    nextSearchDate,
    status = 'Active',
    description = '',
    indications = [],
    contraindications = [],
    sideEffects = [],
    dosageForm = '',
    strength = '',
    activeIngredients = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    createdBy
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.manufacturer = manufacturer;
    this.query = query;
    this.rsi = rsi;
    this.nextSearchDate = nextSearchDate;
    this.status = status; // Active, Inactive, Suspended
    this.description = description;
    this.indications = indications;
    this.contraindications = contraindications;
    this.sideEffects = sideEffects;
    this.dosageForm = dosageForm;
    this.strength = strength;
    this.activeIngredients = activeIngredients;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.type = 'drug';
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      manufacturer: this.manufacturer,
      query: this.query,
      rsi: this.rsi,
      nextSearchDate: this.nextSearchDate,
      status: this.status,
      description: this.description,
      indications: this.indications,
      contraindications: this.contraindications,
      sideEffects: this.sideEffects,
      dosageForm: this.dosageForm,
      strength: this.strength,
      activeIngredients: this.activeIngredients,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      type: this.type
    };
  }

  updateStatus(newStatus) {
    this.status = newStatus;
    this.updatedAt = new Date().toISOString();
  }

  updateNextSearchDate(date) {
    this.nextSearchDate = date;
    this.updatedAt = new Date().toISOString();
  }

  static validate(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Drug name must be at least 2 characters long');
    }

    if (!data.manufacturer || data.manufacturer.trim().length < 2) {
      errors.push('Manufacturer name must be at least 2 characters long');
    }

    if (!data.query || data.query.trim().length < 3) {
      errors.push('Search query must be at least 3 characters long');
    }

    if (!data.rsi || data.rsi.trim().length < 1) {
      errors.push('RSI code is required');
    }

    if (!data.nextSearchDate) {
      errors.push('Next search date is required');
    } else {
      const searchDate = new Date(data.nextSearchDate);
      if (isNaN(searchDate.getTime())) {
        errors.push('Next search date must be a valid date');
      }
    }

    if (data.status && !['Active', 'Inactive', 'Suspended'].includes(data.status)) {
      errors.push('Status must be Active, Inactive, or Suspended');
    }

    if (!data.organizationId) {
      errors.push('Organization ID is required');
    }

    return errors;
  }

  static getSearchableFields() {
    return ['name', 'manufacturer', 'activeIngredients', 'indications', 'rsi'];
  }
}

module.exports = Drug;
