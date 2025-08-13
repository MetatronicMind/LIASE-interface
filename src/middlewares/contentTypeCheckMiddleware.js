import AppError from '../utils/appError.js';

const ContentTypeCheck = (...additionalTypes) => {
  const allowedTypes = ['application/json', ...additionalTypes];

  return (req, res, next) => {
    const contentType = req.headers['content-type']?.split(';')[0].trim();
    if (!allowedTypes.includes(contentType)) {
      return next(new AppError(
        `Unsupported Media Type. Content-Type must be one of: ${allowedTypes.join(', ')}`,
        415,
      ));
    }

    const acceptHeader = req.headers.accept;
    if (acceptHeader
        && !acceptHeader.includes('application/json')
        && !additionalTypes.some((type) => acceptHeader.includes(type))) {
      return next(new AppError(
        'Not Acceptable. This API primarily serves JSON content.',
        406,
      ));
    }

    res.setHeader('Content-Type', 'application/json');

    next();
  };
};

export default ContentTypeCheck;
