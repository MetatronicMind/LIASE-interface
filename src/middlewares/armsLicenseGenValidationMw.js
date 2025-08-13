import AppError from '../utils/appError.js';
import pageSeven from '../validators/armsLicenseGen/pageSeven.js';
import pageFour from '../validators/armsLicenseGen/pageFour.js';
import pageFive from '../validators/armsLicenseGen/pageFive.js';
import pageSix from '../validators/armsLicenseGen/pageSix.js';
import pageEight from '../validators/armsLicenseGen/pageEight.js';


const armsLicenseGenValidationMiddleware = async (req, res, next) => {
    let validationRules;

    switch (req.params.pageId) {
        case '1':
            validationRules = pageFour;
            break;
        case '2':
            validationRules = pageFive;
            break;
        case '3':
            validationRules = pageSix;
            break;
        case '4':
            validationRules = pageSeven;
            break;
        case '5':
            validationRules = pageEight;
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

export default armsLicenseGenValidationMiddleware;
