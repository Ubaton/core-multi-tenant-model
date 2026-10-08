import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRegistration } from './fields';

const valid = { names: ' Jane ', surname: ' Doe ', emailAddress: 'jane@example.com', cellNumber: '082 123 4567', country: 'South Africa', province: 'Gauteng' };

test('validates opening details, normalizes phone and strips unrelated member fields', () => {
  const result = validateRegistration({ ...valid, idNumber: 'private', occupation: 'private' });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.names, 'Jane');
    assert.equal(result.data.cellNumber, '0821234567');
    assert.equal(result.data.province, 'Gauteng');
    assert.equal(Object.keys(result.data).length, 6);
  }
});

test('requires all six opening fields', () => {
  for (const key of Object.keys(valid)) {
    const result = validateRegistration({ ...valid, [key]: '' });
    assert.equal(result.ok, false, key);
    if (!result.ok) assert.ok(result.errors[key], key);
  }
});

test('rejects invalid email, phone and oversized locations', () => {
  for (const override of [{ emailAddress: 'invalid' }, { cellNumber: '123' }, { country: 'a'.repeat(201) }, { province: 'a'.repeat(201) }]) {
    assert.equal(validateRegistration({ ...valid, ...override }).ok, false);
  }
});
