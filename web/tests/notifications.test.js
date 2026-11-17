import {
  describe,
  expect,
  it,
  vi
} from 'vitest';
import {
  connectToNotifications
} from '../src/api/notifications.js';

function createFakeEventSource() {
  const listeners = new Map();

  return {
    listeners,
    close: vi.fn(),

    addEventListener(type, listener) {
      listeners.set(type, listener);
    },

    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    }
  };
}

describe('notification SSE client', () => {
  it('parses named notification events', () => {
    const source = createFakeEventSource();
    const onNotification = vi.fn();
    const factory = vi.fn(() => source);

    connectToNotifications({
      onNotification,
      eventSourceFactory: factory
    });

    source.listeners.get('notification')({
      data: JSON.stringify({
        notificationId: 'message-123',
        type: 'notification.event-created',
        payload: {
          eventId: 42,
          eventTitle: 'Campus Coding Night'
        }
      })
    });

    expect(factory).toHaveBeenCalledWith(
      '/api/notifications'
    );

    expect(onNotification).toHaveBeenCalledWith({
      notificationId: 'message-123',
      type: 'notification.event-created',
      payload: {
        eventId: 42,
        eventTitle: 'Campus Coding Night'
      }
    });
  });

  it('ignores malformed JSON', () => {
    const source = createFakeEventSource();
    const onNotification = vi.fn();

    connectToNotifications({
      onNotification,
      eventSourceFactory: () => source
    });

    source.listeners.get('notification')({
      data: '{invalid'
    });

    expect(onNotification).not.toHaveBeenCalled();
  });

  it('closes the EventSource during cleanup', () => {
    const source = createFakeEventSource();

    const disconnect = connectToNotifications({
      onNotification: vi.fn(),
      eventSourceFactory: () => source
    });

    disconnect();

    expect(source.close).toHaveBeenCalledOnce();
    expect(
      source.listeners.has('notification')
    ).toBe(false);
  });
});
