const { v4: uuidv4 } = require('uuid');

class LegacyData {
  constructor({
    id = uuidv4(),
    organizationId,
    data,
    uploadedAt = new Date().toISOString(),
    createdBy
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.data = data;
    this.uploadedAt = uploadedAt;
    this.createdBy = createdBy;
    this.type = 'legacyData';
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      data: this.data,
      uploadedAt: this.uploadedAt,
      createdBy: this.createdBy,
      type: this.type
    };
  }
}

module.exports = LegacyData;
