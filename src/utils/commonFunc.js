import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import stateModel from '../models/common/stateModel.js';
import AppError from './appError.js';
import districtModel from '../models/common/districtModel.js';
import countriesModel from '../models/common/countriesModel.js';
import genderModel from '../models/common/genderModel.js';
import upmsUserModel from '../models/common/upmsUserModel.js';
import branchModel from '../models/common/branchModel.js';

// get religion from the api
async function getReligionDetails(religionId) {
  if (!religionId || typeof Number(religionId) !== 'number') {
    throw new AppError('Invalid religion ID provided', 400);
  }

  const RELIGION_API_URL = 'https://api.sewasetu.assam.statedatacenter.in/masterdata/api/v1/religions';

  try {
    const response = await axios.get(RELIGION_API_URL, {
      timeout: 5000,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.data?.data) {
      throw new AppError('Invalid response format from religion API', 502);
    }

    const religionData = response.data.data.find((item) => item.id === Number(religionId));

    if (!religionData) {
      throw new AppError(`No religion found with ID: ${religionId}`, 404);
    }

    return {
      id: religionData.id,
      name: religionData.name,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error.code === 'ECONNABORTED') {
      throw new AppError('Religion API request timed out', 504);
    }
    throw new AppError(`Error fetching religion details: ${error.message}`, 500);
  }
}

// get community from the api
async function getCommunityDetails(communityId, caste) {
  if (!communityId || typeof Number(communityId) !== 'number') {
    throw new AppError('Invalid community ID provided', 400);
  }

  const COMMUNITY_API_URL = 'https://api.sewasetu.assam.statedatacenter.in/masterdata/api/v1/communities';

  try {
    const response = await axios.get(COMMUNITY_API_URL, {
      timeout: 5000,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.data?.data) {
      throw new AppError('Invalid response format from community API', 502);
    }

    const communityData = response.data.data.find((item) => item.id === Number(communityId)
      && item.caste_id === Number(caste));

    if (!communityData) {
      throw new AppError(`No community found with ID: ${communityId} and caste: ${caste}`, 404);
    }

    return {
      id: communityData.id,
      name: communityData.community_name,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error.code === 'ECONNABORTED') {
      throw new AppError('Community API request timed out', 504);
    }
    throw new AppError(`Error fetching community details: ${error.message}`, 500);
  }
}

// get caste from the api
async function getCasteDetails(casteId) {
  if (!casteId || typeof Number(casteId) !== 'number') {
    throw new AppError('Invalid caste ID provided', 400);
  }

  const CASTE_API_URL = 'https://api.sewasetu.assam.statedatacenter.in/masterdata/api/v1/castes';

  try {
    const response = await axios.get(CASTE_API_URL, {
      timeout: 5000, // 5 sec
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.data?.data) {
      throw new AppError('Invalid response format from caste API', 502);
    }

    const casteData = response.data.data.find((item) => item.id === Number(casteId));

    if (!casteData) {
      throw new AppError(`No caste found with ID: ${casteId}`, 404);
    }

    return {
      id: casteData.id,
      name: casteData.name,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error.code === 'ECONNABORTED') {
      throw new AppError('Caste API request timed out', 504);
    }
    throw new AppError(`Error fetching caste details: ${error.message}`, 500);
  }
}

// function to get branches by polyCode
async function getBranches(polyCode) {
  try {
    const dbResult = await branchModel
      .findOne({ poly_code: polyCode }, { branched_mapped: 1, _id: 0 })
      .lean();

    return dbResult?.branched_mapped || null;
  } catch (error) {
    throw new AppError('Error fetching branches list', 500);
  }
}

// Get user information JWT
function loginUserInfo(reqToken) {
  try {
    // API Key
    const apiKey = 'YXNzYW1AdXRlc2F3ZXMjvWGSNxH1MHpy8ypSr7zPfzC6Coic1fWCmkims_YD_8c';

    // Verify the token
    const decoded = jwt.verify(reqToken, apiKey, { algorithms: ['HS256'] });

    // Return the decoded token payload (user info)
    return {
      status: true,
      userData: decoded.data,
      message: 'User information retrive successfully',
    };
  } catch (error) {
    // Handle the error (invalid token or other issues)
    return {
      status: false,
      message: 'Invalid token or unable to decode JWT',
    };
  }
}

// Custom validator function for pin code validation
function validatePinCode(value) {
  const regex = /^\d{6}$/;
  return regex.test(value);
}

// Generate your unique application ID here
function generateApplicationId() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const buffer = crypto.randomBytes(4);
      const applicationId = (parseInt(buffer.toString('hex'), 16) % 9000000) + 1000000;
      if (applicationId) {
        resolve(applicationId);
      } else {
        reject(new AppError('Failed to generate application ID'));
      }
    }, 0);
  });
}

// Generate your unique application ID here
function generateRTPSId(serviceId, applicationId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const currentYear = new Date().getFullYear();
      const rtpsRefNo = `RTPS-${serviceId}/${currentYear}/${applicationId}`;
      if (rtpsRefNo) {
        resolve(rtpsRefNo);
      } else {
        reject(new AppError('Failed to generate RTPS Ref. No'));
      }
    }, 0);
  });
}

// Gender List
async function genderList() {
  const count = await genderModel.countDocuments({});

  if (count > 0) {
    const dbResult = await genderModel.find({});
    return dbResult;
  }
  return null;
}

// Countries List
async function countriesList() {
  const count = await countriesModel.countDocuments({});

  if (count > 0) {
    const dbResult = await countriesModel.find({});

    return dbResult;
  }
  return null;
}

// State by ID
async function stateById(stateId) {
  const stateResult = await stateModel.findOne({ state_code: parseInt(stateId, 10) });

  if (!stateResult) {
    return null;
  }

  return stateResult;
}

// District by ID
async function districtById(districtId) {
  const districtResult = await districtModel.findOne({ district_code: parseInt(districtId, 10) });

  if (!districtResult) {
    return null;
  }

  return districtResult;
}

// State List - with aggregation,same as in ci for dte
async function stateList() {
  const count = await stateModel.countDocuments({});
  if (count > 0) {
    const dbResult = await stateModel.aggregate([
      {
        $project: {
          _id: 0,
          state_name: '$state_name_english',
          state_code: 1,
          slc: 1,
        },
      },
      { $sort: { state_name: 1 } },
    ]);
    return dbResult;
  }
  return null;
}

// District List
async function districtList(stateId) {
  const count = await districtModel.countDocuments({});
  if (count > 0) {
    const dbResult = await districtModel.aggregate([
      {
        $match: {
          slc: parseInt(stateId, 10),
          isactive: 'True',
        },
      },
      {
        $sort: {
          district_name_english: 1,
        },
      },
      {
        $project: {
          _id: 0,
          district_name: '$district_name_english',
          district_code: 1,
          slc: 1,
        },
      },
    ]);

    return dbResult;
  }
  return null;
}

// // Financial Year
// function getFinYear() {
//   const today = new Date();
//   const month = today.getMonth() + 1; // Months are zero-indexed

//   return new Promise((resolve) => {
//     const year = month >= 4 ? today.getFullYear() : today.getFullYear() - 1;
//     const nextYear = year + 1;
//     resolve(`${year}-${nextYear}`);
//   });
// }

// EGRASS From Date
// function firstDateFinYear() {
//   return new Promise((resolve, reject) => {
//     const today = new Date();
//     const month = today.getMonth(); // Get the current month (0-indexed)

//     const year = month >= 4 ? today.getFullYear() : today.getFullYear() - 1;

//     const formattedDate = `01/04/${year}`;
//     resolve(formattedDate);
//   });
// }

// EGRASS To Date
// function toDateFinYear() {
//   return new Promise((resolve, reject) => {
//     const toDate = '31/03/2099';
//     resolve(toDate);
//   });
// }

// Fetch UPMS User List based condition provieded
async function usersList(data) {
  const dbResult = await upmsUserModel.find(data);
  const count = await upmsUserModel.countDocuments(data);

  if (count > 0) {
    return dbResult;
  }
  return null;
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
// function generateApplicationId() {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       const min = 1000000;
//       const max = 9999999; //7 digits
//       const applicationId = Math.floor(Math.random() * (max - min + 1)) + min;

//       if (applicationId) {
//         resolve(applicationId);
//       } else {
//         reject(new AppError('Failed to generate application ID'));
//       }
//     }, 0);
//   });
// }

// function generateApplicationId() {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       const buffer = crypto.randomBytes(4);
//       const applicationId = parseInt(buffer.toString('hex'), 16);
//       if (applicationId) {
//         resolve(applicationId);
//       } else {
//         reject(new AppError('Failed to generate application ID'));
//       }
//     }, 0);
//   });
// }
const exportedFunctions = {
  loginUserInfo,
  stateList,
  stateById,
  districtById,
  validatePinCode,
  generateApplicationId,
  generateRTPSId,
  districtList,
  countriesList,
  usersList,
  genderList,
  getBranches,
  isValidEmail,
  getCasteDetails,
  getCommunityDetails,
  getReligionDetails,
};

export default exportedFunctions;
