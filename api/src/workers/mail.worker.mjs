import amqp from 'amqplib';
import { env } from '../config/env.mjs';
import { logger } from '../config/logger.mjs';
import {
  EmailProviderError,
  InvalidEmailJobError
} from '../email/email.errors.mjs';
import {
  sendRegistrationConfirmationEmail
} from '../email/registration-confirmation.mjs';
import { messageTypes } from '../messaging/message-types.mjs';
import {
  mailDeadLetterQueueName,
  mailQueueName,
  mailRetryQueueName
} from '../messaging/queue-names.mjs';

const reconnectDelayMs = 5_000;

let connection;
let reconnectTimer;
let connecting = false;
let stopping = false;

function getRetryCount(message) {
  const value =
    message.properties.headers?.['x-retry-count'] ?? 0;

  return Number(value);
}

function isPermanentFailure(error) {
  if (
    error instanceof InvalidEmailJobError ||
    error instanceof SyntaxError
  ) {
    return true;
  }

  return (
    error instanceof EmailProviderError &&
    !error.retryable
  );
}

async function publishMessageCopy(
  channel,
  queueName,
  message,
  additionalHeaders = {}
) {
  channel.sendToQueue(queueName, message.content, {
    persistent: true,

    contentType:
      message.properties.contentType ??
      'application/json',

    messageId: message.properties.messageId,
    type: message.properties.type,

    headers: {
      ...message.properties.headers,
      ...additionalHeaders
    }
  });

  await channel.waitForConfirms();
}

async function moveToRetryQueue(
  channel,
  message,
  error
) {
  const retryCount = getRetryCount(message) + 1;

  await publishMessageCopy(
    channel,
    mailRetryQueueName,
    message,
    {
      'x-retry-count': retryCount,
      'x-last-error': error.name
    }
  );

  return retryCount;
}

async function moveToDeadLetterQueue(
  channel,
  message,
  error
) {
  await publishMessageCopy(
    channel,
    mailDeadLetterQueueName,
    message,
    {
      'x-failure-type': error.name,
      'x-failed-at': new Date().toISOString()
    }
  );
}

async function processMessage(channel, message) {
  if (!message) {
    return;
  }

  const messageId =
    message.properties.messageId ?? 'unknown';

  try {
    if (
      message.properties.type !==
      messageTypes.registrationConfirmationEmail
    ) {
      throw new InvalidEmailJobError(
        'Unsupported email message type: ' +
          message.properties.type
      );
    }

    const job = JSON.parse(
      message.content.toString('utf8')
    );

    await sendRegistrationConfirmationEmail(job);

    channel.ack(message);

    logger.info('Registration email accepted by Brevo', {
      messageId
    });
  } catch (error) {
    try {
      if (isPermanentFailure(error)) {
        await moveToDeadLetterQueue(
          channel,
          message,
          error
        );

        logger.warn(
          'Email moved to dead-letter queue',
          {
            messageId,
            errorType: error.name
          }
        );
      } else {
        const retryCount = await moveToRetryQueue(
          channel,
          message,
          error
        );

        logger.warn('Email scheduled for retry', {
          messageId,
          retryCount,
          errorType: error.name
        });
      }

      channel.ack(message);
    } catch (routingError) {
      logger.error('Could not route failed email', {
        messageId,
        error: routingError.message
      });

      try {
        channel.nack(message, false, true);
      } catch (nackError) {
        logger.error('Could not requeue email', {
          messageId,
          error: nackError.message
        });
      }
    }
  }
}

async function configureQueues(channel) {
  await channel.assertQueue(mailQueueName, {
    durable: true
  });

  await channel.assertQueue(mailRetryQueueName, {
    durable: true,

    arguments: {
      'x-message-ttl': env.mailRetryDelayMs,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': mailQueueName
    }
  });

  await channel.assertQueue(mailDeadLetterQueueName, {
    durable: true
  });

  await channel.prefetch(1);
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
    logger.warn('Could not close RabbitMQ connection', {
      error: error.message
    });
  }
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
      logger.error('Email worker RabbitMQ error', {
        error: error.message
      });
    });

    nextConnection.on('close', () => {
      if (connection === nextConnection) {
        connection = undefined;
      }

      scheduleReconnect();
    });

    const channel =
      await nextConnection.createConfirmChannel();

    await configureQueues(channel);

    await channel.consume(
      mailQueueName,
      (message) => {
        void processMessage(channel, message);
      },
      {
        noAck: false
      }
    );

    connection = nextConnection;

    logger.info('Email worker connected to RabbitMQ');
  } catch (error) {
    logger.error('Email worker could not connect', {
      error: error.message
    });

    await closeQuietly(nextConnection);
    scheduleReconnect();
  } finally {
    connecting = false;
  }
}

export function startMailWorker() {
  if (!env.amqpUrl) {
    logger.warn(
      'Email worker disabled because AMQP_URL is missing'
    );

    return;
  }

  if (connection || reconnectTimer || connecting) {
    return;
  }

  stopping = false;
  void connectToRabbitMq();
}

export async function stopMailWorker() {
  stopping = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }

  const activeConnection = connection;
  connection = undefined;

  await closeQuietly(activeConnection);
}
