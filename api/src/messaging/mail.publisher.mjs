import amqp from 'amqplib';
import { env } from '../config/env.mjs';
import { logger } from '../config/logger.mjs';
import { mailQueueName } from './queue-names.mjs';

let connectionPromise;
let channelPromise;

async function createConnection() {
  if (!env.amqpUrl) {
    throw new Error('AMQP_URL is required to publish mail messages');
  }

  const connection = await amqp.connect(env.amqpUrl);

  connection.on('error', (error) => {
    logger.error('RabbitMQ connection error', {
      message: error.message
    });
  });

  connection.on('close', () => {
    connectionPromise = undefined;
    channelPromise = undefined;
  });

  return connection;
}

async function getConnection() {
  if (!connectionPromise) {
    connectionPromise = createConnection().catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}

async function createChannel() {
  const connection = await getConnection();
  const channel = await connection.createConfirmChannel();

  channel.on('error', (error) => {
    logger.error('RabbitMQ channel error', {
      message: error.message
    });
  });

  channel.on('close', () => {
    channelPromise = undefined;
  });

  await channel.assertQueue(mailQueueName, {
    durable: true
  });

  return channel;
}

async function getChannel() {
  if (!channelPromise) {
    channelPromise = createChannel().catch((error) => {
      channelPromise = undefined;
      throw error;
    });
  }

  return channelPromise;
}

export async function publishOutboxMessage(message) {
  const channel = await getChannel();

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