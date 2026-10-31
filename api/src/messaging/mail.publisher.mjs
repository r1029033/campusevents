import amqp from 'amqplib';
import { env } from '../config/env.mjs';
import { logger } from '../config/logger.mjs';
import { mailQueueName } from './mail.queue.mjs';

let channelPromise;

async function createChannel() {
  const connection = await amqp.connect(env.amqpUrl);

  connection.on('error', (err) => {
    logger.error('RabbitMQ connection error', {
      message: err.message
    });
  });

  connection.on('close', () => {
    channelPromise = undefined;
  });

  const channel = await connection.createConfirmChannel();

  await channel.assertQueue(mailQueueName, {
    durable: true
  });

  return channel;
}

async function getChannel() {
  channelPromise ??= createChannel();

  try {
    return await channelPromise;
  } catch (err) {
    channelPromise = undefined;
    throw err;
  }
}

export async function publishRegistrationConfirmation(job) {
  if (!env.amqpUrl) {
    logger.warn('Confirmation mail was not queued: AMQP_URL is missing');
    return false;
  }

  try {
    const channel = await getChannel();
    const message = Buffer.from(JSON.stringify(job));

    channel.sendToQueue(mailQueueName, message, {
      persistent: true,
      contentType: 'application/json'
    });

    await channel.waitForConfirms();
    return true;
  } catch (err) {
    logger.error('Confirmation mail was not queued', {
      message: err.message
    });

    return false;
  }
}