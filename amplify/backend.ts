import { defineBackend, defineFunction, defineHttpApi } from '@aws-amplify/backend';

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

// Define HTTP API and map routes to the function
const api = defineHttpApi({
  name: 'student-api',
  routes: {
    'GET /students/search': studentSearchFn,
    'GET /students/by-institution': studentSearchFn,
    'POST /students/update': studentSearchFn,
  },
});

export const backend = defineBackend({
  studentSearchFn,
  api,
});
