import mongoose from 'mongoose';
import AppError from '../utils/appError.js';
import commonFuncs from '../utils/commonFunc.js';
import spApplicationModel from '../models/common/spApplicationModel.js';

const userIdentify = async (req, res, next) => {
  try {
    const id = req.params.id || req.query.id;
    if (!id) {
      throw new AppError('Missing id parameter', 400);
    }

    const authToken = req.headers.authorization?.split(' ')[1];
    if (!authToken) {
      throw new AppError('Authentication token is missing', 401);
    }

    const userDetails = commonFuncs.loginUserInfo(authToken);
    if (!userDetails.status) {
      throw new AppError(userDetails.message, 401);
    }

    const mongoQuery = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { 'service_data.appl_ref_no': id };

    const application = await spApplicationModel.findOne(mongoQuery).lean();
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const appliedBy = application.service_data.applied_by;
    const userId = typeof appliedBy === 'object' ? appliedBy._id.toString() : appliedBy;
    if (!userId) {
      throw new AppError('User not found', 400);
    }
    if (userId !== userDetails.userData.userId) {
      throw new AppError('Unauthorized access', 403);
    }

    req.user = userDetails.userData;
    next();
  } catch (error) {
    next(error);
  }
};

export default userIdentify;
