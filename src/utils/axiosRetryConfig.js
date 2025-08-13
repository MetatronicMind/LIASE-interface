import axios from 'axios';
import axiosRetry from 'axios-retry';

const configureAxiosRetry = ({
  retries = 3,
  baseDelay = 1000,
  includeServerErrors = true,
} = {}) => {
  axiosRetry(axios, {
    retries,
    retryDelay: (retryCount) => retryCount * baseDelay,
    retryCondition: (error) => axiosRetry.isNetworkOrIdempotentRequestError(error)
               || (includeServerErrors && error.response?.status >= 500),
  });
};

export default configureAxiosRetry;
