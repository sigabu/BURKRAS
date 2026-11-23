import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, submitLead, validateLead } from '../site/assets/leads.js';

const example = { name: 'Тест', phone: '8 (999) 123-45-67', consent: true, service: 'drilling', source: 'contact' };
test('Russian phone formats normalize, short or foreign numbers fail', () => {
  for (const phone of ['8 (999) 123-45-67', '+7 999 123 45 67', '9991234567']) assert.equal(normalizePhone(phone), '+79991234567');
  for (const phone of ['', '12345', '+1 999 123 45 67', '+7 999 123 45 678']) assert.equal(normalizePhone(phone), null);
});
test('invalid lead, missing consent and unknown service cannot submit', async () => {
  assert.equal(validateLead(example), null);
  for (const changes of [{ consent: false }, { consent: 'yes' }, { phone: '123' }, { service: 'none' }, { source: 'none' }, { comment: 'x'.repeat(2001) }]) await assert.rejects(submitLead({ ...example, ...changes }));
});
test('demo never makes a request or returns false delivery confirmation', async () => {
  const result = await submitLead(example, { fetcher: () => { throw new Error('Network must not be called'); } });
  assert.deepEqual(result, { mode: 'demo', submitted: false });
});
test('live mode requires an HTTPS endpoint', async () => {
  await assert.rejects(submitLead(example, { demo: false, apiUrl: '' }));
  await assert.rejects(submitLead(example, { demo: false, apiUrl: 'http://example.com' }));
});
test('live mode serializes a normalized lead and requires server receipt', async () => {
  let request;
  const result = await submitLead(example, { demo: false, apiUrl: 'https://api.example.com/', fetcher: async (url, args) => { request = { url, ...args }; return { ok: true, json: async () => ({ id: 'test-receipt' }) }; } });
  assert.equal(request.url, 'https://api.example.com/leads');
  assert.equal(JSON.parse(request.body).phone, '+79991234567');
  assert.equal(JSON.parse(request.body).consent, true);
  assert.ok(request.headers['Idempotency-Key']);
  assert.deepEqual(result, { mode: 'live', submitted: true, id: 'test-receipt' });
  await assert.rejects(submitLead(example, { demo: false, apiUrl: 'https://api.example.com', fetcher: async () => ({ ok: true, json: async () => ({}) }) }));
});
test('server errors remain errors instead of success states', async () => {
  for (const status of [429, 500]) await assert.rejects(submitLead(example, { demo: false, apiUrl: 'https://api.example.com', fetcher: async () => ({ ok: false, status }) }));
});
