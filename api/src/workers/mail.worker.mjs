import amqp from 'amqplib';
import { env } from '../config/env.mjs';
import { logger } from '../config/logger.mjs';
import { sendRegistrationConfirmation } from '../mail/mail.sender.mjs';
import { mailQueueName } from '../messaging/mail.queue.mjs';

if (!env.amqpUrl) {
  throw new Error('AMQP_URL is required to start the mail worker');
}

const connection = await amqp.connect(env.amqpUrl);
const channel = await connection.createChannel();

await channel.assertQueue(mailQueueName, {
  durable: true
});

await channel.prefetch(1);

logger.info('Mail worker started', {
  queue: mailQueueName
});

await channel.consume(mailQueueName, async (message) => {
  if (!message) {
    return;
  }

  let job;

  try {
    job = JSON.parse(message.content.toString());
  } catch (err) {
    logger.error('Discarding invalid mail job', {
      message: err.message
    });

    channel.nack(message, false, false);
    return;
  }

  try {
    await sendRegistrationConfirmation(job);
    channel.ack(message);

    logger.info('Confirmation mail sent', {
      email: job.email,
      eventTitle: job.eventTitle
    });
  } catch (err) {
    logger.error('Confirmation mail failed; retrying', {
      message: err.message,
      email: job.email
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });

    channel.nack(message, false, true);
  }
});