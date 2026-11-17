const notificationUrl = '/api/notifications';

function defaultEventSourceFactory(url) {
  return new EventSource(url);
}

export function connectToNotifications({
  onNotification,
  onError = () => {},
  eventSourceFactory = defaultEventSourceFactory
}) {
  const source =
    eventSourceFactory(notificationUrl);

  function handleNotification(event) {
    try {
      const notification = JSON.parse(event.data);
      onNotification(notification);
    } catch {
      // Invalid server events are ignored.
    }
  }

  source.addEventListener(
    'notification',
    handleNotification
  );

  source.addEventListener('error', onError);

  return () => {
    source.removeEventListener(
      'notification',
      handleNotification
    );

    source.removeEventListener('error', onError);
    source.close();
  };
}
