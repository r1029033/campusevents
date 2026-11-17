import amqp from 'amqplib';
import { env } from '../config/env.mjs';
import { logger } from '../config/logger.mjs';
import { messageTypes } from '../messaging/message-types.mjs';
import {
  browserNotificationExchangeName
} from '../messaging/queue-names.mjs';
import {
  broadcastNotification
} from '../notifications/notification.hub.mjs';

const reconnectDelayMs = 5_000;

let connection;
let reconnectTimer;
let connecting = false;
let stopping = false;

function isNotificationType(type) {
  return (
    type === messageTypes.eventCreatedNotification ||
    type ===
      messageTypes.registrationCreatedNotification
  );
}

export function parsePublicNotification(message) {
  const parsed = JSON.parse(
    message.content.toString('utf8')
  );

  if (
    !parsed ||
    typeof parsed.notificationId !== 'string' ||
    parsed.notificationId.trim() === ''
  ) {
    throw new Error(
      'Notification has an invalid notificationId'
    );
  }

  if (!isNotificationType(parsed.type)) {
    throw new Error(
      `Unsupported notification type: ${parsed.type}`
    );
  }

  if (
    !parsed.payload ||
    typeof parsed.payload.eventId !== 'number' ||
    typeof parsed.payload.eventTitle !== 'string'
  ) {
    throw new Error(
      'Notification has an invalid public payload'
    );
  }

  return {
    notificationId: parsed.notificationId,
    type: parsed.type,
    payload: {
      eventId: parsed.payload.eventId,
      eventTitle: parsed.payload.eventTitle
    }
  };
}

function processMessage(channel, message) {
  if (!message) {
    return;
  }

  try {
    const notification =
      parsePublicNotification(message);

    broadcastNotification(notification);
    channel.ack(message);
  } catch (error) {
    logger.warn('Invalid browser notification discarded', {
      messageId:
        message.properties.messageId ?? 'unknown',
      error: error.message
    });

    channel.ack(message);
  }
}

function scheduleReconnect() {
  if (stopping || reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    void connectToRabbitMq();
  }, reconnectDelayMs);
}

async function closeQuietly(connectionToClose) {
  if (!connectionToClose) {
    return;
  }

  try {
    await connectionToClose.close();
  } catch (error) {
    logger.warn(
      'Could not close notification RabbitMQ connection',
      {
        error: error.message
      }
    );
  }
}

async function configureConsumer(channel) {
  await channel.assertExchange(
    browserNotificationExchangeName,
    'fanout',
    {
      durable: true
    }
  );

  const { queue } = await channel.assertQueue('', {
    durable: false,
    exclusive: true,
    autoDelete: true
  });

  await channel.bindQueue(
    queue,
    browserNotificationExchangeName,
    ''
  );

  await channel.consume(
    queue,
    (message) => {
      processMessage(channel, message);
    },
    {
      noAck: false
    }
  );

  return queue;
}

async function connectToRabbitMq() {
  if (connecting || stopping) {
    return;
  }

  connecting = true;
  let nextConnection;

  try {
    nextConnection = await amqp.connect(env.amqpUrl);

    nextConnection.on('error', (error) => {
      logger.error(
        'Notification worker RabbitMQ error',
        {
          error: error.message
        }
      );
    });

    nextConnection.on('close', () => {
      if (connection === nextConnection) {
        connection = undefined;
      }

      scheduleReconnect();
    });

    const channel =
      await nextConnection.createChannel();

    channel.on('error', (error) => {
      logger.error(
        'Notification worker channel error',
        {
          error: error.message
        }
      );
    });

    const queue = await configureConsumer(channel);

    connection = nextConnection;

    logger.info(
      'Notification worker connected to RabbitMQ',
      {
        queue
      }
    );
  } catch (error) {
    logger.error(
      'Notification worker could not connect',
      {
        error: error.message
      }
    );

    await closeQuietly(nextConnection);
    scheduleReconnect();
  } finally {
    connecting = false;
  }
}

export async function startNotificationWorker() {
  if (!env.amqpUrl) {
    logger.warn(
      'Notification worker disabled because AMQP_URL is missing'
    );

    return;
  }

  if (connection || reconnectTimer || connecting) {
    return;
  }

  stopping = false;
  await connectToRabbitMq();
}

export async function stopNotificationWorker() {
  stopping = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }

  const activeConnection = connection;
  connection = undefined;

  await closeQuietly(activeConnection);
}
