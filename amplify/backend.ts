import { defineBackend, defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

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

// Define the Student Scans Lambda (studentScans) using environment variables for DB access
const studentScansFn = defineFunction({
  name: 'studentScans',
  runtime: 20, // Node.js 20
  entry: './functions/studentScans/index.ts',
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

export const backend = defineBackend({
  studentSearchFn,
  studentScansFn,
});

// Add S3 permissions to the Lambda function for photo uploads
backend.studentSearchFn.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      's3:PutObject',
      's3:PutObjectAcl',
      's3:GetObject',
      's3:DeleteObject'
    ],
    resources: [
      'arn:aws:s3:::schoollink-student-photos/student-photos/*'
    ]
  })
);

// Attach a public Function URL (DEV only). Lock down later in prod.
const studentSearchFnUrl = backend.studentSearchFn.resources.lambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
    allowedHeaders: ['*'],
  },
});

// Attach a public Function URL for studentScans function
const studentScansFnUrl = backend.studentScansFn.resources.lambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
    allowedHeaders: ['*'],
  },
});

// Expose the Function URLs to the frontend build via amplify_outputs.json
backend.addOutput({
  custom: {
    STUDENT_API_BASE: studentSearchFnUrl.url.replace(/\/$/, ''),
    STUDENT_SCANS_API_BASE: studentScansFnUrl.url.replace(/\/$/, ''),
  }
});
