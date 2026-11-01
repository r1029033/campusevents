import { createClient } from 'redis';
import { env } from '../config/env.mjs';
import { logger } from '../config/logger.mjs';

let client;
let connectionPromise;

const getClient = () => {
  if (!env.redisUrl) {
    return null;
  }

  if (!client) {
    client = createClient({
      url: env.redisUrl,
      socket: {
        connectTimeout: 500,
        reconnectStrategy: false
      }
    });

    client.on('error', (err) => {
      logger.warn('Redis error; using database instead', {
        message: err.message
      });
    });
  }

  return client;
};

const getConnectedClient = async () => {
  const redis = getClient();

  if (!redis) {
    return null;
  }

  if (!redis.isOpen) {
    connectionPromise ??= redis.connect();

    try {
      await connectionPromise;
    } catch (err) {
      logger.warn('Redis unavailable; using database instead', {
        message: err.message
      });

      return null;
    } finally {
      connectionPromise = undefined;
    }
  }

  return redis.isReady ? redis : null;
};

export async function getJson(key) {
  try {
    const redis = await getConnectedClient();

    if (!redis) {
      return null;
    }

    const value = await redis.get(key);
    return value === null ? null : JSON.parse(value);
  } catch (err) {
    logger.warn('Redis read failed; using database instead', {
      key,
      message: err.message
    });

    return null;
  }
}

export async function setJson(key, value, ttlSeconds = 60) {
  try {
    const redis = await getConnectedClient();

    if (!redis) {
      return false;
    }

    await redis.set(key, JSON.stringify(value), {
      EX: ttlSeconds
    });

    return true;
  } catch (err) {
    logger.warn('Redis write failed', {
      key,
      message: err.message
    });

    return false;
  }
}

export async function deleteKeys(...keys) {
  if (keys.length === 0) {
    return true;
  }

  try {
    const redis = await getConnectedClient();

    if (!redis) {
      return false;
    }

    await redis.del(keys);
    return true;
  } catch (err) {
    logger.warn('Redis invalidation failed', {
      keys,
      message: err.message
    });

    return false;
  }
}
