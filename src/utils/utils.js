/* eslint-disable no-undef */
// utils.js
import { v4 as uuidv4 } from 'uuid';
// Function to generate a random UUID

function getRandomUUID() {
  return uuidv4().replace(/-/g, '').substring(0, 23);
}

const utils = {
  getRandomUUID,
};

export default utils;
