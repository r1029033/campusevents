import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createTestApp } from '../helpers/testApp.mjs';
import { OutboxMessage } from '../../src/models/index.mjs';
import {
  markPublished
} from '../../src/repositories/outbox.repository.mjs';

describe('outbox repository', () => {
  beforeEach(async () => {
    await createTestApp();
  });

  it('removes the payload after confirmed publication', async () => {
    const message = await OutboxMessage.create({
      type: 'email.registration-confirmation',
      aggregateId: '42',
      payload: {
        email: 'private@example.com',
        name: 'Private Person'
      }
    });

    const published = await markPublished(message.id);
    const stored = await OutboxMessage.findByPk(message.id);

    assert.equal(published, true);
    assert.deepEqual(stored.payload, {});
    assert.ok(stored.publishedAt instanceof Date);
  });
});
