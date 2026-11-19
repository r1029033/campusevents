import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  enforceFullTlsVerification
} from '../../src/db/postgres-url.mjs';

describe('PostgreSQL connection security', () => {
  it('upgrades sslmode=require to verify-full', () => {
    const result = enforceFullTlsVerification(
      'postgres://user:pass@example.com/events?sslmode=require'
    );

    assert.equal(
      new URL(result).searchParams.get('sslmode'),
      'verify-full'
    );
  });

  it('does not force TLS on a local URL without sslmode', () => {
    const input = 'postgres://user:pass@localhost/events';
    const result = enforceFullTlsVerification(input);

    assert.equal(
      new URL(result).searchParams.has('sslmode'),
      false
    );
  });
});
