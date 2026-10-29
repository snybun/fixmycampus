import assert from 'node:assert/strict';
import { assignReport } from '../frontend/src/services/api.js';

const input = { report_id: 42, assigned_to: 7, expected_admin_id: 1 };
for (const session of [
  { authenticated: false, user: null },
  { authenticated: true, user: { id: 5, role_name: 'student' } },
  { authenticated: true, user: { id: 7, role_name: 'technician' } },
  { authenticated: true, user: { id: 8, role_name: 'admin' } },
]) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => session };
  };
  const result = await assignReport(input);
  assert.equal(result.error_code, 'SESSION_CHANGED');
  assert.equal(calls.length, 1, 'Changed sessions must never submit an assignment');
  assert.equal(calls[0].options.cache, 'no-store');
}

for (const response of [
  { success: true, message: 'Assigned' },
  { success: false, error_code: 'FORBIDDEN', message: 'Session changed during request' },
]) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => calls.length === 1
      ? { authenticated: true, user: { id: 1, role_name: 'admin' } }
      : response };
  };
  assert.deepEqual(await assignReport(input), response);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.credentials, 'include');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(JSON.parse(calls[1].options.body).assigned_to, 7);
}
console.log('PASS: assignment session checks, administrator submission, and server denial handling');
