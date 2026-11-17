import amqp from 'amqplib';
import { env } from '../config/env.mjs';
import { logger } from '../config/logger.mjs';

let connectionPromise;
let channelPromise;

async function createConnection() {
  if (!env.amqpUrl) {
    throw new Error(
      'AMQP_URL is required to publish messages'
    );
  }

  const connection = await amqp.connect(env.amqpUrl);

  connection.on('error', (error) => {
    logger.error('RabbitMQ publisher connection error', {
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
    connectionPromise = createConnection().catch(
      (error) => {
        connectionPromise = undefined;
        throw error;
      }
    );
  }

  return connectionPromise;
}

async function createChannel() {
  const connection = await getConnection();
  const channel =
    await connection.createConfirmChannel();

  channel.on('error', (error) => {
    logger.error('RabbitMQ publisher channel error', {
      message: error.message
    });
  });

  channel.on('close', () => {
    channelPromise = undefined;
  });

  return channel;
}

export async function getPublisherChannel() {
  if (!channelPromise) {
    channelPromise = createChannel().catch(
      (error) => {
        channelPromise = undefined;
        throw error;
      }
    );
  }

  return channelPromise;
}
