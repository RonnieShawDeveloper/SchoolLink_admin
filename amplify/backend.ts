import { defineBackend, defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';

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

// Register only the function; expose it via Lambda Function URL (no API Gateway needed)
export const backend = defineBackend({
  studentSearchFn,
});

// Add a public Function URL with permissive CORS (dev). Restrict in production.
backend.studentSearchFn.resources.cdkFunction.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST, lambda.HttpMethod.OPTIONS],
    allowedHeaders: ['*'],
  },
});
