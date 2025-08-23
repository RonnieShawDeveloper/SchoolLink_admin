import { defineBackend, defineFunction, defineRestApi } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

// Define the Get Student Lambda (studentSearch) using environment variables for DB access
const studentSearchFn = defineFunction({
  name: 'studentSearch',
  runtime: 20, // Node.js 20
  entry: './functions/studentSearch/index.ts',
  environment: {
    DB_HOST: process.env.DB_HOST || '',
    DB_PORT: process.env.DB_PORT || '3306',
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || '',
    DB_SSL: process.env.DB_SSL || 'true',
    DB_CHARSET: process.env.DB_CHARSET || 'utf8mb4',
  },
});

// Expose REST API routes mapped to the same function handler
const api = defineRestApi({
  name: 'student-api',
  routes: [
    { path: '/students/search', method: 'GET', function: studentSearchFn },
    { path: '/students/by-institution', method: 'GET', function: studentSearchFn },
    { path: '/students/update', method: 'POST', function: studentSearchFn },
  ],
  authorizationType: 'NONE',
});

// Register resources with Amplify backend (keeping existing auth & data)
defineBackend({
  auth,
  data,
  studentSearchFn,
  api,
});
