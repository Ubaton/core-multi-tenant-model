import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRole } from '@/lib/types/db';
import { canManageRegistrationLink } from './permissions';

test('only super admins and church admins can create or rotate registration links', () => {
  for (const role of Object.values(UserRole)) {
    assert.equal(
      canManageRegistrationLink(role),
      role === UserRole.SUPER_ADMIN || role === UserRole.CHURCH_ADMIN,
      role,
    );
  }
});

test('missing or unrecognized roles cannot generate registration links', () => {
  for (const role of [null, undefined, '', 'ADMIN', 'super_admin']) {
    assert.equal(canManageRegistrationLink(role), false);
  }
});
