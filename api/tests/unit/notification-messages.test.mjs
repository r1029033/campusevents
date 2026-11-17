import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  buildEventCreatedNotification,
  buildRegistrationCreatedNotification
} from '../../src/messaging/notification-messages.mjs';
import { messageTypes } from '../../src/messaging/message-types.mjs';

const event = {
  id: 42,
  title: 'Campus Coding Night'
};

describe('browser notification messages', () => {
  test('builds a public event-created message', () => {
    const message =
      buildEventCreatedNotification(event);

    assert.deepEqual(message, {
      type: messageTypes.eventCreatedNotification,
      aggregateId: '42',
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    });
  });

  test('registration message contains no participant data', () => {
    const message =
      buildRegistrationCreatedNotification(event);

    assert.deepEqual(message, {
      type:
        messageTypes.registrationCreatedNotification,
      aggregateId: '42',
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    });

    const serializedMessage = JSON.stringify(message);

    assert.doesNotMatch(
      serializedMessage,
      /participant@example\.com/
    );

    assert.doesNotMatch(
      serializedMessage,
      /Alex Student/
    );
  });
});