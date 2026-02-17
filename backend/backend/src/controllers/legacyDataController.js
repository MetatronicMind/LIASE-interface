const cosmosService = require('../services/cosmosService');
const LegacyData = require('../models/LegacyData');

exports.uploadData = async (req, res) => {
  try {
    const { data } = req.body;
    const organizationId = req.organization.id;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Data must be an array' });
    }

    const createdItems = [];
    for (const item of data) {
      const legacyData = new LegacyData({
        organizationId,
        data: item,
        createdBy: req.user.id
      });
      
      const created = await cosmosService.createItem('legacyData', legacyData.toJSON());
      createdItems.push(created);
    }

    res.status(201).json({ message: 'Data uploaded successfully', count: createdItems.length });
  } catch (error) {
    console.error('Error uploading legacy data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getData = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    // Sort by uploadedAt ASC to show data in the order it was added (concatenated)
    const query = 'SELECT * FROM c WHERE c.organizationId = @organizationId ORDER BY c.uploadedAt ASC';
    const parameters = [{ name: '@organizationId', value: organizationId }];

    const data = await cosmosService.queryItems('legacyData', query, parameters);
    res.json(data);
  } catch (error) {
    console.error('Error fetching legacy data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetData = async (req, res) => {
  try {
    const organizationId = req.organization.id;
    const query = 'SELECT * FROM c WHERE c.organizationId = @organizationId';
    const parameters = [{ name: '@organizationId', value: organizationId }];

    const items = await cosmosService.queryItems('legacyData', query, parameters);
    
    let deletedCount = 0;
    for (const item of items) {
      await cosmosService.deleteItem('legacyData', item.id, organizationId);
      deletedCount++;
    }

    res.json({ message: 'Legacy data reset successfully', count: deletedCount });
  } catch (error) {
    console.error('Error resetting legacy data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
