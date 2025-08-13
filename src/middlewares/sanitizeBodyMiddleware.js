/* eslint-disable no-else-return */
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

const sanitizeBodyMiddleware = (req, res, next) => {
  const { body } = req;
  const sanitizedBody = {};
  const stack = [{ source: body, target: sanitizedBody }];
  while (stack.length > 0) {
    const { source, target } = stack.pop();
    Object.keys(source).forEach((key) => {
      const value = source[key];
      if (value === null) {
        target[key] = null; // Preserve null values
      } else if (Array.isArray(value)) {
        target[key] = value.map((item) => {
          if (item === null) {
            return null; // Preserve null values in arrays
          } else if (typeof item === 'object' && item !== null) {
            return {};
          } else if (typeof item === 'boolean') {
            return item; // Preserve boolean values
          } else if (typeof item === 'number') {
            return item; // Preserve numeric values
          } else {
            return DOMPurify.sanitize(item);
          }
        });
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            stack.push({ source: item, target: target[key][index] });
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        target[key] = {};
        stack.push({ source: value, target: target[key] });
      } else if (typeof value === 'boolean') {
        target[key] = value; // Preserve boolean values
      } else if (typeof value === 'number') {
        target[key] = value; // Preserve numeric values
      } else {
        target[key] = DOMPurify.sanitize(value);
      }
    });
  }
  req.body = sanitizedBody;
  next();
};

export default sanitizeBodyMiddleware;
