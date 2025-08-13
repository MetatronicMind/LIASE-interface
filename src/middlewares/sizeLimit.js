import getRawBody from 'raw-body';

const sizeLimit = (limit) => (req, res, next) => {
  getRawBody(req, {
    limit,
    encoding: 'utf8',
  }, (err, string) => {
    if (err) {
      return res.status(413).json({ error: 'Request entity too large' });
    }

    try {
      if (string?.trim()) { // Using optional chaining to check if string is not null/undefined and has content
        req.body = JSON.parse(string);
      } else {
        req.body = {}; // Handle empty body
      }
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid JSON' }); // Return 400 for invalid JSON
    }

    next();
  });
};

export default sizeLimit;
