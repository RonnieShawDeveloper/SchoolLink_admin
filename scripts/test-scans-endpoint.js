#!/usr/bin/env node
/*
  Sandbox test for scans endpoint.
  Usage (PowerShell examples):
  - $env:STUDENT_API_BASE="https://<base>"; $env:SCANS_TODAY_PATH="/scans/today"; node scripts/test-scans-endpoint.js
  - $env:STUDENT_IDS="2407401496,123456"; node scripts/test-scans-endpoint.js
  - $env:DRY_RUN="1"; node scripts/test-scans-endpoint.js

  Behavior:
  - If SCANS_TODAY_PATH is provided, tests only that path.
  - Otherwise, tries common fallbacks: /scans/today, /api/scans/today, /prod/scans/today.
  - For each candidate, tries POST JSON {student_ids:[...]} and, on 404, retries GET with query string.
  - Prints PASS with count of items or FAIL with reason. Exits with code 0 on PASS, 1 on FAIL.
*/

const BASE = (process.env.STUDENT_API_BASE || '').replace(/\/+$/, '');
const IDS = (process.env.STUDENT_IDS || '2407401496').split(',').map(s => s.trim()).filter(Boolean);
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const overridePath = process.env.SCANS_TODAY_PATH || '';

if (!BASE && !/^https?:\/\//i.test(overridePath)) {
  console.error('ERROR: STUDENT_API_BASE is not set and SCANS_TODAY_PATH is not an absolute URL.');
  process.exit(1);
}

const candidates = overridePath
  ? [overridePath]
  : ['/scans/today', '/api/scans/today', '/prod/scans/today'];

function joinUrl(base, path) {
  if (/^https?:\/\//i.test(path)) return path;
  const b = (base || '').replace(/\/+$/, '');
  const p = (path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
}

async function tryOne(url) {
  if (DRY) {
    console.log(`[DRY] Would POST ${url} with body { student_ids: [${IDS.join(', ')}] }`);
    console.log(`[DRY] Would GET  ${url}?student_ids=${encodeURIComponent(IDS.join(','))}`);
    return { ok: true, url, dry: true };
  }

  // Prefer POST JSON
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_ids: IDS })
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, url, method: 'POST', data };
    }
    if (res.status !== 404) {
      return { ok: false, url, method: 'POST', status: res.status, statusText: res.statusText };
    }
  } catch (e) {
    return { ok: false, url, method: 'POST', error: String(e) };
  }

  // Fallback GET if POST was 404
  try {
    const qs = new URLSearchParams({ student_ids: IDS.join(',') }).toString();
    const getUrl = url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
    const res = await fetch(getUrl);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, url: getUrl, method: 'GET', data };
    }
    return { ok: false, url: getUrl, method: 'GET', status: res.status, statusText: res.statusText };
  } catch (e) {
    return { ok: false, url, method: 'GET', error: String(e) };
  }
}

(async () => {
  const urls = candidates.map(p => joinUrl(BASE, p));
  for (const u of urls) {
    console.log(`Testing endpoint: ${u}`);
    const r = await tryOne(u);
    if (r.ok) {
      if (r.dry) {
        console.log('PASS (DRY RUN).');
        process.exit(0);
      }
      // Validate response shape minimally
      const items = r.data && Array.isArray(r.data.items) ? r.data.items : [];
      console.log(`PASS ${r.method || ''} ${r.url} -> items: ${items.length}`);
      process.exit(0);
    } else {
      console.warn(`Attempt failed (${r.method || 'POST/GET'}):`, r.status || r.error || r.statusText || 'unknown error');
    }
  }
  console.error('FAIL: No candidate endpoint succeeded.');
  process.exit(1);
})();
