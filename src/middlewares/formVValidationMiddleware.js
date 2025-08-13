import AppError from '../utils/appError.js';
import basicDetails from '../validators/formV/basicDetails.js';
import communicationDetails from '../validators/formV/communicationAddress.js';

const formVValidationMiddleware = async (req, res, next) => {
  let validationRules;

  switch (req.params.pageId) {
    case '1':
      validationRules = basicDetails;
      break;
    case '2':
      validationRules = communicationDetails;
      break;
    default:
      return next(new AppError('Invalid page', 400));
  }

  try {
    await Promise.all(validationRules.map((rule) => rule.run(req)));
    next();
  } catch (error) {
    next(error);
  }
};

export default formVValidationMiddleware;
