import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import {
  addNotificationClient,
  broadcastNotification,
  closeNotificationClients,
  formatSseNotification,
  getNotificationClientCount
} from '../../src/notifications/notification.hub.mjs';

function createFakeClient() {
  return {
    events: [],
    ended: false,

    write(event) {
      this.events.push(event);
    },

    end() {
      this.ended = true;
    }
  };
}

afterEach(() => {
  closeNotificationClients();
});

describe('notification SSE hub', () => {
  test('formats a named SSE notification', () => {
    const formatted = formatSseNotification({
      notificationId: 'message-123',
      type: 'notification.event-created',
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    });

    assert.match(formatted, /^id: message-123/m);
    assert.match(formatted, /^event: notification/m);
    assert.match(formatted, /^data: /m);
    assert.match(formatted, /\n\n$/);
  });

  test('broadcasts once to every connected client', () => {
    const first = createFakeClient();
    const second = createFakeClient();

    addNotificationClient(first);
    const removeSecond =
      addNotificationClient(second);

    broadcastNotification({
      notificationId: 'message-456',
      type: 'notification.registration-created',
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    });

    assert.equal(first.events.length, 1);
    assert.equal(second.events.length, 1);
    assert.equal(getNotificationClientCount(), 2);

    removeSecond();

    broadcastNotification({
      notificationId: 'message-789',
      type: 'notification.event-created',
      payload: {
        eventId: 43,
        eventTitle: 'Design Workshop'
      }
    });

    assert.equal(first.events.length, 2);
    assert.equal(second.events.length, 1);
    assert.equal(getNotificationClientCount(), 1);
  });

  test('closes all clients during shutdown', () => {
    const client = createFakeClient();
    addNotificationClient(client);

    closeNotificationClients();

    assert.equal(client.ended, true);
    assert.equal(getNotificationClientCount(), 0);
  });
});
