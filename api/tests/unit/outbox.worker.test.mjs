import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { messageTypes } from '../../src/messaging/message-types.mjs';
import { dispatchPendingMessages } from '../../src/workers/outbox.worker.mjs';

const message = {
  id: '7e73b905-541f-49ee-b978-f0f162f99483',
  type: messageTypes.registrationConfirmationEmail,
  payload: {
    email: 'student@example.com',
    eventTitle: 'Campus Coding Night'
  }
};

describe('outbox worker', () => {
  test('marks a message published after broker confirmation', async () => {
    const publishedIds = [];
    const completedIds = [];
    const failures = [];

    const result = await dispatchPendingMessages({
      loadPendingMessages: async () => [message],

      publishMessageToBroker: async (pendingMessage) => {
        publishedIds.push(pendingMessage.id);
      },

      markMessagePublished: async (id) => {
        completedIds.push(id);
      },

      recordMessageFailure: async (id, error) => {
        failures.push({ id, error });
      }
    });

    assert.deepEqual(publishedIds, [message.id]);
    assert.deepEqual(completedIds, [message.id]);
    assert.deepEqual(failures, []);

    assert.deepEqual(result, {
      processed: 1,
      published: 1,
      failed: 0
    });
  });

  test('records a retry when broker publication fails', async () => {
    const completedIds = [];
    const failures = [];
    const brokerError = new Error('RabbitMQ unavailable');

    const result = await dispatchPendingMessages({
      loadPendingMessages: async () => [message],

      publishMessageToBroker: async () => {
        throw brokerError;
      },

      markMessagePublished: async (id) => {
        completedIds.push(id);
      },

      recordMessageFailure: async (id, error) => {
        failures.push({ id, error });
      }
    });

    assert.deepEqual(completedIds, []);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].id, message.id);
    assert.equal(failures[0].error, brokerError);

    assert.deepEqual(result, {
      processed: 1,
      published: 0,
      failed: 1
    });
  });
});