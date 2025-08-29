#!/usr/bin/env node
/*
  Wait for the Lambda deployment to be live by polling a health endpoint.
  Defaults:
    - BASE: from process.env.STUDENT_API_BASE or amplify_outputs.json custom.STUDENT_API_BASE
    - HEALTH path: /health (override via process.env.HEALTH_PATH)
    - TIMEOUT_MS: 600000 (10 minutes) (override via env)
    - POLL_INTERVAL_MS: 15000 (15 seconds) (override via env)

  Example (PowerShell):
    $env:STUDENT_API_BASE="https://<lambda-url>"; node scripts/wait-for-deploy.js
    $env:TIMEOUT_MS="180000"; $env:POLL_INTERVAL_MS="10000"; node scripts/wait-for-deploy.js
*/

const fs = require('fs');
const path = require('path');

function readBaseFromAmplifyOutputs() {
  try {
    const p = path.resolve(process.cwd(), 'amplify_outputs.json');
    const raw = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(raw);
    const base = (j.custom && j.custom.STUDENT_API_BASE) || '';
    return String(base || '').replace(/\/+$/, '');
  } catch {
    return '';
  }
}

const BASE = (process.env.STUDENT_API_BASE || readBaseFromAmplifyOutputs() || '').replace(/\/+$/, '');
const PATH = (process.env.HEALTH_PATH || '/health').replace(/^\/+/, '');
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || '600000'); // 10 min
const POLL_MS = Number(process.env.POLL_INTERVAL_MS || '15000'); // 15s

if (!BASE) {
  console.error('ERROR: STUDENT_API_BASE not set and amplify_outputs.json missing custom.STUDENT_API_BASE');
  process.exit(1);
}

function joinUrl(base, p) {
  const b = (base || '').replace(/\/+$/, '');
  const q = (p || '').replace(/^\/+/, '');
  return `${b}/${q}`;
}

const url = joinUrl(BASE, PATH);
console.log(`Waiting for deploy: polling ${url} (timeout ${TIMEOUT_MS}ms, interval ${POLL_MS}ms)`);

const start = Date.now();
let attempts = 0;

async function poll() {
  attempts++;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      console.log(`HEALTH OK (${res.status}) after ${attempts} attempt(s), ${Date.now() - start}ms.`);
      process.exit(0);
    }
    console.log(`Health check attempt ${attempts}: status ${res.status} ${res.statusText}`);
  } catch (e) {
    console.log(`Health check attempt ${attempts} failed: ${String(e)}`);
  }

  if (Date.now() - start >= TIMEOUT_MS) {
    console.error(`Timeout waiting for deploy after ${attempts} attempts.`);
    process.exit(1);
  }
  setTimeout(poll, POLL_MS);
}

poll();
