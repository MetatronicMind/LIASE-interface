import AppError from '../utils/appError.js';
import pageSeven from '../validators/armsLicense/pageSeven.js';
import pageThree from '../validators/armsLicense/pageThree.js';
import pageTwo from '../validators/armsLicense/pageTwo.js';
import pageFour from '../validators/armsLicense/pageFour.js';
import pageFive from '../validators/armsLicense/pageFive.js';
import pageSix from '../validators/armsLicense/pageSix.js';
import pageEight from '../validators/armsLicense/pageEight.js';


const homePoliticValidationMiddleware = async (req, res, next) => {
    let validationRules;

    switch (req.params.pageId) {
        case '1':
            validationRules = pageThree;
            break;
        case '2':
            validationRules = pageFour;
            break;
        case '3':
            validationRules = pageFive;
            break;
        case '4':
            validationRules = pageSix;
            break;
        case '5':
            validationRules = pageSeven;
            break;
        case '6':
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

export default homePoliticValidationMiddleware;
