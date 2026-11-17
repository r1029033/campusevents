const clients = new Set();

export function formatSseNotification(notification) {
  return [
    `id: ${notification.notificationId}`,
    'event: notification',
    `data: ${JSON.stringify(notification)}`,
    '',
    ''
  ].join('\n');
}

export function addNotificationClient(response) {
  clients.add(response);

  return () => {
    clients.delete(response);
  };
}

export function broadcastNotification(notification) {
  const event = formatSseNotification(notification);

  for (const client of clients) {
    try {
      client.write(event);
    } catch {
      clients.delete(client);
    }
  }
}

export function closeNotificationClients() {
  for (const client of clients) {
    client.end();
  }

  clients.clear();
}

export function getNotificationClientCount() {
  return clients.size;
}
