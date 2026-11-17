import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildNotificationEnvelope
} from '../../src/messaging/notification.publisher.mjs';
import { messageTypes } from '../../src/messaging/message-types.mjs';

describe('browser notification publisher', () => {
  test('adds a stable notification ID', () => {
    const envelope = buildNotificationEnvelope({
      id: 'outbox-message-123',
      type:
        messageTypes.registrationCreatedNotification,
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    });

    assert.deepEqual(envelope, {
      notificationId: 'outbox-message-123',
      type:
        messageTypes.registrationCreatedNotification,
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    });
  });

  test('does not add participant information', () => {
    const envelope = buildNotificationEnvelope({
      id: 'outbox-message-456',
      type:
        messageTypes.registrationCreatedNotification,
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    });

    const serialized = JSON.stringify(envelope);

    assert.doesNotMatch(serialized, /Alex Student/);
    assert.doesNotMatch(
      serialized,
      /student@example\.com/
    );
  });
});
