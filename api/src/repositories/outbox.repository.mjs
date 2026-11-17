
import { Op } from 'sequelize';
import { OutboxMessage } from '../models/index.mjs';

const maximumErrorLength = 1000;
const maximumRetryDelayMs = 60000;

const errorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const retryDelayMs = (attempts) => {
  const exponentialDelay =
    1000 * (2 ** Math.min(attempts - 1, 6));

  return Math.min(
    exponentialDelay,
    maximumRetryDelayMs
  );
};

export async function create(data, transaction) {
  const message = await OutboxMessage.create(
    data,
    {
      transaction
    }
  );

  return message.toJSON();
}

export async function findPending(limit = 20) {
  const messages = await OutboxMessage.findAll({
    where: {
      publishedAt: null,
      availableAt: {
        [Op.lte]: new Date()
      }
    },
    order: [
      ['createdAt', 'ASC']
    ],
    limit
  });

  return messages.map((message) =>
    message.toJSON()
  );
}

export async function markPublished(id) {
  const [updated] = await OutboxMessage.update(
    {
      publishedAt: new Date(),
      lastError: null
    },
    {
      where: {
        id,
        publishedAt: null
      }
    }
  );

  return updated === 1;
}

export async function recordFailure(id, error) {
  const message = await OutboxMessage.findByPk(id);

  if (!message || message.publishedAt) {
    return false;
  }

  const attempts = message.attempts + 1;
  const availableAt = new Date(
    Date.now() + retryDelayMs(attempts)
  );

  await message.update({
    attempts,
    availableAt,
    lastError: errorMessage(error)
      .slice(0, maximumErrorLength)
  });

  return true;
}