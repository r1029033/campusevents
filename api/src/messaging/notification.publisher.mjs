import {
  browserNotificationExchangeName
} from './queue-names.mjs';
import {
  getPublisherChannel
} from './rabbitmq.publisher.mjs';

export function buildNotificationEnvelope(message) {
  return {
    notificationId: message.id,
    type: message.type,
    payload: message.payload
  };
}

export async function publishNotificationMessage(
  message
) {
  const channel = await getPublisherChannel();

  await channel.assertExchange(
    browserNotificationExchangeName,
    'fanout',
    {
      durable: true
    }
  );

  const envelope =
    buildNotificationEnvelope(message);

  channel.publish(
    browserNotificationExchangeName,
    '',
    Buffer.from(JSON.stringify(envelope)),
    {
      persistent: true,
      contentType: 'application/json',
      messageId: message.id,
      type: message.type,
      timestamp: Date.now()
    }
  );

  await channel.waitForConfirms();
}
