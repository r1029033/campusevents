import { logger } from '../config/logger.mjs';
import { publishMailMessage } from '../messaging/mail.publisher.mjs';
import { messageTypes } from '../messaging/message-types.mjs';
import {
  findPending,
  markPublished,
  recordFailure
} from '../repositories/outbox.repository.mjs';

const defaultPollIntervalMs = 5_000;

let workerTimer;
let cycleRunning = false;

async function publishMessage(message) {
  switch (message.type) {
    case messageTypes.registrationConfirmationEmail:
      await publishMailMessage(message);
      return;

    default:
      throw new Error(`Unsupported outbox message type: ${message.type}`);
  }
}

export async function dispatchPendingMessages({
  loadPendingMessages = findPending,
  publishMessageToBroker = publishMessage,
  markMessagePublished = markPublished,
  recordMessageFailure = recordFailure
} = {}) {
  const messages = await loadPendingMessages();
  const result = {
    processed: messages.length,
    published: 0,
    failed: 0
  };

  for (const message of messages) {
    try {
      await publishMessageToBroker(message);
      await markMessagePublished(message.id);
      result.published += 1;

      logger.info('Outbox message published', {
        messageId: message.id,
        type: message.type
      });
    } catch (error) {
      await recordMessageFailure(message.id, error);
      result.failed += 1;

      logger.warn('Outbox message publication failed', {
        messageId: message.id,
        type: message.type,
        error: error.message
      });
    }
  }

  return result;
}

async function runWorkerCycle() {
  if (cycleRunning) {
    return;
  }

  cycleRunning = true;

  try {
    await dispatchPendingMessages();
  } catch (error) {
    logger.error('Outbox worker cycle failed', {
      error: error.message
    });
  } finally {
    cycleRunning = false;
  }
}

export function startOutboxWorker({
  pollIntervalMs = defaultPollIntervalMs
} = {}) {
  if (workerTimer) {
    return;
  }

  void runWorkerCycle();

  workerTimer = setInterval(() => {
    void runWorkerCycle();
  }, pollIntervalMs);
}

export function stopOutboxWorker() {
  if (!workerTimer) {
    return;
  }

  clearInterval(workerTimer);
  workerTimer = undefined;
}
