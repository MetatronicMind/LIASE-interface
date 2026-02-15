const axios = require('axios');

exports.generateR3Xml = async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query).toString();
    const externalUrl = `http://48.217.12.7/create_R3?${queryParams}`;

    console.log(`Proxying R3 creation to: ${externalUrl}`);

    const response = await axios.get(externalUrl, {
      responseType: 'arraybuffer', // Important for handling file data
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept 3xx redirects if axios handles them, commonly axios follows redirects by default
      },
    });

    // Set headers for XML file download
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="icsr-r3-report.xml"');
    
    // Send the data
    res.send(response.data);

  } catch (error) {
    console.error('Error proxying R3 request:', error.message);
    if (error.response) {
      console.error('External service response:', error.response.status, error.response.data.toString());
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to generate R3 XML via proxy', details: error.message });
    }
  }
};
