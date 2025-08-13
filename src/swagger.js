import dotenv from 'dotenv';
import {
  fileURLToPath
} from 'url';
import path from 'path';
import apiTags from "./apiDocs/tags.js";
import formVApiPath from "./apiDocs/formVApiDocs.js";
import commonApiPath from "./apiDocs/commonApiDocs.js";

const __filename = fileURLToPath(
  import.meta.url);

const __dirname = path.dirname(__filename);

dotenv.config({
  path: `${__dirname}/.env`,
  silent: true
});

const swaggerSpec = { 
  openapi: '3.0.0',
  info: {
    title: 'Labour services API Documentation',
    version: '1.0.0',
    description: 'API documentation for Labour services API',
  },
  servers: [
    {
      url: process.env.LABOUR_SERVICE_URL_SWAGGER,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',            // Use 'http' type for Bearer tokens
        scheme: 'bearer',        // Specify the scheme as 'bearer'
        bearerFormat: 'JWT',     // Optional, you can specify 'JWT' here
        description: 'Enter your Bearer token to access the API'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: apiTags.tags,
  paths: {
    ...commonApiPath.paths,
    ...formVApiPath.paths,
  },
};

export default swaggerSpec;
