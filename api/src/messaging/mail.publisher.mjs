import {
  getPublisherChannel
} from './rabbitmq.publisher.mjs';
import { mailQueueName } from './queue-names.mjs';

export async function publishMailMessage(message) {
  const channel = await getPublisherChannel();

  await channel.assertQueue(mailQueueName, {
    durable: true
  });

  channel.sendToQueue(
    mailQueueName,
    Buffer.from(JSON.stringify(message.payload)),
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
